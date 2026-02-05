#!/bin/bash
# migrate-bun-urls-to-constants.sh
# 
# Migration script to replace hardcoded Bun documentation URLs with BUN_DOCS_URLS constants
# 
# Usage:
#   ./scripts/migrate-bun-urls-to-constants.sh [--dry-run] [--file <file>]
#
# Options:
#   --dry-run    Show what would be changed without making changes
#   --file       Only process specific file

set -euo pipefail

DRY_RUN=false
TARGET_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --file)
            TARGET_FILE="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Finding hardcoded Bun URLs..."

# Find all hardcoded Bun URLs (excluding the constants file itself)
if [[ -n "$TARGET_FILE" ]]; then
    FILES="$TARGET_FILE"
else
    FILES=$(rg -l "https://bun\.com/(docs|reference)" src/ --type ts --type tsx 2>/dev/null | grep -v "rss-constants.ts" || true)
fi

if [[ -z "$FILES" ]]; then
    echo -e "${GREEN}✅ No files found with hardcoded Bun URLs${NC}"
    exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo -e "${YELLOW}Found $FILE_COUNT file(s) to process${NC}"

# Function to map URL to constant
# Returns the constant name if found, empty string otherwise
map_url_to_constant() {
    local url="$1"
    case "$url" in
        "https://bun.com/docs")
            echo "BUN_DOCS_URLS.DOCS"
            ;;
        "https://bun.com/reference")
            echo "BUN_DOCS_URLS.API_REFERENCE"
            ;;
        "https://bun.com/reference/globals")
            echo "BUN_DOCS_URLS.GLOBALS_REFERENCE"
            ;;
        "https://bun.com/blog")
            echo "BUN_DOCS_URLS.BLOG"
            ;;
        "https://github.com/oven-sh/bun")
            echo "BUN_DOCS_URLS.GITHUB"
            ;;
        "https://bun.com/docs/pm/cli/install#configuration")
            echo "BUN_DOCS_URLS.PM_CLI_INSTALL_CONFIG"
            ;;
        "https://bun.com/docs/runtime/bun-apis")
            echo "BUN_DOCS_URLS.RUNTIME_APIS"
            ;;
        "https://bun.com/docs/runtime/networking/fetch")
            echo "BUN_DOCS_URLS.FETCH_API"
            ;;
        "https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout")
            echo "BUN_DOCS_URLS.FETCH_TIMEOUTS"
            ;;
        "https://bun.com/docs/runtime/debugger")
            echo "BUN_DOCS_URLS.DEBUGGER"
            ;;
        "https://bun.com/docs/runtime/security-scanner")
            echo "BUN_DOCS_URLS.SECURITY_SCANNER"
            ;;
        "https://bun.com/docs/runtime/secrets")
            echo "BUN_DOCS_URLS.SECRETS"
            ;;
        "https://bun.com/docs/runtime/csrf")
            echo "BUN_DOCS_URLS.CSRF"
            ;;
        "https://bun.com/docs/runtime/http/websockets#contextual-data")
            echo "BUN_DOCS_URLS.WEBSOCKET_CONTEXTUAL_DATA"
            ;;
        "https://bun.com/docs/runtime/yaml")
            echo "BUN_DOCS_URLS.YAML_API"
            ;;
        "https://bun.com/docs/runtime/shell#builtin-commands")
            echo "BUN_DOCS_URLS.SHELL_BUILTIN_COMMANDS"
            ;;
        "https://bun.com/docs/runtime/shell#sh-file-loader")
            echo "BUN_DOCS_URLS.SHELL_FILE_LOADER"
            ;;
        "https://bun.com/docs/runtime/shell#environment-variables")
            echo "BUN_DOCS_URLS.SHELL_ENV_VARS"
            ;;
        "https://bun.com/docs/runtime/shell#utilities")
            echo "BUN_DOCS_URLS.SHELL_UTILITIES"
            ;;
        "https://bun.com/docs/bundler")
            echo "BUN_DOCS_URLS.BUILD_COMPILE"
            ;;
        "https://bun.com/docs/test/runner")
            echo "BUN_DOCS_URLS.TEST_RUNNER"
            ;;
        "https://bun.com/docs/install/workspaces")
            echo "BUN_DOCS_URLS.WORKSPACE_CONFIG"
            ;;
        "https://bun.com/docs/benchmarks")
            echo "BUN_DOCS_URLS.BENCHMARKING"
            ;;
        *)
            echo ""
            ;;
    esac
}

# List of all URLs to check (for iteration)
URL_LIST=(
    "https://bun.com/docs"
    "https://bun.com/reference"
    "https://bun.com/reference/globals"
    "https://bun.com/blog"
    "https://github.com/oven-sh/bun"
    "https://bun.com/docs/pm/cli/install#configuration"
    "https://bun.com/docs/runtime/bun-apis"
    "https://bun.com/docs/runtime/networking/fetch"
    "https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout"
    "https://bun.com/docs/runtime/debugger"
    "https://bun.com/docs/runtime/security-scanner"
    "https://bun.com/docs/runtime/secrets"
    "https://bun.com/docs/runtime/csrf"
    "https://bun.com/docs/runtime/http/websockets#contextual-data"
    "https://bun.com/docs/runtime/yaml"
    "https://bun.com/docs/runtime/shell#builtin-commands"
    "https://bun.com/docs/runtime/shell#sh-file-loader"
    "https://bun.com/docs/runtime/shell#environment-variables"
    "https://bun.com/docs/runtime/shell#utilities"
    "https://bun.com/docs/bundler"
    "https://bun.com/docs/test/runner"
    "https://bun.com/docs/install/workspaces"
    "https://bun.com/docs/benchmarks"
)

# Process each file
for file in $FILES; do
    echo -e "\n${YELLOW}Processing: $file${NC}"
    
    # Check if file needs import
    NEEDS_IMPORT=true
    if rg -q "import.*BUN_DOCS_URLS" "$file" 2>/dev/null; then
        NEEDS_IMPORT=false
    fi
    
    # Replace URLs
    for url in "${URL_LIST[@]}"; do
        constant=$(map_url_to_constant "$url")
        
        # Skip if no mapping found
        [[ -z "$constant" ]] && continue
        
        # Escape URL for sed (handle special characters)
        escaped_url=$(printf '%s\n' "$url" | sed 's/[[\.*^$()+?{|]/\\&/g')
        
        if rg -q "$escaped_url" "$file" 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Replacing: $url"
            echo -e "     → $constant"
            
            if [[ "$DRY_RUN" == "false" ]]; then
                # Replace in file (handle quoted strings, template literals, and unquoted)
                # Order matters: try most specific patterns first
                
                # Double-quoted strings
                sed -i.bak "s|\"$escaped_url\"|\"$constant\"|g" "$file"
                # Single-quoted strings
                sed -i.bak "s|'$escaped_url'|'$constant'|g" "$file"
                # Template literals (backticks)
                sed -i.bak "s|\`$escaped_url\`|\`$constant\`|g" "$file"
                # Unquoted (for object properties, etc.)
                sed -i.bak "s|$escaped_url|$constant|g" "$file"
                rm -f "$file.bak"
            fi
        fi
    done
    
    # Handle special case: reference/globals/URLSearchParams
    # This requires string concatenation: BUN_DOCS_URLS.GLOBALS_REFERENCE + "/URLSearchParams"
    if rg -q "https://bun\.com/reference/globals/URLSearchParams" "$file" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Replacing: https://bun.com/reference/globals/URLSearchParams"
        echo -e "     → BUN_DOCS_URLS.GLOBALS_REFERENCE + \"/URLSearchParams\""
        
        if [[ "$DRY_RUN" == "false" ]]; then
            # Replace in various contexts
            sed -i.bak 's|"https://bun\.com/reference/globals/URLSearchParams"|BUN_DOCS_URLS.GLOBALS_REFERENCE + "/URLSearchParams"|g' "$file"
            sed -i.bak "s|'https://bun\.com/reference/globals/URLSearchParams'|BUN_DOCS_URLS.GLOBALS_REFERENCE + '/URLSearchParams'|g" "$file"
            sed -i.bak 's|`https://bun\.com/reference/globals/URLSearchParams`|`${BUN_DOCS_URLS.GLOBALS_REFERENCE}/URLSearchParams`|g' "$file"
            sed -i.bak 's|https://bun\.com/reference/globals/URLSearchParams|BUN_DOCS_URLS.GLOBALS_REFERENCE + "/URLSearchParams"|g' "$file"
            rm -f "$file.bak"
        fi
    fi
    
    # Add import if needed
    if [[ "$NEEDS_IMPORT" == "true" ]] && [[ "$DRY_RUN" == "false" ]]; then
        # Determine relative path to rss-constants
        # Calculate depth: count slashes in file path relative to src/
        FILE_REL_PATH="${file#src/}"
        DEPTH=$(echo "$FILE_REL_PATH" | tr -cd '/' | wc -c)
        
        # Build relative path based on depth
        if [[ "$DEPTH" -eq 0 ]]; then
            # File is in src/ root
            RELATIVE_PATH="./utils/rss-constants"
        elif [[ "$DEPTH" -eq 1 ]]; then
            # File is in src/api/, src/mcp/, etc.
            RELATIVE_PATH="../utils/rss-constants"
        elif [[ "$DEPTH" -eq 2 ]]; then
            # File is in src/mcp/tools/, src/api/routes/, etc.
            RELATIVE_PATH="../../utils/rss-constants"
        else
            # Deeper nesting - use more ../../
            RELATIVE_PATH=""
            for ((i=0; i<=DEPTH; i++)); do
                RELATIVE_PATH="../$RELATIVE_PATH"
            done
            RELATIVE_PATH="${RELATIVE_PATH}utils/rss-constants"
        fi
        
        # Find first import statement and add after it
        if rg -q "^import" "$file" 2>/dev/null; then
            # Add after last import
            LAST_IMPORT_LINE=$(rg -n "^import" "$file" | tail -1 | cut -d: -f1)
            if [[ -n "$LAST_IMPORT_LINE" ]]; then
                echo -e "  ${GREEN}✓${NC} Adding import: import { BUN_DOCS_URLS } from \"$RELATIVE_PATH\";"
                # Use a temporary file to avoid sed portability issues
                awk -v line="$LAST_IMPORT_LINE" -v import="import { BUN_DOCS_URLS } from \"$RELATIVE_PATH\";" '
                    NR == line { print; print import; next }
                    { print }
                ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            fi
        else
            # Add at top of file
            echo -e "  ${GREEN}✓${NC} Adding import at top of file"
            sed -i.bak "1i\\
import { BUN_DOCS_URLS } from \"$RELATIVE_PATH\";\\
" "$file"
            rm -f "$file.bak"
        fi
    elif [[ "$NEEDS_IMPORT" == "true" ]]; then
        echo -e "  ${YELLOW}⚠${NC} Would add import: import { BUN_DOCS_URLS } from \".../rss-constants\";"
    fi
done

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "\n${YELLOW}⚠ Dry run mode - no changes made${NC}"
    echo "Run without --dry-run to apply changes"
else
    echo -e "\n${GREEN}✅ Migration complete!${NC}"
    echo "Run 'bun run typecheck' to verify changes"
fi
