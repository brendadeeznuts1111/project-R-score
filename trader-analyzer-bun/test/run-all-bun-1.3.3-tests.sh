#!/usr/bin/env bash
# Run all Bun 1.3.3 reliability and performance tests
# Tests: dependency management, version parsing, WebSocket optimizations, HTTP state machine

set -euo pipefail

echo "🧪 Running Bun 1.3.3 Test Suite"
echo ""

# Dependency Management Tests
echo "📦 Dependency Management Tests"
bun test test/bun-1.3.3-integration.test.ts
echo ""

# Version Parsing Tests
echo "🔢 Version Parsing Tests"
bun test test/bun-version-parsing.test.ts
echo ""

# WebSocket CPU Profiling Tests
echo "⚡ WebSocket CPU Profiling Tests"
bun test test/websocket-cpu-profile.test.ts
echo ""

# HTTP Connection State Tests
echo "🌐 HTTP Connection State Tests"
bun test test/http-connection-state.test.ts
echo ""

# WebSocket Event Loop Tests
echo "🔄 WebSocket Event Loop Tests"
bun test test/websocket-event-loop.test.ts
echo ""

echo "✅ All Bun 1.3.3 tests completed"
