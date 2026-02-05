#!/usr/bin/env bash
# scripts/deploy-hypertick.sh
# HyperTick v1.3.3 Deployment Script

set -e

echo "🚀 Deploying HyperTick v1.3.3 - High-Frequency Analysis Subsystem"
echo "================================================================"

# Configuration
ENVIRONMENT="${1:-production}"
VERSION="1.3.3"
PROFILE_DIR="./profiles/hypertick"
DATA_DIR="./data/tickdb"
CONCURRENCY=4
MEMORY_LIMIT="512MB"

echo "🔧 Environment: $ENVIRONMENT"
echo "📦 Version: $VERSION"
echo "💾 Data directory: $DATA_DIR"

# Create directories
mkdir -p "$PROFILE_DIR"
mkdir -p "$DATA_DIR"

# Set environment variables
export BUN_HYPERTICK_ENVIRONMENT="$ENVIRONMENT"
export BUN_HYPERTICK_VERSION="$VERSION"
export BUN_HYPERTICK_DATA_DIR="$DATA_DIR"
export BUN_MAX_MEMORY_USAGE="$MEMORY_LIMIT"
export BUN_JSC_useConcurrentJIT="true"
export BUN_JSC_useJIT="true"

echo "📊 Starting CPU profiling session..."
echo "🕐 Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# Run with CPU profiling enabled
bun --cpu-prof \
    --cpu-prof-name="hypertick-${ENVIRONMENT}-$(date +%s).cpuprofile" \
    --cpu-prof-dir="$PROFILE_DIR" \
    --env-file=".env.$ENVIRONMENT" \
    src/tick-analysis/main.ts \
    --concurrency="$CONCURRENCY" \
    --memory-limit="$MEMORY_LIMIT" \
    --data-dir="$DATA_DIR" &

# Capture PID for monitoring
HYPERTICK_PID=$!
echo "🔄 HyperTick process started with PID: $HYPERTICK_PID"

# Monitor performance
sleep 5
echo "📈 Performance monitoring started..."

# Health check loop
for i in {1..30}; do
    sleep 2

    # Check if process is still running
    if ! kill -0 $HYPERTICK_PID 2>/dev/null; then
        echo "❌ HyperTick process died unexpectedly"
        exit 1
    fi

    # Health check API
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1.3.3/health || echo "000")

    if [ "$RESPONSE" = "200" ]; then
        echo "✅ Health check passed ($i/30)"

        # Get detailed stats
        STATS=$(curl -s http://localhost:3000/api/v1.3.3/system/stats || echo "{}")
        echo "📊 Current stats:"
        echo "$STATS" | jq '.' || echo "$STATS"

        break
    elif [ "$i" -eq 30 ]; then
        echo "❌ Health check failed after 60 seconds"
        kill $HYPERTICK_PID 2>/dev/null || true
        exit 1
    else
        echo "⏳ Waiting for health check... ($i/30)"
    fi
done

echo "🎉 HyperTick v$VERSION deployed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "---------------------"
echo "• API Endpoint: http://localhost:3000"
echo "• CPU Profile: $PROFILE_DIR/hypertick-*.cpuprofile"
echo "• Database: $DATA_DIR/tick.db"
echo "• Memory Limit: $MEMORY_LIMIT"
echo "• Concurrency: $CONCURRENCY"
echo ""
echo "🔍 Monitoring Commands:"
echo "----------------------"
echo "• Live ticks: curl http://localhost:3000/api/v1.3.3/ticks/NFL-2025-001-SPREAD/recent"
echo "• Correlation: curl http://localhost:3000/api/v1.3.3/ticks/correlation/DK-NFL-SPREAD/FD-NFL-SPREAD"
echo "• Arbitrage: curl http://localhost:3000/api/v1.3.3/arbitrage/micro/NBA-2025-001"
echo "• Health: curl http://localhost:3000/api/v1.3.3/health?detail=full"

# Wait for process
wait $HYPERTICK_PID
