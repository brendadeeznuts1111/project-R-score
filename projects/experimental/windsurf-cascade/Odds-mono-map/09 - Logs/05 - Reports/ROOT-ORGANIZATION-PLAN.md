---
type: plan
title: "Root Directory Organization Plan"
section: "08 - Logs"
category: "organization"
priority: "high"
status: "draft"
tags: ["organization", "structure", "cleanup", "standards"]
created: "2025-11-19T00:40:00Z"
updated: "2025-11-19T00:40:00Z"
author: "vault-system"
---

# 🗂️ Root Directory Organization Plan

## 📋 Current Issues Analysis

### 🔍 Identified Problems

#### 1. **Duplicate Numbered Directories**
```text
04 - Canvas Maps/     (1 item)
04 - Development/     (4 items) 
04 - Documentation/   (20 items)
```
**Issue**: Multiple directories with same prefix "04 -"
**Impact**: Confusing navigation, breaks sorting logic

#### 2. **Misplaced Root-Level Files**
```text
CPU.88243552974.78500.cpuprofile (16KB)
CPU.88335528015.79164.cpuprofile (11KB)
TEMPLATE_MASTER_INDEX.md (0 bytes)
Untitled.base (2KB)
advanced-semantic-metadata.ts (24KB)
demo-hex-color-integration.ts (16KB)
enhanced-semantic-colors.ts (21KB)
hex-color-demo.ts (17KB)
integrate-odds-monomap.ts (17KB)
```
**Issue**: Development files scattered at root level
**Impact**: Cluttered workspace, violates vault standards

#### 3. **Inconsistent Directory Structure**
```text
logs/           (0 items) - Empty duplicate
08 - Logs/      (5 items) - Proper structured logs
```
**Issue**: Duplicate log directories
**Impact**: Confusion about log storage location

#### 4. **Missing Standard Directories**
Based on `.vault-config.json`, these are required but missing:
```text
00 - Dashboard/  (Should exist, file exists instead)
```

#### 5. **Configuration File Placement**
```text
.vault-config.json  (5KB)
.vault-status.json  (0.3KB)
.env               (0.5KB)
bunfig.toml        (1.5KB)
package.json       (4.8KB)
```
**Issue**: Config files mixed with content
**Impact**: Security risk, poor organization

## 🎯 Proposed Organization Structure

### **Phase 1: Core Structure Cleanup**

```text
Odds-mono-map/
├── 📁 00 - Dashboard/                    # NEW: Move from file to directory
│   ├── 📄 Dashboard.md                   # Move from 00 - Dashboard.md
│   ├── 📄 System-Overview.md
│   └── 📄 Quick-Actions.md
├── 📁 01 - Daily Notes/                  # ✅ EXISTS - Keep as is
├── 📁 02 - Architecture/                 # ✅ EXISTS - Keep as is
├── 📁 03 - Development/                  # ✅ EXISTS - Keep as is
├── 📁 04 - Documentation/                # ✅ EXISTS - Keep as is
│   ├── 📁 01 - Guides/                   # Reorganize subdirs
│   ├── 📁 02 - Technical/
│   ├── 📁 03 - API/
│   └── 📁 04 - Reference/
├── 📁 05 - Assets/                       # ✅ EXISTS - Keep as is
├── 📁 06 - Templates/                    # ✅ EXISTS - Keep as is
├── 📁 07 - Archive/                      # ✅ EXISTS - Keep as is
├── 📁 08 - Logs/                         # ✅ EXISTS - Enhanced with new system
│   ├── 📁 src/                           # ✅ NEW: Enhanced logging source
│   ├── 📁 01 - Validation/
│   ├── 📁 02 - Automation/
│   ├── 📁 03 - Errors/
│   └── 📁 04 - Performance/
├── 📁 09 - Testing/                      # ✅ EXISTS - Keep as is
├── 📁 10 - Benchmarking/                 # ✅ EXISTS - Keep as is
├── 📁 11 - Workshop/                     # ✅ EXISTS - Keep as is
├── 📁 12 - Development/                  # NEW: For scattered dev files
│   ├── 📁 scripts/                       # Move from root
│   ├── 📁 src/                           # Move from root
│   ├── 📁 demos/                         # Move from root
│   ├── 📁 profiles/                      # Move CPU profiles here
│   └── 📁 temp/                          # For temporary files
├── 📁 13 - Configuration/                # NEW: Centralized config
│   ├── 📄 .vault-config.json
│   ├── 📄 .vault-status.json
│   ├── 📄 package.json
│   ├── 📄 bunfig.toml
│   ├── 📄 .env.example
│   └── 📄 environment/
└── 📁 14 - System/                       # NEW: Obsidian & system files
    ├── 📁 .obsidian/
    ├── 📁 node_modules/
    └── 📄 .gitignore
```

### **Phase 2: File Migration Plan**

#### **Development Files to Move**
```bash
# Source: Root Level
# Target: 12 - Development/

advanced-semantic-metadata.ts     → 12 - Development/src/
demo-hex-color-integration.ts     → 12 - Development/demos/
enhanced-semantic-colors.ts       → 12 - Development/src/
hex-color-demo.ts                 → 12 - Development/demos/
integrate-odds-monomap.ts         → 12 - Development/src/

CPU.*.cpuprofile                  → 12 - Development/profiles/
TEMPLATE_MASTER_INDEX.md          → 06 - Templates/00 - Template Index.md
Untitled.base                     → 12 - Development/temp/
```

#### **Configuration Files to Move**
```bash
# Source: Root Level  
# Target: 13 - Configuration/

.vault-config.json                → 13 - Configuration/
.vault-status.json                → 13 - Configuration/
.env                              → 13 - Configuration/.env.example
bunfig.toml                       → 13 - Configuration/
package.json                      → 13 - Configuration/
```

#### **Directory Restructuring**
```bash
# Remove duplicate directories
logs/                             → DELETE (empty, use 08 - Logs/)

# Rename conflicting directories
04 - Canvas Maps/                  → 05 - Assets/Canvas Maps/
04 - Development/                  → MERGE with 03 - Development/
04 - Documentation/                → KEEP as primary 04 - Documentation/

# Convert file to directory
00 - Dashboard.md                  → 00 - Dashboard/Dashboard.md
```

## 🚀 Implementation Strategy

### **Step 1: Preparation**
1. 📋 Create backup of current structure
2. 🔧 Update `.vault-config.json` paths
3. 📝 Create migration scripts
4. ⚠️ Set up git ignore for temporary files

### **Step 2: Directory Creation**
1. 📁 Create new directory structure
2. 🔄 Set up proper permissions
3. 🔗 Create symbolic links for compatibility
4. 📋 Update plugin configurations

### **Step 3: File Migration**
1. 📦 Move development files to `12 - Development/`
2. ⚙️ Move configuration files to `13 - Configuration/`
3. 🗂️ Reorganize documentation subdirectories
4. 🧹 Clean up duplicate directories

### **Step 4: Validation & Testing**
1. ✅ Run vault validation scripts
2. 🔍 Test all plugin functionality
3. 📊 Verify dashboard metrics
4. 🚨 Check for broken links

### **Step 5: Automation Setup**
1. 🤖 Configure organization automation
2. 📈 Set up monitoring for new structure
3. 📋 Update validation rules
4. 🔄 Schedule regular cleanup

## 📊 Expected Benefits

### **Organization Improvements**
- ✅ **90% reduction** in root-level clutter
- ✅ **Clear separation** of content vs. development files
- ✅ **Consistent numbering** system (00-14)
- ✅ **Logical grouping** of related files

### **Maintenance Benefits**
- 🔧 **Easier configuration** management
- 📈 **Better monitoring** and analytics
- 🚀 **Improved automation** capabilities
- 🔍 **Enhanced searchability**

### **Standards Compliance**
- ✅ **100% compliance** with vault naming standards
- ✅ **Proper frontmatter** on all files
- ✅ **Consistent structure** across all sections
- ✅ **Automated validation** enforcement

## ⚠️ Risk Mitigation

### **Potential Issues**
1. 🔗 **Broken links** from file moves
2. 🔌 **Plugin configuration** updates needed
3. 📊 **Dashboard queries** requiring updates
4. 🤖 **Automation scripts** path changes

### **Mitigation Strategies**
1. 🔄 **Link validation** before/after migration
2. 📋 **Configuration backup** and rollback plan
3. 🧪 **Staged rollout** with testing at each step
4. 📝 **Documentation updates** for all changes

## 📋 Implementation Checklist

### **Pre-Migration**
- [ ] Create full backup
- [ ] Update `.vault-config.json`
- [ ] Prepare migration scripts
- [ ] Test automation compatibility

### **Migration Execution**
- [ ] Create new directory structure
- [ ] Move development files
- [ ] Move configuration files
- [ ] Restructure documentation
- [ ] Clean up duplicates

### **Post-Migration**
- [ ] Run validation suite
- [ ] Test all plugins
- [ ] Update dashboard queries
- [ ] Verify automation
- [ ] Update documentation

### **Monitoring**
- [ ] Set up structure monitoring
- [ ] Configure alerting for violations
- [ ] Schedule regular validation
- [ ] Document maintenance procedures

---

**Status**: Draft - Ready for review and implementation
**Priority**: High - Critical for vault maintainability
**Estimated Time**: 2-3 hours for complete migration
**Dependencies**: Enhanced logging system (completed)
