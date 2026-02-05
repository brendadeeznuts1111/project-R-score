---
title: "Forge v1.1 Quick Start Guide"
type: "documentation"
status: "active"
version: "1.1.0"
created: "2025-11-15"
tags: [guide, quick-start, forge, v1.1]
component_ref: "[#REF:SUGGESTION_110]"
---

# 🚀 Forge v1.1 Quick Start Guide

**How to View and Use All v1.1 Components**

---

## 📁 File Locations

### Core Configuration
- **Main Config**: `suggestion.json` (root directory)
- **Bun Config**: `config/suggestion-engine-v1.1.bunfig.toml`
- **Cloudflare Config**: `config/suggestion-engine-v1.1.wrangler.toml`

### Documentation
- **Unified Spec**: `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md`
- **Quick Start**: `docs/FORGE_V1.1_QUICK_START.md` (this file)

### Templates (For Obsidian)
- **Suggestion Template**: `docs/templates/unified-suggestion-template-v1.1.md`
- **Priority Script**: `docs/templates/unified-priority.js`

### Dashboards (For Obsidian Dataview)
- **Roadmap Queue**: `docs/dashboards/v1.1-roadmap-queue.md`
- **Roadmap Actions**: `docs/dashboards/extended-roadmap-actions.md`

---

## 🔍 How to View Everything

### 1. View Main Configuration

```bash
# View the unified v1.1 configuration
cat suggestion.json | jq '.forgeSuggestionUnified'

# View specific sections
cat suggestion.json | jq '.forgeSuggestionUnified.architecture'
cat suggestion.json | jq '.forgeSuggestionUnified.roadmapPhases'
cat suggestion.json | jq '.forgeSuggestionUnified.nextActions'
```

### 2. View Documentation

```bash
# View unified specification
cat docs/FORGE_SUGGESTION_V1.1_UNIFIED.md

# View in browser (if you have a markdown viewer)
open docs/FORGE_SUGGESTION_V1.1_UNIFIED.md
```

### 3. View Configuration Files

```bash
# View Bun configuration
cat config/suggestion-engine-v1.1.bunfig.toml

# View Cloudflare Workers configuration
cat config/suggestion-engine-v1.1.wrangler.toml
```

### 4. View Templates & Dashboards

```bash
# View Templater template
cat docs/templates/unified-suggestion-template-v1.1.md

# View Dataview dashboards
cat docs/dashboards/v1.1-roadmap-queue.md
cat docs/dashboards/extended-roadmap-actions.md
```

---

## 🖥️ In Your IDE/Editor

### VS Code / Cursor

1. **Open Files**:
   - `suggestion.json` - Main configuration
   - `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` - Full specification
   - `docs/dashboards/extended-roadmap-actions.md` - Action tracker

2. **Use File Explorer**:
   - Navigate to `docs/` folder
   - See all templates and dashboards
   - Navigate to `config/` for configuration files

3. **Search**:
   - Search for `[#REF:SUGGESTION_110]` to find all references
   - Search for `v1.1` to find all v1.1 components
   - Search for `FORGE-V1.1` to find semantic tags

---

## 📊 In Obsidian Vault

### Step 1: Copy Templates to Vault

```bash
# Copy Templater template to your Obsidian vault
cp docs/templates/unified-suggestion-template-v1.1.md /path/to/vault/Templates/Forge-Suggestions/

# Copy user script to Templater scripts folder
cp docs/templates/unified-priority.js /path/to/vault/.obsidian/plugins/templater-obsidian/scripts/
```

### Step 2: Copy Dashboards to Vault

```bash
# Copy dashboards to your Obsidian vault
cp docs/dashboards/v1.1-roadmap-queue.md /path/to/vault/Dashboards/
cp docs/dashboards/extended-roadmap-actions.md /path/to/vault/Dashboards/
```

### Step 3: View in Obsidian

1. **Open Obsidian**
2. **Navigate to Dashboards folder**
3. **Open**:
   - `v1.1-roadmap-queue.md` - See live Dataview queries
   - `extended-roadmap-actions.md` - Track all roadmap actions

4. **Use Templater**:
   - Create new note from template
   - Select `unified-suggestion-template-v1.1.md`
   - Template will prompt for type, phase, etc.

---

## 🌐 In Browser (Markdown Viewer)

### Option 1: GitHub/GitLab

If your repo is on GitHub/GitLab:
1. Navigate to `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md`
2. View rendered markdown with all formatting

### Option 2: Local Markdown Viewer

```bash
# Install a markdown viewer (if not installed)
# Then view:
open docs/FORGE_SUGGESTION_V1.1_UNIFIED.md
```

---

## 📋 Quick Reference Commands

### View Configuration Summary

```bash
# Quick summary of v1.1 config
cat suggestion.json | jq '{
  version: .forgeSuggestionUnified.version,
  specVersion: .forgeSuggestionUnified.specVersion,
  runtime: .forgeSuggestionUnified.architecture.runtime,
  deployment: .forgeSuggestionUnified.architecture.deployment,
  latency: .forgeSuggestionUnified.architecture.latencyTarget,
  throughput: .forgeSuggestionUnified.architecture.throughput,
  speedup: .forgeSuggestionUnified.architecture.automationSpeedup
}'
```

### View All Actions

```bash
# View all next actions
cat suggestion.json | jq '.forgeSuggestionUnified.nextActions[] | {action, priority, dueDate, phase}'
```

### View Roadmap Phases

```bash
# View all roadmap phases
cat suggestion.json | jq '.forgeSuggestionUnified.roadmapPhases | to_entries[] | {phase: .key, duration: .value.duration, components: .value.components}'
```

### View Component References

```bash
# View all REF tags
grep -r "\[#REF:" suggestion.json docs/ config/ | head -20
```

---

## 🎯 Interactive Viewing

### Using Bun REPL

```bash
# Start Bun REPL
bun

# Load and explore suggestion.json
const config = await Bun.file('suggestion.json').json()
console.log(config.forgeSuggestionUnified.version)
console.log(config.forgeSuggestionUnified.architecture)
console.log(config.forgeSuggestionUnified.nextActions)
```

### Using Node.js

```bash
# Quick exploration
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('suggestion.json')); console.log(JSON.stringify(data.forgeSuggestionUnified, null, 2))"
```

---

## 📱 Dashboard Views

### 1. Roadmap Queue Dashboard

**Location**: `docs/dashboards/v1.1-roadmap-queue.md`

**What it shows**:
- All suggestions by phase
- Confidence scores
- Priority levels
- Bias scores (ethical AI)
- ROI calculations

**How to view**:
- In Obsidian: Open file, Dataview will render queries automatically
- In IDE: View markdown source
- In browser: Render markdown

### 2. Extended Roadmap Actions

**Location**: `docs/dashboards/extended-roadmap-actions.md`

**What it shows**:
- All 9 roadmap actions
- Priority breakdown
- Phase assignments
- Owner tracking
- Due dates
- Dependencies
- Success criteria

**How to view**:
- In Obsidian: Open file, see formatted tables and checklists
- In IDE: View markdown with tables
- In browser: Rendered markdown

---

## 🔧 Configuration Files

### Bunfig Configuration

**Location**: `config/suggestion-engine-v1.1.bunfig.toml`

**What it contains**:
- Bun-first runtime settings
- Environment variables
- Forge suggestion engine config
- Cloudflare KV/Durable Objects settings

**How to view**:
```bash
cat config/suggestion-engine-v1.1.bunfig.toml
```

### Wrangler Configuration

**Location**: `config/suggestion-engine-v1.1.wrangler.toml`

**What it contains**:
- Cloudflare Workers settings
- KV namespace bindings
- Durable Object bindings
- Environment variables
- Cron triggers

**How to view**:
```bash
cat config/suggestion-engine-v1.1.wrangler.toml
```

---

## 🚀 Activation Command

To activate the v1.1 system:

```bash
bun forge suggest activate \
  --protocols "predictive-rm,auto-evolution,cross-intel,rt-execution" \
  --features "obsidian-amp,dataview-dash,templater-auto,ml-ensemble,gov-ethical" \
  --embeds "suggestion-notes,roadmap-phases,feedback-loops" \
  --vault-sync "forge-index,kv-durable" \
  --js-runtime "esmodule-forge,bun-polyfill" \
  --latency-target "<50ms" \
  --storage "snippet-kv,execution-cache" \
  --compliance "ethical-ai,multi-jurisdictional" \
  --analytics "impact-ml,backtest-phases" \
  --export "tp-template,obsidian-json-v1.1"
```

---

## 📚 Documentation Structure

```
docs/
├── FORGE_SUGGESTION_V1.1_UNIFIED.md     ← Complete specification
├── FORGE_V1.1_QUICK_START.md            ← This guide
├── templates/
│   ├── unified-suggestion-template-v1.1.md  ← Templater template
│   └── unified-priority.js                   ← User script
└── dashboards/
    ├── v1.1-roadmap-queue.md            ← Queue dashboard
    └── extended-roadmap-actions.md      ← Actions tracker
```

---

## 🎨 Visual Overview

### File Tree View

```bash
# See all v1.1 files
find . -name "*v1.1*" -o -name "*suggestion*" | grep -E "(\.md|\.json|\.toml|\.js)$" | sort
```

### Component Map

```
suggestion.json (Core Config)
├── Architecture → Bun-first, Cloudflare Workers
├── Protocols → Subprotocol negotiation, Signed feedback
├── Structure → Categories, Advanced Types, RT Execution
├── Obsidian → Amplification, Templates, Dashboards
├── Forge → API Endpoints, CLI Commands
├── ML → Ensemble, Feature Engineering, Continuous Learning
├── Monitoring → Real-time Metrics, Alerting
├── Risk → Framework, Mitigation Strategies
├── Roadmap → 6 Phases (1-6)
├── Performance → Targets, Volume, Quality
├── Compliance → Ethical AI, Regulatory
├── Deployment → Cloudflare, Obsidian, Bunfig
└── Semantic → Metadata Tags, Governance
```

---

## ✅ Quick Checklist

- [ ] View `suggestion.json` - Main configuration
- [ ] Read `docs/FORGE_SUGGESTION_V1.1_UNIFIED.md` - Full spec
- [ ] Check `docs/dashboards/extended-roadmap-actions.md` - Action tracker
- [ ] Review `config/suggestion-engine-v1.1.bunfig.toml` - Bun config
- [ ] Review `config/suggestion-engine-v1.1.wrangler.toml` - Cloudflare config
- [ ] Copy templates to Obsidian vault (if using Obsidian)
- [ ] Copy dashboards to Obsidian vault (if using Obsidian)
- [ ] Test activation command: `bun forge suggest activate`

---

## 🔗 Related Files

- **[suggestion.json](../../suggestion.json)** - Unified v1.1 configuration
- **[FORGE_SUGGESTION_V1.1_UNIFIED.md](./FORGE_SUGGESTION_V1.1_UNIFIED.md)** - Complete specification
- **[ARCHITECTURE_INTELLIGENCE.md](./ARCHITECTURE_INTELLIGENCE.md)** - Architecture system docs
- **[DASHBOARDS_ANALYSIS.md](../knowledge/Architecture/DASHBOARDS_ANALYSIS.md)** - Dashboard analysis

---

**Everything is ready to view and use! Start with `suggestion.json` and `FORGE_SUGGESTION_V1.1_UNIFIED.md` for the complete picture.** 🚀📊

