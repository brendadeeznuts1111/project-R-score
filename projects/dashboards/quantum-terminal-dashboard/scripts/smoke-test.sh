#!/usr/bin/env bash
# Optimization 18: Post-polish smoke test (250 ms total)

set -euo pipefail

# Configuration
BINARY_NAME=${1:-"quantum-cli"}
TARGET_VERSION_MS=12
TARGET_MATRIX_MS=40
TARGET_VALIDATE_MS=90
TOTAL_TIMEOUT_MS=250

echo "🧪 Running post-polish smoke test for ${BINARY_NAME}"
echo "⏱️  Targets: version≤${TARGET_VERSION_MS}ms, matrix≤${TARGET_MATRIX_MS}ms, validate≤${TARGET_VALIDATE_MS}ms"

# Check if binary exists
if [ ! -f "${BINARY_NAME}" ]; then
    echo "❌ Binary ${BINARY_NAME} not found"
    exit 1
fi

# Make sure binary is executable
chmod +x "${BINARY_NAME}"

# Test 1: Version check (≤ 12 ms)
echo "🔍 Test 1: Version check..."
VERSION_START=$(date +%s%3N)
VERSION_OUTPUT=$(timeout 20s "./${BINARY_NAME}" --version 2>&1 || echo "FAILED")
VERSION_END=$(date +%s%3N)
VERSION_TIME=$((VERSION_END - VERSION_START))

if [ "$VERSION_OUTPUT" = "FAILED" ]; then
    echo "❌ Version check failed"
    exit 1
fi

echo "✅ Version: ${VERSION_OUTPUT} (${VERSION_TIME}ms)"

if [ $VERSION_TIME -le $TARGET_VERSION_MS ]; then
    echo "✅ Version target met: ${VERSION_TIME}ms ≤ ${TARGET_VERSION_MS}ms"
    VERSION_PASS=1
else
    echo "❌ Version target missed: ${VERSION_TIME}ms > ${TARGET_VERSION_MS}ms"
    VERSION_PASS=0
fi

# Test 2: Matrix command (≤ 40 ms)
echo "🔍 Test 2: Matrix command..."
MATRIX_START=$(date +%s%3N)
MATRIX_OUTPUT=$(timeout 50s "./${BINARY_NAME}" matrix 2>/dev/null | head -c1 || echo "FAILED")
MATRIX_END=$(date +%s%3N)
MATRIX_TIME=$((MATRIX_END - MATRIX_START))

if [ "$MATRIX_OUTPUT" = "FAILED" ]; then
    echo "❌ Matrix command failed"
    exit 1
fi

echo "✅ Matrix output: '${MATRIX_OUTPUT}' (${MATRIX_TIME}ms)"

if [ $MATRIX_TIME -le $TARGET_MATRIX_MS ]; then
    echo "✅ Matrix target met: ${MATRIX_TIME}ms ≤ ${TARGET_MATRIX_MS}ms"
    MATRIX_PASS=1
else
    echo "❌ Matrix target missed: ${MATRIX_TIME}ms > ${TARGET_MATRIX_MS}ms"
    MATRIX_PASS=0
fi

# Test 3: Validate command (≤ 90 ms)
echo "🔍 Test 3: Validate command..."
VALIDATE_START=$(date +%s%3N)
VALIDATE_OUTPUT=$(timeout 100s "./${BINARY_NAME}" validate /dev/null 2>&1 || echo "FAILED")
VALIDATE_END=$(date +%s%3N)
VALIDATE_TIME=$((VALIDATE_END - VALIDATE_START))

if echo "$VALIDATE_OUTPUT" | grep -q "FAILED\|Error\|error"; then
    echo "❌ Validate command failed: $VALIDATE_OUTPUT"
    exit 1
fi

echo "✅ Validate completed (${VALIDATE_TIME}ms)"

if [ $VALIDATE_TIME -le $TARGET_VALIDATE_MS ]; then
    echo "✅ Validate target met: ${VALIDATE_TIME}ms ≤ ${TARGET_VALIDATE_MS}ms"
    VALIDATE_PASS=1
else
    echo "❌ Validate target missed: ${VALIDATE_TIME}ms > ${TARGET_VALIDATE_MS}ms"
    VALIDATE_PASS=0
fi

# Calculate total time
TOTAL_TIME=$((VERSION_TIME + MATRIX_TIME + VALIDATE_TIME))
echo "📊 Total smoke test time: ${TOTAL_TIME}ms"

# Performance classification
PERFORMANCE_SCORE=0
if [ $VERSION_PASS -eq 1 ]; then
    PERFORMANCE_SCORE=$((PERFORMANCE_SCORE + 1))
fi
if [ $MATRIX_PASS -eq 1 ]; then
    PERFORMANCE_SCORE=$((PERFORMANCE_SCORE + 1))
fi
if [ $VALIDATE_PASS -eq 1 ]; then
    PERFORMANCE_SCORE=$((PERFORMANCE_SCORE + 1))
fi

# Determine performance grade
case $PERFORMANCE_SCORE in
    3)
        GRADE="A+"
        GRADE_EMOJI="🏆"
        ;;
    2)
        GRADE="B"
        GRADE_EMOJI="🥈"
        ;;
    1)
        GRADE="C"
        GRADE_EMOJI="🥉"
        ;;
    *)
        GRADE="F"
        GRADE_EMOJI="❌"
        ;;
esac

# Additional performance metrics
echo ""
echo "📈 Performance Metrics"
echo "================================"
echo "🔍 Version: ${VERSION_TIME}ms (target: ≤${TARGET_VERSION_MS}ms) $([ $VERSION_PASS -eq 1 ] && echo '✅' || echo '❌')"
echo "🔢 Matrix: ${MATRIX_TIME}ms (target: ≤${TARGET_MATRIX_MS}ms) $([ $MATRIX_PASS -eq 1 ] && echo '✅' || echo '❌')"
echo "✅ Validate: ${VALIDATE_TIME}ms (target: ≤${TARGET_VALIDATE_MS}ms) $([ $VALIDATE_PASS -eq 1 ] && echo '✅' || echo '❌')"
echo "⏱️  Total: ${TOTAL_TIME}ms (target: ≤${TOTAL_TIMEOUT_MS}ms)"
echo "🏆 Grade: ${GRADE_EMOJI} ${GRADE} (${PERFORMANCE_SCORE}/3 targets met)"
echo ""

# Binary information
BINARY_SIZE=$(stat -f%z "${BINARY_NAME}" 2>/dev/null || stat -c%s "${BINARY_NAME}")
BINARY_SIZE_KB=$((BINARY_SIZE / 1024))
echo "📦 Binary Information"
echo "================================"
echo "📁 File: ${BINARY_NAME}"
echo "📏 Size: ${BINARY_SIZE_KB} kB"
echo "🔐 SHA-256: $(shasum -a 256 "${BINARY_NAME}" | cut -d' ' -f1 | head -c12)…"
echo ""

# Optimization verification
echo "🚀 Optimization Status"
echo "================================"

# Check for optimizations in binary (basic checks)
if strings "${BINARY_NAME}" | grep -q "TENSION_COLOURS\|hsl(" 2>/dev/null; then
    echo "✅ Zero-allocation colours detected"
else
    echo "⚠️ Zero-allocation colours not detected"
fi

if strings "${BINARY_NAME}" | grep -q "Bun.unlikely\|Bun.likely" 2>/dev/null; then
    echo "✅ Branch prediction hints detected"
else
    echo "⚠️ Branch prediction hints not detected"
fi

if strings "${BINARY_NAME}" | grep -q "WebAssembly\|wasm" 2>/dev/null; then
    echo "✅ WebAssembly optimizations detected"
else
    echo "⚠️ WebAssembly optimizations not detected"
fi

if strings "${BINARY_NAME}" | grep -q "SIMD\|v128" 2>/dev/null; then
    echo "✅ SIMD optimizations detected"
else
    echo "⚠️ SIMD optimizations not detected"
fi

if strings "${BINARY_NAME}" | grep -q "SIGUSR2\|quantum-tune" 2>/dev/null; then
    echo "✅ Live tunables detected"
else
    echo "⚠️ Live tunables not detected"
fi

echo ""

# Final verdict
if [ $PERFORMANCE_SCORE -eq 3 ] && [ $TOTAL_TIME -le $TOTAL_TIMEOUT_MS ]; then
    echo "🎉 SMOKE TEST PASSED!"
    echo "✅ All performance targets achieved"
    echo "🚀 Binary is ready for production release"
    
    # Generate smoke test report
    cat > "${BINARY_NAME}.smoke-test.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "binary": "${BINARY_NAME}",
  "version": "${VERSION_OUTPUT}",
  "sizeKB": ${BINARY_SIZE_KB},
  "performance": {
    "version": {
      "timeMS": ${VERSION_TIME},
      "targetMS": ${TARGET_VERSION_MS},
      "passed": $([ $VERSION_PASS -eq 1 ] && echo true || echo false)
    },
    "matrix": {
      "timeMS": ${MATRIX_TIME},
      "targetMS": ${TARGET_MATRIX_MS},
      "passed": $([ $MATRIX_PASS -eq 1 ] && echo true || echo false)
    },
    "validate": {
      "timeMS": ${VALIDATE_TIME},
      "targetMS": ${TARGET_VALIDATE_MS},
      "passed": $([ $VALIDATE_PASS -eq 1 ] && echo true || echo false)
    },
    "total": {
      "timeMS": ${TOTAL_TIME},
      "targetMS": ${TOTAL_TIMEOUT_MS},
      "passed": $([ $TOTAL_TIME -le $TOTAL_TIMEOUT_MS ] && echo true || echo false)
    }
  },
  "grade": "${GRADE}",
  "score": ${PERFORMANCE_SCORE},
  "passed": true
}
EOF
    
    echo "📄 Smoke test report saved to ${BINARY_NAME}.smoke-test.json"
    exit 0
else
    echo "❌ SMOKE TEST FAILED!"
    echo "⚠️ Performance targets not met"
    
    # Generate failure report
    cat > "${BINARY_NAME}.smoke-test.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "binary": "${BINARY_NAME}",
  "version": "${VERSION_OUTPUT}",
  "sizeKB": ${BINARY_SIZE_KB},
  "performance": {
    "version": {
      "timeMS": ${VERSION_TIME},
      "targetMS": ${TARGET_VERSION_MS},
      "passed": $([ $VERSION_PASS -eq 1 ] && echo true || echo false)
    },
    "matrix": {
      "timeMS": ${MATRIX_TIME},
      "targetMS": ${TARGET_MATRIX_MS},
      "passed": $([ $MATRIX_PASS -eq 1 ] && echo true || echo false)
    },
    "validate": {
      "timeMS": ${VALIDATE_TIME},
      "targetMS": ${TARGET_VALIDATE_MS},
      "passed": $([ $VALIDATE_PASS -eq 1 ] && echo true || echo false)
    },
    "total": {
      "timeMS": ${TOTAL_TIME},
      "targetMS": ${TOTAL_TIMEOUT_MS},
      "passed": $([ $TOTAL_TIME -le $TOTAL_TIMEOUT_MS ] && echo true || echo false)
    }
  },
  "grade": "${GRADE}",
  "score": ${PERFORMANCE_SCORE},
  "passed": false
}
EOF
    
    echo "📄 Failure report saved to ${BINARY_NAME}.smoke-test.json"
    exit 1
fi
