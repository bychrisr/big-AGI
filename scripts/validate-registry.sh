#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="$REPO_ROOT/squads-base/registry.yaml"
MINDS_DIR="$REPO_ROOT/squads-base/mmos-squad/minds"

errors=0

echo "=== Validating teamAI Registry ==="

# Check registry exists
if [ ! -f "$REGISTRY" ]; then
  echo "FATAL: registry not found: $REGISTRY"
  exit 1
fi

# Validate squad paths exist
echo ""
echo "Checking squad paths..."
for path in \
  "squads-base/mmos-squad" \
  "users/chris_rodrigues/squads/kaven-squad" \
  "users/guilger_oliveira/squads/psicologia-squad"; do
  full="$REPO_ROOT/$path"
  if [ ! -d "$full" ] && [ ! -L "$full" ]; then
    echo "  ERROR: Squad path not found: $path"
    errors=$((errors + 1))
  else
    echo "  OK: $path"
  fi
done

# Validate user paths exist
echo ""
echo "Checking user paths..."
for user in chris_rodrigues guilger_oliveira; do
  for subdir in minds clone; do
    path="users/$user/$subdir"
    full="$REPO_ROOT/$path"
    if [ ! -d "$full" ]; then
      echo "  ERROR: User path not found: $path"
      errors=$((errors + 1))
    else
      echo "  OK: $path"
    fi
  done
done

# Validate symlinks for mmos-squad
echo ""
echo "Checking symlinks..."
for user in chris_rodrigues guilger_oliveira; do
  link="$REPO_ROOT/users/$user/squads/mmos-squad"
  rel_link="users/$user/squads/mmos-squad"
  if [ -L "$link" ]; then
    target=$(readlink "$link")
    if [ -d "$link" ]; then
      echo "  OK: $rel_link -> $target (resolves)"
    else
      echo "  ERROR: Broken symlink: $rel_link -> $target"
      errors=$((errors + 1))
    fi
  else
    echo "  ERROR: Not a symlink: $rel_link"
    errors=$((errors + 1))
  fi
done

# Validate minds_count in registry matches actual directory count
echo ""
echo "Checking minds count..."
registry_count=$(grep "minds_count:" "$REGISTRY" | head -1 | awk '{print $2}')
actual_count=$(find "$MINDS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
echo "  Registry minds_count: $registry_count"
echo "  Actual minds dirs:    $actual_count"
if [ "$registry_count" != "$actual_count" ]; then
  echo "  ERROR: minds_count mismatch ($registry_count in registry vs $actual_count on disk)"
  errors=$((errors + 1))
else
  echo "  OK: counts match"
fi

# Summary
echo ""
if [ "$errors" -eq 0 ]; then
  echo "=== All validations passed — 0 errors ==="
  exit 0
else
  echo "=== Found $errors error(s) ==="
  exit 1
fi
