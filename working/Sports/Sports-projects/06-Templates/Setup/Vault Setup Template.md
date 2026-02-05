---
title: Vault Setup Template
type: vault-setup
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-13
modified: 2025-11-14
category: setup
description: Vault organization & structure planning
author: bun-platform
canvas:
  - "[[VIZ-06.canvas]]"
deprecated: false
replaces: ""
section: ""
tags:
  - vault
  - setup
  - template
  - setup
usage: Use when organizing vault structure, folders, links
VIZ-06: []
---
# Vault Setup: {{section}}

## 🎯 Setup Goal
**What part of the vault are we organizing or setting up?**


## 📁 Folder Structure

### Current Structure
```
Current/
├── folder1/
├── folder2/
└── file.md
```

### Target Structure
```
Target/
├── folder1/
│   ├── subfolder/
│   └── file.md
├── folder2/
└── index.md
```

## 📋 Setup Steps

### Step 1: Create Folders
- [ ] Create `folder1/`
- [ ] Create `folder2/`
- [ ] Create `subfolder/`

### Step 2: Move Files
- [ ] Move `file1.md` → `folder1/`
- [ ] Move `file2.md` → `folder2/`
- [ ] Update links

### Step 3: Create Index/Overview
- [ ] Create `index.md`
- [ ] Add Dataview queries
- [ ] Link related files

## 🔗 Link Updates Needed

### Files to Update
- [ ] `file1.md` - Update link to `file2.md`
- [ ] `file2.md` - Update link to `file1.md`
- [ ] `index.md` - Add links to all files

### Dataview Queries
```dataview
TABLE file.mtime as "Modified"
FROM "{{section}}"
SORT file.mtime DESC
```

## ✅ Verification

### Checklist
- [ ] All folders created
- [ ] Files moved correctly
- [ ] Links updated
- [ ] Dataview queries work
- [ ] No broken links

### Test Commands
```bash
# Check vault structure
npx mcporter call 'obsidian.obsidian_list_notes(dirPath: "{{section}}", recursionDepth: 2)'

# Verify links
# (Check in Obsidian UI)
```

## 📝 Notes
- Setup note 1
- Important detail 2

## 🔗 Related
- [[Vault File Inventory|Current vault inventory]]
- [[Setup Template|Related setup]]

---
**Status**: `= this.status` | **Created**: `= this.created` | **Last Updated**: `= date(now)`

