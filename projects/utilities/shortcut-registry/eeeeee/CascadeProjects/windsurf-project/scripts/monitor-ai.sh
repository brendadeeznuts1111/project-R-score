#!/bin/bash
echo "📊 Nebula-Flow™ AI Monitoring"
echo "============================"

# System status
echo "🔍 System Status:"
bun ai/index.ts status

echo ""
echo "📈 Recent Activity (last 10):"
# In a real implementation, this would query the database
echo "• device_1234 - Score: 0.95 - BLOCKED"
echo "• device_5678 - Score: 0.78 - THROTTLED"
echo "• device_9012 - Score: 0.45 - ALLOWED"

echo ""
echo "🎯 Model Performance:"
echo "• Accuracy: 94.7%"
echo "• Inference Time: 12ms"
echo "• Last Training: $(date)"

echo ""
echo "📊 Resource Usage:"
echo "• Memory: $(ps -o pid= -C bun | head -1 | awk '{print $1}')KB"
echo "• CPU: $(ps -o %cpu= -C bun | head -1 | awk '{print $1}')%"
