#!/bin/bash
# bun-type-fixes dedicated PATH wrapper

# Set project-specific environment
export BUN_TYPE_FIXES_ROOT="/Users/nolarose/bun-type-fixes"
export BUN_TYPE_FIXES_BIN="/Users/nolarose/bun-type-fixes/bin"
export PATH="/Users/nolarose/bun-type-fixes/bin:$PATH"

# Run the CLI with bun
cd "/Users/nolarose/bun-type-fixes"
bun run cli.ts "$@"
