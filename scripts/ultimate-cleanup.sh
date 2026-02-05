#!/bin/bash

# Ultimate cleanup for remaining truly sensitive files
echo "Starting ULTIMATE cleanup for remaining truly sensitive files..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Remove ALL remaining truly sensitive files
    git ls-files | grep -E "(\.env|\.token|\.key|\.pem|secrets\.|credentials|auth/|password)" | xargs git rm --cached -f 2>/dev/null || true
    
    # Remove detect-secrets and other security scan files
    git ls-files | grep -E "(\.detect-secrets|\.secrets\.baseline)" | xargs git rm --cached -f 2>/dev/null || true
    
    # Remove any remaining node_modules that were accidentally tracked
    git ls-files | grep -E "node_modules" | xargs git rm --cached -f 2>/dev/null || true
    
    # Remove bun cache files from tracking
    git ls-files | grep -E "\$HOME/.bun" | xargs git rm --cached -f 2>/dev/null || true
    
    cd - > /dev/null
done

echo "ULTIMATE cleanup complete!"
