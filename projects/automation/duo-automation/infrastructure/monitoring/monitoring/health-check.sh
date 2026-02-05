#!/bin/bash
# monitoring/health-check.sh
# Health monitoring script for v2.01.05

echo "🏥 Duo Automation Health Check - $(date)"
echo "======================================"

# Check self-heal functionality
if bun run scripts/self-heal.ts --dry-run --dir=./logs > /dev/null 2>&1; then
    echo "✅ Self-Heal Script: OPERATIONAL"
else
    echo "❌ Self-Heal Script: ERROR"
fi

# Check metrics collection
if [ -f "./data/current-metrics.json" ]; then
    echo "✅ Metrics Collection: ACTIVE"
    echo "   📊 Last update: $(date -r ./data/current-metrics.json)"
else
    echo "⚠️  Metrics Collection: NOT FOUND"
fi

# Check disk space
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "✅ Disk Usage: ${DISK_USAGE}% (OK)"
else
    echo "⚠️  Disk Usage: ${DISK_USAGE}% (HIGH)"
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}' 2>/dev/null || echo "0")
if [ "$MEMORY_USAGE" -lt 80 ]; then
    echo "✅ Memory Usage: ${MEMORY_USAGE}% (OK)"
else
    echo "⚠️  Memory Usage: ${MEMORY_USAGE}% (HIGH)"
fi

# Check log files
if [ -d "./logs" ]; then
    LOG_COUNT=$(find ./logs -name "*.log" | wc -l)
    echo "✅ Log Directory: $LOG_COUNT log files"
else
    echo "⚠️  Log Directory: NOT FOUND"
fi

# Check backup files
BACKUP_COUNT=$(find ./logs -name "*.backup.*" 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "✅ Backup Files: $BACKUP_COUNT backups created"
else
    echo "ℹ️  Backup Files: None found"
fi

echo "======================================"
echo "Health check completed at $(date)"
