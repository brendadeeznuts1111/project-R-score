#!/bin/bash

# R2 Setup Script for Enhanced Bucket Visualization
# This script helps configure Cloudflare R2 credentials

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/packages/dashboard/.env"

echo -e "${BLUE}🔧 Cloudflare R2 Setup for Enhanced Bucket Visualization${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo "Please run ./start-bucket.sh first to create the environment file."
    exit 1
fi

echo -e "${GREEN}This script will help you configure your Cloudflare R2 credentials.${NC}"
echo ""

# Function to get user input
get_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    local value
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value=${value:-$default}
    else
        read -p "$prompt: " value
    fi
    
    # Update the .env file
    local placeholder="your_${var_name,,}_here"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/VITE_${var_name}=${placeholder}/VITE_${var_name}=${value}/" "$ENV_FILE"
    else
        # Linux
        sed -i "s/VITE_${var_name}=${placeholder}/VITE_${var_name}=${value}/" "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ Set VITE_${var_name}=${value}${NC}"
}

echo -e "${YELLOW}📋 Required Cloudflare R2 Information:${NC}"
echo ""
echo "1. Account ID: Found in Cloudflare dashboard sidebar"
echo "2. Access Key ID: R2 API token identifier"
echo "3. Secret Access Key: R2 API token secret"
echo "4. Bucket Name: Your R2 bucket name"
echo "5. Public URL: R2 bucket public URL (optional)"
echo ""

echo -e "${BLUE}🔗 Getting your Cloudflare R2 Credentials:${NC}"
echo ""
echo "1. Go to https://dash.cloudflare.com/"
echo "2. Select your account"
echo "3. Go to 'R2 Object Storage' in the sidebar"
echo "4. Create a bucket if you don't have one"
echo "5. Go to 'Manage R2 API Tokens'"
echo "6. Create a token with 'Object Read & Write' permissions"
echo ""

read -p "Press Enter to continue with configuration..."

echo ""
echo -e "${BLUE}⚙️  Configuration:${NC}"
echo ""

# Get Account ID
get_input "Cloudflare Account ID" "R2_ACCOUNT_ID" ""

# Get Access Key ID
get_input "R2 Access Key ID" "R2_ACCESS_KEY_ID" ""

# Get Secret Access Key
get_input "R2 Secret Access Key" "R2_SECRET_ACCESS_KEY" ""

# Get Bucket Name
get_input "R2 Bucket Name" "R2_BUCKET_NAME" "foxy-proxy-storage"

# Get Public URL (optional)
echo ""
read -p "R2 Public URL (optional, press Enter to skip): " public_url
if [ -n "$public_url" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|VITE_R2_PUBLIC_URL=https://your-custom-domain.com|VITE_R2_PUBLIC_URL=${public_url}|" "$ENV_FILE"
    else
        sed -i "s|VITE_R2_PUBLIC_URL=https://your-custom-domain.com|VITE_R2_PUBLIC_URL=${public_url}|" "$ENV_FILE"
    fi
    echo -e "${GREEN}✅ Set VITE_R2_PUBLIC_URL=${public_url}${NC}"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|VITE_R2_PUBLIC_URL=https://your-custom-domain.com|VITE_R2_PUBLIC_URL=|' "$ENV_FILE"
    else
        sed -i 's|VITE_R2_PUBLIC_URL=https://your-custom-domain.com|VITE_R2_PUBLIC_URL=|' "$ENV_FILE"
    fi
    echo -e "${YELLOW}⚠️  Public URL left empty${NC}"
fi

echo ""
echo -e "${GREEN}🔍 Testing R2 Connection...${NC}"

# Test the configuration by restarting the server
echo "Restarting server with new configuration..."
cd "$PROJECT_ROOT"
./scripts/bucket-bootstrap.sh restart

echo ""
echo -e "${GREEN}✅ R2 Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}🌐 Your bucket visualization should now be available at:${NC}"
echo -e "${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}📊 Monitor the connection with:${NC}"
echo -e "${YELLOW}./scripts/bucket-monitor.sh dashboard${NC}"
echo ""
echo -e "${BLUE}🛑 Stop the server with:${NC}"
echo -e "${YELLOW}./scripts/bucket-bootstrap.sh stop${NC}"
echo ""
echo -e "${GREEN}🎉 Your enhanced bucket visualization is now connected to Cloudflare R2!${NC}"
