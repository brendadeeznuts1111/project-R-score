#!/bin/bash

# FactoryWager Archive Integration Script
# Integrates enhanced Bun archive system with FactoryWager workflow

echo "📦 FactoryWager Archive Integration"
echo "=================================="

# Check if Bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install Bun to use archiving features."
    exit 1
fi

# Configuration
ARCHIVE_TYPE=${1:-"audit"}
OLDER_THAN_DAYS=${2:-7}
DRY_RUN=${3:-"false"}
VERBOSE=${4:-"true"}

echo "🔧 Configuration:"
echo "   Archive Type: $ARCHIVE_TYPE"
echo "   Older Than: $OLDER_THAN_DAYS days"
echo "   Dry Run: $DRY_RUN"
echo "   Verbose: $VERBOSE"
echo ""

# Check if enhanced archive script exists
if [ ! -f ".factory-wager/enhanced-bun-archive.ts" ]; then
    echo "❌ Enhanced archive script not found"
    exit 1
fi

# Run archiving
echo "🚀 Starting FactoryWager archiving..."
echo ""

if [ "$DRY_RUN" = "true" ]; then
    echo "🔍 DRY RUN MODE - No actual archiving will be performed"
    echo ""
    echo "Would archive:"
    echo "   - Audit logs older than $OLDER_THAN_DAYS days"
    echo "   - HTML reports older than 30 days"
    echo "   - Release notes older than 90 days"
    echo ""
    echo "📊 Estimated space savings: ~85% with compression"
    echo "🔧 Bun optimizations: Native compression, enhanced checksum"
else
    # Run the enhanced archiver
    if [ "$VERBOSE" = "true" ]; then
        bun run .factory-wager/enhanced-bun-archive.ts
    else
        bun run .factory-wager/enhanced-bun-archive.ts > /dev/null 2>&1
    fi
    
    ARCHIVE_EXIT_CODE=$?
    
    if [ $ARCHIVE_EXIT_CODE -eq 0 ]; then
        echo "✅ Archiving completed successfully"
        
        # Show latest report
        LATEST_REPORT=$(ls -t .factory-wager/enhanced-archive-report-*.json 2>/dev/null | head -1)
        if [ -n "$LATEST_REPORT" ]; then
            echo ""
            echo "📊 Latest Archive Report:"
            echo "========================"
            
            # Extract key metrics from report
            if command -v jq &> /dev/null; then
                TOTAL_SIZE=$(jq -r '.summary.total_original_size' "$LATEST_REPORT")
                COMPRESSED_SIZE=$(jq -r '.summary.total_compressed_size' "$LATEST_REPORT")
                SPACE_SAVED=$(jq -r '.summary.space_saved' "$LATEST_REPORT")
                COMPRESSION_EFFICIENCY=$(jq -r '.summary.compression_efficiency' "$LATEST_REPORT")
                
                echo "   Total Original Size: ${TOTAL_SIZE} bytes"
                echo "   Compressed Size: ${COMPRESSED_SIZE} bytes"
                echo "   Space Saved: ${SPACE_SAVED} bytes"
                echo "   Compression Efficiency: ${COMPRESSION_EFFICIENCY}%"
            else
                echo "   (Install jq for detailed metrics)"
                echo "   Report: $LATEST_REPORT"
            fi
        fi
        
        # Start Archive API if not running
        if ! pgrep -f "archive-api.ts" > /dev/null; then
            echo ""
            echo "🌐 Starting Archive API for monitoring..."
            bun run .factory-wager/archive-api.ts > /dev/null 2>&1 &
            echo "📊 Archive API started: http://localhost:3001/docs"
        fi
        
    else
        echo "❌ Archiving failed with exit code $ARCHIVE_EXIT_CODE"
        exit $ARCHIVE_EXIT_CODE
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "   - Monitor archive API: http://localhost:3001/status"
echo "   - View detailed reports: .factory-wager/enhanced-archive-report-*.json"
echo "   - Configure retention in: .factory-wager/archive-config.json"
echo "   - Run benchmarks: bun run .factory-wager/bun-archive-cli.ts benchmark"

echo ""
echo "✨ FactoryWager archiving integration complete!"
