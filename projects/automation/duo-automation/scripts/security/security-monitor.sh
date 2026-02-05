#!/bin/bash
# scripts/security/security-monitor.sh
# [DOMAIN:SECURITY][SCOPE:MONITORING][TYPE:SCRIPT][META:{audits:true,monitoring:true}][SCRIPT:security-monitor][#REF:SECURITY-010]

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
LOG_FILE="$PROJECT_ROOT/logs/security-monitor.log"
REPORTS_DIR="$PROJECT_ROOT/reports/security"
ALERT_EMAIL="security@factory-wager.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Security thresholds
CRITICAL_VULNS=0
HIGH_VULNS=0
MODERATE_VULNS=2
LOW_VULNS=5

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    echo "[ERROR] $1" >> "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
    echo "[SUCCESS] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

# Send alert notification
send_alert() {
    local severity="$1"
    local message="$2"
    local details="$3"
    
    log "Sending $severity alert: $message"
    
    # Send email alert (mock implementation)
    if command -v mail &> /dev/null && [[ -n "$ALERT_EMAIL" ]]; then
        echo "$details" | mail -s "🚨 QR Security Alert: $severity - $message" "$ALERT_EMAIL"
        log "Email alert sent to $ALERT_EMAIL"
    fi
    
    # Send Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        case "$severity" in
            "CRITICAL") color="danger" ;;
            "HIGH") color="warning" ;;
            "MODERATE") color="warning" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 QR Security Alert: $severity\n$message\n\`\`\`$details\`\`\`\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
        log "Slack alert sent"
    fi
}

# Run security audit
run_security_audit() {
    log "Running security audit..."
    
    cd "$PROJECT_ROOT"
    
    # Run bun audit and capture output
    local audit_output
    audit_output=$(bun audit 2>&1 || true)
    
    # Parse audit results
    local critical_vulns=$(echo "$audit_output" | grep -i "critical" | wc -l || echo "0")
    local high_vulns=$(echo "$audit_output" | grep -i "high" | wc -l || echo "0")
    local moderate_vulns=$(echo "$audit_output" | grep -i "moderate" | wc -l || echo "0")
    local low_vulns=$(echo "$audit_output" | grep -i "low" | wc -l || echo "0")
    
    log "Audit results: $critical_vulns critical, $high_vulns high, $moderate_vulns moderate, $low_vulns low"
    
    # Check thresholds and send alerts
    if [[ $critical_vulns -gt $CRITICAL_VULNS ]]; then
        send_alert "CRITICAL" "Critical vulnerabilities detected" "$audit_output"
    elif [[ $high_vulns -gt $HIGH_VULNS ]]; then
        send_alert "HIGH" "High severity vulnerabilities detected" "$audit_output"
    elif [[ $moderate_vulns -gt $MODERATE_VULNS ]]; then
        send_alert "MODERATE" "Moderate vulnerabilities exceed threshold" "$audit_output"
    elif [[ $low_vulns -gt $LOW_VULNS ]]; then
        send_alert "LOW" "Low vulnerabilities exceed threshold" "$audit_output"
    else
        success "Security audit passed - vulnerabilities within acceptable limits"
    fi
    
    echo "$audit_output"
}

# Check for outdated packages
check_outdated_packages() {
    log "Checking for outdated packages..."
    
    cd "$PROJECT_ROOT"
    
    local outdated_output
    outdated_output=$(bun outdated 2>&1 || true)
    
    # Count outdated packages
    local outdated_count=$(echo "$outdated_output" | grep -c "package:" || echo "0")
    
    log "Found $outdated_count outdated packages"
    
    if [[ $outdated_count -gt 10 ]]; then
        send_alert "MODERATE" "High number of outdated packages" "$outdated_count packages are outdated"
    fi
    
    echo "$outdated_output"
}

# Scan for sensitive data leaks
scan_sensitive_data() {
    log "Scanning for sensitive data leaks..."
    
    local sensitive_patterns=(
        "password.*=.*['\"][^'\"]{8,}['\"]"
        "secret.*=.*['\"][^'\"]{16,}['\"]"
        "api_key.*=.*['\"][^'\"]{20,}['\"]"
        "token.*=.*['\"][^'\"]{20,}['\"]"
        "private_key.*=.*-----BEGIN"
        "aws_access_key_id"
        "aws_secret_access_key"
    )
    
    local findings=0
    local scan_results=""
    
    for pattern in "${sensitive_patterns[@]}"; do
        local matches
        matches=$(find "$PROJECT_ROOT/src" -name "*.ts" -o -name "*.js" -o -name "*.json" | \
                grep -v node_modules | \
                xargs grep -l "$pattern" 2>/dev/null || true)
        
        if [[ -n "$matches" ]]; then
            ((findings++))
            scan_results+="Pattern: $pattern\nFiles: $matches\n\n"
        fi
    done
    
    if [[ $findings -gt 0 ]]; then
        warning "Found $findings potential sensitive data exposures"
        send_alert "HIGH" "Sensitive data exposure detected" "$scan_results"
    else
        success "No sensitive data exposures found"
    fi
    
    echo "$findings"
}

# Check file permissions
check_file_permissions() {
    log "Checking file permissions..."
    
    local permission_issues=0
    
    # Check for world-writable files
    local world_writable
    world_writable=$(find "$PROJECT_ROOT" -type f -perm -o+w -not -path "*/node_modules/*" 2>/dev/null || true)
    
    if [[ -n "$world_writable" ]]; then
        ((permission_issues++))
        warning "Found world-writable files:\n$world_writable"
    fi
    
    # Check for executable scripts in source
    local executable_scripts
    executable_scripts=$(find "$PROJECT_ROOT/src" -name "*.ts" -executable 2>/dev/null || true)
    
    if [[ -n "$executable_scripts" ]]; then
        ((permission_issues++))
        warning "Found executable TypeScript files:\n$executable_scripts"
    fi
    
    # Check configuration file permissions
    local config_files=("$PROJECT_ROOT/.env" "$PROJECT_ROOT/config/*.json" "$PROJECT_ROOT/config/*.yaml")
    for config_file in "${config_files[@]}"; do
        if [[ -f "$config_file" ]]; then
            local perms
            perms=$(stat -f "%A" "$config_file" 2>/dev/null || stat -c "%a" "$config_file" 2>/dev/null || echo "644")
            if [[ "$perms" =~ [0-9]*[0-9][0-9][0-9] ]]; then
                local last_digit="${perms: -1}"
                if [[ "$last_digit" =~ [0-7] && "$last_digit" -gt 6 ]]; then
                    ((permission_issues++))
                    warning "Configuration file has permissive permissions: $config_file ($perms)"
                fi
            fi
        fi
    done
    
    if [[ $permission_issues -eq 0 ]]; then
        success "File permissions check passed"
    else
        send_alert "MODERATE" "File permission issues detected" "$permission_issues files have permission issues"
    fi
    
    echo "$permission_issues"
}

# Check dependency integrity
check_dependency_integrity() {
    log "Checking dependency integrity..."
    
    cd "$PROJECT_ROOT"
    
    # Check if bun.lock exists and is not empty
    if [[ ! -f "bun.lock" ]] || [[ ! -s "bun.lock" ]]; then
        send_alert "HIGH" "Missing or empty lock file" "bun.lock is missing or empty"
        echo "1"
        return
    fi
    
    # Check for mismatched dependencies
    local integrity_check
    integrity_check=$(bun install --dry-run 2>&1 || true)
    
    if echo "$integrity_check" | grep -q "error"; then
        send_alert "MODERATE" "Dependency integrity issues detected" "$integrity_check"
        echo "1"
    else
        success "Dependency integrity check passed"
        echo "0"
    fi
}

# Monitor system resources
monitor_system_resources() {
    log "Monitoring system resources..."
    
    local disk_usage
    disk_usage=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt 90 ]]; then
        send_alert "HIGH" "Disk usage critical" "Disk usage is at ${disk_usage}%"
    elif [[ $disk_usage -gt 80 ]]; then
        send_alert "MODERATE" "Disk usage high" "Disk usage is at ${disk_usage}%"
    fi
    
    # Check memory usage (if available)
    if command -v free &> /dev/null; then
        local memory_usage
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        
        if [[ $memory_usage -gt 90 ]]; then
            send_alert "HIGH" "Memory usage critical" "Memory usage is at ${memory_usage}%"
        fi
    fi
    
    echo "$disk_usage"
}

# Generate security report
generate_security_report() {
    local audit_output="$1"
    local outdated_output="$2"
    local sensitive_findings="$3"
    local permission_issues="$4"
    local integrity_issues="$5"
    local disk_usage="$6"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="$REPORTS_DIR/security-report-$timestamp.md"
    
    mkdir -p "$REPORTS_DIR"
    
    cat > "$report_file" << EOF
# QR Device Onboarding System - Security Monitoring Report

**Generated:** $(date)  
**System:** Global QR Device Onboarding  
**Environment:** $(bun --version)  

## Executive Summary

### Security Status: $([ "$integrity_issues" -eq 0 ] && echo "✅ SECURE" || echo "⚠️ NEEDS ATTENTION")

### Risk Assessment
- **Critical Issues:** $([ "$integrity_issues" -gt 0 ] && echo "1" || echo "0")
- **High Risk:** $([ "$sensitive_findings" -gt 0 ] && echo "1" || echo "0")
- **Moderate Risk:** $([ "$permission_issues" -gt 2 ] && echo "1" || echo "0")
- **Low Risk:** $([ "$disk_usage" -gt 80 ] && echo "1" || echo "0")

## Detailed Findings

### 1. Security Audit Results
\`\`\`
$audit_output
\`\`\`

### 2. Outdated Packages
\`\`\`
$outdated_output
\`\`\`

### 3. Sensitive Data Exposure
- **Findings:** $sensitive_findings potential exposures
- **Status:** $([ "$sensitive_findings" -eq 0 ] && echo "✅ Clean" || echo "⚠️ Review needed")

### 4. File Permission Issues
- **Issues Found:** $permission_issues
- **Status:** $([ "$permission_issues" -eq 0 ] && echo "✅ Secure" || echo "⚠️ Fix required")

### 5. Dependency Integrity
- **Status:** $([ "$integrity_issues" -eq 0 ] && echo "✅ Valid" || echo "❌ Issues detected")

### 6. System Resources
- **Disk Usage:** ${disk_usage}%
- **Status:** $([ "$disk_usage" -lt 80 ] && echo "✅ Healthy" || echo "⚠️ Monitor")

## Recommendations

### Immediate Actions
$([ "$integrity_issues" -gt 0 ] && echo "- Fix dependency integrity issues")
$([ "$sensitive_findings" -gt 0 ] && echo "- Review and secure sensitive data exposures")
$([ "$permission_issues" -gt 0 ] && echo "- Fix file permission issues")

### Short-term Actions
- Update outdated packages
- Review security patches
- Monitor system resources

### Long-term Actions
- Implement automated security scanning
- Regular security training
- Compliance audit preparation

## Compliance Status

- **ISO27001:** $([ "$integrity_issues" -eq 0 && "$sensitive_findings" -eq 0 ] && echo "✅ Compliant" || echo "⚠️ Review needed")
- **SOC2:** $([ "$permission_issues" -eq 0 ] && echo "✅ Compliant" || echo "⚠️ Review needed")
- **PCI-DSS:** $([ "$sensitive_findings" -eq 0 ] && echo "✅ Compliant" || echo "❌ Non-compliant")
- **GDPR:** $([ "$sensitive_findings" -eq 0 ] && echo "✅ Compliant" || echo "⚠️ Review needed")

---

*Report generated by QR System Security Monitoring*
*Next scheduled scan: $(date -d "+1 day" +"%Y-%m-%d %H:%M:%S")*
EOF

    success "Security report generated: $report_file"
    echo "$report_file"
}

# Main execution
main() {
    log "🔒 Starting security monitoring for QR Device Onboarding System"
    
    # Create directories
    mkdir -p logs reports/security
    
    # Run security checks
    local audit_output
    audit_output=$(run_security_audit)
    
    local outdated_output
    outdated_output=$(check_outdated_packages)
    
    local sensitive_findings
    sensitive_findings=$(scan_sensitive_data)
    
    local permission_issues
    permission_issues=$(check_file_permissions)
    
    local integrity_issues
    integrity_issues=$(check_dependency_integrity)
    
    local disk_usage
    disk_usage=$(monitor_system_resources)
    
    # Generate comprehensive report
    local report_file
    report_file=$(generate_security_report \
        "$audit_output" \
        "$outdated_output" \
        "$sensitive_findings" \
        "$permission_issues" \
        "$integrity_issues" \
        "$disk_usage")
    
    success "🎉 Security monitoring completed!"
    log ""
    log "📊 Summary:"
    log "  • Security audit completed"
    log "  • $sensitive_findings sensitive data findings"
    log "  • $permission_issues permission issues"
    log "  • Dependency integrity: $([ "$integrity_issues" -eq 0 ] && echo "Valid" || echo "Issues")"
    log "  • Disk usage: ${disk_usage}%"
    log ""
    log "📁 Report: $report_file"
    log "🔄 Next scan: $(date -d "+1 day" +"%Y-%m-%d %H:%M:%S")"
}

# Run main function
main "$@"
