#!/bin/bash
# scripts/install-theme.sh
# Install CRC32 Syntax Highlighting Theme

echo "🎨 Installing CRC32 Syntax Highlighting Theme..."

# VS Code
if command -v code &> /dev/null; then
  echo "📦 Installing VS Code theme..."
  mkdir -p .vscode
  cp .vscode/settings.json .vscode/settings.json 2>/dev/null || true
  echo "✅ VS Code theme installed"
else
  echo "⚠️  VS Code not found, skipping VS Code theme"
fi

# Zed
if command -v zed &> /dev/null; then
  echo "📦 Installing Zed theme..."
  mkdir -p ~/.config/zed/themes
  cp themes/crc32-dark-theme.json ~/.config/zed/themes/
  echo "✅ Zed theme installed"
else
  echo "⚠️  Zed not found, skipping Zed theme"
fi

# Vim/Neovim
if [ -d "$HOME/.vim" ] || [ -d "$HOME/.config/nvim" ]; then
  echo "📦 Installing Vim/Neovim theme..."
  mkdir -p ~/.vim/colors
  cp colors/crc32-dark.vim ~/.vim/colors/
  echo "✅ Vim theme installed"
else
  echo "⚠️  Vim/Neovim not found, skipping Vim theme"
fi

echo ""
echo "🎨 Theme installation complete!"
echo "💡 Restart your editor to see the new syntax highlighting"
echo ""
echo "📝 Theme files created:"
echo "   - .vscode/settings.json (VS Code)"
echo "   - themes/crc32-dark-theme.json (Zed)"
echo "   - colors/crc32-dark.vim (Vim/Neovim)"
