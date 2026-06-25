#!/usr/bin/env bash
# Install pinned @ast-grep/cli@0.44.0 into this skill's node_modules.
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_ROOT"

echo "Installing @ast-grep/cli@0.44.0 in $SKILL_ROOT ..."
npm install
chmod +x scripts/sg.sh scripts/doctor.sh
./scripts/doctor.sh