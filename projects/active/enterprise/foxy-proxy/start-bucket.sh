#!/bin/bash

# Quick Start Script for Enhanced Bucket Visualization
# One-click setup and launch

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Enhanced Bucket Visualization - Quick Start${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Setup
echo -e "${GREEN}Step 1: Setting up environment...${NC}"
if ./scripts/bucket-bootstrap.sh setup; then
    echo -e "${GREEN}✅ Environment setup complete${NC}"
else
    echo -e "${YELLOW}⚠️  Setup completed with warnings (check .env file)${NC}"
fi

echo ""

# Step 2: Check environment
echo -e "${GREEN}Step 2: Checking environment configuration...${NC}"
if [ -f "packages/dashboard/.env" ]; then
    echo -e "${GREEN}✅ Environment file exists${NC}"
    
    # Check if required variables are set
    if grep -q "VITE_R2_ACCOUNT_ID=" packages/dashboard/.env && \
       grep -q "VITE_R2_ACCESS_KEY_ID=" packages/dashboard/.env && \
       grep -q "VITE_R2_SECRET_ACCESS_KEY=" packages/dashboard/.env && \
       grep -q "VITE_R2_BUCKET_NAME=" packages/dashboard/.env; then
        echo -e "${GREEN}✅ Required environment variables are configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Please edit packages/dashboard/.env with your R2 credentials${NC}"
        echo -e "${YELLOW}   Required: VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Environment file not found - please run setup first${NC}"
    exit 1
fi

echo ""

# Step 3: Start server
echo -e "${GREEN}Step 3: Starting bucket visualization server...${NC}"
if ./scripts/bucket-bootstrap.sh start; then
    echo -e "${GREEN}✅ Server started successfully!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access your bucket visualization at: http://localhost:5173${NC}"
    echo -e "${BLUE}📊 Monitor with: ./scripts/bucket-monitor.sh dashboard${NC}"
    echo -e "${BLUE}🛑 Stop with: ./scripts/bucket-bootstrap.sh stop${NC}"
    echo ""
    echo -e "${GREEN}🎉 Happy bucket visualizing!${NC}"
else
    echo -e "${YELLOW}⚠️  Server startup failed - check logs with ./scripts/bucket-bootstrap.sh logs${NC}"
    exit 1
fi
