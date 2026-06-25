#!/bin/bash

# Bucket Visualization Monitor Script
# Monitors the health and performance of the bucket visualization system

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.bucket-server.pid"
HEALTH_LOG="$LOG_DIR/health-check.log"
METRICS_LOG="$LOG_DIR/metrics.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Health check
health_check() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if ! is_running; then
        echo "[$timestamp] ERROR: Server is not running" >> "$HEALTH_LOG"
        return 1
    fi
    
    # Check HTTP response
    if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
        echo "[$timestamp] OK: Server responding" >> "$HEALTH_LOG"
        return 0
    else
        echo "[$timestamp] ERROR: Server not responding" >> "$HEALTH_LOG"
        return 1
    fi
}

# Collect metrics
collect_metrics() {
    if ! is_running; then
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get process metrics
    local cpu_usage=$(ps -p "$pid" -o %cpu --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    local mem_usage=$(ps -p "$pid" -o %mem --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    local mem_rss=$(ps -p "$pid" -o rss --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    local uptime=$(ps -p "$pid" -o etime --no-headers 2>/dev/null | tr -d ' ' || echo "0")
    
    # Get system metrics
    local disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | tr -d '%')
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | tr -d ' ')
    
    # Log metrics
    echo "[$timestamp] PID:$pid CPU:${cpu_usage}% MEM:${mem_usage}% RSS:${mem_rss}KB UPTIME:${uptime} DISK:${disk_usage}% LOAD:$load_avg" >> "$METRICS_LOG"
}

# Show dashboard
show_dashboard() {
    clear
    echo -e "${BLUE}=== Enhanced Bucket Visualization Monitor ===${NC}"
    echo ""
    
    # Server status
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ Server Status: RUNNING (PID: $pid)${NC}"
        echo -e "${GREEN}🌐 URL: http://localhost:5173${NC}"
        
        # Process info
        if command -v ps > /dev/null; then
            echo ""
            echo -e "${BLUE}Process Information:${NC}"
            ps -p "$pid" -o pid,pcpu,pmem,rss,etime,cmd --no-headers | \
            awk '{printf "  PID: %s, CPU: %s%%, MEM: %s%%, RSS: %sKB, UPTIME: %s\n", $1, $2, $3, $4, $5}'
        fi
    else
        echo -e "${RED}❌ Server Status: STOPPED${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}System Information:${NC}"
    echo "  Disk Usage: $(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
    echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo "  Memory Usage: $(free -h 2>/dev/null | awk 'NR==2{printf "%s/%s (%s)", $3,$2,$7}' || echo 'N/A')"
    
    echo ""
    echo -e "${BLUE}Recent Health Checks:${NC}"
    if [ -f "$HEALTH_LOG" ]; then
        tail -5 "$HEALTH_LOG" | while read line; do
            if [[ $line == *"ERROR"* ]]; then
                echo -e "  ${RED}$line${NC}"
            elif [[ $line == *"WARNING"* ]]; then
                echo -e "  ${YELLOW}$line${NC}"
            else
                echo -e "  ${GREEN}$line${NC}"
            fi
        done
    else
        echo "  No health logs available"
    fi
    
    echo ""
    echo -e "${BLUE}Recent Metrics:${NC}"
    if [ -f "$METRICS_LOG" ]; then
        tail -3 "$METRICS_LOG" | while read line; do
            echo "  $line"
        done
    else
        echo "  No metrics available"
    fi
    
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to exit dashboard${NC}"
}

# Continuous monitoring
start_monitoring() {
    log "Starting continuous monitoring..."
    
    # Create log files
    mkdir -p "$LOG_DIR"
    touch "$HEALTH_LOG" "$METRICS_LOG"
    
    # Rotate logs if they get too large
    if [ -f "$HEALTH_LOG" ] && [ $(stat -f%z "$HEALTH_LOG" 2>/dev/null || stat -c%s "$HEALTH_LOG" 2>/dev/null || echo 0) -gt 1048576 ]; then
        mv "$HEALTH_LOG" "$HEALTH_LOG.old"
    fi
    
    if [ -f "$METRICS_LOG" ] && [ $(stat -f%z "$METRICS_LOG" 2>/dev/null || stat -c%s "$METRICS_LOG" 2>/dev/null || echo 0) -gt 1048576 ]; then
        mv "$METRICS_LOG" "$METRICS_LOG.old"
    fi
    
    # Main monitoring loop
    while true; do
        health_check
        collect_metrics
        sleep 30
    done
}

# Show logs
show_logs() {
    echo -e "${BLUE}=== Health Check Logs ===${NC}"
    if [ -f "$HEALTH_LOG" ]; then
        tail -20 "$HEALTH_LOG"
    else
        echo "No health logs available"
    fi
    
    echo ""
    echo -e "${BLUE}=== Metrics Logs ===${NC}"
    if [ -f "$METRICS_LOG" ]; then
        tail -20 "$METRICS_LOG"
    else
        echo "No metrics logs available"
    fi
}

# Alert on problems
check_alerts() {
    local alerts=0
    
    # Check if server is down
    if ! is_running; then
        error "🚨 ALERT: Server is not running!"
        alerts=$((alerts + 1))
    fi
    
    # Check health
    if ! health_check; then
        error "🚨 ALERT: Health check failed!"
        alerts=$((alerts + 1))
    fi
    
    # Check disk space
    local disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | tr -d '%')
    if [ "$disk_usage" -gt 90 ]; then
        error "🚨 ALERT: Disk usage is ${disk_usage}% (>90%)"
        alerts=$((alerts + 1))
    fi
    
    # Check memory
    if command -v free > /dev/null; then
        local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$mem_usage" -gt 90 ]; then
            error "🚨 ALERT: Memory usage is ${mem_usage}% (>90%)"
            alerts=$((alerts + 1))
        fi
    fi
    
    if [ $alerts -eq 0 ]; then
        log "✅ No alerts detected"
    fi
    
    return $alerts
}

# Show help
show_help() {
    echo -e "${BLUE}Bucket Visualization Monitor${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo -e "${GREEN}Commands:${NC}"
    echo "  dashboard  - Show real-time monitoring dashboard"
    echo "  monitor    - Start continuous monitoring"
    echo "  health     - Run health check"
    echo "  metrics    - Collect and show metrics"
    echo "  alerts     - Check for alerts"
    echo "  logs       - Show health and metrics logs"
    echo "  help       - Show this help"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 dashboard  # Interactive monitoring"
    echo "  $0 monitor    # Background monitoring"
    echo "  $0 alerts     # Check for problems"
}

# Main script logic
case "${1:-help}" in
    "dashboard")
        while true; do
            show_dashboard
            sleep 5
        done
        ;;
    "monitor")
        start_monitoring
        ;;
    "health")
        health_check
        ;;
    "metrics")
        collect_metrics
        if [ -f "$METRICS_LOG" ]; then
            tail -1 "$METRICS_LOG"
        fi
        ;;
    "alerts")
        check_alerts
        ;;
    "logs")
        show_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
