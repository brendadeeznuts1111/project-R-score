---
title: Untitled
type: tool
status: active
version: 0.1.0
created: 2025-11-13
updated: 2025-11-13
modified: 2025-11-14
category: core
description: Documentation for Bun Platform CLI
acceptEncoding: ""
acceptLanguage: ""
author: Sports Analytics Team
browser: ""
cacheControl: ""
canvas: []
component_id: API/GATEWAY/PROXY_SERVICE/NODE_SERVICE_v1.2.0", [#META:SECTION=overview,OWNER_TEAM=sports-analytics-team,AUDIENCE=developers]
connectionType: ""
cookies: {}
cookiesRaw: ""
deprecated: false
dns: ""
e_tag: ""
etag: ""
feed_integration: false
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
tags:
  - bun-platform
  - cli
  - architecture
  - obsidian
  - bun-first
  - documentation
usage: ""
user_agent: ""
userAgentRaw: ""
VIZ-06: []
xff: []
xForwardedFor: []
---

# 🏗️ Bun Platform CLI

> **Architectural governance and Obsidian integration CLI**  
> *Bridges technical architecture decisions with knowledge management workflows*

**Complete documentation for Bun Platform CLI — Create architectural refactoring proposals directly in your Obsidian vault with Bun-native optimizations.**

## 🎯 Overview

Bun Platform CLI is a specialized tool that creates architectural refactoring proposals directly in your Obsidian vault. It leverages Bun's native optimizations for fast JSON parsing, template rendering, and vault operations.

**Package Location**: `packages/bun-platform/`

## ✨ Key Features

- ✅ **Bun-native JSON parsing** — Uses `Bun.file().json()` for ultra-fast parsing
- ✅ **Template rendering** — Bun-optimized with nested property access
- ✅ **File-based vault operations** — Leverages Bun's fast filesystem APIs
- ✅ **Dynamic link generation** — Creates clickable action links in notes
- ✅ **Bun version tracking** — Automatically includes runtime and CLI version info
- ✅ **Performance metrics** — Tracks latency improvements and SLA targets

## 🚀 Quick Start

### Installation

```bash
cd packages/bun-platform
bun install
chmod +x src/index.ts
```

### Basic Usage

```bash
# Create architectural refactoring proposal
bun-platform create-arch-note \
  --suggestion-id /tmp/suggestion.json \
  --template=development/Architectural Refactoring Proposal.md

# With auto-linking
bun-platform create-arch-note \
  --suggestion-id suggestion.json \
  --template=development/Architectural Refactoring Proposal.md \
  --auto-link \
  --vault-path="$HOME/Obsidian/Knowledge Vault/Documentation"
```

## 📋 Commands

### `create-arch-note`

Create an architectural refactoring proposal in your Obsidian vault.

**Options:**
- `--suggestion-id <path>` (required) - Path to suggestion JSON file
- `--template <name>` - Template name (default: `development/Architectural Refactoring Proposal.md`)
- `--vault-path <path>` - Obsidian vault path (default: auto-detected)
- `--auto-link` - Generate dynamic links and backlinks

## 📝 Template Syntax

The template renderer supports nested property access following [Bun's `bun pm pkg` conventions](https://bun.com/docs/pm/cli/pm#pkg):

| Syntax | Example | Description |
|--------|---------|-------------|
| Simple key | `{{ KEY }}` | Direct property access |
| Dot notation | `{{ scripts.build }}` | Nested object property |
| Array bracket | `{{ contributors[0] }}` | Array element by index |
| Dot numeric | `{{ workspaces.0 }}` | Array element (alternative) |
| Bracket special | `{{ scripts[test:watch] }}` | Keys with special characters |
| Nested dot | `{{ proposed.id }}` | Deep object nesting |

**Examples:**

```markdown
# Access nested proposal data
Proposed ID: {{ proposed.id }}
Reference: {{ proposed.ref }}
Metadata: {{ proposed.meta }}

# Access array elements
First Contributor: {{ contributors[0] }}
Second Workspace: {{ workspaces.1 }}

# Access with special characters
Watch Script: {{ scripts[test:watch] }}
```

## 📦 Suggestion JSON Format

The suggestion JSON can use either flat or nested structure:

**Nested Structure (Recommended):**
```json
{
  "source_component_ref": "API_GW_01",
  "source_component_id": "API/GATEWAY/PROXY_SERVICE/NODE_SERVICE_v1.2.0", [#META:SECTION=overview,OWNER_TEAM=sports-analytics-team,AUDIENCE=developers]
  "current_latency": 120,
  "sla_latency": 50,
  "bottleneck_sub_component": "JSON validation",
  "proposed": {
    "id": "API/VALIDATION/JSON_SCHEMA_VALIDATOR/BUN_SERVICE_v1.0.0",
    "ref": "JSON_VALIDATOR_001",
    "ch": "'HEX(00FF00)'",
    "meta": "RUNTIME=BUN,LATENCY_SLA=10ms",
    "target_latency": 5,
    "estimated_impact": "87% reduction in gateway latency"
  }
}
```

**Flat Structure (Also Supported):**
```json
{
  "SOURCE_REF": "API_GW_01",
  "PROPOSED_ID": "API/VALIDATION/JSON_SCHEMA_VALIDATOR/BUN_SERVICE_v1.0.0",
  "NEW_REF": "JSON_VALIDATOR_001",
  "CURRENT_LATENCY": 120,
  "SLA_LATENCY": 50
}
```

## 🔗 Integration

### Templates

- **Template Location**: `06-Templates/development/Architectural Refactoring Proposal.md`
- **Template Index**: See [[06-Templates/Template Index|Template Index]]

### Related Components

- **CLI Package**: `packages/bun-platform/`
- **Template Renderer**: `packages/bun-platform/src/utils/template-renderer.ts`
- **Vault Manager**: `packages/bun-platform/src/utils/obsidian-vault.ts`
- **Command Handler**: `packages/bun-platform/src/commands/create-arch-note.ts`

## 📊 Architecture

```
packages/bun-platform/
├── src/
│   ├── index.ts                    # Main CLI entry point
│   ├── commands/
│   │   └── create-arch-note.ts    # Create arch note command
│   └── utils/
│       ├── obsidian-vault.ts      # File-based vault operations
│       └── template-renderer.ts   # Template rendering
├── package.json
└── README.md
```

## 🎯 Use Cases

1. **Performance-Driven Refactoring**
   - Analyze latency bottlenecks
   - Generate refactoring proposals
   - Track performance improvements

2. **Architecture Documentation**
   - Document component decisions
   - Link to architecture graph
   - Track component relationships

3. **Knowledge Management**
   - Bridge code and documentation
   - Create searchable architecture notes
   - Generate actionable proposals

## 🔧 Environment Variables

- `OBSIDIAN_VAULT_PATH` - Default Obsidian vault path
- `PLATFORM_ID` - Platform identifier for architecture tracking
- `PLATFORM_NAME` - Alternative platform identifier

## 📚 Documentation

- **Package README**: `packages/bun-platform/README.md`
- **Template Documentation**: See [[06-Templates/Template Index|Template Index]]
- **Bun PM Pkg Reference**: https://bun.com/docs/pm/cli/pm#pkg

## 🧪 Testing

```bash
# Run template renderer tests
bun packages/bun-platform/src/utils/template-renderer.test.ts
```

All tests passing ✅ (9/9)

## 🚀 Examples

### From Performance Analysis

```bash
# Generate suggestion from performance data
bun-platform analyze-latency --component API_GW_01 > /tmp/suggestion.json

# Create proposal
bun-platform create-arch-note \
  --suggestion-id /tmp/suggestion.json \
  --auto-link
```

### Custom Vault Path

```bash
bun-platform create-arch-note \
  --suggestion-id suggestion.json \
  --vault-path="/Users/me/Documents/MyVault/Architecture"
```

## 📁 File Structure

### Source Files

```
packages/bun-platform/
├── src/
│   ├── index.ts                          # CLI entry point
│   ├── commands/
│   │   └── create-arch-note.ts          # Main command
│   └── utils/
│       ├── template-renderer.ts         # Template rendering
│       ├── template-renderer.test.ts    # Tests
│       └── obsidian-vault.ts           # Vault operations
├── package.json
└── README.md
```

### Templates

```
06-Templates/
└── development/
    ├── Architectural Refactoring Proposal.md  # Enhanced template
    └── Architecture Note Template.md          # General architecture notes
```

## 🗺️ Navigation

> **Quick access to related resources**

### 🚀 Start Here
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete workspace view (RECOMMENDED STARTING POINT)
- **[[Home|🏠 Home]]** — Vault homepage with bun-platform section
- **[[Vault Overview|📊 Vault Overview]]** — Vault dashboard with bun-platform section

### 📚 Documentation
- **This Note** — Complete bun-platform documentation
- **[[packages/bun-platform/README|📘 Package README]]** — Technical documentation
- **[[Vault File Inventory|📊 Vault Inventory]]** — See bun-platform in inventory

### 🎨 Templates
- **[[06-Templates/development/Architectural Refactoring Proposal|🚀 Architectural Refactoring Proposal]]** — Main template for refactoring proposals
- **[[06-Templates/development/Architecture Note Template|📝 Architecture Note Template]]** — General architecture notes
- **[[Template Index|📑 Template Index]]** — All templates with bun-platform usage

### 🔗 Related Workspaces
- **[[Projects Dashboard|🎯 Projects Dashboard]]** — All projects
- **[[Configuration Dashboard|⚙️ Configuration Dashboard]]** — Config files
- **[[Tasks Dashboard|✅ Tasks Dashboard]]** — Task tracking

## 📊 Quick Reference

### Command Help

```bash
bun-platform --help
bun-platform create-arch-note --help
```

### Template Variables

- `{{ CURRENT_DATE }}` — Current date (YYYY-MM-DD)
- `{{ CLI_VERSION }}` — Bun Platform CLI version
- `{{ BUN_VERSION }}` — Bun runtime version
- `{{ GENERATED_AT }}` — ISO timestamp
- `{{ proposed.id }}` — Nested property access
- `{{ contributors[0] }}` — Array access
- `{{ scripts[test:watch] }}` — Special characters

---

## 📋 Footer

> **Documentation metadata and quick links**

**Version**: `= this.version`  
**Status**: `= this.status`  
**Created**: `= this.created`  
**Last Updated**: `= date(today)`

### 🔗 Quick Links
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete workspace
- **[[Home|🏠 Home]]** — Vault homepage
- **[[Vault Overview|📊 Vault Overview]]** — Vault dashboard
- **[[Template Index|📑 Template Index]]** — All templates

### 💡 Tips
- Use `bun-platform --help` for command overview
- Check **[[Bun Platform Workspace|Bun Platform Workspace]]** for common tasks
- Templates support nested property access (see Template Syntax section)

*This documentation covers all aspects of Bun Platform CLI. Refresh to see latest updates.* 🔄

