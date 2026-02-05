#!/bin/bash
# cleanup-dashboards.sh
# Remove older, overlapping dashboards and consolidate to unified system

echo "🧹 Dashboard Cleanup Script"
echo "=========================="

# Backup directory
BACKUP_DIR="backup/dashboards-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in: $BACKUP_DIR"

# List of dashboards to remove (older/overlapping ones)
DASHBOARDS_TO_REMOVE=(
    "demos/empire-pro-advanced-dashboard.html"
    "demos/empire-pro-final-dashboard.html"
    "demos/production-dashboard.html"
    "demos/dashboard-with-library.html"
    "demos/composable-workflows-dashboard.html"
    "demos/main/dashboard-v2.html"
    "src/dashboard/apple-id-grading-dashboard.html"
    "src/dashboard/cashapp-dashboard-live.html"
    "src/dashboard/cashapp-integration-dashboard.html"
    "src/dashboard/utilities-dashboard.html"
)

# List of dashboards to keep (core functionality)
DASHBOARDS_TO_KEEP=(
    "demos/urlpattern-routing-dashboard.html"
    "demos/analytics/analytics-dashboard.html"
    "demos/credentials/credential-dashboard.html"
    "demos/duoplus-unified-dashboard.html"
)

echo ""
echo "📋 Dashboards to remove:"
for dashboard in "${DASHBOARDS_TO_REMOVE[@]}"; do
    if [ -f "$dashboard" ]; then
        echo "  ❌ $dashboard"
        # Copy to backup first
        cp "$dashboard" "$BACKUP_DIR/"
        # Then remove
        rm "$dashboard"
    else
        echo "  ⚠️  $dashboard (not found)"
    fi
done

echo ""
echo "✅ Dashboards to keep:"
for dashboard in "${DASHBOARDS_TO_KEEP[@]}"; do
    if [ -f "$dashboard" ]; then
        echo "  ✅ $dashboard"
    else
        echo "  ⚠️  $dashboard (not found)"
    fi
done

echo ""
echo "📊 Cleanup Summary:"
REMOVED_COUNT=0
KEPT_COUNT=0

for dashboard in "${DASHBOARDS_TO_REMOVE[@]}"; do
    if [ -f "$dashboard" ]; then
        cp "$dashboard" "$BACKUP_DIR/" 2>/dev/null && rm "$dashboard" 2>/dev/null
        if [ $? -eq 0 ]; then
            ((REMOVED_COUNT++))
        fi
    fi
done

for dashboard in "${DASHBOARDS_TO_KEEP[@]}"; do
    if [ -f "$dashboard" ]; then
        ((KEPT_COUNT++))
    fi
done

echo "  • Removed: $REMOVED_COUNT dashboards"
echo "  • Kept: $KEPT_COUNT dashboards"
echo "  • Backup: $BACKUP_DIR"

echo ""
echo "🎯 New Dashboard Structure:"
echo "├── demos/"
echo "│   ├── duoplus-unified-dashboard.html (NEW - Primary)"
echo "│   ├── urlpattern-routing-dashboard.html"
echo "│   ├── analytics/analytics-dashboard.html"
echo "│   └── credentials/credential-dashboard.html"
echo "├── server/"
echo "│   ├── agent-connection-pool.ts (NEW)"
echo "│   └── agent-pool-api.ts (NEW)"
echo "└── agents/ (Existing agent system)"

echo ""
echo "🚀 Integration Instructions:"
echo "1. Use duoplus-unified-dashboard.html as primary interface"
echo "2. Agent connection pooling managed by server/agent-connection-pool.ts"
echo "3. API endpoints available at /api/agent-pool/*"
echo "4. All older functionality consolidated into unified dashboard"

echo ""
echo "🔗 Quick Access:"
echo "• Unified Dashboard: http://localhost:3002/demos/duoplus-unified-dashboard.html"
echo "• Pool Stats: http://localhost:3002/api/agent-pool/stats"
echo "• Agent List: http://localhost:3002/api/agent-pool/connections"
echo "• Pool Health: http://localhost:3002/api/agent-pool/health"

echo ""
echo "✅ Cleanup complete! System consolidated to unified architecture."
