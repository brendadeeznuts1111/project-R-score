#!/bin/bash

# Fire22 Dashboard Worker - Secret Configuration Script
# This script sets up all required secrets for the dashboard-worker

echo "🔐 Fire22 Dashboard Worker - Secret Configuration"
echo "================================================="
echo ""
echo "This script will configure all required secrets for your worker."
echo "You'll be prompted to enter each secret value."
echo ""
echo "⚠️  IMPORTANT: Never commit actual secret values to version control!"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local is_required=$3
    
    echo -e "${YELLOW}Setting: $secret_name${NC}"
    echo "Description: $description"
    
    if [ "$is_required" = "required" ]; then
        echo -e "${RED}[REQUIRED]${NC}"
    else
        echo -e "${GREEN}[OPTIONAL]${NC}"
    fi
    
    read -s -p "Enter value (or press Enter to skip): " secret_value
    echo ""
    
    if [ ! -z "$secret_value" ]; then
        echo "$secret_value" | wrangler secret put "$secret_name"
        echo -e "${GREEN}✓ $secret_name configured${NC}"
    else
        if [ "$is_required" = "required" ]; then
            echo -e "${RED}⚠️  Warning: $secret_name is required for production${NC}"
        else
            echo "Skipped $secret_name"
        fi
    fi
    echo ""
}

echo "📋 Starting secret configuration..."
echo "===================================="
echo ""

# Required Secrets
echo -e "${RED}=== REQUIRED SECRETS ===${NC}"
echo ""

set_secret "JWT_SECRET" "JWT secret for authentication (min 32 chars)" "required"
set_secret "ADMIN_PASSWORD" "Admin dashboard password" "required"
set_secret "FIRE22_TOKEN" "Fire22 API authentication token" "required"
set_secret "FIRE22_WEBHOOK_SECRET" "Fire22 webhook validation secret (min 32 chars)" "required"
set_secret "CRON_SECRET" "Secret for cron job authentication (min 32 chars)" "required"

# Optional Secrets
echo ""
echo -e "${GREEN}=== OPTIONAL SECRETS ===${NC}"
echo ""

set_secret "BOT_TOKEN" "Telegram bot token for main bot" "optional"
set_secret "CASHIER_BOT_TOKEN" "Telegram bot token for cashier bot" "optional"
set_secret "STRIPE_SECRET_KEY" "Stripe payment processing secret key" "optional"
set_secret "STRIPE_WEBHOOK_SECRET" "Stripe webhook endpoint secret" "optional"
set_secret "SENDGRID_API_KEY" "SendGrid API key for email sending" "optional"
set_secret "TWILIO_ACCOUNT_SID" "Twilio account SID for SMS" "optional"
set_secret "TWILIO_AUTH_TOKEN" "Twilio authentication token" "optional"

echo ""
echo "====================================="
echo -e "${GREEN}✅ Secret configuration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Create a .env file for local development:"
echo "   cp .env.example .env"
echo "   # Edit .env with your development values"
echo ""
echo "2. Test your configuration:"
echo "   wrangler dev"
echo ""
echo "3. Deploy to production when ready:"
echo "   wrangler deploy"
echo ""
echo "To list configured secrets:"
echo "   wrangler secret list"
echo ""
echo "To update a specific secret:"
echo "   wrangler secret put SECRET_NAME"
echo ""