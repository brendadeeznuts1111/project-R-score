#!/bin/bash

# Script to commit git cleanup changes in all repositories
echo "Committing cleanup changes in all repositories..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Check if there are changes to commit
    if ! git diff --cached --quiet 2>/dev/null || ! git diff --quiet 2>/dev/null || [ -n "$(git ls-files --deleted)" ]; then
        echo "  Committing changes..."
        git add .
        git commit -m "Remove sensitive files from tracking

- Remove config/ directory with sensitive configurations
- Remove .env files and templates  
- Remove security files and proxy configs
- Remove build artifacts and deployment configs
- Clean up git tracking per security policy"
        echo "  ✓ Committed"
    else
        echo "  No changes to commit"
    fi
    
    cd - > /dev/null
done

echo "All repositories committed!"
echo "Run 'git push' in each repository to update remote if needed."
