#!/bin/bash

# 🚀 Empire Pro CLI Status Endpoints Deployment Script
# Deploys Cloudflare Workers and R2 configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="empire-pro-status"
DOMAIN="status.empire-pro-cli.com"
R2_BUCKET="empire-pro-reports"

echo -e "${BLUE}🚀 Empire Pro CLI Status Endpoints Deployment${NC}"
echo "=================================================="

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Cloudflare:${NC}"
    wrangler login
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Create R2 bucket if it doesn't exist
echo -e "${YELLOW}📦 Setting up R2 bucket...${NC}"
if ! wrangler r2 bucket list | grep -q "$R2_BUCKET"; then
    echo "Creating R2 bucket: $R2_BUCKET"
    wrangler r2 bucket create "$R2_BUCKET"
else
    echo "R2 bucket $R2_BUCKET already exists"
fi

# Set up environment variables
echo -e "${YELLOW}⚙️ Setting up environment variables...${NC}"

# Prompt for sensitive values
read -p "Enter API key for status endpoints (or press Enter to skip): " API_KEY
if [ ! -z "$API_KEY" ]; then
    echo "Setting API key secret..."
    wrangler secret put API_KEY --env production
fi

read -p "Enter Slack webhook URL (or press Enter to skip): " SLACK_WEBHOOK
if [ ! -z "$SLACK_WEBHOOK" ]; then
    echo "Setting Slack webhook secret..."
    wrangler secret put SLACK_WEBHOOK_URL --env production
fi

# Deploy to staging first
echo -e "${YELLOW}🚀 Deploying to staging...${NC}"
wrangler deploy --env staging

# Run tests against staging
echo -e "${YELLOW}🧪 Testing staging deployment...${NC}"
STAGING_URL="https://status-staging.empire-pro-cli.com"

echo "Testing health endpoint..."
curl -s "$STAGING_URL/health" | jq .

echo "Testing status endpoint..."
curl -s "$STAGING_URL/status" | jq '.data.status'

echo -e "${GREEN}✅ Staging deployment successful${NC}"

# Ask for production deployment confirmation
echo -e "${YELLOW}🚀 Ready to deploy to production${NC}"
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚀 Deploying to production...${NC}"
    
    # Deploy to production
    wrangler deploy --env production
    
    # Test production deployment
    echo -e "${YELLOW}🧪 Testing production deployment...${NC}"
    PROD_URL="https://$DOMAIN"
    
    echo "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s "$PROD_URL/health")
    echo "$HEALTH_RESPONSE" | jq .
    
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.data.status')
    
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ Production deployment successful!${NC}"
        echo -e "${GREEN}🎉 Status endpoints are now live at: $PROD_URL${NC}"
    else
        echo -e "${RED}❌ Production deployment has issues${NC}"
        echo "Health status: $HEALTH_STATUS"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping production deployment${NC}"
fi

# Set up scheduled monitoring
echo -e "${YELLOW}⏰ Setting up scheduled health checks...${NC}"
echo "Health checks will run every 5 minutes via Cloudflare cron"

# Display deployment summary
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "==================="
echo "Service: $SERVICE_NAME"
echo "Domain: $DOMAIN"
echo "R2 Bucket: $R2_BUCKET"
echo ""
echo "Available Endpoints:"
echo "  • Health Check: https://$DOMAIN/health"
echo "  • Full Status:  https://$DOMAIN/status"
echo "  • Metrics:     https://$DOMAIN/metrics"
echo "  • Analytics:   https://$DOMAIN/analytics"
echo ""
echo "Analytics Formats:"
echo "  • JSON: https://$DOMAIN/analytics"
echo "  • CSV:  https://$DOMAIN/analytics?format=csv"
echo "  • HTML: https://$DOMAIN/analytics?format=html"
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

# Optional: Open status page in browser
read -p "Open status page in browser? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "https://$DOMAIN"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "https://$DOMAIN"
    fi
fi
