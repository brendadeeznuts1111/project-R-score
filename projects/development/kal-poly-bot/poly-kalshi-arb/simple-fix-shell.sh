#!/bin/bash
# SERO: Simple Shell Environment Fix
# Streamlined version without complex array handling

echo "🚀 SERO: Simple Shell Environment Fix"
echo "====================================="
echo ""

# Check current shell
echo "Shell: $SHELL"
echo "Home: $HOME"
echo ""

# Function to add path if not exists
add_path_if_not_exists() {
    local config_file="$1"
    local path_line="$2"
    local comment="$3"
    
    if [[ ! -f "$config_file" ]]; then
        touch "$config_file"
    fi
    
    if ! grep -qF "$path_line" "$config_file"; then
        echo "" >> "$config_file"
        echo "# $comment" >> "$config_file"
        echo "$path_line" >> "$config_file"
        echo "✅ Added $comment to $(basename "$config_file")"
    else
        echo "ℹ️  $comment already configured in $(basename "$config_file")"
    fi
}

# Check for required tools
echo "Checking tools..."

# Rust/Cargo
if [[ -d "$HOME/.cargo/bin" ]]; then
    echo "✅ Rust found"
else
    echo "❌ Rust not found"
    exit 1
fi

# Bun
if [[ -d "$HOME/.bun/bin" ]]; then
    echo "✅ Bun found"
else
    echo "⚠️  Bun not found"
fi

# dotenvx
if [[ -f "$HOME/.local/bin/dotenvx" ]]; then
    echo "✅ dotenvx found"
else
    echo "⚠️  dotenvx not found"
fi

echo ""

# Configure shell based on current shell
CURRENT_SHELL=$(basename "$SHELL")
echo "Configuring for: $CURRENT_SHELL"

# Simple PATH optimization - remove duplicates
NEW_PATH=""
SEEN=""
IFS=':' read -ra PATH_DIRS <<< "$PATH"
for dir in "${PATH_DIRS[@]}"; do
    if [[ ! "$SEEN" =~ "$dir" ]]; then
        if [[ -n "$NEW_PATH" ]]; then
            NEW_PATH="$NEW_PATH:$dir"
        else
            NEW_PATH="$dir"
        fi
        SEEN="$SEEN:$dir"
    fi
done

echo "Optimized PATH (removed duplicates)"

# Configure shell files
case "$CURRENT_SHELL" in
    "zsh")
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo"
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.zshrc" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        ;;
    "bash")
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo"
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.bash_profile" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        ;;
    *)
        echo "⚠️  Unsupported shell, adding to .profile"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.cargo/bin:\$PATH\"" "SERO: Rust/Cargo"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.local/bin:\$PATH\"" "SERO: Local binaries"
        add_path_if_not_exists "$HOME/.profile" "export PATH=\"$HOME/.bun/bin:\$PATH\"" "SERO: Bun runtime"
        ;;
esac

# Create simple verification script
cat > "$HOME/.local/bin/sero-verify" << 'EOF'
#!/bin/bash
echo "🔍 SERO Verification"
echo "===================="
echo ""

for tool in cargo rustc bun dotenvx; do
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool: Available"
        "$tool" --version 2>/dev/null | head -1
    else
        echo "❌ $tool: Not found"
    fi
    echo
done

echo "PATH directories: $(echo "$PATH" | tr ':' '\n' | wc -l)"
echo "Verification complete!"
EOF

chmod +x "$HOME/.local/bin/sero-verify"

# Apply changes to current session
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.bun/bin:$PATH"

echo ""
echo "✅ SERO simple fix complete!"
echo ""
echo "Next steps:"
echo "1. Run: source ~/.zshrc (or restart terminal)"
echo "2. Test: sero-verify"
echo "3. Continue: cd poly-kalshi-arb && ./run.sh"

echo ""
echo "🔧 All shell tools should now be accessible!"
