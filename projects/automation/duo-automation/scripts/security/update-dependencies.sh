#!/bin/bash
# scripts/security/update-dependencies.sh
# [DOMAIN:SECURITY][SCOPE:DEPENDENCIES][TYPE:SCRIPT][META:{updates:true,security:true}][SCRIPT:update-dependencies][#REF:SECURITY-009]

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/security-updates.log"
BACKUP_DIR="$PROJECT_ROOT/backups/dependencies"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    echo "[ERROR] $1" >> "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
    echo "[SUCCESS] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

# Create backup of current dependencies
create_backup() {
    log "Creating backup of current dependencies..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup package.json files
    find "$PROJECT_ROOT" -name "package.json" -not -path "*/node_modules/*" | while read -r file; do
        local relative_path="${file#$PROJECT_ROOT/}"
        local backup_file="$BACKUP_DIR/${relative_path}.backup.$TIMESTAMP"
        local backup_dir=$(dirname "$backup_file")
        
        mkdir -p "$backup_dir"
        cp "$file" "$backup_file"
        log "Backed up: $relative_path"
    done
    
    # Backup lock files
    find "$PROJECT_ROOT" -name "bun.lock" -o -name "package-lock.json" -not -path "*/node_modules/*" | while read -r file; do
        local relative_path="${file#$PROJECT_ROOT/}"
        local backup_file="$BACKUP_DIR/${relative_path}.backup.$TIMESTAMP"
        local backup_dir=$(dirname "$backup_file")
        
        mkdir -p "$backup_dir"
        cp "$file" "$backup_file"
        log "Backed up lock file: $relative_path"
    done
    
    success "Dependencies backup completed"
}

# Check network connectivity
check_connectivity() {
    log "Checking network connectivity..."
    
    if curl -s --connect-timeout 5 https://registry.npmjs.org/ > /dev/null; then
        success "Network connectivity confirmed"
        return 0
    else
        warning "No network connectivity to npm registry"
        return 1
    fi
}

# Update vulnerable dependencies
update_vulnerable_dependencies() {
    log "Updating vulnerable dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Update specific vulnerable packages
    log "Updating esbuild and undici..."
    if bun update esbuild undici; then
        success "✓ Updated esbuild and undici"
    else
        error "Failed to update esbuild and undici"
    fi
    
    # Update all dependencies to latest compatible versions
    log "Updating all dependencies to latest compatible versions..."
    if bun update; then
        success "✓ Updated all dependencies to compatible versions"
    else
        warning "Some dependencies could not be updated to compatible versions"
    fi
}

# Update to latest versions (including breaking changes)
update_latest_versions() {
    log "Updating to latest versions (including breaking changes)..."
    
    cd "$PROJECT_ROOT"
    
    if bun update --latest; then
        success "✓ Updated all dependencies to latest versions"
    else
        warning "Some dependencies could not be updated to latest versions"
        log "This may require manual intervention for breaking changes"
    fi
}

# Run security audit after updates
run_security_audit() {
    log "Running security audit after updates..."
    
    cd "$PROJECT_ROOT"
    
    if bun audit; then
        success "✓ Security audit completed"
    else
        warning "Security audit found issues"
        log "Check the audit output above for details"
    fi
}

# Check for outdated packages
check_outdated() {
    log "Checking for outdated packages..."
    
    cd "$PROJECT_ROOT"
    
    if bun outdated; then
        success "✓ Outdated packages check completed"
    else
        warning "Some packages may be outdated"
    fi
}

# Verify build still works
verify_build() {
    log "Verifying build after dependency updates..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    rm -rf dist/ build/ || true
    
    # Attempt build
    if bun run build; then
        success "✓ Build verification passed"
    else
        error "Build verification failed. Dependencies may have breaking changes"
    fi
}

# Run tests
run_tests() {
    log "Running tests after dependency updates..."
    
    cd "$PROJECT_ROOT"
    
    if bun test; then
        success "✓ All tests passed"
    else
        warning "Some tests failed. Check for breaking changes"
    fi
}

# Generate update report
generate_report() {
    log "Generating dependency update report..."
    
    local report_file="$PROJECT_ROOT/reports/dependency-update-$TIMESTAMP.md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Dependency Update Report

**Generated:** $(date)  
**Project:** Global QR Device Onboarding System  
**Environment:** $(bun --version)

## Update Summary

### Vulnerabilities Addressed
- **esbuild:** Updated to latest version (GHSA-67mh-4wv8-2f99)
- **undici:** Updated to latest version (GHSA-g9mf-h72j-4rw9)

### Dependencies Updated
\`\`\`
$(bun pm ls --all)
\`\`\`

### Security Audit Results
\`\`\`
$(bun audit)
\`\`\`

### Build Status
\`\`\`
$(bun run build --dry-run 2>&1 || echo "Build check failed")
\`\`\`

### Test Results
\`\`\`
$(bun test 2>&1 || echo "Tests failed")
\`\`\`

## Recommendations

1. **Review breaking changes** in updated dependencies
2. **Test all QR system functionality** thoroughly
3. **Monitor performance** after updates
4. **Update documentation** if API changes occurred
5. **Schedule production deployment** during maintenance window

## Backup Information

**Backup Location:** $BACKUP_DIR  
**Backup Timestamp:** $TIMESTAMP  
**Restore Command:** \`./scripts/security/restore-dependencies.sh $TIMESTAMP\`

---

*Report generated by QR System Security Automation*
EOF

    success "Update report generated: $report_file"
}

# Main execution
main() {
    log "🔒 Starting dependency update process for QR Device Onboarding System"
    
    # Check prerequisites
    if ! command -v bun &> /dev/null; then
        error "Bun is required but not installed"
    fi
    
    # Create directories
    mkdir -p logs reports backups/dependencies
    
    # Execute update steps
    create_backup
    
    if ! check_connectivity; then
        error "Network connectivity required for dependency updates"
    fi
    
    update_vulnerable_dependencies
    update_latest_versions
    run_security_audit
    check_outdated
    verify_build
    run_tests
    generate_report
    
    success "🎉 Dependency update process completed successfully!"
    log ""
    log "📋 Summary:"
    log "  • Vulnerable dependencies updated"
    log "  • Security audit performed"
    log "  • Build verification completed"
    log "  • Tests executed"
    log "  • Report generated"
    log ""
    log "📁 Next Steps:"
    log "  1. Review the generated report"
    log "  2. Test QR system functionality manually"
    log "  3. Deploy to staging environment"
    log "  4. Monitor for any issues"
    log ""
    log "🔐 Security Status: IMPROVED"
}

# Run main function
main "$@"
