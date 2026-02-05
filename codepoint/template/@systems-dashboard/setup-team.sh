#!/bin/bash

# Systems Dashboard Template Team Setup Script
# This script distributes the template to team members

set -e

TEMPLATE_DIR="$HOME/.bun-create/@systems-dashboard"
TEMPLATE_REPO="https://github.com/brendadeeznuts1111/bun-table-demo.git"

echo "🚀 Setting up Systems Dashboard template for team..."

# Create template directory if it doesn't exist
if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "📁 Creating template directory..."
  mkdir -p "$TEMPLATE_DIR"
fi

# Clone or update the template
if [ -d "$TEMPLATE_DIR/template" ]; then
  echo "🔄 Updating existing template..."
  cd "$TEMPLATE_DIR/template"
  git pull origin main
else
  echo "📥 Installing template..."
  cd "$TEMPLATE_DIR"
  git clone "$TEMPLATE_REPO" template
  cd template

  # Copy only the systems-dashboard part
  echo "📋 Setting up template structure..."
  cp -r systems-dashboard/* ../template/

  # Remove unnecessary files
  rm -rf ../template/session-1 ../template/react-demo ../template/link-analytics-dashboard ../template/secrets-dashboard ../template/web-project
fi

# Make setup script executable
echo "🔧 Making scripts executable..."
chmod +x "$TEMPLATE_DIR/template/setup.js"
chmod +x "$TEMPLATE_DIR/template/cli.js"

# Create template configuration
echo "⚙️ Creating template configuration..."
cat > "$TEMPLATE_DIR/template/.template-config.json" << EOF
{
  "name": "@systems-dashboard/template",
  "version": "1.0.0",
  "description": "Professional Systems Dashboard Template",
  "author": "Systems Dashboard Team",
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "supportedTemplates": ["full", "server", "cli", "analytics"],
  "features": [
    "React 18 with TypeScript",
    "Professional CLI tools",
    "Server monitoring dashboard",
    "Bun inspect.table() visualization",
    "Vite build system",
    "ESLint and Prettier",
    "Comprehensive testing"
  ]
}
EOF

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
echo "🎉 Systems Dashboard template is ready!"
echo ""
echo "📋 Template location: $TEMPLATE_DIR/template"
echo ""
echo "👉 Team members can now use:"
echo "   bun create @systems-dashboard/template my-project"
echo ""
echo "🔧 To update template later:"
echo "   cd $TEMPLATE_DIR/template && git pull"
echo ""
echo "📚 For help:"
echo "   bun create @systems-dashboard/template --help"
