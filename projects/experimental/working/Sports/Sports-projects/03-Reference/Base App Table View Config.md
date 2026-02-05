---
title: Untitled
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-14
category: reference
description: Documentation for Base App Table View Config
asn: ""
author: Sports Analytics Team
canvas: []
city: ""
config_type: ""
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
tags: []
timezone: ""
usage: ""
VIZ-06: []
zipCode: ""
---

# Base App Table View Configuration

> **Source**: `Untitled.base` (Base app file)  
> **Type**: Table view configuration  
> **Created**: 08:29:08 AM | 11-13-2025

## 📋 Configuration

This is a Base app table view configuration that defines how files are displayed in a table format.

```yaml
views:
  - type: table
    name: Table
    order:
      - file.name
      - file.path
      - file.backlinks
      - file.basename
      - file.embeds
      - file.links
      - type
      - tags
      - status
      - date
      - attendees
      - file.size
      - file.fullname
      - file.folder
      - file.ext

```

## 🔍 View Details

**View Type**: Table  
**Name**: Table

### Column Order

The table displays files with these columns in order:

1. `file.name` - File name
2. `file.backlinks` - Backlinks to the file
3. `file.basename` - Base name (without extension)
4. `file.embeds` - Embedded files
5. `file.links` - Links in the file
6. `file.path` - Full file path

## 💡 Usage

This configuration can be used to:
- View files in a structured table format
- Track file relationships (backlinks, embeds, links)
- Organize file information

## 📝 Notes

- Original file: `00-Inbox/Untitled.base` (renamed to `Vault Table View Config.base`)
- Current location: `03-Reference/Vault Table View Config.base`
- Base app format (YAML configuration)
- Preserved for reference

---

*This file was converted from Base app format for better Obsidian integration.*
