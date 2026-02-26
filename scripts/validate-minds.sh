#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MINDS_DIR="$REPO_ROOT/squads-base/mmos-squad/minds"
REQUIRED_FIELDS=(id name specialty token_budget)

errors=0
valid=0

if [ ! -d "$MINDS_DIR" ]; then
  echo "FATAL: minds directory not found: $MINDS_DIR"
  exit 1
fi

for mind_dir in "$MINDS_DIR"/*/; do
  [ -d "$mind_dir" ] || continue
  mind=$(basename "$mind_dir")

  # Check metadata.yaml exists
  if [ ! -f "$mind_dir/metadata.yaml" ]; then
    echo "ERROR: $mind missing metadata.yaml"
    errors=$((errors + 1))
    continue
  fi

  # Check required fields in metadata.yaml
  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! grep -q "^${field}:" "$mind_dir/metadata.yaml"; then
      echo "ERROR: $mind/metadata.yaml missing required field: $field"
      errors=$((errors + 1))
    fi
  done

  # Check kb/ directory
  if [ ! -d "$mind_dir/kb" ]; then
    echo "ERROR: $mind missing kb/ directory"
    errors=$((errors + 1))
  fi

  # Check system_prompts/ directory
  if [ ! -d "$mind_dir/system_prompts" ]; then
    echo "ERROR: $mind missing system_prompts/ directory"
    errors=$((errors + 1))
  fi

  valid=$((valid + 1))
done

echo ""
echo "Minds validated: $valid"

if [ "$errors" -eq 0 ]; then
  echo "All minds valid — 0 errors"
  exit 0
else
  echo "Found $errors error(s)"
  exit 1
fi
