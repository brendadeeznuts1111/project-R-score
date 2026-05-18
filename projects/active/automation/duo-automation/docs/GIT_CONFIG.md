# Git Configuration Guide

This document provides comprehensive git configuration improvements for the duo-automation project.

## Files Added/Updated

### 1. `.gitignore` - Enhanced Patterns
- **Organized sections** with clear categories
- **Security-focused** exclusions for sensitive files
- **Development environment** specific patterns
- **Build and dependency** exclusions
- **OS and editor** specific files
- **Large binary files** and test data exclusions

### 2. `.gitattributes` - File Handling
- **Line ending normalization** for cross-platform compatibility
- **Binary file detection** to prevent corruption
- **Text file handling** with proper encoding
- **Language-specific** configurations

### 3. `.gitignore_global` - Global Exclusions
- **System-wide** ignore patterns
- **OS-specific** files (macOS, Windows, Linux)
- **Editor-specific** files (VS Code, IntelliJ, etc.)
- **Common development** artifacts

### 4. `.gitconfig` - Git Configuration Template
- **User settings** template
- **Color configurations** for better visibility
- **Useful aliases** for common commands
- **Merge and diff** tool configurations
- **GPG signing** setup

### 5. `.gitmessage` - Commit Message Template
- **Conventional commits** format
- **Type categorization** (feat, fix, docs, etc.)
- **Description guidelines** with character limits
- **Footer format** for issue references

## Quick Setup

### Apply Global Git Configuration
```bash
# Copy git configuration
cp .gitconfig ~/.gitconfig

# Edit with your details
vim ~/.gitconfig

# Set global ignore file
git config --global core.excludesfile ~/.gitignore_global

# Set commit message template
git config --global commit.template ~/.gitmessage
```

### Apply Project-Specific Settings
```bash
# The project already includes:
# - .gitignore (enhanced)
# - .gitattributes (file handling)
# - .gitmessage (commit template)

# Set commit template for this project
git config commit.template .gitmessage
```

## Git Aliases (from .gitconfig)

| Alias | Command | Description |
|-------|---------|-------------|
| `git st` | `git status` | Quick status check |
| `git co` | `git checkout` | Switch branches |
| `git br` | `git branch` | List branches |
| `git ci` | `git commit` | Commit changes |
| `git ca` | `git commit -a` | Commit all changes |
| `git graph` | `git log --graph...` | Visual commit history |
| `git undo` | `git reset --soft HEAD^` | Undo last commit |
| `git amend` | `git commit --amend` | Amend last commit |
| `git please` | `git push --force-with-lease` | Safe force push |

## Security Best Practices

### Never Commit
- Private keys (`*.key`, `*.pem`, `*.p12`)
- Environment files (`.env*`, `secrets/`, `credentials/`)
- Large binary files (`*.bin`, `test-*.bin`)
- Generated reports and sensitive data

### Always Commit
- Source code with proper `.gitignore`
- Documentation and configuration templates
- Build scripts and package files
- Tests and examples

## Commit Message Format

Use the provided `.gitmessage` template:

```text
[TYPE] Brief description (50 chars or less)

More detailed explanation (wrap at 72 chars)
- What was changed and why
- Any breaking changes or migration notes
- References to issues or tickets

Type can be:
  feat: new feature
  fix: bug fix
  docs: documentation changes
  style: formatting, missing semi colons, etc
  refactor: code change that neither fixes a bug nor adds a feature
  test: adding missing tests
  chore: updating build tasks, package manager configs, etc

Footer (optional):
  Fixes #123
  Closes #456
  Co-authored-by: Name <email>
```

## Troubleshooting

### Large Files Already Committed
```bash
# Remove from git but keep locally
git rm --cached large-file.bin
git commit -m "fix: remove large binary file from tracking"

# Add to .gitignore
echo "large-file.bin" >> .gitignore
```

### Line Ending Issues
```bash
# Refresh line endings
git add --renormalize .
git commit -m "style: normalize line endings"
```

### Reset to Clean State
```bash
# Clean untracked files
git clean -fd

# Reset to last commit
git reset --hard HEAD
```

## Integration with Development Workflow

### VS Code Integration
- **GitLens** extension for enhanced git features
- **Git Graph** for visual commit history
- **GitHub Pull Requests** for PR management

### Pre-commit Hooks
The project uses pre-commit hooks for:
- Code formatting (Prettier)
- Linting (ESLint)
- Type checking (TypeScript)
- Security scanning

### Branch Protection
- Use `git please` (force-with-lease) for safe force pushes
- Always create feature branches for new work
- Use conventional commit messages for consistency