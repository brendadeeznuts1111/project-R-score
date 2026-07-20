<!-- Prefetch Optimizations -->
  <link rel="preconnect" href="https://bun.sh">
  <link rel="dns-prefetch" href="https://bun.sh">
  <link rel="preload" href="https://bun.sh/logo.svg" importance="high" crossorigin="anonymous">
  <link rel="preconnect" href="https://example.com">
  <link rel="dns-prefetch" href="https://example.com">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
  <link rel="preconnect" href="https://github.com">
  <link rel="dns-prefetch" href="https://github.com">
  <link rel="preconnect" href="https://developer.mozilla.org">
  <link rel="dns-prefetch" href="https://developer.mozilla.org">
<!-- End Prefetch Optimizations -->

# 🎨 Visual Documentation System - Tier-1380 Enhanced

## 📊 Overview

Complete visual documentation system for BUN constants versioning with **Tier-1380 enterprise compliance**. Features interactive dashboard, dynamic badges, and real-time metrics.

## ✅ Generated Components

### 🏷️ Tier-1380 Compliance Badges
- **version.svg** - Current version indicator
- **tier-1380.svg** - Certification status badge  
- **constants.svg** - Total constants count
- **schema.svg** - Schema version display
- **mcp.svg** - MCP bridge status
- **col-89.svg** - Column width compliance
- **audit.svg** - Audit level indicator
- **projects.svg** - Project count badge

### 🎯 Interactive Dashboard
- **Dark theme** optimized for enterprise environments
- **Real-time metrics** with visual charts
- **Responsive design** for mobile and desktop
- **Category distribution** with progress bars
- **Security classification** overview
- **Type distribution** analytics
- **Constants table** with color-coded indicators

## 🚀 Usage Commands

### Generate All Visual Documentation
```bash
bun run visual:docs
```

### Generate Badges Only
```bash
bun run visual:badges
```

### Launch Interactive Dashboard
```bash
bun run visual:dashboard
# Opens http://example.com
```

### Manual Badge Generation
```bash
bun scripts/generate-visual-docs.ts --badges-only
```

### Manual Dashboard with Server
```bash
bun scripts/generate-visual-docs.ts --serve
```

## 📁 File Structure

```text
docs/visual/
├── dashboard.html              # Interactive dashboard
├── badges/
│   ├── version.svg            # Version badge
│   ├── tier-1380.svg          # Tier-1380 certification
│   ├── constants.svg          # Constants count
│   ├── schema.svg             # Schema version
│   ├── mcp.svg                # MCP status
│   ├── col-89.svg             # Col-89 compliance
│   ├── audit.svg              # Audit level
│   ├── projects.svg           # Project count
│   └── README.md              # Badge usage guide
└── dashboard-badges/          # Dashboard-copied badges
    └── *.svg
```

## 🎨 Dashboard Features

### 📊 System Overview
- Version information and certification status
- Total constants and project counts
- Last updated timestamps

### 🔒 Tier-1380 Compliance
- Certification status with visual indicators
- Audit level display (enterprise)
- Col-89 compliance metrics
- Certified date tracking

### 🛠️ Technical Details
- Bun version compatibility
- Schema version tracking
- MCP bridge status
- Platform information

### 📈 Visual Analytics
- **Category Distribution**: Bar charts showing constants by category
- **Type Distribution**: Visual breakdown by data type
- **Security Classification**: Security level analytics
- **Project Breakdown**: Constants per project metrics

### 📋 Constants Table
- Sortable table with first 20 constants
- Color-coded type badges
- Security level indicators
- MCP exposure status
- Project attribution

## 🏷️ Badge Integration

### Markdown Usage
```markdown
![version](./visual/badges/version.svg)
![tier-1380](./visual/badges/tier_1380.svg)
![constants](./visual/badges/constants.svg)
```

### HTML Usage
```html
<img src="docs/visual/badges/version.svg" alt="Version">
<img src="docs/visual/badges/tier-1380.svg" alt="Tier-1380">
<img src="docs/visual/badges/constants.svg" alt="Constants">
```

### All Badges Combined
![version](./visual/badges/version.svg) ![tier-1380](./visual/badges/tier_1380.svg) ![constants](./visual/badges/constants.svg) ![schema](./visual/badges/schema.svg) ![mcp](./visual/badges/mcp.svg) ![col-89](./visual/badges/col_89.svg) ![audit](./visual/badges/audit.svg) ![projects](./visual/badges/projects.svg)

## 🔧 Customization

### Badge Colors
- **Blue (#007ec6)**: Version information
- **Green (#28a745)**: Certified/Enabled status
- **Red (#dc3545)**: Non-compliant/Disabled status
- **Purple (#6f42c1)**: Count metrics
- **Cyan (#17a2b8)**: Schema information
- **Orange (#fd7e14)**: Compliance indicators
- **Pink (#e83e8c)**: Audit levels
- **Teal (#20c997)**: Project counts

### Dashboard Theme
- **Dark background**: `#0d1117`
- **Card backgrounds**: `#161b22`
- **Accent colors**: `#58a6ff` to `#79c0ff` gradient
- **Success colors**: `#3fb950`
- **Warning colors**: `#f85149`

## 🌐 Server Mode

Launch the dashboard with built-in web server:
```bash
bun scripts/generate-visual-docs.ts --serve
```

Features:
- **Live badge serving** at `/badges/` endpoint
- **Responsive dashboard** at root path
- **Auto-refresh** capabilities
- **Mobile optimized** interface

## 📊 Registry Integration

The visual system integrates with the enhanced registry metadata:

```json
{
  "tier1380": {
    "visualDocs": {
      "enabled": true,
      "dashboardGenerated": "2025-02-04T05:00:00.000Z",
      "badgesGenerated": true,
      "chartsEnabled": true,
      "theme": "dark"
    }
  },
  "metadata": {
    "visual": {
      "dashboardURL": "http://example.com",
      "badgesURL": "./docs/visual/badges",
      "lastVisualUpdate": "2025-02-04T05:00:00.000Z"
    }
  }
}
```

## 🔍 Verification Commands

### Validate Visual Documentation
```bash
# Check dashboard exists
test -f docs/visual/dashboard.html

# Verify badges generated
ls docs/visual/badges/*.svg | wc -l

# Test dashboard server
curl -I http://example.com
```

### Integration with Version Management
```bash
# Full workflow
bun run extract:constants  # Update constants
bun run visual:docs        # Generate visuals
bun run visual:dashboard   # Launch dashboard
```

---

**🎯 Status**: Production Ready | **🔒 Compliance**: Tier-1380 Certified | **📅 Last Updated**: 2025-02-04
