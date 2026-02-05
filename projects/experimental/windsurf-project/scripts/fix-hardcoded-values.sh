#!/bin/bash

# Fix Hardcoded Values Script
# Replaces hardcoded URLs, ports, and keys with configuration references

echo "🔧 Fixing Hardcoded Values"
echo "=========================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Function to replace in files
replace_in_file() {
    local file="$1"
    local pattern="$2"
    local replacement="$3"
    
    if [ -f "$file" ]; then
        sed -i '' "s|$pattern|$replacement|g" "$file"
        echo -e "${GREEN}✅ Fixed: $file${NC}"
    fi
}

# Function to replace hardcoded localhost URLs
fix_localhost_urls() {
    echo -e "${BLUE}🌐 Fixing localhost URLs...${NC}"
    
    # Replace localhost URLs with config references
    find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v dist | while read file; do
        replace_in_file "$file" "http://localhost:3000" "config.getEndpoint('dashboard').local"
        replace_in_file "$file" "http://localhost:8080" "config.getEndpoint('api').local"
        replace_in_file "$file" "http://localhost:9000" "config.getEndpoint('storage').r2.endpoint"
        replace_in_file "$file" "http://localhost:3001" "config.getEndpoint('analytics').grafana.url"
        replace_in_file "$file" "http://ip-api.com/json/" "config.getEndpoint('external').ipApi"
    done
}

# Function to replace hardcoded ports
fix_hardcoded_ports() {
    echo -e "${BLUE}🔌 Fixing hardcoded ports...${NC}"
    
    find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v dist | while read file; do
        replace_in_file "$file" "port: 3000" "port: config.getPort('dashboard')"
        replace_in_file "$file" "port: 8080" "port: config.getPort('api')"
        replace_in_file "$file" "port: 9000" "port: config.getPort('storage')"
        replace_in_file "$file" "port: 3001" "port: config.getPort('grafana')"
        replace_in_file "$file" "port: 3128" "port: config.getPort('proxy')"
    done
}

# Function to replace hardcoded timeouts
fix_hardcoded_timeouts() {
    echo -e "${BLUE}⏱️ Fixing hardcoded timeouts...${NC}"
    
    find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v dist | while read file; do
        replace_in_file "$file" "timeout: 10000" "timeout: config.getTimeout('default')"
        replace_in_file "$file" "timeout: 5000" "timeout: config.getTimeout('dashboard')"
        replace_in_file "$file" "timeout: 15000" "timeout: config.getTimeout('api')"
        replace_in_file "$file" "timeout: 30000" "timeout: config.getTimeout('storage')"
    done
}

# Function to replace hardcoded API keys and secrets
fix_api_keys() {
    echo -e "${BLUE}🔐 Fixing hardcoded API keys...${NC}"
    
    find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v dist | while read file; do
        replace_in_file "$file" "Bun.env.S3_SECRET_ACCESS_KEY" "config.getSecret('s3').secretAccessKey"
        replace_in_file "$file" "Bun.env.PROXY_AUTH_TOKEN" "config.getSecret('proxy').authToken"
        replace_in_file "$file" "process.env.R2_ENDPOINT" "config.getEndpoint('storage').r2.endpoint"
        replace_in_file "$file" "process.env.R2_BUCKET" "config.getEndpoint('storage').r2.bucket"
        replace_in_file "$file" "process.env.GRAFANA_URL" "config.getEndpoint('analytics').grafana.url"
    done
}

# Function to add config imports to TypeScript files
add_config_imports() {
    echo -e "${BLUE}📦 Adding config imports...${NC}"
    
    find . -name "*.ts" | grep -v node_modules | grep -v dist | while read file; do
        # Check if file uses config but doesn't import it
        if grep -q "config\." "$file" && ! grep -q "import.*config" "$file"; then
            # Add import at the top of the file
            sed -i '' '1i\
import config from '\''../src/config/config-loader'\'';
' "$file"
            echo -e "${GREEN}✅ Added import to: $file${NC}"
        fi
    done
}

# Function to fix magic numbers
fix_magic_numbers() {
    echo -e "${BLUE}🔢 Fixing magic numbers...${NC}"
    
    find . -name "*.ts" -o -name "*.js" | grep -v node_modules | grep -v dist | while read file; do
        # Replace common magic numbers with named constants
        replace_in_file "$file" "=== 200" "=== HTTP_STATUS.OK"
        replace_in_file "$file" "=== 404" "=== HTTP_STATUS.NOT_FOUND"
        replace_in_file "$file" "=== 500" "=== HTTP_STATUS.INTERNAL_ERROR"
        replace_in_file "$file" "setTimeout(.*5000)" "setTimeout(config.getTimeout('dashboard'))"
        replace_in_file "$file" "setInterval(.*2500)" "setInterval(HEALTH_CHECK_INTERVAL)"
    done
}

# Function to create constants file
create_constants() {
    echo -e "${BLUE}📋 Creating constants file...${NC}"
    
    cat > src/config/constants.ts << 'EOF'
/**
 * Application Constants
 * Single source of truth for magic numbers and fixed values
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403
} as const;

export const HEALTH_CHECK_INTERVAL = 2500;
export const DEFAULT_RETRY_COUNT = 3;
export const MAX_BATCH_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

export const ERROR_MESSAGES = {
  INVALID_CONFIG: 'Configuration is invalid',
  NETWORK_ERROR: 'Network connection failed',
  AUTHENTICATION_FAILED: 'Authentication failed',
  RESOURCE_NOT_FOUND: 'Resource not found'
} as const;
EOF
    
    echo -e "${GREEN}✅ Created constants file${NC}"
}

# Function to update package.json scripts
update_package_scripts() {
    echo -e "${BLUE}📜 Updating package.json scripts...${NC}"
    
    # Add config validation script
    if ! grep -q "config:validate" package.json; then
        sed -i '' '/"test:list"/a\
    "config:validate": "bun -e \\"import config from '\''./src/config/config-loader'\''; console.log(config.validate())\\",\
    "config:generate": "bun -e \\"import config from '\''./src/config/config-loader'\''; config.generateEnvFile()\\"",
' package.json
        echo -e "${GREEN}✅ Added config scripts${NC}"
    fi
}

# Main execution
echo -e "${YELLOW}🚀 Starting hardcoded values fix...${NC}"

create_constants
fix_localhost_urls
fix_hardcoded_ports
fix_hardcoded_timeouts
fix_api_keys
fix_magic_numbers
add_config_imports
update_package_scripts

echo ""
echo -e "${GREEN}✅ Hardcoded values fix complete!${NC}"
echo ""
echo "📋 Summary of changes:"
echo "   - Replaced localhost URLs with config references"
echo "   - Replaced hardcoded ports with config.getPort()"
echo "   - Replaced hardcoded timeouts with config.getTimeout()"
echo "   - Replaced API keys with config.getSecret()"
echo "   - Added config imports where needed"
echo "   - Created constants.ts for magic numbers"
echo "   - Updated package.json with config scripts"
echo ""
echo "🧪 Next steps:"
echo "   1. Run: bun run config:validate"
echo "   2. Run: bun run config:generate"
echo "   3. Update .env file with your values"
echo "   4. Test the configuration system"

echo ""
echo -e "${BLUE}🎯 Configuration system is now ready!${NC}"
