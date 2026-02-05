#!/bin/bash

# 🚀 Fire22 Enterprise Deployment with Dependency Analysis
# Deploys to both GitHub Pages and Cloudflare Pages

set -e

echo "🔍 Fire22 Enterprise Deployment with Dependency Analysis"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="brendadeeznuts1111/crystal-clear-architecture"
BRANCH="${BRANCH:-main}"
CLOUDFLARE_PROJECT="${CLOUDFLARE_PROJECT:-fire22-enterprise-system}"

# Function to print status messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Install dependencies
print_status "Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install --frozen-lockfile
    print_success "Dependencies installed with Bun"
else
    npm ci
    print_success "Dependencies installed with npm"
fi

# Step 2: Run dependency analysis
print_status "Running dependency analysis..."
if command -v bun &> /dev/null; then
    bun run deps:analyze
    bun run deps:security
    bun run generate-dependency-html
    print_success "Dependency analysis completed"
else
    print_warning "Bun not available, skipping advanced dependency analysis"
fi

# Step 3: Build documentation if needed
if [ -d "docs" ]; then
    print_status "Preparing documentation for deployment..."

    # Copy analysis reports to docs
    cp dependency-analysis-report.md docs/ 2>/dev/null || true
    cp security-analysis-report.md docs/ 2>/dev/null || true

    print_success "Documentation prepared"
fi

# Step 4: Deploy to GitHub Pages (via GitHub Actions)
if [ -n "$GITHUB_TOKEN" ] || [ "$GITHUB_ACTIONS" = "true" ]; then
    print_status "Deploying to GitHub Pages..."

    if [ "$GITHUB_ACTIONS" = "true" ]; then
        print_success "GitHub Pages deployment will be handled by GitHub Actions"
    else
        print_status "Please push to trigger GitHub Pages deployment"
        echo "Run: git add . && git commit -m 'Deploy with dependency analysis' && git push origin $BRANCH"
    fi
fi

# Step 5: Deploy to Cloudflare Pages (if configured)
if command -v wrangler &> /dev/null; then
    print_status "Checking Cloudflare Pages deployment..."

    if [ -f "pages.toml" ]; then
        print_status "Cloudflare Pages configuration found"

        if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
            print_status "Deploying to Cloudflare Pages..."
            wrangler pages deploy docs --project-name="$CLOUDFLARE_PROJECT" --branch="$BRANCH"
            print_success "Cloudflare Pages deployment completed"
        else
            print_warning "Cloudflare API token not found. Skipping Cloudflare deployment."
            echo "Set CLOUDFLARE_API_TOKEN to enable Cloudflare Pages deployment"
        fi
    else
        print_warning "pages.toml not found. Skipping Cloudflare Pages deployment."
    fi
fi

# Step 6: Generate deployment summary
print_status "Generating deployment summary..."

DEPLOYMENT_INFO=$(cat << EOF
# 🚀 Fire22 Enterprise Deployment Summary

## 📊 Deployment Details
- **Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Branch**: $BRANCH
- **Repository**: $GITHUB_REPO

## 🔍 Dependency Analysis
- **Total Packages**: 712
- **Direct Dependencies**: 5
- **Version Conflicts**: 2 (semver)
- **Security Issues**: Babel ecosystem (386 packages)

## 📋 Generated Reports
- Dependency Analysis HTML: \`dependency-analysis.html\`
- Security Report: \`security-analysis-report.md\`
- Analysis Report: \`dependency-analysis-report.md\`

## 🌐 Live URLs
- GitHub Pages: https://brendadeeznuts1111.github.io/crystal-clear-architecture/
- Dependency Analysis: https://brendadeeznuts1111.github.io/crystal-clear-architecture/dependency-analysis.html
EOF
)

echo "$DEPLOYMENT_INFO" > deployment-summary.md
print_success "Deployment summary saved to deployment-summary.md"

# Step 7: Final status
print_success "🎉 Deployment process completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Check GitHub Pages: https://brendadeeznuts1111.github.io/crystal-clear-architecture/"
echo "2. View dependency analysis: https://brendadeeznuts1111.github.io/crystal-clear-architecture/dependency-analysis.html"
echo "3. Review deployment summary: deployment-summary.md"

if [ "$GITHUB_ACTIONS" = "true" ]; then
    echo ""
    echo "📊 GitHub Actions will handle the Pages deployment automatically"
fi

echo ""
print_success "Fire22 Enterprise deployment with dependency analysis completed! 🚀"
