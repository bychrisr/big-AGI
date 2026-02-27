/**
 * Telemetry Cleanup Command
 *
 * Remove old telemetry records beyond retention period.
 *
 * @module cli/commands/telemetry/cleanup
 * @version 1.0.0
 */

const { Command } = require('commander');
const { ExecutionTelemetry } = require('../../../development/scripts/execution-telemetry');

/**
 * Create the cleanup subcommand
 * @returns {Command} Commander command instance
 */
function createCleanupCommand() {
  const cleanup = new Command('cleanup');

  cleanup
    .description('Remove old telemetry records beyond retention period')
    .option('-d, --dry-run', 'Show what would be deleted without deleting', false)
    .option('-r, --retention <days>', 'Override retention period (days)', '180')
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      try {
        const retentionDays = parseInt(options.retention, 10);
        const telemetry = ExecutionTelemetry.getInstance();

        // Ensure config is loaded so we can access internal data
        await telemetry._ensureConfig();

        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const cutoffDate = new Date(cutoff).toISOString();

        if (options.dryRun) {
          // Load data to preview what would be deleted
          const data = await telemetry._loadData();
          const estimates = await telemetry._loadEstimates();

          const execsToRemove = data.executions.filter(
            (e) => new Date(e.startTime).getTime() <= cutoff,
          );
          const estimatesToRemove = (estimates.estimates || []).filter(
            (e) => new Date(e.capturedAt).getTime() <= cutoff,
          );

          console.log('\n\ud83d\udd0d Cleanup Dry Run');
          console.log('\u2501'.repeat(40));
          console.log(`Retention Period: ${retentionDays} days`);
          console.log(`Cutoff Date: ${cutoffDate.split('T')[0]}`);
          console.log(`Execution Records to Remove: ${execsToRemove.length}`);
          console.log(`Execution Records to Keep: ${data.executions.length - execsToRemove.length}`);
          console.log(`Estimate Records to Remove: ${estimatesToRemove.length}`);
          console.log(`Estimate Records to Keep: ${(estimates.estimates || []).length - estimatesToRemove.length}`);

          if (options.verbose && execsToRemove.length > 0) {
            console.log('\n\ud83d\udcdc Execution records to be removed:');
            execsToRemove.forEach((e) => {
              const time = e.startTime.substring(0, 19).replace('T', ' ');
              const status = e.status || 'unknown';
              const agent = e.agentId || 'unknown';
              console.log(`  ${time} @${agent} [${status}] ${formatDuration(e.durationMs)}`);
            });
          }

          if (options.verbose && estimatesToRemove.length > 0) {
            console.log('\n\ud83d\udcdc Estimate records to be removed:');
            estimatesToRemove.forEach((e) => {
              const time = e.capturedAt.substring(0, 19).replace('T', ' ');
              console.log(`  ${time} ${e.entityType}:${e.entityId}`);
            });
          }

          console.log('\nRun without --dry-run to perform cleanup');
          process.exit(0);
        }

        // Perform actual cleanup
        const result = await telemetry.cleanup(retentionDays);

        console.log('\n\ud83e\uddf9 Cleanup Complete');
        console.log('\u2501'.repeat(40));
        console.log(`Retention Period: ${retentionDays} days`);
        console.log(`Records Removed: ${result.removed}`);
        console.log(`Records Remaining: ${result.remaining}`);

        if (result.removed > 0) {
          console.log('\n\u2705 Telemetry data recalculated after cleanup');
        } else {
          console.log('\n\u2705 No records needed cleanup');
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

  return cleanup;
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

module.exports = {
  createCleanupCommand,
};
