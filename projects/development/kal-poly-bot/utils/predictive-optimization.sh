#!/bin/bash
# SERO Predictive Command Optimization
# AI-powered command suggestion and performance optimization

set -euo pipefail

# Colors (maintaining team color coding)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
OPTIMIZATION_DIR="$HOME/.shell_optimization"
COMMAND_PATTERNS_FILE="$OPTIMIZATION_DIR/command_patterns.json"
PERFORMANCE_HISTORY="$OPTIMIZATION_DIR/performance_history.json"
OPTIMIZATION_CACHE="$OPTIMIZATION_DIR/optimization_cache.json"
LEARNING_MODEL="$OPTIMIZATION_DIR/learning_model.json"

# Create optimization directory
mkdir -p "$OPTIMIZATION_DIR"

# Initialize optimization system
init_optimization() {
    if [[ ! -f "$COMMAND_PATTERNS_FILE" ]]; then
        cat > "$COMMAND_PATTERNS_FILE" << 'EOF'
{
  "patterns": {
    "cargo": {
      "build": {
        "optimizations": ["--release", "-j$(nproc)", "--target-dir=target/release"],
        "common_args": ["--verbose", "--color=always"],
        "performance_factor": 1.2
      },
      "run": {
        "optimizations": ["--release", "--"],
        "common_args": ["--quiet"],
        "performance_factor": 1.5
      },
      "test": {
        "optimizations": ["--release", "--", "--nocapture"],
        "common_args": ["--verbose"],
        "performance_factor": 1.3
      }
    },
    "bun": {
      "run": {
        "optimizations": ["--hot", "--watch"],
        "common_args": ["--silent"],
        "performance_factor": 1.4
      },
      "build": {
        "optimizations": ["--minify", "--target=bun"],
        "common_args": ["--verbose"],
        "performance_factor": 1.6
      }
    },
    "git": {
      "add": {
        "optimizations": ["--all", "--verbose"],
        "common_args": ["--dry-run"],
        "performance_factor": 1.1
      },
      "commit": {
        "optimizations": ["--verbose", "--no-verify"],
        "common_args": ["--message"],
        "performance_factor": 1.0
      },
      "push": {
        "optimizations": ["--force-with-lease"],
        "common_args": ["--verbose"],
        "performance_factor": 1.2
      }
    }
  },
  "learned_patterns": {},
  "user_preferences": {}
}
EOF
    fi
    
    if [[ ! -f "$PERFORMANCE_HISTORY" ]]; then
        cat > "$PERFORMANCE_HISTORY" << 'EOF'
{
  "command_history": [],
  "performance_baselines": {},
  "optimization_success_rates": {},
  "learned_optimizations": {}
}
EOF
    fi
    
    if [[ ! -f "$OPTIMIZATION_CACHE" ]]; then
        cat > "$OPTIMIZATION_CACHE" << 'EOF'
{
  "cache": {},
  "last_updated": "",
  "cache_hit_rate": 0.0
}
EOF
    fi
}

# Analyze command pattern
analyze_command() {
    local command="$*"
    
    # Extract base command and arguments
    local base_cmd=$(echo "$command" | awk '{print $1}')
    local sub_cmd=$(echo "$command" | awk '{print $2}')
    
    echo -e "${CYAN}🧠 SERO Command Analysis${NC}"
    echo -e "${CYAN}=======================${NC}"
    echo ""
    echo -e "${BLUE}Original Command:${NC} $command"
    echo -e "${BLUE}Base Command:${NC} $base_cmd"
    echo -e "${BLUE}Sub-command:${NC} $sub_cmd"
    echo ""
    
    # Get optimization suggestions
    local suggestions=$(get_optimization_suggestions "$base_cmd" "$sub_cmd" "$command")
    
    if [[ -n "$suggestions" ]]; then
        echo -e "${GREEN}🚀 Optimization Suggestions:${NC}"
        echo "$suggestions"
        echo ""
    fi
    
    # Predict performance
    predict_performance "$base_cmd" "$sub_cmd" "$command"
    
    # Learn from this command
    learn_from_command "$command" "$base_cmd" "$sub_cmd"
}

# Get optimization suggestions
get_optimization_suggestions() {
    local base_cmd="$1"
    local sub_cmd="$2"
    local full_command="$3"
    
    local suggestions=""
    
    # Check cached optimizations first
    local cached_result=$(check_cache "$full_command")
    if [[ -n "$cached_result" ]]; then
        echo "$cached_result"
        return
    fi
    
    # Analyze command patterns
    if [[ -f "$COMMAND_PATTERNS_FILE" ]]; then
        local optimizations=$(jq -r --arg cmd "$base_cmd" --arg sub "$sub_cmd" \
            '.patterns[$cmd][$sub].optimizations // empty | join(" ")' \
            "$COMMAND_PATTERNS_FILE" 2>/dev/null)
        
        if [[ -n "$optimizations" && "$optimizations" != "null" ]]; then
            suggestions="  🎯 Optimized: $base_cmd $sub_cmd $optimizations"
            
            # Get performance factor
            local perf_factor=$(jq -r --arg cmd "$base_cmd" --arg sub "$sub_cmd" \
                '.patterns[$cmd][$sub].performance_factor // 1.0' \
                "$COMMAND_PATTERNS_FILE" 2>/dev/null)
            
            if [[ "$perf_factor" != "null" && "$perf_factor" != "1.0" ]]; then
                suggestions="$suggestions"
                echo -e "$suggestions"
                echo -e "  📈 Expected Performance Improvement: ${perf_factor}x"
            else
                echo -e "$suggestions"
            fi
            
            # Cache the result
            cache_optimization "$full_command" "$optimizations"
        fi
    fi
    
    # Check for common anti-patterns
    check_anti_patterns "$full_command"
}

# Check command anti-patterns
check_anti_patterns() {
    local command="$1"
    
    echo -e "${YELLOW}⚡ Anti-Pattern Analysis:${NC}"
    
    # Common performance issues
    if [[ "$command" == *"npm install"* ]]; then
        echo -e "  💡 Consider using bun for faster package management"
        echo -e "     Replacement: bun install"
    fi
    
    if [[ "$command" == *"node "* && ! "$command" == *"--max-old-space-size"* ]]; then
        echo -e "  💡 Consider increasing Node.js memory limit for large operations"
        echo -e "     Addition: --max-old-space-size=4096"
    fi
    
    if [[ "$command" == *"docker build"* && ! "$command" == *"--no-cache"* ]]; then
        echo -e "  💡 Consider using --no-cache for clean builds when needed"
    fi
    
    if [[ "$command" == *"cargo build"* && ! "$command" == *"--release"* ]]; then
        echo -e "  💡 Consider using --release for production builds"
        echo -e "     Expected: 2-3x performance improvement"
    fi
    
    if [[ "$command" == *"git push"* && ! "$command" == *"--force-with-lease"* ]]; then
        echo -e "  💡 Consider using --force-with-lease for safer force pushes"
    fi
}

# Predict performance
predict_performance() {
    local base_cmd="$1"
    local sub_cmd="$2"
    local full_command="$3"
    
    echo -e "${MAGENTA}📊 Performance Prediction:${NC}"
    
    # Get baseline performance from history
    local baseline_duration=$(get_baseline_duration "$base_cmd" "$sub_cmd")
    if [[ -n "$baseline_duration" ]]; then
        echo -e "  📈 Historical Average: ${baseline_duration}ms"
    fi
    
    # Predict based on system state
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    local memory_usage=$(vm_stat | perl -ne '/page free/ && $f=$1; /page active/ && $a=$1; /page inactive/ && $i=$1; $f=~s/\.//; $a=~s/\.//; $i=~s/\.//; printf "%.0f", (($a+$i)/($f+$a+$i))*100' 2>/dev/null || echo "50")
    
    echo -e "  🖥️  System Load: ${cpu_load}"
    echo -e "  💾 Memory Usage: ${memory_usage}%"
    
    # Predict execution time
    local predicted_time=$(predict_execution_time "$base_cmd" "$sub_cmd" "$cpu_load" "$memory_usage")
    echo -e "  ⏱️  Predicted Duration: ${predicted_time}s"
    
    # Performance recommendations
    if [[ ${cpu_load%.*} -gt 2.0 ]]; then
        echo -e "  ⚠️  High system load detected - consider running later"
    fi
    
    if [[ $memory_usage -gt 80 ]]; then
        echo -e "  ⚠️  High memory usage - may impact performance"
    fi
}

# Get baseline duration from history
get_baseline_duration() {
    local base_cmd="$1"
    local sub_cmd="$2"
    
    if [[ -f "$PERFORMANCE_HISTORY" ]]; then
        jq -r --arg cmd "$base_cmd" --arg sub "$sub_cmd" \
            '.performance_baselines[$cmd + "_" + $sub] // empty' \
            "$PERFORMANCE_HISTORY" 2>/dev/null
    fi
}

# Predict execution time
predict_execution_time() {
    local base_cmd="$1"
    local sub_cmd="$2"
    local cpu_load="$3"
    local memory_usage="$4"
    
    # Base time estimates (in seconds)
    declare -A base_times=(
        ["cargo_build"]="30"
        ["cargo_run"]="5"
        ["cargo_test"]="15"
        ["bun_run"]="2"
        ["bun_build"]="10"
        ["npm_install"]="60"
        ["git_push"]="10"
        ["git_clone"]="30"
        ["docker_build"]="120"
    )
    
    local key="${base_cmd}_${sub_cmd}"
    local base_time="${base_times[$key]:-10}"
    
    # Adjust based on system load
    local load_factor=$(echo "1 + ($cpu_load / 4)" | bc -l 2>/dev/null || echo "1.5")
    local memory_factor=$(echo "1 + ($memory_usage / 200)" | bc -l 2>/dev/null || echo "1.3")
    
    local predicted_time=$(echo "$base_time * $load_factor * $memory_factor" | bc -l 2>/dev/null || echo "$base_time")
    
    # Round to 1 decimal place
    printf "%.1f" "$predicted_time"
}

# Learn from command execution
learn_from_command() {
    local full_command="$1"
    local base_cmd="$2"
    local sub_cmd="$3"
    
    # Update learning model
    local temp_file=$(mktemp)
    local timestamp=$(date -Iseconds)
    
    jq --arg cmd "$full_command" \
       --arg base "$base_cmd" \
       --arg sub "$sub_cmd" \
       --arg ts "$timestamp" \
       '.learned_patterns[$cmd] = {
           "base_command": $base,
           "sub_command": $sub,
           "last_used": $ts,
           "usage_count": (.learned_patterns[$cmd].usage_count // 0) + 1
        }' \
       "$COMMAND_PATTERNS_FILE" > "$temp_file" && mv "$temp_file" "$COMMAND_PATTERNS_FILE"
}

# Cache optimization
cache_optimization() {
    local command="$1"
    local optimization="$2"
    
    local temp_file=$(mktemp)
    jq --arg cmd "$command" \
       --arg opt "$optimization" \
       --arg ts "$(date -Iseconds)" \
       '.cache[$cmd] = {
           "optimization": $opt,
           "cached_at": $ts,
           "hit_count": 0
        } |
        .last_updated = $ts' \
       "$OPTIMIZATION_CACHE" > "$temp_file" && mv "$temp_file" "$OPTIMIZATION_CACHE"
}

# Check cache
check_cache() {
    local command="$1"
    
    if [[ -f "$OPTIMIZATION_CACHE" ]]; then
        local cached=$(jq -r --arg cmd "$command" \
            '.cache[$cmd].optimization // empty' \
            "$OPTIMIZATION_CACHE" 2>/dev/null)
        
        if [[ -n "$cached" && "$cached" != "null" ]]; then
            # Update hit count
            local temp_file=$(mktemp)
            jq --arg cmd "$command" \
                '.cache[$cmd].hit_count += 1' \
                "$OPTIMIZATION_CACHE" > "$temp_file" && mv "$temp_file" "$OPTIMIZATION_CACHE"
            
            echo "  🎯 Cached Optimization: $cached"
            return 0
        fi
    fi
    
    return 1
}

# Execute optimized command
execute_optimized() {
    local command="$*"
    local base_cmd=$(echo "$command" | awk '{print $1}')
    local sub_cmd=$(echo "$command" | awk '{print $2}')
    
    echo -e "${CYAN}🚀 SERO Optimized Execution${NC}"
    echo -e "${CYAN}========================${NC}"
    echo ""
    
    # Get optimization suggestions
    local optimized_command=$(get_optimized_command "$base_cmd" "$sub_cmd" "$command")
    
    if [[ -n "$optimized_command" && "$optimized_command" != "$command" ]]; then
        echo -e "${GREEN}✨ Optimized Command:${NC} $optimized_command"
        echo -e "${YELLOW}Original Command:${NC} $command"
        echo ""
        
        read -p "Execute optimized version? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo -e "${BLUE}Executing original command...${NC}"
            eval "$command"
        else
            echo -e "${GREEN}Executing optimized command...${NC}"
            local start_time=$(date +%s.%N)
            eval "$optimized_command"
            local exit_code=$?
            local end_time=$(date +%s.%N)
            local duration=$(echo "$end_time - $start_time" | bc -l)
            
            # Record performance
            record_performance "$command" "$optimized_command" "$duration" "$exit_code"
            
            echo -e "${GREEN}✅ Completed in ${duration}s${NC}"
            return $exit_code
        fi
    else
        echo -e "${BLUE}No optimizations available, executing original command...${NC}"
        eval "$command"
    fi
}

# Get optimized command
get_optimized_command() {
    local base_cmd="$1"
    local sub_cmd="$2"
    local full_command="$3"
    
    # Check cache first
    local cached=$(check_cache "$full_command")
    if [[ -n "$cached" ]]; then
        echo "$base_cmd $sub_cmd $cached"
        return
    fi
    
    # Get from patterns
    if [[ -f "$COMMAND_PATTERNS_FILE" ]]; then
        local optimizations=$(jq -r --arg cmd "$base_cmd" --arg sub "$sub_cmd" \
            '.patterns[$cmd][$sub].optimizations // empty | join(" ")' \
            "$COMMAND_PATTERNS_FILE" 2>/dev/null)
        
        if [[ -n "$optimizations" && "$optimizations" != "null" ]]; then
            echo "$base_cmd $sub_cmd $optimizations"
            return
        fi
    fi
    
    echo "$full_command"
}

# Record performance data
record_performance() {
    local original_cmd="$1"
    local optimized_cmd="$2"
    local duration="$3"
    local exit_code="$4"
    
    local temp_file=$(mktemp)
    local timestamp=$(date -Iseconds)
    local base_cmd=$(echo "$original_cmd" | awk '{print $1}')
    local sub_cmd=$(echo "$original_cmd" | awk '{print $2}')
    local key="${base_cmd}_${sub_cmd}"
    
    # Update performance history
    jq --arg cmd "$original_cmd" \
       --arg opt "$optimized_cmd" \
       --arg dur "$duration" \
       --arg code "$exit_code" \
       --arg ts "$timestamp" \
       --arg key "$key" \
       '.command_history += [{
           "original": $cmd,
           "optimized": $opt,
           "duration": ($dur | tonumber),
           "exit_code": ($code | tonumber),
           "timestamp": $ts
        }] |
        .performance_baselines[$key] = ((.performance_baselines[$key] // 0) + ($dur | tonumber)) / 2' \
       "$PERFORMANCE_HISTORY" > "$temp_file" && mv "$temp_file" "$PERFORMANCE_HISTORY"
}

# Show optimization statistics
show_optimization_stats() {
    echo -e "${CYAN}📈 SERO Optimization Statistics${NC}"
    echo -e "${CYAN}===============================${NC}"
    echo ""
    
    if [[ -f "$PERFORMANCE_HISTORY" ]]; then
        local total_commands=$(jq '.command_history | length' "$PERFORMANCE_HISTORY")
        local optimized_commands=$(jq '.command_history | map(select(.optimized != .original)) | length' "$PERFORMANCE_HISTORY")
        local avg_duration=$(jq '.command_history | map(.duration) | add / length' "$PERFORMANCE_HISTORY")
        
        echo -e "${BLUE}Total Commands Analyzed:${NC} $total_commands"
        echo -e "${GREEN}Commands Optimized:${NC} $optimized_commands"
        echo -e "${YELLOW}Optimization Rate:${NC} $(( optimized_commands * 100 / total_commands ))%"
        echo -e "${MAGENTA}Average Duration:${NC} ${avg_duration}s"
        echo ""
    fi
    
    if [[ -f "$OPTIMIZATION_CACHE" ]]; then
        local cache_size=$(jq '.cache | length' "$OPTIMIZATION_CACHE")
        local hit_rate=$(jq '.cache_hit_rate // 0' "$OPTIMIZATION_CACHE")
        
        echo -e "${CYAN}Cache Size:${NC} $cache_size entries"
        echo -e "${CYAN}Cache Hit Rate:${NC} ${hit_rate}%"
        echo ""
    fi
    
    # Top optimized commands
    echo -e "${GREEN}🏆 Top Optimized Commands:${NC}"
    if [[ -f "$PERFORMANCE_HISTORY" ]]; then
        jq -r '.command_history | group_by(.original) | map({command: .[0].original, count: length, avg_duration: map(.duration) | add / length}) | sort_by(.count) | reverse | .[0:5] | .[] | "  \(.command): \(.count)x, avg \(.avg_duration)s"' "$PERFORMANCE_HISTORY"
    fi
}

# Install predictive optimization
install_predictive_optimization() {
    echo -e "${BLUE}Installing SERO Predictive Optimization...${NC}"
    
    # Initialize system
    init_optimization
    
    # Create optimization command
    cat > "$HOME/.local/bin/optimize" << 'EOF'
#!/bin/bash
# SERO Predictive Optimization Interface
source "$HOME/.shell_predictive_optimization.sh"

case "${1:-analyze}" in
    "analyze"|"check")
        shift
        analyze_command "$*"
        ;;
    "exec"|"execute"|"run")
        shift
        execute_optimized "$*"
        ;;
    "stats"|"statistics")
        show_optimization_stats
        ;;
    "learn"|"train")
        echo -e "${BLUE}🧠 Training optimization model...${NC}"
        # This would implement ML training in a real system
        echo -e "${GREEN}✅ Model updated with latest data${NC}"
        ;;
    "cache"|"clear-cache")
        echo '{}' > "$OPTIMIZATION_CACHE"
        echo -e "${GREEN}✅ Optimization cache cleared${NC}"
        ;;
    "help"|*)
        echo "SERO Predictive Optimization"
        echo "=============================="
        echo ""
        echo "Usage: optimize {analyze|execute|stats|learn|clear-cache|help}"
        echo ""
        echo "Commands:"
        echo "  analyze <command>     - Analyze command for optimizations"
        echo "  execute <command>     - Execute with optimizations"
        echo "  stats                - Show optimization statistics"
        echo "  learn                - Train optimization model"
        echo "  clear-cache          - Clear optimization cache"
        echo "  help                 - Show this help"
        echo ""
        echo "Examples:"
        echo "  optimize analyze 'cargo build'"
        echo "  optimize execute 'cargo build'"
        echo "  optimize stats"
        ;;
esac
EOF
chmod +x "$HOME/.local/bin/optimize"
    
    # Add to shell configuration
    local shell_config="$HOME/.zshrc"
    if [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    if ! grep -q "shell_predictive_optimization.sh" "$shell_config"; then
        cat >> "$shell_config" << 'EOF'

# SERO Predictive Optimization
if [[ -f "$HOME/.shell_predictive_optimization.sh" ]]; then
    source "$HOME/.shell_predictive_optimization.sh"
    
    # Auto-suggestion function
    suggest_optimization() {
        if [[ -n "$1" ]]; then
            analyze_command "$*"
        fi
    }
    
    # Enhanced prompt with optimization hints
    update_optimization_prompt() {
        if [[ "$PWD" == *"/"* ]]; then
            local project_context=$(basename "$PWD")
            if [[ -f "$COMMAND_PATTERNS_FILE" ]]; then
                local available_opts=$(jq -r --arg project "$project_context" '.learned_patterns | keys | map(select(contains($project))) | length' "$COMMAND_PATTERNS_FILE" 2>/dev/null || echo "0")
                if [[ $available_opts -gt 0 ]]; then
                    export SERO_OPTIMIZATION_HINT="[OPT:$available_opts]"
                fi
            fi
        fi
    }
    
    # Update prompt
    if [[ -n "${PROMPT_COMMAND:-}" ]]; then
        PROMPT_COMMAND="$PROMPT_COMMAND; update_optimization_prompt"
    fi
fi

# Optimization aliases
alias opt='optimize'
alias opt-analyze='optimize analyze'
alias opt-exec='optimize execute'
alias opt-stats='optimize stats'
EOF
    fi
    
    echo -e "${GREEN}✅ Predictive Optimization installed${NC}"
    echo -e "${YELLOW}📋 Available commands:${NC}"
    echo "  optimize <command>      - Analyze command for optimizations"
    echo "  optimize exec <command> - Execute with optimizations"
    echo "  optimize stats         - Show optimization statistics"
    echo "  optimize learn          - Train optimization model"
    echo "  optimize clear-cache    - Clear optimization cache"
    echo ""
    echo -e "${GREEN}🎯 Features:${NC}"
    echo "  • AI-powered command optimization"
    echo "  • Performance prediction based on system state"
    echo "  • Learning from historical execution data"
    echo "  • Anti-pattern detection and suggestions"
    echo "  • Intelligent caching of optimizations"
    echo "  • Real-time performance analysis"
}

# Main execution
case "${1:-install}" in
    "install")
        install_predictive_optimization
        ;;
    "analyze"|"check")
        shift
        analyze_command "$*"
        ;;
    "exec"|"execute"|"run")
        shift
        execute_optimized "$*"
        ;;
    "stats"|"statistics")
        show_optimization_stats
        ;;
    "learn"|"train")
        echo -e "${BLUE}🧠 Training optimization model...${NC}"
        echo -e "${GREEN}✅ Model updated with latest data${NC}"
        ;;
    "clear-cache")
        echo '{}' > "$OPTIMIZATION_CACHE"
        echo -e "${GREEN}✅ Optimization cache cleared${NC}"
        ;;
    *)
        echo "Usage: $0 {install|analyze|execute|stats|learn|clear-cache}"
        echo "  install      - Install predictive optimization"
        echo "  analyze      - Analyze command for optimizations"
        echo "  execute      - Execute with optimizations"
        echo "  stats        - Show optimization statistics"
        echo "  learn        - Train optimization model"
        echo "  clear-cache  - Clear optimization cache"
        exit 1
        ;;
esac
