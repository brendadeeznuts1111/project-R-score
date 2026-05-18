#!/bin/bash
# Kimi Shell Bridge Installation Script
# Usage: curl -fsSL https://.../install.sh | bash

set -e

REPO_URL="https://github.com/MoonshotAI/zsh-kimi-cli"
INSTALL_DIR="${HOME}/.kimi"
TOOLS_DIR="${INSTALL_DIR}/tools"
LOG_DIR="${INSTALL_DIR}/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "${BLUE}"
  echo "🔮 Kimi Shell Bridge Installer"
  echo "=============================="
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# Checks
# ============================================================================

check_bun() {
  if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    print_success "Bun ${BUN_VERSION} found"
    return 0
  else
    print_error "Bun not found"
    echo ""
    echo "Install Bun:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    return 1
  fi
}

check_zsh() {
  if command -v zsh &> /dev/null; then
    ZSH_VERSION=$(zsh --version | cut -d' ' -f2)
    print_success "Zsh ${ZSH_VERSION} found"
    return 0
  else
    print_warning "Zsh not found. Official plugin requires Zsh."
    return 1
  fi
}

# ============================================================================
# Installation
# ============================================================================

install_official_plugin() {
  echo ""
  print_info "Installing official zsh-kimi-cli plugin..."
  
  # Detect plugin manager
  if [ -d "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins" ]; then
    # Oh My Zsh
    PLUGIN_DIR="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/kimi-cli"
    if [ -d "$PLUGIN_DIR" ]; then
      print_warning "Plugin already installed, updating..."
      cd "$PLUGIN_DIR" && git pull
    else
      git clone "$REPO_URL" "$PLUGIN_DIR"
    fi
    print_success "Oh My Zsh plugin installed"
    echo "   Add to ~/.zshrc: plugins=(... kimi-cli)"
    
  elif command -v zinit &> /dev/null; then
    # Zinit - user adds to .zshrc
    print_success "Zinit detected"
    echo "   Add to ~/.zshrc: zinit light MoonshotAI/zsh-kimi-cli"
    
  elif command -v antigen &> /dev/null; then
    # Antigen
    print_success "Antigen detected"
    echo "   Add to ~/.zshrc: antigen bundle MoonshotAI/zsh-kimi-cli"
    
  else
    # Manual install
    PLUGIN_DIR="$HOME/.zsh/kimi-cli"
    if [ -d "$PLUGIN_DIR" ]; then
      print_warning "Plugin already exists at $PLUGIN_DIR"
    else
      git clone "$REPO_URL" "$PLUGIN_DIR"
      print_success "Plugin cloned to $PLUGIN_DIR"
      echo "   Add to ~/.zshrc: source $PLUGIN_DIR/kimi-cli.plugin.zsh"
    fi
  fi
}

install_bridge() {
  echo ""
  print_info "Installing unified shell bridge..."
  
  # Create directories
  mkdir -p "$TOOLS_DIR" "$LOG_DIR"
  print_success "Created directories"
  
  # Copy bridge files (in real scenario, these would be downloaded)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  
  if [ -f "$SCRIPT_DIR/unified-shell-bridge.ts" ]; then
    cp "$SCRIPT_DIR/unified-shell-bridge.ts" "$TOOLS_DIR/"
    cp "$SCRIPT_DIR/mcp.json" "$INSTALL_DIR/"
    print_success "Installed bridge files"
  else
    print_warning "Bridge files not found in script directory"
    echo "   Please manually copy unified-shell-bridge.ts and mcp.json to ${TOOLS_DIR}/"
  fi
  
  # Create CLI symlink
  CLI_SOURCE="$SCRIPT_DIR/cli/kimi-shell.ts"
  if [ -f "$CLI_SOURCE" ]; then
    mkdir -p "$HOME/.local/bin"
    ln -sf "$CLI_SOURCE" "$HOME/.local/bin/kimi-shell"
    chmod +x "$HOME/.local/bin/kimi-shell"
    print_success "CLI installed to ~/.local/bin/kimi-shell"
  fi
}

setup_config() {
  echo ""
  print_info "Setting up configuration..."
  
  CONFIG_FILE="$INSTALL_DIR/config.json"
  
  if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << 'EOF'
{
  "logLevel": "info",
  "autoStartDashboard": false,
  "autoStartConnector": false,
  "dashboardPort": 18790,
  "bridgePort": null
}
EOF
    print_success "Created default config"
  else
    print_warning "Config already exists"
  fi
}

# ============================================================================
# Post-Install
# ============================================================================

print_next_steps() {
  echo ""
  echo -e "${GREEN}🎉 Installation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo ""
  echo "1. Add to PATH (if not already):"
  echo "   echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
  echo ""
  echo "2. Reload Zsh:"
  echo "   exec zsh"
  echo ""
  echo "3. Start services:"
  echo "   kimi-shell start --all"
  echo ""
  echo "4. Check status:"
  echo "   kimi-shell status"
  echo ""
  echo "5. View dashboard:"
  echo "   open http://localhost:18790/dashboard"
  echo ""
  echo "6. Use in Zsh (Ctrl-X to toggle Kimi mode):"
  echo "   Ctrl-X"
  echo "   > openclaw status"
  echo "   Ctrl-X"
  echo ""
  echo "Documentation:"
  echo "   ${SCRIPT_DIR}/README.md"
  echo "   ${SCRIPT_DIR}/QUICK_START.md"
  echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
  print_header
  
  # Check prerequisites
  if ! check_bun; then
    exit 1
  fi
  
  check_zsh
  
  # Install
  install_official_plugin
  install_bridge
  setup_config
  
  # Done
  print_next_steps
}

# Run
main "$@"
