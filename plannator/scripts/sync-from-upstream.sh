#!/usr/bin/env bash
set -euo pipefail

# Sync local Plannotator extra skills from upstream.
# Preserves locally-added *.test.ts files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPSTREAM_URL="https://github.com/backnotprop/plannotator"
SKILLS_DIR="$REPO_ROOT/.agents/skills"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Fetching upstream extra skills from $UPSTREAM_URL ..."
curl -fsSL "$UPSTREAM_URL/archive/refs/heads/main.tar.gz" \
  | tar -xz -C "$TMP_DIR" --strip-components=4 "plannotator-main/apps/skills/extra/"

echo "Syncing into $SKILLS_DIR ..."
mkdir -p "$SKILLS_DIR"
rsync -av --delete --exclude='*.test.ts' "$TMP_DIR/" "$SKILLS_DIR/"

echo "Done. Run 'bun test' to verify the mirrored skills."
