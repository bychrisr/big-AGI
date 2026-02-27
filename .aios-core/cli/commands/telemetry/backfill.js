/**
 * Telemetry Backfill Command
 *
 * Reconstruct historical telemetry data from existing project artifacts
 * for projects that started before telemetry was available.
 *
 * Sources used for reconstruction:
 * - Git log (commit timestamps, authors, branches, files changed)
 * - Story files (points, status, creation dates)
 * - Decision logs (decision count, duration, files modified)
 * - QA gate results (verdicts, timestamps)
 * - Session state files (agent sequences)
 *
 * Data is marked as `source: 'backfill'` so the dashboard can
 * distinguish reconstructed data from real-time telemetry.
 *
 * @module cli/commands/telemetry/backfill
 * @version 1.0.0
 */

const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { ExecutionTelemetry } = require('../../../development/scripts/execution-telemetry');

/**
 * Parse git log into structured entries
 * @param {string} rootPath - Project root
 * @returns {Array} Git log entries
 */
function parseGitLog(rootPath) {
  try {
    const log = execSync(
      'git log --format="%H|%ai|%an|%s" --no-merges',
      { cwd: rootPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    );
    return log.trim().split('\n').filter(Boolean).map(line => {
      const [hash, date, author, message] = line.split('|');
      return { hash, date, author, message };
    });
  } catch {
    return [];
  }
}

/**
 * Infer agent from commit message
 * @param {string} message - Commit message
 * @returns {string} Inferred agent ID
 */
function inferAgentFromCommit(message) {
  const lower = message.toLowerCase();

  if (lower.includes('[story') || lower.includes('feat:') || lower.includes('fix:') || lower.includes('refactor:')) return 'dev';
  if (lower.includes('qa') || lower.includes('test') || lower.includes('review')) return 'qa';
  if (lower.includes('docs:') || lower.includes('prd') || lower.includes('epic')) return 'pm';
  if (lower.includes('architect') || lower.includes('design')) return 'architect';
  if (lower.includes('chore:') || lower.includes('ci:') || lower.includes('deploy') || lower.includes('devops')) return 'devops';
  if (lower.includes('story') && lower.includes('create')) return 'sm';
  if (lower.includes('validate') || lower.includes('backlog')) return 'po';

  return 'dev'; // default
}

/**
 * Infer workflow phase from commit message
 * @param {string} message - Commit message
 * @returns {string|null} Inferred phase
 */
function inferPhaseFromCommit(message) {
  const lower = message.toLowerCase();

  if (lower.includes('create story') || lower.includes('draft')) return 'create';
  if (lower.includes('validate') || lower.includes('review')) return 'validate';
  if (lower.includes('feat:') || lower.includes('fix:') || lower.includes('implement')) return 'implement';
  if (lower.includes('qa') || lower.includes('test')) return 'qa';

  return null;
}

/**
 * Extract story ID from commit message
 * @param {string} message - Commit message
 * @returns {string|null} Story ID (first match only, used by session grouping)
 */
function extractStoryId(message) {
  const match = message.match(/\[(?:Story\s*)?(\d+(?:\.\d+)*)\]/i)
    || message.match(/story[- ](\d+(?:\.\d+)*)/i);
  return match ? match[1] : null;
}

/**
 * Extract all story IDs from a commit message, including STORY-NNN format
 * and ranges like STORY-028-032.
 * @param {string} message - Commit message
 * @returns {string[]} Array of story IDs (e.g. ["STORY-028", "STORY-029", "STORY-030"])
 */
function extractAllStoryIds(message) {
  const ids = new Set();

  // STORY-NNN-MMM range pattern (e.g. [STORY-028-032])
  const rangePattern = /STORY[- ](\d+)[- ](\d+)/gi;
  let rangeMatch;
  while ((rangeMatch = rangePattern.exec(message)) !== null) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (end > start && end - start <= 20) { // sanity: max 20 stories in a range
      for (let i = start; i <= end; i++) {
        ids.add(`STORY-${String(i).padStart(3, '0')}`);
      }
    }
  }

  // Single STORY-NNN pattern (e.g. [STORY-045])
  const singlePattern = /STORY[- ](\d+)/gi;
  let singleMatch;
  while ((singleMatch = singlePattern.exec(message)) !== null) {
    ids.add(`STORY-${String(parseInt(singleMatch[1], 10)).padStart(3, '0')}`);
  }

  // Legacy numeric pattern [Story 2.1] or [1.2.3]
  const legacyMatch = message.match(/\[(?:Story\s*)?(\d+(?:\.\d+)+)\]/i)
    || message.match(/story[- ](\d+(?:\.\d+)+)/i);
  if (legacyMatch) ids.add(legacyMatch[1]);

  return Array.from(ids);
}

/**
 * Find and parse story files
 * Supports both AIOS-core format (docs/stories/*.md) and
 * Kaven format (docs/planning/stories/**\/*.yaml with effort_hours field).
 * @param {string} rootPath - Project root
 * @returns {Promise<Array>} Story data
 */
async function findStories(rootPath) {
  const stories = [];
  const storyPaths = [
    path.join(rootPath, 'docs', 'stories'),           // AIOS-Core format
    path.join(rootPath, 'docs', 'planning', 'stories'), // Kaven format
  ];

  for (const storiesDir of storyPaths) {
    try {
      const entries = await fs.readdir(storiesDir, { recursive: true });
      for (const entry of entries) {
        // Accept both .md and .yaml; match on basename for subdirectory entries
        const baseName = path.basename(entry).toLowerCase();
        if (!baseName.match(/\.(md|yaml)$/) || !baseName.includes('story')) continue;

        const filePath = path.join(storiesDir, entry);
        try {
          const content = await fs.readFile(filePath, 'utf8');
          let data = {};

          // Parse YAML file (Kaven format)
          if (entry.endsWith('.yaml')) {
            try {
              const parsed = yaml.load(content);
              // Kaven wraps story data under a 'story' key
              data = (parsed && parsed.story) ? parsed.story : (parsed || {});
            } catch {
              // YAML parse failed (e.g. markdown checkboxes in acceptance_criteria)
              // Fall back to regex extraction from raw content
              data = {};
            }
          }
          // Parse Markdown with frontmatter (AIOS-core format)
          else if (entry.endsWith('.md')) {
            try {
              const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (fmMatch) {
                data = yaml.load(fmMatch[1]) || {};
              }
            } catch {
              data = {};
            }
          }

          // Regex fallback: extract scalar fields directly from raw YAML content
          // Works even when YAML parsing fails due to complex nested structures
          const extractField = (fieldName) => {
            const match = content.match(new RegExp(`^\\s{0,4}${fieldName}\\s*:\\s*(.+)$`, 'm'));
            return match ? match[1].trim() : null;
          };

          // Support both 'points'/'storyPoints' and 'effort_hours' fields
          const pointsRaw = data.points || data.storyPoints || data.story_points
            || extractField('points') || extractField('story_points') || null;
          const effortHoursRaw = data.effort_hours || data.effortHours
            || extractField('effort_hours') || null;

          const points = pointsRaw ? parseFloat(pointsRaw) || null : null;
          const effortHours = effortHoursRaw ? parseFloat(effortHoursRaw) || null : null;

          // Convert effort_hours to story points (8h = 1 point, rounded up)
          const estimatedPoints = points
            || (effortHours ? Math.ceil(effortHours / 8) : null);

          const idRaw = data.id || data.storyId || extractField('id');
          const statusRaw = data.status || extractField('status');

          stories.push({
            file: entry,
            storyId: idRaw || path.basename(entry).replace(/\.(md|yaml)$/, ''),
            points: estimatedPoints,
            effortHours: effortHours,
            status: statusRaw || 'unknown',
            complexity: data.complexity || null,
          });
        } catch {
          // Skip files that can't be read
        }
      }
    } catch {
      // Directory might not exist, continue to next path
    }
  }

  return stories;
}

/**
 * Find decision logs
 * @param {string} rootPath - Project root
 * @returns {Promise<Array>} Decision log data
 */
async function findDecisionLogs(rootPath) {
  const logs = [];
  const logDirs = [
    path.join(rootPath, '.ai'),
    path.join(rootPath, 'docs', 'decisions'),
  ];

  for (const dir of logDirs) {
    try {
      const entries = await fs.readdir(dir, { recursive: true });
      for (const entry of entries) {
        if (!entry.includes('decision-log') || !entry.endsWith('.md')) continue;
        try {
          const content = await fs.readFile(path.join(dir, entry), 'utf8');
          const decisionCount = (content.match(/## Decision \d+/gi) || []).length
            || (content.match(/###.*decision/gi) || []).length;
          const filesCount = (content.match(/files? modified/gi) || []).length;
          const durationMatch = content.match(/duration\s*:\s*(\d+(?:\.\d+)?)\s*s/i);

          logs.push({
            file: entry,
            decisions: decisionCount || 1,
            files: filesCount,
            durationMs: durationMatch ? parseFloat(durationMatch[1]) * 1000 : null,
          });
        } catch {
          // Skip
        }
      }
    } catch {
      // Dir not found
    }
  }

  return logs;
}

/**
 * Create the backfill subcommand
 * @returns {Command} Commander command instance
 */
function createBackfillCommand() {
  const backfill = new Command('backfill');

  backfill
    .description('Reconstruct historical telemetry from git log, stories, and decision logs')
    .option('-d, --dry-run', 'Preview what would be reconstructed without writing', false)
    .option('--since <date>', 'Only process commits after this date (ISO or relative, e.g., "2025-01-01")')
    .option('--stories-only', 'Only backfill from story files, skip git', false)
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      try {
        const rootPath = process.cwd();
        const telemetry = ExecutionTelemetry.getInstance();
        await telemetry._ensureConfig();

        console.log('\n\uD83D\uDD04 AIOS Telemetry Backfill');
        console.log('\u2501'.repeat(50));
        console.log('Reconstructing historical data from project artifacts...');
        console.log('');

        // ── Phase 1: Collect git history ─────────────────────
        let commits = [];
        if (!options.storiesOnly) {
          console.log('\uD83D\uDCE6 Phase 1: Analyzing git history...');
          commits = parseGitLog(rootPath);

          if (options.since) {
            const sinceDate = new Date(options.since);
            commits = commits.filter(c => new Date(c.date) >= sinceDate);
          }

          console.log(`  Found ${commits.length} commits`);
        }

        // ── Phase 2: Collect stories ─────────────────────────
        console.log('\uD83D\uDCDD Phase 2: Scanning story files...');
        const stories = await findStories(rootPath);
        console.log(`  Found ${stories.length} stories`);

        // ── Phase 3: Collect decision logs ───────────────────
        console.log('\uD83D\uDCCB Phase 3: Scanning decision logs...');
        const decisionLogs = await findDecisionLogs(rootPath);
        console.log(`  Found ${decisionLogs.length} decision logs`);

        // ── Phase 4: Reconstruct sessions from git ───────────
        console.log('\n\u2699\uFE0F  Phase 4: Reconstructing sessions...');

        // Group commits by day and inferred agent
        const sessionMap = new Map();
        for (const commit of commits) {
          const day = commit.date.substring(0, 10);
          const agent = inferAgentFromCommit(commit.message);
          const key = `${day}|${agent}`;

          if (!sessionMap.has(key)) {
            sessionMap.set(key, {
              day,
              agentId: agent,
              commits: [],
              storyIds: new Set(),
              phases: new Set(),
            });
          }

          const session = sessionMap.get(key);
          session.commits.push(commit);

          const storyId = extractStoryId(commit.message);
          if (storyId) session.storyIds.add(storyId);

          const phase = inferPhaseFromCommit(commit.message);
          if (phase) session.phases.add(phase);
        }

        const reconstructedSessions = Array.from(sessionMap.values());
        console.log(`  Reconstructed ${reconstructedSessions.length} sessions`);

        // ── Phase 5: Reconstruct estimates from stories ──────
        console.log('\uD83D\uDCCA Phase 5: Reconstructing estimates...');
        let estimateCount = 0;
        for (const story of stories) {
          if (story.points || story.effortHours) estimateCount++;
        }
        console.log(`  Found ${stories.length} stories (${estimateCount} with estimates)`);

        // ── Summary ──────────────────────────────────────────
        console.log('\n' + '\u2500'.repeat(50));
        console.log('\uD83D\uDCCB Backfill Summary:');
        console.log(`  Sessions to create:  ${reconstructedSessions.length}`);
        console.log(`  Estimates to record: ${estimateCount}`);
        console.log(`  Decision logs found: ${decisionLogs.length}`);
        console.log(`  Data source marker:  "backfill"`);
        console.log('');

        if (options.verbose) {
          console.log('\n\uD83D\uDD0D Agent Distribution:');
          const agentCounts = {};
          for (const s of reconstructedSessions) {
            agentCounts[s.agentId] = (agentCounts[s.agentId] || 0) + 1;
          }
          for (const [agent, count] of Object.entries(agentCounts).sort((a, b) => b[1] - a[1])) {
            const bar = '\u2588'.repeat(Math.min(count, 40));
            console.log(`  @${agent.padEnd(12)} ${bar} ${count}`);
          }
          console.log('');
        }

        if (options.dryRun) {
          console.log('\u26A0\uFE0F  Dry run - no data written.');
          console.log('  Run without --dry-run to persist backfill data.');
          process.exit(0);
        }

        // ── Phase 6: Persist ─────────────────────────────────
        console.log('\uD83D\uDCBE Phase 6: Persisting backfill data...');

        const data = await telemetry._loadData();
        let added = 0;

        for (const session of reconstructedSessions) {
          const firstCommit = session.commits[session.commits.length - 1]; // oldest
          const lastCommit = session.commits[0]; // newest

          const startTime = new Date(firstCommit.date);
          const endTime = new Date(lastCommit.date);
          // Estimate duration: at least the time span between first and last commit,
          // plus a reasonable buffer (assume 30min per commit as minimum work)
          const commitSpan = endTime - startTime;
          const estimatedDuration = Math.max(commitSpan, session.commits.length * 30 * 60 * 1000);

          const execution = {
            sessionId: `backfill-${session.day}-${session.agentId}`,
            agentId: session.agentId,
            startTime: startTime.toISOString(),
            endTime: new Date(startTime.getTime() + estimatedDuration).toISOString(),
            durationMs: estimatedDuration,
            status: 'completed',
            activationDurationMs: null,
            commands: session.commits.map(c => ({
              name: c.message.substring(0, 80),
              durationMs: null,
              status: 'ok',
              timestamp: c.date,
            })),
            tasks: [],
            phases: Array.from(session.phases).map(p => ({
              phaseId: `backfill-phs-${session.day}-${p}`,
              phaseName: p,
              workflowName: 'sdc',
              durationMs: null,
              status: 'completed',
            })),
            metadata: {
              source: 'backfill',
              storyIds: Array.from(session.storyIds),
              commitCount: session.commits.length,
              backfilledAt: new Date().toISOString(),
            },
          };

          data.executions.push(execution);
          added++;
        }

        // Update aggregates
        telemetry._updateAggregates(data);
        await telemetry._saveData(data);

        // Persist estimates
        for (const story of stories) {
          if (!story.points && !story.effortHours) continue;

          await telemetry.recordEstimate('story', story.storyId, {
            points: story.points,
            hours: story.effortHours || null,
            complexity: story.complexity,
            source: 'backfill',
          });
        }

        // ── Phase 7: Match estimates with actuals ────────────
        console.log('\uD83D\uDCCA Phase 7: Matching estimates with actuals...');

        // Build a map of storyId → related commits (time spans)
        const storyCommitMap = new Map(); // storyId → commit[]
        for (const commit of commits) {
          const storyIds = extractAllStoryIds(commit.message);
          for (const storyId of storyIds) {
            if (!storyCommitMap.has(storyId)) {
              storyCommitMap.set(storyId, []);
            }
            storyCommitMap.get(storyId).push(commit);
          }
        }

        // Also look inside reconstructed sessions' storyIds metadata
        const storySessionMap = new Map(); // storyId → session[]
        for (const session of reconstructedSessions) {
          for (const storyId of session.storyIds) {
            // Normalize to STORY-NNN format if numeric
            const normalized = /^\d+$/.test(storyId)
              ? `STORY-${storyId.padStart(3, '0')}`
              : storyId.toUpperCase();
            if (!storySessionMap.has(normalized)) {
              storySessionMap.set(normalized, []);
            }
            storySessionMap.get(normalized).push(session);
          }
        }

        let matchedEstimates = 0;
        const estimatesData = await telemetry._loadEstimates();

        for (const entry of estimatesData.estimates) {
          const storyId = entry.entityId; // e.g. "STORY-039"

          // Priority 1: commits that mention this story ID directly
          const relatedCommits = storyCommitMap.get(storyId) || [];

          // Priority 2: sessions that had storyIds matching
          const relatedSessions = storySessionMap.get(storyId) || [];

          let actualHours = null;

          if (relatedCommits.length > 0) {
            // Calculate span between first and last commit for this story
            const dates = relatedCommits.map(c => new Date(c.date).getTime());
            const minDate = Math.min(...dates);
            const maxDate = Math.max(...dates);
            const spanHours = (maxDate - minDate) / (1000 * 60 * 60);

            // Use span if > 30min, otherwise apply conservative 2h/commit
            if (spanHours > 0.5) {
              // Add 2h buffer for work before first commit and after last
              actualHours = +(spanHours + 2).toFixed(1);
            } else {
              // Single commit or very close commits: 2h flat
              actualHours = relatedCommits.length * 2;
            }
          } else if (relatedSessions.length > 0) {
            // Fallback: use session durations if no direct commit match
            const totalMs = relatedSessions.reduce((sum, s) => {
              return sum + (s.commits.length * 30 * 60 * 1000); // 30min/commit
            }, 0);
            actualHours = +(totalMs / (1000 * 60 * 60)).toFixed(1);
          }

          if (actualHours !== null && actualHours > 0) {
            await telemetry.updateEstimateActual('story', storyId, {
              hours: actualHours,
              durationMs: actualHours * 60 * 60 * 1000,
              sessions: relatedCommits.length || relatedSessions.length,
              agents: ['dev'],
            });
            matchedEstimates++;
          }
        }

        const finalEstimatesData = await telemetry._loadEstimates();
        const withActuals = finalEstimatesData.estimates.filter(e => e.actual !== null).length;
        console.log(`  \u2705 Matched ${matchedEstimates} estimates with actuals`);
        console.log(`  Stories with accuracy calculable: ${withActuals}/${finalEstimatesData.estimates.length}`);

        console.log(`  \u2705 Added ${added} sessions`);
        console.log(`  \u2705 Added ${estimateCount} estimates`);
        console.log('');
        console.log('\u2705 Backfill complete!');
        console.log('  Run `aios telemetry show` to see reconstructed data.');
        console.log('  Backfill data is tagged with source:"backfill" in metadata.');

        process.exit(0);
      } catch (error) {
        console.error(`\n\u274c Error: ${error.message}`);
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return backfill;
}

module.exports = {
  createBackfillCommand,
};
