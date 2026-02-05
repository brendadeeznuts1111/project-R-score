---
title: Environment Variables Reference
type: configuration
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: development
description: Key environment variables for developer environment
author: bun-platform
config_type: ""
deprecated: false
feature: ""
replaces: ""
tags:
  - environment
  - variables
  - configuration
  - developer
  - setup
usage: Reference for setting and checking environment variables
---

# Environment Variables Reference

Key environment variables for developer environment.

## Required Variables

| Variable | Description | Status |
|----------|-------------|--------|
| `OBSIDIAN_API_KEY` | Obsidian API key for vault access | ✅ Set |
| `BUN_DX_ROOT` | Bun DX root directory | ⚠️ Optional |
| `CURSOR_GITLENS_PATH` | GitLens path for Git operations | ⚠️ Optional |
| `CONTEXT7_API_KEY` | Context7 API key | ⚠️ Optional |

## Quick Check

```bash
# Check Obsidian API key
echo $OBSIDIAN_API_KEY | cut -c1-4

# Check Bun DX root
echo $BUN_DX_ROOT

# List all developer-related env vars
env | grep -E "(BUN|OBSIDIAN|CURSOR|CONTEXT7)" | sort
```

## Setting Variables

```bash
# Set in shell
export OBSIDIAN_API_KEY="your-key-here"

# Set in .env file (project root)
echo "OBSIDIAN_API_KEY=your-key-here" >> .env
```

---
**Last Updated**: 2025-01-XX

