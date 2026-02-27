#!/usr/bin/env bash
# rollback.sh — Roll back the last N Supabase migrations
# Usage: ./supabase/migrations/rollback.sh [--steps N] [--dry-run]
#
# NOTE: Supabase does not have native rollback — this script drops the most
# recently created tables based on migration order. USE WITH CAUTION in prod.

set -euo pipefail

STEPS=1
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --steps)   STEPS="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "[rollback] Rolling back last $STEPS migration(s) — $(date '+%Y-%m-%d %H:%M:%S')"
echo "[rollback] WARNING: This is a destructive operation. Data will be lost."

# Tables in reverse creation order
TABLES=(
  "user_projects"
  "user_preferences"
  "user_clone"
  "user_memories"
  "user_api_keys"
  "debate_sessions"
)

TABLES_TO_DROP=("${TABLES[@]:0:$STEPS}")

echo "[rollback] Tables to drop (in order):"
for t in "${TABLES_TO_DROP[@]}"; do
  echo "  - $t"
done

if $DRY_RUN; then
  echo "[rollback] DRY-RUN mode — no changes applied"
  exit 0
fi

# Check for supabase CLI
if ! command -v supabase &>/dev/null; then
  echo "[rollback] ERROR: supabase CLI not found"
  exit 1
fi

# Confirm before proceeding
read -r -p "[rollback] Are you sure? Type 'yes' to confirm: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "[rollback] Aborted"
  exit 0
fi

# Build DROP SQL
SQL="BEGIN;"
for t in "${TABLES_TO_DROP[@]}"; do
  SQL+=" DROP TABLE IF EXISTS $t CASCADE;"
done
SQL+=" COMMIT;"

TARGET="${SUPABASE_TARGET:-local}"
if [[ "$TARGET" == "local" ]]; then
  echo "[rollback] Applying to local instance..."
  echo "$SQL" | supabase db execute --local
else
  echo "[rollback] Applying to remote ($TARGET)..."
  echo "$SQL" | supabase db execute --db-url "${SUPABASE_DB_URL:?SUPABASE_DB_URL required}"
fi

echo "[rollback] Done — ${#TABLES_TO_DROP[@]} table(s) dropped"
