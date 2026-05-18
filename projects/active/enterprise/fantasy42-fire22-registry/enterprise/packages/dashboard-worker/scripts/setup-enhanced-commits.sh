#!/bin/bash

echo "🔥 Setting up Fire22 Enhanced Commit Message System"
echo "=================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo "📂 Setting up git hooks..."

# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy commit-msg hook
cp scripts/git-hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg

echo "✅ Git commit-msg hook installed"

# Test the enhanced commit template script
echo ""
echo "🧪 Testing enhanced commit template..."

# Test basic functionality
echo ""
echo "📝 Example 1: Basic Finance Commit"
echo "Command: bun run scripts/enhanced-commit-template.js -d finance -t feat -m \"implement transaction monitoring dashboard\""
echo ""
bun run scripts/enhanced-commit-template.js -d finance -t feat -m "implement transaction monitoring dashboard"

echo ""
echo "📝 Example 2: With L-Keys and Contributors"
echo "Command: bun run scripts/enhanced-commit-template.js -d finance -t feat -m \"implement automated reconciliation system\" -l \"L-69,L-187,L-202\" -c \"Sarah Johnson,Mike Chen\""
echo ""
bun run scripts/enhanced-commit-template.js -d finance -t feat -m "implement automated reconciliation system" -l "L-69,L-187,L-202" -c "Sarah Johnson,Mike Chen"

echo ""
echo "📝 Example 3: Operations with Betting L-Keys"
echo "Command: bun run scripts/enhanced-commit-template.js -d operations -t feat -m \"enhance live betting system with new bet types\" -l \"L-12,L-15,L-16,L-85,L-1390\""
echo ""
bun run scripts/enhanced-commit-template.js -d operations -t feat -m "enhance live betting system with new bet types" -l "L-12,L-15,L-16,L-85,L-1390"

echo ""
echo "🎯 Setup Complete!"
echo ""
echo "📋 Quick Reference:"
echo "• Generate commit message: bun run scripts/enhanced-commit-template.js --help"
echo "• All commits will now be validated automatically"
echo "• Use conventional commit format: type(department): description"
echo "• Include department lead and contributors with Fire22 emails"
echo ""
echo "🔧 Department Examples:"
echo "• Finance: feat(finance): implement L-69 transaction tracking"
echo "• Support: fix(support): resolve ticket assignment bug"  
echo "• Compliance: docs(compliance): update SOC 2 audit procedures"
echo "• Operations: feat(operations): add L-1390 live betting support"
echo "• Technology: refactor(technology): optimize API response times"
echo "• Marketing: feat(marketing): launch campaign analytics dashboard"
echo "• Management: docs(management): update strategic planning docs"
echo "• Contributors: feat(contributors): add recognition system"
echo ""
echo "✅ Enhanced commit system ready for use!"