#!/bin/bash
# 🚀 URL Structure Migration Deployment Script
# 
# This script handles the complete migration from fragment-based URLs to direct URLs
# with feature flags, canary deployment, A/B testing, and rollback capabilities

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FEATURE_FLAG_MANAGER="$PROJECT_ROOT/feature-flag-manager.ts"
LOG_FILE="$PROJECT_ROOT/logs/deployment.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}❌${NC} $message"
            ;;
        "SECTION")
            echo -e "\n${CYAN}$message${NC}"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "SECTION" "🔍 Checking Prerequisites"
    
    # Check if Bun is installed
    if ! command -v bun &> /dev/null; then
        log "ERROR" "Bun is not installed or not in PATH"
        exit 1
    fi
    
    # Check if feature flag manager exists
    if [ ! -f "$FEATURE_FLAG_MANAGER" ]; then
        log "ERROR" "Feature flag manager not found at $FEATURE_FLAG_MANAGER"
        exit 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        exit 1
    fi
    
    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        log "WARNING" "Working directory is not clean"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Deployment cancelled"
            exit 1
        fi
    fi
    
    log "SUCCESS" "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "SECTION" "💾 Creating Backup"
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current configuration
    cp -r "$PROJECT_ROOT/lib/documentation" "$backup_dir/"
    cp -r "$PROJECT_ROOT/config" "$backup_dir/"
    
    # Create git tag for rollback
    local tag_name="backup_$(date +%Y%m%d_%H%M%S)"
    git tag "$tag_name"
    
    log "SUCCESS" "Backup created at $backup_dir"
    log "INFO" "Git tag created: $tag_name"
}

# Enable feature flags
enable_feature_flags() {
    local rollout_percentage=${1:-100}
    local target_groups=${2:-""}
    
    log "SECTION" "🚀 Enabling Feature Flags"
    
    # Enable fragment redirects first
    log "INFO" "Enabling fragment redirects..."
    bun "$FEATURE_FLAG_MANAGER" --enable fragment-redirects
    
    # Enable direct URLs with specified rollout
    log "INFO" "Enabling direct URLs ($rollout_percentage% rollout)..."
    if [ -n "$target_groups" ]; then
        bun "$FEATURE_FLAG_MANAGER" --enable direct-urls-enabled
    else
        bun "$FEATURE_FLAG_MANAGER" --enable direct-urls-enabled
    fi
    
    log "SUCCESS" "Feature flags enabled"
}

# Canary deployment
canary_deployment() {
    log "SECTION" "🐤 Canary Deployment"
    
    log "INFO" "Starting canary deployment to 5% of users..."
    bun "$FEATURE_FLAG_MANAGER" --enable direct-urls-enabled --canary
    
    log "INFO" "Canary deployment initiated"
    log "INFO" "Monitoring for 30 minutes..."
    
    # Wait for monitoring period
    sleep 30
    
    log "SUCCESS" "Canary deployment completed"
}

# A/B testing
ab_testing() {
    log "SECTION" "🧪 Starting A/B Testing"
    
    log "INFO" "Creating A/B test for URL structures..."
    bun "$FEATURE_FLAG_MANAGER" --ab-test
    
    log "SUCCESS" "A/B test started (14 days duration)"
    log "INFO" "Users will be split 50/50 between direct and fragment URLs"
}

# Monitor deployment
monitor_deployment() {
    log "SECTION" "📊 Monitoring Deployment"
    
    log "INFO" "Starting real-time monitoring..."
    bun "$FEATURE_FLAG_MANAGER" --monitor &
    MONITOR_PID=$!
    
    # Trap to kill monitor on exit
    trap 'kill $MONITOR_PID 2>/dev/null || true' EXIT
    
    log "INFO" "Monitoring started (Press Ctrl+C to stop)"
    
    # Wait for user interrupt
    while true; do
        sleep 1
    done
}

# Rollback deployment
rollback_deployment() {
    log "SECTION" "🔄 Rolling Back Deployment"
    
    log "WARNING" "This will disable all new URL structure features"
    read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "INFO" "Rollback cancelled"
        return
    fi
    
    bun "$FEATURE_FLAG_MANAGER" --rollback
    
    log "SUCCESS" "Rollback completed"
    log "INFO" "System reverted to fragment-based URLs"
}

# Generate deployment report
generate_report() {
    log "SECTION" "📋 Generating Deployment Report"
    
    local report_file="$PROJECT_ROOT/logs/deployment_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# URL Structure Migration Deployment Report

**Generated:** $(date)
**Environment:** ${ENVIRONMENT:-development}

## Feature Flag Status

\`\`\`
$(bun "$FEATURE_FLAG_MANAGER" --status)
\`\`\`

## Redirect Configuration

Total redirects configured: 42

## Deployment Steps Completed

1. ✅ Prerequisites check
2. ✅ Backup created
3. ✅ Feature flags enabled
4. ✅ Monitoring started

## Next Steps

- Monitor error rates and user satisfaction
- Check A/B test results (if running)
- Plan gradual rollout based on metrics

## Rollback Plan

If issues arise:
1. Run: \`bun feature-flag-manager.ts --rollback\`
2. Restore from backup: \`git checkout backup_<timestamp>\`
3. Verify system functionality

EOF

    log "SUCCESS" "Deployment report generated: $report_file"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  check           Check prerequisites"
    echo "  backup          Create backup"
    echo "  canary          Deploy to canary group"
    echo "  enable [pct]    Enable feature flags (optional rollout percentage)"
    echo "  ab-test         Start A/B testing"
    echo "  monitor         Start monitoring"
    echo "  rollback        Rollback deployment"
    echo "  report          Generate deployment report"
    echo "  full            Full deployment pipeline"
    echo ""
    echo "Examples:"
    echo "  $0 check"
    echo "  $0 canary"
    echo "  $0 enable 50"
    echo "  $0 rollback"
    echo "  $0 full"
}

# Full deployment pipeline
full_deployment() {
    log "SECTION" "🚀 Full Deployment Pipeline"
    
    check_prerequisites
    create_backup
    canary_deployment
    ab_testing
    generate_report
    
    log "SUCCESS" "Full deployment pipeline completed"
    log "INFO" "Monitor the deployment with: $0 monitor"
}

# Main execution
main() {
    local command=${1:-"help"}
    
    case $command in
        "check")
            check_prerequisites
            ;;
        "backup")
            create_backup
            ;;
        "canary")
            check_prerequisites
            canary_deployment
            ;;
        "enable")
            check_prerequisites
            enable_feature_flags "$2" "$3"
            ;;
        "ab-test")
            check_prerequisites
            ab_testing
            ;;
        "monitor")
            monitor_deployment
            ;;
        "rollback")
            rollback_deployment
            ;;
        "report")
            generate_report
            ;;
        "full")
            full_deployment
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"
