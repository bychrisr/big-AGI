/**
 * Story Reader - Read stories and epics from filesystem
 *
 * Reads stories from configured location and docs/planning/stories/
 * Reads epics from docs/planning/epics/
 *
 * @module development/scripts/story-reader
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Parse markdown file with YAML frontmatter
 * @param {string} filePath - Path to markdown file
 * @returns {Promise<Object>} Parsed story data
 */
async function parseStoryFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);

    // Handle YAML story files (sprint-based format: story.id, story.epic_id, etc.)
    if (ext === '.yaml' || ext === '.yml') {
      let data = {};
      try {
        const parsed = yaml.load(content) || {};
        data = parsed.story || parsed;
      } catch (_yamlErr) {
        // YAML parse failed (e.g., checkboxes as sequences with bad indentation)
        // Fall back to regex extraction of key fields from raw text
        const idMatch = content.match(/^\s{2}id:\s*(.+)/m);
        const titleMatch = content.match(/^\s{2}title:\s*["']?(.+?)["']?\s*$/m);
        const epicIdMatch = content.match(/^\s{2}epic_id:\s*(.+)/m);
        const statusMatch = content.match(/^\s{2}status:\s*(.+)/m);
        const effortMatch = content.match(/^\s{2}effort_hours:\s*(\d+)/m);
        data = {
          id: idMatch ? idMatch[1].trim() : null,
          title: titleMatch ? titleMatch[1].trim() : null,
          epic_id: epicIdMatch ? epicIdMatch[1].trim() : null,
          status: statusMatch ? statusMatch[1].trim() : null,
          effort_hours: effortMatch ? parseInt(effortMatch[1], 10) : null,
        };
      }
      const effortHours = data.effort_hours || data.effortHours || null;
      const points = data.points || data.storyPoints ||
        (effortHours ? Math.ceil(effortHours / 8) : 0);
      const epicId = data.epic_id || data.epicId || data.epic || null;

      // Count tasks from acceptance criteria checkboxes in raw content
      const checkboxes = content.match(/- \[[x ]\]/gi) || [];
      const completed = content.match(/- \[x\]/gi) || [];

      return {
        id: data.id || data.storyId || fileName,
        title: data.title || fileName,
        epic: epicId,
        status: data.status || 'Draft',
        points: points,
        effortHours: effortHours,
        tasks: {
          completed: completed.length,
          total: checkboxes.length,
        },
        filePath,
        fileName,
        frontmatter: data,
      };
    }

    // Extract YAML frontmatter from markdown files
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? yaml.load(frontmatterMatch[1]) : {};

    // Extract markdown content (without frontmatter)
    const markdown = frontmatterMatch
      ? content.substring(frontmatterMatch[0].length).trim()
      : content.trim();

    // Extract story metadata from content
    const storyIdMatch = markdown.match(/\*\*Story ID:\*\*\s*(.+)/i) ||
                        markdown.match(/^#\s*(.+?):/);
    const epicRawMatch = markdown.match(/\*\*Epic:\*\*\s*(.+)/i);
    const statusMatch = markdown.match(/\*\*Status:\*\*\s*(.+)/i);
    const pointsMatch = markdown.match(/\*\*Points:\*\*\s*(\d+)/i) ||
                        markdown.match(/points?:\s*(\d+)/i);

    // Extract clean epic ID from inline notation
    // Handles: "EPIC-001 (Sprint 1...)", "1 (Marketplace) | **Sprint:**...", "2"
    let epicId = frontmatter.epic || null;
    if (epicRawMatch) {
      const raw = epicRawMatch[1].trim();
      // Match EPIC-NNN at start
      const epicNnnMatch = raw.match(/^(EPIC-\d+)/i);
      // Match plain number at start (e.g., "1 (Marketplace) | ...")
      const epicNumMatch = raw.match(/^(\d+)/);
      if (epicNnnMatch) {
        epicId = epicNnnMatch[1].toUpperCase();
      } else if (epicNumMatch) {
        epicId = `EPIC-${String(parseInt(epicNumMatch[1], 10)).padStart(3, '0')}`;
      } else {
        epicId = raw;
      }
    }

    // Count tasks (checkboxes)
    const checkboxes = markdown.match(/^- \[([ x])\]/gm) || [];
    const completed = checkboxes.filter(cb => cb.includes('[x]')).length;
    const total = checkboxes.length;

    return {
      id: storyIdMatch ? storyIdMatch[1].trim() : fileName,
      title: frontmatter.title || storyIdMatch?.[1]?.trim() || fileName,
      epic: epicId,
      status: statusMatch ? statusMatch[1].trim() : frontmatter.status || 'Draft',
      points: pointsMatch ? parseInt(pointsMatch[1], 10) : frontmatter.points || 0,
      tasks: {
        completed,
        total,
      },
      filePath,
      fileName,
      frontmatter,
    };
  } catch (error) {
    console.error(`Error parsing story ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Parse epic YAML file
 * @param {string} filePath - Path to YAML file
 * @returns {Promise<Object>} Parsed epic data
 */
async function parseEpicFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));

    let data;
    try {
      data = yaml.load(content);
    } catch (_yamlErr) {
      // YAML parse failed (e.g., checkboxes as sequences with bad indentation)
      // Fall back to regex extraction of key fields from raw text
      const idMatch = content.match(/^\s{2}id:\s*(.+)/m);
      const titleMatch = content.match(/^\s{2}title:\s*["']?(.+?)["']?\s*$/m);
      const effortMatch = content.match(/^\s{2}effort_hours:\s*(\d+)/m);
      const sprintMatch = content.match(/^\s{2}sprint:\s*(.+)/m);
      const priorityMatch = content.match(/^\s{2}priority:\s*(.+)/m);
      const startMatch = content.match(/^\s{2}start_date:\s*(.+)/m);
      const endMatch = content.match(/^\s{2}end_date:\s*(.+)/m);
      // Extract story list items: lines matching "    - STORY-NNN"
      const storyLines = content.match(/^\s{4}-\s+(STORY-\d+)/gm) || [];
      const stories = storyLines.map(l => l.replace(/^\s{4}-\s+/, '').trim());
      data = {
        epic: {
          id: idMatch ? idMatch[1].trim() : null,
          title: titleMatch ? titleMatch[1].trim() : null,
          effort_hours: effortMatch ? parseInt(effortMatch[1], 10) : null,
          sprint: sprintMatch ? sprintMatch[1].trim() : null,
          priority: priorityMatch ? priorityMatch[1].trim() : null,
          start_date: startMatch ? startMatch[1].trim() : null,
          end_date: endMatch ? endMatch[1].trim() : null,
          stories: stories,
        },
      };
    }

    // Epic can be at root or nested under 'epic' key
    const epic = (data && data.epic) ? data.epic : (data || {});

    // Clean story IDs: strip inline YAML comments (e.g., "STORY-001  # Security Test Suite (32h)")
    const rawStories = Array.isArray(epic.stories) ? epic.stories : [];
    const storyIds = rawStories
      .map(s => (typeof s === 'string' ? s.replace(/#.*$/, '').trim() : String(s)))
      .filter(Boolean);

    const effortHours = epic.effort_hours || epic.effortHours || 0;
    const pointsPlanned = epic.points_planned || epic.pointsPlanned || epic.totalPoints ||
      (effortHours ? Math.ceil(effortHours / 8) : 0);

    return {
      id: epic.id || fileName,
      name: epic.title || epic.name || fileName,
      description: epic.description || '',
      stories: storyIds,
      pointsPlanned: pointsPlanned,
      effortHours: effortHours,
      sprint: epic.sprint || null,
      status: epic.status || 'Active',
      priority: epic.priority || null,
      startDate: epic.start_date || epic.startDate || null,
      endDate: epic.end_date || epic.endDate || null,
      filePath,
      fileName,
    };
  } catch (error) {
    console.error(`Error parsing epic ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Read all stories from a directory (recursive)
 * @param {string} dirPath - Directory to scan
 * @returns {Promise<Array>} Array of story objects
 */
async function readStoriesFromDir(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const stories = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursive scan subdirectories
        const subStories = await readStoriesFromDir(fullPath);
        stories.push(...subStories);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        const story = await parseStoryFile(fullPath);
        if (story) {
          stories.push(story);
        }
      }
    }

    return stories;
  } catch (error) {
    // Directory doesn't exist or not accessible
    return [];
  }
}

/**
 * Read all epics from directory
 * @param {string} dirPath - Directory to scan
 * @returns {Promise<Array>} Array of epic objects
 */
async function readEpicsFromDir(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const epics = [];

    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        const fullPath = path.join(dirPath, entry.name);
        const epic = await parseEpicFile(fullPath);
        if (epic) {
          epics.push(epic);
        }
      }
    }

    return epics;
  } catch (error) {
    // Directory doesn't exist
    return [];
  }
}

/**
 * Load core config to get story locations
 * @param {string} rootPath - Project root path
 * @returns {Promise<Object>} Config object
 */
async function loadConfig(rootPath) {
  try {
    const configPath = path.join(rootPath, '.aios-core', 'core-config.yaml');
    const content = await fs.readFile(configPath, 'utf-8');
    return yaml.load(content) || {};
  } catch (error) {
    return {};
  }
}

/**
 * Get all stories for a project
 * @param {string} rootPath - Project root path
 * @returns {Promise<Array>} Array of all stories
 */
async function getAllStories(rootPath) {
  const config = await loadConfig(rootPath);

  // Default story locations
  const storyLocations = [
    config.devStoryLocation || 'docs/stories',
    'docs/planning/stories',  // Common location for brownfield projects
  ];

  const allStories = [];

  for (const location of storyLocations) {
    const dirPath = path.join(rootPath, location);
    const stories = await readStoriesFromDir(dirPath);
    allStories.push(...stories);
  }

  // Deduplicate by file path
  const uniqueStories = Array.from(
    new Map(allStories.map(s => [s.filePath, s])).values()
  );

  return uniqueStories;
}

/**
 * Get all epics for a project
 * @param {string} rootPath - Project root path
 * @returns {Promise<Array>} Array of all epics
 */
async function getAllEpics(rootPath) {
  // Look for epics in standard locations
  const epicLocations = [
    'docs/planning/epics',
    'docs/epics',
  ];

  const allEpics = [];

  for (const location of epicLocations) {
    const dirPath = path.join(rootPath, location);
    const epics = await readEpicsFromDir(dirPath);
    allEpics.push(...epics);
  }

  // Deduplicate by epic ID, keeping the entry with more data (more stories or higher effortHours)
  const epicMap = new Map();
  for (const epic of allEpics) {
    if (!epicMap.has(epic.id)) {
      epicMap.set(epic.id, epic);
    } else {
      const existing = epicMap.get(epic.id);
      // Keep the one with more story IDs or higher effortHours
      if (epic.stories.length > existing.stories.length || epic.effortHours > existing.effortHours) {
        epicMap.set(epic.id, epic);
      }
    }
  }

  return Array.from(epicMap.values());
}

module.exports = {
  parseStoryFile,
  parseEpicFile,
  readStoriesFromDir,
  readEpicsFromDir,
  getAllStories,
  getAllEpics,
  loadConfig,
};
