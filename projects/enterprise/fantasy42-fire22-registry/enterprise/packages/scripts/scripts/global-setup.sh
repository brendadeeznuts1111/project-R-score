#!/bin/bash

# Global Bun Configuration Setup Script
# Sets up security-enhanced global package management

set -e

echo "🚀 Setting up global Bun configuration..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC}  $1"
}

# Ensure directories exist
echo "📁 Creating global directories..."
mkdir -p ~/.bun/install/global 2>/dev/null || true
mkdir -p ~/.bun/bin 2>/dev/null || true
mkdir -p ~/.bun/install/cache 2>/dev/null || true
print_status "Global directories created"

# Create security-enhanced global config
echo
echo "⚙️  Creating global configuration..."
cat > ~/.bunfig.toml << 'EOF'
[install]
globalDir = "~/.bun/install/global"
globalBinDir = "~/.bun/bin"
exact = true
saveTextLockfile = true
linker = "isolated"

[install.security]
scanner = "built-in"
config = {
  audit_level = "high",
  auto_fix = false,
  compliance_check = true
}

[install.cache]
dir = "~/.bun/install/cache"
disable = false
disableManifest = false
EOF
print_status "Global configuration created"

# Set permissions
chmod 600 ~/.bunfig.toml
print_status "Configuration file secured (600 permissions)"

# Verify setup
echo
echo "📋 Configuration verification:"
if command -v bun &> /dev/null; then
    bun config list 2>/dev/null || print_warning "Could not verify config with bun"
else
    print_warning "Bun not found in PATH"
fi

# Install security scanner
echo
echo "🔒 Installing security scanner..."
if command -v bun &> /dev/null; then
    if bun add -g @sportsbet-registry/security-scanner 2>/dev/null; then
        print_status "Security scanner installed globally"
    else
        print_warning "Could not install custom scanner, using built-in"
    fi
else
    print_warning "Bun not available for package installation"
fi

# Setup environment variables
echo
echo "🌍 Setting up environment variables..."

# Detect shell profile
if [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_PROFILE="$HOME/.zshrc"
elif [[ "$SHELL" == *"bash"* ]]; then
    SHELL_PROFILE="$HOME/.bashrc"
else
    SHELL_PROFILE="$HOME/.profile"
fi

# Add PATH if not already present
if ! grep -q "\.bun/bin" "$SHELL_PROFILE" 2>/dev/null; then
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$SHELL_PROFILE"
    print_status "Added Bun PATH to $SHELL_PROFILE"
else
    print_info "Bun PATH already configured in $SHELL_PROFILE"
fi

# Final instructions
echo
echo "🎉 Global Bun setup complete!"
echo
echo "📝 Next steps:"
echo "1. Restart your terminal or run: source $SHELL_PROFILE"
echo "2. Set your registry token:"
echo "   export SPORTSBET_REGISTRY_TOKEN=your_token_here"
echo "3. Test global installation:"
echo "   bun install -g prettier"
echo "4. Verify PATH:"
echo "   which prettier"
echo
echo "🔧 Useful commands:"
echo "• bun pm ls -g          # List global packages"
echo "• bun update -g prettier # Update global package"
echo "• bun remove -g prettier # Remove global package"
echo
echo "📚 Documentation:"
echo "• Bun global packages: https://bun.sh/docs/cli/add#global"
echo "• Configuration: https://bun.sh/docs/runtime/bunfig"
