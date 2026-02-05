#!/bin/bash
# Start tmux session for URLPattern router development and testing
# Usage: ./scripts/start-pattern-testing.sh

set -e

SESSION_NAME="hyperbun-pattern-testing"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Check prerequisites
command -v tmux >/dev/null 2>&1 || { echo "Error: tmux is required but not installed. Aborting." >&2; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "Warning: bun not found. Some panes may not work correctly." >&2; }
command -v jq >/dev/null 2>&1 || { echo "Warning: jq not found. Metrics monitoring may not work correctly." >&2; }
command -v watch >/dev/null 2>&1 || { echo "Warning: watch not found. Some monitoring panes may not work correctly." >&2; }

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"
touch "$PROJECT_ROOT/logs/engine.log" 2>/dev/null || true

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session $SESSION_NAME already exists. Attaching..."
    tmux attach -t "$SESSION_NAME"
    exit 0
fi

# Create new session
cd "$PROJECT_ROOT"
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# Window 1: pattern-dev
tmux rename-window -t "$SESSION_NAME:1" pattern-dev
tmux split-window -h -t "$SESSION_NAME:pattern-dev"
tmux select-layout -t "$SESSION_NAME:pattern-dev" main-vertical
tmux send-keys -t "$SESSION_NAME:pattern-dev.1" 'bun -i' Enter
tmux send-keys -t "$SESSION_NAME:pattern-dev.2" 'tail -f logs/engine.log 2>/dev/null | rg "HBAPI-00[2-4]" || echo "No log file found"' Enter

# Window 2: pattern-benchmark
tmux new-window -t "$SESSION_NAME" -n pattern-benchmark
tmux split-window -h -t "$SESSION_NAME:pattern-benchmark"
tmux split-window -v -t "$SESSION_NAME:pattern-benchmark.1"
tmux split-window -v -t "$SESSION_NAME:pattern-benchmark.2"
tmux select-layout -t "$SESSION_NAME:pattern-benchmark" tiled
tmux send-keys -t "$SESSION_NAME:pattern-benchmark.1" 'while true; do bun run bench/url-pattern-performance.ts --quiet; sleep 10; done' Enter
tmux send-keys -t "$SESSION_NAME:pattern-benchmark.2" 'watch -n 5 "curl -s http://localhost:3000/api/v1/metrics 2>/dev/null | jq .patternMetrics || echo \"Metrics endpoint not available\""' Enter
tmux send-keys -t "$SESSION_NAME:pattern-benchmark.3" 'watch -n 10 "bun -e \"import(\\\"./src/api/routers/urlpattern-router.js\\\").then(m => { const router = m.urlPatternRouter.getMetrics(); import(\\\"./src/api/routers/pattern-optimizer.js\\\").then(o => { const opt = o.patternOptimizer.getStats(); console.log(\\\"Router:\\\", router); console.log(\\\"Optimizer:\\\", opt); }); });\" 2>/dev/null || echo \"Router not available\""' Enter
tmux send-keys -t "$SESSION_NAME:pattern-benchmark.4" 'tail -f logs/engine.log 2>/dev/null | rg "pattern_missed|execution_failed" || echo "No errors found"' Enter

# Window 3: pattern-test
tmux new-window -t "$SESSION_NAME" -n pattern-test
tmux split-window -v -t "$SESSION_NAME:pattern-test"
tmux select-layout -t "$SESSION_NAME:pattern-test" main-horizontal
tmux send-keys -t "$SESSION_NAME:pattern-test.1" 'bun test test/api/url-pattern-router.test.ts --watch' Enter
tmux send-keys -t "$SESSION_NAME:pattern-test.2" 'while true; do echo "Testing patterns..."; curl -s http://localhost:3000/api/v1/graph/NFL-20241207-1345 2>/dev/null | jq ".layers.L4.correlations | length" || echo "Graph endpoint not available"; curl -s http://localhost:3000/api/v1/logs/WARN?limit=5 2>/dev/null | jq ".logs[0].code" || echo "Logs endpoint not available"; sleep 5; done' Enter

# Window 4: pattern-registry (Registry & API Management)
tmux new-window -t "$SESSION_NAME" -n pattern-registry
tmux split-window -h -t "$SESSION_NAME:pattern-registry"
tmux split-window -v -t "$SESSION_NAME:pattern-registry.1"
tmux split-window -v -t "$SESSION_NAME:pattern-registry.2"
tmux select-layout -t "$SESSION_NAME:pattern-registry" tiled
tmux send-keys -t "$SESSION_NAME:pattern-registry.1" 'watch -n 10 "curl -s http://localhost:3000/api/registry 2>/dev/null | jq \".[] | select(.type == \\\"url-anomaly-patterns\\\" or .name | contains(\\\"pattern\\\"))\" || echo \"Registry endpoint not available\""' Enter
tmux send-keys -t "$SESSION_NAME:pattern-registry.2" 'watch -n 15 "curl -s http://localhost:3000/api/registry/url-anomaly-patterns 2>/dev/null | jq \".registry | length\" || echo \"Pattern registry not available\""' Enter
tmux send-keys -t "$SESSION_NAME:pattern-registry.3" 'watch -n 10 "curl -s http://localhost:3000/api/v1/metrics 2>/dev/null | jq \"{patterns: .patternMetrics.patterns, cacheHits: (.patternMetrics.cacheHits | length), cacheMisses: .patternMetrics.cacheMisses}\" || echo \"Metrics endpoint not available\""' Enter
tmux send-keys -t "$SESSION_NAME:pattern-registry.4" 'tail -f logs/hyper-bun-*.log 2>/dev/null | grep -E "pattern|registry|HBAPI" | tail -20 || echo "No log files found"' Enter

# Window 5: cpu-profiling (CPU Profiling Registry)
tmux new-window -t "$SESSION_NAME" -n cpu-profiling
tmux split-window -v -t "$SESSION_NAME:cpu-profiling"
tmux select-layout -t "$SESSION_NAME:cpu-profiling" main-horizontal
tmux send-keys -t "$SESSION_NAME:cpu-profiling.1" 'while true; do echo "=== CPU Profiling Registry Status ==="; curl -s http://localhost:3000/api/v1/cpu-profiling/regression-status 2>/dev/null | jq "{hasBaseline, hasProfiles, latestProfile: .latestProfile.version, baseline: .baseline.version, regression: .regression.severity}" || echo "CPU profiling API not available"; echo ""; curl -s http://localhost:3000/api/v1/cpu-profiling/profiles 2>/dev/null | jq "length" | xargs -I {} echo "Total profiles: {}" || echo "Profiles endpoint not available"; sleep 15; done' Enter
tmux send-keys -t "$SESSION_NAME:cpu-profiling.2" 'echo "CPU Profiling Commands:"; echo "======================"; echo ""; echo "bun run cpu-prof:test      - Run profiling test"; echo "bun run cpu-prof:baseline  - Create baseline profile"; echo "bun run cpu-prof:compare  - Compare against baseline"; echo "bun run cpu-prof:freeze   - Lock baseline version"; echo "bun run cpu-prof:list     - List all profiles"; echo "bun run cpu-prof:status   - Get regression status"; echo "bun run cpu-prof:clean    - Clean old profiles"; echo "bun run cpu-prof:dashboard - Run test and update dashboard"; echo ""; echo "API Endpoints:"; echo "GET  /api/v1/cpu-profiling/profiles"; echo "GET  /api/v1/cpu-profiling/baseline"; echo "GET  /api/v1/cpu-profiling/regression-status"; echo "POST /api/v1/cpu-profiling/baseline/freeze"; echo ""; echo "Press Ctrl+C to exit or leave this pane open for reference"; tail -f /dev/null' Enter

# Window 6: research-system (Research System Monitoring)
tmux new-window -t "$SESSION_NAME" -n research-system
tmux split-window -h -t "$SESSION_NAME:research-system"
tmux split-window -v -t "$SESSION_NAME:research-system.1"
tmux split-window -v -t "$SESSION_NAME:research-system.2"
tmux select-layout -t "$SESSION_NAME:research-system" tiled
tmux send-keys -t "$SESSION_NAME:research-system.1" 'while true; do echo "=== Research System Status ==="; echo ""; echo "Tension Events (last 5):"; curl -s http://localhost:3000/research/tension/NFL-20241207-1345 2>/dev/null | jq ".data[0:5] | .[] | {tension_type, severity, nodes}" || echo "Tension API not available"; echo ""; echo "Pattern Discovery (basketball, 24h):"; curl -s "http://localhost:3000/research/patterns/basketball?hours=24" 2>/dev/null | jq ".count" | xargs -I {} echo "Patterns found: {}" || echo "Pattern API not available"; echo ""; sleep 15; done' Enter
tmux send-keys -t "$SESSION_NAME:research-system.2" 'echo "╔══════════════════════════════════════════════════════════╗"; echo "║     Multi-Layer Graph Dashboard - Quick Access           ║"; echo "╚══════════════════════════════════════════════════════════╝"; echo ""; echo "🚀 Open Dashboard:"; echo "  open dashboard/multi-layer-graph.html"; echo "  # Or serve via HTTP: bun run dashboard:serve"; echo "  # Then navigate to: http://localhost:8080/multi-layer-graph.html"; echo ""; echo "📋 Usage Steps:"; echo "  1. Enter Event ID (e.g., NFL-20241207-1345)"; echo "  2. Click \"Load Graph\""; echo "  3. Use \"Start Streaming\" for real-time updates"; echo "  4. Toggle layers and adjust confidence filter"; echo "  5. Click nodes/edges for details"; echo "  6. Export data as JSON or GraphML"; echo ""; echo "🌐 API Endpoints:"; echo "  POST /api/mcp/tools/research-build-multi-layer-graph"; echo "  POST /api/mcp/tools/research-generate-visualization"; echo ""; echo "💡 Test Graph Loading:"; echo "  curl -X POST http://localhost:3000/api/mcp/tools/research-build-multi-layer-graph \\"; echo "    -H \"Content-Type: application/json\" \\"; echo "    -d \"{\\\"eventId\\\": \\\"NFL-20241207-1345\\\", \\\"layers\\\": \\\"all\\\"}\" | jq"; echo ""; echo "🔧 Implementation:"; echo "  MCP Tools: src/mcp/tools/multi-layer-correlation.ts"; echo "  Visualization: src/arbitrage/shadow-graph/multi-layer-visualization.ts"; echo "  Graph Builder: EnhancedMultiLayerCorrelationGraph"; echo "  Generator: MultiLayerVisualizationGenerator"; echo ""; echo "Press Ctrl+C to exit or leave this pane open for reference"; tail -f /dev/null' Enter
tmux send-keys -t "$SESSION_NAME:research-system.3" 'echo "╔══════════════════════════════════════════════════════════╗"; echo "║     Research System - Commands & Endpoints                ║"; echo "╚══════════════════════════════════════════════════════════╝"; echo ""; echo "📊 API Endpoints:"; echo "  GET  /research/tension/:eventId"; echo "  GET  /research/patterns/:sport?hours=24"; echo "  POST /research/tension/start?interval=5000"; echo "  POST /research/tension/stop"; echo "  POST /research/tension/:tensionId/resolve"; echo ""; echo "🔬 Research Components:"; echo "  Sub-Market Node Registry: src/research/schema/sub-market-nodes.ts"; echo "  Tension Detector: src/research/tension/tension-detector.ts"; echo "  Pattern Miner: src/research/discovery/pattern-miner.ts"; echo "  WebSocket Feed: src/research/dashboard/tension-feed.ts (port 8081)"; echo "  MCP Tools: src/research/mcp/tools/research-explorer.ts"; echo ""; echo "📋 Pattern Validation:"; echo "  bun scripts/validate-pattern.ts <patternId>"; echo "  Stages: Backtest → Paper Trading → Canary → Monitoring → Promotion"; echo ""; echo "Press Ctrl+C to exit or leave this pane open for reference"; tail -f /dev/null' Enter
tmux send-keys -t "$SESSION_NAME:research-system.4" 'echo "╔══════════════════════════════════════════════════════════╗"; echo "║     Dashboard Server & Quick Commands                    ║"; echo "╚══════════════════════════════════════════════════════════╝"; echo ""; echo "🖥️  Dashboard Server:"; echo "  bun run dashboard:serve"; echo "  Default port: 8080"; echo ""; echo "📊 Available Dashboards:"; echo "  http://localhost:8080/                    - Main dashboard"; echo "  http://localhost:8080/multi-layer-graph.html - Graph visualization"; echo "  http://localhost:8080/index.html         - Operations portal"; echo ""; echo "🔍 Check Server Status:"; echo "  curl -s http://localhost:8080/api/health || echo \"Server not running\""; echo ""; echo "💡 Quick Test:"; echo "  # Test graph API"; echo "  curl -X POST http://localhost:3000/api/mcp/tools/research-build-multi-layer-graph \\"; echo "    -H \"Content-Type: application/json\" \\"; echo "    -d \"{\\\"eventId\\\": \\\"NFL-20241207-1345\\\"}\" | jq \".nodes | length\""; echo ""; echo "  # Test visualization generation"; echo "  curl -X POST http://localhost:3000/api/mcp/tools/research-generate-visualization \\"; echo "    -H \"Content-Type: application/json\" \\"; echo "    -d \"{\\\"eventId\\\": \\\"NFL-20241207-1345\\\", \\\"layout\\\": \\\"hierarchical\\\"}\" | jq"; echo ""; echo "📚 Documentation:"; echo "  dashboard/MULTI-LAYER-GRAPH-README.md"; echo "  docs/MCP-MULTI-LAYER-TOOLS-VERIFICATION.md"; echo ""; echo "Press Ctrl+C to exit or leave this pane open for reference"; tail -f /dev/null' Enter

# Select first window
tmux select-window -t "$SESSION_NAME:pattern-dev"

echo "Session $SESSION_NAME created successfully!"
echo "Attach with: tmux attach -t $SESSION_NAME"
tmux attach -t "$SESSION_NAME"
