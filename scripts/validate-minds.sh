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
  mind_errors=0

  # metadata.yaml é opcional — apenas avisa se ausente
  if [ ! -f "$mind_dir/metadata.yaml" ]; then
    echo "WARN: $mind sem metadata.yaml (slug usado como fallback)"
  fi

  # system_prompts/ é obrigatório — mind sem prompt não é utilizável
  if [ ! -d "$mind_dir/system_prompts" ]; then
    echo "ERROR: $mind sem diretório system_prompts/"
    errors=$((errors + 1))
    mind_errors=$((mind_errors + 1))
  else
    # Verifica que existe ao menos um arquivo .md no system_prompts/
    prompt_count=$(find "$mind_dir/system_prompts/" -name "*.md" 2>/dev/null | wc -l)
    if [ "$prompt_count" -eq 0 ]; then
      echo "ERROR: $mind/system_prompts/ não tem nenhum arquivo .md"
      errors=$((errors + 1))
      mind_errors=$((mind_errors + 1))
    fi
  fi

  if [ "$mind_errors" -eq 0 ]; then
    valid=$((valid + 1))
  fi
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
