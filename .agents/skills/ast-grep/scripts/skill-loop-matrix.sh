#!/usr/bin/env bash
# Cross-skill loop matrix — doctor + rate by default; override with SKILL_LOOP_MATRIX.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SKILL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PHASES="${SKILL_LOOP_MATRIX:-doctor,rate}"
cd "$ROOT"
exec bun "$SKILL_ROOT/scripts/skill-loop-cli.ts" matrix --phases "$PHASES" --no-color "$@"