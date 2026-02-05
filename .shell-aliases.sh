#!/bin/bash

# 🚀 FactoryWager Bun CLI Aliases
# Add this to your ~/.zshrc, ~/.bashrc, or ~/.config/fish/config.fish

# ⚡ Core Daily Commands
alias bunq='bun run quick-info'                    # Quick status check
alias bungh='bun run github-integration'           # GitHub ecosystem health
alias bundl='bun run deep-links'                   # Generate deep links
alias bunmon='bun run mcp-monitor'                 # MCP monitoring dashboard
alias bunai='bun run ai-demo'                      # AI insights demo

# 🎯 Enhanced One-Liner Aliases (with flags)
alias bunqs='bun run quick-info --short'           # Ultra-fast status
alias bunghs='bun run github-integration --short'  # Quick GitHub health
alias bundls='bun run deep-links --short'          # Quick deep links
alias bunais='bun run ai-demo --summary'           # AI insights summary

# 🌅 Morning Ritual (all-in-one)
alias bunmorning='bunqs && bunghs && bunais'       # Complete morning check
alias buncheck='bunq && bungh && bunai'           # Full system check

# 🔍 Deep Link Shortcuts
alias bunfile='bundl "Bun.file"'                   # File API docs
alias bunsecret='bundl "Bun.secrets.get"'          # Secrets API docs
alias bunnano='bundl "Bun.nanoseconds"'            # Nanosecond timing docs
alias bunstring='bundl "stringWidth"'              # String width utils

# 🛠️ Development Workflows
alias bundev='bunqs && bundl "ai-operations" && bunmon'  # Development workflow
alias bunsec='bunqs && bungh && bunai --no-cache'        # Security-focused check
alias bunperf='bunqs && bunai --no-security'             # Performance-focused check

# 📊 Monitoring & Debugging
alias bunwatch='bunmon'                            # Start monitoring
alias bundebug='bundl "Bun.debug" && bunqs'         # Debug workflow
alias bunhealth='bunq && bunghs && bunais'          # Health check

# 🎨 Colored Output Aliases (if you want extra color)
alias bunqcolor='bunq'                             # Already colored
alias bunghcolor='bungh'                           # Already colored
alias bundlcolor='bundl --examples'                # With examples

# ⚡ Speed Optimizations
alias bunspeed='bun run quick-info --short && bun run github-integration --short'
alias bunfast='bunqs && bunghs'                    # Fastest combined check

# 🔧 Utility Aliases
alias bunhelp='echo "FactoryWager CLI: bunq|bungh|bundl|bunmon|bunai|bunmorning"'
alias bunver='bun --version && echo "FactoryWager v5.1.0"'

# 🐚 Fish Shell Compatible Functions
if [ -n "$BASH_VERSION" ]; then
    # Bash functions
    function bundeep() {
        if [ $# -eq 0 ]; then
            echo "Usage: bundeep <api_name>"
            return 1
        fi
        bun run deep-links "$1" --short
    }
    
    function bunstatus() {
        echo "🚀 FactoryWager Status Check"
        bun run quick-info --short
        echo ""
        echo "🔗 GitHub Health"
        bun run github-integration --short
        echo ""
        echo "🤖 AI Insights"
        bun run ai-demo --summary
    }
elif [ -n "$ZSH_VERSION" ]; then
    # Zsh functions
    bundeep() {
        if [ $# -eq 0 ]; then
            echo "Usage: bundeep <api_name>"
            return 1
        fi
        bun run deep-links "$1" --short
    }
    
    bunstatus() {
        echo "🚀 FactoryWager Status Check"
        bun run quick-info --short
        echo ""
        echo "🔗 GitHub Health"
        bun run github-integration --short
        echo ""
        echo "🤖 AI Insights"
        bun run ai-demo --summary
    }
fi

# 🎯 Quick Usage Examples (run as command)
bunusage() {
    echo "🚀 FactoryWager CLI Usage:"
    echo ""
    echo "Daily Commands:"
    echo "  bunq        - Quick status check"
    echo "  bungh       - GitHub health check"
    echo "  bundl <api> - Generate deep links"
    echo "  bunmon      - Start monitoring"
    echo "  bunai       - AI insights demo"
    echo ""
    echo "Quick Variants:"
    echo "  bunqs       - Ultra-fast status"
    echo "  bunghs      - Quick GitHub health"
    echo "  bundls <api> - Quick deep links"
    echo "  bunais      - AI insights summary"
    echo ""
    echo "Workflows:"
    echo "  bunmorning  - Complete morning check"
    echo "  buncheck    - Full system check"
    echo "  bunstatus   - Detailed status report"
    echo ""
    echo "Deep Links:"
    echo "  bunfile     - Bun.file API docs"
    echo "  bunsecret   - Bun.secrets API docs"
    echo "  bunnano     - Bun.nanoseconds docs"
    echo "  bunstring   - stringWidth utils"
    echo ""
    echo "Examples:"
    echo "  bundl \"Bun.file\" --examples"
    echo "  bunai --duration=120"
    echo "  bunmon (Ctrl+C to exit)"
}

# 🎉 Welcome Message (optional)
if [ "$1" = "--init" ]; then
    echo "🎉 FactoryWager CLI aliases initialized!"
    echo "Run 'bunusage' to see all available commands"
    echo "Run 'bunmorning' for your daily system check"
fi
