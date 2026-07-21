#!/bin/bash

# Private Registry Setup Script for Bun Proxy API
# This script helps configure your environment for private registry integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGISTRY_URL="https://registry.your-org.com"
PACKAGE_NAME="@your-org/bun-proxy-api"
SCOPE="@your-org"

echo -e "${BLUE}🔧 Bun Proxy API - Private Registry Setup${NC}"
echo "=================================================="

# Function to prompt for input
prompt() {
    local prompt_text=$1
    local var_name=$2
    local default_value=$3

    if [ -n "$default_value" ]; then
        echo -e "${YELLOW}$prompt_text${NC} ($default_value):"
    else
        echo -e "${YELLOW}$prompt_text${NC}:"
    fi

    read -r input

    if [ -z "$input" ] && [ -n "$default_value" ]; then
        export "$var_name"="$default_value"
    else
        export "$var_name"="$input"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists bun; then
    echo -e "${RED}❌ Bun is not installed. Please install Bun first.${NC}"
    echo "Visit: https://bun.sh"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Get registry configuration
echo -e "\n${BLUE}🔐 Registry Configuration${NC}"
echo "============================="

prompt "Enter your private registry URL" REGISTRY_URL "$REGISTRY_URL"
prompt "Enter your package scope (e.g., @your-org)" SCOPE "$SCOPE"
prompt "Enter your package name" PACKAGE_NAME "$PACKAGE_NAME"

# Get authentication token
echo -e "\n${BLUE}🔑 Authentication${NC}"
echo "=================="

echo -e "${YELLOW}Please enter your authentication token for $REGISTRY_URL${NC}"
echo "(You can get this from your registry administrator)"
echo -n "Token: "
read -r -s AUTH_TOKEN
echo

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ Authentication token is required${NC}"
    exit 1
fi

# Create .npmrc
echo -e "\n${BLUE}📝 Creating .npmrc...${NC}"

cat > .npmrc << EOF
registry=$REGISTRY_URL
//$REGISTRY_URL/:_authToken=$AUTH_TOKEN
//$REGISTRY_URL/:always-auth=true
$SCOPE:registry=$REGISTRY_URL
EOF

echo -e "${GREEN}✅ .npmrc created${NC}"

# Create bunfig.toml
echo -e "\n${BLUE}📝 Creating bunfig.toml...${NC}"

cat > bunfig.toml << EOF
[install]
# Default registry for all packages
# Bun automatically expands \$NPM_AUTH_TOKEN from .env files
registry = { url = "$REGISTRY_URL", token = "\$NPM_AUTH_TOKEN" }

# Scoped packages configuration
scopes = { "$SCOPE" = "$REGISTRY_URL" }

# Isolated installs (recommended for better dependency management)
# Similar to pnpm's strict dependency isolation
linker = "isolated"

# Cache configuration
cache = true
cacheDir = ".bun-cache"
lockfile = true
lockfileSave = true

[run]
bun = true
shell = "sh"

[test]
preload = []
coverage = true

[build]
target = "node"
format = "esm"
minify = false
sourcemap = true

# Environment-specific configurations
[install.development]
registry = { url = "$REGISTRY_URL", token = "\$NPM_AUTH_TOKEN" }
linker = "isolated"
cache = true

[install.production]
registry = { url = "$REGISTRY_URL", token = "\$NPM_AUTH_TOKEN" }
linker = "isolated"
cache = false
EOF

echo -e "${GREEN}✅ bunfig.toml created${NC}"

# Update package.json
echo -e "\n${BLUE}📦 Updating package.json...${NC}"

if [ -f package.json ]; then
    # Use Node.js to update package.json
    node -e "
        const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
        pkg.name = '$PACKAGE_NAME';
        pkg.publishConfig = {
            registry: '$REGISTRY_URL',
            access: 'public'
        };
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.publish = 'bun publish';
        pkg.scripts['publish:dry'] = 'bun publish --dry-run';
        require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✅ package.json updated');
    "
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

# Test configuration
echo -e "\n${BLUE}🧪 Testing configuration...${NC}"

# Test npm registry access
echo "Testing npm registry access..."
if npm ping --registry "$REGISTRY_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ npm registry access successful${NC}"
else
    echo -e "${RED}❌ npm registry access failed${NC}"
    echo "Please check your registry URL and authentication token"
    exit 1
fi

# Test bun registry access
echo "Testing bun registry access..."
if bun pm ls --registry "$REGISTRY_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ bun registry access successful${NC}"
else
    echo -e "${YELLOW}⚠️  bun registry test failed (this may be expected for new registries)${NC}"
fi

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies...${NC}"
bun install

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Create environment file template
echo -e "\n${BLUE}📝 Creating .env.example...${NC}"

cat > .env.example << EOF
# Private Registry Configuration
# Bun automatically loads environment variables from .env.local, .env.[NODE_ENV], and .env
# See: https://bun.sh/docs/runtime/environment-variables

# Registry Authentication Token
NPM_AUTH_TOKEN=your-auth-token-here

# Registry Configuration
REGISTRY_URL=$REGISTRY_URL
PACKAGE_NAME=$PACKAGE_NAME
PACKAGE_SCOPE=$SCOPE

# Development Settings
NODE_ENV=development
DEBUG=true

# Optional: Override registry for specific environments
# BUN_REGISTRY=https://registry.your-org.com
EOF

echo -e "${GREEN}✅ .env.example created${NC}"

# Create publish script
echo -e "\n${BLUE}📝 Creating publish script...${NC}"

cat > scripts/publish.sh << 'EOF'
#!/bin/bash

# Publish script for Bun Proxy API
set -e

echo "🚀 Publishing to private registry..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run tests
echo "🧪 Running tests..."
bun test

# Build package
echo "🔨 Building package..."
bun run build

# Publish
echo "📦 Publishing..."
bun publish

echo "✅ Published successfully!"
EOF

chmod +x scripts/publish.sh
echo -e "${GREEN}✅ scripts/publish.sh created${NC}"

# Summary
echo -e "\n${BLUE}🎉 Setup Complete!${NC}"
echo "===================="
echo -e "${GREEN}✅ Private registry configured: $REGISTRY_URL${NC}"
echo -e "${GREEN}✅ Package scope: $SCOPE${NC}"
echo -e "${GREEN}✅ Package name: $PACKAGE_NAME${NC}"
echo -e "${GREEN}✅ Authentication configured${NC}"
echo -e "${GREEN}✅ Configuration files created${NC}"

echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo "1. Review and commit the generated files:"
echo "   git add .npmrc bunfig.toml package.json .env.example scripts/publish.sh"
echo "   git commit -m 'Configure private registry integration'"
echo ""
echo "2. Test publishing (dry run):"
echo "   bun run publish:dry"
echo ""
echo "3. Publish to registry:"
echo "   bun run publish"
echo "   or: ./scripts/publish.sh"
echo ""
echo "4. Install in other projects:"
echo "   bun add $PACKAGE_NAME"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Keep your .npmrc file secure and don't commit it if it contains sensitive tokens"
echo "- Use environment variables for authentication in CI/CD"
echo "- Update your registry URL and scope as needed"

echo -e "\n${BLUE}🔗 Useful Commands:${NC}"
echo "Test registry connection: npm ping --registry $REGISTRY_URL"
echo "List packages: bun pm ls --registry $REGISTRY_URL"
echo "View package info: npm info $PACKAGE_NAME --registry $REGISTRY_URL"
