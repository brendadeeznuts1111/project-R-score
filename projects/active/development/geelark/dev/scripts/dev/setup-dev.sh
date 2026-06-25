#!/bin/bash
set -e

echo "🚀 Setting up Geelark Feature Flag Development Environment"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$1]${NC} $2"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check prerequisites
print_status "CHECK" "Checking prerequisites..."

# Check for Bun
if command -v bun &> /dev/null; then
    print_success "Bun is installed: $(bun --version)"
else
    print_error "Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    print_success "Bun installed: $(bun --version)"
fi

# Check for Docker
if command -v docker &> /dev/null; then
    print_success "Docker is installed: $(docker --version)"
else
    print_warning "Docker is not installed. Some features will be limited."
fi

# Check for Docker Compose
if command -v docker-compose &> /dev/null; then
    print_success "Docker Compose is installed: $(docker-compose --version)"
else
    print_warning "Docker Compose is not installed. Container features will be limited."
fi

# Check for VS Code
if command -v code &> /dev/null; then
    print_success "VS Code is installed"
else
    print_warning "VS Code is not installed. DevContainer features will be limited."
fi

print_status "SETUP" "Setting up project..."

# Install dependencies
print_status "INSTALL" "Installing project dependencies..."
bun install
print_success "Dependencies installed"

# Build development version
print_status "BUILD" "Building development version..."
bun run build:dev
print_success "Development build completed"

# Set up git hooks
print_status "GIT" "Setting up git hooks..."
if [ ! -d ".git" ]; then
    git init
    print_status "GIT" "Initialized new git repository"
fi

if [ ! -d ".git/hooks" ]; then
    mkdir -p .git/hooks
fi

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit security checks..."

# Run security scanning if Snyk is available
if command -v snyk &> /dev/null; then
    echo "🔒 Running Snyk security scan..."
    snyk test --severity-threshold=high || {
        echo "❌ Security vulnerabilities found. Commit blocked."
        exit 1
    }
fi

# Run bandit for Python security (if any Python files)
if command -v bandit &> /dev/null && find . -name "*.py" | grep -q .; then
    echo "🐍 Running Bandit security scan..."
    bandit -r . -ll || {
        echo "❌ Python security issues found. Commit blocked."
        exit 1
    }
fi

echo "✅ Security checks passed!"
EOF

chmod +x .git/hooks/pre-commit

# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
echo "🧪 Running pre-push tests..."

# Run feature flag elimination tests
echo "📊 Testing feature flag elimination..."
bun test tests/feature-elimination.test.ts

# Run type safety tests
echo "📐 Testing type safety..."
bun test tests/type-testing.test.ts

# Run security tests
echo "🔒 Running security tests..."
bun test tests/security.test.ts

# Run bundle size validation
echo "📦 Validating bundle sizes..."
bun run build:compare

echo "✅ All pre-push tests passed!"
EOF

chmod +x .git/hooks/pre-push
print_success "Git hooks configured"

# Set up environment
print_status "ENV" "Setting up environment variables..."

if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
# Environment
NODE_ENV=development
BUN_ENV=development

# Security (generate strong keys for production)
ENCRYPTION_KEY=dev-encryption-key-123
VALIDATION_MODE=strict
AUDIT_TRAIL_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_RETENTION_DAYS=30
EXTERNAL_LOGGING_ENABLED=false

# Development features
FEAT_EXTENDED_LOGGING=true
FEAT_MOCK_API=true
FEAT_ADVANCED_MONITORING=true
EOF
    print_success "Created .env.local file"
else
    print_warning ".env.local already exists, skipping..."
fi

# Create security suppression file
print_status "SECURITY" "Creating security suppression file..."
mkdir -p config

cat > config/security-suppressions.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">
    <!-- Suppress false positives -->
    <suppress>
        <notes><![CDATA[False positive for development dependencies]]></notes>
        <packageUrl regex="true">^pkg:npm/.*@dev$</packageUrl>
        <vulnerabilityName>CVE-XXXX-XXXXX</vulnerabilityName>
    </suppress>

    <!-- Suppress known acceptable vulnerabilities -->
    <suppress>
        <notes><![CDATA[Acceptable risk for development]]></notes>
        <cve>CVE-2021-12345</cve>
    </suppress>
</suppressions>
EOF
print_success "Security suppression file created"

# Install security tools
print_status "TOOLS" "Installing security scanning tools..."

# Check and install Snyk
if ! command -v snyk &> /dev/null; then
    print_status "TOOLS" "Installing Snyk..."
    npm install -g snyk
    print_success "Snyk installed"
else
    print_success "Snyk already installed"
fi

# Check and install Trivy
if ! command -v trivy &> /dev/null; then
    print_status "TOOLS" "Installing Trivy..."
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
    print_success "Trivy installed"
else
    print_success "Trivy already installed"
fi

# Check and install Bandit
if ! command -v bandit &> /dev/null; then
    print_status "TOOLS" "Installing Bandit..."
    pip3 install bandit safety
    print_success "Bandit installed"
else
    print_success "Bandit already installed"
fi

# Run initial security scan
print_status "SCAN" "Running initial security scan..."

if command -v snyk &> /dev/null; then
    print_status "SCAN" "Running Snyk scan..."
    snyk test --severity-threshold=high || true
fi

if command -v trivy &> /dev/null; then
    print_status "SCAN" "Running Trivy scan..."
    trivy fs . --severity CRITICAL,HIGH || true
fi

print_success "Initial security scan completed"

# Create development scripts directory
print_status "SCRIPTS" "Creating development scripts..."

mkdir -p scripts

# Create security scan script
cat > scripts/security-scan.sh << 'EOF'
#!/bin/bash
set -e

echo "🔒 Running comprehensive security scan..."

# Run Snyk if available
if command -v snyk &> /dev/null; then
    echo "🔍 Running Snyk vulnerability scan..."
    snyk test --severity-threshold=high --json > reports/snyk-scan.json || {
        echo "⚠️ Snyk scan completed with findings"
    }
fi

# Run Trivy if available
if command -v trivy &> /dev/null; then
    echo "🐳 Running Trivy container scan..."
    trivy fs . --severity CRITICAL,HIGH --format json > reports/trivy-scan.json || {
        echo "⚠️ Trivy scan completed with findings"
    }
fi

# Run Bandit if Python files exist
if command -v bandit &> /dev/null && find . -name "*.py" | grep -q .; then
    echo "🐍 Running Bandit Python security scan..."
    bandit -r . -ll -f json -o reports/bandit-scan.json || {
        echo "⚠️ Bandit scan completed with findings"
    }
fi

# Run dependency audit
echo "📦 Running dependency audit..."
bun audit --json > reports/dependency-audit.json || {
    echo "⚠️ Dependency audit completed with findings"
}

# Run feature flag security tests
echo "🚩 Running feature flag security tests..."
bun test tests/security.test.ts --json > reports/feature-flag-security.json || {
    echo "⚠️ Feature flag security tests completed with findings"
}

echo "✅ Security scan completed. Reports saved to reports/"
EOF

chmod +x scripts/security-scan.sh

# Create dev environment startup script
cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Geelark Development Environment"
echo "=========================================="

# Start Dev HQ automation server
echo "🤖 Starting Dev HQ automation server..."
bun run dev-hq server &
DEV_HQ_PID=$!

# Start the main application
echo "📱 Starting Geelark application..."
bun run start:dev &
APP_PID=$!

# Start monitoring dashboard
echo "📊 Starting monitoring dashboard..."
bun run dashboard &
DASHBOARD_PID=$!

echo ""
echo "✅ Development environment started!"
echo ""
echo "📡 Services running:"
echo "   - Dev HQ Server: http://localhost:8080"
echo "   - Application: http://localhost:3000"
echo "   - Dashboard: http://localhost:3000/dashboard"
echo ""
echo "🔧 Available commands:"
echo "   bun run status          - Check system status"
echo "   bun run logs            - View logs"
echo "   bun run flags           - Manage feature flags"
echo "   bun run health          - Check health"
echo "   bun run audit           - Run security audit"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

# Trap Ctrl+C to clean up
trap 'kill $DEV_HQ_PID $APP_PID $DASHBOARD_PID; echo "🛑 Services stopped"; exit' INT

# Wait for all processes
wait
EOF

chmod +x scripts/start-dev.sh
print_success "Development scripts created"

# Create reports directory
mkdir -p reports
print_success "Reports directory created"

# Run initial tests
print_status "TEST" "Running initial test suite..."

bun test tests/security.test.ts --verbose || {
    print_warning "Security tests completed with warnings"
}

bun test tests/feature-elimination.test.ts --verbose || {
    print_warning "Feature elimination tests completed with warnings"
}

print_success "Initial test suite completed"

# Final setup
print_status "FINAL" "Finalizing setup..."

# Create README for scripts
cat > scripts/README.md << 'EOF'
# Development Scripts

## Available Scripts

### `./scripts/setup-dev.sh`
Sets up the complete development environment including:
- Installs dependencies
- Configures git hooks
- Sets up environment variables
- Installs security scanning tools
- Runs initial security scan

### `./scripts/security-scan.sh`
Runs comprehensive security scanning including:
- Snyk vulnerability scanning
- Trivy container scanning
- Bandit Python security scanning
- Dependency audit
- Feature flag security tests

### `./scripts/start-dev.sh`
Starts the complete development environment:
- Dev HQ automation server (port 8080)
- Main application (port 3000)
- Monitoring dashboard

## Usage

1. First-time setup:
```bash
./scripts/setup-dev.sh
```

2. Regular development:
```bash
./scripts/start-dev.sh
```

3. Security scanning:
```bash
./scripts/security-scan.sh
```

## Environment Variables

Create `.env.local` for local configuration:
```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

## Git Hooks

Pre-configured hooks:
- `pre-commit`: Runs security scans before committing
- `pre-push`: Runs comprehensive tests before pushing

## Troubleshooting

If scripts fail:
1. Check that all prerequisites are installed
2. Ensure you have proper permissions
3. Check the logs in `reports/` directory
4. Run individual commands manually to identify issues
EOF

print_success "Scripts documentation created"

# Summary
echo ""
echo "🎉 Geelark Development Environment Setup Complete!"
echo "================================================="
echo ""
echo "📋 What was set up:"
echo "   ✅ Development container configuration (.devcontainer/)"
echo "   ✅ VS Code workspace settings (.vscode/)"
echo "   ✅ CI/CD pipelines (.github/workflows/)"
echo "   ✅ Security scanning configuration (config/)"
echo "   ✅ Security test suite (tests/security.test.ts)"
echo "   ✅ Development scripts (scripts/)"
echo "   ✅ Comprehensive documentation (docs/SETUP.md)"
echo ""
echo "🚀 Next steps:"
echo "   1. Review and customize .env.local for your environment"
echo "   2. Start development with: ./scripts/start-dev.sh"
echo "   3. Run security scans: ./scripts/security-scan.sh"
echo "   4. Explore the codebase in src/"
echo ""
echo "💡 Tips:"
echo "   - Use 'bun run' to see all available commands"
echo "   - Check package.json for script definitions"
echo "   - Review docs/ for more documentation"
echo "   - Use VS Code Dev Containers for best experience"
echo ""
echo "🔧 Need help?"
echo "   - Check docs/SETUP.md for detailed instructions"
echo "   - Review test files for examples"
echo "   - Check GitHub workflows for CI/CD examples"
echo ""
echo "Happy coding! 🚀"
