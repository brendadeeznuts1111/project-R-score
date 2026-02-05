#!/bin/bash

# 🚀 Bun Toolkit Aliases Setup
# Convenient shell aliases for your Bun development toolkit

echo "🌟 Setting up Bun Toolkit Aliases..."
echo "===================================="

# Check if we're in a Bun project
if [ ! -f "package.json" ]; then
    echo "❌ Error: No package.json found. Run this from your Bun project root."
    exit 1
fi

# Check if the scripts exist in package.json
if ! grep -q '"quick-info"' package.json; then
    echo "⚠️  Warning: Some toolkit scripts may not be available in package.json"
    echo "   Run the toolkit setup first if needed."
fi

# Create aliases for different shells
setup_zsh_aliases() {
    local zshrc="$HOME/.zshrc"

    echo "🔧 Setting up Zsh aliases in $zshrc"

    # Remove existing Bun aliases if they exist
    sed -i '' '/^alias bun[qa-z]*=/d' "$zshrc" 2>/dev/null || true

    # Add new aliases
    cat >> "$zshrc" << 'EOF'

# 🌟 Bun Development Toolkit Aliases
# ⚡ Fast status check
alias bunq='bun run quick-info'

# 🔗 Full GitHub ecosystem health
alias bungh='bun run github-integration'

# 🔗 Generate deep links for any API/function name
alias bundl='bun run deep-links'           # usage: bundl "Bun.file"

# 📊 Launch MCP monitoring dashboard
alias bunmon='bun run mcp-monitor'

# 🤖 Run AI optimization demo / insights
alias bunai='bun run ai-demo'

# 🌅 Morning development ritual
alias bunritual='bun run morning-ritual'

# 🔍 Quick validation suite
alias buncheck='bun run validate:bun-urls'

EOF

    echo "✅ Zsh aliases added successfully!"
    echo "   Run: source ~/.zshrc  (or restart your terminal)"
}

setup_bash_aliases() {
    local bashrc="$HOME/.bashrc"

    echo "🔧 Setting up Bash aliases in $bashrc"

    # Remove existing Bun aliases if they exist
    sed -i '/^alias bun[qa-z]*=/d' "$bashrc" 2>/dev/null || true

    # Add new aliases
    cat >> "$bashrc" << 'EOF'

# 🌟 Bun Development Toolkit Aliases
# ⚡ Fast status check
alias bunq='bun run quick-info'

# 🔗 Full GitHub ecosystem health
alias bungh='bun run github-integration'

# 🔗 Generate deep links for any API/function name
alias bundl='bun run deep-links'           # usage: bundl "Bun.file"

# 📊 Launch MCP monitoring dashboard
alias bunmon='bun run mcp-monitor'

# 🤖 Run AI optimization demo / insights
alias bunai='bun run ai-demo'

# 🌅 Morning development ritual
alias bunritual='bun run morning-ritual'

# 🔍 Quick validation suite
alias buncheck='bun run validate:bun-urls'

EOF

    echo "✅ Bash aliases added successfully!"
    echo "   Run: source ~/.bashrc  (or restart your terminal)"
}

# Detect shell and setup accordingly
if [[ "$SHELL" == *"zsh"* ]]; then
    setup_zsh_aliases
elif [[ "$SHELL" == *"bash"* ]]; then
    setup_bash_aliases
else
    echo "⚠️  Unsupported shell: $SHELL"
    echo "   Manually add these aliases to your shell's rc file:"
    echo ""
    echo "# 🌟 Bun Development Toolkit Aliases"
    echo "alias bunq='bun run quick-info'"
    echo "alias bungh='bun run github-integration'"
    echo "alias bundl='bun run deep-links'"
    echo "alias bunmon='bun run mcp-monitor'"
    echo "alias bunai='bun run ai-demo'"
    echo "alias bunritual='bun run morning-ritual'"
    echo "alias buncheck='bun run validate:bun-urls'"
    exit 1
fi

echo ""
echo "🎉 Bun Toolkit Aliases Setup Complete!"
echo "======================================"
echo ""
echo "🚀 Your new aliases:"
echo "   bunq       - Quick system info"
echo "   bungh      - GitHub ecosystem health"
echo "   bundl      - Generate deep links (bundl \"Bun.env\")"
echo "   bunmon     - MCP monitoring dashboard"
echo "   bunai      - AI optimization insights"
echo "   bunritual  - Morning development ritual"
echo "   buncheck   - URL validation suite"
echo ""
echo "💡 Usage examples:"
echo "   bunq                          # System status"
echo "   bungh                         # GitHub health"
echo "   bundl \"Bun.serve\"             # Generate deep link"
echo "   bunmon                        # Full monitoring"
echo "   bunai                         # AI insights"
echo "   bunritual                     # Morning ritual"
echo "   buncheck                      # URL validation"
echo ""
echo "⚡ Start using your streamlined Bun workflow!"