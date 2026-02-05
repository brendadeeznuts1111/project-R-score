#!/bin/bash

# FactoryWager HTML Report CLI
# Management interface for HTML report generation

AUDIT_DIR=".factory-wager"
REPORT_DIR="$AUDIT_DIR/reports"
GENERATOR_SCRIPT="$AUDIT_DIR/html-report-generator.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$REPORT_DIR"

# Check dependencies
check_dependencies() {
    if ! command -v bun >/dev/null 2>&1; then
        echo -e "${RED}❌ Bun not found. Please install Bun to generate HTML reports.${NC}"
        exit 1
    fi

    if [[ ! -f "$GENERATOR_SCRIPT" ]]; then
        echo -e "${RED}❌ HTML report generator not found: $GENERATOR_SCRIPT${NC}"
        exit 1
    fi
}

show_help() {
    echo "FactoryWager HTML Report CLI"
    echo "==========================="
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  generate                 Generate HTML report from audit log"
    echo "  generate --audit FILE    Generate from specific audit file"
    echo "  generate --output FILE   Specify output filename"
    echo "  open                     Open the latest report in browser"
    echo "  list                     List all generated reports"
    echo "  clean                    Remove old reports"
    echo "  help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 generate              # Generate report from default audit.log"
    echo "  $0 generate --audit custom-audit.log"
    echo "  $0 generate --output my-report.html"
    echo "  $0 open                  # Open latest report"
}

generate_report() {
    local audit_file="$AUDIT_DIR/audit.log"
    local output_file=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --audit)
                audit_file="$2"
                shift 2
                ;;
            --output)
                output_file="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done

    echo -e "${BLUE}📊 Generating HTML Report${NC}"
    echo "======================="
    echo "Audit File: $audit_file"
    echo "Output Dir: $REPORT_DIR"

    if [[ ! -f "$audit_file" ]]; then
        echo -e "${RED}❌ Audit file not found: $audit_file${NC}"
        exit 1
    fi

    # Change to audit directory for relative paths
    cd "$AUDIT_DIR"

    # Create reports directory if it doesn't exist
    mkdir -p reports

    # Run the generator
    if [[ -n "$output_file" ]]; then
        # Custom output filename
        local full_output="$REPORT_DIR/$output_file"
        bun run html-report-generator.ts 2>/dev/null | \
        sed "s|HTML report generated: reports/|HTML report generated: $full_output|" || {
            echo -e "${RED}❌ Failed to generate report${NC}"
            exit 1
        }
    else
        # Default output with timestamp
        bun run html-report-generator.ts || {
            echo -e "${RED}❌ Failed to generate report${NC}"
            exit 1
        }
    fi

    cd - >/dev/null

    echo -e "${GREEN}✅ HTML report generated successfully!${NC}"
}

open_report() {
    echo -e "${BLUE}🌐 Opening Latest Report${NC}"
    echo "======================="

    local latest_report=$(find "$REPORT_DIR" -name "factory-wager-report-*.html" -type f -exec ls -t {} + | head -1)

    if [[ -z "$latest_report" ]]; then
        echo -e "${YELLOW}⚠️  No HTML reports found. Generate one first:${NC}"
        echo "  $0 generate"
        exit 1
    fi

    echo "Opening: $latest_report"

    # Try different browsers
    if command -v open >/dev/null 2>&1; then
        open "$latest_report"  # macOS
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$latest_report"  # Linux
    elif command -v start >/dev/null 2>&1; then
        start "$latest_report"  # Windows
    else
        echo -e "${YELLOW}⚠️  Could not detect browser. Please open manually:${NC}"
        echo "  file://$latest_report"
    fi
}

list_reports() {
    echo -e "${BLUE}📋 Generated Reports${NC}"
    echo "===================="

    local reports=($(find "$REPORT_DIR" -name "factory-wager-report-*.html" -type f -exec ls -t {} +))

    if [[ ${#reports[@]} -eq 0 ]]; then
        echo -e "${YELLOW}No HTML reports found.${NC}"
        return
    fi

    echo "Found ${#reports[@]} reports:"
    echo ""

    for report in "${reports[@]}"; do
        local file_size=$(du -h "$report" | cut -f1)
        local file_name=$(basename "$report")
        local date_str=$(date -r "$report" "+%Y-%m-%d %H:%M:%S")

        echo "📄 $file_name"
        echo "   📅 $date_str"
        echo "   💾 $file_size"
        echo "   📍 $report"
        echo ""
    done
}

clean_reports() {
    echo -e "${BLUE}🧹 Cleaning Old Reports${NC}"
    echo "====================="

    local count=0
    while IFS= read -r -d '' file; do
        echo "Removing: $file"
        rm "$file"
        ((count++))
    done < <(find "$REPORT_DIR" -name "factory-wager-report-*.html" -mtime +7 -print0 2>/dev/null)

    if [[ $count -eq 0 ]]; then
        echo -e "${GREEN}✅ No old reports to remove (all < 7 days).${NC}"
    else
        echo -e "${GREEN}✅ Removed $count old reports.${NC}"
    fi
}

# Main command router
case "${1:-help}" in
    "generate")
        check_dependencies
        shift
        generate_report "$@"
        ;;
    "open")
        open_report
        ;;
    "list")
        list_reports
        ;;
    "clean")
        clean_reports
        ;;
    "help"|*)
        show_help
        ;;
esac
