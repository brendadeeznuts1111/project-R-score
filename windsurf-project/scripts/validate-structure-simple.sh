#!/bin/bash

# Directory Structure Validator - Simplified Version
set -e

echo "🔍 Directory Structure Validator"
echo "=================================="

# Check for files that shouldn't be in root
echo "📁 Checking for misplaced files in root..."

violations=()

# Check for TypeScript/JavaScript files in root
for file in *.ts *.js 2>/dev/null; do
    if [ -f "$file" ] && [ "$file" != "validate-structure.sh" ]; then
        violations+=("$file (should be in src/ or cli/)")
    fi
done

# Check for markdown files in root (except allowed ones)
for file in *.md 2>/dev/null; do
    if [ -f "$file" ] && [[ "$file" != "README.md" && "$file" != "ORGANIZATION.md" && "$file" != "LICENSE" ]]; then
        violations+=("$file (should be in docs/)")
    fi
done

# Check for shell scripts in root (except allowed ones)
for file in *.sh 2>/dev/null; do
    if [ -f "$file" ] && [[ "$file" != "validate-structure.sh" ]]; then
        violations+=("$file (should be in scripts/)")
    fi
done

# Check for JSON files in root (except allowed ones)
for file in *.json 2>/dev/null; do
    if [ -f "$file" ] && [[ "$file" != "package.json" && "$file" != "package-lock.json" && "$file" != "tsconfig.json" ]]; then
        violations+=("$file (should be in config/ or demos/)")
    fi
done

# Report results
if [ ${#violations[@]} -eq 0 ]; then
    echo "✅ No misplaced files found in root directory!"
    echo "✅ Directory structure is properly organized!"
else
    echo "❌ Found ${#violations[@]} misplaced files:"
    for violation in "${violations[@]}"; do
        echo "   - $violation"
    done
    echo ""
    echo "💡 Run with --fix to automatically move these files"
fi

# Auto-fix option
if [ "$1" == "--fix" ]; then
    echo ""
    echo "🔧 Auto-fixing misplaced files..."
    
    fixed=0
    
    # Move TypeScript/JavaScript files
    for file in *.ts *.js 2>/dev/null; do
        if [ -f "$file" ] && [ "$file" != "validate-structure.sh" ]; then
            if [[ "$file" == *"cli"* ]] || [[ "$file" == *"command"* ]]; then
                mkdir -p cli/commands
                mv "$file" "cli/commands/"
                echo "   Moved $file → cli/commands/"
            else
                mkdir -p src
                mv "$file" "src/"
                echo "   Moved $file → src/"
            fi
            ((fixed++))
        fi
    done
    
    # Move markdown files
    for file in *.md 2>/dev/null; do
        if [ -f "$file" ] && [[ "$file" != "README.md" && "$file" != "ORGANIZATION.md" && "$file" != "LICENSE" ]]; then
            mkdir -p docs
            mv "$file" "docs/"
            echo "   Moved $file → docs/"
            ((fixed++))
        fi
    done
    
    # Move shell scripts
    for file in *.sh 2>/dev/null; do
        if [ -f "$file" ] && [[ "$file" != "validate-structure.sh" ]]; then
            mkdir -p scripts
            mv "$file" "scripts/"
            echo "   Moved $file → scripts/"
            ((fixed++))
        fi
    done
    
    # Move JSON files
    for file in *.json 2>/dev/null; do
        if [ -f "$file" ] && [[ "$file" != "package.json" && "$file" != "package-lock.json" && "$file" != "tsconfig.json" ]]; then
            if [[ "$file" == *"demo"* ]] || [[ "$file" == *"mock"* ]]; then
                mkdir -p demos
                mv "$file" "demos/"
                echo "   Moved $file → demos/"
            else
                mkdir -p config
                mv "$file" "config/"
                echo "   Moved $file → config/"
            fi
            ((fixed++))
        fi
    done
    
    echo "✅ Fixed $fixed files"
fi

echo ""
echo "🎯 Directory structure validation complete!"
