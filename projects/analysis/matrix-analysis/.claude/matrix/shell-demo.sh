#!/bin/bash
# Tier-1380 OMEGA: Shell Integration Demo
# Run this to see all shell integration features in action

echo "🔥 Tier-1380 OMEGA: Shell Integration Demo"
echo "=========================================="
echo ""

# Check shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_NAME="bash"
else
    SHELL_NAME="unknown"
fi

echo "Detected shell: $SHELL_NAME"
echo ""

# Demo 1: Basic function
echo "1. Smart cols() function"
echo "   cols get 45  →  Get column 45"
bun matrix/column-standards-all.ts get 45 --no-color 2>/dev/null | head -5
echo ""

# Demo 2: FZF check
echo "2. FZF Integration"
if command -v fzf &> /dev/null; then
    echo "   ✅ fzf installed"
    echo "   cols-fzf  →  Interactive column picker"
    echo "   Key binding: Alt+C (Zsh) / Ctrl+G (Bash)"
else
    echo "   ⚪ fzf not installed (optional)"
    echo "   Install: brew install fzf"
fi
echo ""

# Demo 3: Aliases
echo "3. Quick Aliases"
echo "   c    →  cols (main command)"
echo "   cg   →  cols get"
echo "   cs   →  cols search"
echo "   cf   →  cols find"
echo "   ci   →  cols interactive"
echo "   cm   →  cols matrix"
echo "   cx   →  cols-fzf"
echo ""
echo "   Zone shortcuts:"
echo "   ct   →  cols tension"
echo "   ccf  →  cols cloudflare"
echo "   ccr  →  cols chrome"
echo ""

# Demo 4: Utility functions
echo "4. Utility Functions"
echo "   cols-copy <col>           → Copy column name to clipboard"
echo "   cols-watch-column <col>   → Watch column (auto-refresh)"
echo "   cols-diff <col1> <col2>   → Compare two columns"
echo "   cols-clip <cmd>           → Copy output to clipboard"
echo ""

# Demo 5: Zsh-specific features
if [ "$SHELL_NAME" = "zsh" ]; then
    echo "5. Zsh-Specific Features"
    echo "   Key bindings:"
    echo "   Alt+C  → Column picker widget"
    echo "   Alt+Z  → Zone picker widget"
    echo "   Alt+I  → Insert column name"
    echo ""
    echo "   Prompt integration:"
    echo "   cols-set-prompt 45  → Shows 🔥 45:tension-profile-link in RPROMPT"
    echo "   cols clear          → Clear prompt context"
    echo ""
fi

# Demo 6: VS Code
echo "6. VS Code Integration"
echo "   bun matrix/vscode-extension.ts tasks    → Generate tasks.json"
echo "   bun matrix/vscode-extension.ts snippets → Generate snippets"
echo ""

# Demo 7: Try it
echo "7. Try it yourself!"
echo "   source matrix/shell-integration.$SHELL_NAME"
echo "   cols matrix    # Show full matrix grid"
echo "   cols-fzf       # Interactive picker (if fzf installed)"
echo ""

echo "=========================================="
echo "📚 See SHELL-INTEGRATION.md for full docs"
