#!/bin/bash

# Script to clean up git tracking in all subdirectories
# This will remove sensitive files from git tracking across all projects

echo "Cleaning up git tracking in all project repositories..."

# Find all .git directories and process each repository
find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Remove files that match our ignore patterns
    git rm -r --cached -f config/ 2>/dev/null || true
    git rm -r --cached -f secrets/ 2>/dev/null || true
    git rm -r --cached -f auth/ 2>/dev/null || true
    git rm -r --cached -f credentials/ 2>/dev/null || true
    git rm -r --cached -f .tokens/ 2>/dev/null || true
    git rm -r --cached -f .secrets/ 2>/dev/null || true
    git rm -r --cached -f .sensitive/ 2>/dev/null || true
    
    # Remove individual sensitive files
    git rm --cached -f *.token 2>/dev/null || true
    git rm --cached -f *.key 2>/dev/null || true
    git rm --cached -f *.pem 2>/dev/null || true
    git rm --cached -f *.p12 2>/dev/null || true
    git rm --cached -f *.pfx 2>/dev/null || true
    git rm --cached -f .env* 2>/dev/null || true
    
    # Remove common build/cache directories
    git rm -r --cached -f node_modules/ 2>/dev/null || true
    git rm -r --cached -f dist/ 2>/dev/null || true
    git rm -r --cached -f .cache/ 2>/dev/null || true
    git rm -r --cached -f tmp/ 2>/dev/null || true
    git rm -r --cached -f temp/ 2>/dev/null || true
    
    cd - > /dev/null
done

echo "Git cleanup complete!"
echo "Review the changes with 'git status' in each repository before committing."
