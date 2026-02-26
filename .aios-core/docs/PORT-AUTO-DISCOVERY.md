# Port Auto-Discovery - Dashboard Enhancement

## Feature

Automatic port discovery for the Telemetry Dashboard. If the requested port is busy, the system automatically tries the next port until it finds an available one.

## Problem Solved

**Before:**
```bash
$ aios telemetry dashboard
❌ Port 3100 is already in use.
  Try a different port: aios telemetry dashboard --port 3101
```

User had to manually retry with different port.

**After:**
```bash
$ aios telemetry dashboard
⚠️  Port 3100 is busy, using port 3101 instead.

📊 AIOS Telemetry Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL:     http://localhost:3101
  API:     http://localhost:3101/api/telemetry
  Dist:    /path/to/.aios-core/dashboard/dist
────────────────────────────────────────
  Press Ctrl+C to stop
```

System automatically found next available port and started server.

## Implementation

### Function: `findAvailablePort(startPort, maxAttempts)`

**Location:** `.aios-core/cli/commands/telemetry/dashboard.js`

**Algorithm:**
1. Test requested port using `net.createServer()`
2. If available, return port
3. If busy (EADDRINUSE), try port + 1
4. Repeat up to `maxAttempts` times (default: 10)
5. Throw error if no port found in range

**Code:**
```javascript
async function findAvailablePort(startPort, maxAttempts = 10) {
  const net = require('net');

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    const isAvailable = await new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is busy
        } else {
          resolve(false); // Other error, skip this port
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true); // Port is available
      });

      server.listen(port, '127.0.0.1');
    });

    if (isAvailable) {
      return port;
    }
  }

  throw new Error(
    `No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}
```

### Usage in Dashboard Command

**Before:**
```javascript
const port = parseInt(options.port, 10);
// ... create server
server.listen(port, () => { ... });
```

**After:**
```javascript
const requestedPort = parseInt(options.port, 10);

// Find available port (auto-increment if busy)
const port = await findAvailablePort(requestedPort);
if (port !== requestedPort) {
  console.log(`\n⚠️  Port ${requestedPort} is busy, using port ${port} instead.`);
}

// ... create server
server.listen(port, () => { ... });
```

## Behavior

### Scenarios

| Scenario | Requested Port | Result | Message |
|----------|---------------|--------|---------|
| Port free | 3100 | Uses 3100 | (none) |
| Port busy | 3100 | Uses 3101 | ⚠️ Port 3100 is busy, using port 3101 instead. |
| Ports 3100-3102 busy | 3100 | Uses 3103 | ⚠️ Port 3100 is busy, using port 3103 instead. |
| All ports busy (3100-3109) | 3100 | Error | ❌ No available ports found in range 3100-3109 |

### Search Range

Default: **10 ports** (requested port through requested port + 9)

Example with `--port 3100`:
- Tries: 3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109
- If all busy: throws error

## User Experience

### Single Dashboard

```bash
$ aios telemetry dashboard

📊 AIOS Telemetry Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL:     http://localhost:3100
  ...
```

### Multiple Dashboards (Multi-Project)

```bash
# Terminal 1 - aios-core
$ cd /path/to/aios-core
$ aios telemetry dashboard

📊 AIOS Telemetry Dashboard
  URL:     http://localhost:3100
  ...

# Terminal 2 - kaven-framework
$ cd /path/to/kaven-framework
$ aios telemetry dashboard

⚠️  Port 3100 is busy, using port 3101 instead.

📊 AIOS Telemetry Dashboard
  URL:     http://localhost:3101
  ...

# Terminal 3 - another-project
$ cd /path/to/another-project
$ aios telemetry dashboard

⚠️  Port 3100 is busy, using port 3102 instead.

📊 AIOS Telemetry Dashboard
  URL:     http://localhost:3102
  ...
```

### Manual Port Selection Still Works

```bash
$ aios telemetry dashboard --port 5000

📊 AIOS Telemetry Dashboard
  URL:     http://localhost:5000
  ...
```

If port 5000 is busy:
```bash
$ aios telemetry dashboard --port 5000

⚠️  Port 5000 is busy, using port 5001 instead.

📊 AIOS Telemetry Dashboard
  URL:     http://localhost:5001
  ...
```

## Benefits

### For Development (npm link)
✅ Run multiple project dashboards simultaneously without manual port management
✅ No need to remember which ports are in use
✅ Automatic resolution of port conflicts
✅ Seamless multi-project workflow

### For Users
✅ One less thing to think about
✅ No manual retry needed
✅ Clear feedback when port changes
✅ Graceful degradation (tries 10 ports before failing)

## Edge Cases Handled

1. **Port becomes busy between check and listen:** Rare race condition. Error handler provides clear message.
2. **All ports in range busy:** Clear error message with range shown.
3. **Invalid port number:** Handled by Commander.js (input validation).
4. **Permission issues (ports < 1024):** Error caught and displayed.

## Testing

Validated scenarios:
- ✅ First port available → uses requested port
- ✅ First port busy → tries next port
- ✅ Multiple ports busy → finds first available
- ✅ All ports busy → throws clear error
- ✅ Manual port still works
- ✅ Multi-project simultaneous dashboards

## Files Modified

- `.aios-core/cli/commands/telemetry/dashboard.js`
  - Added `findAvailablePort()` function
  - Modified action to use port discovery
  - Simplified error handler (EADDRINUSE now rare)

## Future Enhancements

Potential improvements:
1. **Configurable max attempts** - Allow user to set range size
2. **Port range specification** - `--port-range 3100-3200`
3. **Random port** - `--port random` finds any available port
4. **Port persistence** - Remember last used port per project

---

**Version:** 1.0.0
**Date:** 2026-02-16
**Implemented by:** Orion (aios-master)
**Related:** Multi-Project Support (v4.3)
