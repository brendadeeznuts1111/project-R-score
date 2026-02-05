#!/bin/bash

# Fire22 Dashboard Worker - File Reorganization Script
# This script reorganizes the file structure for better maintainability

set -e  # Exit on error

echo "🔥 Fire22 Dashboard Worker File Reorganization"
echo "=============================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "src" ]]; then
    print_error "This script must be run from the dashboard-worker root directory"
    exit 1
fi

# Create backup
print_status "Creating backup of current structure..."
BACKUP_DIR="../dashboard-worker-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
print_success "Backup created at: $BACKUP_DIR"

# Create new directory structure
print_status "Creating new directory structure..."

# Main source directories
mkdir -p src/{core,features,ui,lib,workers}
mkdir -p src/features/{dashboard,api,casino,sports,telegram}
mkdir -p src/features/api/{fire22,manager,health}
mkdir -p src/ui/{terminal,themes}
mkdir -p src/workers/{durable,scheduled}
mkdir -p src/lib/{utils,validation,formatting}

# Documentation directories
mkdir -p docs/{api,guides,terminal-ui,architecture}
mkdir -p docs/terminal-ui/examples

# Test directories
mkdir -p tests/{unit,integration,e2e}

# Other directories
mkdir -p scripts
mkdir -p releases/{current/v3.0.8,archive}
mkdir -p config

print_success "Directory structure created"

# Function to safely move files
safe_move() {
    local source=$1
    local dest=$2
    
    if [[ -f "$source" ]]; then
        mv "$source" "$dest"
        print_success "Moved: $(basename $source) → $(basename $dest)"
    else
        print_warning "File not found: $source"
    fi
}

# Function to rename and move documentation files
clean_doc_name() {
    local file=$1
    local dest_dir=$2
    
    if [[ -f "$file" ]]; then
        # Get basename and convert to lowercase with dashes
        local basename=$(basename "$file")
        local newname=$(echo "$basename" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g' | sed 's/@//g')
        
        # Move to destination
        mv "$file" "$dest_dir/$newname"
        print_success "Cleaned: $basename → $newname"
    fi
}

# Reorganize core files
print_status "Reorganizing core files..."

safe_move "src/index.ts" "src/core/index.ts"
safe_move "src/router.ts" "src/core/router.ts"
safe_move "src/config.ts" "src/core/config.ts"
safe_move "src/types.ts" "src/core/types.ts"
safe_move "src/globals.ts" "src/core/globals.ts"
safe_move "src/utils.ts" "src/lib/utils/index.ts"
safe_move "src/constants-definitions.ts" "src/core/constants.ts"

# Reorganize feature files
print_status "Reorganizing feature modules..."

# Dashboard files
safe_move "src/dashboard.html" "src/features/dashboard/index.html"
safe_move "src/dashboard-ultimate-v1.0.01" "src/features/dashboard/legacy-dashboard.html"

# API files
safe_move "src/fire22-api.ts" "src/features/api/fire22/client.ts"
safe_move "src/fire22-config.ts" "src/features/api/fire22/config.ts"
safe_move "src/fire22-api.test.ts" "tests/unit/fire22-api.test.ts"

# Business/Casino/Sports files
safe_move "src/business-management.ts" "src/features/sports/business-management.ts"
safe_move "src/live-casino-management.ts" "src/features/casino/live-management.ts"
safe_move "src/sports-betting-management.ts" "src/features/sports/betting-management.ts"

# Telegram files
safe_move "src/telegram-bot.ts" "src/features/telegram/bot.ts"
safe_move "src/queue-system.ts" "src/features/telegram/queue.ts"

# Move and rename Terminal UI files
print_status "Reorganizing Terminal UI system..."

if [[ -d "docs" ]]; then
    # Terminal framework files
    safe_move "docs/terminal-framework.css" "src/ui/terminal/framework.css"
    safe_move "docs/terminal-components.css" "src/ui/terminal/components.css"
    safe_move "docs/terminal-components.js" "src/ui/terminal/components.js"
    safe_move "docs/terminal-fallbacks.css" "src/ui/terminal/fallbacks.css"
    safe_move "docs/terminal-polyfills.js" "src/ui/terminal/polyfills.js"
    
    # Terminal documentation
    safe_move "docs/terminal-components-library.md" "docs/terminal-ui/component-library.md"
    safe_move "docs/terminal-optimization-guide.md" "docs/terminal-ui/optimization-guide.md"
    safe_move "docs/browser-compatibility-guide.md" "docs/terminal-ui/browser-compatibility.md"
    safe_move "docs/accessibility-compliance-checklist.md" "docs/terminal-ui/accessibility-checklist.md"
    
    # Terminal examples
    safe_move "docs/terminal-components-demo.html" "docs/terminal-ui/examples/components-demo.html"
    safe_move "docs/terminal-browser-compatibility-test.html" "docs/terminal-ui/examples/compatibility-test.html"
    safe_move "docs/terminal-performance-accessibility-audit.html" "docs/terminal-ui/examples/audit-tool.html"
fi

# Clean up documentation file names
print_status "Cleaning documentation file names..."

# API docs
for file in docs/*api*.{md,html}; do
    [[ -f "$file" ]] && clean_doc_name "$file" "docs/api"
done

# Build and environment docs
for file in docs/*BUILD*.md docs/*build*.{md,html} docs/*environment*.{md,html}; do
    [[ -f "$file" ]] && clean_doc_name "$file" "docs/guides"
done

# Architecture docs
for file in docs/*ARCHITECTURE*.md docs/*INTEGRATION*.md docs/*SYSTEM*.md; do
    [[ -f "$file" ]] && clean_doc_name "$file" "docs/architecture"
done

# Move remaining docs
print_status "Moving remaining documentation..."

# Special handling for specific files
safe_move "docs/@packages.html" "docs/api/packages.html"
safe_move "docs/DOCUMENTATION-HUB.html" "docs/index.html"
safe_move "CHANGELOG.md" "releases/CHANGELOG.md"

# Move release files
print_status "Organizing release files..."

for file in releases/*.md; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        if [[ "$filename" == *"3.0.8"* ]]; then
            mv "$file" "releases/current/v3.0.8/"
        else
            mv "$file" "releases/archive/"
        fi
        print_success "Moved release: $filename"
    fi
done

# Create index files
print_status "Creating index files..."

# Create main feature index
cat > src/features/index.ts << 'EOF'
// Fire22 Dashboard Features - Main Export
export * from './dashboard';
export * from './api';
export * from './casino';
export * from './sports';
export * from './telegram';
EOF

# Create UI index
cat > src/ui/index.ts << 'EOF'
// Fire22 UI Components - Main Export
export * from './terminal';
export * from './themes';
EOF

# Create terminal index
cat > src/ui/terminal/index.ts << 'EOF'
// Fire22 Terminal UI System
import './framework.css';
import './components.css';

export { TerminalComponents } from './components.js';
export { TerminalPolyfills } from './polyfills.js';

// Re-export CSS as strings for bundling
export { default as frameworkCSS } from './framework.css?raw';
export { default as componentsCSS } from './components.css?raw';
EOF

# Create a migration guide
cat > MIGRATION_GUIDE.md << 'EOF'
# File Reorganization Migration Guide

## Import Path Updates

### Core Imports
```typescript
// Old
import { config } from '../config';

// New
import { config } from '@/core/config';
```

### Feature Imports
```typescript
// Old
import { Fire22API } from '../fire22-api';

// New
import { Fire22API } from '@/features/api/fire22/client';
```

### UI Imports
```typescript
// Old
import '../docs/terminal-components.css';

// New
import '@/ui/terminal/components.css';
```

## Updated File Locations

| Old Location | New Location |
|--------------|--------------|
| src/dashboard.html | src/features/dashboard/index.html |
| src/fire22-api.ts | src/features/api/fire22/client.ts |
| docs/terminal-framework.css | src/ui/terminal/framework.css |
| docs/@packages.html | docs/api/packages.html |
| releases/*.md | releases/current/ or releases/archive/ |

## Configuration Updates

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./src/core/*"],
      "@features/*": ["./src/features/*"],
      "@ui/*": ["./src/ui/*"],
      "@lib/*": ["./src/lib/*"]
    }
  }
}
```

Update `wrangler.toml`:
```toml
[build]
command = "bun run build"

[build.upload]
format = "modules"
main = "./src/core/index.ts"
```

## Next Steps

1. Update all import statements
2. Test build process
3. Verify all features work
4. Update CI/CD pipelines
EOF

print_success "Created index files and migration guide"

# Summary
echo ""
echo "========================================"
print_success "🎉 Reorganization Complete!"
echo "========================================"
echo ""
echo "Summary of changes:"
echo "  • Created modular directory structure"
echo "  • Reorganized source files into features"
echo "  • Cleaned documentation file names"
echo "  • Moved Terminal UI to proper location"
echo "  • Created index files for exports"
echo ""
echo "Next steps:"
echo "  1. Review MIGRATION_GUIDE.md"
echo "  2. Update import statements in TypeScript files"
echo "  3. Update wrangler.toml configuration"
echo "  4. Run 'bun test' to verify everything works"
echo "  5. Commit changes with: git add . && git commit -m '🔧 Reorganize file structure for better maintainability'"
echo ""
echo "Backup saved at: $BACKUP_DIR"
echo ""
print_warning "Please review changes carefully before committing!"