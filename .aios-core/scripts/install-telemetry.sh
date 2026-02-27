#!/usr/bin/env bash
#
# AIOS Telemetry Installer
#
# Copies telemetry files to an existing AIOS project.
# Run from the aios-core repo or pass AIOS_CORE_PATH.
#
# Usage:
#   ./install-telemetry.sh /path/to/target/project
#   AIOS_CORE_PATH=/path/to/aios-core ./install-telemetry.sh /path/to/target
#
# What it installs:
#   - Core scripts (execution-telemetry, estimation-tracker, token-parser, analytics)
#   - CLI commands (telemetry show/report/cleanup/dashboard/backfill)
#   - React dashboard (pre-built dist + source)
#   - Data directory structure
#   - Config section in core-config.yaml (if not present)
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()  { echo -e "${RED}✗${NC}  $1"; exit 1; }

# ── Resolve paths ────────────────────────────────────────
TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"

# Find aios-core source (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIOS_CORE="${AIOS_CORE_PATH:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Validate source
[[ -f "$AIOS_CORE/development/scripts/execution-telemetry.js" ]] || \
  fail "Cannot find aios-core source at $AIOS_CORE"

# Validate target has .aios-core
if [[ ! -d "$TARGET/.aios-core" ]]; then
  fail "Target $TARGET does not have .aios-core/ - is AIOS installed?"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  AIOS Telemetry Installer${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
info "Source: $AIOS_CORE"
info "Target: $TARGET"
echo ""

# ── Phase 1: Core Scripts ────────────────────────────────
info "Phase 1: Installing core scripts..."

SCRIPTS_DIR="$TARGET/.aios-core/development/scripts"
mkdir -p "$SCRIPTS_DIR"

for script in execution-telemetry.js estimation-tracker.js claude-code-token-parser.js telemetry-analytics.js; do
  if [[ -f "$AIOS_CORE/development/scripts/$script" ]]; then
    cp "$AIOS_CORE/development/scripts/$script" "$SCRIPTS_DIR/$script"
    ok "$script"
  else
    warn "Skipping $script (not found in source)"
  fi
done

# ── Phase 2: CLI Commands ────────────────────────────────
info "Phase 2: Installing CLI commands..."

CLI_DIR="$TARGET/.aios-core/cli/commands/telemetry"
mkdir -p "$CLI_DIR"

for cmd in index.js show.js report.js cleanup.js dashboard.js backfill.js; do
  if [[ -f "$AIOS_CORE/cli/commands/telemetry/$cmd" ]]; then
    cp "$AIOS_CORE/cli/commands/telemetry/$cmd" "$CLI_DIR/$cmd"
    ok "cli/telemetry/$cmd"
  else
    warn "Skipping cli/telemetry/$cmd (not found)"
  fi
done

# ── Phase 3: Dashboard ──────────────────────────────────
info "Phase 3: Installing dashboard..."

DASH_DIR="$TARGET/.aios-core/dashboard"

if [[ -d "$AIOS_CORE/dashboard" ]]; then
  # Copy entire dashboard
  cp -r "$AIOS_CORE/dashboard" "$TARGET/.aios-core/"
  ok "Dashboard copied (source + dist)"

  # Ensure node_modules exist
  if [[ -f "$DASH_DIR/package.json" ]] && [[ ! -d "$DASH_DIR/node_modules" ]]; then
    info "Installing dashboard dependencies..."
    (cd "$DASH_DIR" && npm install --silent 2>/dev/null) && ok "npm install done" || warn "npm install failed (run manually)"
  fi
else
  warn "Dashboard directory not found in source"
fi

# ── Phase 4: Data Directory ─────────────────────────────
info "Phase 4: Creating data directory..."

DATA_DIR="$TARGET/.aios/data"
mkdir -p "$DATA_DIR"

# Initialize empty telemetry file if not exists
if [[ ! -f "$DATA_DIR/execution-telemetry.json" ]]; then
  cat > "$DATA_DIR/execution-telemetry.json" << 'JSONEOF'
{
  "version": "1.0.0",
  "executions": [],
  "aggregates": {
    "totalSessions": 0,
    "totalTasks": 0,
    "totalDurationMs": 0,
    "successRate": 0,
    "byAgent": {},
    "byTask": {},
    "byWorkflow": {}
  },
  "trends": {}
}
JSONEOF
  ok "Created execution-telemetry.json (empty)"
else
  ok "execution-telemetry.json already exists"
fi

# Initialize empty estimates file if not exists
if [[ ! -f "$DATA_DIR/estimates.json" ]]; then
  cat > "$DATA_DIR/estimates.json" << 'JSONEOF'
{
  "version": "1.0.0",
  "estimates": [],
  "projectSummary": {
    "totalEstimatedHours": 0,
    "totalActualHours": 0,
    "overallAccuracy": 0,
    "trend": "stable"
  }
}
JSONEOF
  ok "Created estimates.json (empty)"
else
  ok "estimates.json already exists"
fi

# ── Phase 5: Register CLI command ────────────────────────
info "Phase 5: Checking CLI registration..."

CLI_INDEX="$TARGET/.aios-core/cli/index.js"
if [[ -f "$CLI_INDEX" ]]; then
  if grep -q "createTelemetryCommand" "$CLI_INDEX" 2>/dev/null; then
    ok "Telemetry command already registered in CLI"
  else
    warn "Telemetry command NOT registered in CLI index.js"
    warn "Add manually:"
    echo "    const { createTelemetryCommand } = require('./commands/telemetry');"
    echo "    program.addCommand(createTelemetryCommand());"
  fi
else
  warn "CLI index.js not found at $CLI_INDEX"
fi

# ── Phase 6: Config section ──────────────────────────────
info "Phase 6: Checking config..."

CONFIG="$TARGET/.aios-core/core-config.yaml"
if [[ -f "$CONFIG" ]]; then
  if grep -q "executionTelemetry:" "$CONFIG" 2>/dev/null; then
    ok "executionTelemetry config section exists"
  else
    warn "executionTelemetry section missing from core-config.yaml"
    warn "Add the executionTelemetry section manually or run backfill to auto-create"
  fi
else
  warn "core-config.yaml not found"
fi

# ── Phase 7: Dashboard server script ────────────────────
info "Phase 7: Creating dashboard launcher..."

LAUNCHER="$TARGET/.aios-core/scripts/start-telemetry-dashboard.sh"
mkdir -p "$(dirname "$LAUNCHER")"

cat > "$LAUNCHER" << 'LAUNCHEOF'
#!/usr/bin/env bash
# Start AIOS Telemetry Dashboard
# Usage: ./start-telemetry-dashboard.sh [port]

PORT="${1:-3100}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AIOS_CORE="$PROJECT_ROOT/.aios-core"
SCRIPTS="$AIOS_CORE/development/scripts"
DIST="$AIOS_CORE/dashboard/dist"
DATA="$PROJECT_ROOT/.aios/data"

if [[ ! -d "$DIST" ]]; then
  echo "Dashboard not built. Building..."
  (cd "$AIOS_CORE/dashboard" && npm run build)
fi

echo "Starting AIOS Telemetry Dashboard on port $PORT..."
node -e "
const http=require('http'),fs=require('fs'),path=require('path');
const DIST='$DIST',DATA='$DATA',SCRIPTS='$SCRIPTS';
const mimes={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
let tokenCache=null,tokenCacheTime=0,analyticsCache=null,analyticsCacheTime=0;
const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.url==='/api/telemetry'){try{const t=JSON.parse(fs.readFileSync(path.join(DATA,'execution-telemetry.json'),'utf8'));const e=fs.existsSync(path.join(DATA,'estimates.json'))?JSON.parse(fs.readFileSync(path.join(DATA,'estimates.json'),'utf8')):{estimates:[],projectSummary:{}};res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({dashboard:t.aggregates||{},estimates:{...(e.projectSummary||{}),entries:e.estimates||[]},rawExecutions:t.executions||[]}));}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;}
  if(req.url==='/api/tokens'){try{const now=Date.now();if(!tokenCache||(now-tokenCacheTime)>60000){const{generateTokenReport}=require(path.join(SCRIPTS,'claude-code-token-parser'));tokenCache=await generateTokenReport();tokenCacheTime=now;}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(tokenCache));}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;}
  if(req.url==='/api/analytics'){try{const now=Date.now();if(!analyticsCache||(now-analyticsCacheTime)>60000){const t=JSON.parse(fs.readFileSync(path.join(DATA,'execution-telemetry.json'),'utf8'));if(!tokenCache){const{generateTokenReport}=require(path.join(SCRIPTS,'claude-code-token-parser'));tokenCache=await generateTokenReport();tokenCacheTime=now;}const{generateAnalytics}=require(path.join(SCRIPTS,'telemetry-analytics'));analyticsCache=generateAnalytics(t,tokenCache);analyticsCacheTime=now;}res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(analyticsCache));}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}return;}
  let fp=path.join(DIST,req.url==='/'?'index.html':req.url);if(!fs.existsSync(fp))fp=path.join(DIST,'index.html');const ext=path.extname(fp);try{res.writeHead(200,{'Content-Type':mimes[ext]||'application/octet-stream'});res.end(fs.readFileSync(fp));}catch(e){res.writeHead(404);res.end('Not found');}
});
server.listen($PORT,'0.0.0.0',()=>console.log('Dashboard at http://localhost:$PORT'));
"
LAUNCHEOF

chmod +x "$LAUNCHER"
ok "Created start-telemetry-dashboard.sh"

# ── Summary ──────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "  1. Backfill historical data:"
echo "     cd $TARGET && node -e \"const{createBackfillCommand}=require('./.aios-core/cli/commands/telemetry/backfill');const{Command}=require('commander');const p=new Command();p.addCommand(createBackfillCommand());p.parse(['node','x','backfill','--dry-run','--verbose'])\""
echo ""
echo "  2. Launch dashboard:"
echo "     $LAUNCHER"
echo ""
echo "  3. Open in browser:"
echo "     http://localhost:3100"
echo ""
