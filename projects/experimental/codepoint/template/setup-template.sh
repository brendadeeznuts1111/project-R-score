#!/bin/bash

# Systems Dashboard Template Setup Script
# Install the template locally for bun create

set -e

TEMPLATE_DIR="$HOME/.bun-create"
SOURCE_DIR="$(pwd)/template/@systems-dashboard"

echo "🚀 Installing Systems Dashboard template..."

# Create bun-create directory if it doesn't exist
mkdir -p "$TEMPLATE_DIR"

# Copy template to local directory
echo "📁 Copying template to $TEMPLATE_DIR/@systems-dashboard..."
rm -rf "$TEMPLATE_DIR/@systems-dashboard" 2>/dev/null || true
cp -r "$SOURCE_DIR" "$TEMPLATE_DIR/"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x "$TEMPLATE_DIR/@systems-dashboard/template/setup.js"
chmod +x "$TEMPLATE_DIR/@systems-dashboard/template/cli.js"
chmod +x "$TEMPLATE_DIR/@systems-dashboard/setup-team.sh"

# Test the template
echo "🧪 Testing template installation..."
cd /tmp
rm -rf test-systems-dashboard 2>/dev/null || true

if bun create @systems-dashboard/template test-systems-dashboard --no-install --no-git; then
  echo "✅ Template test successful!"
  rm -rf test-systems-dashboard
else
  echo "❌ Template test failed!"
  exit 1
fi

echo ""
echo "🎉 Systems Dashboard template is installed and ready!"
echo ""
echo "📍 Template location: $TEMPLATE_DIR/@systems-dashboard/template"
echo ""
echo "👉 Create new projects with:"
echo "   bun create @systems-dashboard/template my-project"
echo ""
echo "🔧 To update template later:"
echo "   cd $(pwd) && ./template/setup-template.sh"
echo ""
echo "📚 For help:"
echo "   bun create @systems-dashboard/template --help"
