/**
 * Telemetry Dashboard Command
 *
 * Launch React dashboard in browser with a minimal HTTP server.
 * Serves static files from .aios-core/dashboard/dist/ and provides
 * a /api/telemetry endpoint for JSON data.
 *
 * Uses Node.js built-in http and fs modules to avoid adding express
 * as a dependency.
 *
 * @module cli/commands/telemetry/dashboard
 * @version 1.0.0
 */

const { Command } = require('commander');
const http = require('http');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { ExecutionTelemetry } = require('../../../development/scripts/execution-telemetry');
const { getAllStories, getAllEpics } = require('../../../development/scripts/story-reader');

// Optional: Load token parser if available for dual-scope tokens API
let generateTokenReport;
try {
  const tokenParser = require('../../../development/scripts/claude-code-token-parser');
  generateTokenReport = tokenParser.generateTokenReport;
} catch {
  generateTokenReport = null;
}

// Optional: Load analytics engine if available
let generateAnalytics;
try {
  const analyticsEngine = require('../../../development/scripts/telemetry-analytics');
  generateAnalytics = analyticsEngine.generateAnalytics;
} catch {
  generateAnalytics = null;
}

/**
 * MIME type map for static file serving
 */
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

/**
 * Open a URL in the default browser (cross-platform)
 * @param {string} url - URL to open
 */
function openBrowser(url) {
  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    // Linux and others
    cmd = `xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || x-www-browser "${url}" 2>/dev/null`;
  }

  exec(cmd, (error) => {
    if (error) {
      console.log(`  Could not open browser automatically.`);
      console.log(`  Please open ${url} manually.`);
    }
  });
}

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {number} maxAttempts - Maximum number of ports to try (default: 10)
 * @returns {Promise<number>} First available port found
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  const net = require('net');

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    // Test if port is available
    const isAvailable = await new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is busy
        } else {
          resolve(false); // Other error, skip this port
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true); // Port is available
      });

      server.listen(port, '127.0.0.1');
    });

    if (isAvailable) {
      return port;
    }
  }

  // No port found in range
  throw new Error(
    `No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}

/**
 * Create the dashboard subcommand
 * @returns {Command} Commander command instance
 */
function createDashboardCommand() {
  const dashboard = new Command('dashboard');

  dashboard
    .description('Launch React dashboard in browser')
    .option('-p, --port <number>', 'Port to serve on', '3100')
    .option('--no-open', 'Do not auto-open browser')
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      try {
        const requestedPort = parseInt(options.port, 10);
        const rootPath = process.cwd();
        const distPath = path.join(rootPath, '.aios-core', 'dashboard', 'dist');

        // Check if dashboard dist exists
        if (!fs.existsSync(distPath)) {
          console.error('\n\u274c Dashboard build not found.');
          console.error(`  Expected at: ${distPath}`);
          console.error('');
          console.error('  To build the dashboard:');
          console.error('    cd .aios-core/dashboard');
          console.error('    npm install');
          console.error('    npm run build');
          process.exit(1);
        }

        // Check for index.html
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          console.error('\n\u274c Dashboard index.html not found.');
          console.error(`  Expected at: ${indexPath}`);
          console.error('  Please rebuild the dashboard.');
          process.exit(1);
        }

        // Find available port (auto-increment if busy)
        const port = await findAvailablePort(requestedPort);
        if (port !== requestedPort) {
          console.log(`\n\u26a0\ufe0f  Port ${requestedPort} is busy, using port ${port} instead.`);
        }

        const telemetry = ExecutionTelemetry.getInstance();

        // Create HTTP server
        const server = http.createServer(async (req, res) => {
          const url = new URL(req.url, `http://localhost:${port}`);
          const pathname = url.pathname;

          if (options.verbose) {
            console.log(`  ${req.method} ${pathname}`);
          }

          // API endpoint: /api/telemetry
          if (pathname === '/api/telemetry') {
            try {
              const period = url.searchParams.get('period') || '30d';
              const dashboardData = await telemetry.getDashboard({ period });
              const estimateData = await telemetry.getEstimateAccuracy();

              // Read snapshot file
              let snapshot = null;
              try {
                await telemetry._ensureConfig();
                const snapshotContent = await fsPromises.readFile(
                  telemetry._config.storage.snapshotFile,
                  'utf8',
                );
                snapshot = JSON.parse(snapshotContent);
              } catch {
                // No snapshot available
              }

              const combined = {
                dashboard: dashboardData,
                estimates: estimateData,
                lastExecution: snapshot,
                generatedAt: new Date().toISOString(),
              };

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
              });
              res.end(JSON.stringify(combined, null, 2));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
            return;
          }

          // API endpoint: /api/tokens (backward compatible, returns empty dual-scope)
          if (pathname === '/api/tokens') {
            try {
              if (generateTokenReport) {
                const claudeDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
                const tokens = await generateTokenReport(claudeDir, null);
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': 'no-cache',
                });
                res.end(JSON.stringify(tokens || {}, null, 2));
              } else {
                // Token parser not available, return empty structure
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': 'no-cache',
                });
                res.end(JSON.stringify({ project: {}, global: {} }, null, 2));
              }
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
            return;
          }

          // API endpoint: /api/analytics (backward compatible, returns empty dual-scope)
          if (pathname === '/api/analytics') {
            try {
              if (generateAnalytics) {
                // Get telemetry data using getDashboard() for proper formatting
                const period = url.searchParams.get('period') || '30d';
                const dashboardData = await telemetry.getDashboard({ period });

                // Get git stats
                let gitStats = { totalCommits: 0, contributors: 0 };
                try {
                  // Placeholder: could parse git log here
                } catch {
                  // Git stats not available
                }

                // Generate analytics - try with tokens if available
                let tokenData = null;
                if (generateTokenReport) {
                  const claudeDir = path.join(process.env.HOME || process.env.USERPROFILE, '.claude');
                  tokenData = await generateTokenReport(claudeDir, null);
                }

                const analytics = await generateAnalytics(dashboardData, tokenData, gitStats);

                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': '60',
                });
                res.end(JSON.stringify(analytics || {}, null, 2));
              } else {
                // Analytics engine not available, return empty structure
                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Cache-Control': '60',
                });
                res.end(JSON.stringify({ project: {}, global: {} }, null, 2));
              }
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message }));
            }
            return;
          }

          // API endpoint: /api/stories
          if (pathname === '/api/stories') {
            try {
              const stories = await getAllStories(rootPath);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
              });
              res.end(JSON.stringify({ stories }, null, 2));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message, stories: [] }));
            }
            return;
          }

          // API endpoint: /api/epics
          if (pathname === '/api/epics') {
            try {
              const epics = await getAllEpics(rootPath);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
              });
              res.end(JSON.stringify({ epics }, null, 2));
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: error.message, epics: [] }));
            }
            return;
          }

          // Static file serving
          let filePath = pathname === '/' ? '/index.html' : pathname;
          filePath = path.join(distPath, filePath);

          // Security: prevent directory traversal
          const resolvedPath = path.resolve(filePath);
          if (!resolvedPath.startsWith(path.resolve(distPath))) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
          }

          try {
            const stat = await fsPromises.stat(resolvedPath);

            if (stat.isDirectory()) {
              // Try index.html in directory
              const dirIndex = path.join(resolvedPath, 'index.html');
              try {
                await fsPromises.stat(dirIndex);
                const content = await fsPromises.readFile(dirIndex);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
                return;
              } catch {
                // Fall through to 404
              }
            }

            const ext = path.extname(resolvedPath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            const content = await fsPromises.readFile(resolvedPath);

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
          } catch {
            // SPA fallback: serve index.html for unmatched routes
            if (!pathname.startsWith('/api/') && !path.extname(pathname)) {
              try {
                const indexContent = await fsPromises.readFile(indexPath);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexContent);
                return;
              } catch {
                // Fall through to 404
              }
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        });

        // Handle server errors (should not happen since we pre-check port availability)
        server.on('error', (error) => {
          console.error(`\n\u274c Server error: ${error.message}`);
          if (error.code === 'EADDRINUSE') {
            console.error(`  Port ${port} became busy after check. Please try again.`);
          }
          process.exit(1);
        });

        // Start server
        server.listen(port, () => {
          const url = `http://localhost:${port}`;

          console.log('\n\ud83d\udcca AIOS Telemetry Dashboard');
          console.log('\u2501'.repeat(40));
          console.log(`  URL:     ${url}`);
          console.log(`  API:     ${url}/api/telemetry`);
          console.log(`  Dist:    ${distPath}`);
          console.log('\u2500'.repeat(40));
          console.log('  Press Ctrl+C to stop');
          console.log('');

          // Auto-open browser
          if (options.open !== false) {
            openBrowser(url);
          }
        });

        // Graceful shutdown
        const shutdown = () => {
          console.log('\n\nShutting down dashboard server...');
          server.close(() => {
            console.log('Server stopped.');
            process.exit(0);
          });
          // Force exit after 3 seconds
          setTimeout(() => process.exit(0), 3000);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      } catch (error) {
        console.error(`\n\u274c Error: ${error.message}`);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return dashboard;
}

module.exports = {
  createDashboardCommand,
};
