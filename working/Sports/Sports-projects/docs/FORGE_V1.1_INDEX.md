---
title: "Forge v1.1 Index - All Files & How to View"
type: "index"
status: "active"
version: "1.1.0"
created: "2025-11-15"
tags: [index, forge, v1.1, navigation]
component_ref: "[#REF:SUGGESTION_110]"
---

# 📑 Forge v1.1 Index - All Files & How to View

**Quick navigation guide to all v1.1 unified spec files**

---

## 🎯 Start Here

1. **[FORGE_V1.1_QUICK_START.md](./FORGE_V1.1_QUICK_START.md)** - Complete viewing guide
2. **[FORGE_SUGGESTION_V1.1_UNIFIED.md](./FORGE_SUGGESTION_V1.1_UNIFIED.md)** - Full specification (707 lines)

---

## 📁 All v1.1 Files

### Core Configuration

| File | Location | Purpose | How to View |
|------|----------|---------|-------------|
| **Main Config** | `suggestion.json` | Unified v1.1 configuration | `cat suggestion.json \| jq '.forgeSuggestionUnified'` |
| **Bun Config** | `config/suggestion-engine-v1.1.bunfig.toml` | Bun-first runtime config | `cat config/suggestion-engine-v1.1.bunfig.toml` |
| **Cloudflare Config** | `config/suggestion-engine-v1.1.wrangler.toml` | Workers deployment config | `cat config/suggestion-engine-v1.1.wrangler.toml` |

### Documentation

| File | Location | Purpose | How to View |
|------|----------|---------|-------------|
| **Unified Spec** | `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` | Complete specification | Open in IDE or `cat docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` |
| **Quick Start** | `docs/FORGE_V1.1_QUICK_START.md` | Viewing guide | Open in IDE or `cat docs/FORGE_V1.1_QUICK_START.md` |
| **Index** | `docs/FORGE_V1.1_INDEX.md` | This file | Open in IDE |

### Templates (For Obsidian)

| File | Location | Purpose | How to View |
|------|----------|---------|-------------|
| **Suggestion Template** | `docs/templates/unified-suggestion-template-v1.1.md` | Templater template | Copy to Obsidian vault `Templates/Forge-Suggestions/` |
| **Priority Script** | `docs/templates/unified-priority.js` | User script | Copy to `.obsidian/plugins/templater-obsidian/scripts/` |

### Dashboards (For Obsidian Dataview)

| File | Location | Purpose | How to View |
|------|----------|---------|-------------|
| **Roadmap Queue** | `docs/dashboards/v1.1-roadmap-queue.md` | Live Dataview queries | Copy to Obsidian vault `Dashboards/` |
| **Roadmap Actions** | `docs/dashboards/extended-roadmap-actions.md` | Action tracker | Copy to Obsidian vault `Dashboards/` |

---

## 🔍 Quick View Commands

### View Configuration Summary

```bash
# Quick overview
cat suggestion.json | jq '{
  version: .forgeSuggestionUnified.version,
  specVersion: .forgeSuggestionUnified.specVersion,
  runtime: .forgeSuggestionUnified.architecture.runtime,
  deployment: .forgeSuggestionUnified.architecture.deployment,
  latency: .forgeSuggestionUnified.architecture.latencyTarget,
  throughput: .forgeSuggestionUnified.architecture.throughput
}'
```

### View All Actions

```bash
# All roadmap actions
cat suggestion.json | jq '.forgeSuggestionUnified.nextActions[] | {
  action,
  priority,
  dueDate,
  phase,
  owner
}'
```

### View Roadmap Phases

```bash
# All 6 phases
cat suggestion.json | jq '.forgeSuggestionUnified.roadmapPhases | to_entries[] | {
  phase: .key,
  duration: .value.duration,
  components: .value.components,
  successCriteria: .value.successCriteria
}'
```

### View Component References

```bash
# Find all REF tags
grep -r "\[#REF:" suggestion.json docs/ config/ | head -20
```

---

## 📊 In Your IDE (VS Code / Cursor)

### File Explorer Navigation

1. **Root Level**:
   - `suggestion.json` - Main configuration

2. **Config Folder** (`config/`):
   - `suggestion-engine-v1.1.bunfig.toml`
   - `suggestion-engine-v1.1.wrangler.toml`

3. **Docs Folder** (`docs/`):
   - `FORGE_SUGGESTION_V1.1_UNIFIED.md` - Full spec
   - `FORGE_V1.1_QUICK_START.md` - Viewing guide
   - `FORGE_V1.1_INDEX.md` - This index
   - `templates/` - Templater templates
   - `dashboards/` - Dataview dashboards

### Search Features

- **Search for**: `[#REF:SUGGESTION_110]` - Find all component references
- **Search for**: `v1.1` - Find all v1.1 related content
- **Search for**: `FORGE-V1.1` - Find semantic metadata tags
- **Search for**: `bun-first` - Find architecture references

---

## 🌐 In Obsidian Vault

### Step 1: Copy Files to Vault

```bash
# Set your vault path
VAULT_PATH="/path/to/your/vault"

# Copy templates
mkdir -p "$VAULT_PATH/Templates/Forge-Suggestions"
cp docs/templates/unified-suggestion-template-v1.1.md "$VAULT_PATH/Templates/Forge-Suggestions/"

# Copy user script (if Templater is installed)
mkdir -p "$VAULT_PATH/.obsidian/plugins/templater-obsidian/scripts"
cp docs/templates/unified-priority.js "$VAULT_PATH/.obsidian/plugins/templater-obsidian/scripts/"

# Copy dashboards
mkdir -p "$VAULT_PATH/Dashboards"
cp docs/dashboards/v1.1-roadmap-queue.md "$VAULT_PATH/Dashboards/"
cp docs/dashboards/extended-roadmap-actions.md "$VAULT_PATH/Dashboards/"
```

### Step 2: View in Obsidian

1. **Open Obsidian**
2. **Navigate to Dashboards folder**
3. **Open**:
   - `v1.1-roadmap-queue.md` - See live Dataview queries (requires Dataview plugin)
   - `extended-roadmap-actions.md` - View action tracker

4. **Use Templater**:
   - Create new note
   - Use template: `unified-suggestion-template-v1.1.md`
   - Template will prompt for type, phase, etc.

---

## 📱 Browser View

### GitHub/GitLab

If your repo is on GitHub/GitLab:
1. Navigate to repository
2. Go to `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md`
3. View rendered markdown

### Local Markdown Viewer

```bash
# View in default markdown viewer (macOS)
open docs/FORGE_SUGGESTION_V1.1_UNIFIED.md

# Or use a markdown viewer extension in your browser
```

---

## 🎨 Visual File Tree

```
feed/
├── suggestion.json                          ← Main config (887 lines)
├── config/
│   ├── suggestion-engine-v1.1.bunfig.toml  ← Bun config (103 lines)
│   └── suggestion-engine-v1.1.wrangler.toml ← Cloudflare config (121 lines)
└── docs/
    ├── FORGE_SUGGESTION_V1.1_UNIFIED.md    ← Full spec (707 lines)
    ├── FORGE_V1.1_QUICK_START.md           ← Viewing guide
    ├── FORGE_V1.1_INDEX.md                 ← This index
    ├── templates/
    │   ├── unified-suggestion-template-v1.1.md ← Templater template (71 lines)
    │   └── unified-priority.js                 ← User script (26 lines)
    └── dashboards/
        ├── v1.1-roadmap-queue.md           ← Queue dashboard (84 lines)
        └── extended-roadmap-actions.md      ← Actions tracker (465 lines)
```

---

## 🚀 Quick Access Links

### In Your IDE

- **Main Config**: `suggestion.json` (root)
- **Full Spec**: `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md`
- **Quick Start**: `docs/FORGE_V1.1_QUICK_START.md`
- **Action Tracker**: `docs/dashboards/extended-roadmap-actions.md`

### Key Sections in suggestion.json

- `.forgeSuggestionUnified.architecture` - Architecture details
- `.forgeSuggestionUnified.roadmapPhases` - All 6 phases
- `.forgeSuggestionUnified.nextActions` - All 9 actions
- `.forgeSuggestionUnified.performanceTargets` - Performance metrics
- `.forgeSuggestionUnified.complianceGovernance` - Governance framework

---

## ✅ Viewing Checklist

- [ ] Read `docs/FORGE_V1.1_QUICK_START.md` for complete guide
- [ ] View `suggestion.json` - Main configuration
- [ ] Read `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` - Full specification
- [ ] Check `docs/dashboards/extended-roadmap-actions.md` - Action tracker
- [ ] Review configuration files in `config/` folder
- [ ] Copy templates to Obsidian (if using Obsidian)
- [ ] Copy dashboards to Obsidian (if using Obsidian)
- [ ] Test activation command: `bun forge suggest activate`

---

## 🔗 Related Documentation

- **[ARCHITECTURE_INTELLIGENCE.md](./ARCHITECTURE_INTELLIGENCE.md)** `[#REF:ARCHITECTURE_INTELLIGENCE_100]` - Architecture system
- **[DASHBOARDS_ANALYSIS.md](../knowledge/Architecture/DASHBOARDS_ANALYSIS.md)** `[#REF:DASHBOARDS_ANALYSIS_110]` - Dashboard analysis
- **[COMPONENTS_ANALYSIS.md](../knowledge/Architecture/COMPONENTS_ANALYSIS.md)** `[#REF:COMPONENTS_ANALYSIS_100]` - Component analysis

---

**Everything is ready to view! Start with the Quick Start guide or open `suggestion.json` in your IDE.** 🚀📊

