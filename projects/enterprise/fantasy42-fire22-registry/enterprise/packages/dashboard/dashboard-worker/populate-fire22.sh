#!/bin/bash
# Fire22 Master Database Population Script
# One-command solution to populate the Fire22 database with all required data

set -e

echo "🔥 Fire22 Master Database Population"
echo "===================================="
echo ""
echo "This script will populate the Fire22 database with:"
echo "• 20,000+ players across 4 agents (BLAKEPPH, DAKOMA, SCRAMPOST, SPEN)" 
echo "• 35,000+ transactions with realistic amounts"
echo "• 14,500+ betting records with commission tracking"
echo "• Complete Fire22 legacy API compatibility"
echo ""

# Check if we have the required files
if [ ! -f "./data/workflows/sync-production.sh" ]; then
    echo "❌ Required workflow files not found. Please ensure the directory is organized correctly."
    exit 1
fi

echo "🚀 Starting Fire22 database population..."
echo ""

# Navigate to the correct directory for relative paths
cd "$(dirname "$0")"

# Run the production sync script
echo "📊 Phase 1: Production Database Sync"
echo "====================================="
./data/workflows/sync-production.sh

echo ""
echo "🧪 Phase 2: Data Verification"
echo "============================="
./data/workflows/verify-data.sh

echo ""
echo "🎉 Fire22 Population Complete!"
echo "=============================="
echo ""
echo "🎯 Quick Test Commands:"
echo "----------------------"
echo ""
echo "# Test customer count:"
echo "curl -s https://dashboard-worker.nolarose1968-806.workers.dev/api/customers | jq '.data | length'"
echo ""
echo "# Test Fire22 legacy API:"
echo "curl -s -X POST https://dashboard-worker.nolarose1968-806.workers.dev/qubic/api/Manager/getAgentPerformance -d 'agentID=BLAKEPPH&type=CP&start=08/27/2025&end=08/27/2025' | jq '.INFO.LIST | length'"
echo ""
echo "# Test live wagers:"
echo "curl -s -X POST https://dashboard-worker.nolarose1968-806.workers.dev/qubic/api/Manager/getLiveWagers -d 'agentID=BLAKEPPH' | jq '.INFO.LIST | length'"
echo ""
echo "✅ The Fire22 system is now fully populated and ready for use!"
echo ""
echo "📝 Next Steps:"
echo "• Test all Fire22 legacy API endpoints"
echo "• Verify agent hierarchy and permissions"  
echo "• Monitor system performance with new data load"
echo "• Update any hardcoded references to old file paths"