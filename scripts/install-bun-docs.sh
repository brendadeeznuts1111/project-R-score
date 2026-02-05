#!/usr/bin/env bash
# Installation script for Bun Documentation System
echo "Installing Bun Documentation System..."

# Create directories
mkdir -p ~/.local/bin
mkdir -p ~/.config/bun-docs

# Build and install CLI globally
bun build ./cli/docs-cli.ts --outfile ~/.local/bin/bun-docs --target bun
chmod +x ~/.local/bin/bun-docs

# Create desktop entry for Chrome app (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  mkdir -p ~/.local/share/applications
  cat > ~/.local/share/applications/bun-docs.desktop << EOF
[Desktop Entry]
Type=Application
Name=Bun Documentation
Exec=bun-docs open --app
Icon=documentation
Terminal=false
Categories=Development;
EOF
  echo "✅ Created desktop entry for Linux"
fi

# Create macOS app script (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  cat > ~/.local/bin/bun-docs-app << 'EOF'
#!/bin/bash
bun-docs open --app "$@"
EOF
  chmod +x ~/.local/bin/bun-docs-app
  echo "✅ Created macOS app launcher"
fi

echo "✅ Installation complete!"
echo ""
echo "Usage examples:"
echo "  bun-docs search <query>        - Search documentation"
echo "  bun-docs open semver --app    - Open docs in Chrome app"
echo "  bun-docs open yaml --sh       - Open .sh domain docs"
echo "  bun-docs index                - Update local index"
echo "  bun-docs cache                - Show cache statistics"
echo ""
echo "Environment setup:"
echo "  Ensure ~/.local/bin is in your PATH"
echo "  Run: export PATH=\"\$HOME/.local/bin:\$PATH\""
