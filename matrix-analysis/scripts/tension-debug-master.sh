#!/bin/bash
# Master Tension-Field-God Debug Chain - 5-in-1 Ultra Command
echo "🌠 TENSION-FIELD-GOD MASTER DEBUG CHAIN"
echo "======================================="
echo ""

# Step 1: God-mode status check
echo "🔍 STEP 1: God-Mode Status Check"
echo "-------------------------------"
if command -v bun &> /dev/null; then
    echo "✅ Bun installed: $(bun --version)"
else
    echo "❌ Bun not found"
fi

if command -v jq &> /dev/null; then
    echo "✅ JQ installed"
else
    echo "❌ JQ not found"
fi

if [ -f "package.json" ]; then
    echo "✅ Package.json found"
    if jq -e '.scripts.validate' package.json &> /dev/null; then
        echo "✅ Validate script exists"
        bun validate 2>/dev/null && echo "✅ Validation passed" || echo "❌ Validation failed"
    else
        echo "❌ No validate script in package.json"
    fi
else
    echo "❌ No package.json in current directory"
fi

echo ""

# Step 2: Quick field compute with anomalies
echo "⚡ STEP 2: Field Compute + Anomaly Detection"
echo "-------------------------------------------"
if [ -f "src/tension-field/core.ts" ]; then
    echo "✅ Core file found"
    bun src/tension-field/core.ts mock-game 2>/dev/null | jq -C 'select(.anomaly != "BALANCED") | .' 2>/dev/null || echo "No anomalies detected"
else
    echo "❌ src/tension-field/core.ts not found"
fi
echo ""

# Step 3: Header statistics
echo "📊 STEP 3: Header Statistics by Scope"
echo "--------------------------------------"
if command -v rg &> /dev/null; then
    rg -o '\[([A-Z]+)\-' --type ts 2>/dev/null | sort | uniq -c | sort -nr | head -10 || echo "No headers found"
else
    echo "❌ Ripgrep not installed"
fi
echo ""

# Step 4: Tension header count
echo "🔢 STEP 4: Total TENSION Headers"
echo "-------------------------------"
if command -v rg &> /dev/null; then
    echo "Count: $(rg -c '\[TENSION\-[A-Z]+\-' --type ts 2>/dev/null || echo "0")"
else
    echo "Count: 0 (ripgrep not available)"
fi
echo ""

# Step 5: System versions
echo "🔧 STEP 5: System Versions"
echo "--------------------------"
if command -v bun &> /dev/null; then
    echo "Bun: $(bun --version)"
fi
if command -v bunx &> /dev/null; then
    echo "TypeScript: $(bunx tsc --version 2>/dev/null || echo "Not installed")"
fi
if [ -f "package.json" ]; then
    echo "Package: $(jq -r .version package.json 2>/dev/null || echo "Not found")"
fi
echo ""

echo "🎯 MASTER DEBUG CHAIN COMPLETE"
echo "=============================="
echo "Tension-god status: ACTIVE ✓"
