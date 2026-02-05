#!/bin/bash
# QUICK ACCESS SCRIPT - Always Available Endpoints

echo "🚀 Apple ID System - Quick Access"
echo "=================================="

# Primary URLs
echo "📤 Upload: https://apple.factory-wager.com/up"
echo "📥 Download: https://apple.factory-wager.com/dl"
echo "📊 Status: https://apple.factory-wager.com/status"
echo "⚙️ Admin: https://apple.factory-wager.com/admin"

# Health Check
echo ""
echo "🏥 Checking system health..."
curl -s "https://api.apple.factory-wager.com/v1/health" | jq .

# Quick Upload Test
echo ""
echo "📤 Quick upload test:"
echo "curl -X POST https://api.apple.factory-wager.com/v1/upload -F 'file=@test.txt'"

echo ""
echo "✅ All systems ready and accessible!"
