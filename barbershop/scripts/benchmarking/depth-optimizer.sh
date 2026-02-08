#!/usr/bin/env bash
# Enhanced Depth Configuration Optimization Script
# One-click depth optimization and analysis

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color

# Script configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
readonly DEPTH_CLI="$PROJECT_ROOT/scripts/benchmarking/depth-cli.ts"

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_debug() {
    echo -e "${PURPLE}🐛 $1${NC}"
}

log_command() {
    echo -e "${CYAN}🚀 $1${NC}"
}

# Check if file exists and is readable
check_file() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return 1
    fi
    if [[ ! -r "$file" ]]; then
        log_error "File not readable: $file"
        return 1
    fi
    return 0
}

# Get file size in bytes
get_file_size() {
    local file="$1"
    stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0"
}

# Format file size for human reading
format_file_size() {
    local size="$1"
    if [[ $size -gt 1048576 ]]; then
        echo "$(( size / 1048576 ))MB"
    elif [[ $size -gt 1024 ]]; then
        echo "$(( size / 1024 ))KB"
    else
        echo "${size}B"
    fi
}

# Analyze benchmark file and suggest optimal depth
analyze_and_suggest() {
    local file="$1"
    
    log_info "Analyzing benchmark structure..."
    
    if ! check_file "$file"; then
        return 1
    fi
    
    # Run depth analysis
    log_command "Running depth analysis..."
    if bun run "$DEPTH_CLI" --analyze "$file"; then
        log_success "Analysis completed successfully"
    else
        log_error "Analysis failed"
        return 1
    fi
}

# Auto-optimize depth based on file characteristics
auto_optimize() {
    local file="$1"
    
    if ! check_file "$file"; then
        return 1
    fi
    
    local size
    size=$(get_file_size "$file")
    local formatted_size
    formatted_size=$(format_file_size "$size")
    
    log_info "File size: $formatted_size"
    
    # Size-based optimization logic
    if [[ $size -gt 1048576 ]]; then  # > 1MB
        log_warning "Very large file detected (${formatted_size}), using depth 3"
        run_with_depth "$file" 3
    elif [[ $size -gt 102400 ]]; then  # > 100KB
        log_info "Large file (${formatted_size}), using depth 5"
        run_with_depth "$file" 5
    elif [[ $size -gt 10240 ]]; then  # > 10KB
        log_info "Medium file (${formatted_size}), using depth 7"
        run_with_depth "$file" 7
    else
        log_success "Small file (${formatted_size}), using depth 8"
        run_with_depth "$file" 8
    fi
}

# Run benchmark with specified depth
run_with_depth() {
    local file="$1"
    local depth="$2"
    
    log_command "Running with depth $depth: bun --console-depth=$depth run $file"
    
    # Set environment variable
    export BUN_CONSOLE_DEPTH="$depth"
    
    # Run the benchmark
    if bun --console-depth="$depth" run "$file"; then
        log_success "Benchmark completed with depth $depth"
    else
        log_error "Benchmark failed with depth $depth"
        
        # Try with shallower depth on failure
        if [[ $depth -gt 2 ]]; then
            log_warning "Retrying with shallower depth..."
            local retry_depth=$((depth - 2))
            log_command "Retrying with depth $retry_depth"
            export BUN_CONSOLE_DEPTH="$retry_depth"
            bun --console-depth="$retry_depth" run "$file"
        fi
    fi
}

# Generate environment configuration script
generate_env_script() {
    local env="$1"
    
    log_info "Generating ${env} environment configuration..."
    
    if bun run "$DEPTH_CLI" --generate "$env"; then
        log_success "Environment script generated for $env"
    else
        log_error "Failed to generate environment script"
        return 1
    fi
}

# Apply current environment configuration
apply_environment_config() {
    local env="${1:-}"
    
    log_info "Applying environment configuration..."
    
    if [[ -n "$env" ]]; then
        log_command "Applying $env environment configuration"
        bun run "$DEPTH_CLI" --apply --environment "$env"
    else
        log_command "Applying auto-detected environment configuration"
        bun run "$DEPTH_CLI" --apply
    fi
}

# Show performance analysis for different depths
show_performance_analysis() {
    local depth="${1:-4}"
    local env="${2:-}"
    
    log_info "Performance analysis for depth $depth..."
    
    if bun run "$DEPTH_CLI" --performance --depth "$depth" --environment "$env"; then
        log_success "Performance analysis completed"
    else
        log_error "Performance analysis failed"
        return 1
    fi
}

# Interactive depth explorer
start_interactive_explorer() {
    log_info "Starting interactive depth explorer..."
    
    if bun run "$DEPTH_CLI" --interactive; then
        log_success "Interactive session completed"
    else
        log_error "Interactive session failed"
        return 1
    fi
}

# Quick benchmark with smart depth selection
quick_benchmark() {
    local file="$1"
    
    log_info "Quick benchmark with smart depth selection..."
    
    if ! check_file "$file"; then
        return 1
    fi
    
    # First, analyze the file
    log_info "Analyzing file for optimal depth..."
    local analysis_output
    analysis_output=$(bun run "$DEPTH_CLI" --analyze "$file" 2>/dev/null | grep "Suggested depth:" | cut -d: -f2 | tr -d ' ')
    
    if [[ -n "$analysis_output" ]] && [[ "$analysis_output" =~ ^[0-9]+$ ]]; then
        log_success "Auto-detected optimal depth: $analysis_output"
        run_with_depth "$file" "$analysis_output"
    else
        log_warning "Could not auto-detect depth, using auto-optimization"
        auto_optimize "$file"
    fi
}

# Batch process multiple files
batch_process() {
    local pattern="$1"
    local depth="${2:-}"
    
    log_info "Batch processing files matching: $pattern"
    
    # Find matching files
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$PROJECT_ROOT" -name "$pattern" -type f -print0 2>/dev/null)
    
    if [[ ${#files[@]} -eq 0 ]]; then
        log_error "No files found matching pattern: $pattern"
        return 1
    fi
    
    log_info "Found ${#files[@]} files to process"
    
    # Process each file
    for file in "${files[@]}"; do
        log_info "Processing: $(basename "$file")"
        
        if [[ -n "$depth" ]]; then
            run_with_depth "$file" "$depth"
        else
            quick_benchmark "$file"
        fi
        
        echo "---"
    done
}

# Show help information
show_help() {
    cat << EOF
🎯 Enhanced Depth Configuration Optimization Script

Usage: $(basename "$0") [command] [options] [file...]

Commands:
  analyze <file>           Analyze file and suggest optimal depth
  auto <file>              Auto-optimize depth based on file size
  quick <file>             Quick benchmark with smart depth selection
  run <file> <depth>       Run with specific depth
  generate <env>           Generate environment configuration script
  apply [env]              Apply environment configuration
  performance [depth] [env] Show performance analysis
  interactive              Start interactive depth explorer
  batch <pattern> [depth]  Batch process multiple files

Examples:
  $(basename "$0") analyze benchmark.ts
  $(basename "$0") auto large-benchmark.ts
  $(basename "$0") quick test.ts
  $(basename "$0") run benchmark.ts 5
  $(basename "$0") generate production > setup-depth.sh
  $(basename "$0") apply development
  $(basename "$0") performance 5
  $(basename "$0") interactive
  $(basename "$0") batch "*.test.ts" 3

Environment Variables:
  BUN_CONSOLE_DEPTH        Override console depth
  NODE_ENV                 Environment detection
  BUN_ENV                  Bun environment override

EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "$command" in
        "analyze")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 analyze <file>"
                exit 1
            fi
            analyze_and_suggest "$2"
            ;;
        "auto")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 auto <file>"
                exit 1
            fi
            auto_optimize "$2"
            ;;
        "quick")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 quick <file>"
                exit 1
            fi
            quick_benchmark "$2"
            ;;
        "run")
            if [[ $# -lt 3 ]]; then
                log_error "Usage: $0 run <file> <depth>"
                exit 1
            fi
            run_with_depth "$2" "$3"
            ;;
        "generate")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 generate <environment>"
                exit 1
            fi
            generate_env_script "$2"
            ;;
        "apply")
            apply_environment_config "${2:-}"
            ;;
        "performance")
            show_performance_analysis "${2:-4}" "${3:-}"
            ;;
        "interactive")
            start_interactive_explorer
            ;;
        "batch")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 batch <pattern> [depth]"
                exit 1
            fi
            batch_process "$2" "${3:-}"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "No command specified. Use '$0 help' for usage information."
            exit 1
            ;;
        *)
            log_error "Unknown command: $command. Use '$0 help' for usage information."
            exit 1
            ;;
    esac
}

# Check dependencies
if ! command -v bun &> /dev/null; then
    log_error "Bun is not installed or not in PATH"
    exit 1
fi

if [[ ! -f "$DEPTH_CLI" ]]; then
    log_error "Depth CLI not found: $DEPTH_CLI"
    exit 1
fi

# Run main function
main "$@"
