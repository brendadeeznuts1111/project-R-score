#!/bin/bash
# Shell Configuration Fix - Complete Setup

echo "🔧 Fixing Shell Configuration for Rust/Cargo"
echo "=============================================="
echo ""

# Check if Rust is already in PATH
if command -v cargo &> /dev/null; then
    echo "✅ cargo found in PATH"
    cargo --version
else
    echo "❌ cargo not in PATH - adding..."
fi

echo ""
echo "Configuration Status:"
echo "  Shell: $SHELL"
echo "  Home: $HOME"
echo ""

# Verify .zshrc has Rust
if grep -q "\.cargo/bin" ~/.zshrc; then
    echo "✅ Rust already in ~/.zshrc"
else
    echo "Adding Rust to ~/.zshrc..."
    cat >> ~/.zshrc << 'EOF'

# === Rust / Cargo Configuration ===
export PATH="$HOME/.cargo/bin:$PATH"
EOF
    echo "✅ Added Rust to ~/.zshrc"
fi

# Also check .bash_profile if it exists
if [ -f ~/.bash_profile ]; then
    if grep -q "\.cargo/bin" ~/.bash_profile; then
        echo "✅ Rust already in ~/.bash_profile"
    else
        echo "Adding Rust to ~/.bash_profile..."
        cat >> ~/.bash_profile << 'EOF'

# === Rust / Cargo Configuration ===
export PATH="$HOME/.cargo/bin:$PATH"
EOF
        echo "✅ Added Rust to ~/.bash_profile"
    fi
fi

# Verify installations
echo ""
echo "Verification:"
echo "  Rust: $(rustc --version)"
echo "  Cargo: $(cargo --version)"
echo "  dotenvx: $(dotenvx --version)"
echo ""

# Set up PATH in current session
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

echo "✨ Shell configuration complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Close and reopen your terminal (or run: source ~/.zshrc)"
echo "  2. cd /Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb"
echo "  3. Edit .env with your real credentials"
echo "  4. Run: ./run.sh"
