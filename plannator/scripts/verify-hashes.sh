#!/usr/bin/env bash
set -euo pipefail

# Verify that skills-lock.json hashes match the local SKILL.md files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCK_FILE="$REPO_ROOT/skills-lock.json"
SKILLS_DIR="$REPO_ROOT/.agents/skills"

if [[ ! -f "$LOCK_FILE" ]]; then
  echo "Lock file not found: $LOCK_FILE" >&2
  exit 1
fi

ERRORS=0

for skill in plannotator-compound plannotator-setup-goal plannotator-visual-explainer; do
  SKILL_FILE="$SKILLS_DIR/$skill/SKILL.md"
  if [[ ! -f "$SKILL_FILE" ]]; then
    echo "MISSING: $SKILL_FILE" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  EXPECTED_HASH=$(python3 -c "import json; print(json.load(open('$LOCK_FILE'))['skills']['$skill']['computedHash'])")
  ACTUAL_HASH=$(sha256sum "$SKILL_FILE" | awk '{print $1}')

  if [[ "$EXPECTED_HASH" == "$ACTUAL_HASH" ]]; then
    echo "OK: $skill ($ACTUAL_HASH)"
  else
    echo "MISMATCH: $skill" >&2
    echo "  expected: $EXPECTED_HASH" >&2
    echo "  actual:   $ACTUAL_HASH" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

if [[ "$ERRORS" -gt 0 ]]; then
  echo "Verification failed: $ERRORS error(s)." >&2
  exit 1
fi

echo "All hashes match."
