#!/bin/bash
# PR Team Git Configuration with Color Coding
# Apply with: source pr-team-git-config.sh

# ============================================================================
# PR TEAM COLOR CODING - GIT CONFIGURATION
# ============================================================================

# Enable colorized output
git config --global color.ui true
git config --global color.branch auto
git config --global color.diff auto
git config --global color.status auto
git config --global color.grep auto
git config --global color.interactive auto
git config --global color.pager true

# ============================================================================
# BRANCH COLORS (Team Collaboration)
# ============================================================================
# Alice (Architect): Cyan - Current branch
git config --global color.branch.current "cyan bold"

# Local branches: Green (Dave - Operations)
git config --global color.branch.local "green"

# Remote branches: Yellow (Bob - Risk Analysis)
git config --global color.branch.remote "yellow"

# ============================================================================
# DIFF COLORS (PR Review)
# ============================================================================
# Metadata: Yellow (neutral)
git config --global color.diff.meta "yellow bold"

# Diff fragments: Magenta (Carol - Compliance)
git config --global color.diff.frag "magenta bold"

# Old/deleted code: Red (critical)
git config --global color.diff.old "red"

# New/added code: Green (reviewed/approved)
git config --global color.diff.new "green"

# Whitespace errors: Red reverse (blocking)
git config --global color.diff.whitespace "red reverse"

# ============================================================================
# STATUS COLORS (Workflow State)
# ============================================================================
# Header: Cyan (Alice - architecture)
git config --global color.status.header "cyan"

# Added files: Green (approved)
git config --global color.status.added "green"

# Modified files: Yellow (in review - Bob)
git config --global color.status.changed "yellow"

# Untracked files: Magenta (needs review - Carol)
git config --global color.status.untracked "magenta"

# Ignored files: Gray (neutral)
git config --global color.status.ignored "gray"

# Unmerged: Red (blocked)
git config --global color.status.unmerged "red"

# ============================================================================
# GREP COLORS (Risk Analysis - Bob)
# ============================================================================
# Line numbers: Yellow (analysis)
git config --global color.grep.linenumber "yellow"

# Match highlights: Red bold (critical findings)
git config --global color.grep.match "red bold"

# Filenames: Cyan (architectural context)
git config --global color.grep.filename "cyan"

# Separators: Magenta (compliance boundaries)
git config --global color.grep.separator "magenta"

# Function names: Green (operational)
git config --global color.grep.function "green"

# ============================================================================
# INTERACTIVE COLORS (PR Comments)
# ============================================================================
# Prompts: Yellow (attention needed)
git config --global color.interactive.prompt "yellow"

# Headers: Cyan (structured)
git config --global color.interactive.header "cyan"

# Help text: Green (guidance)
git config --global color.interactive.help "green"

# Errors: Red (blocking)
git config --global color.interactive.error "red"

# ============================================================================
# PR TEAM ALIASES (Workflow Optimization)
# ============================================================================
# PR status monitoring
git config --global alias.pr-status "!git for-each-ref --format='%(color:yellow)%(refname:short)%(color:reset) - %(color:red)%(objectname:short)%(color:reset) - %(contents:subject)%(color:reset)' refs/heads/"

# PR diff visualization
git config --global alias.pr-diff "!git diff --color=always HEAD~1"

# PR log with team colors
git config --global alias.pr-log "!git log --color=always --oneline --graph --all"

# ============================================================================
# COMMIT MESSAGE TEMPLATE
# ============================================================================
# Template: [TEAM] [PRIORITY] [TOPIC]: Description
# 
# Team Tags: [ALICE] [BOB] [CAROL] [DAVE]
# Priority: [CRITICAL] [HIGH] [MEDIUM] [LOW]  
# Topics: [ARCH] [RISK] [COMP] [OPS] [PERF]
# 
# Example: [ALICE] [HIGH] [ARCH]: Implement quantum encryption

cat > .gitmessage << 'GITMSG'
# ============================================================================
# PR TEAM COMMIT MESSAGE TEMPLATE
# ============================================================================
# Format: [TEAM] [PRIORITY] [TOPIC]: Description

# Team Tags: [ALICE] Architectural, [BOB] Security/Risk, [CAROL] Compliance, [DAVE] Operations
# Priority: [CRITICAL] Production impact, [HIGH] Significant, [MEDIUM] Standard, [LOW] Minor
# Topics: [ARCH] Architecture, [RISK] Security, [COMP] Compliance, [OPS] Operations, [PERF] Performance

# Example: [ALICE] [HIGH] [ARCH]: Implement quantum-resistant encryption layer

[team] [priority] [topic]: <subject>

<body>

<footer>

GITMSG

# Set commit template
git config --global commit.template .gitmessage

# ============================================================================
# INSTALLATION INSTRUCTIONS
# ============================================================================
echo "🍯 PR Team Color Coding Applied Successfully!"
echo "Colors now match surgical precision workflow:"
echo "  🔵 Alice (Architect):   Cyan - System design"
echo "  🟡 Bob (Risk):         Yellow - Security analysis"  
echo "  �� Carol (Compliance): Magenta - Regulatory review"
echo "  🟢 Dave (Operations):   Green - Deployment focus"
echo ""
echo "Available commands:"
echo "  git pr-status  - Show branch status with team colors"
echo "  git pr-diff    - PR diff with surgical precision highlighting"
echo "  git pr-log     - Log with team color coding"
