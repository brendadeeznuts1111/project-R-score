#!/bin/bash

# Crystal Clear Architecture - Project Cleanup Script
# This script helps maintain clean project organization

echo "🧹 Crystal Clear Architecture - Project Cleanup"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "📁 Analyzing project structure..."

# Create backup directory for safety
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. Find and move misplaced files
echo "🔍 Finding misplaced files..."

# Move any remaining .md files in root to docs/
find . -maxdepth 1 -name "*.md" ! -name "README.md" ! -name "PROJECT-ORGANIZATION.md" ! -name "ORGANIZATION-SUMMARY.md" | while read file; do
    if [ -f "$file" ]; then
        mv "$file" "docs/guides/" 2>/dev/null && print_status "Moved $file to docs/guides/"
    fi
done

# Move any remaining .ts files in root to scripts/utils/
find . -maxdepth 1 -name "*.ts" ! -name "bunfig.toml" | while read file; do
    if [ -f "$file" ]; then
        mv "$file" "scripts/utils/" 2>/dev/null && print_status "Moved $file to scripts/utils/"
    fi
done

# 2. Clean up duplicate files
echo "🧽 Cleaning up duplicates..."

# Remove backup files that are no longer needed
find . -name "*.backup" -type f | while read file; do
    rm "$file" 2>/dev/null && print_status "Removed backup file: $file"
done

# Remove temporary files
find . -name "*.tmp" -o -name "*.temp" -o -name "*~" -type f | while read file; do
    rm "$file" 2>/dev/null && print_status "Removed temp file: $file"
done

# 3. Organize log files
echo "📊 Organizing log files..."

if [ ! -d "logs" ]; then
    mkdir -p logs
fi

find . -name "*.log" -type f | while read file; do
    mv "$file" "logs/" 2>/dev/null && print_status "Moved log file: $file to logs/"
done

# 4. Clean up empty directories
echo "📁 Removing empty directories..."

find . -type d -empty -not -path "./.git/*" | while read dir; do
    rmdir "$dir" 2>/dev/null && print_status "Removed empty directory: $dir"
done

# 5. Check for large files
echo "📏 Checking for large files..."

find . -type f -size +10M -not -path "./node_modules/*" -not -path "./.git/*" | while read file; do
    print_warning "Large file found: $file ($(du -h "$file" | cut -f1))"
done

# 6. Validate project structure
echo "✅ Validating project structure..."

# Check for required directories
REQUIRED_DIRS=("docs" "scripts" "src" "config" "tools")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status "Directory exists: $dir/"
    else
        print_warning "Missing directory: $dir/"
    fi
done

# Check for important files
IMPORTANT_FILES=("README.md" "package.json" ".gitignore")
for file in "${IMPORTANT_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "File exists: $file"
    else
        print_error "Missing file: $file"
    fi
done

# 7. Generate organization report
echo "📊 Generating organization report..."

ROOT_FILES=$(ls -1 | wc -l)
echo "Root directory files: $ROOT_FILES"

ORG_SCORE=$((100 - ROOT_FILES * 2))
if [ $ORG_SCORE -lt 0 ]; then
    ORG_SCORE=0
fi

echo "Organization score: $ORG_SCORE%"

# 8. Create .gitkeep files for empty directories
echo "📂 Creating .gitkeep files..."

find . -type d -empty -not -path "./.git/*" | while read dir; do
    touch "$dir/.gitkeep" && print_status "Created .gitkeep in: $dir"
done

echo ""
print_status "Project cleanup completed!"
echo ""
echo "📋 Summary:"
echo "   • Files organized into proper directories"
echo "   • Duplicate and temporary files removed"
echo "   • Empty directories cleaned up"
echo "   • Project structure validated"
echo "   • Organization score: $ORG_SCORE%"
echo ""
echo "🔄 Run 'git status' to see the changes"
echo "🔄 Run 'git add .' to stage all changes"
echo "🔄 Run 'git commit -m \"Clean up project organization\"' to commit"

echo ""
print_status "Cleanup script finished successfully! 🎉"
