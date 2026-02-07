#!/bin/bash
# scripts/wiki-shortcuts.sh - Shell aliases and shortcuts for wiki template system

# Wiki Template System CLI Shortcuts
# Source this file in your shell: source ~/Projects/scripts/wiki-shortcuts.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get project root
WIKI_ROOT="${WIKI_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

echo -e "${CYAN}Wiki Template System Shortcuts Loaded${NC}"
echo -e "${CYAN}Project Root: ${WIKI_ROOT}${NC}"
echo ""

# === Template Management ===
alias wiki-list='bun run $WIKI_ROOT/examples/wiki-template-cli.ts list'
alias wiki-register='bun run $WIKI_ROOT/examples/wiki-template-cli.ts register'
alias wiki-generate='bun run $WIKI_ROOT/examples/wiki-template-cli.ts generate'
alias wiki-score='bun run $WIKI_ROOT/examples/wiki-template-cli.ts score'

# === Quick Generate Functions ===
wiki-gen-md() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Template name required${NC}"
        echo "Usage: wiki-gen-md <template-name> [output-file]"
        return 1
    fi
    local output="${2:-${1// /_}.md}"
    echo -e "${BLUE}Generating markdown for template: $1${NC}"
    bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" generate --template "$1" --format markdown --output "$output"
}

wiki-gen-html() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Template name required${NC}"
        echo "Usage: wiki-gen-html <template-name> [output-file]"
        return 1
    fi
    local output="${2:-${1// /_}.html}"
    echo -e "${BLUE}Generating HTML for template: $1${NC}"
    bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" generate --template "$1" --format html --output "$output"
}

wiki-gen-all() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Template name required${NC}"
        echo "Usage: wiki-gen-all <template-name> [output-dir]"
        return 1
    fi
    local output_dir="${2:-./wiki-output-${1// /_}}"
    mkdir -p "$output_dir"
    echo -e "${BLUE}Generating all formats for template: $1${NC}"
    bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" generate --template "$1" --format all --workspace "$output_dir"
}

# === Performance & Analytics ===
alias wiki-bench='bun run $WIKI_ROOT/examples/wiki-template-cli.ts benchmark'
alias wiki-analytics='bun run $WIKI_ROOT/examples/wiki-template-cli.ts analytics'
alias wiki-clear='bun run $WIKI_ROOT/examples/wiki-template-cli.ts clear'

# Enhanced benchmark with options
wiki-bench-heavy() {
    local concurrent="${1:-20}"
    echo -e "${PURPLE}Running heavy benchmark with $concurrent concurrent operations${NC}"
    bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" benchmark --concurrent "$concurrent" --verbose
}

# === Testing Shortcuts ===
alias wiki-test='bun test $WIKI_ROOT/test/wiki-template-system.test.ts'
alias wiki-bench-test='bun test $WIKI_ROOT/test/wiki-template-benchmark.test.ts'
alias wiki-test-all='bun test $WIKI_ROOT/test/wiki-template-*.test.ts'

# Test with coverage
alias wiki-test-coverage='bun test --coverage $WIKI_ROOT/test/wiki-template-*.test.ts'

# Quick test functions
wiki-test-unit() {
    echo -e "${GREEN}Running unit tests...${NC}"
    bun test -t "Template Registration|Template Generation|Scoring System" "$WIKI_ROOT/test/wiki-template-system.test.ts"
}

wiki-test-performance() {
    echo -e "${GREEN}Running performance tests...${NC}"
    bun test -t "Performance|Benchmark|Multi-threaded" "$WIKI_ROOT/test/wiki-template-*.test.ts"
}

# === Development Shortcuts ===
alias wiki-playground='cd "$WIKI_ROOT" && bun run dev'
alias wiki-root='cd "$WIKI_ROOT"'

# Quick template creation
wiki-create-template() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Template name required${NC}"
        echo "Usage: wiki-create-template <template-name> [provider] [workspace]"
        return 1
    fi
    
    local name="$1"
    local provider="${2:-CONFLUENCE}"
    local workspace="${3:-wiki/workspace}"
    
    echo -e "${YELLOW}Creating template: $name${NC}"
    
    # Set environment variables for interactive registration
    export WIKI_TEMPLATE_NAME="$name"
    export WIKI_TEMPLATE_PROVIDER="$provider"
    export WIKI_TEMPLATE_WORKSPACE="$workspace"
    export WIKI_TEMPLATE_DESCRIPTION="Template created via wiki-create-template"
    export WIKI_TEMPLATE_FORMAT="markdown"
    export WIKI_TEMPLATE_CATEGORY="custom"
    export WIKI_TEMPLATE_PRIORITY="medium"
    export WIKI_TEMPLATE_TAGS="cli, generated, $name"
    
    bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" register
    
    # Clean up environment variables
    unset WIKI_TEMPLATE_NAME WIKI_TEMPLATE_PROVIDER WIKI_TEMPLATE_WORKSPACE
    unset WIKI_TEMPLATE_DESCRIPTION WIKI_TEMPLATE_FORMAT WIKI_TEMPLATE_CATEGORY
    unset WIKI_TEMPLATE_PRIORITY WIKI_TEMPLATE_TAGS
    
    echo -e "${GREEN}Template '$name' created successfully!${NC}"
}

# === Batch Operations ===
wiki-generate-all-templates() {
    echo -e "${BLUE}Generating content for all templates...${NC}"
    local output_dir="./wiki-batch-output-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$output_dir"
    
    # Get list of templates and generate for each
    local templates=$(bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" list 2>/dev/null | grep -E "^[A-Za-z]" | head -20)
    
    while IFS= read -r template; do
        if [[ -n "$template" && "$template" != *"📋"* && "$template" != *"─"* ]]; then
            echo -e "${CYAN}Processing: $template${NC}"
            wiki-gen-md "$template" "$output_dir/${template// /_}.md"
        fi
    done <<< "$templates"
    
    echo -e "${GREEN}Batch generation complete! Output in: $output_dir${NC}"
}

wiki-score-all-templates() {
    echo -e "${BLUE}Scoring all templates...${NC}"
    local templates=$(bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" list 2>/dev/null | grep -E "^[A-Za-z]" | head -10)
    
    while IFS= read -r template; do
        if [[ -n "$template" && "$template" != *"📋"* && "$template" != *"─"* ]]; then
            echo -e "${CYAN}Scoring: $template${NC}"
            wiki-score "$template"
            echo ""
        fi
    done <<< "$templates"
}

# === Utility Functions ===
wiki-status() {
    echo -e "${PURPLE}=== Wiki Template System Status ===${NC}"
    echo ""
    
    echo -e "${YELLOW}Template Count:${NC}"
    wiki-list | grep -c "Template" || echo "0"
    
    echo -e "${YELLOW}Cache Status:${NC}"
    wiki-analytics | grep -A 5 "Cache Statistics"
    
    echo -e "${YELLOW}Generator Status:${NC}"
    wiki-analytics | grep -A 5 "Generator Statistics"
    
    echo ""
}

wiki-cleanup() {
    echo -e "${YELLOW}Cleaning up wiki template system...${NC}"
    wiki-clear
    
    # Clean up any test outputs
    find "$WIKI_ROOT" -name "wiki-batch-output-*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    find "$WIKI_ROOT" -name "*.md" -name "*generated*" -mtime +1 -delete 2>/dev/null || true
    
    echo -e "${GREEN}Cleanup complete!${NC}"
}

wiki-help() {
    echo -e "${CYAN}=== Wiki Template System CLI Shortcuts ===${NC}"
    echo ""
    echo -e "${YELLOW}Template Management:${NC}"
    echo "  wiki-list                    List all templates"
    echo "  wiki-register               Register new template (interactive)"
    echo "  wiki-generate <name>        Generate content (interactive)"
    echo "  wiki-score <name>           Calculate template scores"
    echo ""
    echo -e "${YELLOW}Quick Generation:${NC}"
    echo "  wiki-gen-md <name> [file]   Generate markdown"
    echo "  wiki-gen-html <name> [file]  Generate HTML"
    echo "  wiki-gen-all <name> [dir]   Generate all formats"
    echo ""
    echo -e "${YELLOW}Performance & Analytics:${NC}"
    echo "  wiki-bench                   Run benchmark"
    echo "  wiki-bench-heavy [num]      Heavy benchmark (default: 20)"
    echo "  wiki-analytics               Show system analytics"
    echo "  wiki-clear                   Clear all caches"
    echo ""
    echo -e "${YELLOW}Testing:${NC}"
    echo "  wiki-test                    Run unit tests"
    echo "  wiki-bench-test              Run benchmark tests"
    echo "  wiki-test-all                Run all tests"
    echo "  wiki-test-coverage           Run tests with coverage"
    echo ""
    echo -e "${YELLOW}Development:${NC}"
    echo "  wiki-playground              Start development server"
    echo "  wiki-root                    Go to project root"
    echo "  wiki-create-template <name>  Quick template creation"
    echo ""
    echo -e "${YELLOW}Batch Operations:${NC}"
    echo "  wiki-generate-all-templates  Generate content for all templates"
    echo "  wiki-score-all-templates     Score all templates"
    echo ""
    echo -e "${YELLOW}Utilities:${NC}"
    echo "  wiki-status                  Show system status"
    echo "  wiki-cleanup                 Clean up temporary files"
    echo "  wiki-help                    Show this help"
    echo ""
    echo -e "${GREEN}Project Root: $WIKI_ROOT${NC}"
    echo ""
}

# === Auto-completion (optional) ===
# Uncomment these lines if you want bash completion
# _wiki_templates() {
#     local cur prev opts
#     COMPREPLY=()
#     cur="${COMP_WORDS[COMP_CWORD]}"
#     prev="${COMP_WORDS[COMP_CWORD-1]}"
#     opts=$(bun run "$WIKI_ROOT/examples/wiki-template-cli.ts" list 2>/dev/null | grep -E "^[A-Za-z]" | head -20)
#     
#     if [[ ${cur} == * ]] ; then
#         COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
#         return 0
#     fi
# }
# complete -F _wiki_templates wiki-gen-md wiki-gen-html wiki-gen-all wiki-score

# === Welcome Message ===
if [[ "$1" != "--silent" ]]; then
    echo -e "${GREEN}Wiki Template System shortcuts ready!${NC}"
    echo -e "${CYAN}Type 'wiki-help' for available commands${NC}"
    echo ""
fi
