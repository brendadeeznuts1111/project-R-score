---
title: Untitled
type: configuration
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-14
category: setup
description: Documentation for MCPorter Config
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
config_type: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
os: ""
referer: ""
referrer: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
---

# MCPorter Configuration

MCPorter setup for this vault.

## MCP Servers Configured

Based on `config/mcporter.json`:

### Obsidian
- Local REST API plugin required
- Port: 27124
- API Key: Set via environment variable

### Other Servers
- Context7
- Bun Docs (Local & Official)
- Bun DX (Workspace, Testing, Build, Database)
- Filesystem
- GitKraken
- Local Tools
- SigNoz
- shadcn

## Environment Variables

```bash
OBSIDIAN_API_KEY=your-key-here
OBSIDIAN_BASE_URL=https://127.0.0.1:27124
OBSIDIAN_VERIFY_SSL=false
OBSIDIAN_ENABLE_CACHE=true
```

## Usage

See main project `config/mcporter.json` for full configuration.

## Vault ID

**Vault ID**: `ee201515558d34f0`

Use this in URIs:
```text
obsidian://open?vault=ee201515558d34f0&file=Home
```
