#!/usr/bin/env bash
# ESM bytecode compilation
# Feature #20 — PR #26402 — New in Bun 1.3.9
#
# Using --bytecode with --format=esm is now supported.
# Previously, --bytecode only worked with CommonJS.
#
# Without an explicit --format, --bytecode still defaults to CJS.
# A future Bun version may change that default to ESM.

# ESM bytecode — the new capability
bun build --compile --bytecode --format=esm app.ts --outfile app-esm
./app-esm

# CJS bytecode — existing behavior (--bytecode defaults to CJS)
bun build --compile --bytecode app.ts --outfile app-cjs
./app-cjs
