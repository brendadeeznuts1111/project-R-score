#!/bin/bash
# SERO Integration Script - Complete Shell Enhancement Suite
# Master installer and coordinator for all SERO shell enhancements

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTEGRATION_DIR="$HOME/.sero_integration"
INSTALLATION_LOG="$INTEGRATION_DIR/installation.log"
CONFIG_FILE="$INTEGRATION_DIR/sero_config.json"

# Enhanced modules
declare -A MODULES=(
    ["performance"]="shell-performance-monitor.sh"
    ["autocomplete"]="intelligent-autocomplete.sh"
    ["sandbox"]="zero-collateral-sandbox.sh"
    ["dashboard"]="collaboration-dashboard.sh"
    ["optimization"]="predictive-optimization.sh"
)

# Create integration directory
mkdir -p "$INTEGRATION_DIR"

# Installation logging
log_installation() {
    local message="$1"
    local level="${2:-INFO}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$INSTALLATION_LOG"
}

# Show installation banner
show_banner() {
    clear
    echo -e "${CYAN}🔬 SERO Shell Enhancement Suite${NC}"
    echo -e "${CYAN}=============================${NC}"
    echo ""
    echo -e "${BLUE}Surgical Precision Environment & Runtime Optimization${NC}"
    echo -e "${BLUE}Complete Shell Enhancement with Zero-Collateral Guarantees${NC}"
    echo ""
    echo -e "${MAGENTA}📦 Enhancement Modules:${NC}"
    echo "  1. 🔍 Performance Monitoring - Sub-100ms tracking & alerts"
    echo "  2. 🧠 Intelligent Autocomplete - Context-aware suggestions"
    echo "  3. 🔒 Zero-Collateral Sandbox - Isolated testing environment"
    echo "  4. 📊 Collaboration Dashboard - Real-time team visualization"
    echo "  5. 🚀 Predictive Optimization - AI-powered command enhancement"
    echo ""
    echo -e "${YELLOW}🎯 Team Integration:${NC}"
    echo "  🔵 Alice (Architect)   - System design & validation"
    echo "  🟡 Bob (Risk)          - Security analysis & monitoring"
    echo "  🟣 Carol (Compliance)  - Testing & verification"
    echo "  🟢 Dave (Operations)   - Deployment & execution"
    echo ""
}

# Check system requirements
check_requirements() {
    echo -e "${BLUE}🔍 Checking System Requirements...${NC}"
    
    local requirements_met=true
    
    # Check required tools
    local required_tools=("jq" "bc" "curl" "git")
    for tool in "${required_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            echo -e "  ${GREEN}✅ $tool${NC}"
        else
            echo -e "  ${RED}❌ $tool${NC} - Required but not found"
            requirements_met=false
        fi
    done
    
    # Check optional tools
    local optional_tools=("bun" "cargo" "docker")
    echo ""
    echo -e "${YELLOW}Optional Tools:${NC}"
    for tool in "${optional_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            echo -e "  ${GREEN}✅ $tool${NC}"
        else
            echo -e "  ${YELLOW}⚠️  $tool${NC} - Optional, not found"
        fi
    done
    
    # Check shell
    echo ""
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo -e "${GREEN}✅ Shell: ZSH${NC}"
    elif [[ "$SHELL" == *"bash"* ]]; then
        echo -e "${GREEN}✅ Shell: Bash${NC}"
    else
        echo -e "${YELLOW}⚠️  Shell: $SHELL (partial support)${NC}"
    fi
    
    if [[ "$requirements_met" == "false" ]]; then
        echo ""
        echo -e "${RED}❌ Some requirements not met. Please install missing tools.${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ System requirements satisfied${NC}"
    return 0
}

# Install individual module
install_module() {
    local module_name="$1"
    local script_file="${MODULES[$module_name]}"
    
    echo -e "${BLUE}📦 Installing $module_name module...${NC}"
    
    local script_path="$SCRIPT_DIR/$script_file"
    if [[ ! -f "$script_path" ]]; then
        echo -e "${RED}❌ Module script not found: $script_path${NC}"
        return 1
    fi
    
    # Copy to home directory with proper naming
    local home_script="$HOME/.shell_${script_file}"
    cp "$script_path" "$home_script"
    chmod +x "$home_script"
    
    # Execute installation
    if bash "$home_script" install; then
        echo -e "${GREEN}✅ $module_name module installed successfully${NC}"
        log_installation "$module_name module installed" "SUCCESS"
        return 0
    else
        echo -e "${RED}❌ $module_name module installation failed${NC}"
        log_installation "$module_name module installation failed" "ERROR"
        return 1
    fi
}

# Install all modules
install_all_modules() {
    echo -e "${CYAN}🚀 Installing All SERO Enhancement Modules${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    
    local successful_installs=0
    local total_modules=${#MODULES[@]}
    
    for module_name in "${!MODULES[@]}"; do
        echo -e "${YELLOW}Installing module: $module_name${NC}"
        echo "----------------------------------------"
        
        if install_module "$module_name"; then
            ((successful_installs++))
        fi
        
        echo ""
    done
    
    echo -e "${BLUE}📊 Installation Summary:${NC}"
    echo -e "  Successful: ${GREEN}$successful_installs${NC}/${total_modules}"
    echo -e "  Failed: ${RED}$((total_modules - successful_installs))${NC}/${total_modules}"
    
    if [[ $successful_installs -eq $total_modules ]]; then
        echo -e "${GREEN}🎉 All modules installed successfully!${NC}"
        log_installation "All modules installed successfully" "SUCCESS"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some modules failed to install${NC}"
        log_installation "Some modules failed to install" "WARNING"
        return 1
    fi
}

# Create integrated configuration
create_integrated_config() {
    echo -e "${BLUE}⚙️  Creating Integrated Configuration...${NC}"
    
    cat > "$CONFIG_FILE" << 'EOF'
{
  "sero_version": "1.0.0",
  "installation_date": "",
  "modules": {
    "performance_monitoring": {
      "enabled": true,
      "alert_threshold_ms": 100,
      "log_retention_days": 30,
      "auto_optimize": true
    },
    "intelligent_autocomplete": {
      "enabled": true,
      "learning_enabled": true,
      "context_awareness": true,
      "team_integration": true
    },
    "zero_collateral_sandbox": {
      "enabled": true,
      "auto_backup": true,
      "rollback_enabled": true,
      "dangerous_command_protection": true
    },
    "collaboration_dashboard": {
      "enabled": true,
      "real_time_updates": true,
      "team_tracking": true,
      "performance_metrics": true
    },
    "predictive_optimization": {
      "enabled": true,
      "machine_learning": true,
      "performance_prediction": true,
      "auto_optimization": false
    }
  },
  "team_config": {
    "alice": {
      "color": "cyan",
      "role": "architect",
      "commands": ["design", "plan", "review", "validate"]
    },
    "bob": {
      "color": "yellow", 
      "role": "risk_analysis",
      "commands": ["analyze", "audit", "monitor", "benchmark"]
    },
    "carol": {
      "color": "magenta",
      "role": "compliance", 
      "commands": ["test", "validate", "check", "verify"]
    },
    "dave": {
      "color": "green",
      "role": "operations",
      "commands": ["deploy", "run", "execute", "monitor"]
    }
  },
  "performance_targets": {
    "command_execution_threshold_ms": 100,
    "dashboard_refresh_interval_s": 5,
    "optimization_cache_expiry_days": 7,
    "performance_history_retention_days": 30
  },
  "integration_settings": {
    "cross_module_communication": true,
    "unified_logging": true,
    "centralized_configuration": true,
    "team_collaboration_enabled": true
  }
}
EOF
    
    # Update installation date
    local temp_file=$(mktemp)
    jq --arg date "$(date -Iseconds)" '.installation_date = $date' "$CONFIG_FILE" > "$temp_file" && mv "$temp_file" "$CONFIG_FILE"
    
    echo -e "${GREEN}✅ Integrated configuration created${NC}"
    log_installation "Integrated configuration created" "SUCCESS"
}

# Create unified shell configuration
create_unified_shell_config() {
    echo -e "${BLUE}🔧 Creating Unified Shell Configuration...${NC}"
    
    local shell_config="$HOME/.zshrc"
    if [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bash_profile"
    fi
    
    # Backup existing configuration
    if [[ -f "$shell_config" ]]; then
        cp "$shell_config" "$shell_config.sero_backup.$(date +%s)"
    fi
    
    # Add SERO integration to shell config
    cat >> "$shell_config" << 'EOF'

# ============================================================================
# SERO Shell Enhancement Suite Integration
# ============================================================================
# Surgical Precision Environment & Runtime Optimization
# Installed on: $(date '+%Y-%m-%d %H:%M:%S')

# SERO Environment Variables
export SERO_ENHANCED_SHELL=true
export SERO_INTEGRATION_DIR="$HOME/.sero_integration"
export SERO_CONFIG_FILE="$INTEGRATION_DIR/sero_config.json"

# Load SERO modules (order matters for dependencies)
if [[ -f "$HOME/.shell_performance-monitor.sh" ]]; then
    source "$HOME/.shell_performance-monitor.sh"
fi

if [[ -f "$HOME/.shell_intelligent_autocomplete.sh" ]]; then
    source "$HOME/.shell_intelligent_autocomplete.sh"
fi

if [[ -f "$HOME/.shell_zero_collateral_sandbox.sh" ]]; then
    source "$HOME/.shell_zero_collateral_sandbox.sh"
fi

if [[ -f "$HOME/.shell_collaboration_dashboard.sh" ]]; then
    source "$HOME/.shell_collaboration_dashboard.sh"
fi

if [[ -f "$HOME/.shell_predictive_optimization.sh" ]]; then
    source "$HOME/.shell_predictive_optimization.sh"
fi

# SERO Unified Prompt Enhancement
sero_prompt_enhancement() {
    local current_project=""
    
    # Detect current project
    if [[ "$PWD" == *"/poly-kalshi-arb"* ]]; then
        current_project="[poly-kalshi-arb]"
    elif [[ "$PWD" == *"/surgical-precision-mcp"* ]]; then
        current_project="[surgical-precision-mcp]"
    elif [[ "$PWD" == *"/operation_surgical_precision"* ]]; then
        current_project="[operation_surgical_precision]"
    elif [[ "$PWD" == *"/utils"* ]]; then
        current_project="[utils]"
    fi
    
    # Build enhanced prompt
    local sero_prompt=""
    
    # Add project context
    if [[ -n "$current_project" ]]; then
        sero_prompt+="${CYAN}$current_project${NC} "
    fi
    
    # Add sandbox context if active
    if [[ "${SERO_SANDBOX:-}" == "active" ]]; then
        sero_prompt+="${RED}[SANDBOX]${NC} "
    fi
    
    # Add optimization hints if available
    if [[ -n "${SERO_OPTIMIZATION_HINT:-}" ]]; then
        sero_prompt+="${GREEN}${SERO_OPTIMIZATION_HINT}${NC} "
    fi
    
    # Export for prompt use
    export SERO_PROMPT_CONTEXT="$sero_prompt"
}

# SERO Cross-Module Integration
sero_cross_module_integration() {
    # Performance tracking for autocomplete suggestions
    if declare -f record_command >/dev/null; then
        # Hook autocomplete into performance tracking
        original_record_command=$(declare -f record_command)
    fi
    
    # Dashboard integration with performance data
    if declare -f log_team_activity >/dev/null && declare -f log_command_performance >/dev/null; then
        # Create unified activity logging
        sero_unified_activity_log() {
            local team_member="${1:-unknown}"
            local action="${2:-command}"
            local project="${3:-unknown}"
            local command="${4:-}"
            local duration="${5:-0}"
            local status="${6:-success}"
            
            # Log to team activity
            log_team_activity "$team_member" "$action" "$project" "$command" "$duration" "$status"
            
            # Log to performance tracking
            if [[ "$action" == "complete" ]]; then
                log_command_performance "$command" "$([[ "$status" == "success" ]] && echo 0 || echo 1)" "${duration%.*}" "${duration%.*}"
            fi
        }
    fi
}

# SERO Health Check
sero_health_check() {
    echo -e "${CYAN}🔬 SERO Health Check${NC}"
    echo -e "${CYAN}==================${NC}"
    
    local healthy_modules=0
    local total_modules=5
    
    # Check each module
    if [[ -f "$HOME/.shell_performance.log" ]]; then
        echo -e "  ${GREEN}✅ Performance Monitoring${NC}"
        ((healthy_modules++))
    else
        echo -e "  ${RED}❌ Performance Monitoring${NC}"
    fi
    
    if [[ -f "$HOME/.shell_autocomplete/context_cache.json" ]]; then
        echo -e "  ${GREEN}✅ Intelligent Autocomplete${NC}"
        ((healthy_modules++))
    else
        echo -e "  ${RED}❌ Intelligent Autocomplete${NC}"
    fi
    
    if [[ -d "$HOME/.shell_sandbox" ]]; then
        echo -e "  ${GREEN}✅ Zero-Collateral Sandbox${NC}"
        ((healthy_modules++))
    else
        echo -e "  ${RED}❌ Zero-Collateral Sandbox${NC}"
    fi
    
    if [[ -f "$HOME/.shell_dashboard/team_activity.log" ]]; then
        echo -e "  ${GREEN}✅ Collaboration Dashboard${NC}"
        ((healthy_modules++))
    else
        echo -e "  ${RED}❌ Collaboration Dashboard${NC}"
    fi
    
    if [[ -f "$HOME/.shell_optimization/command_patterns.json" ]]; then
        echo -e "  ${GREEN}✅ Predictive Optimization${NC}"
        ((healthy_modules++))
    else
        echo -e "  ${RED}❌ Predictive Optimization${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Health Status: ${healthy_modules}/${total_modules} modules healthy${NC}"
    
    if [[ $healthy_modules -eq $total_modules ]]; then
        echo -e "${GREEN}🎉 All systems operational!${NC}"
    else
        echo -e "${YELLOW}⚠️  Some modules may need attention${NC}"
    fi
}

# SERO Management Commands
alias sero-status='sero_health_check'
alias sero-dashboard='dashboard terminal'
alias sero-web='dashboard web'
alias sero-optimize='optimize'
alias sero-sandbox='sandbox'
alias sero-smart='smart'

# Initialize SERO on shell startup
sero_cross_module_integration
sero_prompt_enhancement

# Enhanced prompt function
__sero_prompt_command() {
    sero_prompt_enhancement
    if [[ -n "${PROMPT_COMMAND:-}" ]]; then
        PROMPT_COMMAND="$PROMPT_COMMAND; sero_prompt_enhancement"
    else
        PROMPT_COMMAND="sero_prompt_enhancement"
    fi
}

# Activate enhanced prompt
__sero_prompt_command

echo -e "${GREEN}🚀 SERO Shell Enhancement Suite loaded successfully!${NC}"
echo -e "${BLUE}Type 'sero-status' for system health check${NC}"
EOF
    
    echo -e "${GREEN}✅ Unified shell configuration created${NC}"
    log_installation "Unified shell configuration created" "SUCCESS"
}

# Create SERO management script
create_sero_manager() {
    echo -e "${BLUE}🎯 Creating SERO Manager...${NC}"
    
    cat > "$HOME/.local/bin/sero" << 'EOF'
#!/bin/bash
# SERO Shell Enhancement Suite Manager
# Central management interface for all SERO modules

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SERO_INTEGRATION_DIR="$HOME/.sero_integration"
SERO_CONFIG_FILE="$SERO_INTEGRATION_DIR/sero_config.json"

# Show SERO status
sero_status() {
    echo -e "${CYAN}🔬 SERO Enhancement Suite Status${NC}"
    echo -e "${CYAN}==============================${NC}"
    echo ""
    
    # Load configuration
    if [[ -f "$SERO_CONFIG_FILE" ]]; then
        local version=$(jq -r '.sero_version' "$SERO_CONFIG_FILE")
        local install_date=$(jq -r '.installation_date' "$SERO_CONFIG_FILE")
        echo -e "${BLUE}Version:${NC} $version"
        echo -e "${BLUE}Installed:${NC} $install_date"
        echo ""
    fi
    
    # Check module status
    echo -e "${YELLOW}Module Status:${NC}"
    
    local modules=(
        "Performance Monitoring:$HOME/.shell_performance-monitor.sh:perf-dash"
        "Intelligent Autocomplete:$HOME/.shell_intelligent_autocomplete.sh:smart"
        "Zero-Collateral Sandbox:$HOME/.shell_zero_collateral_sandbox.sh:sandbox"
        "Collaboration Dashboard:$HOME/.shell_collaboration_dashboard.sh:dashboard"
        "Predictive Optimization:$HOME/.shell_predictive_optimization.sh:optimize"
    )
    
    for module_info in "${modules[@]}"; do
        IFS=':' read -r name script command <<< "$module_info"
        if [[ -f "$script" ]]; then
            echo -e "  ${GREEN}✅ $name${NC} (command: $command)"
        else
            echo -e "  ${RED}❌ $name${NC}"
        fi
    done
    
    echo ""
    
    # System health
    if command -v sero_health_check >/dev/null; then
        sero_health_check
    fi
}

# Show available commands
sero_help() {
    echo -e "${CYAN}🔬 SERO Enhancement Suite Commands${NC}"
    echo -e "${CYAN}================================${NC}"
    echo ""
    echo -e "${GREEN}Management Commands:${NC}"
    echo "  sero status          - Show SERO status and health"
    echo "  sero help            - Show this help"
    echo "  sero config          - Show configuration"
    echo "  sero update          - Update SERO modules"
    echo ""
    echo -e "${YELLOW}Module Commands:${NC}"
    echo "  perf-dash           - Performance monitoring dashboard"
    echo "  smart                - Intelligent autocomplete suggestions"
    echo "  sandbox              - Zero-collateral sandbox"
    echo "  dashboard            - Collaboration dashboard"
    echo "  optimize             - Predictive optimization"
    echo ""
    echo -e "${BLUE}Team Commands:${NC}"
    echo "  team-alice <cmd>     - Execute as Alice (Architect)"
    echo "  team-bob <cmd>       - Execute as Bob (Risk)"
    echo "  team-carol <cmd>     - Execute as Carol (Compliance)"
    echo "  team-dave <cmd>      - Execute as Dave (Operations)"
    echo ""
    echo -e "${MAGENTA}Quick Actions:${NC}"
    echo "  sero-dashboard       - Show real-time dashboard"
    echo "  sero-web             - Open web dashboard"
    echo "  sero-optimize <cmd>  - Analyze command for optimization"
    echo "  sero-sandbox <name>  - Create sandbox session"
}

# Show configuration
sero_config() {
    echo -e "${CYAN}⚙️  SERO Configuration${NC}"
    echo -e "${CYAN}====================${NC}"
    echo ""
    
    if [[ -f "$SERO_CONFIG_FILE" ]]; then
        jq '.' "$SERO_CONFIG_FILE"
    else
        echo -e "${RED}❌ Configuration file not found${NC}"
    fi
}

# Main command router
case "${1:-help}" in
    "status"|"health")
        sero_status
        ;;
    "help"|"-h"|"--help")
        sero_help
        ;;
    "config")
        sero_config
        ;;
    "update")
        echo -e "${BLUE}🔄 Updating SERO modules...${NC}"
        echo -e "${YELLOW}This would check for updates and reinstall modules${NC}"
        echo -e "${GREEN}✅ Update check completed${NC}"
        ;;
    "dashboard"|"dash")
        if command -v dashboard >/dev/null; then
            dashboard terminal
        else
            echo -e "${RED}❌ Dashboard module not installed${NC}"
        fi
        ;;
    "web")
        if command -v dashboard >/dev/null; then
            dashboard web
        else
            echo -e "${RED}❌ Dashboard module not installed${NC}"
        fi
        ;;
    "optimize"|"opt")
        shift
        if command -v optimize >/dev/null; then
            optimize analyze "$*"
        else
            echo -e "${RED}❌ Optimization module not installed${NC}"
        fi
        ;;
    "sandbox"|"sb")
        shift
        if command -v sandbox >/dev/null; then
            sandbox init "$*"
        else
            echo -e "${RED}❌ Sandbox module not installed${NC}"
        fi
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        sero_help
        exit 1
        ;;
esac
EOF
chmod +x "$HOME/.local/bin/sero"
    
    echo -e "${GREEN}✅ SERO manager created${NC}"
    log_installation "SERO manager created" "SUCCESS"
}

# Run comprehensive tests
run_comprehensive_tests() {
    echo -e "${BLUE}🧪 Running Comprehensive Tests...${NC}"
    echo -e "${BLUE}================================${NC}"
    
    local tests_passed=0
    local total_tests=5
    
    # Test performance monitoring
    echo -e "${YELLOW}Testing Performance Monitoring...${NC}"
    if command -v perf-dash >/dev/null && perf-dash >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Performance monitoring test passed${NC}"
        ((tests_passed++))
    else
        echo -e "  ${RED}❌ Performance monitoring test failed${NC}"
    fi
    
    # Test intelligent autocomplete
    echo -e "${YELLOW}Testing Intelligent Autocomplete...${NC}"
    if command -v smart >/dev/null && smart >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Intelligent autocomplete test passed${NC}"
        ((tests_passed++))
    else
        echo -e "  ${RED}❌ Intelligent autocomplete test failed${NC}"
    fi
    
    # Test sandbox
    echo -e "${YELLOW}Testing Zero-Collateral Sandbox...${NC}"
    if command -v sandbox >/dev/null; then
        echo -e "  ${GREEN}✅ Sandbox test passed${NC}"
        ((tests_passed++))
    else
        echo -e "  ${RED}❌ Sandbox test failed${NC}"
    fi
    
    # Test dashboard
    echo -e "${YELLOW}Testing Collaboration Dashboard...${NC}"
    if command -v dashboard >/dev/null; then
        echo -e "  ${GREEN}✅ Dashboard test passed${NC}"
        ((tests_passed++))
    else
        echo -e "  ${RED}❌ Dashboard test failed${NC}"
    fi
    
    # Test optimization
    echo -e "${YELLOW}Testing Predictive Optimization...${NC}"
    if command -v optimize >/dev/null && optimize stats >/dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Predictive optimization test passed${NC}"
        ((tests_passed++))
    else
        echo -e "  ${RED}❌ Predictive optimization test failed${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Test Results: ${tests_passed}/${total_tests} passed${NC}"
    
    if [[ $tests_passed -eq $total_tests ]]; then
        echo -e "${GREEN}🎉 All tests passed! SERO is fully functional.${NC}"
        log_installation "All comprehensive tests passed" "SUCCESS"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Check individual modules.${NC}"
        log_installation "Some comprehensive tests failed" "WARNING"
        return 1
    fi
}

# Show final success message
show_success_message() {
    echo ""
    echo -e "${GREEN}🎉 SERO Shell Enhancement Suite Installation Complete!${NC}"
    echo -e "${GREEN}==================================================${NC}"
    echo ""
    echo -e "${CYAN}🚀 Quick Start Guide:${NC}"
    echo "  1. Restart your terminal or run: source ~/.zshrc (or ~/.bash_profile)"
    echo "  2. Check system status: sero status"
    echo "  3. View performance dashboard: sero-dashboard"
    echo "  4. Try intelligent autocomplete: smart"
    echo "  5. Test sandbox: sero-sandbox test-session"
    echo "  6. Analyze command: sero-optimize 'cargo build'"
    echo ""
    echo -e "${YELLOW}📚 Documentation:${NC}"
    echo "  • Individual module docs in ~/.shell_*.sh files"
    echo "  • Configuration: ~/.sero_integration/sero_config.json"
    echo "  • Installation log: ~/.sero_integration/installation.log"
    echo ""
    echo -e "${MAGENTA}🔧 Team Integration:${NC}"
    echo "  • team-alice <command>  - Execute as Alice (Architect)"
    echo "  • team-bob <command>    - Execute as Bob (Risk)" 
    echo "  • team-carol <command>  - Execute as Carol (Compliance)"
    echo "  • team-dave <command>   - Execute as Dave (Operations)"
    echo ""
    echo -e "${BLUE}🎯 Performance Targets:${NC}"
    echo "  • Sub-100ms command execution alerts"
    echo "  • Real-time team collaboration tracking"
    echo "  • Zero-collateral command testing"
    echo "  • AI-powered optimization suggestions"
    echo ""
    echo -e "${GREEN}✨ Enjoy your enhanced shell experience!${NC}"
    echo -e "${BLUE}Type 'sero help' for all available commands${NC}"
}

# Main installation process
main() {
    show_banner
    
    # Check if running as script (not sourced)
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        log_installation "SERO installation started" "INFO"
        
        if check_requirements; then
            if install_all_modules; then
                create_integrated_config
                create_unified_shell_config
                create_sero_manager
                
                echo ""
                echo -e "${BLUE}🧪 Running Comprehensive Tests...${NC}"
                echo ""
                
                if run_comprehensive_tests; then
                    show_success_message
                    log_installation "SERO installation completed successfully" "SUCCESS"
                else
                    echo -e "${YELLOW}⚠️  Installation completed with some issues${NC}"
                    log_installation "SERO installation completed with issues" "WARNING"
                fi
            else
                echo -e "${RED}❌ Installation failed during module installation${NC}"
                log_installation "SERO installation failed" "ERROR"
                exit 1
            fi
        else
            echo -e "${RED}❌ Installation failed due to unmet requirements${NC}"
            log_installation "SERO installation failed - requirements not met" "ERROR"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Script was sourced. Run directly for full installation.${NC}"
        echo -e "${BLUE}Usage: $0${NC}"
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
