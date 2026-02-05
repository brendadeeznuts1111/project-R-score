#!/usr/bin/env bash
# Enterprise Dashboard startup script with optimized networking
# Uses Bun CLI --fetch-preconnect for maximum performance
#
# Debug mode: ./start-optimized.sh debug
# Inspect mode: ./start-optimized.sh inspect [port] [prefix]

set -e

DEBUG_MODE=false
INSPECT_MODE=false
INSPECT_PORT="4000"
INSPECT_PREFIX=""

# Parse arguments
if [ "$1" = "debug" ]; then
  DEBUG_MODE=true
  shift
fi

if [ "$1" = "inspect" ]; then
  INSPECT_MODE=true
  if [ -n "$2" ]; then
    INSPECT_PORT="$2"
  fi
  if [ -n "$3" ]; then
    INSPECT_PREFIX="$3"
  fi
  shift 3
fi

# Preconnect to critical hosts before starting the server
# This happens before any JavaScript executes, saving ~40-50ms per host
echo "🚀 Starting enterprise-dashboard with network optimizations..."

# Build bun command with debugging options
BUN_CMD="bun"

if [ "$INSPECT_MODE" = true ]; then
  if [ -n "$INSPECT_PREFIX" ]; then
    BUN_CMD="$BUN_CMD --inspect=$INSPECT_PORT/$INSPECT_PREFIX"
  else
    BUN_CMD="$BUN_CMD --inspect=$INSPECT_PORT"
  fi
  echo "🔍 Debug inspector enabled on port $INSPECT_PORT"
fi

# Preconnect to essential services
BUN_CONFIG_MAX_HTTP_REQUESTS=512 \
BUN_CONFIG_VERBOSE_FETCH=curl \
$BUN_CMD --fetch-preconnect https://api.github.com:443 \
    --fetch-preconnect https://registry.npmjs.org:443 \
    --fetch-preconnect https://bun.sh:443 \
    --fetch-preconnect https://example.com:443 \
    ./src/server/index.ts