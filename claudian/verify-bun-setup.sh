#!/bin/bash
# Verification script for Bun migration

echo "🔍 Verifying Bun Migration Setup..."
echo ""

# Check bun version
echo "📦 Bun Version:"
bun --version
echo ""

# Check node_modules
echo "📁 Dependencies:"
if [ -d "node_modules" ]; then
  echo "✅ node_modules directory exists"
  echo "   Package count: $(find node_modules -maxdepth 1 -type d | wc -l) packages"
else
  echo "❌ node_modules directory missing"
fi
echo ""

# Check lockfile
echo "🔒 Lockfile:"
if [ -f "bun.lock" ]; then
  echo "✅ bun.lock exists"
  ls -lh bun.lock
else
  echo "❌ bun.lock missing"
fi
echo ""

# Check build artifacts
echo "🏗️  Build Artifacts:"
for file in main.js styles.css manifest.json; do
  if [ -f "$file" ]; then
    echo "✅ $file ($(ls -lh $file | awk '{print $5}'))"
  else
    echo "❌ $file missing"
  fi
done
echo ""

# Check configuration files
echo "⚙️  Configuration Files:"
for file in bunfig.toml jest.config.js tsconfig.json .npmrc; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file missing"
  fi
done
echo ""

# Test commands
echo "🧪 Testing Commands:"
echo -n "  typecheck: "
bun run typecheck > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "  build:css: "
bun run build:css > /dev/null 2>&1 && echo "✅" || echo "❌"

echo ""
echo "✨ Verification Complete!"
