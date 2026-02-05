#!/bin/bash

# Directory Structure Validator
# Ensures files are created in correct directories and maintains organization

set -e

# Define the allowed directory structure
declare -A ALLOWED_DIRS=(
    ["cli"]="cli/bin cli/commands"
    ["src"]="src/cli src/patterns src/integrations src/core src/storage src/utils src/types src/filters src/apple-id src/audit src/autonomic src/address src/rbac src/validation"
    ["demos"]="demos/cli demos/analytics demos/grafana demos/main demos/credentials"
    ["tests"]="tests/core tests/email tests/filter tests/bench"
    ["scripts"]="scripts/build scripts/maintenance scripts/apple-id scripts/cashapp"
    ["utils"]="utils/device utils/email utils/orchestration utils/storage"
    ["docs"]="docs/api docs/architecture docs/archive docs/apple-id docs/deployment docs/getting-started docs/guides docs/maintenance docs/performance docs/planning docs/reference docs/sim docs/testing docs/tutorials"
    ["config"]="config/application config/build-artifacts config/deployment config/environment config/project"
    ["bench"]="bench/core bench/results bench/scripts bench/storage"
    ["reports"]="reports/audit reports/performance reports/directory"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Directory Structure Validator${NC}"
echo "=================================="

# Function to check if a path is allowed
is_allowed_path() {
    local file_path="$1"
    local dir_name=$(dirname "$file_path")
    
    # Check against allowed directories
    for category in "${!ALLOWED_DIRS[@]}"; do
        for allowed_dir in ${ALLOWED_DIRS[$category]}; do
            if [[ "$dir_name" == "$allowed_dir"* ]]; then
                return 0
            fi
        done
    done
    
    return 1
}

# Function to validate current directory structure
validate_current_structure() {
    echo -e "${YELLOW}📁 Validating current directory structure...${NC}"
    
    local violations=()
    local total_files=0
    
    # Find all relevant files (excluding git, node_modules, etc.)
    while IFS= read -r -d '' file; do
        ((total_files++))
        
        if ! is_allowed_path "$file"; then
            violations+=("$file")
        fi
    done < <(find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.sh" \) \
        ! -path "./.git/*" \
        ! -path "./node_modules/*" \
        ! -path "./dist/*" \
        ! -path "./temp/*" \
        ! -path "./.DS_Store" \
        -print0)
    
    if [ ${#violations[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All $total_files files are in correct directories!${NC}"
        return 0
    else
        echo -e "${RED}❌ Found ${#violations[@]} files in incorrect directories:${NC}"
        for violation in "${violations[@]}"; do
            echo -e "${RED}   - $violation${NC}"
        done
        return 1
    fi
}

# Function to suggest correct directory for a file
suggest_directory() {
    local file_name="$1"
    local extension="${file_name##*.}"
    
    case "$extension" in
        "ts")
            if [[ "$file_name" == *"test"* ]] || [[ "$file_name" == *"spec"* ]]; then
                echo "tests/"
            elif [[ "$file_name" == *"cli"* ]] || [[ "$file_name" == *"command"* ]]; then
                echo "cli/commands/"
            elif [[ "$file_name" == *"util"* ]]; then
                echo "utils/"
            else
                echo "src/"
            fi
            ;;
        "js")
            if [[ "$file_name" == *"cli"* ]] || [[ "$file_name" == *"command"* ]]; then
                echo "cli/commands/"
            elif [[ "$file_name" == *"script"* ]]; then
                echo "scripts/"
            else
                echo "src/"
            fi
            ;;
        "md")
            echo "docs/"
            ;;
        "sh")
            echo "scripts/" 
            ;;
        "json")
            if [[ "$file_name" == *"package"* ]] || [[ "$file_name" == *"tsconfig"* ]]; then
                echo "config/"
            elif [[ "$file_name" == *"demo"* ]] || [[ "$file_name" == *"mock"* ]]; then
                echo "demos/"
            else
                echo "config/"
            fi
            ;;
        *)
            echo "src/"
            ;;
    esac
}

# Function to auto-fix common violations
auto_fix_violations() {
    echo -e "${YELLOW}🔧 Attempting to auto-fix common violations...${NC}"
    
    local fixed=0
    
    # Find files in root that should be in subdirectories
    for file in *.ts *.js *.md *.sh *.json 2>/dev/null; do
        if [ -f "$file" ]; then
            local suggested_dir=$(suggest_directory "$file")
            local target_dir="$suggested_dir"
            
            echo -e "${BLUE}   Moving $file → $target_dir${NC}"
            
            # Create directory if it doesn't exist
            mkdir -p "$target_dir"
            
            # Move the file
            mv "$file" "$target_dir/"
            ((fixed++))
        fi
    done
    
    echo -e "${GREEN}✅ Fixed $fixed files${NC}"
}

# Function to create .gitignore rules for organization
create_gitignore_safeguards() {
    echo -e "${YELLOW}🛡️ Creating .gitignore safeguards...${NC}"
    
    # Add rules to prevent common mistakes
    cat >> .gitignore << 'EOF'

# Directory Structure Safeguards
# Prevent creating files in root that should be organized
/*.ts
/*.js
/*.md
!README.md
!ORGANIZATION.md
!LICENSE
/*.sh
!scripts/
/*.json
!package*.json
!tsconfig*.json
!.markdownlint*

# Temporary files that should be in temp/
*.tmp
*.temp
*.log
!temp/
!logs/

# Build artifacts that should be in dist/
dist/
build/

# Dependencies
node_modules/
bun.lockb

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
EOF
    
    echo -e "${GREEN}✅ .gitignore safeguards added${NC}"
}

# Function to create pre-commit hook for structure validation
create_pre_commit_hook() {
    echo -e "${YELLOW}🔗 Creating pre-commit hook for structure validation...${NC}"
    
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Pre-commit hook to validate directory structure
# Exit with non-zero status to abort commit

echo "🔍 Validating directory structure..."

# Run the validator
if bash scripts/validate-structure.sh --check-only; then
    echo "✅ Directory structure validation passed"
    exit 0
else
    echo "❌ Directory structure validation failed"
    echo "Please run 'bash scripts/validate-structure.sh --fix' to fix issues"
    exit 1
fi
EOF
    
    chmod +x .git/hooks/pre-commit
    echo -e "${GREEN}✅ Pre-commit hook installed${NC}"
}

# Main execution
case "${1:-validate}" in
    "validate")
        validate_current_structure
        ;;
    "fix")
        echo -e "${BLUE}🔧 Running in fix mode...${NC}"
        auto_fix_violations
        validate_current_structure
        ;;
    "check-only")
        validate_current_structure > /dev/null 2>&1
        ;;
    "install-hooks")
        create_gitignore_safeguards
        create_pre_commit_hook
        ;;
    "help")
        echo "Usage: $0 [validate|fix|check-only|install-hooks|help]"
        echo "  validate     - Check current structure (default)"
        echo "  fix          - Auto-fix common violations"
        echo "  check-only   - Silent check for CI/CD"
        echo "  install-hooks - Install git safeguards"
        echo "  help         - Show this help"
        ;;
esac

echo -e "${GREEN}🎯 Directory structure validation complete!${NC}"
