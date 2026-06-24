#!/usr/bin/env bash
# Plannator pre-commit: run quality gates with visual report.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "pre-commit: running gate-report …"
bun run gate-report --fail-fast