#!/bin/bash
# macOS Widget Installation Script for Bun TOML Secrets Editor

set -e

echo "🍎 Installing Bun TOML Secrets Editor Status Bar Widget..."
echo "=========================================================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This widget is designed for macOS only"
    exit 1
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    echo "✅ Bun is already installed"
fi

# Check if Node.js is installed (for Electron version)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js (required for Electron)..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "❌ Please install Node.js manually or install Homebrew first"
        exit 1
    fi
else
    echo "✅ Node.js is already installed"
fi

# Navigate to widget directory
WIDGET_DIR="$(dirname "$0")"
cd "$WIDGET_DIR"

echo "📦 Installing dependencies..."
bun install

echo "🎨 Creating widget icon..."
node scripts/create-icon.js 2>/dev/null || echo "⚠️  Icon creation failed, using default"

echo "🔧 Building widget..."
bun run build

echo "📋 Creating launch agent..."
LAUNCH_PLIST="$HOME/Library/LaunchAgents/com.bunsecrets.editor.widget.plist"

cat > "$LAUNCH_PLIST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.bunsecrets.editor.widget</string>
    <key>ProgramArguments</key>
    <array>
        <string>$HOME/.bun/bin/bun</string>
        <string>run</string>
        <string>$WIDGET_DIR/status-bar-widget.ts</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/secrets-widget.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/secrets-widget-error.log</string>
</dict>
</plist>
EOF

echo "🚀 Loading launch agent..."
launchctl load "$LAUNCH_PLIST"

echo "🎉 Installation complete!"
echo ""
echo "The widget should now appear in your macOS menu bar."
echo "If it doesn't appear, try:"
echo "  1. Log out and log back in"
echo "  2. Run: launchctl start com.bunsecrets.editor.widget"
echo ""
echo "To uninstall:"
echo "  launchctl unload $LAUNCH_PLIST"
echo "  rm $LAUNCH_PLIST"
echo ""
echo "Logs: /tmp/secrets-widget.log"
