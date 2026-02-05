---
title: Untitled
type: index
status: active
version: 1.0.0
created:
  "{ date }": null
updated: 2025-11-13
modified: 2025-11-14
category: core
description: Documentation for Template Index
asn: ""
author: Sports Analytics Team
canvas: []
city: ""
component_id: API/VALIDATION/JSON_SCHEMA_VALIDATOR/BUN_SERVICE_v1.0.0", [#META:SECTION=overview,OWNER_TEAM=sports-analytics-team,AUDIENCE=developers]
countryCode: ""
countryName: ""
deprecated: false
feed_integration: false
isGeoBlocked: false
isp: ""
latitude: ""
longitude: ""
regionCode: ""
regionName: ""
replaces: ""
tags:
  - templates
  - index
  - bun-platform
timezone: ""
usage: ""
VIZ-06: []
zipCode: ""
---

# 📑 Vault Templates Index

> **Purpose**: Templates to help you focus on problems, not formatting  
> *Research-first, problem-solving focused • Bun Platform CLI integration*

**Complete catalog of all available templates for research, development, architecture, and project management.**

## 🗺️ Navigation

> **Quick access to essential resources**

- **[[Home|🏠 Home]]** — Vault homepage
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete bun-platform workspace
- **[[Bun Platform CLI|📖 Bun Platform CLI]]** — CLI documentation
- **[[Vault Overview|📊 Vault Overview]]** — Vault dashboard

## 📁 Template Organization

Templates are organized by category for easy navigation:

```
06-Templates/
├── research/              # Research & learning templates
├── setup/                 # Setup & configuration templates
├── development/           # Development templates
├── problem-solving/       # Problem solving templates
├── project-management/    # Project management templates
└── Template Index.md      # This file
```

## 🔍 Research & Learning

> **Research-first templates for learning and discovery**

### [[research/Research Template]]
**When to use:** Researching Bun, MCP, Obsidian features before implementing
- Research-first workflow enforced
- Bun-Docs-Local integration
- MCP resources
- Findings tracking

**Quick start:** `/research "feature-name"` then use this template

**Location:** `research/Research Template.md`

## 🛠️ Setup & Configuration

> **Templates for setup, configuration, and vault organization**

### [[setup/Setup Template]]
**When to use:** Setting up new components, tools, or configurations
- Prerequisites checklist
- Step-by-step setup
- Verification steps
- Troubleshooting guide

**Location:** `setup/Setup Template.md`

### [[setup/Vault Setup Template]]
**When to use:** Organizing vault structure, folders, links
- Folder structure planning
- File organization
- Link updates
- Dataview queries

**Location:** `setup/Vault Setup Template.md`

## 💻 Development

> **Development templates with Bun Platform CLI integration**

### [[development/Development Template]]
**When to use:** Implementing new features (research-first!)
- **Requires research first** — enforces research workflow
- Implementation planning
- Problem tracking
- Progress checklist

**Location:** `development/Development Template.md`

### [[development/Bun MCP Integration Template]]
**When to use:** Integrating Bun scripts with MCP and Obsidian
- Bun + MCP setup
- Integration patterns
- Testing commands
- Troubleshooting

**Location:** `development/Bun MCP Integration Template.md`

### [[development/Architectural Refactoring Proposal]]
**When to use:** Proposing architectural refactorings via `bun-platform create-arch-note`
- Component splitting proposals
- Performance optimization refactorings
- Bun-first architecture decisions
- Links to `architecture.json` and component IDs

**Quick start:** `bun-platform create-arch-note --template=development/Architectural Refactoring Proposal.md`

**Location:** `development/Architectural Refactoring Proposal.md`

**Features:**
- Dynamic component IDs and references
- Performance metrics (LATENCY_P99, SLA)
- Architecture graph integration
- Bun-first principles alignment

### [[development/Architecture Note Template]]
**When to use:** Documenting architecture components and decisions
- Component documentation
- Architecture graph entries
- Bun-first principles
- Performance targets

**Location:** `development/Architecture Note Template.md`

## 🐛 Problem Solving

> **Templates for debugging, troubleshooting, and issue resolution**

### [[problem-solving/Problem Solving Template]]
**When to use:** Debugging, investigating issues, root cause analysis
- Problem statement
- Investigation process
- Root cause analysis
- Solution tracking
- **Focus on problems, not linting!**

**Location:** `problem-solving/Problem Solving Template.md`

### [[problem-solving/Bug Report]]
**When to use:** Reporting bugs, tracking issues
- Bug details
- Reproduction steps
- Expected vs actual

**Location:** `problem-solving/Bug Report.md`

## 📋 Project Management

### [[project-management/Project Note Template]]
**When to use:** Project planning, tracking progress
- Project overview
- Goals & objectives
- Tasks & milestones
- Feed integration

**Location:** `project-management/Project Note Template.md`

### [[project-management/Project Development Note]]
**When to use:** Development-focused project notes
- Technical details
- Implementation notes
- Code structure

**Location:** `project-management/Project Development Note.md`

### [[project-management/Daily Note Template]]
**When to use:** Daily notes, daily standups
- Daily planning
- Notes & updates

**Location:** `project-management/Daily Note Template.md`

### [[project-management/Daily Standup]]
**When to use:** Team standups, progress updates
- What did I do
- What will I do
- Blockers

**Location:** `project-management/Daily Standup.md`

### [[project-management/Meeting Note Template]]
**When to use:** Meeting notes, discussions
- Meeting details
- Action items
- Decisions

**Location:** `project-management/Meeting Note Template.md`

### [[project-management/Configuration Note]]
**When to use:** Configuration documentation
- Config details
- Settings
- Environment variables

**Location:** `project-management/Configuration Note.md`

## 🚀 Quick Reference

### Research-First Workflow
1. **Research** → Use `research/Research Template`
2. **Plan** → Use `development/Development Template` or `setup/Setup Template`
3. **Implement** → Track problems in `problem-solving/Problem Solving Template`
4. **Document** → Update templates with findings

### Common Commands
```bash
# Research
/research "feature-name"

# MCP Status
/mcp-status

# Bun Docs
/bun-docs

# Check Research
/check-research
```

## 📝 Template Usage Tips

1. **Always research first** - Use Research Template before Development
2. **Focus on problems** - Use Problem Solving Template, not formatting
3. **Track progress** - Use checkboxes and status fields
4. **Link related** - Connect related templates with `[[links]]`
5. **Use Dataview** - Templates include Dataview queries for tracking

## 🔗 Related Resources

- [[Vault File Inventory|Current vault structure]]
- Research workflow: `.docs/.mcp-research-workflow-enforced.md`
- Setup guides: `docs/OBSIDIAN-CONNECTION-SETUP.md`

## 📊 Template Categories Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Research | 1 | Research-first workflow |
| Setup | 2 | Configuration & vault setup |
| Development | 4 | Feature implementation + architecture |
| Problem Solving | 2 | Debugging & issues |
| Project Management | 6 | Planning & tracking |

## 🏗️ Bun Platform Integration

### Architecture Templates

The development category includes templates that integrate with `bun-platform` CLI:

**Architectural Refactoring Proposal**
- Created via: `bun-platform create-arch-note --template=development/Architectural Refactoring Proposal.md`
- Generates notes with dynamic component IDs
- Links to `architecture.json` for architecture graph updates
- Supports Bun-first refactoring proposals
- Includes Bun runtime version and performance metrics

**Usage Examples:**

```bash
# Basic usage - create proposal from suggestion JSON
bun-platform create-arch-note \
  --suggestion-id /tmp/suggestion.json \
  --template=development/Architectural Refactoring Proposal.md

# With auto-linking and custom vault path
bun-platform create-arch-note \
  --suggestion-id suggestion.json \
  --template=development/Architectural Refactoring Proposal.md \
  --auto-link \
  --vault-path="$HOME/Obsidian/Knowledge Vault/Documentation"

# From performance analysis pipeline
bun-platform analyze-latency --component API_GW_01 > /tmp/suggestion.json
bun-platform create-arch-note --suggestion-id /tmp/suggestion.json --auto-link
```

**Suggestion JSON Format:**

```json
{
  "source_component_ref": "API_GW_01",
  "current_latency": 120,
  "sla_latency": 50,
  "bottleneck_sub_component": "JSON validation",
  "proposed": {
    "id": "API/VALIDATION/JSON_SCHEMA_VALIDATOR/BUN_SERVICE_v1.0.0", [#META:SECTION=overview,OWNER_TEAM=sports-analytics-team,AUDIENCE=developers]
    "ref": "JSON_VALIDATOR_001",
    "ch": "'HEX(00FF00)'",
    "meta": "RUNTIME=BUN,LATENCY_SLA=10ms",
    "target_latency": 5
  }
}
```

**Features:**
- ✅ Bun-native JSON parsing (`Bun.file().json()`)
- ✅ Fast template rendering with context replacement
- ✅ File-based vault operations (no database)
- ✅ Dynamic action links (Update Architecture, Scaffold Service, Create PR, Performance Test)
- ✅ Automatic backlink generation
- ✅ Bun version and CLI version tracking
- ✅ Performance metrics formatting

**What Gets Created:**
- Note in Obsidian vault with all architectural details
- Component IDs as clickable links
- Performance metrics (current → target latency)
- Bun runtime information
- Dynamic action links (if `--auto-link` enabled)
- Backlinks to related components (if `--auto-link` enabled)

---
---

## 📋 Footer

> **Template index metadata and quick links**

**Status**: `= this.status`  
**Total Templates**: 15  
**Last Updated**: `= date(today)`

### 🔗 Quick Links
- **[[Home|🏠 Home]]** — Vault homepage
- **[[Bun Platform Workspace|🏗️ Bun Platform Workspace]]** — Complete bun-platform workspace
- **[[Bun Platform CLI|📖 Bun Platform CLI]]** — CLI documentation
- **[[Vault Overview|📊 Vault Overview]]** — Vault dashboard

### 💡 Tips
- Use **[[06-Templates/research/Research Template|Research Template]]** before starting development
- Use **[[06-Templates/development/Architectural Refactoring Proposal|Architectural Refactoring Proposal]]** with `bun-platform create-arch-note`
- Check template locations before using — paths are relative to `06-Templates/`

### 📊 Template Categories Summary

| Category | Count | Purpose |
|----------|-------|---------|
| Research | 1 | Research-first workflow |
| Setup | 2 | Configuration & vault setup |
| Development | 4 | Feature implementation + architecture |
| Problem Solving | 2 | Debugging & issues |
| Project Management | 6 | Planning & tracking |

*This index catalogs all available templates. Refresh to see latest updates.* 🔄
