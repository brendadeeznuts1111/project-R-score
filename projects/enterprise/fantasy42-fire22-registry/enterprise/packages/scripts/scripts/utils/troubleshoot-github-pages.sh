#!/bin/bash

echo "🔍 GitHub Pages Troubleshooting Script"
echo "======================================"
echo ""

# Check if .nojekyll exists
echo "1. Checking for .nojekyll file:"
if [ -f "docs/.nojekyll" ]; then
    echo "✓ .nojekyll file found in docs/"
else
    echo "✗ .nojekyll file missing in docs/"
    echo "  Creating .nojekyll file..."
    touch docs/.nojekyll
    echo "  ✓ Created docs/.nojekyll"
fi
echo ""

# Check for index.html in docs
echo "2. Checking for index.html in docs/:"
if [ -f "docs/index.html" ]; then
    echo "✓ index.html found in docs/"
    echo "  File size: $(stat -f%z docs/index.html) bytes"
else
    echo "✗ index.html missing in docs/"
    if [ -f "index.html" ]; then
        echo "  Found index.html in root, copying to docs/..."
        cp index.html docs/
        echo "  ✓ Copied root index.html to docs/"
    else
        echo "  ✗ No index.html found anywhere"
    fi
fi
echo ""

# Check docs directory contents
echo "3. Contents of docs/ directory:"
ls -la docs/
echo ""

# Check GitHub Pages workflow
echo "4. GitHub Pages workflow status:"
if [ -f ".github/workflows/pages.yml" ]; then
    echo "✓ GitHub Pages workflow found"
    echo "  Workflow path: .github/workflows/pages.yml"
    echo "  Deployment source: docs/ directory"
else
    echo "✗ GitHub Pages workflow missing"
fi
echo ""

# Check if we're in a git repository
echo "5. Git repository status:"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "✓ Git repository detected"
    echo "  Current branch: $(git branch --show-current)"
    echo "  Remote origin: $(git remote get-url origin 2>/dev/null || echo 'Not set')"
    echo "  Last commit: $(git log -1 --oneline)"
else
    echo "✗ Not a git repository"
fi
echo ""

# Provide recommendations
echo "📋 Recommendations:"
echo "=================="
echo ""
echo "If you're still getting a 404 error:"
echo ""
echo "1. ✅ Wait 2-3 minutes after pushing changes for GitHub Pages to deploy"
echo ""
echo "2. 🔧 Check GitHub Pages settings:"
echo "   - Go to your repository on GitHub"
echo "   - Navigate to Settings → Pages"
echo "   - Ensure source is set to 'GitHub Actions'"
echo "   - Or set source to 'Deploy from a branch' → 'main' → 'docs/' folder"
echo ""
echo "3. 🔄 Trigger workflow manually:"
echo "   - Go to Actions tab on GitHub"
echo "   - Find 'Deploy GitHub Pages' workflow"
echo "   - Click 'Run workflow' if available"
echo ""
echo "4. 🌐 Check deployment URL:"
echo "   - Should be: https://[username].github.io/[repository-name]/"
echo "   - Make sure the repository name matches your URL"
echo ""
echo "5. 🐛 Debug workflow:"
echo "   - Check Actions tab for workflow runs"
echo "   - Look for any errors in the deployment logs"
echo "   - The workflow now includes deployment diagnostics"
echo ""

echo "✅ Troubleshooting script completed!"
echo "If issues persist, check the Actions tab on GitHub for workflow status."
