/**
 * Telemetry Report Command
 *
 * Generate a markdown telemetry report.
 *
 * @module cli/commands/telemetry/report
 * @version 1.0.0
 */

const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const { ExecutionTelemetry } = require('../../../development/scripts/execution-telemetry');

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format percentage for display
 * @param {number} value - Value between 0 and 1
 * @returns {string} Formatted percentage
 */
function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Generate ASCII bar chart
 * @param {number} value - Value (0-1 for rates, or raw for durations)
 * @param {number} maxWidth - Max bar width in characters
 * @param {number} [maxValue] - Max value for scaling (default 1)
 * @returns {string} ASCII bar
 */
function asciiBar(value, maxWidth = 20, maxValue = 1) {
  if (!value || !maxValue) return '';
  const filled = Math.round((value / maxValue) * maxWidth);
  return '\u2588'.repeat(Math.min(filled, maxWidth));
}

/**
 * Create the report subcommand
 * @returns {Command} Commander command instance
 */
function createReportCommand() {
  const report = new Command('report');

  report
    .description('Generate markdown telemetry report')
    .option('-p, --period <period>', 'Time period (7d, 30d, 90d)', '30d')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      try {
        const telemetry = ExecutionTelemetry.getInstance();
        const dashboard = await telemetry.getDashboard({ period: options.period });
        const estimates = await telemetry.getEstimateAccuracy();

        const lines = [];
        const now = new Date().toISOString().split('T')[0];

        // ── Header ───────────────────────────────────────────
        lines.push('# Execution Telemetry Report');
        lines.push('');
        lines.push(`**Generated:** ${now}`);
        lines.push(`**Period:** ${dashboard.period}`);
        lines.push('');

        // ── Executive Summary ────────────────────────────────
        lines.push('## Executive Summary');
        lines.push('');
        lines.push(`| Metric | Value |`);
        lines.push(`|--------|-------|`);
        lines.push(`| Total Sessions | ${dashboard.summary.totalSessions} |`);
        lines.push(`| Total Tasks | ${dashboard.summary.totalTasks} |`);
        lines.push(`| Total Time | ${formatDuration(dashboard.summary.totalDurationMs)} |`);
        lines.push(`| Success Rate | ${formatPercent(dashboard.summary.successRate)} |`);
        lines.push('');

        // ── Agent Performance Table ──────────────────────────
        const agents = Object.entries(dashboard.byAgent);
        if (agents.length > 0) {
          lines.push('## Agent Performance');
          lines.push('');
          lines.push('| Agent | Sessions | Avg Duration | Success Rate |');
          lines.push('|-------|----------|-------------|-------------|');

          for (const [agentId, stats] of agents) {
            lines.push(
              `| @${agentId} | ${stats.sessions} | ${formatDuration(stats.avgDurationMs)} | ${formatPercent(stats.successRate)} |`,
            );
          }
          lines.push('');

          // ASCII bar trend for agent sessions
          lines.push('### Agent Session Distribution');
          lines.push('');
          lines.push('```');
          const maxSessions = Math.max(...agents.map(([, s]) => s.sessions));
          for (const [agentId, stats] of agents) {
            const bar = asciiBar(stats.sessions, 30, maxSessions);
            lines.push(`  ${agentId.padEnd(10)} ${bar} ${stats.sessions}`);
          }
          lines.push('```');
          lines.push('');
        }

        // ── Task Performance Table ───────────────────────────
        const tasks = Object.entries(dashboard.byTask);
        if (tasks.length > 0) {
          // Sort by avg duration descending
          tasks.sort((a, b) => b[1].avgDurationMs - a[1].avgDurationMs);

          lines.push('## Task Performance');
          lines.push('');
          lines.push('| Task | Runs | Avg Duration |');
          lines.push('|------|------|-------------|');

          for (const [taskName, stats] of tasks) {
            lines.push(
              `| ${taskName} | ${stats.runs} | ${formatDuration(stats.avgDurationMs)} |`,
            );
          }
          lines.push('');

          // Bottleneck Analysis
          lines.push('### Bottleneck Analysis');
          lines.push('');
          lines.push('Top 5 slowest tasks:');
          lines.push('');
          lines.push('```');
          const top5 = tasks.slice(0, 5);
          const maxDuration = top5.length > 0 ? top5[0][1].avgDurationMs : 1;
          for (const [taskName, stats] of top5) {
            const shortName = taskName.length > 25 ? taskName.substring(0, 25) + '..' : taskName;
            const bar = asciiBar(stats.avgDurationMs, 20, maxDuration);
            lines.push(`  ${shortName.padEnd(28)} ${bar} ${formatDuration(stats.avgDurationMs)}`);
          }
          lines.push('```');
          lines.push('');
        }

        // ── Workflow Phase Timing ────────────────────────────
        const workflows = Object.entries(dashboard.byWorkflow);
        if (workflows.length > 0) {
          lines.push('## Workflow Phase Timing');
          lines.push('');

          for (const [wfName, stats] of workflows) {
            lines.push(`### ${wfName} (${stats.runs} runs)`);
            lines.push('');
            lines.push('| Phase | Avg Duration |');
            lines.push('|-------|-------------|');

            const phases = Object.entries(stats.phaseAvgs);
            for (const [phaseName, ph] of phases) {
              lines.push(`| ${phaseName} | ${formatDuration(ph.avgMs)} |`);
            }
            lines.push('');

            // ASCII bar for phases
            lines.push('```');
            const maxPhase = Math.max(...phases.map(([, p]) => p.avgMs));
            for (const [phaseName, ph] of phases) {
              const bar = asciiBar(ph.avgMs, 25, maxPhase);
              lines.push(`  ${phaseName.padEnd(15)} ${bar} ${formatDuration(ph.avgMs)}`);
            }
            lines.push('```');
            lines.push('');
          }
        }

        // ── Estimate Accuracy ────────────────────────────────
        lines.push('## Estimate Accuracy');
        lines.push('');

        if (estimates.withActual > 0) {
          lines.push(`| Metric | Value |`);
          lines.push(`|--------|-------|`);
          lines.push(`| Total Estimates | ${estimates.total} |`);
          lines.push(`| With Actuals | ${estimates.withActual} |`);
          lines.push(`| Planned Hours | ${estimates.planned.toFixed(1)}h |`);
          lines.push(`| Actual Hours | ${estimates.actual.toFixed(1)}h |`);
          lines.push(`| Variance | ${estimates.variance > 0 ? '+' : ''}${estimates.variance.toFixed(1)}h |`);
          if (estimates.accuracy !== null) {
            lines.push(`| Overall Accuracy | ${estimates.accuracy}% |`);
          }
          lines.push('');

          if (estimates.entries.length > 0) {
            lines.push('### Recent Comparisons');
            lines.push('');
            lines.push('| Entity | Estimated | Actual | Accuracy |');
            lines.push('|--------|----------|--------|----------|');

            for (const entry of estimates.entries) {
              const label = `${entry.entityType}:${entry.entityId}`;
              const estH = entry.estimate.hours ? `${entry.estimate.hours.toFixed(1)}h` : 'N/A';
              const actH = entry.actual?.hours ? `${entry.actual.hours.toFixed(1)}h` : 'N/A';
              const acc = entry.accuracy?.percentAccuracy != null ? `${entry.accuracy.percentAccuracy}%` : 'N/A';
              lines.push(`| ${label} | ${estH} | ${actH} | ${acc} |`);
            }
            lines.push('');
          }
        } else {
          lines.push('No estimate data with actuals available yet.');
          lines.push('');
        }

        // ── Footer ───────────────────────────────────────────
        lines.push('---');
        lines.push('*Generated by AIOS Execution Telemetry CLI*');

        const content = lines.join('\n');

        // Output to file or stdout
        if (options.output) {
          const outputPath = path.resolve(options.output);
          const dir = path.dirname(outputPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(outputPath, content, 'utf8');
          console.log(`\n\u2705 Report saved to: ${outputPath}`);
        } else {
          console.log(content);
        }

        process.exit(0);
      } catch (error) {
        console.error(`\n\u274c Error: ${error.message}`);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return report;
}

module.exports = {
  createReportCommand,
};
