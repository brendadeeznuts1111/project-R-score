#!/bin/bash
# SERO Performance Monitoring Integration
# Real-time command performance tracking with sub-100ms threshold alerts

set -euo pipefail

# Colors for output (maintaining team color coding)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PERFORMANCE_LOG="$HOME/.shell_performance.log"
METRICS_DIR="$HOME/.shell_metrics"
ALERT_THRESHOLD=100  # ms threshold for alerts
HISTORY_SIZE=1000

# Create metrics directory
mkdir -p "$METRICS_DIR"

# Performance tracking functions
log_command_performance() {
    local command="$1"
    local exit_code="$2"
    local start_time="$3"
    local end_time="$4"
    
    local duration=$(( (end_time - start_time) * 1000 ))  # Convert to ms
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log performance data
    echo "$timestamp|$command|$exit_code|$duration" >> "$PERFORMANCE_LOG"
    
    # Check threshold and alert
    if [[ $duration -gt $ALERT_THRESHOLD ]]; then
        echo -e "${RED}[PERF ALERT]${NC} Command '$command' took ${duration}ms (threshold: ${ALERT_THRESHOLD}ms)" >&2
    fi
    
    # Update real-time metrics
    update_realtime_metrics "$command" "$duration" "$exit_code"
}

update_realtime_metrics() {
    local command="$1"
    local duration="$2"
    local exit_code="$3"
    local date_key=$(date '+%Y-%m-%d')
    local metrics_file="$METRICS_DIR/daily_$date_key.json"
    
    # Initialize metrics file if doesn't exist
    if [[ ! -f "$metrics_file" ]]; then
        cat > "$metrics_file" << 'EOF'
{
  "date": "",
  "commands": {},
  "total_commands": 0,
  "avg_duration": 0,
  "slow_commands": 0,
  "failed_commands": 0
}
EOF
    fi
    
    # Update metrics (simplified JSON update)
    local temp_file=$(mktemp)
    jq --arg cmd "$command" --arg dur "$duration" --arg code "$exit_code" \
       '.date = $date_key |
        .commands[$cmd] = (.commands[$cmd] // {} | 
            .count += 1 |
            .total_duration += ($dur | tonumber) |
            .avg_duration = (.total_duration / .count) |
            .last_duration = ($dur | tonumber) |
            .success_rate = if ($code == "0") then 
                (.success_rate // 0) * 0.9 + 0.1 
            else 
                (.success_rate // 0) * 0.9 
            end
        ) |
        .total_commands += 1 |
        .avg_duration = (.total_duration / .total_commands) |
        .slow_commands += if ($dur | tonumber) > 100 then 1 else 0 end |
        .failed_commands += if ($code != "0") then 1 else 0 end' \
       "$metrics_file" > "$temp_file" && mv "$temp_file" "$metrics_file"
}

# Command wrapper for performance tracking
run_with_performance_tracking() {
    local start_time=$(date +%s.%N)
    local command="$*"
    
    # Execute command and capture exit code
    eval "$command"
    local exit_code=$?
    
    local end_time=$(date +%s.%N)
    log_command_performance "$command" "$exit_code" "$start_time" "$end_time"
    
    return $exit_code
}

# Real-time performance dashboard
show_performance_dashboard() {
    local date_key=$(date '+%Y-%m-%d')
    local metrics_file="$METRICS_DIR/daily_$date_key.json"
    
    echo -e "${CYAN}🔬 SERO Performance Dashboard${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
    
    if [[ -f "$metrics_file" ]]; then
        echo -e "${BLUE}Today's Metrics:${NC}"
        echo "  Total Commands: $(jq -r '.total_commands' "$metrics_file")"
        echo "  Average Duration: $(jq -r '.avg_duration | floor' "$metrics_file")ms"
        echo "  Slow Commands: $(jq -r '.slow_commands' "$metrics_file")"
        echo "  Failed Commands: $(jq -r '.failed_commands' "$metrics_file")"
        echo ""
        
        echo -e "${YELLOW}Top 5 Slowest Commands:${NC}"
        jq -r '.commands | to_entries | sort_by(.value.avg_duration) | reverse | .[0:5] | .[] | "  \(.key): \(.value.avg_duration | floor)ms avg (\(.value.count)x)"' "$metrics_file"
        echo ""
        
        echo -e "${MAGENTA}Recent Performance Issues:${NC}"
        tail -10 "$PERFORMANCE_LOG" | awk -F'|' '$4 > 100 {print "  " $1 " - " $2 " (" $4 "ms)"}' || echo "  None in recent history"
    else
        echo -e "${YELLOW}No performance data available for today.${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Performance Status:${NC}"
    
    # Check current system performance
    local cpu_usage=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.0f", s}')
    local memory_usage=$(vm_stat | perl -ne '/page free/ && $f=$1; /page active/ && $a=$1; /page inactive/ && $i=$1; $f=~s/\.//; $a=~s/\.//; $i=~s/\.//; printf "%.0f", (($a+$i)/($f+$a+$i))*100}')
    
    echo "  CPU Usage: ${cpu_usage}%"
    echo "  Memory Usage: ${memory_usage}%"
    
    if [[ $cpu_usage -gt 80 ]]; then
        echo -e "  ${RED}⚠️  High CPU usage detected${NC}"
    fi
    
    if [[ $memory_usage -gt 80 ]]; then
        echo -e "  ${RED}⚠️  High memory usage detected${NC}"
    fi
}

# Performance analysis function
analyze_performance() {
    local days="${1:-7}"
    
    echo -e "${CYAN}📊 Performance Analysis (Last $days days)${NC}"
    echo -e "${CYAN}=====================================${NC}"
    echo ""
    
    # Analyze performance trends
    echo -e "${BLUE}Performance Trends:${NC}"
    
    for ((i=0; i<days; i++)); do
        local date_key=$(date -v-${i}d '+%Y-%m-%d' 2>/dev/null || date -d "$i days ago" '+%Y-%m-%d')
        local metrics_file="$METRICS_DIR/daily_$date_key.json"
        
        if [[ -f "$metrics_file" ]]; then
            local total_cmds=$(jq -r '.total_commands' "$metrics_file")
            local avg_duration=$(jq -r '.avg_duration | floor' "$metrics_file")
            local slow_cmds=$(jq -r '.slow_commands' "$metrics_file")
            
            echo "  $date_key: $total_cmds commands, ${avg_duration}ms avg, $slow_cmds slow"
        fi
    done
    
    echo ""
    echo -e "${GREEN}Performance Recommendations:${NC}"
    
    # Analyze patterns and provide recommendations
    local recent_slow=$(tail -100 "$PERFORMANCE_LOG" 2>/dev/null | awk -F'|' '$4 > 100 {count++} END {print count+0}')
    if [[ $recent_slow -gt 10 ]]; then
        echo "  ⚠️  High frequency of slow commands detected"
        echo "     Consider optimizing frequently used commands"
    fi
    
    local recent_failures=$(tail -100 "$PERFORMANCE_LOG" 2>/dev/null | awk -F'|' '$3 != 0 {count++} END {print count+0}')
    if [[ $recent_failures -gt 5 ]]; then
        echo "  ⚠️  High command failure rate detected"
        echo "     Review recent command history for patterns"
    fi
}

# Install performance monitoring
install_performance_monitoring() {
    echo -e "${BLUE}Installing SERO Performance Monitoring...${NC}"
    
    # Create wrapper script for common commands
    cat > "$HOME/.local/bin/perf-run" << 'EOF'
#!/bin/bash
# Performance wrapper for any command
source "$HOME/.shell_performance_monitor.sh"
run_with_performance_tracking "$@"
EOF
chmod +x "$HOME/.local/bin/perf-run"
    
    # Add to shell configuration
    local shell_config="$HOME/.zshrc"
    if [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    # Add performance monitoring to shell
    if ! grep -q "shell_performance_monitor.sh" "$shell_config"; then
        cat >> "$shell_config" << 'EOF'

# SERO Performance Monitoring
if [[ -f "$HOME/.shell_performance_monitor.sh" ]]; then
    source "$HOME/.shell_performance_monitor.sh"
    
    # Track command history with performance
    preexec() {
        SERO_CMD_START_TIME=$(date +%s.%N)
        SERO_CURRENT_CMD="$1"
    }
    
    precmd() {
        if [[ -n "${SERO_CMD_START_TIME:-}" ]]; then
            local end_time=$(date +%s.%N)
            local exit_code=$?
            log_command_performance "$SERO_CURRENT_CMD" "$exit_code" "$SERO_CMD_START_TIME" "$end_time"
            unset SERO_CMD_START_TIME SERO_CURRENT_CMD
        fi
    }
fi

# Performance aliases
alias perf-dash='show_performance_dashboard'
alias perf-analyze='analyze_performance'
alias perf-log='tail -50 "$HOME/.shell_performance.log"'
EOF
    fi
    
    echo -e "${GREEN}✅ Performance monitoring installed${NC}"
    echo -e "${YELLOW}📋 Available commands:${NC}"
    echo "  perf-dash      - Show performance dashboard"
    echo "  perf-analyze   - Analyze performance trends"
    echo "  perf-log       - View recent performance log"
    echo "  perf-run       - Run any command with performance tracking"
}

# Main execution
case "${1:-install}" in
    "install")
        install_performance_monitoring
        ;;
    "dashboard"|"dash")
        show_performance_dashboard
        ;;
    "analyze")
        analyze_performance "${2:-7}"
        ;;
    "log")
        tail -50 "$PERFORMANCE_LOG"
        ;;
    "track")
        shift
        run_with_performance_tracking "$@"
        ;;
    *)
        echo "Usage: $0 {install|dashboard|analyze|track} [args]"
        echo "  install   - Install performance monitoring"
        echo "  dashboard - Show performance dashboard"
        echo "  analyze   - Analyze performance trends (days)"
        echo "  track     - Track a specific command"
        exit 1
        ;;
esac
