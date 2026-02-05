#!/bin/bash

# Fire22 Dashboard Worker - Git Repository Initialization Script
# This script prepares the dashboard-worker directory for separation into its own git repository

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="/Users/nolarose/ff/dashboard-worker"
REMOTE_URL="https://github.com/brendadeeznuts1111/fire22-dashboard-worker"
DEFAULT_BRANCH="main"
DEVELOP_BRANCH="develop"

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}Fire22 Dashboard Worker - Git Repository Setup${NC}"
echo -e "${PURPLE}========================================${NC}\n"

# Check if we're in the right directory
if [ "$PWD" != "$REPO_DIR" ]; then
    echo -e "${YELLOW}Changing to repository directory: $REPO_DIR${NC}"
    cd "$REPO_DIR" || exit 1
fi

# Check if already a git repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}Warning: Directory is already a git repository${NC}"
    echo -e "Current remotes:"
    git remote -v
    
    read -p "Do you want to continue and reconfigure? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborting...${NC}"
        exit 1
    fi
    
    # Backup existing git config
    echo -e "${YELLOW}Backing up existing .git directory to .git.backup${NC}"
    mv .git .git.backup
fi

# Initialize git repository
echo -e "${BLUE}1. Initializing git repository...${NC}"
git init

# Configure git settings
echo -e "${BLUE}2. Configuring repository settings...${NC}"
git config core.autocrlf input
git config core.ignorecase false
git config pull.rebase false

# Add remote origin
echo -e "${BLUE}3. Adding remote origin...${NC}"
git remote add origin "$REMOTE_URL"

# Create initial commit
echo -e "${BLUE}4. Creating initial commit...${NC}"
git add .gitignore
git add .github/
git add package.json
git add README.md
# git add CLAUDE.md  # Skip if not present
git add workspace-config.json
git add wrangler.toml
git add tsconfig.json
git add bunfig.toml

# Add source files
git add src/
git add scripts/
git add docs/
git add workspaces/
git add bench/

# Add SQL schemas
git add *.sql

# Commit
git commit -m "Initial commit: Fire22 Dashboard Worker v3.0.9

- Multi-workspace orchestration system
- Cloudflare Workers deployment ready
- Bun-native performance optimization
- Pattern Weaver system integration
- 6 specialized workspaces for modular deployment
- Comprehensive CI/CD pipeline with GitHub Actions"

# Create main branch
echo -e "${BLUE}5. Creating main branch...${NC}"
git branch -M "$DEFAULT_BRANCH"

# Create develop branch
echo -e "${BLUE}6. Creating develop branch...${NC}"
git checkout -b "$DEVELOP_BRANCH"

# Create feature branches structure
echo -e "${BLUE}7. Setting up branch structure...${NC}"
git checkout "$DEFAULT_BRANCH"

# Display status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Repository initialization complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Repository Information:${NC}"
echo -e "  Directory: $REPO_DIR"
echo -e "  Remote URL: $REMOTE_URL"
echo -e "  Default Branch: $DEFAULT_BRANCH"
echo -e "  Development Branch: $DEVELOP_BRANCH"

echo -e "\n${BLUE}Current Status:${NC}"
git status --short

echo -e "\n${BLUE}Branches:${NC}"
git branch -a

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Review the committed files with: git log --oneline"
echo -e "2. Create GitHub repository at: https://github.com/brendadeeznuts1111/fire22-dashboard-worker"
echo -e "3. Push to remote with: git push -u origin $DEFAULT_BRANCH"
echo -e "4. Push develop branch: git checkout $DEVELOP_BRANCH && git push -u origin $DEVELOP_BRANCH"
echo -e "5. Configure GitHub repository settings:"
echo -e "   - Enable branch protection for main branch"
echo -e "   - Configure required status checks"
echo -e "   - Set up Cloudflare Workers deployment secrets"
echo -e "   - Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID secrets"

echo -e "\n${GREEN}Repository is ready for separation!${NC}"