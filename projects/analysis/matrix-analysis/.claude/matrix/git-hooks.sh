#!/bin/bash
# Tier-1380 OMEGA: Git Hooks Integration
# Validates column references in commit messages and code

MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$0")}"

# Pre-commit hook: Validate column references in staged files
cols_git_precommit() {
    echo "🔥 Validating column references..."
    
    local has_error=0
    
    # Check for invalid column references in staged files
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            # Look for patterns like Col(999) or col-999 that don't exist
            local invalid_cols
            invalid_cols=$(grep -oE 'Col\(([0-9]+)\)|col-([0-9]+)' "$file" 2>/dev/null | \
                while read -r match; do
                    local num=$(echo "$match" | grep -oE '[0-9]+')
                    if [ "$num" -gt 96 ] 2>/dev/null || [ "$num" -lt 0 ] 2>/dev/null; then
                        echo "$file: Invalid column reference: $match"
                    fi
                done)
            
            if [ -n "$invalid_cols" ]; then
                echo "$invalid_cols"
                has_error=1
            fi
        fi
    done < <(git diff --cached --name-only --diff-filter=ACM)
    
    if [ $has_error -eq 1 ]; then
        echo "❌ Commit blocked: Fix invalid column references"
        return 1
    fi
    
    echo "✅ Column references valid"
    return 0
}

# Commit-msg hook: Validate column references in commit message
cols_git_commitmsg() {
    local msg_file="$1"
    local msg=$(cat "$msg_file")
    
    # Check for column references in format [COL-XX] or Col(XX)
    local refs=$(echo "$msg" | grep -oE '\[COL-[0-9]+\]|Col\([0-9]+\)')
    
    if [ -n "$refs" ]; then
        echo "🔥 Validating column references in commit message..."
        
        local has_error=0
        while IFS= read -r ref; do
            local num=$(echo "$ref" | grep -oE '[0-9]+')
            if [ "$num" -gt 96 ] 2>/dev/null; then
                echo "❌ Invalid column reference: $ref (max is 96)"
                has_error=1
            fi
        done <<< "$refs"
        
        if [ $has_error -eq 1 ]; then
            return 1
        fi
        
        echo "✅ Column references valid"
    fi
    
    return 0
}

# Prepare-commit-msg hook: Add column info if in column context
cols_git_preparemsg() {
    local msg_file="$1"
    local source="$2"
    
    # If no source (new commit) and we have a current column
    if [ -z "$source" ] && [ -n "$MATRIX_CURRENT_COL" ]; then
        local col_num=$(echo "$MATRIX_CURRENT_COL" | grep -oE '^[0-9]+')
        local col_name=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col_num" --json 2>/dev/null | jq -r '.name')
        
        if [ -n "$col_name" ]; then
            echo "" >> "$msg_file"
            echo "🔥 Related: Col($col_num) - $col_name" >> "$msg_file"
        fi
    fi
}

# Post-checkout hook: Show column context for branch
cols_git_postcheckout() {
    local prev_head="$1"
    local new_head="$2"
    local branch_switch="$3"
    
    if [ "$branch_switch" = "1" ]; then
        local branch=$(git rev-parse --abbrev-ref HEAD)
        # Check if branch name contains column reference
        local col_ref=$(echo "$branch" | grep -oE 'col[0-9]+|COL-[0-9]+')
        
        if [ -n "$col_ref" ]; then
            local col_num=$(echo "$col_ref" | grep -oE '[0-9]+')
            echo "🔥 Switched to branch related to Col($col_num)"
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col_num" --no-color 2>/dev/null | head -10
        fi
    fi
}

# Install hooks
cols_git_install_hooks() {
    local git_dir=$(git rev-parse --git-dir 2>/dev/null)
    
    if [ -z "$git_dir" ]; then
        echo "❌ Not a git repository"
        return 1
    fi
    
    local hooks_dir="$git_dir/hooks"
    
    # Create wrapper scripts
    cat > "$hooks_dir/pre-commit" << 'HOOK'
#!/bin/bash
source "$(dirname "$0")/matrix-cols-hooks.sh"
cols_git_precommit
HOOK
    
    cat > "$hooks_dir/commit-msg" << 'HOOK'
#!/bin/bash
source "$(dirname "$0")/matrix-cols-hooks.sh"
cols_git_commitmsg "$1"
HOOK
    
    cat > "$hooks_dir/prepare-commit-msg" << 'HOOK'
#!/bin/bash
source "$(dirname "$0")/matrix-cols-hooks.sh"
cols_git_preparemsg "$1" "$2"
HOOK
    
    cat > "$hooks_dir/post-checkout" << 'HOOK'
#!/bin/bash
source "$(dirname "$0")/matrix-cols-hooks.sh"
cols_git_postcheckout "$1" "$2" "$3"
HOOK
    
    # Copy this script to hooks directory
    cp "$0" "$hooks_dir/matrix-cols-hooks.sh"
    
    # Make executable
    chmod +x "$hooks_dir"/*
    
    echo "✅ Git hooks installed"
    echo "   - pre-commit: Validates column references"
    echo "   - commit-msg: Validates commit message refs"
    echo "   - prepare-commit-msg: Adds column context"
    echo "   - post-checkout: Shows column context on branch switch"
}

# Main
case "$1" in
    "install")
        cols_git_install_hooks
        ;;
    "precommit")
        cols_git_precommit
        ;;
    "commitmsg")
        cols_git_commitmsg "$2"
        ;;
    "preparemsg")
        cols_git_preparemsg "$2" "$3"
        ;;
    "postcheckout")
        cols_git_postcheckout "$2" "$3" "$4"
        ;;
    *)
        echo "Usage: $0 {install|precommit|commitmsg <file>|preparemsg <file> <source>|postcheckout <prev> <new> <branch>}"
        ;;
esac
