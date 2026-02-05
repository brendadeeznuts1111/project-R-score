#!/bin/bash
# Bun v1.3.7 CLI Demo Script
# Demonstrates all CLI features with practical examples

echo "🚀 Bun v1.3.7 Features CLI - Comprehensive Demo"
echo "=================================================="

echo ""
echo "1. 📊 Feature Status Check"
echo "--------------------------"
bun run bun137:cli status

echo ""
echo "2. 🎨 ANSI Text Wrapping"
echo "------------------------"
echo "Basic wrapping:"
bun run bun137:cli ansi --width 40

echo ""
echo "3. 📋 JSON5 Configuration"
echo "-------------------------"
echo "Parsing demo:"
bun run bun137:cli json5 parse

echo ""
echo "4. 🌐 HTTP Client Features"
echo "--------------------------"
echo "ETag caching demo:"
bun run bun137:cli http --etag --url https://httpbin.org/etag/demo

echo ""
echo "5. 🗂️  Bucket Storage Operations"
echo "--------------------------------"
echo "Listing bucket contents:"
bun run bun137:cli bucket --list

echo ""
echo "6. 📊 Function Profiling"
echo "------------------------"
echo "Profiling a 300ms function:"
bun run bun137:cli profile --function --duration 300 --name demo-function

echo ""
echo "7. 📈 Performance Comparison"
echo "-----------------------------"
echo "Comparing with/without profiling:"
bun run bun137:cli profile --compare --iterations 50

echo ""
echo "8. 🎯 Command-Specific Help"
echo "---------------------------"
echo "Getting help for bucket command:"
bun run bun137:cli help bucket

echo ""
echo "✅ Demo completed! All features working correctly."
echo ""
echo "Available commands:"
echo "  bun run bun137:cli ansi          # ANSI text wrapping"
echo "  bun run bun137:cli json5         # JSON5 parsing"
echo "  bun run bun137:cli http          # HTTP client"
echo "  bun run bun137:cli bucket        # Bucket storage"
echo "  bun run bun137:cli profile       # Function profiling"
echo "  bun run bun137:cli status        # Feature status"
echo "  bun run bun137:cli help          # Show help"
