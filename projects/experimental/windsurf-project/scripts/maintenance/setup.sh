#!/bin/bash
# setup.sh - DuoPlus Automation System Setup Script

set -e

echo "🚀 DuoPlus Automation System Setup"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if Bun is installed
check_bun() {
    if command -v bun &> /dev/null; then
        print_success "Bun is installed"
        bun --version
    else
        print_error "Bun is not installed"
        print_info "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        source ~/.bashrc
        print_success "Bun installed successfully"
    fi
}

# Check if Git is installed
check_git() {
    if command -v git &> /dev/null; then
        print_success "Git is installed"
        git --version
    else
        print_error "Git is not installed"
        print_info "Please install Git first: https://git-scm.com/downloads"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    if bun install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_info "Creating environment file..."
        cp config/.env.example .env
        print_success "Environment file created (.env)"
        print_warning "Please edit .env with your API keys and configuration"
    else
        print_warning "Environment file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    directories=(
        "logs"
        "reports"
        "data"
        "cache"
        "temp"
        "screenshots"
        "exports"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
}

# Setup Git hooks
setup_git_hooks() {
    print_info "Setting up Git hooks..."
    
    # Make pre-commit hook executable
    if [ -f .git/hooks/pre-commit ]; then
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured"
    else
        print_warning "Git hooks not found - skipping"
    fi
}

# Run initial tests
run_tests() {
    print_info "Running initial tests..."
    
    if bun run duoplus-integrate --summary > /dev/null 2>&1; then
        print_success "Integration test passed"
    else
        print_warning "Integration test failed - this is normal for first setup"
    fi
}

# Generate initial documentation
generate_docs() {
    print_info "Generating initial documentation..."
    
    if bun run changelog-parse > /dev/null 2>&1; then
        print_success "Documentation generated"
    else
        print_warning "Documentation generation failed - this is normal for first setup"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Edit .env file with your configuration:"
    echo "   - DUOPLUS_API_KEY"
    echo "   - CLOUDFLARE credentials (optional)"
    echo "   - Proxy settings (optional)"
    echo ""
    echo "2. Start the development environment:"
    echo "   bun run dashboard                    # Launch dashboards"
    echo "   bun run duoplus-parse               # Parse changelogs"
    echo "   bun run duoplus-benchmark           # Run benchmarks"
    echo ""
    echo "3. Access your dashboards:"
    echo "   - Storage: http://localhost:3004"
    echo "   - Analytics: http://localhost:3005"
    echo ""
    echo "4. Learn more:"
    echo "   - Read README_DUO_AUTOMATION.md"
    echo "   - Check docs/ directory for documentation"
    echo "   - Run 'bun run duoplus-integrate --summary' for overview"
    echo ""
    echo "🔗 Useful Commands:"
    echo "   bun run duoplus-parse          # Parse changelogs"
    echo "   bun run duoplus-benchmark      # Run benchmarks"
    echo "   bun run dashboard              # Launch dashboards"
    echo "   bun run duoplus-integrate      # Full integration"
    echo ""
    print_success "DuoPlus Automation System is ready! 🚀"
}

# Main setup function
main() {
    echo "Starting DuoPlus Automation System setup..."
    echo ""
    
    # Check prerequisites
    check_git
    check_bun
    
    # Setup project
    create_directories
    install_dependencies
    setup_environment
    setup_git_hooks
    
    # Initialize project
    generate_docs
    run_tests
    
    # Show completion
    show_next_steps
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "DuoPlus Automation System Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --skip-deps    Skip dependency installation"
        echo "  --dev          Setup for development environment"
        echo ""
        exit 0
        ;;
    --skip-deps)
        print_warning "Skipping dependency installation"
        skip_deps=true
        ;;
    --dev)
        print_info "Setting up development environment"
        dev_mode=true
        ;;
esac

# Run main setup
main
