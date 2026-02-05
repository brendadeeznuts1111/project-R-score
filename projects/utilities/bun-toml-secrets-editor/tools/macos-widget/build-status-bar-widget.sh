#!/bin/bash

# Build Script for macOS Status Bar Widget
# This script compiles the Swift status bar widget

set -e

echo "🔨 Building macOS Status Bar Widget..."

# Check if Swift is available
if ! command -v swift &> /dev/null; then
    echo "❌ Swift compiler not found. Please install Xcode command line tools."
    echo "   Run: xcode-select --install"
    exit 1
fi

# Create build directory
mkdir -p build

# Compile the Swift widget
echo "📦 Compiling Swift widget..."
swiftc \
    -target x86_64-apple-macosx10.15 \
    -o build/BunStatusWidget \
    BunStatusWidget.swift

# Make executable
chmod +x build/BunStatusWidget

echo "✅ macOS Status Bar Widget built successfully!"
echo "📍 Location: $(pwd)/build/BunStatusWidget"
echo ""
echo "🚀 To run the widget:"
echo "   ./build/BunStatusWidget"
echo ""
echo "💡 The widget will appear in your macOS status bar."
echo "   Click the gear icon to view detailed status."