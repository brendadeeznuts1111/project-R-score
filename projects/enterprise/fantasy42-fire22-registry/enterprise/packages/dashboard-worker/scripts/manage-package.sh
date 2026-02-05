#!/usr/bin/env bash
# scripts/manage-package.sh - Package.json management using bun pm pkg

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Show help
show_help() {
    echo "📦 Fire22 Enhanced Package Manager with bunx --package Support"
    echo "=============================================================="
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  info              Show package information"
    echo "  scripts           List all scripts"
    echo "  add-script        Add or update a script"
    echo "  remove-script     Remove a script"
    echo "  deps              List all dependencies"
    echo "  update-meta       Update package metadata"
    echo "  fix               Fix package.json issues"
    echo "  validate          Validate package configuration"
    echo "  bunx-examples     Show bunx --package usage examples"
    echo "  install-tools     Install common development tools"
    echo "  check-tools       Check availability of bunx tools"
    echo ""
    echo "Basic Examples:"
    echo "  $0 info"
    echo "  $0 scripts"
    echo "  $0 add-script test 'bun test'"
    echo "  $0 remove-script test:old"
    echo "  $0 update-meta author 'Fire22 Team'"
    echo ""
    echo "Enhanced bunx --package Examples:"
    echo "  $0 bunx-examples          # Show bunx usage patterns"
    echo "  $0 check-tools            # Check tool availability"
    echo "  $0 add-script lint 'bunx --package @typescript-eslint/eslint-plugin eslint --fix'"
    echo "  $0 add-script format 'bunx --package prettier prettier --write .'"
    echo "  $0 add-script typecheck 'bunx --package typescript tsc --noEmit'"
    echo ""
}

# Show bunx --package examples
show_bunx_examples() {
    print_color "$BLUE" "🚀 bunx --package Usage Examples"
    echo "================================="
    echo ""
    
    echo "🎯 TypeScript & Linting:"
    echo "  bunx --package typescript tsc --noEmit                                    # Type checking"
    echo "  bunx --package @typescript-eslint/eslint-plugin eslint --fix             # ESLint with auto-fix"
    echo "  bunx --package prettier prettier --write .                               # Code formatting"
    echo ""
    
    echo "🧪 Testing & Quality:"
    echo "  bunx --package jest jest --coverage                                       # Jest testing"
    echo "  bunx --package cypress cypress run                                        # E2E testing"
    echo "  bunx --package stylelint stylelint '**/*.css' --fix                      # CSS linting"
    echo ""
    
    echo "📦 Bundle Analysis:"
    echo "  bunx --package webpack-bundle-analyzer webpack-bundle-analyzer dist/stats.json"
    echo "  bunx --package source-map-explorer source-map-explorer 'dist/js/*.js'"
    echo ""
    
    echo "🔧 Framework CLIs:"
    echo "  bunx --package @angular/cli ng generate component my-component            # Angular CLI"
    echo "  bunx --package @nestjs/cli nest generate service my-service              # NestJS CLI"
    echo "  bunx --package @vue/cli vue create my-project                           # Vue CLI"
    echo "  bunx --package create-react-app create-react-app my-app                 # Create React App"
    echo ""
    
    echo "🔄 Build Tools:"
    echo "  bunx --package vite vite build                                           # Vite build"
    echo "  bunx --package webpack webpack --config webpack.prod.js                 # Webpack build"
    echo "  bunx --package @storybook/cli sb init                                   # Storybook init"
    echo ""
    
    echo "🔍 Dependency Management:"
    echo "  bunx --package npm-check-updates ncu -i                                 # Interactive updates"
    echo "  bunx --package npm-audit-resolver npm-audit-resolver check              # Security audit"
    echo ""
}

# Check tool availability
check_tools() {
    print_color "$BLUE" "🔍 Checking bunx Tool Availability"
    echo "=================================="
    echo ""
    
    local tools=(
        "typescript:tsc"
        "@typescript-eslint/eslint-plugin:eslint"
        "prettier:prettier"
        "jest:jest"
        "cypress:cypress"
        "webpack-bundle-analyzer:webpack-bundle-analyzer"
        "source-map-explorer:source-map-explorer"
        "@angular/cli:ng"
        "@nestjs/cli:nest"
        "@vue/cli:vue"
        "vite:vite"
        "webpack:webpack"
        "@storybook/cli:sb"
        "npm-check-updates:ncu"
        "npm-audit-resolver:npm-audit-resolver"
    )
    
    for tool in "${tools[@]}"; do
        IFS=':' read -r package binary <<< "$tool"
        if bunx --package "$package" "$binary" --version >/dev/null 2>&1 || 
           bunx --package "$package" "$binary" --help >/dev/null 2>&1; then
            print_color "$GREEN" "  ✓ $package ($binary)"
        else
            print_color "$YELLOW" "  ⚠️  $package ($binary) - not available"
        fi
    done
    
    echo ""
    print_color "$BLUE" "💡 To use these tools, run:"
    echo "  bunx --package <package-name> <binary-name> [args]"
}

# Install common development tools
install_tools() {
    print_color "$BLUE" "🛠️ Installing Common Development Tools"
    echo "====================================="
    echo ""
    
    local dev_tools=(
        "@typescript-eslint/eslint-plugin"
        "prettier" 
        "jest"
        "typescript"
        "webpack-bundle-analyzer"
        "source-map-explorer"
        "npm-check-updates"
        "stylelint"
    )
    
    echo "Installing common dev tools as devDependencies..."
    for tool in "${dev_tools[@]}"; do
        print_color "$GREEN" "Installing $tool..."
        bun add -D "$tool" 2>/dev/null || print_color "$YELLOW" "  ⚠️ Failed to install $tool"
    done
    
    echo ""
    print_color "$GREEN" "✅ Installation complete!"
    echo ""
    echo "You can now use these tools with bunx --package:"
    echo "  bunx --package typescript tsc --noEmit"
    echo "  bunx --package prettier prettier --write ."
    echo "  bunx --package jest jest --coverage"
}

# Get package info with enhanced JSON formatting
get_info() {
    print_color "$BLUE" "📋 Enhanced Package Information"
    echo "==============================="
    echo ""
    
    echo "Basic Info:"
    echo "  Name: $(bun pm pkg get name 2>/dev/null || echo 'Not set')"
    echo "  Version: $(bun pm pkg get version 2>/dev/null || echo 'Not set')"
    echo "  Description: $(bun pm pkg get description 2>/dev/null || echo 'Not set')"
    echo "  License: $(bun pm pkg get license 2>/dev/null || echo 'Not set')"
    echo "  Author: $(bun pm pkg get author 2>/dev/null || echo 'Not set')"
    echo ""
    
    echo "Repository:"
    echo "  Type: $(bun pm pkg get repository.type 2>/dev/null || echo 'Not set')"
    echo "  URL: $(bun pm pkg get repository.url 2>/dev/null || echo 'Not set')"
    echo ""
    
    # Enhanced dependency counting using bunx jq if available
    if bunx --package jq jq --version >/dev/null 2>&1; then
        print_color "$GREEN" "📊 Enhanced Statistics (using bunx --package jq):"
        echo "  Scripts: $(bun pm pkg get scripts 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
        echo "  Dependencies: $(bun pm pkg get dependencies 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
        echo "  Dev Dependencies: $(bun pm pkg get devDependencies 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
        echo "  Peer Dependencies: $(bun pm pkg get peerDependencies 2>/dev/null | bunx --package jq jq 'keys | length' 2>/dev/null || echo '0')"
    else
        echo "Basic Statistics:"
        echo "  Scripts Count: $(bun pm pkg get scripts 2>/dev/null | grep -c ':' || echo '0')"
        echo "  Dependencies Count: $(bun pm pkg get dependencies 2>/dev/null | grep -c ':' || echo '0')"
        echo "  Dev Dependencies Count: $(bun pm pkg get devDependencies 2>/dev/null | grep -c ':' || echo '0')"
    fi
    
    echo ""
    print_color "$BLUE" "💡 Tip: Run '$0 bunx-examples' to see bunx --package usage patterns"
}

# List scripts
list_scripts() {
    print_color "$BLUE" "📜 Available Scripts"
    echo "===================="
    echo ""
    
    bun pm pkg get scripts 2>/dev/null || echo "No scripts found"
}

# Add or update script
add_script() {
    local name=$1
    local command=$2
    
    if [ -z "$name" ] || [ -z "$command" ]; then
        print_color "$RED" "Error: Script name and command required"
        echo "Usage: $0 add-script <name> <command>"
        exit 1
    fi
    
    print_color "$GREEN" "➕ Adding script: $name"
    bun pm pkg set "scripts.$name=$command"
    echo "✓ Script added successfully"
}

# Remove script
remove_script() {
    local name=$1
    
    if [ -z "$name" ]; then
        print_color "$RED" "Error: Script name required"
        echo "Usage: $0 remove-script <name>"
        exit 1
    fi
    
    print_color "$YELLOW" "➖ Removing script: $name"
    bun pm pkg delete "scripts.$name"
    echo "✓ Script removed successfully"
}

# List dependencies
list_deps() {
    print_color "$BLUE" "📦 Dependencies"
    echo "==============="
    echo ""
    
    echo "Production Dependencies:"
    bun pm pkg get dependencies 2>/dev/null || echo "  None"
    echo ""
    
    echo "Dev Dependencies:"
    bun pm pkg get devDependencies 2>/dev/null || echo "  None"
    echo ""
    
    echo "Peer Dependencies:"
    bun pm pkg get peerDependencies 2>/dev/null || echo "  None"
    echo ""
    
    echo "Optional Dependencies:"
    bun pm pkg get optionalDependencies 2>/dev/null || echo "  None"
}

# Update metadata
update_meta() {
    local field=$1
    local value=$2
    
    if [ -z "$field" ] || [ -z "$value" ]; then
        print_color "$RED" "Error: Field and value required"
        echo "Usage: $0 update-meta <field> <value>"
        echo "Examples:"
        echo "  $0 update-meta author 'Fire22 Team'"
        echo "  $0 update-meta license MIT"
        exit 1
    fi
    
    print_color "$GREEN" "🔧 Updating $field"
    bun pm pkg set "$field=$value"
    echo "✓ Updated successfully"
}

# Fix package.json
fix_package() {
    print_color "$YELLOW" "🔧 Fixing package.json issues..."
    bun pm pkg fix
    echo "✓ Package.json fixed"
}

# Validate package
validate_package() {
    print_color "$BLUE" "🔍 Validating package.json"
    echo "=========================="
    echo ""
    
    local valid=true
    
    # Check required fields
    echo "Checking required fields..."
    
    if [ -z "$(bun pm pkg get name 2>/dev/null)" ]; then
        print_color "$RED" "  ✗ Missing: name"
        valid=false
    else
        print_color "$GREEN" "  ✓ name"
    fi
    
    if [ -z "$(bun pm pkg get version 2>/dev/null)" ]; then
        print_color "$RED" "  ✗ Missing: version"
        valid=false
    else
        print_color "$GREEN" "  ✓ version"
    fi
    
    # Check for common scripts
    echo ""
    echo "Checking common scripts..."
    
    for script in "build" "test" "lint" "dev"; do
        if bun pm pkg get "scripts.$script" &>/dev/null; then
            print_color "$GREEN" "  ✓ $script"
        else
            print_color "$YELLOW" "  ⚠️ Missing: $script (optional)"
        fi
    done
    
    # Check for exact versions in .npmrc
    echo ""
    echo "Checking configuration..."
    
    if grep -q "save-exact=true" .npmrc 2>/dev/null; then
        print_color "$GREEN" "  ✓ Exact versions enabled"
    else
        print_color "$YELLOW" "  ⚠️ Exact versions not enabled"
    fi
    
    echo ""
    if [ "$valid" = true ]; then
        print_color "$GREEN" "✅ Validation passed!"
    else
        print_color "$RED" "❌ Validation failed - fix required fields"
        exit 1
    fi
}

# Main command handler
main() {
    case "${1:-help}" in
        info)
            get_info
            ;;
        scripts)
            list_scripts
            ;;
        add-script)
            add_script "${2:-}" "${3:-}"
            ;;
        remove-script)
            remove_script "${2:-}"
            ;;
        deps)
            list_deps
            ;;
        update-meta)
            update_meta "${2:-}" "${3:-}"
            ;;
        fix)
            fix_package
            ;;
        validate)
            validate_package
            ;;
        bunx-examples)
            show_bunx_examples
            ;;
        check-tools)
            check_tools
            ;;
        install-tools)
            install_tools
            ;;
        help|--help|-h|*)
            show_help
            ;;
    esac
}

# Run main function
main "$@"