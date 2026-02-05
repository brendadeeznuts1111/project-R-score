#!/bin/bash

# Final targeted cleanup for truly sensitive files only
echo "Starting final targeted cleanup for truly sensitive files..."

find . -name ".git" -type d | while read git_dir; do
    repo_dir=$(dirname "$git_dir")
    echo "Processing repository: $repo_dir"
    
    cd "$repo_dir" || continue
    
    # Remove only the most sensitive patterns
    git ls-files | grep -E "(\.env|\.token|\.key|\.pem|secrets\.|credentials|auth/|password)" | xargs git rm --cached -f 2>/dev/null || true
    
    # Remove obvious config directories that contain sensitive data
    git ls-files | grep -E "^config/.*\.(toml|json|yaml|yml)$" | xargs git rm --cached -f 2>/dev/null || true
    
    cd - > /dev/null
done

echo "Final targeted cleanup complete!"
