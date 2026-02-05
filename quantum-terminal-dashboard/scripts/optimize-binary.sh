#!/usr/bin/env bash
# Optimization 16: Final binary strip & compression

set -euo pipefail

# Configuration
BINARY_NAME=${1:-"quantum-cli"}
DEBUG_FILE="${BINARY_NAME}.debug"
COMPRESSED_FILE="${BINARY_NAME}.compressed"
FINAL_FILE="${BINARY_NAME}"

echo "🔧 Optimizing binary: ${BINARY_NAME}"

# Check if binary exists
if [ ! -f "${BINARY_NAME}" ]; then
    echo "❌ Binary ${BINARY_NAME} not found"
    exit 1
fi

# Get initial size
INITIAL_SIZE=$(stat -f%z "${BINARY_NAME}" 2>/dev/null || stat -c%s "${BINARY_NAME}")
echo "📊 Initial size: $((INITIAL_SIZE / 1024 / 1024)) MB"

# Step 1: Extract debug information
echo "🐛 Extracting debug symbols..."
if command -v objcopy &> /dev/null; then
    objcopy --only-keep-debug "${BINARY_NAME}" "${DEBUG_FILE}" || echo "⚠️ objcopy failed, skipping debug extraction"
    
    if [ -f "${DEBUG_FILE}" ]; then
        DEBUG_SIZE=$(stat -f%z "${DEBUG_FILE}" 2>/dev/null || stat -c%s "${DEBUG_FILE}")
        echo "📋 Debug file size: $((DEBUG_SIZE / 1024)) kB"
        
        # Add debug link to main binary
        objcopy --add-gnu-debuglink="${DEBUG_FILE}" "${BINARY_NAME}" || echo "⚠️ Debug link failed"
    fi
else
    echo "⚠️ objcopy not found, skipping debug extraction"
fi

# Step 2: Strip binary
echo "✂️ Stripping binary..."
if command -v strip &> /dev/null; then
    strip --strip-all "${BINARY_NAME}" || echo "⚠️ strip failed"
    
    STRIPPED_SIZE=$(stat -f%z "${BINARY_NAME}" 2>/dev/null || stat -c%s "${BINARY_NAME}")
    STRIPPED_REDUCTION=$((INITIAL_SIZE - STRIPPED_SIZE))
    echo "📉 Stripped size: $((STRIPPED_SIZE / 1024 / 1024)) MB (saved $((STRIPPED_REDUCTION / 1024)) kB)"
else
    echo "⚠️ strip not found, skipping binary stripping"
    STRIPPED_SIZE=$INITIAL_SIZE
fi

# Step 3: Compress with UPX
echo "🗜️ Compressing with UPX..."
if command -v upx &> /dev/null; then
    # Try different compression methods in order of preference
    COMPRESSION_METHODS=("lzma" "best" "normal")
    
    for method in "${COMPRESSION_METHODS[@]}"; do
        echo "🔧 Trying UPX --${method}..."
        
        if upx "--${method}" "${BINARY_NAME}" 2>/dev/null; then
            COMPRESSED_SIZE=$(stat -f%z "${BINARY_NAME}" 2>/dev/null || stat -c%s "${BINARY_NAME}")
            COMPRESSION_RATIO=$(echo "scale=2; ${COMPRESSED_SIZE} * 100 / ${STRIPPED_SIZE}" | bc -l 2>/dev/null || echo "N/A")
            
            echo "✅ UPX ${method} successful!"
            echo "📦 Compressed size: $((COMPRESSED_SIZE / 1024)) kB (${COMPRESSION_RATIO}% of original)"
            break
        else
            echo "⚠️ UPX ${method} failed, trying next method..."
        fi
    done
else
    echo "⚠️ UPX not found, skipping compression"
    COMPRESSED_SIZE=$STRIPPED_SIZE
fi

# Step 4: Additional optimizations
echo "⚡ Applying additional optimizations..."

# Set executable permissions
chmod +x "${BINARY_NAME}"

# Remove any extended attributes (macOS)
if command -v xattr &> /dev/null; then
    xattr -cr "${BINARY_NAME}" 2>/dev/null || echo "⚠️ xattr cleanup failed"
fi

# Optimize for runtime performance
if command -v install_name_tool &> /dev/null; then
    # macOS specific optimizations
    install_name_tool -id "@executable_path/${BINARY_NAME}" "${BINARY_NAME}" 2>/dev/null || echo "⚠️ install_name_tool failed"
fi

# Step 5: Generate size report
FINAL_SIZE=$(stat -f%z "${BINARY_NAME}" 2>/dev/null || stat -c%s "${BINARY_NAME}")
TOTAL_REDUCTION=$((INITIAL_SIZE - FINAL_SIZE))
REDUCTION_PERCENTAGE=$(echo "scale=1; ${TOTAL_REDUCTION} * 100 / ${INITIAL_SIZE}" | bc -l 2>/dev/null || echo "N/A")

echo ""
echo "📊 Binary Optimization Report"
echo "================================"
echo "📦 Initial size:    $((INITIAL_SIZE / 1024 / 1024)) MB"
echo "✂️ Stripped size:   $((STRIPPED_SIZE / 1024 / 1024)) MB"
echo "🗜️ Final size:      $((FINAL_SIZE / 1024)) kB"
echo "📉 Total reduction: $((TOTAL_REDUCTION / 1024)) kB (${REDUCTION_PERCENTAGE}%)"
echo ""

# Step 6: Verify binary still works
echo "🧪 Verifying optimized binary..."
if timeout 10s "./${BINARY_NAME}" --version &> /dev/null; then
    echo "✅ Binary verification passed"
    
    # Get version info
    VERSION_OUTPUT=$("./${BINARY_NAME}" --version 2>/dev/null || echo "Unknown")
    echo "🏷️ Version: ${VERSION_OUTPUT}"
else
    echo "❌ Binary verification failed!"
    exit 1
fi

# Step 7: Generate checksums
echo "🔐 Generating checksums..."
if command -v shasum &> /dev/null; then
    SHA256=$(shasum -a 256 "${BINARY_NAME}" | cut -d' ' -f1)
    echo "🔑 SHA-256: ${SHA256:0:12}…"
    
    # Save checksum to file
    echo "${SHA256}  ${BINARY_NAME}" > "${BINARY_NAME}.sha256"
    echo "💾 Checksum saved to ${BINARY_NAME}.sha256"
else
    echo "⚠️ shasum not found, skipping checksum generation"
fi

# Step 8: Performance benchmark
echo "⚡ Performance benchmark..."
BENCHMARK_ITERATIONS=5
TOTAL_TIME=0

for i in $(seq 1 $BENCHMARK_ITERATIONS); do
    START_TIME=$(date +%s%3N)
    if timeout 5s "./${BINARY_NAME}" --version &> /dev/null; then
        END_TIME=$(date +%s%3N)
        RUN_TIME=$((END_TIME - START_TIME))
        TOTAL_TIME=$((TOTAL_TIME + RUN_TIME))
        echo "  Run $i: ${RUN_TIME} ms"
    else
        echo "  Run $i: TIMEOUT"
        TOTAL_TIME=$((TOTAL_TIME + 5000))
    fi
done

AVG_TIME=$((TOTAL_TIME / BENCHMARK_ITERATIONS))
echo "📈 Average startup: ${AVG_TIME} ms"

# Step 9: Generate optimization summary
echo ""
echo "🎯 Optimization Summary"
echo "================================"
echo "📦 Binary: ${BINARY_NAME}"
echo "📏 Size: $((FINAL_SIZE / 1024)) kB"
echo "🚀 Startup: ${AVG_TIME} ms"
echo "🔐 Checksum: ${SHA256:0:12}…"
echo "🐛 Debug: ${DEBUG_FILE}"
echo ""

# Success criteria check
TARGET_SIZE_KB=700
TARGET_STARTUP_MS=12

SIZE_OK=$((FINAL_SIZE <= TARGET_SIZE_KB * 1024))
STARTUP_OK=$((AVG_TIME <= TARGET_STARTUP_MS))

if [ $SIZE_OK -eq 1 ] && [ $STARTUP_OK -eq 1 ]; then
    echo "🎉 All optimization targets achieved!"
    echo "✅ Size ≤ ${TARGET_SIZE_KB} kB: $((FINAL_SIZE / 1024)) kB"
    echo "✅ Startup ≤ ${TARGET_STARTUP_MS} ms: ${AVG_TIME} ms"
    exit 0
else
    echo "⚠️ Some targets not met:"
    [ $SIZE_OK -eq 0 ] && echo "   ❌ Size target: $((FINAL_SIZE / 1024)) kB > ${TARGET_SIZE_KB} kB"
    [ $STARTUP_OK -eq 0 ] && echo "   ❌ Startup target: ${AVG_TIME} ms > ${TARGET_STARTUP_MS} ms"
    exit 1
fi
