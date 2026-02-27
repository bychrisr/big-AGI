/**
 * Telemetry Analytics Engine
 *
 * Provides advanced analytics computed from telemetry data, token reports,
 * and git statistics. Called by the dashboard server's /api/analytics endpoint.
 *
 * @module telemetry-analytics
 */

const { PRICING, calculateCost } = require('./claude-code-token-parser');

/** Default hourly rate for human developer equivalent (USD) */
const DEFAULT_DEVELOPER_RATE = 75;

/** Budget alert thresholds in USD */
const BUDGET_THRESHOLDS = [
  { level: 'info', threshold: 100, message: 'Projected monthly spend exceeds $100' },
  { level: 'warning', threshold: 500, message: 'Projected monthly spend exceeds $500' },
  { level: 'critical', threshold: 1000, message: 'Projected monthly spend exceeds $1,000' },
];

/** Cache ratio above which a project is flagged for excessive context reloading */
const HIGH_CACHE_RATIO_THRESHOLD = 0.9;

/**
 * Safely access a nested property, returning a fallback if any part is nullish.
 * @param {Function} accessor
 * @param {*} fallback
 * @returns {*}
 */
function safe(accessor, fallback) {
  try {
    const val = accessor();
    return val == null ? fallback : val;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Section Calculators
// ---------------------------------------------------------------------------

/**
 * Calculate ROI metrics comparing AI agent cost to human developer equivalent.
 *
 * @param {object} telemetryData
 * @param {object} tokenReport
 * @param {number} [developerRate]
 * @returns {object}
 */
function calculateROI(telemetryData, tokenReport, developerRate = DEFAULT_DEVELOPER_RATE) {
  // Check both top-level and nested under aggregates
  const totalDurationMs = safe(() => telemetryData.aggregates.totalDurationMs, 0)
    || safe(() => telemetryData.totalDurationMs, 0);
  const hoursWorked = totalDurationMs / 3_600_000;
  const aiCostUSD = safe(() => tokenReport.totalCost, 0);
  const humanEquivalentUSD = hoursWorked * developerRate;
  const savings = humanEquivalentUSD - aiCostUSD;
  const roiMultiplier = aiCostUSD > 0 ? humanEquivalentUSD / aiCostUSD : 0;
  const avgCostPerHour = hoursWorked > 0 ? aiCostUSD / hoursWorked : 0;

  return {
    aiCostUSD: round(aiCostUSD),
    humanEquivalentUSD: round(humanEquivalentUSD),
    savings: round(savings),
    roiMultiplier: round(roiMultiplier, 1),
    hoursWorked: round(hoursWorked, 2),
    avgCostPerHour: round(avgCostPerHour),
  };
}

/**
 * Analyze daily spending and generate budget alerts.
 *
 * @param {object} tokenReport
 * @returns {object}
 */
function calculateBudgetAlerts(tokenReport) {
  const timeline = safe(() => tokenReport.dailyTimeline, []);

  if (!Array.isArray(timeline) || timeline.length === 0) {
    return { dailyAvg: 0, dailyMax: 0, projectedMonthly: 0, alerts: [] };
  }

  const dailyCosts = timeline.map((d) => safe(() => d.cost, 0));
  const dailyAvg = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
  const dailyMax = Math.max(...dailyCosts);
  const projectedMonthly = dailyAvg * 30;

  const alerts = BUDGET_THRESHOLDS
    .filter((t) => projectedMonthly > t.threshold)
    .map((t) => ({ level: t.level, message: t.message, threshold: t.threshold }));

  // Include daily timeline for frontend chart
  const dailyData = timeline.map((d) => ({
    date: safe(() => d.date, ''),
    cost: safe(() => d.cost, 0),
    tokens: safe(() => d.tokens, 0),
  }));

  return {
    dailyAvg: round(dailyAvg),
    dailyMax: round(dailyMax),
    projectedMonthly: round(projectedMonthly),
    alerts,
    dailyData,
  };
}

/**
 * Score each agent's efficiency based on success rate relative to time spent.
 *
 * @param {object} telemetryData
 * @returns {Array<object>}
 */
function calculateAgentEfficiency(telemetryData) {
  // Try byAgent first (from getDashboard), then aggregates.byAgent (fallback)
  let byAgent = safe(() => telemetryData.byAgent, null);
  if (!byAgent || Object.keys(byAgent).length === 0) {
    byAgent = safe(() => telemetryData.aggregates.byAgent, {});
  }
  const agents = Object.entries(byAgent);

  if (agents.length === 0) return [];

  const scored = agents.map(([agent, data]) => {
    const sessions = safe(() => data.sessions, 0);
    const avgDurationMs = safe(() => data.avgDurationMs, 0);
    const successRate = safe(() => data.successRate, 0);
    const avgMinutes = avgDurationMs / 60_000;
    // Efficiency = success percentage per minute of average session time
    const efficiencyScore = avgMinutes > 0 ? (successRate * 100) / avgMinutes : 0;

    return {
      agent,
      sessions,
      avgMinutes: round(avgMinutes, 2),
      successRate: round(successRate, 4),
      efficiencyScore: round(efficiencyScore, 2),
      rank: 0,
    };
  });

  // Sort descending by efficiency, then assign ranks
  scored.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
  scored.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return scored;
}

/**
 * Detect potential token waste: excessive cache reloading and low-efficiency sessions.
 *
 * @param {object} tokenReport
 * @returns {object}
 */
function calculateTokenWaste(tokenReport) {
  const projectSummary = safe(() => tokenReport.projectSummary, []);
  const highCacheProjects = [];
  let totalWastedEstimate = 0;

  if (Array.isArray(projectSummary)) {
    for (const project of projectSummary) {
      const cacheRead = safe(() => project.cacheRead, 0);
      const totalTokens = safe(() => project.totalTokens, 0);
      if (totalTokens > 0) {
        const cacheRatio = cacheRead / totalTokens;
        if (cacheRatio > HIGH_CACHE_RATIO_THRESHOLD) {
          const wastedCost = safe(() => project.cost, 0) * (cacheRatio - HIGH_CACHE_RATIO_THRESHOLD);
          totalWastedEstimate += wastedCost;
          highCacheProjects.push({
            project: safe(() => project.name, 'unknown'),
            cacheRatio: round(cacheRatio, 4),
            totalTokens,
            estimatedWaste: round(wastedCost),
          });
        }
      }
    }
  }

  // Low efficiency sessions: high token count but few messages
  const sessions = safe(() => tokenReport.sessions, []);
  const lowEfficiencySessions = [];

  if (Array.isArray(sessions)) {
    for (const session of sessions) {
      const tokens = safe(() => session.totalTokens, 0);
      const messages = safe(() => session.messageCount, 0);
      if (tokens > 50_000 && messages > 0 && messages < 5) {
        lowEfficiencySessions.push({
          sessionId: safe(() => session.id, 'unknown'),
          totalTokens: tokens,
          messageCount: messages,
          tokensPerMessage: Math.round(tokens / messages),
        });
      }
    }
  }

  // Also compute total productive cost for context
  const totalCost = safe(() => tokenReport.totalCost, 0);
  const wastePercent = totalCost > 0 ? round((totalWastedEstimate / totalCost) * 100, 1) : 0;

  return {
    highCacheProjects,
    lowEfficiencySessions,
    totalWastedEstimate: round(totalWastedEstimate),
    totalCost: round(totalCost),
    wastePercent,
  };
}

/**
 * Correlate story complexity (points) with actual cost and duration.
 *
 * @param {object} telemetryData
 * @param {object} tokenReport
 * @returns {Array<object>}
 */
function calculateComplexityCost(telemetryData, tokenReport) {
  // Try multiple locations for estimates data
  const estimates = safe(() => telemetryData.estimatesData.estimates, null)
    || safe(() => telemetryData.estimates, null)
    || [];

  if (!Array.isArray(estimates) || estimates.length === 0) return [];

  const totalCost = safe(() => tokenReport.totalCost, 0);
  const totalDurationMs = safe(() => telemetryData.aggregates.totalDurationMs, 0)
    || safe(() => telemetryData.totalDurationMs, 1);

  return estimates.map((entry) => {
    // Support both flat and nested estimate fields
    const points = safe(() => entry.estimate.points, 0) || safe(() => entry.storyPoints, 0);
    const actualMs = safe(() => entry.actual.durationMs, 0) || safe(() => entry.actualDurationMs, 0);
    const estimatedHrs = safe(() => entry.estimate.hours, 0);
    const actualHours = actualMs / 3_600_000;
    const estimatedHours = estimatedHrs || (actualMs > 0 ? actualHours : 0);
    const durationShare = totalDurationMs > 0 ? actualMs / totalDurationMs : 0;
    const costPerPoint = points > 0 ? (totalCost * durationShare) / points : 0;

    return {
      storyId: safe(() => entry.entityId, null) || safe(() => entry.storyId, 'unknown'),
      points,
      actualHours: round(actualHours, 2),
      estimatedHours: round(estimatedHours, 2),
      costPerPoint: round(costPerPoint),
    };
  });
}

/**
 * Build a 24-hour activity heatmap and day-of-week distribution.
 *
 * @param {object} tokenReport
 * @param {object} telemetryData
 * @returns {object}
 */
function calculateHeatmap(tokenReport, telemetryData) {
  // Initialize 24 hour slots
  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0); // 0=Sunday .. 6=Saturday

  // Try hourCounts from global dailyActivity
  const globalHourCounts = safe(() => tokenReport.global.dailyActivity.hourCounts, null);
  if (Array.isArray(globalHourCounts) && globalHourCounts.length === 24) {
    for (let i = 0; i < 24; i++) {
      hourCounts[i] += globalHourCounts[i] || 0;
    }
  }

  // Extract from raw executions for both hour and day-of-week distributions
  const executions = safe(() => telemetryData.executions, null)
    || safe(() => telemetryData.rawExecutions, []);
  if (Array.isArray(executions)) {
    for (const exec of executions) {
      const startTime = safe(() => exec.startTime, null);
      if (startTime) {
        const date = new Date(startTime);
        if (!isNaN(date.getTime())) {
          // Only count hours if timestamp has time info (not just date)
          if (startTime.length > 10) {
            hourCounts[date.getHours()]++;
          }
          dayCounts[date.getDay()]++;
        }
      }
    }
  }

  // If no hour data from executions, derive from dailyTimeline session counts
  const hasHourData = hourCounts.some(c => c > 0);
  if (!hasHourData) {
    const timeline = safe(() => tokenReport.dailyTimeline, []);
    if (Array.isArray(timeline)) {
      for (const day of timeline) {
        const dateStr = safe(() => day.date, '');
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            dayCounts[d.getDay()] += safe(() => day.sessions, 1);
          }
          // Distribute activity across working hours (9-18) as approximation
          const sessions = safe(() => day.sessions, 1);
          for (let h = 9; h <= 18; h++) {
            hourCounts[h] += Math.ceil(sessions / 10);
          }
        }
      }
    }
  }

  // Normalize to 0-10 scale
  const maxCount = Math.max(...hourCounts, 1);
  const hourly = hourCounts.map((count, hour) => ({
    hour,
    count,
    level: Math.round((count / maxCount) * 10),
  }));

  // Find peak and quiet hours
  let peakHour = 0;
  let quietHour = 0;
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] > hourCounts[peakHour]) peakHour = h;
    if (hourCounts[h] < hourCounts[quietHour]) quietHour = h;
  }

  // Find peak day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let peakDayIdx = 0;
  for (let d = 0; d < 7; d++) {
    if (dayCounts[d] > dayCounts[peakDayIdx]) peakDayIdx = d;
  }

  return {
    hourly,
    peakHour,
    quietHour,
    peakDayOfWeek: dayNames[peakDayIdx],
  };
}

/**
 * Generate "what-if" model comparison scenarios.
 *
 * @param {object} tokenReport
 * @returns {object}
 */
function calculateModelComparison(tokenReport) {
  const modelBreakdown = safe(() => tokenReport.modelBreakdown, {});
  const pricing = safe(() => tokenReport.pricing, PRICING);
  const models = Object.entries(modelBreakdown);

  if (models.length === 0) {
    return { scenarios: [], recommendation: 'Insufficient data for model comparison.' };
  }

  // Aggregate total tokens across all models
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  let currentTotalCost = 0;

  for (const [, data] of models) {
    totalInputTokens += safe(() => data.inputTokens, 0);
    totalOutputTokens += safe(() => data.outputTokens, 0);
    totalCacheReadTokens += safe(() => data.cacheReadTokens, 0);
    totalCacheWriteTokens += safe(() => data.cacheWriteTokens, 0);
    currentTotalCost += safe(() => data.cost, 0);
  }

  // If we have no cost from breakdown, use global
  if (currentTotalCost === 0) {
    currentTotalCost = safe(() => tokenReport.totalCost, 0);
  }

  // Calculate hypothetical cost for each available model
  const availableModels = Object.keys(pricing);
  const scenarios = availableModels.map((modelName) => {
    const modelPricing = pricing[modelName];
    if (!modelPricing) {
      return { useModel: modelName, totalCost: 0, savingsVsCurrent: 0 };
    }

    const inputCostPer = safe(() => modelPricing.input, 0);
    const outputCostPer = safe(() => modelPricing.output, 0);
    const cacheReadCostPer = safe(() => modelPricing.cacheRead, 0);
    const cacheWriteCostPer = safe(() => modelPricing.cacheWrite, 0);

    // Cost per token (pricing is typically per million tokens)
    const divisor = 1_000_000;
    const totalCost =
      (totalInputTokens * inputCostPer) / divisor +
      (totalOutputTokens * outputCostPer) / divisor +
      (totalCacheReadTokens * cacheReadCostPer) / divisor +
      (totalCacheWriteTokens * cacheWriteCostPer) / divisor;

    return {
      useModel: modelName,
      totalCost: round(totalCost),
      savingsVsCurrent: round(currentTotalCost - totalCost),
    };
  });

  // Sort by cost ascending
  scenarios.sort((a, b) => a.totalCost - b.totalCost);

  const cheapest = scenarios[0];
  const recommendation =
    cheapest && cheapest.savingsVsCurrent > 0
      ? `Switching entirely to ${cheapest.useModel} could save ~$${cheapest.savingsVsCurrent.toFixed(2)}/period.`
      : 'Current model mix is already cost-optimal or data is insufficient for comparison.';

  return { scenarios, recommendation };
}

/**
 * Compute git-related impact metrics.
 *
 * @param {object} tokenReport
 * @param {object} [gitStats]
 * @returns {object}
 */
function calculateGitImpact(tokenReport, gitStats) {
  // totalTokens may not exist directly; compute from modelBreakdown
  let totalTokens = safe(() => tokenReport.global.totalTokens, 0) || safe(() => tokenReport.totalTokens, 0);
  if (!totalTokens) {
    const breakdown = safe(() => tokenReport.modelBreakdown, {});
    for (const data of Object.values(breakdown)) {
      totalTokens += safe(() => data.inputTokens, 0)
        + safe(() => data.outputTokens, 0)
        + safe(() => data.cacheReadTokens, 0)
        + safe(() => data.cacheWriteTokens, 0);
    }
  }
  const totalCost = safe(() => tokenReport.totalCost, 0);
  const totalCommits = safe(() => gitStats.totalCommits, 0);
  const totalFilesChanged = safe(() => gitStats.totalFilesChanged, 0);
  const totalLinesAdded = safe(() => gitStats.totalLinesAdded, 0);
  const totalLinesRemoved = safe(() => gitStats.totalLinesRemoved, 0);
  const totalLines = totalLinesAdded + totalLinesRemoved;

  return {
    tokensPerCommit: totalCommits > 0 ? Math.round(totalTokens / totalCommits) : 0,
    costPerCommit: totalCommits > 0 ? round(totalCost / totalCommits) : 0,
    tokensPerFile: totalFilesChanged > 0 ? Math.round(totalTokens / totalFilesChanged) : 0,
    costPerLine: totalLines > 0 ? round(totalCost / totalLines, 4) : 0,
    totalCommits,
  };
}

/**
 * Group executions by epic and calculate cost per epic.
 *
 * @param {object} telemetryData
 * @param {object} tokenReport
 * @returns {Array<object>}
 */
function calculateSprintCost(telemetryData, tokenReport) {
  const executions = safe(() => telemetryData.executions, null)
    || safe(() => telemetryData.rawExecutions, []);
  const totalCost = safe(() => tokenReport.totalCost, 0);
  const totalDurationMs = safe(() => telemetryData.aggregates.totalDurationMs, 0)
    || safe(() => telemetryData.totalDurationMs, 1);

  if (!Array.isArray(executions) || executions.length === 0) return [];

  const groupMap = new Map();

  for (const exec of executions) {
    // Try epicId first, fall back to grouping by agentId for backfilled data
    const epicId = safe(() => exec.metadata.epicId, null);
    const groupKey = epicId || `agent-${safe(() => exec.agentId, 'unknown')}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { sessions: 0, totalMs: 0, stories: new Set() });
    }

    const entry = groupMap.get(groupKey);
    entry.sessions++;
    entry.totalMs += safe(() => exec.durationMs, 0);

    const storyId = safe(() => exec.metadata.storyId, null);
    if (storyId) entry.stories.add(storyId);
  }

  const result = [];
  for (const [groupId, data] of groupMap) {
    const durationShare = totalDurationMs > 0 ? data.totalMs / totalDurationMs : 0;
    result.push({
      epicId: groupId,
      sessions: data.sessions,
      totalMinutes: round(data.totalMs / 60_000, 2),
      estimatedCost: round(totalCost * durationShare),
      stories: Array.from(data.stories),
    });
  }

  // Sort by estimated cost descending
  result.sort((a, b) => b.estimatedCost - a.estimatedCost);
  return result;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Round a number to the specified decimal places.
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {number}
 */
function round(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive analytics report from telemetry, token, and git data.
 *
 * @param {object} telemetryData - Aggregated telemetry data (durations, agents, executions, estimates).
 * @param {object} tokenReport - Token usage report (costs, models, daily timeline, sessions).
 * @param {object} [gitStats] - Optional git statistics (commits, files, lines).
 * @returns {{
 *   roi: object,
 *   budgetAlerts: object,
 *   agentEfficiency: Array<object>,
 *   tokenWaste: object,
 *   complexityCost: Array<object>,
 *   heatmap: object,
 *   modelComparison: object,
 *   gitImpact: object,
 *   sprintCost: Array<object>,
 *   generatedAt: string
 * }}
 */
function generateAnalytics(telemetryData, tokenReport, gitStats) {
  const td = telemetryData || {};
  const tr = tokenReport || {};
  const gs = gitStats || {};

  return {
    roi: calculateROI(td, tr),
    budgetAlerts: calculateBudgetAlerts(tr),
    agentEfficiency: calculateAgentEfficiency(td),
    tokenWaste: calculateTokenWaste(tr),
    complexityCost: calculateComplexityCost(td, tr),
    heatmap: calculateHeatmap(tr, td),
    modelComparison: calculateModelComparison(tr),
    gitImpact: calculateGitImpact(tr, gs),
    sprintCost: calculateSprintCost(td, tr),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { generateAnalytics };
