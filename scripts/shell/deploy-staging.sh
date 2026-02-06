#!/bin/bash

# 🚀 Staging Deployment Script
# Deploys the application to staging environment

set -e

echo "🎯 Starting Staging Deployment..."
echo "================================"

# Configuration
STAGING_BRANCH="staging"
STAGING_ENV="staging"
STAGING_PORT=3000
STAGING_HOST="0.0.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "  Branch: ${STAGING_BRANCH}"
echo -e "  Environment: ${STAGING_ENV}"
echo -e "  Host: ${STAGING_HOST}"
echo -e "  Port: ${STAGING_PORT}"
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$STAGING_BRANCH" ]; then
    echo -e "${RED}❌ Error: Not on staging branch. Current branch: $CURRENT_BRANCH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Correct branch: $STAGING_BRANCH${NC}"

# Pull latest changes
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
git pull origin $STAGING_BRANCH

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
bun install

# Set environment variables for staging
echo -e "${BLUE}🔧 Setting up staging environment...${NC}"
export NODE_ENV=$STAGING_ENV
export SERVER_HOST=$STAGING_HOST
export SERVER_PORT=$STAGING_PORT
export DASHBOARD_HOST=$STAGING_HOST
export LOG_LEVEL=info
export JSON_LOGS=true

echo -e "${GREEN}✅ Environment variables set${NC}"

# Run health checks
echo -e "${BLUE}🏥 Running health checks...${NC}"

# Check if critical files exist
if [ ! -f "server/base-server.ts" ]; then
    echo -e "${RED}❌ Error: Critical server file missing${NC}"
    exit 1
fi

if [ ! -f "lib/utils/logger.ts" ]; then
    echo -e "${RED}❌ Error: Logger utility missing${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Health checks passed${NC}"

# Build the application (if needed)
echo -e "${BLUE}🔨 Building application...${NC}"
bun build --target=bun server/base-server.ts --outdir=./dist-staging

echo -e "${GREEN}✅ Build completed${NC}"

# Start the staging server
echo -e "${BLUE}🚀 Starting staging server...${NC}"
echo ""
echo -e "${GREEN}🌐 Staging server will be available at:${NC}"
echo -e "   http://${STAGING_HOST}:${STAGING_PORT}"
echo ""
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server with error handling
if bun run server/base-server.ts; then
    echo -e "${GREEN}✅ Staging server started successfully${NC}"
else
    echo -e "${RED}❌ Error: Failed to start staging server${NC}"
    exit 1
fi
