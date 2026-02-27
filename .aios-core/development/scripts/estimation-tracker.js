/**
 * Estimation Tracker - Capture and Compare Estimates vs Actuals
 *
 * Captures estimates from where they already exist in AIOS:
 * - Story files: points, task estimates, duration
 * - Task files: duration_expected, cost_estimated, token_usage
 * - Epic templates: totalPoints, progress
 * - Complexity assessments: 5 dimensions (1-5)
 *
 * @module development/scripts/estimation-tracker
 * @version 1.0.0
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { ExecutionTelemetry } = require('./execution-telemetry');

class EstimationTracker {
  /**
   * @param {Object} [options]
   * @param {string} [options.rootPath] - Project root
   */
  constructor(options = {}) {
    this.rootPath = options.rootPath || process.cwd();
  }

  /**
   * Capture estimates from a story file.
   * Reads YAML frontmatter and body for points, tasks, duration.
   *
   * @param {string} storyPath - Path to story markdown file
   * @returns {Promise<Object>} { points, hours, complexity, tasks[] }
   */
  async captureStoryEstimate(storyPath) {
    try {
      const content = await fs.readFile(storyPath, 'utf8');
      const result = {
        points: null,
        hours: null,
        complexity: null,
        tasks: [],
        source: 'story-file',
      };

      // Extract YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const fm = yaml.load(fmMatch[1]);
        result.points = fm.points || fm.storyPoints || fm.story_points || null;
        result.complexity = fm.complexity || fm.complexityClass || null;
      }

      // Extract points from body (e.g., "Story Points: 5" or "Points: 5")
      if (!result.points) {
        const pointsMatch = content.match(/(?:story\s*)?points?\s*:\s*(\d+)/i);
        if (pointsMatch) result.points = parseInt(pointsMatch[1], 10);
      }

      // Extract complexity from body
      if (!result.complexity) {
        const complexMatch = content.match(/complexity\s*(?:class)?\s*:\s*(\w+)/i);
        if (complexMatch) result.complexity = complexMatch[1].toLowerCase();
      }

      // Extract duration (e.g., "Duration: 4h" or "Duration: 2 days")
      const durationMatch = content.match(/duration\s*:\s*(?:~\s*)?(\d+(?:\.\d+)?)\s*(h|hours?|d|days?|min|minutes?)/i);
      if (durationMatch) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        if (unit.startsWith('h')) result.hours = value;
        else if (unit.startsWith('d')) result.hours = value * 8;
        else if (unit.startsWith('m')) result.hours = value / 60;
      }

      // Convert points to hours via config mapping
      if (result.points && !result.hours) {
        const telemetry = ExecutionTelemetry.getInstance();
        await telemetry._ensureConfig();
        const mapping = telemetry._config?.estimation?.pointsToHours || {};
        result.hours = mapping[result.points] || null;
      }

      // Extract task estimates from checkboxes
      const taskPattern = /- \[[ x]\]\s+(.*?)(?:\((\d+(?:\.\d+)?)\s*(?:h|hours?|min|minutes?)\))?$/gm;
      let match;
      while ((match = taskPattern.exec(content)) !== null) {
        const task = { name: match[1].trim(), estimate: null };
        if (match[2]) {
          task.estimate = parseFloat(match[2]);
        }
        result.tasks.push(task);
      }

      return result;
    } catch (error) {
      console.warn(`[EstimationTracker] Failed to capture story estimate: ${error.message}`);
      return { points: null, hours: null, complexity: null, tasks: [], source: 'error' };
    }
  }

  /**
   * Capture estimates from an epic file.
   *
   * @param {string} epicPath - Path to epic markdown file
   * @returns {Promise<Object>} { totalPoints, totalHours, stories[] }
   */
  async captureEpicEstimate(epicPath) {
    try {
      const content = await fs.readFile(epicPath, 'utf8');
      const result = {
        totalPoints: 0,
        totalHours: 0,
        stories: [],
        source: 'epic-file',
      };

      // Extract YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const fm = yaml.load(fmMatch[1]);
        result.totalPoints = fm.totalPoints || fm.total_points || 0;
      }

      // Extract total points from body
      if (!result.totalPoints) {
        const totalMatch = content.match(/total\s*(?:story\s*)?points?\s*:\s*(\d+)/i);
        if (totalMatch) result.totalPoints = parseInt(totalMatch[1], 10);
      }

      // Find story references with points
      const storyPattern = /(\d+\.\d+(?:\.\d+)*)\s*.*?(\d+)\s*(?:pts?|points?)/gi;
      let match;
      while ((match = storyPattern.exec(content)) !== null) {
        result.stories.push({
          storyId: match[1],
          points: parseInt(match[2], 10),
        });
      }

      // Sum story points if totalPoints not found
      if (!result.totalPoints && result.stories.length > 0) {
        result.totalPoints = result.stories.reduce((s, st) => s + st.points, 0);
      }

      // Convert total points to hours
      const telemetry = ExecutionTelemetry.getInstance();
      await telemetry._ensureConfig();
      const mapping = telemetry._config?.estimation?.pointsToHours || {};
      result.totalHours = result.stories.reduce((sum, st) => {
        return sum + (mapping[st.points] || 0);
      }, 0);
      if (!result.totalHours && result.totalPoints) {
        result.totalHours = mapping[result.totalPoints] || 0;
      }

      return result;
    } catch (error) {
      console.warn(`[EstimationTracker] Failed to capture epic estimate: ${error.message}`);
      return { totalPoints: 0, totalHours: 0, stories: [], source: 'error' };
    }
  }

  /**
   * Capture estimates from a task definition file.
   *
   * @param {string} taskName - Task filename (e.g., 'dev-develop-story.md')
   * @returns {Promise<Object>} { durationExpected, costEstimated, tokens }
   */
  async captureTaskEstimate(taskName) {
    try {
      const taskPath = path.join(this.rootPath, '.aios-core', 'development', 'tasks', taskName);
      const content = await fs.readFile(taskPath, 'utf8');
      const result = {
        taskName,
        durationExpected: null,
        costEstimated: null,
        tokens: null,
        source: 'task-file',
      };

      // Extract YAML frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const fm = yaml.load(fmMatch[1]);
        result.durationExpected = fm.duration_expected || fm.durationExpected || null;
        result.costEstimated = fm.cost_estimated || fm.costEstimated || null;
        result.tokens = fm.token_usage || fm.tokenUsage || null;
      }

      // Extract from body if not in frontmatter
      if (!result.durationExpected) {
        const durMatch = content.match(/duration_expected\s*:\s*(.+)/i);
        if (durMatch) result.durationExpected = durMatch[1].trim();
      }
      if (!result.costEstimated) {
        const costMatch = content.match(/cost_estimated\s*:\s*(.+)/i);
        if (costMatch) result.costEstimated = costMatch[1].trim();
      }
      if (!result.tokens) {
        const tokMatch = content.match(/token_usage\s*:\s*(.+)/i);
        if (tokMatch) result.tokens = tokMatch[1].trim();
      }

      return result;
    } catch (error) {
      console.warn(`[EstimationTracker] Failed to capture task estimate: ${error.message}`);
      return { taskName, durationExpected: null, costEstimated: null, tokens: null, source: 'error' };
    }
  }

  /**
   * Compare estimate with actual execution data.
   *
   * @param {string} entityType - 'story' | 'epic' | 'task'
   * @param {string} entityId - Entity identifier
   * @returns {Promise<Object>} { estimated, actual, variance, accuracy }
   */
  async compareWithActual(entityType, entityId) {
    const telemetry = ExecutionTelemetry.getInstance();
    const accuracy = await telemetry.getEstimateAccuracy({ entityType, entityId });

    return {
      entityType,
      entityId,
      estimated: accuracy.planned,
      actual: accuracy.actual,
      variance: accuracy.variance,
      accuracy: accuracy.accuracy,
    };
  }

  /**
   * Capture and record a story estimate in the telemetry system.
   *
   * @param {string} storyPath - Path to story file
   * @param {string} storyId - Story identifier
   * @param {string} [epicId] - Epic identifier
   * @returns {Promise<Object>} Captured estimate
   */
  async captureAndRecord(storyPath, storyId, epicId) {
    const estimate = await this.captureStoryEstimate(storyPath);

    const telemetry = ExecutionTelemetry.getInstance();
    await telemetry.recordEstimate('story', storyId, {
      points: estimate.points,
      hours: estimate.hours,
      complexity: estimate.complexity,
      source: 'story-creation',
    });

    return estimate;
  }
}

module.exports = { EstimationTracker };
