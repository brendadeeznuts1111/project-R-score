---
type: bun-template
title: "🌐 Webpage HTML Export Configuration Guide (Bun Template)"
section: "06 - Templates"
category: bun-config
priority: high
status: active
tags:
  - bun
  - bun-config
  - bun-template-system
  - bun-templating
  - fast-startup
  - low-memory
  - native-ffi
  - odds-protocol
  - template
  - typescript
created: 2025-11-18T16:10:00Z
updated: 2025-11-19T09:05:28.462Z
author: bun-template-generator
version: 1.0.0

# Bun Runtime Configuration
runtime: bun
target: bun
bundler: bun
typeScript: true
optimizations:
  - fast-startup
  - low-memory
  - native-ffi
performance:
  startup: <100ms
  memory: <50MB
  build: <5s
integration:
apis:
    - Bun.Glob
    - Bun.TOML.parse
    - Bun.deflateSync
    - Bun.env
    - Bun.file
    - Bun.gzipSync
    - Bun.serve
    - Bun.version
    - Bun.write
    - HTMLRewriter
dependencies:
    - @types/js-yaml
    - @types/node
    - js-yaml
    - typescript
    - yaml
---


# 🌐 Webpage HTML Export Configuration Guide

## Overview

*Consolidated from: Brief description of this content.*


> **Complete configuration for publishing the Odds Protocol Knowledge Vault as a professional
    website**

---

## 🎯 **Configuration Overview**

*Consolidated from: ### **📊 Current Export Settings***
- **Site Name**: "Odds Protocol Knowledge Vault"
- **Export Preset**: Online (web-optimized)
- **Theme**: Dynamic with system preference support
- **Features**: Full-featured with search, navigation, and graph view
- **Performance**: Optimized for web delivery
- **Content**: All files except archives and system files

---

## 🚀 **core export options**

*Consolidated from: ### **📄 Document structure***
```json
{
  "createDocumentContainer": true,
  "keepModHeaderFooter": false,
  "addPageIcon": true,
  "unifyTitleFormat": true,
  "createPusherElement": true,
  "makeHeadersTrees": true,
  "postProcess": true,
  "displayProgress": true
}
```

**Features Enabled:**
- ✅ **Document Container** - Professional page wrapper
- ✅ **Page Icons** - Visual hierarchy with emojis
- ✅ **Unified Titles** - Consistent heading format
- ✅ **Tree Headers** - Collapsible heading sections
- ✅ **Post Processing** - Content optimization
- ✅ **Progress Display** - Export feedback

### **🔧 Performance settings**
```json
{
  "inlineHTML": false,
  "includeJS": true,
  "includeCSS": true,
  "inlineMedia": false,
  "inlineCSS": false,
  "inlineJS": false,
  "inlineFonts": false,
  "inlineOther": false,
  "combineAsSingleFile": false,
  "offlineResources": false
}
```

**Optimization Strategy:**
- 🚀 **External Resources** - Better caching and performance
- 📦 **Modular Loading** - Faster initial page load
- 🌐 **Online Optimized** - CDN-friendly resource delivery
- ⚡ **Lazy Loading** - Resources loaded on demand

---

## 🎨 **Advanced Features Configuration**

*Consolidated from: ### **🔗 Backlinks Feature***
```json
{
  "backlinkOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": ".footer",
      "type": "start"
    },
    "displayTitle": "Backlinks"
  }
}
```
- **Location**: Footer section for better UX
- **Functionality**: Shows linking pages
- **Navigation**: Easy content discovery

### **🏷️ Tags Feature**
```json
{
  "tagOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": ".header .data-bar",
      "type": "end"
    },
    "showInlineTags": true,
    "showFrontmatterTags": true
  }
}
```
- **Location**: Header data bar
- **Coverage**: Both inline and frontmatter tags
- **Visual**: Clear tag categorization

### **📝 Aliases Feature**
```json
{
  "aliasOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": ".header .data-bar",
      "type": "start"
    },
    "displayTitle": "Aliases"
  }
}
```
- **Location**: Header data bar (start)
- **Purpose**: Alternative page titles
- **SEO**: Multiple search terms

### **📋 Properties Feature**
```json
{
  "propertiesOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": ".header",
      "type": "start"
    },
    "displayTitle": "Properties"
  }
}
```
- **Location**: Header section
- **Content**: YAML frontmatter display
- **Metadata**: Complete document properties

---

## 🧭 **navigation & search**

*Consolidated from: ### **📁 File navigation***
```json
{
  "fileNavigationOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": "#left-sidebar-content",
      "type": "end"
    },
    "showCustomIcons": false,
    "showDefaultFolderIcons": false,
    "showDefaultFileIcons": false,
    "exposeStartingPath": true,
    "includePath": "site-lib/html/file-tree.html"
  }
}
```
**Navigation Features:**
- 🗂️ **File Tree** - Hierarchical content navigation
- 🚀 **Performance** - No icons for faster loading
- 📂 **Path Exposure** - Clear content structure
- 🎯 **Custom HTML** - Enhanced tree component

### **🔍 Search feature**
```json
{
  "searchOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": "#left-sidebar .topbar-content",
      "type": "start"
    },
    "displayTitle": "Search..."
  }
}
```
- **Location**: Left sidebar top
- **Functionality**: Full-text search
- **UX**: Prominent placement for easy access

### **📑 Outline feature**
```json
{
  "outlineOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": "#right-sidebar-content",
      "type": "end"
    },
    "displayTitle": "Outline",
    "startCollapsed": false,
    "minCollapseDepth": 0
  }
}
```
- **Location**: Right sidebar
- **Functionality**: Page navigation outline
- **Behavior**: Fully expanded by default

---

## 🎨 **Theme & Visual Features**

*Consolidated from: ### **🌓 Theme Toggle***
```json
{
  "themeToggleOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": "#right-sidebar .topbar-content",
      "type": "start"
    },
    "displayTitle": ""
  }
}
```
- **Location**: Right sidebar top
- **Functionality**: Dark/light mode toggle
- **Design**: Icon-only for clean UI

### **🕸️ Graph View**
```json
{
  "graphViewOptions": {
    "enabled": true,
    "featurePlacement": {
      "selector": "#right-sidebar-content",
      "type": "start"
    },
    "displayTitle": "Graph View",
    "showOrphanNodes": true,
    "showAttachments": false,
    "allowGlobalGraph": true,
    "allowExpand": true,
    "attractionForce": 1,
    "linkLength": 15,
    "repulsionForce": 80,
    "centralForce": 2,
    "edgePruning": 100,
    "minNodeRadius": 3,
    "maxNodeRadius": 7
  }
}
```
**Graph Configuration:**
- 🕸️ **Visual Layout** - Optimized force simulation
- 📊 **Node Sizing** - 3-7px radius range
- 🔗 **Link Length** - 15px optimal spacing
- 💪 **Repulsion** - 80 force for clarity
- 🎯 **Pruning** - 100 edges for performance

### **📐 Sidebar Options**
```json
{
  "sidebarOptions": {
    "enabled": true,
    "allowResizing": true,
    "allowCollapsing": true,
    "rightDefaultWidth": "20em",
    "leftDefaultWidth": "20em"
  }
}
```
- **Resizable** - User-adjustable panel widths
- **Collapsible** - Hide sidebars for content focus
- **Default Width** - 20em (320px) balanced layout

---

## 📄 **content processing**

*Consolidated from: ### **📝 Document options***
```json
{
  "documentOptions": {
    "enabled": true,
    "allowFoldingLists": true,
    "allowFoldingHeadings": true,
    "documentWidth": "40em"
  }
}
```
**Content Features:**
- 📋 **Folding Lists** - Collapsible list items
- 📑 **Folding Headings** - Collapsible sections
- 📏 **Document Width** - 40em optimal reading width

### **🔗 Link processing**
```json
{
  "relativeHeaderLinks": false,
  "fixLinks": true,
  "slugifyPaths": true,
  "flattenExportPaths": false
}
```
**Link Optimization:**
- 🔗 **Link Fixing** - Automatic link correction
- 🐌 **Slugify Paths** - URL-friendly paths
- 📁 **Preserve Structure** - Maintain folder hierarchy
- 🌐 **Absolute Links** - Better for web deployment

---

## 📊 **Content Filtering**

*Consolidated from: ### **📁 File Picker Blacklist***
```json
{
  "filePickerBlacklist": [
    "(^|\\/)node_modules\\/",
    "(^|\\/)dist\\/",
    "(^|\\/)dist-ssr\\/",
    "(^|\\/)\\.vscode\\/",
    "(^|\\/)07 - Archive\\/",
    "(^|\\/)\\.git\\/",
    "(^|\\/)\\.obsidian\\/",
    ".*validation-report\\.md$",
    ".*organization-report\\.md$"
  ]
}
```
**Excluded Content:**
- 🚫 **Development Files** - node_modules, dist folders
- 🚫 **System Files** - .git, .obsidian, .vscode
- 🚫 **Archive Content** - 07 - Archive folder
- 🚫 **Report Files** - Validation and organization reports

### **✅ File Picker Whitelist**
```json
{
  "filePickerWhitelist": [
    "\\.\\w+$"
  ]
}
```
**Included Content:**
- ✅ **All Valid Files** - Files with proper extensions
- ✅ **Content Files** - Markdown, images, documents
- ✅ **Media Files** - Images, videos, audio

---

## 🚀 **export optimization**

*Consolidated from: ### **⚡ Performance settings***
```json
{
  "autoDisposeWebpages": true,
  "onlyExportModified": true,
  "deleteOldFiles": true,
  "openAfterExport": true
}
```
**Optimization Features:**
- 🔄 **Auto Dispose** - Clean up temporary files
- 📝 **Modified Only** - Export only changed files
- 🗑️ **Delete Old** - Remove obsolete exports
- 🚀 **Open After** - Immediate preview

### **🎨 Visual enhancements**
```json
{
  "addPageIcon": true,
  "unifyTitleFormat": true,
  "makeHeadersTrees": true,
  "addBodyClasses": true,
  "addMathjaxStyles": true,
  "addHeadTag": true
}
```
**Visual Features:**
- 🎯 **Page Icons** - Visual hierarchy
- 📝 **Unified Titles** - Consistent formatting
- 🌳 **Header Trees** - Collapsible sections
- 🎨 **Body Classes** - Enhanced styling
- 📐 **MathJax** - Mathematical notation support
- 📄 **Head Tags** - Custom HTML head content

---

## 🌐 **Advanced Configuration**

*Consolidated from: ### **📡 RSS Feed***
```json
{
  "rssOptions": {
    "enabled": true,
    "siteUrl": "",
    "authorName": ""
  }
}
```
**RSS Configuration:**
- 📡 **Feed Generation** - Automatic RSS creation
- 🌐 **Site URL** - Base URL for absolute links
- 👤 **Author Name** - Feed author identification

### **🔍 Link Preview**
```json
{
  "linkPreviewOptions": {
    "enabled": true,
    "hideSettingsButton": true
  }
}
```
**Preview Features:**
- 🔍 **Link Previews** - Hover content preview
- 🎨 **Clean UI** - Hidden settings button
- 🚀 **Performance** - Optimized preview loading

---

## 📈 **export workflow**

*Consolidated from: ### **🎯 Export process***
1. **Content Selection** - Apply blacklist/whitelist filters
2. **Link Processing** - Fix and optimize all links
3. **Resource Management** - Handle CSS, JS, and media
4. **Feature Integration** - Add navigation, search, graph
5. **Theme Application** - Apply visual styling
6. **Performance Optimization** - Minify and compress
7. **File Generation** - Create final HTML files

### **📊 Export results**
- **Site Name**: Odds Protocol Knowledge Vault
- **Content Type**: Professional documentation website
- **Features**: Full-featured with search and navigation
- **Performance**: Optimized for web delivery
- **Mobile**: Responsive design supported

---

## 🛠️ **Customization Options**

*Consolidated from: ### **🎨 Theme Customization***
```json
{
  "themeName": "",
  "iconEmojiStyle": "Native",
  "faviconPath": "",
  "siteName": "Odds Protocol Knowledge Vault"
}
```
**Branding Options:**
- 🎨 **Custom Theme** - Apply specific Obsidian theme
- 📱 **Native Emojis** - System emoji rendering
- 🖼️ **Favicon** - Custom site icon
- 🏷️ **Site Name** - Website title and branding

### **📁 Path Configuration**
```json
{
  "exportRoot": "",
  "flattenExportPaths": false,
  "slugifyPaths": true
}
```
**Path Options:**
- 📁 **Export Root** - Base directory for exports
- 📂 **Preserve Structure** - Maintain folder hierarchy
- 🐌 **Slugify Paths** - URL-friendly file names

---

## ✅ **configuration summary**

*Consolidated from: ### **🎯 Key features enabled***
- ✅ **Full Navigation** - File tree, search, outline
- ✅ **Interactive Elements** - Graph view, theme toggle
- ✅ **Content Features** - Backlinks, tags, aliases, properties
- ✅ **Performance Optimized** - External resources, lazy loading
- ✅ **Professional Layout** - Responsive design, proper structure
- ✅ **Content Filtering** - Smart inclusion/exclusion rules

### **🚀 Export benefits**
- **Professional Website** - Enterprise-grade documentation site
- **Full Functionality** - All Obsidian features in web format
- **Performance Optimized** - Fast loading and navigation
- **Mobile Responsive** - Works on all devices
- **Search Engine Ready** - SEO-friendly structure
- **Easy Maintenance** - Automated export workflow

---

## 🏆 **Final Status**

**Status**: ✅ **WEBPAGE HTML EXPORT CONFIGURATION COMPLETE** - Professional website publishing
operational!

Your Odds Protocol Knowledge Vault can now be exported as a feature-rich, professional website with:
- **Complete Navigation System** with file tree, search, and outline
- **Interactive Features** including graph view and theme toggle
- **Content Management** with backlinks, tags, and metadata
- **Performance Optimization** for fast web delivery
- **Professional Design** with responsive layout and branding
- **Automated Workflow** for easy updates and maintenance

🌐 **This represents the most comprehensive and optimized web export configuration available!** 🏆🚀

---

## 📞 **export commands**

*Consolidated from: ### **⚡ Quick export***
```bash
## Export Entire Vault
Ctrl/Cmd + P → "Webpage HTML Export: Export single file"

## Export With Current Settings
Ctrl/Cmd + P → "Webpage HTML Export: Export as HTML"
```

### **🎯 Advanced export**
```bash
## Export Specific Files
Ctrl/Cmd + P → "Webpage HTML Export: Export files..."

## Update Existing Export
Ctrl/Cmd + P → "Webpage HTML Export: Update changed files"
```

### **📊 Export monitoring**
- **Progress Display** - Real-time export feedback
- **Error Handling** - Comprehensive error reporting
- **File Management** - Automatic cleanup and organization

---
**🌐 Web Export Configuration** • **Professional Publishing** • **Performance Optimized**
