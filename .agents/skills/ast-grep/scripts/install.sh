#!/usr/bin/env bash
# Hydrate the pinned ast-grep workspace dependencies from the shared root lockfile.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SKILL_ROOT/../../.." && pwd)"
cd "$REPO_ROOT"

echo "Hydrating @projects/ast-grep-skill from $REPO_ROOT/bun.lock ..."
bun install --frozen-lockfile --ignore-scripts
chmod +x "$SKILL_ROOT/scripts/sg.sh" "$SKILL_ROOT/scripts/doctor.sh"
"$SKILL_ROOT/scripts/doctor.sh"
