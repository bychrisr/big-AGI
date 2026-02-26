/**
 * Telemetry Show Command
 *
 * Display execution telemetry data in table format.
 *
 * @module cli/commands/telemetry/show
 * @version 1.0.0
 */

const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const { ExecutionTelemetry } = require('../../../development/scripts/execution-telemetry');

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
 * Format relative time
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Relative time string
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Pad string to fixed width
 * @param {string} str - Input string
 * @param {number} width - Target width
 * @returns {string} Padded string
 */
function pad(str, width) {
  const s = String(str);
  return s.length >= width ? s.substring(0, width) : s + ' '.repeat(width - s.length);
}

/**
 * Create the show subcommand
 * @returns {Command} Commander command instance
 */
function createShowCommand() {
  const show = new Command('show');

  show
    .description('Display execution telemetry data')
    .option('-a, --agent <id>', 'Filter by agent ID (dev, qa, sm, etc.)')
    .option('-t, --task <name>', 'Filter by task name')
    .option('-w, --workflow <name>', 'Filter by workflow name')
    .option('-p, --period <period>', 'Time period (24h, 7d, 30d, 90d, all)', '30d')
    .option('--last', 'Show only last execution snapshot', false)
    .option('--estimates', 'Show estimate vs actual comparison', false)
    .option('-f, --format <type>', 'Output format (table, json)', 'table')
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      try {
        const telemetry = ExecutionTelemetry.getInstance();

        // --last: Show last execution snapshot
        if (options.last) {
          await showLastExecution(telemetry, options);
          return;
        }

        // --estimates: Show estimate accuracy
        if (options.estimates) {
          await showEstimates(telemetry, options);
          return;
        }

        // Default: Show dashboard summary
        const dashboardOpts = { period: options.period };
        const dashboard = await telemetry.getDashboard(dashboardOpts);

        // JSON output
        if (options.format === 'json') {
          console.log(JSON.stringify(dashboard, null, 2));
          process.exit(0);
        }

        // ── Summary ──────────────────────────────────────────
        console.log('\n\u{1f4ca} Execution Telemetry');
        console.log('\u2501'.repeat(60));
        console.log(`Period: ${dashboard.period}`);
        console.log(`Total Sessions: ${dashboard.summary.totalSessions}`);
        console.log(`Total Tasks: ${dashboard.summary.totalTasks}`);
        console.log(`Total Time: ${formatDuration(dashboard.summary.totalDurationMs)}`);
        console.log(`Success Rate: ${formatPercent(dashboard.summary.successRate)}`);

        // ── Per-Agent Table ──────────────────────────────────
        const agents = Object.entries(dashboard.byAgent);
        if (agents.length > 0) {
          // Filter by agent if specified
          const filtered = options.agent
            ? agents.filter(([id]) => id === options.agent)
            : agents;

          if (filtered.length > 0) {
            console.log('\n\u{1f464} Agent Performance');
            console.log('\u2500'.repeat(60));
            console.log(
              `  ${pad('Agent', 12)} ${pad('Sessions', 10)} ${pad('Avg Time', 12)} ${pad('Success', 10)}`,
            );
            console.log('  ' + '\u2500'.repeat(56));

            for (const [agentId, stats] of filtered) {
              const successIcon = stats.successRate >= 0.9 ? '\u{1f7e2}' :
                stats.successRate >= 0.7 ? '\u{1f7e1}' : '\u{1f534}';
              console.log(
                `  ${pad(agentId, 12)} ${pad(String(stats.sessions), 10)} ${pad(formatDuration(stats.avgDurationMs), 12)} ${successIcon} ${formatPercent(stats.successRate)}`,
              );
            }
          }
        }

        // ── Top 5 Slowest Tasks (Bottleneck Detection) ──────
        const tasks = Object.entries(dashboard.byTask);
        if (tasks.length > 0) {
          let filteredTasks = options.task
            ? tasks.filter(([name]) => name.includes(options.task))
            : tasks;

          // Sort by avg duration descending
          filteredTasks.sort((a, b) => b[1].avgDurationMs - a[1].avgDurationMs);
          const top5 = filteredTasks.slice(0, 5);

          console.log('\n\u{1f422} Top 5 Slowest Tasks (Bottlenecks)');
          console.log('\u2500'.repeat(60));
          console.log(
            `  ${pad('Task', 30)} ${pad('Runs', 8)} ${pad('Avg Time', 12)}`,
          );
          console.log('  ' + '\u2500'.repeat(56));

          for (const [taskName, stats] of top5) {
            const shortName = taskName.length > 28 ? taskName.substring(0, 28) + '..' : taskName;
            console.log(
              `  ${pad(shortName, 30)} ${pad(String(stats.runs), 8)} ${pad(formatDuration(stats.avgDurationMs), 12)}`,
            );
          }
        }

        // ── Workflow Phase Timing ────────────────────────────
        const workflows = Object.entries(dashboard.byWorkflow);
        if (workflows.length > 0) {
          const filteredWf = options.workflow
            ? workflows.filter(([name]) => name.includes(options.workflow))
            : workflows;

          if (filteredWf.length > 0) {
            console.log('\n\u{1f504} Workflow Phase Timing');
            console.log('\u2500'.repeat(60));

            for (const [wfName, stats] of filteredWf) {
              console.log(`  ${wfName} (${stats.runs} runs)`);
              const phases = Object.entries(stats.phaseAvgs);
              for (const [phaseName, ph] of phases) {
                const bar = '\u2588'.repeat(Math.min(Math.floor(ph.avgMs / 60000), 20));
                console.log(`    ${pad(phaseName, 15)} ${pad(formatDuration(ph.avgMs), 10)} ${bar}`);
              }
            }
          }
        }

        console.log('\n' + '\u2501'.repeat(60));
        console.log('Use --format json for full data export');
        console.log('Use --estimates for estimate accuracy');
        console.log('Use --last for last execution snapshot');

        process.exit(0);
      } catch (error) {
        console.error(`\n\u274c Error: ${error.message}`);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return show;
}

/**
 * Show last execution snapshot
 * @param {ExecutionTelemetry} telemetry - Telemetry instance
 * @param {Object} options - Command options
 */
async function showLastExecution(telemetry, options) {
  await telemetry._ensureConfig();
  const snapshotPath = telemetry._config.storage.snapshotFile;

  try {
    const content = await fs.readFile(snapshotPath, 'utf8');
    const snapshot = JSON.parse(content);

    if (options.format === 'json') {
      console.log(JSON.stringify(snapshot, null, 2));
      process.exit(0);
    }

    console.log('\n\u{1f4cb} Last Execution Snapshot');
    console.log('\u2501'.repeat(60));
    console.log(`Session ID:  ${snapshot.sessionId}`);
    console.log(`Agent:       ${snapshot.agentId}`);
    console.log(`Status:      ${snapshot.status}`);
    console.log(`Started:     ${snapshot.startTime}`);
    console.log(`Ended:       ${snapshot.endTime || 'N/A'}`);
    console.log(`Duration:    ${formatDuration(snapshot.durationMs)}`);

    if (snapshot.tasks?.length > 0) {
      console.log(`\nTasks (${snapshot.tasks.length}):`);
      for (const task of snapshot.tasks) {
        const status = task.status === 'completed' ? '\u2705' : '\u274c';
        console.log(`  ${status} ${task.taskName} (${formatDuration(task.durationMs)})`);
      }
    }

    if (snapshot.commands?.length > 0) {
      console.log(`\nCommands (${snapshot.commands.length}):`);
      for (const cmd of snapshot.commands.slice(-10)) {
        console.log(`  ${cmd.name} - ${formatDuration(cmd.durationMs)} [${cmd.status}]`);
      }
      if (snapshot.commands.length > 10) {
        console.log(`  ... and ${snapshot.commands.length - 10} more`);
      }
    }

    console.log('\n' + '\u2501'.repeat(60));
    process.exit(0);
  } catch {
    console.log('\nNo last execution snapshot found.');
    console.log('Snapshots are created automatically after each agent session.');
    process.exit(0);
  }
}

/**
 * Show estimate accuracy data
 * @param {ExecutionTelemetry} telemetry - Telemetry instance
 * @param {Object} options - Command options
 */
async function showEstimates(telemetry, options) {
  const accuracy = await telemetry.getEstimateAccuracy();

  if (options.format === 'json') {
    console.log(JSON.stringify(accuracy, null, 2));
    process.exit(0);
  }

  console.log('\n\u{1f3af} Estimate Accuracy');
  console.log('\u2501'.repeat(60));
  console.log(`Total Estimates:    ${accuracy.total}`);
  console.log(`With Actuals:       ${accuracy.withActual}`);
  console.log(`Planned Hours:      ${accuracy.planned.toFixed(1)}h`);
  console.log(`Actual Hours:       ${accuracy.actual.toFixed(1)}h`);
  console.log(`Variance:           ${accuracy.variance > 0 ? '+' : ''}${accuracy.variance.toFixed(1)}h`);

  if (accuracy.accuracy !== null) {
    const accIcon = accuracy.accuracy >= 80 ? '\u{1f7e2}' :
      accuracy.accuracy >= 60 ? '\u{1f7e1}' : '\u{1f534}';
    console.log(`Overall Accuracy:   ${accIcon} ${accuracy.accuracy}%`);
  } else {
    console.log('Overall Accuracy:   N/A (no completed estimates)');
  }

  if (accuracy.entries.length > 0) {
    console.log('\n\u{1f4ca} Recent Comparisons');
    console.log('\u2500'.repeat(60));
    console.log(
      `  ${pad('Entity', 20)} ${pad('Est (h)', 10)} ${pad('Act (h)', 10)} ${pad('Accuracy', 10)}`,
    );
    console.log('  ' + '\u2500'.repeat(56));

    for (const entry of accuracy.entries) {
      const entityLabel = `${entry.entityType}:${entry.entityId}`;
      const shortLabel = entityLabel.length > 18 ? entityLabel.substring(0, 18) + '..' : entityLabel;
      const estH = entry.estimate.hours ? entry.estimate.hours.toFixed(1) : 'N/A';
      const actH = entry.actual?.hours ? entry.actual.hours.toFixed(1) : 'N/A';
      const acc = entry.accuracy?.percentAccuracy != null ? `${entry.accuracy.percentAccuracy}%` : 'N/A';
      console.log(
        `  ${pad(shortLabel, 20)} ${pad(estH, 10)} ${pad(actH, 10)} ${pad(acc, 10)}`,
      );
    }
  }

  console.log('\n' + '\u2501'.repeat(60));
  process.exit(0);
}

module.exports = {
  createShowCommand,
};
