#!/bin/bash

# 🏛️ CITADEL DASHBOARD WORKFLOW - Quick Launch Script
# 
# Usage: ./citadel-workflow.sh
# 
# This script:
# 1. Commits and pushes changes
# 2. Starts dashboard on correct port
# 3. Opens browser automatically
# 4. Runs verification searches

set -e

echo "🚀 Starting Citadel Dashboard Workflow..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Git operations
echo -e "${BLUE}📝 Step 1: Committing and pushing changes...${NC}"

if git add . 2>/dev/null; then
    TIMESTAMP=$(date -Iseconds)
    if git commit -m "Automated dashboard workflow - $TIMESTAMP" 2>/dev/null; then
        echo -e "${GREEN}✅ Changes committed${NC}"
        if git push 2>/dev/null; then
            echo -e "${GREEN}✅ Changes pushed to remote${NC}"
        else
            echo -e "${YELLOW}⚠️ Git push failed, continuing...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Nothing to commit or commit failed, continuing...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Git add failed, continuing...${NC}"
fi

# Step 2: Start dashboard server
echo -e "${BLUE}🖥️ Step 2: Starting dashboard server...${NC}"

# Kill any existing dashboard processes
pkill -f "src/admin/config-server.ts" 2>/dev/null || true

# Start admin dashboard server in background
echo "📊 Starting admin dashboard on port 3227..."
bun run src/admin/config-server.ts &
DASHBOARD_PID=$!

# Wait for server to start
echo -e "${BLUE}⏳ Step 3: Waiting for server to be ready...${NC}"
sleep 3

# Step 4: Open browser
echo -e "${BLUE}🌐 Step 4: Opening browser...${NC}"

DASHBOARD_URL="http://localhost:3227"

# Try to open browser based on platform
case "$(uname -s)" in
   Darwin*)    open "$DASHBOARD_URL" ;;
   Linux*)     xdg-open "$DASHBOARD_URL" ;;
   CYGWIN*|MINGW*|MSYS*) start "$DASHBOARD_URL" ;;
   *)          echo -e "${YELLOW}⚠️ Cannot auto-open browser on this platform${NC}" ;;
esac

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Browser opened to $DASHBOARD_URL${NC}"
else
    echo -e "${YELLOW}⚠️ Auto-open failed, please navigate to: $DASHBOARD_URL${NC}"
fi

# Step 5: Run verification searches
echo -e "${BLUE}🔍 Step 5: Running verification searches...${NC}"

sleep 2

echo "🔎 Searching for 'performance'..."
bun run src/nexus/core/dashboard.ts --search "performance" 2>/dev/null || echo "Search failed"

sleep 1

echo "🔎 Searching for 'apple_id'..."
bun run src/nexus/core/dashboard.ts --search "apple_id" 2>/dev/null || echo "Search failed"

sleep 1

echo "🔎 Searching for 'security'..."
bun run src/nexus/core/dashboard.ts --search "security" 2>/dev/null || echo "Search failed"

# Success message
echo -e "${GREEN}✅ Citadel Dashboard Workflow completed successfully!${NC}"
echo -e "${GREEN}🎊 Dashboard is running at: $DASHBOARD_URL${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop the dashboard server${NC}"

# Keep script running and handle cleanup
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping dashboard server...${NC}"
    kill $DASHBOARD_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup completed${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for the dashboard process
wait $DASHBOARD_PID
