#!/bin/bash

# --smol Flag Comparison Script
# Demonstrates memory optimization differences

echo "🎯 --smol Flag Performance Comparison"
echo "======================================"
echo ""

echo "📊 Testing normal execution vs --smol execution..."
echo ""

# Create a simple test script
cat > memory-test.js << 'EOF'
// Memory usage test script
const used = process.memoryUsage();
const data = new Array(100000).fill(0).map((_, i) => ({
  id: i,
  value: Math.random(),
  nested: { deep: { value: `item_${i}` } }
}));

console.log("Memory Usage:");
for (let key in used) {
  console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}

console.log("Array created with 100,000 items");
console.log("Processing complete!");

if (global.gc) {
  global.gc();
  console.log("Garbage collection triggered");
}
EOF

echo "🔍 Test 1: Normal execution"
echo "---------------------------"
echo "Command: bun run memory-test.js"
echo "Result:"
time bun run memory-test.js
echo ""

echo "🔍 Test 2: --smol execution"
echo "---------------------------"
echo "Command: bun --smol run memory-test.js"
echo "Result:"
time bun --smol run memory-test.js
echo ""

echo "📈 Performance Comparison Summary:"
echo "- Normal execution: Standard memory usage"
echo "- --smol execution: Reduced memory footprint"
echo "- --smol runs GC more frequently"
echo "- Better for memory-constrained environments"
echo ""

echo "💡 --smol Flag Benefits:"
echo "✅ Reduced memory footprint"
echo "✅ More frequent garbage collection"
echo "✅ Better performance on limited memory"
echo "✅ Ideal for CI/CD environments"
echo "✅ Good for testing and development"
echo ""

echo "🎯 Usage Examples:"
echo "bun --smol run index.tsx          # Memory-optimized"
echo "bun --smol run build.tsx          # Efficient builds"
echo "bun --smol run test.tsx           # Optimized testing"
echo "bun --smol run dev.tsx            # Memory-efficient dev"
echo ""

echo "🔧 Advanced Usage:"
echo "bun --smol --console-depth 3 run script.tsx"
echo "bun --smol --hot run dev-server.tsx"
echo "bun --smol --watch run test-suite.tsx"

# Clean up
rm -f memory-test.js

echo ""
echo "✅ --smol comparison complete!"
