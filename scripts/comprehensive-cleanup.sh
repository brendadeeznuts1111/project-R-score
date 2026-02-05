#!/bin/bash

# Comprehensive cleanup script for remaining sensitive files
echo "Starting comprehensive cleanup of remaining sensitive files..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Remove specific sensitive files
    git rm --cached -f .env* 2>/dev/null || true
    git rm --cached -f *.token 2>/dev/null || true
    git rm --cached -f *.key 2>/dev/null || true
    git rm --cached -f *.pem 2>/dev/null || true
    git rm --cached -f .detect-secrets.cfg 2>/dev/null || true
    
    # Remove config directories
    git rm -r --cached -f config/ 2>/dev/null || true
    git rm -r --cached -f configs/ 2>/dev/null || true
    
    # Remove node_modules from tracking if accidentally tracked
    git rm -r --cached -f node_modules/ 2>/dev/null || true
    
    # Remove specific sensitive patterns
    git ls-files | grep -E "(secrets|auth|credentials)" | xargs git rm --cached 2>/dev/null || true
    
    # Remove bun cache files from tracking
    git ls-files | grep -E "\$HOME/.bun" | xargs git rm --cached 2>/dev/null || true
    
    cd - > /dev/null
done

echo "Comprehensive cleanup complete!"
echo "Run commit script to commit these changes."
