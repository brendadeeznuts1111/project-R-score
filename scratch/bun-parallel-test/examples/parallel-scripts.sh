#!/usr/bin/env bash
# bun run --parallel / --sequential quick reference
# Features #1-5 — PR #26551 — New in Bun 1.3.9
#
# Replaces: npm-run-all, concurrently, custom & wait scripts
# Zero dependencies — built into bun run.

# Parallel local scripts
bun run --parallel lint typecheck build

# Sequential local scripts
bun run --sequential lint typecheck build

# Glob match — runs build:css, build:js, build:assets concurrently
bun run --parallel "build:*"

# All workspace packages, one script
bun run --parallel --filter '*' build

# All workspace packages, multiple scripts
# 3 scripts × 3 packages = 8 tasks (utils has no lint)
bun run --parallel --filter '*' build lint test

# Keep going on failure
bun run --parallel --no-exit-on-error --filter '*' test

# Skip packages missing the script
bun run --parallel --workspaces --if-present lint

# Equivalent ways to target all workspace packages
bun run --parallel --filter '*' build
bun run --parallel --workspaces build
