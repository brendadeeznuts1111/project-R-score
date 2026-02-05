---
title: Obsidian Git Plugin Configuration
type:
  - documentation
  - configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: development
description: Configuration guide for Obsidian Git plugin in the vault
author: developer
config_type: ""
deprecated: false
feature: ""
replaces: ""
tags:
  - git
  - obsidian
  - configuration
  - backup
  - version-control
usage: Reference for Git plugin settings and usage
---

# Obsidian Git Plugin Configuration

Configuration guide for the Obsidian Git plugin in this vault.

## Current Configuration

The Git plugin is configured at `.obsidian/plugins/obsidian-git/data.json`

### Key Settings

- **Auto Pull on Boot**: ✅ Enabled
- **Pull Before Push**: ✅ Enabled (prevents conflicts)
- **Status Bar**: ✅ Enabled (shows Git status)
- **Branch Status**: ✅ Enabled (shows current branch)
- **Changed Files in Status Bar**: ✅ Enabled
- **List Changed Files in Commit Message**: ✅ Enabled
- **Author in History View**: ✅ Show
- **Refresh Source Control**: Every 5 seconds

### Commit Messages

- **Format**: `vault backup: {{date}}`
- **Date Format**: `YYYY-MM-DD HH:mm:ss`
- Example: `vault backup: 2025-01-13 14:30:45`

## Manual Operations

### Commit Changes
1. Open Command Palette (`Cmd+P` / `Ctrl+P`)
2. Type "Git: Commit all changes"
3. Review changes and commit

### Push Changes
1. Open Command Palette
2. Type "Git: Push"
3. Changes will be pushed to remote

### Pull Changes
1. Open Command Palette
2. Type "Git: Pull"
3. Changes will be pulled from remote

### View History
1. Open Command Palette
2. Type "Git: View file history"
3. Select file to view history

## Auto-Backup (Optional)

To enable automatic backups:

1. Open Settings → Obsidian Git
2. Set **Auto Save Interval** (e.g., 300000ms = 5 minutes)
3. Set **Auto Push Interval** (e.g., 600000ms = 10 minutes)
4. Enable **Auto Backup After File Change** if desired

⚠️ **Note**: Auto-backup is currently disabled. Enable only if you want automatic commits.

## Remote Repository

- **Remote**: `git@github.com:brendadeeznuts1111/Sports-Projects-Vault-Gold.git`
- **Branch**: `master`
- **Status**: Configured and ready

## Troubleshooting

### Git Authentication Issues
- Ensure SSH keys are configured for GitHub
- Test: `ssh -T git@github.com`

### Merge Conflicts
- Plugin will show conflict markers
- Resolve conflicts manually
- Use "Git: Pull" after resolving

### Status Not Updating
- Check `.gitignore` excludes `.obsidian/` files
- Refresh source control manually
- Restart Obsidian if needed

## Related

- [[../README|04-Developer README]]
- [[environment-variables|Environment Variables]]
- [[../../docs/GOLDEN_FILE_STANDARD|Golden File Standard]]

