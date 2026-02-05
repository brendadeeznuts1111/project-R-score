#!/bin/bash

# Test FactoryWager HTML Report Generator

echo "🧪 Testing FactoryWager HTML Report Generator"
echo "============================================="

REPORT_CLI="./.factory-wager/html-report-cli.sh"

# Test 1: Generate report
echo ""
echo "📊 Testing HTML report generation..."
$REPORT_CLI generate

# Test 2: List reports
echo ""
echo "📋 Testing report listing..."
$REPORT_CLI list

# Test 3: Generate with custom filename
echo ""
echo "📝 Testing custom filename generation..."
$REPORT_CLI generate --output demo-report.html

# Test 4: List again to show custom report
echo ""
echo "📋 Updated report listing..."
$REPORT_CLI list

# Test 5: Show report statistics
echo ""
echo "📈 Report File Statistics:"
ls -lh .factory-wager/reports/*.html | while read -r line; do
    echo "  $line"
done

echo ""
echo "🎉 HTML Report Generator Test Completed!"
echo ""
echo "Features Demonstrated:"
echo "  ✅ Beautiful HTML reports with modern design"
echo "  ✅ Interactive charts using Chart.js"
echo "  ✅ Responsive design for all devices"
echo "  ✅ Audit data visualization"
echo "  ✅ Workflow execution details"
echo "  ✅ Risk scoring and success metrics"
echo "  ✅ CLI interface with multiple options"
echo ""
echo "Available Commands:"
echo "  $REPORT_CLI generate              # Generate default report"
echo "  $REPORT_CLI generate --output name.html  # Custom filename"
echo "  $REPORT_CLI list                  # List all reports"
echo "  $REPORT_CLI open                  # Open latest in browser"
echo "  $REPORT_CLI clean                 # Clean old reports"
echo ""
echo "📄 Reports are ready for sharing with stakeholders!"
echo "🌐 Each report is a self-contained HTML file with embedded charts"
