#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# FactoryWager Complete Enhanced Workflow v2.0
# Orchestrates the full deployment pipeline with validation, release, and rollout
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WORKFLOW_ID="workflow-$(date +%Y%m%d-%H%M%S)"
LOG_FILE=".factory-wager/logs/${WORKFLOW_ID}.log"
METRICS_FILE=".factory-wager/metrics/${WORKFLOW_ID}.json"

# Create directories
mkdir -p .factory-wager/logs .factory-wager/metrics .factory-wager/reports

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${CYAN}ℹ️ $1${NC}" | tee -a "$LOG_FILE"
}

phase() {
    echo -e "\n${PURPLE}📍 Phase $1: $2${NC}" | tee -a "$LOG_FILE"
    echo "================================================================================" | tee -a "$LOG_FILE"
}

# Health check function
health_check() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    log "Checking $service health at $url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            success "$service is healthy (attempt $attempt)"
            return 0
        fi
        
        warning "$service not ready (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    error "$service failed to become healthy after $max_attempts attempts"
    return 1
}

# Metrics collection
collect_metrics() {
    local phase=$1
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    local metrics=$(cat <<EOF
{
  "workflow_id": "$WORKFLOW_ID",
  "phase": "$phase",
  "timestamp": "$timestamp",
  "enhanced_rollout": $(curl -s http://localhost:3002/status 2>/dev/null || echo '{"health": 0}'),
  "simple_rollout": $(curl -s http://localhost:3003/status 2>/dev/null || echo '{"health": 0}'),
  "system_health": $(curl -s http://localhost:3003/health 2>/dev/null || echo '{"health": 0}')
}
EOF
)
    
    echo "$metrics" >> "$METRICS_FILE"
    log "Metrics collected for phase: $phase"
}

# Main workflow execution
main() {
    log "🚀 FactoryWager Complete Enhanced Workflow v2.0 Started"
    log "Workflow ID: $WORKFLOW_ID"
    log "Log file: $LOG_FILE"
    log "Metrics file: $METRICS_FILE"
    
    # Initialize metrics file
    echo "[" > "$METRICS_FILE"
    
    # Phase 1: Environment Validation
    phase "1" "Environment Validation"
    log "Validating Bun runtime and dependencies..."
    
    if ! command -v bun &> /dev/null; then
        error "Bun runtime not found. Please install Bun v1.3.8+"
        exit 1
    fi
    
    local bun_version=$(bun --version)
    success "Bun runtime found: $bun_version"
    
    # Check configuration files
    if [ ! -f "config.yaml" ]; then
        warning "config.yaml not found, creating default configuration..."
        cat > config.yaml << EOF
# FactoryWager Configuration
app:
  name: "factory-wager-enhanced"
  version: "2.0.0"
  environment: "production"

deployment:
  strategy: "canary"
  auto_approve: true
  auto_fix: true

monitoring:
  enabled: true
  port: 3002
  simple_port: 3003
EOF
    fi
    
    success "Configuration validated"
    collect_metrics "validation"
    
    # Phase 2: Enhanced Release with Validation
    phase "2" "Enhanced Release with AI Validation"
    log "Starting enhanced release orchestrator..."
    
    log "Executing: bun run \".factory-wager/enhanced/fw-release-enhanced.ts\" --auto-approve --auto-fix"
    
    if bun run ".factory-wager/enhanced/fw-release-enhanced.ts" --auto-approve --auto-fix 2>&1 | tee -a "$LOG_FILE"; then
        success "Enhanced release completed successfully"
    else
        local exit_code=${PIPESTATUS[0]}
        if [ $exit_code -eq 1 ]; then
            warning "Enhanced release completed with warnings (auto-fixable issues)"
        else
            error "Enhanced release failed with exit code: $exit_code"
            exit 1
        fi
    fi
    
    # Wait a moment for services to stabilize
    sleep 3
    collect_metrics "release"
    
    # Phase 3: Service Health Verification
    phase "3" "Service Health Verification"
    log "Verifying enhanced rollout service health..."
    
    if health_check "http://localhost:3002/status" "Enhanced Rollout Service"; then
        success "Enhanced rollout service is healthy"
    else
        error "Enhanced rollout service failed to start"
        exit 1
    fi
    
    log "Verifying simple rollout service health..."
    
    if health_check "http://localhost:3003/status" "Simple Rollout Service"; then
        success "Simple rollout service is healthy"
    else
        error "Simple rollout service failed to start"
        exit 1
    fi
    
    collect_metrics "health_verification"
    
    # Phase 4: Progressive Rollout Initiation
    phase "4" "Progressive Rollout Initiation"
    log "Starting progressive rollout scheduler..."
    
    # Start simple rollout in background
    log "Executing: bun run \".factory-wager/enhanced/simple-rollout-scheduler.ts\" start"
    bun run ".factory-wager/enhanced/simple-rollout-scheduler.ts" start > /dev/null 2>&1 &
    local simple_pid=$!
    
    # Give it time to start
    sleep 2
    
    if health_check "http://localhost:3003/events" "Simple Rollout SSE"; then
        success "Simple rollout scheduler started successfully (PID: $simple_pid)"
        echo $simple_pid > ".factory-wager/pids/simple-rollout.pid"
    else
        error "Simple rollout scheduler failed to start"
        exit 1
    fi
    
    collect_metrics "rollout_initiation"
    
    # Phase 5: Monitoring Dashboard
    phase "5" "Real-time Monitoring Dashboard"
    log "Starting monitoring dashboard..."
    
    echo -e "\n${CYAN}📊 Monitoring Dashboard${NC}"
    echo "==============================="
    echo -e "${BLUE}Enhanced Rollout:${NC}"
    echo "  Status:   http://localhost:3002/status"
    echo "  Events:   http://localhost:3002/events"
    echo -e "${BLUE}Simple Rollout:${NC}"
    echo "  Status:   http://localhost:3003/status"
    echo "  Events:   http://localhost:3003/events"
    echo "  Health:   http://localhost:3003/health"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  Watch enhanced:  watch -n 2 'curl -s http://localhost:3002/status | jq .'"
    echo "  Watch simple:    watch -n 2 'curl -s http://localhost:3003/status | jq .'"
    echo "  Stop workflow:   kill $simple_pid"
    echo ""
    
    # Initial metrics display
    log "Initial rollout metrics:"
    curl -s http://localhost:3002/status 2>/dev/null | jq -r '.currentPhase // "Unknown"' | sed 's/^/  Enhanced: /' | tee -a "$LOG_FILE"
    curl -s http://localhost:3003/status 2>/dev/null | jq -r '.phase // "Unknown"' | sed 's/^/  Simple:   /' | tee -a "$LOG_FILE"
    
    collect_metrics "monitoring"
    
    # Phase 6: Continuous Monitoring
    phase "6" "Continuous Monitoring"
    log "Entering continuous monitoring mode..."
    log "Press Ctrl+C to stop the workflow gracefully"
    
    # Set up graceful shutdown
    trap 'shutdown' INT TERM
    
    # Monitor for 5 minutes (300 seconds) or until interrupted
    local monitor_duration=300
    local elapsed=0
    
    while [ $elapsed -lt $monitor_duration ]; do
        sleep 10
        ((elapsed+=10))
        
        # Collect metrics every 30 seconds
        if [ $((elapsed % 30)) -eq 0 ]; then
            collect_metrics "monitoring_${elapsed}s"
            
            # Show brief status
            local enhanced_health=$(curl -s http://localhost:3002/status 2>/dev/null | jq -r '.health // 0' 2>/dev/null || echo "0")
            local simple_health=$(curl -s http://localhost:3003/status 2>/dev/null | jq -r '.health // 0' 2>/dev/null || echo "0")
            
            info "Health Check - Enhanced: ${enhanced_health}% | Simple: ${simple_health}%"
        fi
    done
    
    success "Monitoring period completed"
    
    # Phase 7: Workflow Completion
    phase "7" "Workflow Completion"
    log "Generating final report..."
    
    # Close metrics array
    echo "]" >> "$METRICS_FILE"
    
    # Generate summary report
    cat > ".factory-wager/reports/${WORKFLOW_ID}-summary.md" << EOF
# FactoryWager Enhanced Workflow Summary

**Workflow ID:** $WORKFLOW_ID  
**Started:** $(date)  
**Duration:** $elapsed seconds  
**Status:** Completed

## Phases Executed
1. ✅ Environment Validation
2. ✅ Enhanced Release with AI Validation
3. ✅ Service Health Verification
4. ✅ Progressive Rollout Initiation
5. ✅ Real-time Monitoring Dashboard
6. ✅ Continuous Monitoring
7. ✅ Workflow Completion

## Services Running
- Enhanced Rollout: http://localhost:3002
- Simple Rollout: http://localhost:3003

## Artifacts Generated
- Log File: $LOG_FILE
- Metrics File: $METRICS_FILE
- Configuration: config.yaml

## Next Steps
- Monitor rollout progress via dashboard URLs
- Check logs for any issues
- Scale up as needed

---
*Generated by FactoryWager Enhanced Workflow v2.0*
EOF
    
    success "Workflow completed successfully!"
    success "Summary report: .factory-wager/reports/${WORKFLOW_ID}-summary.md"
    success "Log file: $LOG_FILE"
    success "Metrics file: $METRICS_FILE"
    
    echo -e "\n${GREEN}🎉 FactoryWager Enhanced Workflow Complete!${NC}"
    echo -e "${CYAN}Services are running and can be monitored via the dashboard URLs above.${NC}"
}

# Graceful shutdown function
shutdown() {
    echo -e "\n${YELLOW}🛑 Gracefully shutting down workflow...${NC}" | tee -a "$LOG_FILE"
    
    # Stop simple rollout scheduler
    if [ -f ".factory-wager/pids/simple-rollout.pid" ]; then
        local pid=$(cat ".factory-wager/pids/simple-rollout.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            success "Simple rollout scheduler stopped (PID: $pid)"
        fi
        rm -f ".factory-wager/pids/simple-rollout.pid"
    fi
    
    # Final metrics collection
    collect_metrics "shutdown"
    
    # Close metrics array if not already closed
    if [ -f "$METRICS_FILE" ]; then
        if ! tail -1 "$METRICS_FILE" | grep -q "]"; then
            echo "]" >> "$METRICS_FILE"
        fi
    fi
    
    success "Workflow shutdown complete"
    exit 0
}

# Help function
show_help() {
    echo "FactoryWager Complete Enhanced Workflow v2.0"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -q, --quick    Quick mode (skip health checks)"
    echo "  -m, --monitor  Monitor only (start dashboard)"
    echo ""
    echo "Examples:"
    echo "  $0              # Run complete workflow"
    echo "  $0 --quick      # Quick mode"
    echo "  $0 --monitor    # Start monitoring dashboard only"
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -q|--quick)
        log "Running in quick mode..."
        # Skip health checks and run minimal workflow
        bun run ".factory-wager/enhanced/fw-release-enhanced.ts" --auto-approve --auto-fix
        bun run ".factory-wager/enhanced/simple-rollout-scheduler.ts" start &
        echo "Services started. Monitor with:"
        echo "  curl http://localhost:3002/status"
        echo "  curl http://localhost:3003/status"
        ;;
    -m|--monitor)
        log "Starting monitoring dashboard only..."
        echo "Enhanced Rollout: http://localhost:3002/status"
        echo "Simple Rollout:  http://localhost:3003/status"
        echo "Health Check:    http://localhost:3003/health"
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        while true; do
            sleep 10
            local enhanced_health=$(curl -s http://localhost:3002/status 2>/dev/null | jq -r '.health // 0' 2>/dev/null || echo "0")
            local simple_health=$(curl -s http://localhost:3003/status 2>/dev/null | jq -r '.health // 0' 2>/dev/null || echo "0")
            echo "$(date '+%H:%M:%S') - Enhanced: ${enhanced_health}% | Simple: ${simple_health}%"
        done
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
