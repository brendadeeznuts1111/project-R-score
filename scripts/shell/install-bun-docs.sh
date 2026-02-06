#!/usr/bin/env bash
# Installation script: install-bun-docs.sh
echo "Installing Bun Documentation System..."

# Install CLI globally
bun build ./cli/docs-cli.ts --outfile ~/.local/bin/bun-docs --target bun
chmod +x ~/.local/bin/bun-docs

# Create config directory
mkdir -p ~/.config/bun-docs

# Create desktop entry for Chrome app (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  cat > ~/.local/share/applications/bun-docs.desktop << EOF
[Desktop Entry]
Type=Application
Name=Bun Documentation
Exec=bun-docs open --app
Icon=${PWD}/assets/bun-icon.png
Terminal=false
Categories=Development;
EOF
fi

echo "✅ Installation complete!"
echo "Usage: bun-docs search <query>"
echo "       bun-docs open semver --app"
echo "       bun-docs index"