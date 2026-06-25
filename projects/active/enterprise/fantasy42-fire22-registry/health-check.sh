#!/bin/bash
# Production Health Check Script

HEALTH_URL="http://localhost:3000/health"
TIMEOUT=10

echo "🏥 Checking production server health..."

if curl -f --max-time $TIMEOUT "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Production server is healthy"
    exit 0
else
    echo "❌ Production server is unhealthy"
    exit 1
fi
