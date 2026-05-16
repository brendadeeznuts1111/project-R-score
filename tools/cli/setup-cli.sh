#!/bin/bash

# FactoryWager CLI Setup Script
# Sets up the CLI for global usage and configuration

set -e

echo "🚀 Setting up FactoryWager CLI..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}📁 Script Directory: $SCRIPT_DIR${NC}"
echo -e "${BLUE}📁 Project Root: $PROJECT_ROOT${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Create global symlink (optional)
read -p "🔗 Create global symlink for 'fw-cli' command? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Try to create global symlink
    if command -v sudo &> /dev/null; then
        echo "🔧 Creating global symlink with sudo..."
        sudo ln -sf "$SCRIPT_DIR/fw-cli" /usr/local/bin/fw-cli || {
            echo -e "${YELLOW}⚠️  Could not create global symlink. You can still use ./fw-cli directly.${NC}"
        }
    else
        echo "🔧 Creating global symlink..."
        ln -sf "$SCRIPT_DIR/fw-cli" /usr/local/bin/fw-cli 2>/dev/null || {
            echo -e "${YELLOW}⚠️  Could not create global symlink. You can still use ./fw-cli directly.${NC}"
        }
    fi
fi

# Set up configuration directory
CONFIG_DIR="$HOME/.factory-wager"
mkdir -p "$CONFIG_DIR"
echo -e "${GREEN}✅ Created config directory: $CONFIG_DIR${NC}"

# Create example configuration
if [ ! -f "$CONFIG_DIR/config.json" ]; then
    cat > "$CONFIG_DIR/config.json" << EOF
{
  "apiToken": null,
  "defaultTarget": "brendadeeznuts1111.github.io",
  "zoneId": "a3b7ba4bb62cb1b177b04b8675250674",
  "preferences": {
    "autoSave": true,
    "confirmDeletes": true,
    "defaultType": "CNAME",
    "defaultTTL": 1,
    "proxyEnabled": true
  },
  "domains": [],
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF
    echo -e "${GREEN}✅ Created example configuration: $CONFIG_DIR/config.json${NC}"
fi

# Set up environment file
if [ ! -f "$PROJECT_ROOT/.fw-env" ]; then
    cat > "$PROJECT_ROOT/.fw-env" << EOF
# FactoryWager CLI Environment Configuration
# Copy this file to .env.local and fill in your values

# Required: Your Cloudflare API token
# Get this from: https://dash.cloudflare.com/profile/api-tokens
export FACTORY_WAGER_TOKEN="your_token_here"

# Optional: Custom zone ID (defaults to FactoryWager zone)
# export FACTORY_WAGER_ZONE_ID="a3b7ba4bb62cb1b177b04b8675250674"

# Optional: Default target for new domains
# export FACTORY_WAGER_DEFAULT_TARGET="brendadeeznuts1111.github.io"

# Optional: Enable debug mode
# export FACTORY_WAGER_DEBUG=true
EOF
    echo -e "${GREEN}✅ Created environment template: $PROJECT_ROOT/.fw-env${NC}"
fi

# Test the CLI
echo -e "${BLUE}🧪 Testing CLI installation...${NC}"
cd "$PROJECT_ROOT"

# Test help command
if node "$SCRIPT_DIR/factory-wager-cli.js" help > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CLI test passed!${NC}"
else
    echo -e "${RED}❌ CLI test failed!${NC}"
    exit 1
fi

# Create shell completion (optional)
read -p "🔧 Install shell completions? (bash/zsh) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Detect shell
    if [ -n "$BASH_VERSION" ]; then
        COMPLETION_FILE="$HOME/.bash_completion.d/fw-cli"
        mkdir -p "$(dirname "$COMPLETION_FILE")"
        
        cat > "$COMPLETION_FILE" << 'EOF'
# FactoryWager CLI Bash Completion
_fw_cli_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    opts="dns domains status deploy monitor auth config batch help"
    
    case "${prev}" in
        dns)
            COMPREPLY=( $(compgen -W "list add remove update check import export" -- ${cur}) )
            return 0
            ;;
        domains)
            COMPREPLY=( $(compgen -W "list create delete test batch search" -- ${cur}) )
            return 0
            ;;
        status)
            COMPREPLY=( $(compgen -W "all domain service health summary" -- ${cur}) )
            return 0
            ;;
        deploy)
            COMPREPLY=( $(compgen -W "dns content config all" -- ${cur}) )
            return 0
            ;;
        monitor)
            COMPREPLY=( $(compgen -W "start stop report alerts" -- ${cur}) )
            return 0
            ;;
        auth)
            COMPREPLY=( $(compgen -W "setup test status" -- ${cur}) )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "show set reset" -- ${cur}) )
            return 0
            ;;
        batch)
            COMPREPLY=( $(compgen -W "create update delete test" -- ${cur}) )
            return 0
            ;;
        *)
            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
            return 0
            ;;
    esac
}

complete -F _fw_cli_completion fw-cli
EOF
        echo -e "${GREEN}✅ Bash completion installed: $COMPLETION_FILE${NC}"
        echo "Add to ~/.bashrc: source $COMPLETION_FILE"
        
    elif [ -n "$ZSH_VERSION" ]; then
        COMPLETION_FILE="$HOME/.zsh_completions/_fw-cli"
        mkdir -p "$(dirname "$COMPLETION_FILE")"
        
        cat > "$COMPLETION_FILE" << 'EOF'
#compdef fw-cli

_fw_cli() {
    local -a commands subcommands
    commands=(
        'dns:DNS management operations'
        'domains:Domain management operations'
        'status:Status and monitoring'
        'deploy:Deployment operations'
        'monitor:Monitoring operations'
        'auth:Authentication management'
        'config:Configuration management'
        'batch:Batch operations'
        'help:Show help'
    )
    
    if (( CURRENT == 2 )); then
        _describe 'command' commands
    else
        case ${words[2]} in
            dns)
                subcommands=('list:List DNS records' 'add:Add DNS record' 'remove:Remove DNS record' 'update:Update DNS record' 'check:Check DNS health' 'import:Import DNS config' 'export:Export DNS config')
                _describe 'subcommand' subcommands
                ;;
            domains)
                subcommands=('list:List domains' 'create:Create domain' 'delete:Delete domain' 'test:Test domain' 'batch:Batch operations' 'search:Search domains')
                _describe 'subcommand' subcommands
                ;;
            status)
                subcommands=('all:Show all status' 'domain:Domain status' 'service:Service status' 'health:Health report' 'summary:Status summary')
                _describe 'subcommand' subcommands
                ;;
            deploy)
                subcommands=('dns:Deploy DNS' 'content:Deploy content' 'config:Deploy config' 'all:Deploy all')
                _describe 'subcommand' subcommands
                ;;
            monitor)
                subcommands=('start:Start monitoring' 'stop:Stop monitoring' 'report:Generate report' 'alerts:Manage alerts')
                _describe 'subcommand' subcommands
                ;;
            auth)
                subcommands=('setup:Setup authentication' 'test:Test authentication' 'status:Auth status')
                _describe 'subcommand' subcommands
                ;;
            config)
                subcommands=('show:Show config' 'set:Set config' 'reset:Reset config')
                _describe 'subcommand' subcommands
                ;;
            batch)
                subcommands=('create:Batch create' 'update:Batch update' 'delete:Batch delete' 'test:Batch test')
                _describe 'subcommand' subcommands
                ;;
        esac
    fi
}

_fw_cli "$@"
EOF
        echo -e "${GREEN}✅ Zsh completion installed: $COMPLETION_FILE${NC}"
        echo "Add to ~/.zshrc: fpath=($HOME/.zsh_completions \$fpath)"
    fi
fi

# Create desktop shortcut (optional)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    read -p "🖥️  Create desktop shortcut? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DESKTOP_DIR="$HOME/Desktop"
        if [ -d "$DESKTOP_DIR" ]; then
            cat > "$DESKTOP_DIR/FactoryWager CLI.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=FactoryWager CLI
Comment=FactoryWager Infrastructure Management CLI
Exec=gnome-terminal -- bash -c "cd $PROJECT_ROOT && ./cli/fw-cli; read -p 'Press Enter to close...'"
Icon=terminal
Terminal=false
Categories=Development;System;
EOF
            echo -e "${GREEN}✅ Desktop shortcut created: $DESKTOP_DIR/FactoryWager CLI.desktop${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}🎉 FactoryWager CLI setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Set your API token:"
echo "   ${YELLOW}export FACTORY_WAGER_TOKEN=\"your_token_here\"${NC}"
echo "   Or run: ${YELLOW}./cli/fw-cli auth setup${NC}"
echo ""
echo "2. Test the CLI:"
echo "   ${YELLOW}./cli/fw-cli status${NC}"
echo ""
echo "3. View help:"
echo "   ${YELLOW}./cli/fw-cli help${NC}"
echo ""
echo -e "${BLUE}📁 Configuration files:${NC}"
echo "• Config: $CONFIG_DIR/config.json"
echo "• Environment: $PROJECT_ROOT/.fw-env"
echo ""
echo -e "${GREEN}✨ Ready to manage FactoryWager infrastructure!${NC}"
