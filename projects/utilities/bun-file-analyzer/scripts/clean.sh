#!/bin/bash

# Clean build artifacts and temporary files
echo "🧹 Cleaning build artifacts..."

rm -rf public/
rm -rf dist/
rm -rf .bun-cache/

echo "✅ Clean completed!"
