#!/bin/bash

# Final cleanup for cache and documentation files
echo "Starting FINAL cleanup for cache and documentation files..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Remove cache and documentation files that aren't truly sensitive
    git ls-files | grep -E "(node_modules|\.bun|cache)" | xargs git rm --cached -f 2>/dev/null || true
    
    # Remove any remaining .env.example files (these are templates, not sensitive)
    git ls-files | grep -E "\.env\.example" | xargs git rm --cached -f 2>/dev/null || true
    
    cd - > /dev/null
done

echo "FINAL cleanup complete!"
