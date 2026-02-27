/**
 * Telemetry Command Module
 *
 * Entry point for all execution telemetry CLI commands.
 * Includes show, report, cleanup, and dashboard subcommands.
 *
 * @module cli/commands/telemetry
 * @version 1.0.0
 */

const { Command } = require('commander');
const { createShowCommand } = require('./show');
const { createReportCommand } = require('./report');
const { createCleanupCommand } = require('./cleanup');
const { createDashboardCommand } = require('./dashboard');
const { createBackfillCommand } = require('./backfill');

/**
 * Create the telemetry command with all subcommands
 * @returns {Command} Commander command instance
 */
function createTelemetryCommand() {
  const telemetry = new Command('telemetry');

  telemetry
    .description('Execution Telemetry - track and analyze agent performance')
    .addHelpText('after', `
Commands:
  show              Display telemetry data (sessions, tasks, agents)
  report            Generate markdown telemetry report
  cleanup           Remove old records beyond retention period
  dashboard         Launch React dashboard in browser
  backfill          Reconstruct historical data from git/stories/decisions

Data Storage:
  Telemetry: .aios/data/execution-telemetry.json
  Estimates: .aios/data/estimates.json
  Snapshot:  .aios/data/last-execution.json

Examples:
  $ aios telemetry show
  $ aios telemetry show --agent dev --period 7d
  $ aios telemetry show --estimates
  $ aios telemetry show --last
  $ aios telemetry report --period 30d
  $ aios telemetry report --output report.md
  $ aios telemetry cleanup --dry-run
  $ aios telemetry dashboard --port 3100
  $ aios telemetry backfill --dry-run
  $ aios telemetry backfill --since 2025-06-01
`);

  // Add subcommands
  telemetry.addCommand(createShowCommand());
  telemetry.addCommand(createReportCommand());
  telemetry.addCommand(createCleanupCommand());
  telemetry.addCommand(createDashboardCommand());
  telemetry.addCommand(createBackfillCommand());

  return telemetry;
}

module.exports = {
  createTelemetryCommand,
};
