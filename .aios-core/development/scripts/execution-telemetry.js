/**
 * Execution Telemetry - Core Telemetry System for AIOS Agent Execution
 *
 * Tracks agent sessions, tasks, workflow phases, and commands with
 * minimal overhead (<50ms). Follows the same patterns as MetricsTracker
 * and DecisionRecorder: singleton + async persistence + circuit breaker.
 *
 * @module development/scripts/execution-telemetry
 * @version 1.0.0
 */

'use strict';

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Multi-project singleton instances (keyed by rootPath)
// Supports npm link dev mode where multiple projects share same code
const _instances = new Map();

/**
 * Generate a short unique ID with prefix
 * @param {string} prefix - ID prefix (ses, tsk, phs)
 * @returns {string} Unique ID
 */
function generateId(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rand}`;
}

class ExecutionTelemetry extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} [options.rootPath] - Project root path
   * @param {Object} [options.config] - Pre-loaded config (avoids re-reading YAML)
   */
  constructor(options = {}) {
    super();
    this.rootPath = options.rootPath || process.cwd();
    this._config = null;
    this._configLoaded = false;

    // In-memory maps for active entities (sync access, <1ms)
    this._activeSessions = new Map();
    this._activeTasks = new Map();
    this._activePhases = new Map();

    // Deferred config loading
    if (options.config) {
      this._applyConfig(options.config);
    }
  }

  /**
   * Get or create singleton instance per project
   * @param {Object} [options] - Constructor options
   * @returns {ExecutionTelemetry}
   */
  static getInstance(options = {}) {
    const rootPath = options.rootPath || process.cwd();

    if (!_instances.has(rootPath)) {
      _instances.set(rootPath, new ExecutionTelemetry(options));
    }
    return _instances.get(rootPath);
  }

  /**
   * Reset singleton (for testing)
   * @param {string} [rootPath] - Specific project to reset, or all if omitted
   */
  static resetInstance(rootPath) {
    if (rootPath) {
      _instances.delete(rootPath);
    } else {
      _instances.clear();
    }
  }

  /**
   * Whether telemetry is enabled
   * @returns {boolean}
   */
  get enabled() {
    return this._config?.enabled !== false;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Load config from core-config.yaml if not already loaded
   * @returns {Promise<Object>} Telemetry config section
   */
  async _ensureConfig() {
    if (this._configLoaded) return this._config;

    try {
      const configPath = path.join(this.rootPath, '.aios-core', 'core-config.yaml');
      const content = await fs.readFile(configPath, 'utf8');
      const fullConfig = yaml.load(content);
      this._applyConfig(fullConfig);
    } catch {
      this._applyConfig({});
    }
    return this._config;
  }

  /**
   * Apply config from full core-config object
   * @param {Object} fullConfig - Full core-config.yaml content
   */
  _applyConfig(fullConfig) {
    const section = fullConfig?.executionTelemetry || {};
    this._config = {
      enabled: section.enabled !== false,
      async: section.async !== false,
      storage: {
        dataFile: path.join(this.rootPath, section.storage?.dataFile || '.aios/data/execution-telemetry.json'),
        snapshotFile: path.join(this.rootPath, section.storage?.snapshotFile || '.aios/data/last-execution.json'),
        estimatesFile: path.join(this.rootPath, section.storage?.estimatesFile || '.aios/data/estimates.json'),
      },
      performance: {
        maxOverhead: section.performance?.maxOverhead || 50,
      },
      retention: {
        maxEntries: section.retention?.maxEntries || 1000,
        days: section.retention?.days || 180,
      },
      tracking: {
        sessions: section.tracking?.sessions !== false,
        tasks: section.tracking?.tasks !== false,
        phases: section.tracking?.phases !== false,
        commands: section.tracking?.commands !== false,
        estimates: section.tracking?.estimates !== false,
        activationTiming: section.tracking?.activationTiming !== false,
      },
      estimation: {
        pointsToHours: section.estimation?.pointsToHours || {
          1: 0.5, 2: 1, 3: 2, 5: 4, 8: 8, 13: 16, 21: 32,
        },
      },
      dashboard: {
        port: section.dashboard?.port || 3100,
        autoOpen: section.dashboard?.autoOpen !== false,
      },
    };
    this._configLoaded = true;
  }

  // ---------------------------------------------------------------------------
  // Agent Sessions
  // ---------------------------------------------------------------------------

  /**
   * Start an agent session. Synchronous (<1ms) — persistence is deferred.
   * @param {string} agentId - Agent identifier (dev, qa, sm, etc.)
   * @param {Object} [options] - Additional session metadata
   * @returns {string} sessionId
   */
  startSession(agentId, options = {}) {
    try {
      if (!this.enabled || !this._config?.tracking?.sessions) return null;

      const sessionId = generateId('ses');
      const session = {
        sessionId,
        agentId,
        startTime: new Date().toISOString(),
        endTime: null,
        durationMs: null,
        status: 'active',
        activationDurationMs: options.activationDuration || null,
        sessionType: options.sessionType || null,
        quality: options.quality || null,
        commands: [],
        tasks: [],
        phases: [],
        metadata: options.metadata || {},
      };

      this._activeSessions.set(sessionId, session);
      this.emit('session:start', { sessionId, agentId });
      return sessionId;
    } catch {
      return null;
    }
  }

  /**
   * End an agent session. Async persistence.
   * @param {string} sessionId - Session ID from startSession
   * @param {Object} [result] - Session result data
   * @returns {Promise<void>}
   */
  async endSession(sessionId, result = {}) {
    try {
      if (!sessionId) return;
      const session = this._activeSessions.get(sessionId);
      if (!session) return;

      session.endTime = new Date().toISOString();
      session.durationMs = new Date(session.endTime) - new Date(session.startTime);
      session.status = result.status || 'completed';
      if (result.commands) session.commands.push(...result.commands);
      if (result.metadata) Object.assign(session.metadata, result.metadata);

      this._activeSessions.delete(sessionId);
      this.emit('session:end', { sessionId, agentId: session.agentId, durationMs: session.durationMs });

      // Persist
      await this._persistSession(session);
    } catch {
      // Circuit breaker: never propagate
    }
  }

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------

  /**
   * Start a task within a session.
   * @param {string} sessionId - Parent session ID
   * @param {string} taskName - Task name (e.g., 'dev-develop-story.md')
   * @param {Object} [options] - Task metadata
   * @returns {string|null} taskId
   */
  startTask(sessionId, taskName, options = {}) {
    try {
      if (!this.enabled || !this._config?.tracking?.tasks) return null;

      const taskId = generateId('tsk');
      const task = {
        taskId,
        sessionId,
        taskName,
        startTime: new Date().toISOString(),
        endTime: null,
        durationMs: null,
        status: 'active',
        storyId: options.storyId || null,
        mode: options.mode || null,
        decisions: 0,
        filesModified: 0,
        metadata: options.metadata || {},
      };

      this._activeTasks.set(taskId, task);

      // Also attach to session
      const session = this._activeSessions.get(sessionId);
      if (session) session.tasks.push(task);

      this.emit('task:start', { taskId, sessionId, taskName });
      return taskId;
    } catch {
      return null;
    }
  }

  /**
   * End a task.
   * @param {string} taskId - Task ID from startTask
   * @param {Object} [result] - Task result data
   * @returns {Promise<void>}
   */
  async endTask(taskId, result = {}) {
    try {
      if (!taskId) return;
      const task = this._activeTasks.get(taskId);
      if (!task) return;

      task.endTime = new Date().toISOString();
      task.durationMs = new Date(task.endTime) - new Date(task.startTime);
      task.status = result.success ? 'completed' : 'failed';
      task.decisions = result.decisions || task.decisions;
      task.filesModified = result.files || task.filesModified;

      this._activeTasks.delete(taskId);
      this.emit('task:end', { taskId, taskName: task.taskName, durationMs: task.durationMs });
    } catch {
      // Circuit breaker
    }
  }

  // ---------------------------------------------------------------------------
  // Workflow Phases
  // ---------------------------------------------------------------------------

  /**
   * Start a workflow phase.
   * @param {string} sessionId - Parent session ID
   * @param {string} phaseName - Phase name (create, validate, implement, qa)
   * @param {Object} [options] - Phase metadata
   * @returns {string|null} phaseId
   */
  startPhase(sessionId, phaseName, options = {}) {
    try {
      if (!this.enabled || !this._config?.tracking?.phases) return null;

      const phaseId = generateId('phs');
      const phase = {
        phaseId,
        sessionId,
        phaseName,
        workflowName: options.workflowName || null,
        startTime: new Date().toISOString(),
        endTime: null,
        durationMs: null,
        status: 'active',
      };

      this._activePhases.set(phaseId, phase);

      const session = this._activeSessions.get(sessionId);
      if (session) session.phases.push(phase);

      this.emit('phase:start', { phaseId, sessionId, phaseName });
      return phaseId;
    } catch {
      return null;
    }
  }

  /**
   * End a workflow phase.
   * @param {string} phaseId - Phase ID from startPhase
   * @param {Object} [result] - Phase result data
   * @returns {Promise<void>}
   */
  async endPhase(phaseId, result = {}) {
    try {
      if (!phaseId) return;
      const phase = this._activePhases.get(phaseId);
      if (!phase) return;

      phase.endTime = new Date().toISOString();
      phase.durationMs = new Date(phase.endTime) - new Date(phase.startTime);
      phase.status = result.status || 'completed';

      this._activePhases.delete(phaseId);
      this.emit('phase:end', { phaseId, phaseName: phase.phaseName, durationMs: phase.durationMs });
    } catch {
      // Circuit breaker
    }
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Record a command execution.
   * @param {string} sessionId - Parent session ID
   * @param {string} command - Command name
   * @param {number} durationMs - Execution duration in ms
   * @param {Object} [result] - Command result
   */
  recordCommand(sessionId, command, durationMs, result = {}) {
    try {
      if (!this.enabled || !this._config?.tracking?.commands) return;

      const entry = {
        name: command,
        durationMs,
        status: result.status || 'ok',
        timestamp: new Date().toISOString(),
      };

      const session = this._activeSessions.get(sessionId);
      if (session) session.commands.push(entry);

      this.emit('command:recorded', { sessionId, command, durationMs });
    } catch {
      // Circuit breaker
    }
  }

  // ---------------------------------------------------------------------------
  // Estimates
  // ---------------------------------------------------------------------------

  /**
   * Record an estimate for an entity.
   * @param {string} entityType - 'story' | 'epic' | 'task' | 'sprint'
   * @param {string} entityId - Entity identifier
   * @param {Object} estimate - { points, hours, complexity, source }
   * @returns {Promise<void>}
   */
  async recordEstimate(entityType, entityId, estimate) {
    try {
      if (!this.enabled || !this._config?.tracking?.estimates) return;

      const record = {
        entityType,
        entityId,
        capturedAt: new Date().toISOString(),
        estimate: {
          points: estimate.points || null,
          hours: estimate.hours || null,
          complexity: estimate.complexity || null,
          source: estimate.source || 'manual',
        },
        actual: null,
        accuracy: null,
      };

      // Convert points to hours if hours not provided
      if (record.estimate.points && !record.estimate.hours) {
        const mapping = this._config.estimation.pointsToHours;
        record.estimate.hours = mapping[record.estimate.points] || null;
      }

      await this._persistEstimate(record);
      this.emit('estimate:recorded', { entityType, entityId });
    } catch {
      // Circuit breaker
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Get dashboard summary data.
   * @param {Object} [options] - { period: '7d' | '30d' | '90d' | 'all' }
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboard(options = {}) {
    await this._ensureConfig();
    const data = await this._loadData();
    const period = options.period || '30d';
    const cutoff = this._getPeriodCutoff(period);

    const recent = data.executions.filter(e => new Date(e.startTime) > cutoff);

    const byAgent = {};
    const byTask = {};
    const byWorkflow = {};

    for (const exec of recent) {
      // By agent
      if (!byAgent[exec.agentId]) {
        byAgent[exec.agentId] = { sessions: 0, totalDurationMs: 0, successCount: 0 };
      }
      byAgent[exec.agentId].sessions++;
      byAgent[exec.agentId].totalDurationMs += exec.durationMs || 0;
      if (exec.status === 'completed') byAgent[exec.agentId].successCount++;

      // By task
      for (const task of (exec.tasks || [])) {
        if (!byTask[task.taskName]) {
          byTask[task.taskName] = { runs: 0, totalDurationMs: 0 };
        }
        byTask[task.taskName].runs++;
        byTask[task.taskName].totalDurationMs += task.durationMs || 0;
      }

      // By workflow
      for (const phase of (exec.phases || [])) {
        if (phase.workflowName) {
          if (!byWorkflow[phase.workflowName]) {
            byWorkflow[phase.workflowName] = { runs: 0, phaseAvgs: {} };
          }
          byWorkflow[phase.workflowName].runs++;
          if (!byWorkflow[phase.workflowName].phaseAvgs[phase.phaseName]) {
            byWorkflow[phase.workflowName].phaseAvgs[phase.phaseName] = { total: 0, count: 0 };
          }
          byWorkflow[phase.workflowName].phaseAvgs[phase.phaseName].total += phase.durationMs || 0;
          byWorkflow[phase.workflowName].phaseAvgs[phase.phaseName].count++;
        }
      }
    }

    // Calculate averages
    for (const [, stats] of Object.entries(byAgent)) {
      stats.avgDurationMs = stats.sessions > 0 ? Math.round(stats.totalDurationMs / stats.sessions) : 0;
      stats.successRate = stats.sessions > 0 ? stats.successCount / stats.sessions : 0;
    }
    for (const [, stats] of Object.entries(byTask)) {
      stats.avgDurationMs = stats.runs > 0 ? Math.round(stats.totalDurationMs / stats.runs) : 0;
    }
    for (const [, wf] of Object.entries(byWorkflow)) {
      for (const [, ph] of Object.entries(wf.phaseAvgs)) {
        ph.avgMs = ph.count > 0 ? Math.round(ph.total / ph.count) : 0;
      }
    }

    const totalSessions = recent.length;
    const completedSessions = recent.filter(e => e.status === 'completed').length;

    return {
      period,
      summary: {
        totalSessions,
        totalTasks: recent.reduce((sum, e) => sum + (e.tasks?.length || 0), 0),
        totalDurationMs: recent.reduce((sum, e) => sum + (e.durationMs || 0), 0),
        successRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      },
      byAgent,
      byTask,
      byWorkflow,
    };
  }

  /**
   * Get stats for a specific agent.
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>}
   */
  async getAgentStats(agentId) {
    await this._ensureConfig();
    const data = await this._loadData();
    const agentExecs = data.executions.filter(e => e.agentId === agentId);

    const completed = agentExecs.filter(e => e.status === 'completed');
    const totalDuration = completed.reduce((s, e) => s + (e.durationMs || 0), 0);

    return {
      agentId,
      sessions: agentExecs.length,
      avgDurationMs: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      successRate: agentExecs.length > 0 ? completed.length / agentExecs.length : 0,
      tasks: agentExecs.reduce((s, e) => s + (e.tasks?.length || 0), 0),
      recentSessions: agentExecs.slice(-5).map(e => ({
        sessionId: e.sessionId,
        startTime: e.startTime,
        durationMs: e.durationMs,
        status: e.status,
      })),
    };
  }

  /**
   * Get estimate accuracy analysis.
   * @param {Object} [options] - { entityType, entityId }
   * @returns {Promise<Object>}
   */
  async getEstimateAccuracy(options = {}) {
    await this._ensureConfig();
    const estimates = await this._loadEstimates();
    let filtered = estimates.estimates || [];

    if (options.entityType) {
      filtered = filtered.filter(e => e.entityType === options.entityType);
    }
    if (options.entityId) {
      filtered = filtered.filter(e => e.entityId === options.entityId);
    }

    const withActual = filtered.filter(e => e.actual);
    const totalEstimated = withActual.reduce((s, e) => s + (e.estimate.hours || 0), 0);
    const totalActual = withActual.reduce((s, e) => s + (e.actual?.hours || 0), 0);

    return {
      total: filtered.length,
      withActual: withActual.length,
      planned: totalEstimated,
      actual: totalActual,
      variance: totalActual - totalEstimated,
      accuracy: totalEstimated > 0 ? Math.round((1 - Math.abs(totalActual - totalEstimated) / totalEstimated) * 100) : null,
      entries: withActual.slice(-10),
    };
  }

  /**
   * Get project summary.
   * @returns {Promise<Object>}
   */
  async getProjectSummary() {
    const dashboard = await this.getDashboard({ period: 'all' });
    const estimates = await this.getEstimateAccuracy();

    return {
      totalTime: dashboard.summary.totalDurationMs,
      totalSessions: dashboard.summary.totalSessions,
      totalTasks: dashboard.summary.totalTasks,
      successRate: dashboard.summary.successRate,
      byAgent: dashboard.byAgent,
      estimateAccuracy: estimates.accuracy,
    };
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /**
   * Load telemetry data from JSON file.
   * @returns {Promise<Object>}
   */
  async _loadData() {
    await this._ensureConfig();
    try {
      const content = await fs.readFile(this._config.storage.dataFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return { version: '1.0.0', executions: [], aggregates: {}, trends: {} };
    }
  }

  /**
   * Save telemetry data to JSON file.
   * @param {Object} data - Full data object
   * @returns {Promise<void>}
   */
  async _saveData(data) {
    await this._ensureConfig();
    const dir = path.dirname(this._config.storage.dataFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this._config.storage.dataFile, JSON.stringify(data, null, 2));
  }

  /**
   * Persist a completed session to the data file.
   * @param {Object} session - Completed session object
   * @returns {Promise<void>}
   */
  async _persistSession(session) {
    try {
      const data = await this._loadData();

      data.executions.push(session);

      // Enforce max entries
      if (data.executions.length > this._config.retention.maxEntries) {
        data.executions = data.executions.slice(-this._config.retention.maxEntries);
      }

      // Update aggregates
      this._updateAggregates(data);

      await this._saveData(data);

      // Write snapshot (last execution)
      await this._writeSnapshot(session);
    } catch {
      // Circuit breaker: persistence failure never propagates
    }
  }

  /**
   * Write last-execution snapshot.
   * @param {Object} session - Session to snapshot
   * @returns {Promise<void>}
   */
  async _writeSnapshot(session) {
    try {
      const dir = path.dirname(this._config.storage.snapshotFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        this._config.storage.snapshotFile,
        JSON.stringify(session, null, 2),
      );
    } catch {
      // Non-critical
    }
  }

  /**
   * Update aggregate statistics.
   * @param {Object} data - Full data object (mutated in place)
   */
  _updateAggregates(data) {
    const execs = data.executions;
    const completed = execs.filter(e => e.status === 'completed');

    const byAgent = {};
    const byTask = {};
    const byWorkflow = {};

    for (const exec of execs) {
      if (!byAgent[exec.agentId]) {
        byAgent[exec.agentId] = { sessions: 0, avgDurationMs: 0, successRate: 0, _total: 0, _success: 0 };
      }
      byAgent[exec.agentId].sessions++;
      byAgent[exec.agentId]._total += exec.durationMs || 0;
      if (exec.status === 'completed') byAgent[exec.agentId]._success++;

      for (const task of (exec.tasks || [])) {
        if (!byTask[task.taskName]) {
          byTask[task.taskName] = { runs: 0, avgDurationMs: 0, _total: 0 };
        }
        byTask[task.taskName].runs++;
        byTask[task.taskName]._total += task.durationMs || 0;
      }

      for (const phase of (exec.phases || [])) {
        if (phase.workflowName) {
          const key = phase.workflowName;
          if (!byWorkflow[key]) byWorkflow[key] = { runs: 0, phaseAvgs: {} };
          byWorkflow[key].runs++;
        }
      }
    }

    // Finalize agent averages
    for (const [, a] of Object.entries(byAgent)) {
      a.avgDurationMs = a.sessions > 0 ? Math.round(a._total / a.sessions) : 0;
      a.successRate = a.sessions > 0 ? +(a._success / a.sessions).toFixed(2) : 0;
      delete a._total;
      delete a._success;
    }
    for (const [, t] of Object.entries(byTask)) {
      t.avgDurationMs = t.runs > 0 ? Math.round(t._total / t.runs) : 0;
      delete t._total;
    }

    data.aggregates = {
      totalSessions: execs.length,
      totalTasks: execs.reduce((s, e) => s + (e.tasks?.length || 0), 0),
      totalDurationMs: execs.reduce((s, e) => s + (e.durationMs || 0), 0),
      successRate: execs.length > 0 ? +(completed.length / execs.length).toFixed(2) : 0,
      byAgent,
      byTask,
      byWorkflow,
    };
  }

  // ---------------------------------------------------------------------------
  // Estimates Persistence
  // ---------------------------------------------------------------------------

  /**
   * Load estimates data.
   * @returns {Promise<Object>}
   */
  async _loadEstimates() {
    await this._ensureConfig();
    try {
      const content = await fs.readFile(this._config.storage.estimatesFile, 'utf8');
      return JSON.parse(content);
    } catch {
      return { version: '1.0.0', estimates: [], projectSummary: {} };
    }
  }

  /**
   * Persist an estimate record.
   * @param {Object} record - Estimate record
   * @returns {Promise<void>}
   */
  async _persistEstimate(record) {
    try {
      const data = await this._loadEstimates();

      // Upsert: replace if same entityType + entityId exists
      const idx = data.estimates.findIndex(
        e => e.entityType === record.entityType && e.entityId === record.entityId,
      );
      if (idx >= 0) {
        data.estimates[idx] = { ...data.estimates[idx], ...record };
      } else {
        data.estimates.push(record);
      }

      const dir = path.dirname(this._config.storage.estimatesFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this._config.storage.estimatesFile, JSON.stringify(data, null, 2));
    } catch {
      // Circuit breaker
    }
  }

  /**
   * Update actual data for an estimate.
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} actual - { durationMs, hours, sessions, agents }
   * @returns {Promise<void>}
   */
  async updateEstimateActual(entityType, entityId, actual) {
    try {
      const data = await this._loadEstimates();
      const entry = data.estimates.find(
        e => e.entityType === entityType && e.entityId === entityId,
      );
      if (!entry) return;

      entry.actual = {
        durationMs: actual.durationMs || null,
        hours: actual.hours || (actual.durationMs ? +(actual.durationMs / 3600000).toFixed(1) : null),
        sessions: actual.sessions || null,
        agents: actual.agents || [],
      };

      // Calculate accuracy
      if (entry.estimate.hours && entry.actual.hours) {
        const variance = entry.actual.hours - entry.estimate.hours;
        entry.accuracy = {
          varianceHours: +variance.toFixed(1),
          percentAccuracy: Math.round((1 - Math.abs(variance) / entry.estimate.hours) * 100),
          status: Math.abs(variance) <= entry.estimate.hours * 0.1 ? 'on-target'
            : variance > 0 ? 'over-estimate' : 'under-estimate',
        };
      }

      // Update project summary
      const withActual = data.estimates.filter(e => e.actual?.hours);
      if (withActual.length > 0) {
        const totalEst = withActual.reduce((s, e) => s + (e.estimate.hours || 0), 0);
        const totalAct = withActual.reduce((s, e) => s + (e.actual.hours || 0), 0);
        data.projectSummary = {
          totalEstimatedHours: +totalEst.toFixed(1),
          totalActualHours: +totalAct.toFixed(1),
          overallAccuracy: totalEst > 0 ? +((1 - Math.abs(totalAct - totalEst) / totalEst) * 100).toFixed(1) : null,
          trend: 'stable',
        };
      }

      const dir = path.dirname(this._config.storage.estimatesFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this._config.storage.estimatesFile, JSON.stringify(data, null, 2));
    } catch {
      // Circuit breaker
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Clean up old records beyond retention period.
   * @param {number} [retentionDays] - Override retention days
   * @returns {Promise<{removed: number, remaining: number}>}
   */
  async cleanup(retentionDays) {
    await this._ensureConfig();
    const days = retentionDays || this._config.retention.days;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const data = await this._loadData();
    const before = data.executions.length;
    data.executions = data.executions.filter(e => new Date(e.startTime) > cutoff);
    this._updateAggregates(data);
    await this._saveData(data);

    const estimates = await this._loadEstimates();
    estimates.estimates = estimates.estimates.filter(e => new Date(e.capturedAt) > cutoff);
    const dir = path.dirname(this._config.storage.estimatesFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this._config.storage.estimatesFile, JSON.stringify(estimates, null, 2));

    return { removed: before - data.executions.length, remaining: data.executions.length };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get cutoff date for a period string.
   * @param {string} period - '24h' | '7d' | '30d' | '90d' | 'all'
   * @returns {Date}
   */
  _getPeriodCutoff(period) {
    const now = Date.now();
    switch (period) {
      case '24h': return new Date(now - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(0);
    }
  }
}

module.exports = {
  ExecutionTelemetry,
  generateId,
};
