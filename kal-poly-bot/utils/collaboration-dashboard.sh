#!/bin/bash
# SERO Real-Time Collaboration Dashboard
# Team activity visualization with live performance metrics

set -euo pipefail

# Colors (maintaining team color coding)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Team color definitions
declare -A TEAM_COLORS=(
    ["alice"]="\033[0;36m"    # Cyan
    ["bob"]="\033[1;33m"      # Yellow  
    ["carol"]="\033[0;35m"    # Magenta
    ["dave"]="\033[0;32m"     # Green
)

# Configuration
DASHBOARD_DIR="$HOME/.shell_dashboard"
TEAM_ACTIVITY_LOG="$DASHBOARD_DIR/team_activity.log"
PERFORMANCE_CACHE="$DASHBOARD_DIR/performance_cache.json"
ACTIVE_SESSIONS_FILE="$DASHBOARD_DIR/active_sessions.json"
DASHBOARD_PORT=8080

# Create dashboard directory
mkdir -p "$DASHBOARD_DIR"

# Initialize team activity tracking
init_team_tracking() {
    if [[ ! -f "$TEAM_ACTIVITY_LOG" ]]; then
        cat > "$TEAM_ACTIVITY_LOG" << 'EOF'
timestamp|team_member|action|project|command|duration|status
EOF
    fi
    
    if [[ ! -f "$ACTIVE_SESSIONS_FILE" ]]; then
        cat > "$ACTIVE_SESSIONS_FILE" << 'EOF'
{
  "sessions": {},
  "last_updated": ""
}
EOF
    fi
}

# Log team activity
log_team_activity() {
    local team_member="${1:-unknown}"
    local action="${2:-command}"
    local project="${3:-unknown}"
    local command="${4:-}"
    local duration="${5:-0}"
    local status="${6:-success}"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "$timestamp|$team_member|$action|$project|$command|$duration|$status" >> "$TEAM_ACTIVITY_LOG"
    
    # Update active sessions
    update_active_sessions "$team_member" "$action" "$project" "$command"
}

# Update active sessions
update_active_sessions() {
    local team_member="$1"
    local action="$2"
    local project="$3"
    local command="$4"
    
    local temp_file=$(mktemp)
    jq --arg member "$team_member" \
       --arg action "$action" \
       --arg project "$project" \
       --arg command "$command" \
       --arg timestamp "$(date -Iseconds)" \
       '.sessions[$member] = {
           "last_action": $action,
           "current_project": $project,
           "last_command": $command,
           "last_seen": $timestamp,
           "status": "active"
        } |
        .last_updated = $timestamp' \
       "$ACTIVE_SESSIONS_FILE" > "$temp_file" && mv "$temp_file" "$ACTIVE_SESSIONS_FILE"
}

# Real-time dashboard display
show_realtime_dashboard() {
    clear
    echo -e "${CYAN}🔬 SERO Real-Time Collaboration Dashboard${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo ""
    
    # Current time and system status
    echo -e "${BLUE}System Status:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    local cpu_usage=$(ps -A -o %cpu | awk '{s+=$1} END {printf "%.0f", s}')
    local memory_usage=$(vm_stat | perl -ne '/page free/ && $f=$1; /page active/ && $a=$1; /page inactive/ && $i=$1; $f=~s/\.//; $a=~s/\.//; $i=~s/\.//; printf "%.0f", (($a+$i)/($f+$a+$i))*100)')
    echo "  CPU: ${cpu_usage}% | Memory: ${memory_usage}% | Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    # Team activity status
    echo -e "${YELLOW}👥 Team Activity Status${NC}"
    echo -e "${YELLOW}======================${NC}"
    
    if [[ -f "$ACTIVE_SESSIONS_FILE" ]]; then
        jq -r '.sessions | to_entries[] | "\(.key):\(.value.last_action):\(.value.current_project):\(.value.last_seen)"' "$ACTIVE_SESSIONS_FILE" 2>/dev/null | while IFS=':' read -r member action project timestamp; do
            if [[ -n "$member" && "$member" != "null" ]]; then
                local color="${TEAM_COLORS[$member]:-\033[0m}"
                local time_ago=$(calculate_time_ago "$timestamp")
                echo -e "  ${color}$(printf "%-6s" "${member^}")${NC} $action in $project ($time_ago)"
            fi
        done
    else
        echo "  No active sessions detected"
    fi
    echo ""
    
    # Recent team activity
    echo -e "${MAGENTA}📋 Recent Team Activity${NC}"
    echo -e "${MAGENTA}=======================${NC}"
    
    if [[ -f "$TEAM_ACTIVITY_LOG" ]]; then
        tail -10 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | while IFS='|' read -r timestamp member action project command duration status; do
            if [[ -n "$member" ]]; then
                local color="${TEAM_COLORS[$member]:-\033[0m}"
                local short_time=$(date -d "$timestamp" '+%H:%M' 2>/dev/null || echo "${timestamp:11:5}")
                local display_cmd="${command:0:40}"
                if [[ ${#command} -gt 40 ]]; then
                    display_cmd="${display_cmd}..."
                fi
                
                local status_icon="✅"
                if [[ "$status" != "success" ]]; then
                    status_icon="❌"
                fi
                
                echo -e "  ${short_time} ${color}$(printf "%-6s" "${member^}")${NC} $action: $display_cmd $status_icon"
            fi
        done
    else
        echo "  No recent activity"
    fi
    echo ""
    
    # Project activity distribution
    echo -e "${GREEN}📊 Project Activity Distribution${NC}"
    echo -e "${GREEN}================================${NC}"
    
    if [[ -f "$TEAM_ACTIVITY_LOG" ]]; then
        # Count activities by project
        tail -50 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | cut -d'|' -f4 | sort | uniq -c | sort -rn | while read -r count project; do
            local percentage=$((count * 100 / 50))
            local bar_length=$((percentage / 5))
            local bar=$(printf "%*s" "$bar_length" | tr ' ' '█')
            echo -e "  $(printf "%-20s" "$project") ${bar} $count ($percentage%)"
        done
    fi
    echo ""
    
    # Performance metrics
    echo -e "${BLUE}⚡ Performance Metrics${NC}"
    echo -e "${BLUE}=======================${NC}"
    
    # Show recent performance data if available
    if [[ -f "$HOME/.shell_performance.log" ]]; then
        local recent_commands=$(tail -10 "$HOME/.shell_performance.log" | wc -l)
        local avg_duration=$(tail -10 "$HOME/.shell_performance.log" | awk -F'|' '{sum+=$4; count++} END {if(count>0) printf "%.0f", sum/count; else print "0"}')
        local slow_commands=$(tail -10 "$HOME/.shell_performance.log" | awk -F'|' '$4 > 100 {count++} END {print count+0}')
        
        echo "  Recent Commands: $recent_commands"
        echo "  Average Duration: ${avg_duration}ms"
        echo "  Slow Commands: $slow_commands"
    else
        echo "  Performance monitoring not active"
    fi
    echo ""
    
    # Collaboration insights
    echo -e "${CYAN}💡 Collaboration Insights${NC}"
    echo -e "${CYAN}==========================${NC}"
    
    generate_collaboration_insights
    
    echo ""
    echo -e "${YELLOW}🔄 Auto-refresh in 5 seconds... (Ctrl+C to exit)${NC}"
}

# Calculate time ago
calculate_time_ago() {
    local timestamp="$1"
    if command -v date >/dev/null 2>&1; then
        local current_time=$(date +%s)
        local activity_time=$(date -d "$timestamp" +%s 2>/dev/null || echo "$current_time")
        local diff=$((current_time - activity_time))
        
        if [[ $diff -lt 60 ]]; then
            echo "${diff}s ago"
        elif [[ $diff -lt 3600 ]]; then
            echo "$((diff / 60))m ago"
        else
            echo "$((diff / 3600))h ago"
        fi
    else
        echo "unknown"
    fi
}

# Generate collaboration insights
generate_collaboration_insights() {
    if [[ ! -f "$TEAM_ACTIVITY_LOG" ]]; then
        echo "  No activity data available"
        return
    fi
    
    # Most active team member
    local most_active=$(tail -50 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | cut -d'|' -f2 | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
    if [[ -n "$most_active" ]]; then
        local color="${TEAM_COLORS[$most_active]:-\033[0m}"
        echo -e "  Most Active: ${color}${most_active^}${NC}"
    fi
    
    # Busiest project
    local busiest_project=$(tail -50 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | cut -d'|' -f4 | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
    if [[ -n "$busiest_project" ]]; then
        echo "  Busiest Project: $busiest_project"
    fi
    
    # Success rate
    local total_commands=$(tail -50 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | wc -l)
    local successful_commands=$(tail -50 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | cut -d'|' -f7 | grep -c "success" || echo "0")
    if [[ $total_commands -gt 0 ]]; then
        local success_rate=$((successful_commands * 100 / total_commands))
        echo "  Success Rate: ${success_rate}%"
    fi
}

# Start web dashboard
start_web_dashboard() {
    echo -e "${BLUE}🌐 Starting Web Dashboard...${NC}"
    
    # Create simple HTML dashboard
    cat > "$DASHBOARD_DIR/dashboard.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>SERO Collaboration Dashboard</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            background: #1a1a1a; 
            color: #00ff00; 
            margin: 20px;
        }
        .header { 
            color: #00ffff; 
            border-bottom: 2px solid #00ffff; 
            padding-bottom: 10px;
        }
        .team-section { 
            margin: 20px 0; 
            padding: 15px; 
            background: #2a2a2a; 
            border-radius: 5px;
        }
        .alice { color: #00ffff; }
        .bob { color: #ffff00; }
        .carol { color: #ff00ff; }
        .dave { color: #00ff00; }
        .metrics { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px;
        }
        .metric-card { 
            background: #333; 
            padding: 15px; 
            border-radius: 5px; 
            text-align: center;
        }
        .refresh-btn {
            background: #00ffff;
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
        }
    </style>
    <script>
        function refreshDashboard() {
            location.reload();
        }
        
        // Auto-refresh every 10 seconds
        setInterval(refreshDashboard, 10000);
        
        function logActivity(member, action, project, command) {
            const timestamp = new Date().toISOString();
            console.log(`Activity logged: ${member} - ${action} in ${project}`);
        }
    </script>
</head>
<body>
    <div class="header">
        <h1>🔬 SERO Real-Time Collaboration Dashboard</h1>
        <p>Last Updated: <span id="timestamp"></span></p>
        <button class="refresh-btn" onclick="refreshDashboard()">🔄 Refresh</button>
    </div>
    
    <div class="team-section">
        <h2>👥 Team Activity</h2>
        <div class="alice">🔵 Alice (Architect): <span id="alice-status">Checking...</span></div>
        <div class="bob">🟡 Bob (Risk): <span id="bob-status">Checking...</span></div>
        <div class="carol">🟣 Carol (Compliance): <span id="carol-status">Checking...</span></div>
        <div class="dave">🟢 Dave (Operations): <span id="dave-status">Checking...</span></div>
    </div>
    
    <div class="team-section">
        <h2>📊 System Metrics</h2>
        <div class="metrics">
            <div class="metric-card">
                <h3>CPU Usage</h3>
                <div id="cpu-metric">--%</div>
            </div>
            <div class="metric-card">
                <h3>Memory</h3>
                <div id="memory-metric">--%</div>
            </div>
            <div class="metric-card">
                <h3>Active Sessions</h3>
                <div id="sessions-metric">--</div>
            </div>
            <div class="metric-card">
                <h3>Success Rate</h3>
                <div id="success-metric">--%</div>
            </div>
        </div>
    </div>
    
    <div class="team-section">
        <h2>📋 Recent Activity</h2>
        <div id="recent-activity">
            <p>Loading recent activity...</p>
        </div>
    </div>
    
    <script>
        // Update timestamp
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        
        // Simulate real-time data (in real implementation, this would fetch from backend)
        function updateMetrics() {
            document.getElementById('cpu-metric').textContent = Math.floor(Math.random() * 100) + '%';
            document.getElementById('memory-metric').textContent = Math.floor(Math.random() * 100) + '%';
            document.getElementById('sessions-metric').textContent = Math.floor(Math.random() * 5) + 1;
            document.getElementById('success-metric').textContent = (85 + Math.floor(Math.random() * 15)) + '%';
            
            // Update team status
            const statuses = ['Active', 'Away', 'In Meeting', 'Coding'];
            ['alice', 'bob', 'carol', 'dave'].forEach(member => {
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const element = document.getElementById(member + '-status');
                if (element) element.textContent = status;
            });
        }
        
        // Initial update
        updateMetrics();
        
        // Update every 5 seconds
        setInterval(updateMetrics, 5000);
    </script>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Web dashboard created at: $DASHBOARD_DIR/dashboard.html${NC}"
    echo -e "${YELLOW}📋 To view dashboard:${NC}"
    echo "  1. Open in browser: open $DASHBOARD_DIR/dashboard.html"
    echo "  2. Or start local server: python3 -m http.server $DASHBOARD_PORT --directory $DASHBOARD_DIR"
    echo "     Then visit: http://localhost:$DASHBOARD_PORT"
}

# Team command wrapper with activity logging
team_execute() {
    local team_member="${1:-unknown}"
    shift
    local command="$*"
    local current_dir=$(pwd)
    
    # Determine current project
    local project="unknown"
    if [[ "$current_dir" == *"/poly-kalshi-arb"* ]]; then
        project="poly-kalshi-arb"
    elif [[ "$current_dir" == *"/surgical-precision-mcp"* ]]; then
        project="surgical-precision-mcp"
    elif [[ "$current_dir" == *"/operation_surgical_precision"* ]]; then
        project="operation_surgical_precision"
    elif [[ "$current_dir" == *"/utils"* ]]; then
        project="utils"
    fi
    
    # Log activity start
    log_team_activity "$team_member" "start" "$project" "$command" "0" "running"
    
    # Execute command with timing
    local start_time=$(date +%s.%N)
    eval "$command"
    local exit_code=$?
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    # Log activity result
    local status="success"
    if [[ $exit_code -ne 0 ]]; then
        status="failed"
    fi
    
    log_team_activity "$team_member" "complete" "$project" "$command" "${duration}" "$status"
    
    # Show team-colored result
    local color="${TEAM_COLORS[$team_member]:-\033[0m}"
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${color}✅ [$team_member] Command completed successfully${NC}"
    else
        echo -e "${color}❌ [$team_member] Command failed with exit code $exit_code${NC}"
    fi
    
    return $exit_code
}

# Install collaboration dashboard
install_collaboration_dashboard() {
    echo -e "${BLUE}Installing SERO Collaboration Dashboard...${NC}"
    
    # Initialize tracking
    init_team_tracking
    
    # Create dashboard command
    cat > "$HOME/.local/bin/dashboard" << 'EOF'
#!/bin/bash
# SERO Collaboration Dashboard Interface
source "$HOME/.shell_collaboration_dashboard.sh"

case "${1:-terminal}" in
    "terminal"|"term")
        show_realtime_dashboard
        ;;
    "web"|"browser")
        start_web_dashboard
        ;;
    "log")
        tail -20 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp"
        ;;
    "team")
        team_execute "${2:-unknown}" "${@:3}"
        ;;
    "help"|*)
        echo "SERO Collaboration Dashboard"
        echo "=============================="
        echo ""
        echo "Usage: dashboard {terminal|web|log|team|help}"
        echo ""
        echo "Commands:"
        echo "  terminal    - Show terminal dashboard (auto-refresh)"
        echo "  web         - Start web dashboard"
        echo "  log         - Show recent activity log"
        echo "  team <member> <command> - Execute command as team member"
        echo "  help        - Show this help"
        echo ""
        echo "Team Members:"
        echo "  alice   - Architect (Cyan)"
        echo "  bob     - Risk Analysis (Yellow)"
        echo "  carol   - Compliance (Magenta)"
        echo "  dave    - Operations (Green)"
        echo ""
        echo "Examples:"
        echo "  dashboard terminal"
        echo "  dashboard web"
        echo "  dashboard team alice 'cargo build'"
        echo "  dashboard team bob 'npm test'"
        ;;
esac
EOF
chmod +x "$HOME/.local/bin/dashboard"
    
    # Create team member aliases
    for member in alice bob carol dave; do
        alias_name="team-$member"
        cat > "$HOME/.local/bin/$alias_name" << EOF
#!/bin/bash
# Execute as $member
source "$HOME/.shell_collaboration_dashboard.sh"
team_execute "$member" "\$@"
EOF
chmod +x "$HOME/.local/bin/$alias_name"
    done
    
    # Add to shell configuration
    local shell_config="$HOME/.zshrc"
    if [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    if ! grep -q "shell_collaboration_dashboard.sh" "$shell_config"; then
        cat >> "$shell_config" << 'EOF'

# SERO Collaboration Dashboard
if [[ -f "$HOME/.shell_collaboration_dashboard.sh" ]]; then
    source "$HOME/.shell_collaboration_dashboard.sh"
    
    # Team aliases for quick access
    alias alice='team-execute alice'
    alias bob='team-execute bob'
    alias carol='team-execute carol'
    alias dave='team-execute dave'
    alias team='dashboard team'
fi
EOF
    fi
    
    echo -e "${GREEN}✅ Collaboration Dashboard installed${NC}"
    echo -e "${YELLOW}📋 Available commands:${NC}"
    echo "  dashboard terminal     - Show real-time terminal dashboard"
    echo "  dashboard web           - Start web dashboard"
    echo "  dashboard log           - View activity log"
    echo "  dashboard team <member> <cmd> - Execute as team member"
    echo "  team-alice <command>    - Execute as Alice"
    echo "  team-bob <command>      - Execute as Bob"
    echo "  team-carol <command>    - Execute as Carol"
    echo "  team-dave <command>     - Execute as Dave"
    echo ""
    echo -e "${GREEN}🎯 Features:${NC}"
    echo "  • Real-time team activity tracking"
    echo "  • Performance metrics visualization"
    echo "  • Project activity distribution"
    echo "  • Team role color coding"
    echo "  • Web-based dashboard interface"
    echo "  • Command execution with team attribution"
}

# Main execution
case "${1:-install}" in
    "install")
        install_collaboration_dashboard
        ;;
    "terminal"|"term")
        # Continuous refresh
        while true; do
            show_realtime_dashboard
            sleep 5
        done
        ;;
    "web"|"browser")
        start_web_dashboard
        ;;
    "log")
        tail -20 "$TEAM_ACTIVITY_LOG" | grep -v "^timestamp" | while IFS='|' read -r timestamp member action project command duration status; do
            if [[ -n "$member" ]]; then
                local color="${TEAM_COLORS[$member]:-\033[0m}"
                local status_icon="✅"
                if [[ "$status" != "success" ]]; then
                    status_icon="❌"
                fi
                echo -e "$timestamp ${color}${member^}${NC} $action: $command $status_icon"
            fi
        done
        ;;
    "team")
        team_execute "${2:-unknown}" "${@:3}"
        ;;
    *)
        echo "Usage: $0 {install|terminal|web|log|team}"
        echo "  install   - Install collaboration dashboard"
        echo "  terminal  - Show real-time terminal dashboard"
        echo "  web       - Start web dashboard"
        echo "  log       - View activity log"
        echo "  team      - Execute command as team member"
        exit 1
        ;;
esac
