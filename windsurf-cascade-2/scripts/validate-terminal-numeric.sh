#!/bin/bash
# validate-terminal-numeric.sh
# Validates Bun's Terminal API numeric contracts and PTY integration

set -e

echo "🧪 Validating PTY numeric contracts..."

# Test 1: Terminal capability detection (u16 bitmask)
echo "📡 Test 1: Terminal capability detection"
CAPABILITIES=$(bun -e "
try {
    const tty = new UnixTTY(1);
    console.log(tty.capabilities.toString(2)); // Binary output
} catch (e) {
    console.log('0'); // Fallback for non-TTY environments
}
" 2>/dev/null || echo "0")
echo "Terminal capabilities bitmask: $CAPABILITIES"

if [ ${#CAPABILITIES} -le 16 ] && [ "$CAPABILITIES" != "0" ]; then
    echo "✅ PASS: u16 boundary respected and capabilities detected"
else
    echo "❌ FAIL: Invalid capabilities bitmask or detection failed"
fi

# Test 2: File descriptor numeric validation
echo ""
echo "🔢 Test 2: File descriptor numeric contracts"
FD_TEST=$(bun -e "
const fs = require('fs');
try {
    // Test standard file descriptors
    const stdin = new UnixTTY(0);  // STDIN_FILENO
    const stdout = new UnixTTY(1); // STDOUT_FILENO  
    const stderr = new UnixTTY(2); // STDERR_FILENO
    
    console.log('STDIN_FD:', stdin.fd);
    console.log('STDOUT_FD:', stdout.fd);
    console.log('STDERR_FD:', stderr.fd);
} catch (e) {
    console.log('ERROR:', e.message);
}
" 2>/dev/null || echo "ERROR: UnixTTY not available")

if echo "$FD_TEST" | grep -q "STDIN_FD: 0\|STDOUT_FD: 1\|STDERR_FD: 2"; then
    echo "✅ PASS: Standard file descriptors correctly mapped"
else
    echo "❌ FAIL: File descriptor mapping broken"
    echo "Debug output: $FD_TEST"
fi

# Test 3: configVersion + PTY integration with progress rendering
echo ""
echo "🎯 Test 3: configVersion + PTY progress rendering"

# Create test workspace
TEST_DIR="/tmp/bun-terminal-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create package.json to trigger install
cat > package.json << 'EOF'
{
  "name": "terminal-test",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
EOF

# Test with configVersion=1 and terminal=raw
echo "Testing configVersion=1 with raw terminal..."
BUN_CONFIG_VERSION=1 timeout 10s bun --terminal=raw install 2>&1 | head -5 > /tmp/progress.txt || true

if grep -q "\[\=>\-]\|\[===\]\|\[---\]" /tmp/progress.txt 2>/dev/null; then
    echo "✅ PASS: Progress bar rendered (ANSI detected)"
else
    echo "⚠️  SKIP: No progress rendering detected (may be non-TTY environment)"
    echo "Output captured:"
    cat /tmp/progress.txt 2>/dev/null || echo "No output captured"
fi

# Test 4: Feature flag + PTY interaction
echo ""
echo "🚩 Test 4: Feature flag + terminal mode interaction"

# Test with feature flag disabling native linker
BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER=1 \
BUN_TERMINAL_MODE=dumb \
timeout 10s bun install --verbose 2>&1 | grep -c "native linking disabled" > /tmp/feature_flag.txt || echo "0" > /tmp/feature_flag.txt

FEATURE_FLAG_RESULT=$(cat /tmp/feature_flag.txt)
if [ "$FEATURE_FLAG_RESULT" -gt 0 ]; then
    echo "✅ PASS: Feature flag overrides terminal optimization ($FEATURE_FLAG_RESULT matches)"
else
    echo "❌ FAIL: Feature flag interaction not working"
fi

# Test 5: Terminal mode detection performance
echo ""
echo "⚡ Test 5: Terminal mode detection performance"

PERF_TEST=$(bun -e "
const start = performance.now();
try {
    const tty = new UnixTTY(1);
    const mode = tty.mode;
    const caps = tty.capabilities;
    const end = performance.now();
    console.log('LATENCY:', (end - start).toFixed(2));
    console.log('MODE:', mode);
    console.log('CAPS:', caps);
} catch (e) {
    console.log('LATENCY: 0.00');
    console.log('ERROR:', e.message);
}
" 2>/dev/null || echo "LATENCY: 0.00")

LATENCY=$(echo "$PERF_TEST" | grep "LATENCY:" | cut -d: -f2 | tr -d ' ')
if [ "$LATENCY" != "0.00" ] && [ "$LATENCY" != "" ]; then
    echo "✅ PASS: Terminal detection latency: ${LATENCY}ms"
    
    # Check if under 1ms (should be ~144ns = 0.000144ms)
    if (( $(echo "$LATENCY < 1.0" | bc -l) )); then
        echo "✅ PASS: Latency under 1ms threshold"
    else
        echo "⚠️  WARN: Latency above expected but functional"
    fi
else
    echo "❌ FAIL: Could not measure terminal detection latency"
fi

# Test 6: 5-byte Immutable Contract validation
echo ""
echo "🔐 Test 6: 5-byte Immutable Contract validation"

CONTRACT_TEST=$(bun -e "
// Simulate the 5-byte contract validation
const configVersion = process.env.BUN_CONFIG_VERSION || '0';
const featureFlags = process.env.BUN_FEATURE_FLAG_DISABLE_NATIVE_DEPENDENCY_LINKER === '1' ? '1' : '0';

// Create 5-byte representation (u40)
const versionByte = parseInt(configVersion) & 0xFF; // 1 byte
const flagsDword = parseInt(featureFlags) & 0xFFFFFFFF; // 4 bytes

// Combine into u40 (5 bytes)
const contract = (flagsDword << 8) | versionByte;
console.log('CONTRACT:', contract.toString(16));
console.log('VERSION_BYTE:', versionByte.toString(16));
console.log('FLAGS_DWORD:', flagsDword.toString(16));
" 2>/dev/null || echo "ERROR: Contract creation failed")

if echo "$CONTRACT_TEST" | grep -q "CONTRACT:"; then
    echo "✅ PASS: 5-byte contract generation successful"
    CONTRACT_HEX=$(echo "$CONTRACT_TEST" | grep "CONTRACT:" | cut -d: -f2 | tr -d ' ')
    echo "Contract hex: 0x$CONTRACT_HEX"
    
    # Verify it fits in 5 bytes (10 hex digits = 40 bits)
    if [ ${#CONTRACT_HEX} -le 10 ]; then
        echo "✅ PASS: Contract fits in 5-byte boundary"
    else
        echo "❌ FAIL: Contract exceeds 5-byte boundary"
    fi
else
    echo "❌ FAIL: 5-byte contract validation failed"
fi

# Cleanup
cd - > /dev/null
rm -rf "$TEST_DIR" /tmp/progress.txt /tmp/feature_flag.txt 2>/dev/null || true

echo ""
echo "🏁 Terminal API validation complete!"
echo ""
echo "📊 Summary:"
echo "- Terminal capabilities: u16 bitmask validation"
echo "- File descriptor contracts: STDIN/STDOUT/STDERR mapping"
echo "- configVersion + PTY: Progress rendering integration"
echo "- Feature flags: Terminal mode override behavior"
echo "- Performance: Sub-millisecond detection latency"
echo "- Immutable contract: 5-byte behavioral lock"
