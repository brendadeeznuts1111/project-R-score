---
title: Bun MCP Integration Template
type: integration
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-13
modified: 2025-11-14
category: development
description: Bun + MCP integration patterns and setup
author: bun-platform
canvas:
  - "[[VIZ-06.canvas]]"
component: ""
deprecated: false
feature: ""
feed_integration: false
replaces: ""
tags:
  - bun
  - mcp
  - integration
  - template
  - development
usage: Use when integrating Bun scripts with MCP and Obsidian
VIZ-06: []
---
# Bun + MCP Integration: {{component}}

## 🎯 Integration Goal
**What are we integrating and why?**


## 🔍 Research First
- [ ] Bun API researched: `/research "{{component}}"`
- [ ] MCP protocol reviewed
- [ ] Existing integrations checked
- [ ] Examples found

## 📋 Setup Checklist

### Bun Setup
- [ ] Bun version: `bun --version`
- [ ] Dependencies installed: `bun install`
- [ ] Scripts configured in `package.json`

### MCP Setup
- [ ] MCPorter configured: `config/mcporter.json`
- [ ] MCP servers running: `/mcp-status`
- [ ] Environment variables set

### Obsidian Setup
- [ ] Obsidian running
- [ ] Local REST API enabled
- [ ] API key configured: `OBSIDIAN_API_KEY`

## 💻 Implementation

### Bun Script Structure
```typescript
#!/usr/bin/env bun
/**
 * {{component}} - Bun + MCP Integration
 */

import { spawn } from 'bun';

// MCP call example
async function callMCP() {
  // Implementation
}
```

### MCP Configuration
```json
{
  "mcpServers": {
    "{{component}}": {
      // Config
    }
  }
}
```

### Integration Points
- **Bun → MCP:** How Bun calls MCP
- **MCP → Obsidian:** How MCP writes to vault
- **Obsidian → Bun:** How Obsidian data flows back

## 🧪 Testing

### Test Commands
```bash
# Test Bun script
bun run scripts/{{component}}.ts

# Test MCP connection
/mcp-status

# Test Obsidian connection
npx mcporter call 'obsidian.obsidian_list_notes(...)'
```

### Test Cases
- [ ] Test 1: ✅/❌
- [ ] Test 2: ✅/❌
- [ ] Test 3: ✅/❌

## 🐛 Troubleshooting

### Common Issues
**Issue: MCP server not responding**
- Check: `/mcp-status`
- Fix: `/mcp-restart {{server}}`

**Issue: Obsidian connection failed**
- Check: `OBSIDIAN_API_KEY` set
- Fix: Verify Local REST API enabled

**Issue: Bun script errors**
- Check: Bun version compatibility
- Fix: Update dependencies

## 📝 Notes
- Integration note 1
- Integration note 2

## 🔗 Related
- [[Research Template|Bun research]]
- [[Research Template|MCP research]]
- [[Setup Template|Obsidian setup]]

---
**Status**: `= this.status` | **Created**: `= this.created` | **Last Updated**: `= date(now)`

