/**
 * Claude Code Token Parser
 *
 * Parses Claude Code session JSONL files to extract real token usage
 * per project, session, model, and day. Calculates simulated API costs
 * using official Anthropic pricing.
 *
 * Data sources:
 * - ~/.claude/projects/{project-slug}/*.jsonl  (per-session transcripts)
 * - ~/.claude/stats-cache.json                  (aggregated stats)
 *
 * Supports hybrid tracking:
 * - Claude Code (parsed from JSONL logs)
 * - Direct API (recorded by ExecutionTelemetry hooks)
 *
 * @module development/scripts/claude-code-token-parser
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

/**
 * Official Anthropic pricing per MTok (million tokens) in USD
 * Source: https://docs.anthropic.com/en/docs/about-claude/pricing
 * Last updated: 2026-02-15
 */
const PRICING = {
  'claude-opus-4-6': {
    input: 5.00,
    output: 25.00,
    cacheWrite5m: 6.25,
    cacheWrite1h: 10.00,
    cacheRead: 0.50,
  },
  'claude-opus-4-5': {
    input: 5.00,
    output: 25.00,
    cacheWrite5m: 6.25,
    cacheWrite1h: 10.00,
    cacheRead: 0.50,
  },
  'claude-opus-4-1': {
    input: 15.00,
    output: 75.00,
    cacheWrite5m: 18.75,
    cacheWrite1h: 30.00,
    cacheRead: 1.50,
  },
  'claude-sonnet-4-5': {
    input: 3.00,
    output: 15.00,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.00,
    cacheRead: 0.30,
  },
  'claude-sonnet-4': {
    input: 3.00,
    output: 15.00,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.00,
    cacheRead: 0.30,
  },
  'claude-haiku-4-5': {
    input: 1.00,
    output: 5.00,
    cacheWrite5m: 1.25,
    cacheWrite1h: 2.00,
    cacheRead: 0.10,
  },
  'claude-haiku-3': {
    input: 0.25,
    output: 1.25,
    cacheWrite5m: 0.30,
    cacheWrite1h: 0.50,
    cacheRead: 0.03,
  },
};

/**
 * Normalize model ID to pricing key
 * e.g., 'claude-sonnet-4-5-20250929' -> 'claude-sonnet-4-5'
 */
function normalizePricingKey(modelId) {
  if (!modelId) return null;

  // Remove date suffix (e.g., -20250929, -20251001, -20251101)
  const base = modelId.replace(/-\d{8}$/, '');

  if (PRICING[base]) return base;

  // Try fuzzy match
  for (const key of Object.keys(PRICING)) {
    if (base.includes(key) || key.includes(base)) return key;
  }

  return null;
}

/**
 * Calculate cost for token usage
 */
function calculateCost(usage, modelId) {
  const pricingKey = normalizePricingKey(modelId);
  if (!pricingKey) return 0;

  const prices = PRICING[pricingKey];
  const MTok = 1_000_000;

  const inputCost = (usage.inputTokens || 0) / MTok * prices.input;
  const outputCost = (usage.outputTokens || 0) / MTok * prices.output;
  // Claude Code uses 5-minute cache by default
  const cacheWriteCost = (usage.cacheCreationTokens || 0) / MTok * prices.cacheWrite5m;
  const cacheReadCost = (usage.cacheReadTokens || 0) / MTok * prices.cacheRead;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * Get friendly model name
 */
function friendlyModelName(modelId) {
  if (!modelId) return 'unknown';
  return modelId
    .replace(/-\d{8}$/, '')
    .replace('claude-', '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parse a single JSONL session file
 */
async function parseSessionFile(filePath) {
  const results = {
    sessionId: null,
    project: null,
    messages: 0,
    toolCalls: 0,
    models: {},
    byDay: {},
    firstTimestamp: null,
    lastTimestamp: null,
  };

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);

      if (!results.sessionId && obj.sessionId) {
        results.sessionId = obj.sessionId;
      }

      const ts = obj.timestamp;
      if (ts) {
        if (!results.firstTimestamp || ts < results.firstTimestamp) results.firstTimestamp = ts;
        if (!results.lastTimestamp || ts > results.lastTimestamp) results.lastTimestamp = ts;
      }

      if (obj.type === 'assistant') {
        results.messages++;
        const msg = obj.message || {};
        const usage = msg.usage || {};
        const model = msg.model || 'unknown';
        const day = (ts || '').substring(0, 10);

        // Accumulate by model
        if (!results.models[model]) {
          results.models[model] = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            messages: 0,
          };
        }
        const m = results.models[model];
        m.inputTokens += usage.input_tokens || 0;
        m.outputTokens += usage.output_tokens || 0;
        m.cacheReadTokens += usage.cache_read_input_tokens || 0;
        m.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
        m.messages++;

        // Accumulate by day
        if (day) {
          if (!results.byDay[day]) {
            results.byDay[day] = {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              cacheCreationTokens: 0,
              messages: 0,
              models: {},
            };
          }
          const d = results.byDay[day];
          d.inputTokens += usage.input_tokens || 0;
          d.outputTokens += usage.output_tokens || 0;
          d.cacheReadTokens += usage.cache_read_input_tokens || 0;
          d.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
          d.messages++;

          if (!d.models[model]) d.models[model] = 0;
          d.models[model] += (usage.input_tokens || 0) + (usage.output_tokens || 0);
        }

        // Count tool calls in content
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === 'tool_use') results.toolCalls++;
          }
        }
      }
    } catch {
      // Skip malformed lines
    }
  }

  return results;
}

/**
 * Derive a human-readable project name from a Claude Code slug.
 * Strips user/mount path prefixes and keeps only the meaningful tail.
 *
 * Examples:
 *   -media-bychrisr-externo-projects-work-aios-core  → aios-core
 *   -home-user-projects-work-seja-eleito             → seja-eleito
 *   -media-bychrisr-externo-projects-learning-foo    → foo
 *   -home-user--claude-mem-observer-sessions         → claude-mem (observer)
 *   -home-user                                       → ~ (home)
 */
function prettifySlug(slug) {
  let s = slug;

  // 1. Strip leading hyphens
  s = s.replace(/^-+/, '');

  // 2. Common path prefixes: keep only after last known directory marker
  //    Patterns: home/{user}/projects/{work|personal|learning}/...
  //              media/{user}/{disk}/projects/{work|personal|learning}/...
  //              Users/{user}/projects/...
  const pathPrefixRe = /^(?:media-[^-]+-[^-]+-|home-[^-]+-|users-[^-]+-)?(?:projects?-(?:work-|personal-|learning-)?)?/i;
  const stripped = s.replace(pathPrefixRe, '');

  // 3. If stripping left something meaningful, use it
  if (stripped && stripped.length > 1 && stripped !== s) {
    s = stripped;
  }

  // 4. Special: claude-mem observer sessions → "claude-mem (observer)"
  if (s.includes('claude-mem-observer')) {
    return 'claude-mem (observer)';
  }

  // 5. Special: bare home dir → "~ (home)"
  if (/^home-[^-]+$/.test(s) || s === 'home' || s === '~home') {
    return '~ (home)';
  }

  // 6. Special: area de trabalho (Desktop) paths
  s = s.replace(/-*rea-de-trabalho-/i, '');

  // 7. Long nested paths like AI-CORE-AIOS-squads-mmos-squad → mmos-squad
  const nestedMatch = s.match(/(?:squads?|packages?|apps?|libs?|modules?)-(.+)$/i);
  if (nestedMatch && nestedMatch[1].length > 2) {
    s = nestedMatch[1];
  }

  // 8. Clean up remaining leading/trailing hyphens
  s = s.replace(/^-+|-+$/g, '');

  return s || slug;
}

/**
 * Parse all projects under ~/.claude/projects/
 */
async function parseAllProjects(claudeDir) {
  const projectsDir = path.join(claudeDir || path.join(os.homedir(), '.claude'), 'projects');
  const results = {};

  if (!fs.existsSync(projectsDir)) return results;

  const projectSlugs = fs.readdirSync(projectsDir).filter(f => {
    return fs.statSync(path.join(projectsDir, f)).isDirectory();
  });

  for (const slug of projectSlugs) {
    const projDir = path.join(projectsDir, slug);
    const jsonlFiles = fs.readdirSync(projDir).filter(f => f.endsWith('.jsonl'));

    if (jsonlFiles.length === 0) continue;

    const projectData = {
      slug,
      friendlyName: prettifySlug(slug),
      sessions: [],
      totals: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        messages: 0,
        toolCalls: 0,
      },
      byModel: {},
      byDay: {},
      costByModel: {},
      totalCost: 0,
    };

    for (const jsonl of jsonlFiles) {
      const session = await parseSessionFile(path.join(projDir, jsonl));
      session.project = slug;
      projectData.sessions.push(session);

      // Merge totals
      for (const [model, usage] of Object.entries(session.models)) {
        projectData.totals.inputTokens += usage.inputTokens;
        projectData.totals.outputTokens += usage.outputTokens;
        projectData.totals.cacheReadTokens += usage.cacheReadTokens;
        projectData.totals.cacheCreationTokens += usage.cacheCreationTokens;
        projectData.totals.messages += usage.messages;

        if (!projectData.byModel[model]) {
          projectData.byModel[model] = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            messages: 0,
          };
        }
        const m = projectData.byModel[model];
        m.inputTokens += usage.inputTokens;
        m.outputTokens += usage.outputTokens;
        m.cacheReadTokens += usage.cacheReadTokens;
        m.cacheCreationTokens += usage.cacheCreationTokens;
        m.messages += usage.messages;
      }

      projectData.totals.toolCalls += session.toolCalls;

      // Merge daily data
      for (const [day, dayData] of Object.entries(session.byDay)) {
        if (!projectData.byDay[day]) {
          projectData.byDay[day] = {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            messages: 0,
            models: {},
          };
        }
        const d = projectData.byDay[day];
        d.inputTokens += dayData.inputTokens;
        d.outputTokens += dayData.outputTokens;
        d.cacheReadTokens += dayData.cacheReadTokens;
        d.cacheCreationTokens += dayData.cacheCreationTokens;
        d.messages += dayData.messages;
        for (const [model, tokens] of Object.entries(dayData.models)) {
          d.models[model] = (d.models[model] || 0) + tokens;
        }
      }
    }

    // Calculate costs per model
    for (const [model, usage] of Object.entries(projectData.byModel)) {
      const cost = calculateCost(usage, model);
      projectData.costByModel[model] = {
        ...usage,
        friendlyName: friendlyModelName(model),
        cost,
      };
      projectData.totalCost += cost;
    }

    results[slug] = projectData;
  }

  return results;
}

/**
 * Parse stats-cache.json for global aggregates
 */
function parseStatsCache(claudeDir) {
  const statsPath = path.join(claudeDir || path.join(os.homedir(), '.claude'), 'stats-cache.json');
  if (!fs.existsSync(statsPath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const result = {
      totalSessions: data.totalSessions || 0,
      totalMessages: data.totalMessages || 0,
      firstSession: data.firstSessionDate,
      modelUsage: {},
      dailyTokens: data.dailyModelTokens || [],
      dailyActivity: data.dailyActivity || [],
      totalCost: 0,
    };

    for (const [model, usage] of Object.entries(data.modelUsage || {})) {
      const normalized = {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        cacheReadTokens: usage.cacheReadInputTokens || 0,
        cacheCreationTokens: usage.cacheCreationInputTokens || 0,
      };
      const cost = calculateCost(normalized, model);
      result.modelUsage[model] = {
        ...normalized,
        friendlyName: friendlyModelName(model),
        cost,
      };
      result.totalCost += cost;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Build a full report object from parsed project data and global stats.
 * Used internally to avoid code duplication between global and project-scoped reports.
 */
function buildReport(projects, globalStats) {
  // Build project summary sorted by cost
  const projectSummary = Object.values(projects)
    .map(p => ({
      slug: p.slug,
      name: p.friendlyName,
      sessions: p.sessions.length,
      messages: p.totals.messages,
      toolCalls: p.totals.toolCalls,
      inputTokens: p.totals.inputTokens,
      outputTokens: p.totals.outputTokens,
      cacheReadTokens: p.totals.cacheReadTokens,
      cacheCreationTokens: p.totals.cacheCreationTokens,
      totalTokens: p.totals.inputTokens + p.totals.outputTokens +
        p.totals.cacheReadTokens + p.totals.cacheCreationTokens,
      costByModel: p.costByModel,
      totalCost: p.totalCost,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  // Build daily timeline across all projects
  const dailyMap = {};
  for (const p of Object.values(projects)) {
    for (const [day, data] of Object.entries(p.byDay)) {
      if (!dailyMap[day]) {
        dailyMap[day] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, messages: 0, cost: 0 };
      }
      dailyMap[day].inputTokens += data.inputTokens;
      dailyMap[day].outputTokens += data.outputTokens;
      dailyMap[day].cacheReadTokens += data.cacheReadTokens;
      dailyMap[day].cacheCreationTokens += data.cacheCreationTokens;
      dailyMap[day].messages += data.messages;
    }
  }

  // Calculate daily costs
  const dailyTimeline = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => {
      // Estimate cost using weighted average pricing
      const totalTokens = data.inputTokens + data.outputTokens + data.cacheReadTokens + data.cacheCreationTokens;
      // Use global model distribution to estimate per-day cost
      let dayCost = 0;
      if (globalStats) {
        const totalGlobalTokens = Object.values(globalStats.modelUsage)
          .reduce((s, m) => s + m.inputTokens + m.outputTokens + m.cacheReadTokens + m.cacheCreationTokens, 0);
        if (totalGlobalTokens > 0) {
          dayCost = (totalTokens / totalGlobalTokens) * globalStats.totalCost;
        }
      }
      return { date, ...data, cost: dayCost };
    });

  // Model breakdown across all projects
  const modelBreakdown = {};
  for (const p of Object.values(projects)) {
    for (const [model, usage] of Object.entries(p.costByModel)) {
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = {
          friendlyName: usage.friendlyName,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreationTokens: 0,
          messages: 0,
          cost: 0,
        };
      }
      const m = modelBreakdown[model];
      m.inputTokens += usage.inputTokens;
      m.outputTokens += usage.outputTokens;
      m.cacheReadTokens += usage.cacheReadTokens;
      m.cacheCreationTokens += usage.cacheCreationTokens;
      m.messages += usage.messages;
      m.cost += usage.cost;
    }
  }

  const totalCost = projectSummary.reduce((s, p) => s + p.totalCost, 0);

  return {
    source: 'claude-code',
    generatedAt: new Date().toISOString(),
    pricing: PRICING,
    global: globalStats,
    totalCost,
    projectSummary,
    modelBreakdown,
    dailyTimeline,
  };
}

/**
 * Generate complete token report for the telemetry API.
 *
 * @param {string} [claudeDir] - Override path to ~/.claude directory
 * @param {string} [currentProjectSlug] - If provided, returns dual-scope
 *   { project, global, currentProjectSlug } structure. If omitted, returns
 *   the same flat structure as before (backward compatible).
 */
async function generateTokenReport(claudeDir, currentProjectSlug) {
  const [projects, globalStats] = await Promise.all([
    parseAllProjects(claudeDir),
    Promise.resolve(parseStatsCache(claudeDir)),
  ]);

  // Build the global (all-projects) report
  const globalReport = buildReport(projects, globalStats);

  // If no slug provided, return flat structure for backward compatibility
  if (!currentProjectSlug) {
    return globalReport;
  }

  // Build project-scoped report for the matching slug
  const matchingProject = projects[currentProjectSlug];

  if (!matchingProject) {
    // Project slug not found - return empty project-scoped data
    return {
      project: {
        source: 'claude-code',
        generatedAt: new Date().toISOString(),
        pricing: PRICING,
        global: globalStats,
        totalCost: 0,
        projectSummary: [],
        modelBreakdown: {},
        dailyTimeline: [],
        notFound: true,
      },
      global: globalReport,
      currentProjectSlug,
    };
  }

  // Build project-scoped report from only the matching project's data
  const projectOnly = { [currentProjectSlug]: matchingProject };
  const projectReport = buildReport(projectOnly, globalStats);
  projectReport.notFound = false;

  return {
    project: projectReport,
    global: globalReport,
    currentProjectSlug,
  };
}

module.exports = {
  PRICING,
  calculateCost,
  normalizePricingKey,
  friendlyModelName,
  parseSessionFile,
  parseAllProjects,
  parseStatsCache,
  generateTokenReport,
};
