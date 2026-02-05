#!/bin/bash

# Fire22 Secure Credential Setup Script
# Uses Bun.secrets for OS-native credential storage

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="fire22-dashboard-worker"

echo -e "${BLUE}🔐 Fire22 Secure Credential Setup${NC}"
echo "========================================"

# Function to store credential securely
store_credential() {
    local name=$1
    local value=$2
    local display_name=$3
    
    bun -e "
import { secrets } from 'bun';
try {
  await secrets.set({
    service: '$SERVICE_NAME',
    name: '$name',
    value: '$value'
  });
  console.log('✅ $display_name stored securely');
} catch (error) {
  console.error('❌ Failed to store $display_name:', error.message);
  process.exit(1);
}
"
}

# Function to verify credential storage
verify_credential() {
    local name=$1
    local display_name=$2
    
    bun -e "
import { secrets } from 'bun';
try {
  const value = await secrets.get({
    service: '$SERVICE_NAME',
    name: '$name'
  });
  if (value) {
    console.log('✅ $display_name verified');
  } else {
    console.log('❌ $display_name not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to verify $display_name:', error.message);
  process.exit(1);
}
" 2>/dev/null
}

# Interactive credential setup
echo -e "${YELLOW}This script will help you securely store credentials using Bun.secrets${NC}"
echo "Credentials will be stored in your OS-native credential store:"
echo "• macOS: Keychain"
echo "• Linux: libsecret (GNOME Keyring/KWallet)"
echo "• Windows: Credential Manager"
echo ""

# GitHub Token Setup
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo -e "${BLUE}📝 GitHub Personal Access Token${NC}"
    echo "Enter your GitHub Personal Access Token (ghp_...):"
    echo "Leave empty to skip..."
    read -r -s github_token
    echo ""
    
    if [[ -n "$github_token" ]]; then
        if [[ "$github_token" =~ ^ghp_[a-zA-Z0-9]{36}$ ]]; then
            store_credential "github-token" "$github_token" "GitHub Token"
        else
            echo -e "${RED}❌ Invalid GitHub token format${NC}"
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping GitHub token setup${NC}"
    fi
else
    echo -e "${YELLOW}🔍 Using existing GITHUB_TOKEN environment variable${NC}"
    store_credential "github-token" "$GITHUB_TOKEN" "GitHub Token"
fi

echo ""

# API Key Setup
echo -e "${BLUE}🔑 Fire22 API Key${NC}"
echo "Enter your Fire22 API key:"
echo "Leave empty to skip..."
read -r -s api_key
echo ""

if [[ -n "$api_key" ]]; then
    store_credential "api-key" "$api_key" "Fire22 API Key"
else
    echo -e "${YELLOW}⏭️  Skipping API key setup${NC}"
fi

echo ""

# Database URL Setup
echo -e "${BLUE}🗄️  Database Connection URL${NC}"
echo "Enter your database connection URL:"
echo "Examples:"
echo "  • PostgreSQL: postgresql://user:pass@localhost/dbname"
echo "  • MySQL: mysql://user:pass@localhost/dbname"
echo "Leave empty to skip..."
read -r -s database_url
echo ""

if [[ -n "$database_url" ]]; then
    store_credential "database-url" "$database_url" "Database URL"
else
    echo -e "${YELLOW}⏭️  Skipping database URL setup${NC}"
fi

echo ""

# JWT Secret Setup
echo -e "${BLUE}🎫 JWT Secret Key${NC}"
echo "Enter your JWT secret key (or press Enter to generate one):"
read -r -s jwt_secret
echo ""

if [[ -z "$jwt_secret" ]]; then
    # Generate a secure JWT secret
    jwt_secret=$(bun -e "console.log(crypto.randomUUID() + crypto.randomUUID())")
    echo -e "${GREEN}🎲 Generated secure JWT secret${NC}"
fi

store_credential "jwt-secret" "$jwt_secret" "JWT Secret"

echo ""

# Encryption Key Setup
echo -e "${BLUE}🔒 Encryption Key${NC}"
echo "Enter your encryption key (or press Enter to generate one):"
read -r -s encryption_key
echo ""

if [[ -z "$encryption_key" ]]; then
    # Generate a secure encryption key (32 bytes)
    encryption_key=$(bun -e "
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
")
    echo -e "${GREEN}🎲 Generated secure encryption key${NC}"
fi

store_credential "encryption-key" "$encryption_key" "Encryption Key"

echo ""
echo "========================================"
echo -e "${GREEN}✅ Credential setup completed!${NC}"
echo ""

# Verification phase
echo -e "${BLUE}🔍 Verifying stored credentials...${NC}"

verify_credential "github-token" "GitHub Token" 2>/dev/null || echo -e "${YELLOW}⚠️  GitHub Token not verified${NC}"
verify_credential "api-key" "Fire22 API Key" 2>/dev/null || echo -e "${YELLOW}⚠️  API Key not verified${NC}"
verify_credential "database-url" "Database URL" 2>/dev/null || echo -e "${YELLOW}⚠️  Database URL not verified${NC}"
verify_credential "jwt-secret" "JWT Secret" 2>/dev/null || echo -e "${YELLOW}⚠️  JWT Secret not verified${NC}"
verify_credential "encryption-key" "Encryption Key" 2>/dev/null || echo -e "${YELLOW}⚠️  Encryption Key not verified${NC}"

echo ""

# Usage examples
echo -e "${BLUE}💡 Usage Examples:${NC}"
echo ""
echo "Retrieve GitHub token in your code:"
echo "import { secrets } from 'bun';"
echo "const token = await secrets.get({ service: '$SERVICE_NAME', name: 'github-token' });"
echo ""

echo "Use in shell scripts:"
echo "GITHUB_TOKEN=\$(bun -e \"import { secrets } from 'bun'; console.log(await secrets.get({ service: '$SERVICE_NAME', name: 'github-token' }))\")"
echo ""

echo "Run secure tests:"
echo "./scripts/test-workspaces-secure.sh"
echo ""

echo -e "${BLUE}🔐 Security Notes:${NC}"
echo "• Credentials are stored in your OS-native credential store"
echo "• They are encrypted and only accessible to your user account"
echo "• No credentials are stored in plain text files"
echo "• Use environment variables as fallback for CI/CD environments"
echo ""

echo -e "${GREEN}✅ Setup complete! Your credentials are now stored securely.${NC}"