#!/bin/bash

# FactoryWager Audit CLI
# Management interface for audit log operations

AUDIT_DIR=".factory-wager"
AUDIT_FILE="$AUDIT_DIR/audit.log"
SCHEMA_FILE="$AUDIT_DIR/audit-schema.json"
ROTATOR_SCRIPT="$AUDIT_DIR/audit-rotator.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure audit directory exists
mkdir -p "$AUDIT_DIR"

# Create schema if it doesn't exist
if [[ ! -f "$SCHEMA_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Audit schema not found. Please ensure audit-schema.json exists.${NC}"
    exit 1
fi

# Create rotator script if it doesn't exist
if [[ ! -f "$ROTATOR_SCRIPT" ]]; then
    echo -e "${YELLOW}⚠️  Audit rotator not found. Please ensure audit-rotator.ts exists.${NC}"
    exit 1
fi

show_help() {
    echo "FactoryWager Audit CLI"
    echo "====================="
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  stats                    Show audit statistics"
    echo "  rotate                   Rotate audit log"
    echo "  validate                 Validate audit log against schema"
    echo "  tail [LINES]             Show last N entries (default: 10)"
    echo "  search WORKFLOW          Search entries by workflow name"
    echo "  errors                   Show only error entries (exit_code != 0)"
    echo "  success                  Show only successful entries (exit_code = 0)"
    echo "  export [FORMAT]          Export audit log (json|csv|txt)"
    echo "  clean                    Clean up old log files"
    echo "  help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 stats                 # Show statistics"
    echo "  $0 tail 20               # Show last 20 entries"
    echo "  $0 search fw-validate    # Search validation entries"
    echo "  $0 errors                # Show only errors"
}

show_stats() {
    echo -e "${BLUE}📊 Audit Log Statistics${NC}"
    echo "======================="
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log found.${NC}"
        return
    fi
    
    # Run TypeScript rotator for detailed stats
    if command -v bun >/dev/null 2>&1; then
        bun run "$ROTATOR_SCRIPT" stats 2>/dev/null | jq '.' 2>/dev/null || {
            # Fallback to basic stats
            local total_lines=$(wc -l < "$AUDIT_FILE")
            local file_size=$(du -h "$AUDIT_FILE" | cut -f1)
            local last_entry=$(tail -1 "$AUDIT_FILE" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
            
            echo "Total Entries: $total_lines"
            echo "File Size: $file_size"
            echo "Last Entry: $last_entry"
        }
    else
        echo -e "${RED}❌ Bun not found. Install Bun for detailed statistics.${NC}"
    fi
}

rotate_log() {
    echo -e "${BLUE}🔄 Rotating Audit Log${NC}"
    echo "====================="
    
    if command -v bun >/dev/null 2>&1; then
        bun run "$ROTATOR_SCRIPT" rotate
    else
        echo -e "${RED}❌ Bun not found. Install Bun for log rotation.${NC}"
    fi
}

validate_log() {
    echo -e "${BLUE}✅ Validating Audit Log${NC}"
    echo "========================"
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log to validate.${NC}"
        return
    fi
    
    local valid=0
    local invalid=0
    local total=0
    
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            ((total++))
            if echo "$line" | jq '.' >/dev/null 2>&1; then
                ((valid++))
            else
                ((invalid++))
                echo -e "${RED}❌ Invalid JSON: $line${NC}"
            fi
        fi
    done < "$AUDIT_FILE"
    
    echo "Total Entries: $total"
    echo -e "${GREEN}Valid Entries: $valid${NC}"
    echo -e "${RED}Invalid Entries: $invalid${NC}"
    
    if [[ $invalid -eq 0 ]]; then
        echo -e "${GREEN}✅ Audit log is valid!${NC}"
    else
        echo -e "${RED}❌ Audit log has $invalid invalid entries!${NC}"
    fi
}

tail_log() {
    local lines=${1:-10}
    echo -e "${BLUE}📋 Last $lines Audit Entries${NC}"
    echo "============================="
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log found.${NC}"
        return
    fi
    
    tail -n "$lines" "$AUDIT_FILE" | while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
            local workflow=$(echo "$line" | jq -r '.workflow // "unknown"' 2>/dev/null || echo "unknown")
            local exit_code=$(echo "$line" | jq -r '.exit_code // "?"' 2>/dev/null || echo "?")
            
            if [[ "$exit_code" == "0" ]]; then
                echo -e "${GREEN}✅${NC} [$timestamp] $workflow (exit: $exit_code)"
            else
                echo -e "${RED}❌${NC} [$timestamp] $workflow (exit: $exit_code)"
            fi
        fi
    done
}

search_workflow() {
    local workflow=$1
    echo -e "${BLUE}🔍 Search: $workflow${NC}"
    echo "======================="
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log found.${NC}"
        return
    fi
    
    local count=0
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local entry_workflow=$(echo "$line" | jq -r '.workflow // ""' 2>/dev/null || echo "")
            if [[ "$entry_workflow" == "$workflow" ]]; then
                ((count++))
                local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
                local exit_code=$(echo "$line" | jq -r '.exit_code // "?"' 2>/dev/null || echo "?")
                
                if [[ "$exit_code" == "0" ]]; then
                    echo -e "${GREEN}✅${NC} [$timestamp] $workflow (exit: $exit_code)"
                else
                    echo -e "${RED}❌${NC} [$timestamp] $workflow (exit: $exit_code)"
                fi
            fi
        fi
    done < "$AUDIT_FILE"
    
    echo "Found $count entries for $workflow"
}

show_errors() {
    echo -e "${BLUE}❌ Error Entries Only${NC}"
    echo "======================="
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log found.${NC}"
        return
    fi
    
    local count=0
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local exit_code=$(echo "$line" | jq -r '.exit_code // "0"' 2>/dev/null || echo "0")
            if [[ "$exit_code" != "0" ]]; then
                ((count++))
                local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
                local workflow=$(echo "$line" | jq -r '.workflow // "unknown"' 2>/dev/null || echo "unknown")
                local error_msg=$(echo "$line" | jq -r '.error.message // "No error message"' 2>/dev/null || echo "No error message")
                
                echo -e "${RED}❌${NC} [$timestamp] $workflow (exit: $exit_code)"
                echo "   Error: $error_msg"
            fi
        fi
    done < "$AUDIT_FILE"
    
    echo "Found $count error entries"
}

show_success() {
    echo -e "${BLUE}✅ Success Entries Only${NC}"
    echo "========================"
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log found.${NC}"
        return
    fi
    
    local count=0
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local exit_code=$(echo "$line" | jq -r '.exit_code // "1"' 2>/dev/null || echo "1")
            if [[ "$exit_code" == "0" ]]; then
                ((count++))
                local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
                local workflow=$(echo "$line" | jq -r '.workflow // "unknown"' 2>/dev/null || echo "unknown")
                
                echo -e "${GREEN}✅${NC} [$timestamp] $workflow (exit: $exit_code)"
            fi
        fi
    done < "$AUDIT_FILE"
    
    echo "Found $count success entries"
}

export_log() {
    local format=${1:-json}
    echo -e "${BLUE}📤 Exporting Audit Log ($format)${NC}"
    echo "================================="
    
    if [[ ! -f "$AUDIT_FILE" ]]; then
        echo -e "${YELLOW}No audit log to export.${NC}"
        return
    fi
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local export_file="$AUDIT_DIR/audit-export-$timestamp.$format"
    
    case "$format" in
        "json")
            cp "$AUDIT_FILE" "$export_file"
            ;;
        "csv")
            echo "timestamp,workflow,exit_code,duration_seconds,environment,risk_score" > "$export_file"
            while IFS= read -r line; do
                if [[ -n "$line" ]]; then
                    local timestamp=$(echo "$line" | jq -r '.timestamp // ""' 2>/dev/null || echo "")
                    local workflow=$(echo "$line" | jq -r '.workflow // ""' 2>/dev/null || echo "")
                    local exit_code=$(echo "$line" | jq -r '.exit_code // ""' 2>/dev/null || echo "")
                    local duration=$(echo "$line" | jq -r '.duration_seconds // ""' 2>/dev/null || echo "")
                    local environment=$(echo "$line" | jq -r '.environment // ""' 2>/dev/null || echo "")
                    local risk=$(echo "$line" | jq -r '.risk_score // ""' 2>/dev/null || echo "")
                    echo "$timestamp,$workflow,$exit_code,$duration,$environment,$risk" >> "$export_file"
                fi
            done < "$AUDIT_FILE"
            ;;
        "txt")
            while IFS= read -r line; do
                if [[ -n "$line" ]]; then
                    local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
                    local workflow=$(echo "$line" | jq -r '.workflow // "unknown"' 2>/dev/null || echo "unknown")
                    local exit_code=$(echo "$line" | jq -r '.exit_code // "?"' 2>/dev/null || echo "?")
                    echo "[$timestamp] $workflow (exit: $exit_code)"
                fi
            done < "$AUDIT_FILE" > "$export_file"
            ;;
        *)
            echo -e "${RED}❌ Unsupported format: $format${NC}"
            echo "Supported formats: json, csv, txt"
            return
            ;;
    esac
    
    echo -e "${GREEN}✅ Exported to: $export_file${NC}"
}

clean_logs() {
    echo -e "${BLUE}🧹 Cleaning Old Logs${NC}"
    echo "====================="
    
    # Remove old rotated logs (older than 30 days)
    find "$AUDIT_DIR" -name "audit-*.log*" -mtime +30 -delete 2>/dev/null
    find "$AUDIT_DIR" -name "audit-export-*.json" -mtime +7 -delete 2>/dev/null
    find "$AUDIT_DIR" -name "audit-export-*.csv" -mtime +7 -delete 2>/dev/null
    find "$AUDIT_DIR" -name "audit-export-*.txt" -mtime +7 -delete 2>/dev/null
    
    echo -e "${GREEN}✅ Cleanup completed.${NC}"
}

# Main command router
case "${1:-help}" in
    "stats")
        show_stats
        ;;
    "rotate")
        rotate_log
        ;;
    "validate")
        validate_log
        ;;
    "tail")
        tail_log "${2:-10}"
        ;;
    "search")
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}❌ Workflow name required.${NC}"
            echo "Usage: $0 search WORKFLOW"
            exit 1
        fi
        search_workflow "$2"
        ;;
    "errors")
        show_errors
        ;;
    "success")
        show_success
        ;;
    "export")
        export_log "${2:-json}"
        ;;
    "clean")
        clean_logs
        ;;
    "help"|*)
        show_help
        ;;
esac
