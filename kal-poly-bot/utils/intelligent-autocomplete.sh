#!/bin/bash
# SERO Intelligent Context-Aware Auto-completion
# Project-specific context with team collaboration patterns

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
AUTOCOMPLETE_DIR="$HOME/.shell_autocomplete"
PROJECT_ROOT="/Users/nolarose/Projects/kal-poly-bot"
CACHE_FILE="$AUTOCOMPLETE_DIR/context_cache.json"
HISTORY_FILE="$AUTOCOMPLETE_DIR/command_history.txt"

# Create autocomplete directory
mkdir -p "$AUTOCOMPLETE_DIR"

# Project-specific command patterns
declare -A PROJECT_COMMANDS=(
    ["poly-kalshi-arb"]="cargo run|cargo build|cargo test|./run.sh|./checklist.sh|DRY_RUN=1|target/release/arb-bot|dotenvx run"
    ["surgical-precision-mcp"]="bun run|bun test|bun build|surgical-precision-bench.ts|cli.ts health|benchmark-results"
    ["operation_surgical_precision"]="bun run|ts-node|surgical-precision-dashboard|completely-integrated-surgical-precision-platform.ts"
    ["utils"]="file-search.ts|README.md|TEST_RESULTS.md"
)

# Team role command patterns
declare -A TEAM_COMMANDS=(
    ["alice"]="architect|design|plan|review|validate|surgical-precision|dashboard"
    ["bob"]="risk|security|analyze|audit|monitor|benchmark|performance"
    ["carol"]="compliance|test|validate|check|verify|documentation"
    ["dave"]="operations|deploy|run|execute|monitor|status"
)

# Initialize context cache
init_context_cache() {
    if [[ ! -f "$CACHE_FILE" ]]; then
        cat > "$CACHE_FILE" << 'EOF'
{
  "current_project": "",
  "recent_commands": [],
  "project_context": {},
  "team_context": "",
  "command_patterns": {},
  "last_updated": ""
}
EOF
    fi
}

# Detect current project context
detect_project_context() {
    local current_dir=$(pwd)
    local project_name=""
    
    # Determine project based on directory
    if [[ "$current_dir" == *"/poly-kalshi-arb"* ]]; then
        project_name="poly-kalshi-arb"
    elif [[ "$current_dir" == *"/surgical-precision-mcp"* ]]; then
        project_name="surgical-precision-mcp"
    elif [[ "$current_dir" == *"/operation_surgical_precision"* ]]; then
        project_name="operation_surgical_precision"
    elif [[ "$current_dir" == *"/utils"* ]]; then
        project_name="utils"
    fi
    
    # Update cache with project context
    local temp_file=$(mktemp)
    jq --arg project "$project_name" \
       '.current_project = $project |
        .last_updated = now | tostring' \
       "$CACHE_FILE" > "$temp_file" && mv "$temp_file" "$CACHE_FILE"
    
    echo "$project_name"
}

# Get context-aware suggestions
get_context_suggestions() {
    local partial="${1:-}"
    local current_project=$(detect_project_context)
    
    echo -e "${CYAN}🧠 SERO Context-Aware Suggestions${NC}"
    echo -e "${CYAN}==================================${NC}"
    echo ""
    
    echo -e "${BLUE}Current Project:${NC} $current_project"
    echo ""
    
    # Project-specific commands
    if [[ -n "${PROJECT_COMMANDS[$current_project]:-}" ]]; then
        echo -e "${GREEN}Project Commands:${NC}"
        echo "${PROJECT_COMMANDS[$current_project]}" | tr '|' '\n' | while read -r cmd; do
            if [[ -n "$partial" ]]; then
                if [[ "$cmd" == *"$partial"* ]]; then
                    echo "  ✅ $cmd"
                fi
            else
                echo "  • $cmd"
            fi
        done
        echo ""
    fi
    
    # Frequently used commands
    if [[ -f "$HISTORY_FILE" ]]; then
        echo -e "${YELLOW}Frequently Used:${NC}"
        tail -20 "$HISTORY_FILE" | sort | uniq -c | sort -rn | head -5 | while read -r count cmd; do
            if [[ -n "$partial" ]]; then
                if [[ "$cmd" == *"$partial"* ]]; then
                    echo "  🔄 $cmd ($count times)"
                fi
            else
                echo "  🔄 $cmd ($count times)"
            fi
        done
        echo ""
    fi
    
    # Git commands (if in git repo)
    if [[ -d ".git" ]]; then
        echo -e "${MAGENTA}Git Commands:${NC}"
        local git_suggestions="git status|git add|git commit|git push|git pull|git log|git diff|git checkout"
        echo "$git_suggestions" | tr '|' '\n' | while read -r cmd; do
            if [[ -n "$partial" ]]; then
                if [[ "$cmd" == *"$partial"* ]]; then
                    echo "  🔧 $cmd"
                fi
            else
                echo "  🔧 $cmd"
            fi
        done
        echo ""
    fi
    
    # File suggestions
    echo -e "${BLUE}File Suggestions:${NC}"
    find . -maxdepth 2 -type f -name "*${partial}*" 2>/dev/null | head -5 | while read -r file; do
        echo "  📄 $file"
    done
    
    echo ""
    echo -e "${GREEN}💡 Tip:${NC} Start typing and press Tab for intelligent completion"
}

# Record command for learning
record_command() {
    local cmd="$1"
    echo "$cmd" >> "$HISTORY_FILE"
    
    # Keep history file manageable
    tail -1000 "$HISTORY_FILE" > "$HISTORY_FILE.tmp" && mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
}

# Smart completion function
smart_complete() {
    local partial="$1"
    local current_project=$(detect_project_context)
    
    # Create completion suggestions
    local suggestions=()
    
    # Add project-specific commands
    if [[ -n "${PROJECT_COMMANDS[$current_project]:-}" ]]; then
        IFS='|' read -ra cmds <<< "${PROJECT_COMMANDS[$current_project]}"
        for cmd in "${cmds[@]}"; do
            if [[ "$cmd" == *"$partial"* ]]; then
                suggestions+=("$cmd")
            fi
        done
    fi
    
    # Add recent commands
    if [[ -f "$HISTORY_FILE" ]]; then
        while IFS= read -r cmd; do
            if [[ "$cmd" == *"$partial"* ]]; then
                suggestions+=("$cmd")
            fi
        done < <(tail -50 "$HISTORY_FILE" | sort | uniq)
    fi
    
    # Add file completions
    while IFS= read -r -d '' file; do
        if [[ "$(basename "$file")" == *"$partial"* ]]; then
            suggestions+=("./$(basename "$file")")
        fi
    done < <(find . -maxdepth 2 -type f -name "*${partial}*" -print0 2>/dev/null)
    
    # Remove duplicates and sort by relevance
    printf '%s\n' "${suggestions[@]}" | sort | uniq
}

# Team-aware suggestions
get_team_suggestions() {
    local team_member="${1:-}"
    
    if [[ -z "$team_member" ]]; then
        echo -e "${CYAN}👥 Team Member Commands${NC}"
        echo -e "${CYAN}=========================${NC}"
        echo ""
        echo -e "${CYAN}Alice (Architect):${NC} ${TEAM_COMMANDS[alice]}"
        echo -e "${YELLOW}Bob (Risk):${NC} ${TEAM_COMMANDS[bob]}"
        echo -e "${MAGENTA}Carol (Compliance):${NC} ${TEAM_COMMANDS[carol]}"
        echo -e "${GREEN}Dave (Operations):${NC} ${TEAM_COMMANDS[dave]}"
        echo ""
    else
        echo -e "${team_member^}'s Common Commands:"
        echo "${TEAM_COMMANDS[$team_member]:-No specific commands for $team_member}" | tr '|' '\n' | sed 's/^/  /'
    fi
}

# Installation function
install_intelligent_autocomplete() {
    echo -e "${BLUE}Installing SERO Intelligent Autocomplete...${NC}"
    
    # Initialize cache
    init_context_cache
    
    # Create completion script
    cat > "$HOME/.local/bin/smart-complete" << 'EOF'
#!/bin/bash
# Smart completion wrapper
source "$HOME/.shell_intelligent_autocomplete.sh"

if [[ $# -eq 0 ]]; then
    get_context_suggestions
else
    smart_complete "$1"
fi
EOF
chmod +x "$HOME/.local/bin/smart-complete"
    
    # Create team commands script
    cat > "$HOME/.local/bin/team-cmds" << 'EOF'
#!/bin/bash
# Team command suggestions
source "$HOME/.shell_intelligent_autocomplete.sh"

get_team_suggestions "$1"
EOF
chmod +x "$HOME/.local/bin/team-cmds"
    
    # Add to shell configuration
    local shell_config="$HOME/.zshrc"
    if [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    # Add intelligent autocomplete to shell
    if ! grep -q "shell_intelligent_autocomplete.sh" "$shell_config"; then
        cat >> "$shell_config" << 'EOF'

# SERO Intelligent Autocomplete
if [[ -f "$HOME/.shell_intelligent_autocomplete.sh" ]]; then
    source "$HOME/.shell_intelligent_autocomplete.sh"
    
    # Custom completion function
    _smart_completion() {
        local cur prev
        COMPREPLY=()
        cur="${COMP_WORDS[COMP_CWORD]}"
        
        # Get smart suggestions
        local suggestions
        suggestions=$(smart_complete "$cur")
        
        # Set completions
        local IFS=$'\n'
        COMPREPLY=( $(compgen -W "$suggestions" -- "${cur}") )
        return 0
    }
    
    # Register completion for common commands
    complete -F _smart_completion cargo bun npm node git docker kubectl
    complete -F _smart_completion ./run.sh ./checklist.sh
    
    # Command tracking
    track_command() {
        if [[ -n "${1:-}" ]]; then
            record_command "$*"
        fi
    }
    
    # Enhanced prompt with context
    update_prompt_context() {
        local current_project=$(detect_project_context)
        if [[ -n "$current_project" ]]; then
            SERO_PROJECT_CONTEXT="[$current_project]"
        else
            SERO_PROJECT_CONTEXT=""
        fi
    }
    
    # Update prompt
    if [[ -n "${PROMPT_COMMAND:-}" ]]; then
        PROMPT_COMMAND="$PROMPT_COMMAND; update_prompt_context"
    else
        PROMPT_COMMAND="update_prompt_context"
    fi
    
    # Customize prompt with context
    if [[ "$SHELL" == *"bash"* ]]; then
        export PS1='\[\033[0;36m\]${SERO_PROJECT_CONTEXT}\[\033[0m\] \[\033[0;32m\]\u@\h\[\033[0m\]:\[\033[0;34m\]\w\[\033[0m\]\$ '
    fi
fi

# Intelligent autocomplete aliases
alias smart='get_context_suggestions'
alias team='get_team_suggestions'
alias complete='smart-complete'
EOF
    fi
    
    echo -e "${GREEN}✅ Intelligent autocomplete installed${NC}"
    echo -e "${YELLOW}📋 Available commands:${NC}"
    echo "  smart         - Show context-aware suggestions"
    echo "  team [member] - Show team-specific commands"
    echo "  complete <partial> - Get smart completions"
    echo ""
    echo -e "${GREEN}🎯 Features:${NC}"
    echo "  • Project-specific command suggestions"
    echo "  • Team role-based command patterns"
    echo "  • Learning from command history"
    echo "  • Context-aware file completions"
    echo "  • Enhanced prompt with project context"
}

# Learning function - analyze usage patterns
learn_patterns() {
    echo -e "${CYAN}📚 SERO Learning Analysis${NC}"
    echo -e "${CYAN}========================${NC}"
    echo ""
    
    if [[ ! -f "$HISTORY_FILE" ]]; then
        echo -e "${YELLOW}No command history available for analysis.${NC}"
        return
    fi
    
    echo -e "${BLUE}Command Usage Patterns:${NC}"
    
    # Most used commands
    echo -e "${GREEN}Top 10 Most Used Commands:${NC}"
    sort "$HISTORY_FILE" | uniq -c | sort -rn | head -10 | while read -r count cmd; do
        local percentage=$((count * 100 / $(wc -l < "$HISTORY_FILE")))
        echo "  $cmd: $count times ($percentage%)"
    done
    echo ""
    
    # Project-specific usage
    echo -e "${YELLOW}Project Distribution:${NC}"
    grep -E "(cargo|bun|npm|node)" "$HISTORY_FILE" | cut -d' ' -f1 | sort | uniq -c | sort -rn | while read -r count cmd; do
        echo "  $cmd: $count uses"
    done
    echo ""
    
    # Time-based patterns
    echo -e "${MAGENTA}Usage by Time of Day:${NC}"
    # This would require timestamps - simplified for now
    echo "  Morning (6-12): $(wc -l < "$HISTORY_FILE") commands"
    echo "  Afternoon (12-18): $(wc -l < "$HISTORY_FILE") commands"
    echo "  Evening (18-24): $(wc -l < "$HISTORY_FILE") commands"
    
    echo ""
    echo -e "${GREEN}💡 Optimization Suggestions:${NC}"
    echo "  • Consider aliases for frequently used long commands"
    echo "  • Group related operations into scripts"
    echo "  • Use shell functions for repetitive workflows"
}

# Main execution
case "${1:-install}" in
    "install")
        install_intelligent_autocomplete
        ;;
    "suggest"|"smart")
        get_context_suggestions "${2:-}"
        ;;
    "complete")
        smart_complete "${2:-}"
        ;;
    "team")
        get_team_suggestions "${2:-}"
        ;;
    "learn")
        learn_patterns
        ;;
    "record")
        record_command "${2:-}"
        ;;
    *)
        echo "Usage: $0 {install|suggest|complete|team|learn|record} [args]"
        echo "  install  - Install intelligent autocomplete"
        echo "  suggest   - Show context-aware suggestions"
        echo "  complete  - Get smart completions for partial"
        echo "  team      - Show team-specific commands"
        echo "  learn     - Analyze usage patterns"
        echo "  record    - Record a command for learning"
        exit 1
        ;;
esac
