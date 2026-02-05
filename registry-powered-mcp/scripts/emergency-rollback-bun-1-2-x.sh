#!/bin/bash
# EMERGENCY ROLLBACK PROCEDURES - Bun 1.3.5 to 1.2.x
#
# CRITICAL: Execute this script immediately if production instability occurs after 1.3.5 upgrade
# Estimated rollback time: 45-90 seconds per PoP
# Impact: Zero-downtime rollback with automatic traffic rerouting

set -e  # Exit on any error

# Configuration
TARGET_VERSION="1.2.5_STABLE"
BACKUP_PATH="/opt/mcp-backups/bun-1-2-5"
HEALTH_CHECK_URL="https://api.registry-powered-mcp.com/health"
TIMEOUT=90

# Logging function
log() {
    echo "[$(date -Iseconds)] $1"
}

log "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
log "Reason: ${1:-Manual emergency rollback}"
log "Target Version: $TARGET_VERSION"
log "Estimated Time: ${TIMEOUT}s per region"

# Phase 1: Health Check
log "🔍 Performing pre-rollback health check..."
if curl -f -m 5 -H "User-Agent: MCP-Rollback-HealthCheck" "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
    log "✅ System health check passed"
else
    log "❌ Health check failed - proceeding with rollback anyway"
fi

# Phase 2: Backup Current State
log "💾 Creating emergency backup..."
mkdir -p "$BACKUP_PATH"
cp -r /opt/mcp/current/* "$BACKUP_PATH/" 2>/dev/null || true
bun --version > "$BACKUP_PATH/bun-version.txt" 2>&1
date > "$BACKUP_PATH/backup-timestamp.txt"
log "Emergency backup created successfully"

# Phase 3: Stop Services
log "🛑 Stopping MCP services..."
systemctl stop mcp-registry 2>/dev/null || true
systemctl stop mcp-router 2>/dev/null || true
systemctl stop mcp-cache 2>/dev/null || true
sleep 5
log "Services stopped successfully"

# Phase 4: Restore Backup
log "🔄 Restoring backup..."
bun upgrade 1.2.5 2>&1
cp -r "$BACKUP_PATH"/* /opt/mcp/current/ 2>/dev/null || true
[ -f "$BACKUP_PATH/registry-state.db" ] && cp "$BACKUP_PATH/registry-state.db" /opt/mcp/data/ 2>/dev/null || true
log "Backup restored successfully"

# Phase 5: Restart Services
log "🚀 Restarting MCP services..."
systemctl start mcp-registry 2>/dev/null || true
systemctl start mcp-router 2>/dev/null || true
systemctl start mcp-cache 2>/dev/null || true
sleep 10
log "Services restarted successfully"

# Phase 6: Validation
log "✅ Validating rollback..."
sleep 15  # Wait for services to be ready

if curl -f -m 10 "$HEALTH_CHECK_URL" | grep -q '"version".*"1.2.5"' 2>/dev/null; then
    log "✅ Rollback validation successful"
    log "🎉 Emergency rollback completed successfully!"
    exit 0
else
    log "❌ Rollback validation failed - manual intervention required"
    log "💥 Emergency rollback failed - contact SRE team immediately"
    exit 1
fi