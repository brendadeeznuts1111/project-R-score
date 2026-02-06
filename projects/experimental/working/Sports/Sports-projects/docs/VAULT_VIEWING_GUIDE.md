---
title: "How to View v1.1 Files in Obsidian Vault"
type: "guide"
status: "active"
version: "1.1.0"
created: "2025-11-15"
tags: [guide, obsidian, vault, viewing]
component_ref: "[#REF:SUGGESTION_110]"
---

# 📖 How to View v1.1 Files in Obsidian Vault

**✅ YES - All v1.1 files ARE in your Obsidian vault and viewable!**

---

## 🎯 Quick Start

### In Obsidian App

1. **Open Obsidian**
2. **Navigate to `docs/` folder** in file explorer
3. **Open these files**:
   - `FORGE_SUGGESTION_V1.1_UNIFIED.md` - Complete specification
   - `FORGE_V1.1_QUICK_START.md` - Viewing guide
   - `FORGE_V1.1_INDEX.md` - Navigation index

### Search in Obsidian

- **Search for**: `v1.1` or `FORGE` or `unified`
- **Search for**: `[#REF:SUGGESTION_110]` to find component references
- **Use tags**: `#forge` or `#v1.1`

---

## 📁 File Locations in Vault

### Documentation Files

| File | Location | Purpose |
|------|----------|---------|
| **Unified Spec** | `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` | Complete v1.1 specification (707 lines) |
| **Quick Start** | `docs/FORGE_V1.1_QUICK_START.md` | How to view everything |
| **Index** | `docs/FORGE_V1.1_INDEX.md` | Navigation index |
| **This Guide** | `docs/VAULT_VIEWING_GUIDE.md` | How to view in vault |

### Dashboards (For Dataview)

| File | Location | Purpose |
|------|----------|---------|
| **Roadmap Queue** | `docs/dashboards/v1.1-roadmap-queue.md` | Live Dataview queries |
| **Roadmap Actions** | `docs/dashboards/extended-roadmap-actions.md` | Action tracker (465 lines) |

### Templates (For Templater)

| File | Location | Purpose |
|------|----------|---------|
| **Suggestion Template** | `docs/templates/unified-suggestion-template-v1.1.md` | Templater template |
| **Priority Script** | `docs/templates/unified-priority.js` | User script |

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| **Main Config** | `suggestion.json` (root) | Unified v1.1 configuration |
| **Bun Config** | `config/suggestion-engine-v1.1.bunfig.toml` | Bun-first runtime config |
| **Cloudflare Config** | `config/suggestion-engine-v1.1.wrangler.toml` | Workers deployment config |

---

## 🔍 How to View Each File Type

### 1. Markdown Documentation

**In Obsidian**:
- Navigate to `docs/` folder
- Click on any `.md` file
- Files will render with full markdown formatting
- Links will work (internal links to other vault files)

**Files to view**:
- `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md`
- `docs/FORGE_V1.1_QUICK_START.md`
- `docs/FORGE_V1.1_INDEX.md`

### 2. Dashboards (Dataview)

**In Obsidian**:
- Navigate to `docs/dashboards/`
- Open `v1.1-roadmap-queue.md` or `extended-roadmap-actions.md`
- **Requires Dataview plugin** to see live queries
- If Dataview is not installed, you'll see the query code (still useful!)

**Files to view**:
- `docs/dashboards/v1.1-roadmap-queue.md`
- `docs/dashboards/extended-roadmap-actions.md`

### 3. Templates (Templater)

**In Obsidian**:
- Navigate to `docs/templates/`
- View `unified-suggestion-template-v1.1.md` to see template structure
- **To use**: Copy to `Templates/Forge-Suggestions/` folder
- Then use Templater plugin to create notes from template

**Files to view**:
- `docs/templates/unified-suggestion-template-v1.1.md`
- `docs/templates/unified-priority.js`

### 4. Configuration Files

**In Obsidian**:
- JSON files (`.json`) will show as formatted JSON
- TOML files (`.toml`) will show as text
- You can view them, but editing is better done in a code editor

**Files to view**:
- `suggestion.json` (root)
- `config/suggestion-engine-v1.1.bunfig.toml`
- `config/suggestion-engine-v1.1.wrangler.toml`

---

## 🎨 Visual Navigation

### File Tree in Obsidian

```text
📁 feed (vault root)
├── 📄 suggestion.json                    ← Main config
├── 📁 config/
│   ├── suggestion-engine-v1.1.bunfig.toml
│   └── suggestion-engine-v1.1.wrangler.toml
└── 📁 docs/
    ├── FORGE_SUGGESTION_V1.1_UNIFIED.md  ← Full spec
    ├── FORGE_V1.1_QUICK_START.md         ← Viewing guide
    ├── FORGE_V1.1_INDEX.md               ← Navigation
    ├── VAULT_VIEWING_GUIDE.md            ← This guide
    ├── 📁 dashboards/
    │   ├── v1.1-roadmap-queue.md
    │   └── extended-roadmap-actions.md
    └── 📁 templates/
        ├── unified-suggestion-template-v1.1.md
        └── unified-priority.js
```

---

## 🔗 Quick Links

### Start Here

1. **[FORGE_V1.1_QUICK_START.md](./FORGE_V1.1_QUICK_START.md)** - Complete viewing guide
2. **[FORGE_SUGGESTION_V1.1_UNIFIED.md](./FORGE_SUGGESTION_V1.1_UNIFIED.md)** - Full specification
3. **[FORGE_V1.1_INDEX.md](./FORGE_V1.1_INDEX.md)** - Navigation index

### Dashboards

- **[v1.1-roadmap-queue.md](./dashboards/v1.1-roadmap-queue.md)** - Roadmap queue (Dataview)
- **[extended-roadmap-actions.md](./dashboards/extended-roadmap-actions.md)** - Action tracker

### Configuration

- **[suggestion.json](../../suggestion.json)** - Main config (root)
- **[suggestion-engine-v1.1.bunfig.toml](../config/suggestion-engine-v1.1.bunfig.toml)** - Bun config
- **[suggestion-engine-v1.1.wrangler.toml](../config/suggestion-engine-v1.1.wrangler.toml)** - Cloudflare config

---

## ✅ Verification Checklist

- [ ] Open Obsidian app
- [ ] Navigate to `docs/` folder
- [ ] See `FORGE_SUGGESTION_V1.1_UNIFIED.md` file
- [ ] See `FORGE_V1.1_QUICK_START.md` file
- [ ] See `FORGE_V1.1_INDEX.md` file
- [ ] Navigate to `docs/dashboards/` folder
- [ ] See `v1.1-roadmap-queue.md` file
- [ ] See `extended-roadmap-actions.md` file
- [ ] Navigate to root folder
- [ ] See `suggestion.json` file
- [ ] Navigate to `config/` folder
- [ ] See `suggestion-engine-v1.1.bunfig.toml` file
- [ ] See `suggestion-engine-v1.1.wrangler.toml` file

---

## 🚀 Next Steps

1. **Read the Quick Start**: Open `FORGE_V1.1_QUICK_START.md`
2. **Explore the Spec**: Open `FORGE_SUGGESTION_V1.1_UNIFIED.md`
3. **Check Actions**: Open `extended-roadmap-actions.md`
4. **View Config**: Open `suggestion.json` (formatted JSON in Obsidian)

---

**All files are in your vault and ready to view! Just open Obsidian and navigate to the `docs/` folder.** 🎉📊

