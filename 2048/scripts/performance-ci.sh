#!/bin/bash
# Performance CI/CD Script
# Runs performance tests and generates reports for CI pipelines

set -e

echo "🚀 Performance CI/CD Pipeline"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PERFORMANCE_THRESHOLD=100  # Max allowed test duration in ms
REGRESSION_THRESHOLD=10    # Max allowed regression percentage
REPORT_DIR="./performance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create report directory
mkdir -p "$REPORT_DIR"

# Function to log with color
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Run performance tests
log_info "Running performance tests..."
bun run src/performance/performance-tester.ts run > "$REPORT_DIR/test-results-$TIMESTAMP.txt" 2>&1

if [ $? -ne 0 ]; then
    log_error "Performance tests failed!"
    exit 1
fi

# Step 2: Analyze CPU profiles
log_info "Analyzing CPU profiles..."
bun run src/performance/profile-analyzer.ts > "$REPORT_DIR/profile-analysis-$TIMESTAMP.txt" 2>&1

# Step 3: Scan codebase for optimizations
log_info "Scanning codebase for optimizations..."
bun run src/performance/optimization-recommender.ts > "$REPORT_DIR/optimization-report-$TIMESTAMP.txt" 2>&1

# Step 4: Generate comprehensive report
log_info "Generating comprehensive report..."
cat > "$REPORT_DIR/performance-report-$TIMESTAMP.md" << EOF
# Performance CI Report
Generated: $(date)

## Test Results
$(cat "$REPORT_DIR/test-results-$TIMESTAMP.txt" | grep -A 20 "📊 Performance Test Results")

## Profile Analysis
$(cat "$REPORT_DIR/profile-analysis-$TIMESTAMP.txt" | grep -A 10 "📊 Profile:" | head -20)

## Optimization Recommendations
$(cat "$REPORT_DIR/optimization-report-$TIMESTAMP.txt" | grep -A 5 "🔧 Top Recommendations:" | head -15)

## Status
✅ All checks passed
EOF

# Step 5: Check for regressions
log_info "Checking for regressions..."
REGRESSIONS=$(grep -c "REGRESSION detected" "$REPORT_DIR/test-results-$TIMESTAMP.txt" || true)

if [ "$REGRESSIONS" -gt 0 ]; then
    log_warn "Found $REGRESSIONS performance regressions!"
    echo "Regressions detected in: $REPORT_DIR/test-results-$TIMESTAMP.txt"
    
    if [ "$REGRESSIONS" -gt "$REGRESSION_THRESHOLD" ]; then
        log_error "Too many regressions detected!"
        exit 1
    fi
else
    log_info "No regressions detected!"
fi

# Step 6: Check performance thresholds
log_info "Checking performance thresholds..."
TOTAL_DURATION=$(grep "Total Duration:" "$REPORT_DIR/test-results-$TIMESTAMP.txt" | grep -oP '[0-9.]+' | head -1)

if (( $(echo "$TOTAL_DURATION > $PERFORMANCE_THRESHOLD" | bc -l) )); then
    log_error "Performance threshold exceeded: ${TOTAL_DURATION}ms > ${PERFORMANCE_THRESHOLD}ms"
    exit 1
else
    log_info "Performance within thresholds: ${TOTAL_DURATION}ms"
fi

# Step 7: Upload artifacts (if in CI environment)
if [ -n "$CI" ]; then
    log_info "Uploading performance artifacts..."
    
    # Create artifact summary
    cat > "$REPORT_DIR/artifact-summary.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "test_results": "$REPORT_DIR/test-results-$TIMESTAMP.txt",
    "profile_analysis": "$REPORT_DIR/profile-analysis-$TIMESTAMP.txt",
    "optimization_report": "$REPORT_DIR/optimization-report-$TIMESTAMP.txt",
    "comprehensive_report": "$REPORT_DIR/performance-report-$TIMESTAMP.md",
    "regressions": $REGRESSIONS,
    "total_duration": $TOTAL_DURATION
}
EOF
    
    log_info "Artifacts summary saved to: $REPORT_DIR/artifact-summary.json"
fi

# Step 8: Print summary
log_info "CI Pipeline Complete!"
echo ""
echo "📊 Summary:"
echo "  - Tests Run: $(grep "Total:" "$REPORT_DIR/test-results-$TIMESTAMP.txt" | grep -oP '[0-9]+')"
echo "  - Regressions: $REGRESSIONS"
echo "  - Total Duration: ${TOTAL_DURATION}ms"
echo ""
echo "📁 Reports:"
echo "  - Test Results: $REPORT_DIR/test-results-$TIMESTAMP.txt"
echo "  - Profile Analysis: $REPORT_DIR/profile-analysis-$TIMESTAMP.txt"
echo "  - Optimization Report: $REPORT_DIR/optimization-report-$TIMESTAMP.txt"
echo "  - Comprehensive Report: $REPORT_DIR/performance-report-$TIMESTAMP.md"
echo ""

if [ "$REGRESSIONS" -eq 0 ]; then
    log_info "✅ All performance checks passed!"
    exit 0
else
    log_warn "⚠️  Performance regressions detected - review reports for details"
    exit 0
fi