#!/usr/bin/env bash
# apply.sh — Apply all pending Supabase migrations in order
# Usage: ./supabase/migrations/apply.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

echo "[apply] Starting migration apply — $(date '+%Y-%m-%d %H:%M:%S')"

# Check that supabase CLI is available
if ! command -v supabase &>/dev/null; then
  echo "[apply] ERROR: supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
  exit 1
fi

# Validate required env vars for non-local targets
TARGET="${SUPABASE_TARGET:-local}"
if [[ "$TARGET" != "local" ]]; then
  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    echo "[apply] ERROR: SUPABASE_DB_URL is required for target '$TARGET'"
    exit 1
  fi
fi

# List migrations in order
MIGRATIONS=("$SCRIPT_DIR"/*.sql)
echo "[apply] Found ${#MIGRATIONS[@]} migration(s):"
for f in "${MIGRATIONS[@]}"; do
  echo "  - $(basename "$f")"
done

if $DRY_RUN; then
  echo "[apply] DRY-RUN mode — no changes applied"
  exit 0
fi

# Apply via supabase CLI
if [[ "$TARGET" == "local" ]]; then
  echo "[apply] Applying to local Supabase instance..."
  supabase db reset --local
  echo "[apply] Done — all migrations applied to local instance"
else
  echo "[apply] Applying to remote Supabase ($TARGET)..."
  supabase db push --db-url "$SUPABASE_DB_URL"
  echo "[apply] Done — all migrations pushed to remote"
fi
