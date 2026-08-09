#!/usr/bin/env bash
# new-regression.sh — thin wrapper around scripts/new-regression.ts
#
# Scaffold tests/regression/bun-<version>.test.ts from the release-probe template.
#
# Usage (from repo root):
#   ./scripts/new-regression.sh 1.3.15
#   ./scripts/new-regression.sh --from-current
#   ./scripts/new-regression.sh 1.3.15 --dry-run
#   bun run regression:new -- 1.3.15
#
# @see tests/regression/README.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bun "$ROOT/scripts/new-regression.ts" "$@"
