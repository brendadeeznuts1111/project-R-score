#!/bin/bash
# Tier-1380 OMEGA: Column Standards CLI Installer
# Sets up shell integration, aliases, and completions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/column-standards-config.json"
COMPLETION_FILE="$SCRIPT_DIR/column-standards-completion.bash"

echo "🔥 Tier-1380 OMEGA: Column Standards CLI Installer"
echo ""

# Detect shell
SHELL_NAME=$(basename "$SHELL")
echo "Detected shell: $SHELL_NAME"
echo ""

# Function to add to shell config
add_to_shell_config() {
    local config_file="$1"
    local content="$2"
    
    if [ -f "$config_file" ]; then
        if grep -q "column-standards" "$config_file" 2>/dev/null; then
            echo "✅ Already configured in $(basename "$config_file")"
        else
            echo "" >> "$config_file"
            echo "$content" >> "$config_file"
            echo "✅ Added to $(basename "$config_file")"
        fi
    fi
}

# Setup aliases and shortcuts
setup_aliases() {
    local aliases='
# Tier-1380 OMEGA: Column Standards CLI Aliases
alias cols="bun matrix/column-standards-all.ts"
alias colget="bun matrix/column-standards-all.ts get"
alias colsearch="bun matrix/column-standards-all.ts search"
alias colfind="bun matrix/column-standards-all.ts find"
alias colfav="bun matrix/column-standards-all.ts fav"
'
    
    case "$SHELL_NAME" in
        bash)
            add_to_shell_config "$HOME/.bashrc" "$aliases"
            ;;
        zsh)
            add_to_shell_config "$HOME/.zshrc" "$aliases"
            ;;
        fish)
            echo "📝 For fish shell, add these aliases manually:"
            echo "  alias cols 'bun matrix/column-standards-all.ts'"
            ;;
    esac
}

# Setup completions
setup_completions() {
    if [ -f "$COMPLETION_FILE" ]; then
        case "$SHELL_NAME" in
            bash)
                add_to_shell_config "$HOME/.bashrc" "
# Tier-1380 OMEGA: Tab Completion
source $COMPLETION_FILE
"
                ;;
            zsh)
                # Bash completion compatibility
                add_to_shell_config "$HOME/.zshrc" "
# Tier-1380 OMEGA: Tab Completion (bash compatibility)
autoload -U +X bashcompinit && bashcompinit
source $COMPLETION_FILE
"
                ;;
        esac
        echo "✅ Tab completion configured"
    fi
}

# Create global shortcut
create_global_shortcut() {
    local bin_dir="$HOME/.local/bin"
    local shortcut="$bin_dir/matrix-cols"
    
    mkdir -p "$bin_dir"
    
    cat > "$shortcut" << SHORTCUT
#!/bin/bash
# Auto-generated shortcut for matrix:cols
exec bun "$SCRIPT_DIR/column-standards-all.ts" "\$@"
SHORTCUT
    
    chmod +x "$shortcut"
    echo "✅ Created global shortcut: matrix-cols"
    
    # Check if bin_dir is in PATH
    if [[ ":$PATH:" != *":$bin_dir:"* ]]; then
        echo "⚠️  Add $bin_dir to your PATH:"
        echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
}

# Main installation
echo "Setting up..."
echo ""

setup_aliases
echo ""
setup_completions
echo ""
create_global_shortcut
echo ""

echo "🔥 Installation Complete!"
echo ""
echo "Quick start:"
echo "  cols              # List all columns"
echo "  cols get 45       # Get column 45"
echo "  cols search url   # Search for URL columns"
echo "  cols --help       # Full help"
echo ""
echo "Or use the full command:"
echo "  bun matrix/column-standards-all.ts"
echo ""
echo "To apply changes, reload your shell:"
echo "  source ~/.${SHELL_NAME}rc"
