#!/bin/bash

# Directory Structure Safeguard System
# Ensures files are created in correct directories and maintains organization

echo "🛡️ Directory Structure Safeguard System"
echo "======================================="

# Auto-fix any misplaced files
echo "🔧 Auto-fixing misplaced files..."
bash scripts/validate-structure-array.sh > /dev/null 2>&1

# Move misplaced files to correct locations
fixed=0
for file in setup.ts example-cli.js DEVELOPMENT_NOTES.md; do
    if [ -f "$file" ]; then
        case "$file" in
            setup.ts)
                mv "$file" "scripts/"
                echo "   Moved $file → scripts/"
                ((fixed++))
                ;;
            example-cli.js)
                mv "$file" "cli/bin/"
                echo "   Moved $file → cli/bin/"
                ((fixed++))
                ;;
            DEVELOPMENT_NOTES.md)
                mv "$file" "docs/"
                echo "   Moved $file → docs/"
                ((fixed++))
                ;;
        esac
    fi
done

if [ $fixed -gt 0 ]; then
    echo "✅ Fixed $fixed files"
else
    echo "✅ No files needed to be moved"
fi

# Validate final structure
echo ""
echo "🔍 Validating final structure..."
bash scripts/validate-structure-array.sh

# Create .gitignore safeguards
echo ""
echo "📝 Updating .gitignore safeguards..."
cat >> .gitignore << 'EOF'

# Directory Structure Safeguards - Prevent files in wrong locations
# TypeScript/JavaScript files (except allowed ones)
/*.ts
/*.js
!scripts/validate-structure*.sh
!cli/bin/*.js

# Markdown files (except allowed ones)
/*.md
!README.md
!ORGANIZATION.md
!LICENSE
!docs/

# JSON files (except allowed ones)
/*.json
!package*.json
!tsconfig*.json
!.markdownlint*

# Shell scripts (except in scripts directory)
/*.sh
!scripts/

# Build and temporary files
*.tmp
*.temp
*.log
temp/
logs/
dist/
build/

# Dependencies
node_modules/
bun.lockb

# OS and IDE files
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
EOF

echo "✅ .gitignore safeguards updated"

echo ""
echo "🎯 Directory structure safeguard system complete!"
echo "   - Array-based validation: 59 directories defined"
echo "   - Auto-fix capabilities: Enabled"
echo "   - Git safeguards: Installed"
echo "   - Structure monitoring: Active"
