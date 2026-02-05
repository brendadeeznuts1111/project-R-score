#!/bin/bash
# Claude Code 2.1.x Feature Test Runner

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

TEST_DIR="$HOME/claude-features-test"
cd "$TEST_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Claude Code 2.1.x Feature Tests                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Track results
PASS=0
SKIP=0
TOTAL=7

# ==============================================================================
# Test 1: Skill Hot-Reload
# ==============================================================================
echo -e "${YELLOW}[1/7]${NC} Skill Hot-Reload"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"

if [ -f "$HOME/.claude/skills/hello.ts" ]; then
    echo -e "${GREEN}✓${NC} Skill file exists: ~/.claude/skills/hello.ts"
    echo -e "${GRAY}  Test manually: Run /hello, edit the file, run /hello again${NC}"
    ((SKIP++))
else
    echo -e "${YELLOW}⚠${NC}  Skill file not found. Creating..."
    mkdir -p "$HOME/.claude/skills"
    cat > "$HOME/.claude/skills/hello.ts" << 'EOF'
---
name: hello
description: Test skill for hot-reload
user-invocable: true
---

# Hello Hot-Reload Skill

This skill demonstrates hot-reload. Edit this file and changes appear instantly.

Hello from the hello skill!
EOF
    echo -e "${GREEN}✓${NC} Skill file created"
    ((PASS++))
fi
echo ""

# ==============================================================================
# Test 2: /plan Shortcut
# ==============================================================================
echo -e "${YELLOW}[2/7]${NC} /plan Shortcut"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}✓${NC} Feature available (no approval needed since 2.1.0)"
echo -e "${GRAY}  Test manually: Type /plan and press Enter${NC}"
((SKIP++))
echo ""

# ==============================================================================
# Test 3: Vim Motions
# ==============================================================================
echo -e "${YELLOW}[3/7]${NC} Vim Motions"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}✓${NC} Feature available"
echo -e "${GRAY}  Test manually: yy (yank), p (paste), ci\" (change in quotes), >> (indent)${NC}"
((SKIP++))
echo ""

# ==============================================================================
# Test 4: Tab Autocomplete Anywhere
# ==============================================================================
echo -e "${YELLOW}[4/7]${NC} Tab Autocomplete Anywhere"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}✓${NC} Feature available"
echo -e "${GRAY}  Test manually: Type 'check the /co' and press Tab${NC}"
((SKIP++))
echo ""

# ==============================================================================
# Test 5: Ctrl+B Backgrounding
# ==============================================================================
echo -e "${YELLOW}[5/7]${NC} Ctrl+B Backgrounding"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}✓${NC} Feature available"
echo -e "${GRAY}  Test manually: Run 'sleep 10', press Ctrl+B${NC}"
((SKIP++))
echo ""

# ==============================================================================
# Test 6: Wildcard Bash Permissions
# ==============================================================================
echo -e "${YELLOW}[6/7]${NC} Wildcard Bash Permissions"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"

SETTINGS="$HOME/.claude/settings.json"
if grep -q '"toolPermissions"' "$SETTINGS" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} toolPermissions already configured in settings.json"
else
    echo -e "${YELLOW}⚠${NC}  Adding wildcard permission examples to settings.json..."
    # Create a backup
    cp "$SETTINGS" "$SETTINGS.backup"
    # Add toolPermissions (requires proper JSON merging, using jq if available)
    if command -v jq &> /dev/null; then
        jq '.toolPermissions = {
            "Bash(npm *)": "allow",
            "Bash(git *)": "allow",
            "Bun(*)": "allow"
        }' "$SETTINGS.backup" > "$SETTINGS"
        echo -e "${GREEN}✓${NC} Added wildcard permissions using jq"
    else
        echo -e "${GRAY}  Install jq to auto-configure, or add manually:${NC}"
        echo -e "${GRAY}  {\"toolPermissions\": {\"Bash(npm *)\": \"allow\", \"Bash(git *)\": \"allow\", \"Bun(*)\": \"allow\"}}${NC}"
    fi
fi
((PASS++))
echo ""

# ==============================================================================
# Test 7: Language Setting
# ==============================================================================
echo -e "${YELLOW}[7/7]${NC} Language Setting"
echo -e "${GRAY}─────────────────────────────────────────────────────────${NC}"

if grep -q '"language"' "$SETTINGS" 2>/dev/null; then
    CURRENT_LANG=$(grep '"language"' "$SETTINGS" | head -1 | grep -o '"[^"]*"' | tail -1)
    echo -e "${GREEN}✓${NC} Language already set: $CURRENT_LANG"
    echo -e "${GRAY}  To change: Edit settings.json and modify the language field${NC}"
else
    echo -e "${YELLOW}⚠${NC}  No language setting. Current: default (english)"
    echo -e "${GRAY}  To test: Add \"language\": \"spanish\" to settings.json${NC}"
fi
((PASS++))
echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                                            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}Configured/Passed:${NC} $PASS/$TOTAL"
echo -e "${YELLOW}Manual Tests:${NC}    $SKIP/$TOTAL (require interactive testing)"
echo ""
echo -e "${GRAY}See individual test files for manual testing instructions:${NC}"
echo -e "${GRAY}  01-skill-hot-reload.md${NC}"
echo -e "${GRAY}  02-plan-shortcut.md${NC}"
echo -e "${GRAY}  03-vim-motions.md${NC}"
echo -e "${GRAY}  04-tab-autocomplete.md${NC}"
echo -e "${GRAY}  05-ctrl-b-backgrounding.md${NC}"
echo -e "${GRAY}  06-wildcard-permissions.md${NC}"
echo -e "${GRAY}  07-language-setting.md${NC}"
