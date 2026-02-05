#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Fire22 dependency-upgrade pipeline"

# 0. Prep
branch="chore/upgrade-deps-$(date +%F-%H%M%S)"
git checkout -b "$branch"

# 0b. Save lockfile snapshot
cp bun.lockb bun.lockb.pre-upgrade

# 0c. Checkpoint
git add -A
git commit -m "checkpoint: pre-upgrade state"

# 1. Audit
bun outdated -r --json > pre-upgrade.json

# 2. Upgrade dev-deps
bun run upgrade:dev-deps

# 3. Upgrade runtime deps (interactive)
bun update -i -r --filter="@fire22/*" zod stripe twilio better-sqlite3 date-fns drizzle-orm

# 4. Install, build, lint, test
bun install -r
bun run verify:pre-publish

# 5. Changesets
bun run changeset:create

# 6. Commit changesets only if any were created
if [ -n "$(ls .changeset/*.md 2>/dev/null)" ]; then
  git add .changeset/
  git commit -m "chore: add changesets for major dep upgrades"
else
  echo "ℹ️  No changesets generated; skipping commit."
fi

echo "✅ Ready for PR. Before merge run:"
echo "   bunx changeset version && bun run verify:pre-publish"