# Multi-Project Support in AIOS Core

## Problem Statement

When developing the AIOS Core framework using `npm link`, multiple projects sharing the same linked codebase would encounter data isolation issues:

- **Telemetry data mixed** between projects
- **Stories from all projects** appearing in each project's context
- **Dashboard serving data** from the wrong project
- **Singleton pattern** maintaining a single instance across all projects

## Root Cause

The `ExecutionTelemetry` class used a **global singleton pattern**:

```javascript
// ❌ OLD: Single instance shared across all projects
let _instance = null;

static getInstance(options = {}) {
  if (!_instance) {
    _instance = new ExecutionTelemetry(options);
  }
  return _instance;  // Always returns same instance
}
```

### Scenario that Failed

1. User runs `aios telemetry dashboard` in **aios-core**
   - Singleton created with `rootPath = /path/to/aios-core`
2. User switches to **kaven-framework** (via npm link)
3. User runs `aios telemetry dashboard` in **kaven-framework**
   - ❌ Singleton **already exists** → returns old instance
   - ❌ Dashboard serves **aios-core data** instead of kaven-framework data

## Solution

Implemented **Multi-Project Singleton Pattern** that maintains one instance per project:

```javascript
// ✅ NEW: Map of instances keyed by project rootPath
const _instances = new Map();

static getInstance(options = {}) {
  const rootPath = options.rootPath || process.cwd();

  if (!_instances.has(rootPath)) {
    _instances.set(rootPath, new ExecutionTelemetry(options));
  }
  return _instances.get(rootPath);
}
```

### How It Works

1. Each project is identified by its **rootPath** (absolute directory path)
2. Instances are **cached per project** in a Map
3. When switching projects (changing `process.cwd()`), a **new instance** is created automatically
4. Each instance loads **project-specific data** from `.aios/data/`

## Benefits

### For Development (npm link)
✅ Test framework changes across **multiple projects simultaneously**
✅ Each project maintains **isolated telemetry data**
✅ Dashboard shows **correct project's data** based on `process.cwd()`
✅ No data contamination between projects

### For Production (npm install)
✅ Each project has its **own npm installation** of aios-core
✅ Singleton pattern works normally (one project = one instance)
✅ **No breaking changes** to existing functionality

## Architecture

```
Development Mode (npm link):
┌─────────────────┐
│   aios-core     │ (source code)
│ /projects/work/ │
└────────┬────────┘
         │ npm link
         ├──────────────────┬──────────────────┐
         │                  │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ Project │       │ Project │       │ Project │
    │    A    │       │    B    │       │    C    │
    └─────────┘       └─────────┘       └─────────┘
         │                  │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │Instance │       │Instance │       │Instance │
    │  for A  │       │  for B  │       │  for C  │
    └─────────┘       └─────────┘       └─────────┘
         │                  │                  │
    ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
    │ .aios/  │       │ .aios/  │       │ .aios/  │
    │  data   │       │  data   │       │  data   │
    └─────────┘       └─────────┘       └─────────┘
```

## Files Modified

### Core Changes
- `.aios-core/development/scripts/execution-telemetry.js`
  - Changed singleton from global to per-project Map
  - Updated `getInstance()` to use `rootPath` as key
  - Updated `resetInstance()` to support selective/global reset

### No Changes Required
All consumers already use `process.cwd()` correctly:
- `.aios-core/cli/commands/telemetry/*.js`
- `.aios-core/development/scripts/estimation-tracker.js`

## Testing

### Unit Tests
Created validation tests to ensure:
1. ✅ Different projects get different instances
2. ✅ Same project returns cached instance
3. ✅ `process.cwd()` detection works correctly
4. ✅ Selective instance reset works
5. ✅ Global instance reset works

### Integration Tests
Validated:
1. ✅ Dashboard isolation between projects
2. ✅ Telemetry data file separation
3. ✅ Correct instance returned based on working directory

## Usage

### For Framework Developers

When testing changes across multiple projects:

```bash
# Terminal 1 - aios-core
cd /path/to/aios-core
aios telemetry dashboard
# ✅ Shows aios-core data on port 3100

# Terminal 2 - kaven-framework
cd /path/to/kaven-framework
aios telemetry dashboard --port 3101
# ✅ Shows kaven-framework data on port 3101
```

### For Contributors

When implementing new telemetry features:

```javascript
// Always use getInstance() without rootPath
// It will automatically detect project from process.cwd()
const telemetry = ExecutionTelemetry.getInstance();

// For testing with specific project
const telemetry = ExecutionTelemetry.getInstance({
  rootPath: '/specific/project/path'
});
```

## Migration Notes

### Breaking Changes
❌ **NONE** - Fully backward compatible

### Deprecations
❌ **NONE** - Existing API unchanged

### New Features
✅ Multi-project singleton support
✅ Selective instance reset by `rootPath`

## Future Enhancements

Potential improvements for consideration:

1. **Instance cleanup** - Automatically remove unused instances after timeout
2. **Cross-project analytics** - Aggregate stats across all cached instances
3. **Project switching detection** - Emit event when active project changes
4. **Memory monitoring** - Track instance map size for leak detection

## Related Documentation

- [Telemetry System](.aios-core/docs/TELEMETRY.md)
- [Dashboard Architecture](.aios-core/dashboard/README.md)
- [Development Workflow](../README.md#development)

---

**Version:** 1.0.0
**Date:** 2026-02-16
**Author:** Orion (aios-master)
**Issue:** Multi-project data contamination in npm link dev mode
