#!/bin/bash
# setup-aliases.sh - Setup convenient aliases for process cleanup

echo "🔧 Setting up cleanup aliases..."
echo "=============================="

# Create aliases for the scripts
echo "# Process Cleanup Aliases" >> ~/.zshrc
echo "alias cleanup-dev='./scripts/cleanup-dev-processes.sh'" >> ~/.zshrc
echo "alias quick-cleanup='./scripts/quick-cleanup.sh'" >> ~/.zshrc
echo "alias ps-bun='ps aux | grep bun | grep -v grep'" >> ~/.zshrc
echo "alias check-ports='lsof -i :3000 -i :5555 -i :8000 -i :4000 -i :5000'" >> ~/.zshrc
echo "alias kill-bun='ps aux | grep bun | grep -v -E \"(Windsurf|Cursor)\" | awk \"{print \$2}\" | xargs kill'" >> ~/.zshrc

echo "✅ Aliases added to ~/.zshrc"
echo ""
echo "🎯 Available aliases:"
echo "  cleanup-dev     - Run comprehensive cleanup"
echo "  quick-cleanup   - Show quick reference commands"
echo "  ps-bun          - Show running bun processes"
echo "  check-ports     - Check development ports"
echo "  kill-bun        - Kill all bun processes (except IDE)"
echo ""
echo "🔄 Reload your shell to use aliases:"
echo "  source ~/.zshrc"
echo "  # or restart your terminal"

# Test if we're in the right directory
if [ -f "./scripts/cleanup-dev-processes.sh" ]; then
    echo ""
    echo "✅ Scripts found in current directory"
    echo "📍 Current directory: $(pwd)"
else
    echo ""
    echo "⚠️  Scripts not found in current directory"
    echo "📍 Make sure you're in the codepoint directory"
fi
