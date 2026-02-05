#!/usr/bin/env bun
# Enhanced Bun Shell Script Examples
# Demonstrates Bun's shell scripting capabilities with .sh file loader
# Run with: bun examples/bun-shell-example.sh

echo "🚀 Bun Shell Scripting Examples"
echo "================================="
echo

# Basic information
echo "📁 Current directory: $(pwd)"
echo "👤 User: $(whoami)"
echo "🐧 OS: $(uname -s)"
echo "⚡ Bun version: $(bun --version)"
echo "📅 Date: $(date)"
echo

# Environment variables
echo "🌍 Environment Variables:"
echo "  PATH: ${PATH:0:50}..."
echo "  HOME: $HOME"
echo "  SHELL: $SHELL"
echo "  USER: $USER"
echo

# File operations
echo "📄 File Operations:"
echo "  Creating test file..."
echo "This is a test file created by Bun shell script" > /tmp/bun-shell-test.txt
echo "  File created: /tmp/bun-shell-test.txt"
echo "  File size: $(wc -c < /tmp/bun-shell-test.txt) bytes"
echo "  File contents: $(cat /tmp/bun-shell-test.txt)"
echo

# Process management
echo "🔄 Process Management:"
echo "  Current process ID: $$"
echo "  Parent process ID: $PPID"
echo "  Running processes (top 3):"
ps aux | head -4 | tail -3
echo

# Network operations
echo "🌐 Network Operations:"
echo "  Local IP: $(hostname -I | awk '{print $1}')"
echo "  Hostname: $(hostname)"
echo "  Network interfaces:"
ip route | head -3
echo

# Package management
echo "📦 Package Management:"
if command -v apt >/dev/null 2>&1; then
    echo "  System: apt (Debian/Ubuntu)"
    echo "  Available updates: $(apt list --upgradable 2>/dev/null | wc -l)"
elif command -v yum >/dev/null 2>&1; then
    echo "  System: yum (Red Hat/CentOS)"
elif command -v brew >/dev/null 2>&1; then
    echo "  System: brew (macOS)"
else
    echo "  System: unknown"
fi
echo

# Bun-specific operations
echo "🎯 Bun-Specific Operations:"
echo "  Bun executable: $(which bun)"
echo "  Bun environment: $BUN_ENV"
echo "  Available Bun commands:"
bun --help | head -10 | tail -5
echo

# Conditional logic
echo "🔀 Conditional Logic:"
if [ -f "/tmp/bun-shell-test.txt" ]; then
    echo "  ✅ Test file exists"
else
    echo "  ❌ Test file missing"
fi

if [ "$(uname -s)" = "Darwin" ]; then
    echo "  🍎 Running on macOS"
elif [ "$(uname -s)" = "Linux" ]; then
    echo "  🐧 Running on Linux"
else
    echo "  ❓ Running on $(uname -s)"
fi
echo

# Loops
echo "🔁 Loops:"
echo "  Counting to 3:"
for i in 1 2 3; do
    echo "    $i..."
    sleep 0.1
done
echo

# Functions
greet() {
    echo "  👋 Hello, $1! Welcome to Bun shell scripting."
}

echo "⚙️  Functions:"
greet "Developer"
greet "$(whoami)"
echo

# Error handling
echo "🚨 Error Handling:"
if mkdir /tmp/bun-test-dir 2>/dev/null; then
    echo "  ✅ Created directory /tmp/bun-test-dir"
    rmdir /tmp/bun-test-dir
    echo "  ✅ Cleaned up directory"
else
    echo "  ⚠️  Directory already exists or permission denied"
fi
echo

# Cleanup
echo "🧹 Cleanup:"
rm -f /tmp/bun-shell-test.txt
echo "  ✅ Removed test file"
echo

echo "✨ Bun Shell Script Complete!"
echo "💡 Tips:"
echo "  • Use 'bun script.sh' to run shell scripts"
echo "  • Mix Bun TypeScript with shell commands"
echo "  • Access environment variables with \$VAR"
echo "  • Use conditional logic for cross-platform scripts"
echo "  • Leverage Bun's fast process execution"
