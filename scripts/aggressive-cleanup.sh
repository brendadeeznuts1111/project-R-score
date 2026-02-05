#!/bin/bash

# Aggressive cleanup for remaining sensitive files
echo "Starting aggressive cleanup of remaining sensitive files..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Get list of sensitive files and remove them
    sensitive_files=$(git ls-files | grep -E "(config|\.env|\.token|\.key|\.pem|secrets|auth|credentials)" 2>/dev/null || true)
    
    if [ -n "$sensitive_files" ]; then
        echo "$sensitive_files" | xargs git rm --cached -f 2>/dev/null || true
        echo "  Removed sensitive files from tracking"
    fi
    
    # Also remove any remaining node_modules or cache files
    git ls-files | grep -E "(node_modules|\.cache|dist|build)" | xargs git rm --cached -f 2>/dev/null || true
    
    cd - > /dev/null
done

echo "Aggressive cleanup complete!"
