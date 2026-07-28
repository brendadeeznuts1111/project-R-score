#!/usr/bin/env bash
# audit-bunfig.sh — thin wrapper around scripts/audit-bunfig.ts
#
# Logic + machine-key lists live in TypeScript and import
# lib/install/machine-bunfig-policy.ts (same SSOT as doctor bunfig probes).
#
# Usage (from repo root):
#   ./scripts/audit-bunfig.sh
#   ./scripts/audit-bunfig.sh --strict   # exit 1 if any redundant keys found
#   ./scripts/audit-bunfig.sh --doctor   # prefer kimi-doctor --gate bunfig-policy (if on PATH)
#
# @see docs/UNIFIED.md
# @see lib/install/machine-bunfig-policy.ts

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bun "$ROOT/scripts/audit-bunfig.ts" "$@"
