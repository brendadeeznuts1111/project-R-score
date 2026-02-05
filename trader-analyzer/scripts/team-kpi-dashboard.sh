#!/bin/bash
# [TEAM.KPI.DASHBOARD.RG:IMPLEMENTATION] Real-Time KPI Dashboard
# @description Monitor Human Capital Knowledge Graph health in real-time using tmux
# @usage ./scripts/team-kpi-dashboard.sh

set -e

echo "🚀 Starting Team KPI Dashboard..."

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ Error: tmux is not installed. Please install it first."
    exit 1
fi

# Check if watch is installed
if ! command -v watch &> /dev/null; then
    echo "❌ Error: watch is not installed. Please install it first."
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t team-kpi 2>/dev/null || true

# Create new tmux session with metrics panel
tmux new-session -d -s team-kpi -n 'Team Metrics' \
    "watch -n 5 'bun -e \"import(\\\"../src/monitoring/team-metrics.ts\\\").then(m => m.collectTeamMetrics().then(metrics => console.log(JSON.stringify(metrics, null, 2))))\"'"

# Split window horizontally for team stats
tmux split-window -h -t team-kpi:0 \
    "watch -n 5 'bun run team:info --stats'"

# Split window vertically for RG marker count
tmux split-window -v -t team-kpi:0.1 \
    "watch -n 10 'echo \"RG Markers in TEAM.md:\"; rg --pcre2 -c \"\\\\[TEAM\\\\..*\\\\.RG(:[A-Z]+)?\\\\]\" .github/TEAM.md || echo \"0\"'"

# Split window vertically for CODEOWNERS sync status
tmux split-window -v -t team-kpi:0.0 \
    "watch -n 10 'echo \"CODEOWNERS Sync Status:\"; bun run codeowners:validate 2>&1 | tail -1 || echo \"Checking...\"'"

# Select first pane
tmux select-pane -t team-kpi:0.0

# Attach to session
echo "✅ Dashboard started! Attaching to tmux session 'team-kpi'..."
echo "   Press Ctrl+B then D to detach"
echo "   Press Ctrl+C in each pane to stop that panel"
echo ""

tmux attach-session -t team-kpi
