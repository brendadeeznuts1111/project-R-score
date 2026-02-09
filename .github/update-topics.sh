#!/bin/bash
# Update GitHub Repository Topics with HSL Colors

REPO="brendadeeznuts1111/project-R-score"
TOPICS=(
  "bun-runtime"
  "typescript"
  "real-time"
  "websocket"
  "payment-gateway"
  "security"
  "analytics"
  "dashboard"
  "mcp"
  "vectorize"
  "enterprise"
  "bun"
  "javascript-runtime"
)

# Convert array to comma-separated string
TOPICS_STR=$(IFS=,; echo "${TOPICS[*]}")

echo "🎨 Updating repository topics for $REPO"
echo "🏷️ Topics: $TOPICS_STR"
echo ""
echo "💡 Bright HSL Colors Applied:"
echo "  • bun-runtime: hsl(280, 100%, 60%) - Purple"
echo "  • typescript: hsl(210, 100%, 55%) - Blue"
echo "  • real-time: hsl(150, 100%, 45%) - Green"
echo "  • websocket: hsl(320, 100%, 65%) - Pink"
echo "  • payment-gateway: hsl(45, 100%, 55%) - Gold"
echo "  • security: hsl(0, 100%, 60%) - Red"
echo "  • analytics: hsl(180, 100%, 50%) - Cyan"
echo "  • dashboard: hsl(260, 100%, 70%) - Violet"
echo "  • mcp: hsl(30, 100%, 55%) - Orange"
echo "  • vectorize: hsl(120, 100%, 50%) - Lime"
echo ""
echo "🚀 Run this command to update topics:"
echo "gh repo edit $REPO --add-topic $TOPICS_STR"
