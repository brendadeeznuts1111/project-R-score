#!/bin/bash

# FactoryWager CLI Demo Script
# Demonstrates key CLI capabilities

set -e

echo "🚀 FactoryWager CLI Demo"
echo "========================\n"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 1. Help Command${NC}"
echo "Showing available commands..."
./cli/fw-cli help
echo ""

echo -e "${BLUE}📊 2. Infrastructure Status${NC}"
echo "Checking overall infrastructure status..."
./cli/fw-cli status
echo ""

echo -e "${BLUE}📦 3. Domain Management${NC}"
echo "Listing GitHub Pages domains..."
./cli/fw-cli domains list github | head -10
echo "..."
echo ""

echo -e "${BLUE}🗄️ 4. R2 Bucket Domains${NC}"
echo "Listing R2 bucket domains..."
./cli/fw-cli domains list r2 | head -10
echo "..."
echo ""

echo -e "${BLUE}⚙️ 5. Configuration${NC}"
echo "Showing current configuration..."
./cli/fw-cli config show
echo ""

echo -e "${BLUE}🔍 6. Domain Search${NC}"
echo "Searching for 'wiki' domains..."
./cli/fw-cli domains search wiki 2>/dev/null || echo "Search requires API token"
echo ""

echo -e "${YELLOW}📝 Demo Complete!${NC}"
echo ""
echo "🎯 Key Features Demonstrated:"
echo "✅ Help system with comprehensive documentation"
echo "✅ Infrastructure status monitoring"
echo "✅ Domain listing and filtering"
echo "✅ Configuration management"
echo "✅ Search capabilities"
echo ""
echo -e "${BLUE}🚀 Ready for Production Use!${NC}"
echo ""
echo "Next Steps:"
echo "1. Set your API token: export FACTORY_WAGER_TOKEN=\"your_token\""
echo "2. Run: ./cli/fw-cli auth setup"
echo "3. Try advanced commands: ./cli/fw-cli dns list"
echo ""
echo "Documentation: ./cli/README.md"
