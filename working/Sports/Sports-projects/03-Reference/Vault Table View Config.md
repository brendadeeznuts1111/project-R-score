---
title: Vault Table View Configuration
type:
  - configuration
  - reference
status: active
version: 1.0.0
created: 2025-01-XX
updated: 2025-01-XX
modified: 2025-11-14
category: configuration
description: Base app table view configuration for vault file inventory display
asn: ""
author: bun-platform
city: ""
config_type: ""
countryCode: ""
countryName: ""
deprecated: false
isGeoBlocked: false
isp: ""
latitude: ""
longitude: ""
regionCode: ""
regionName: ""
replaces: ""
tags:
  - base-app
  - table-view
  - configuration
  - vault-inventory
timezone: ""
usage: Reference for understanding and customizing the vault file table view
zipCode: ""
---

# 📊 Vault Table View Configuration

> **Base app table view configuration**  
> *Complete vault file inventory display*

---

## 🎯 Overview

This configuration file (`Vault Table View Config.base`) defines how files are displayed in a Base app table view format. It provides a comprehensive view of all vault files with their relationships, metadata, and properties.

**File Location**: `03-Reference/Vault Table View Config.base`  
**Format**: Base app YAML configuration  
**Purpose**: Vault file inventory and relationship visualization

---

## 📋 Configuration Details

### View Structure

- **Type**: Table view
- **Name**: "Vault File Inventory"
- **Purpose**: Display all vault files with comprehensive metadata

### Column Order

The table displays files with these columns in order:

1. `file.name` - File name (220px width)
2. `file.ext` - File extension (50px width)
3. `file.folder` - Folder path (180px width)
4. `file.size` - File size in bytes (80px width)
5. `file.mtime` - Last modified time (140px width)
6. `file.ctime` - Creation time (140px width)
7. `file.inlinks` - Incoming links (backlinks) (80px width)
8. `file.outlinks` - Outgoing links (80px width)
9. `file.embeds` - Embedded files (80px width)
10. `tags` - File tags (120px width)
11. `status` - File status (80px width)
12. `type` - File type (100px width)
13. `date` - Date field (120px width)
14. `created` - Created date (140px width)

### Sort Order

Files are sorted by:
1. **Primary**: `file.mtime` (DESC) - Most recently modified first
2. **Secondary**: `file.folder` (ASC) - Alphabetical by folder
3. **Tertiary**: `file.name` (ASC) - Alphabetical by name

### Summaries

- **Total Files**: Count of all files (`length(rows)`)
- **By Type**: Grouped by file extension (`rows.file.ext`)
- **By Folder**: Grouped by folder path (`rows.file.folder`)

---

## 🔍 Use Cases

### 1. Vault Inventory
- Complete overview of all files
- File sizes and locations
- Creation and modification dates

### 2. Relationship Mapping
- Backlinks (inlinks) - which files link to each file
- Outgoing links (outlinks) - which files each file links to
- Embedded files - embedded content relationships

### 3. Metadata Analysis
- Tags across the vault
- Status tracking
- File types and categories
- Date tracking

### 4. Organization Insights
- Folder structure analysis
- File distribution
- Large file identification
- Recent activity tracking

---

## 💡 Integration with Obsidian

### Base App vs Obsidian

- **Base App**: Uses `.base` format for structured table views
- **Obsidian**: Can reference Base app configurations
- **Documentation**: This markdown file provides Obsidian-readable documentation

### Related Files

- **Configuration File**: `03-Reference/Vault Table View Config.base`
- **Documentation**: `03-Reference/Base App Table View Config.md` (legacy)
- **Inventory**: `03-Reference/Vault Complete Inventory.md` (generated from this config)

---

## 🛠️ Customization

### Adding Columns

To add new columns, edit the `order` section in the `.base` file:

```yaml
order:
  - file.name
  - new_field  # Add here
```

### Changing Sort Order

Modify the `sort` section:

```yaml
sort:
  - property: file.mtime
    direction: DESC
  - property: new_field  # Add custom sort
    direction: ASC
```

### Adjusting Column Widths

Update `columnSize` section:

```yaml
columnSize:
  file.name: 220
  new_field: 100  # Add custom width
```

---

## 📊 Example Output

When used with Base app, this configuration generates a table showing:

| File Name | Extension | Folder | Size | Modified | Created | Inlinks | Outlinks | Tags | Status | Type |
|-----------|-----------|--------|------|----------|---------|---------|----------|------|--------|------|
| Home.md | md | / | 1231 | 2025-01-XX | 2025-01-XX | 5 | 10 | [dashboard] | active | [dashboard] |
| Vault Overview.md | md | 02-Dashboards/ | 634 | 2025-01-XX | 2025-01-XX | 2 | 8 | [dashboard] | active | [dashboard] |

---

## 🔗 Related Documentation

- **[[Base App Table View Config|Base App Table View Config]]** — Legacy documentation
- **[[Vault Complete Inventory|Vault Complete Inventory]]** — Generated inventory from this config
- **[[../02-Dashboards/Vault Overview|Vault Overview]]** — Dashboard view of vault
- **[[../02-Dashboards/Dashboard Registry|Dashboard Registry]]** — Dashboard inventory

---

## 📝 Version History

- **v1.0.0** (2025-01-XX): Moved from `00-Inbox/` to `03-Reference/` for permanent storage
- **Initial**: Created as `Untitled.base` in `00-Inbox/`

---

**Last Updated**: 2025-01-XX  
**Configuration File**: `03-Reference/Vault Table View Config.base`

