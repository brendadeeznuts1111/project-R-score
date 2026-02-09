# Search Benchmark Dashboard

**Version:** 2.0  
**Purpose:** Real-time performance monitoring dashboard for search benchmarks with extensive visualization capabilities

## Overview

A comprehensive web dashboard for monitoring, analyzing, and exporting search benchmark performance data. Built with Bun runtime, featuring glassmorphism UI, real-time updates, and advanced data visualization.

## Architecture

### Frontend
- **HTML/CSS/JS:** Single-file dashboard (8,100+ lines)
- **Styling:** CSS variables for theming, glassmorphism effects
- **Charts:** HTML5 Canvas API for sparklines, bar charts, heatmaps
- **Responsive:** Mobile-first with breakpoint optimization

### Backend Integration
- **Server:** Bun.serve with hot-reload capability
- **Data Sources:** Local filesystem + Cloudflare R2
- **API Endpoints:** RESTful JSON endpoints
- **Polling:** Configurable interval-based updates

### Key Components

```
Dashboard
├── Header (meta info, controls, status indicators)
├── Core Status Section
│   ├── Latest Snapshot (metrics, charts, tables)
│   ├── Loop Closure Status
│   ├── Trend Analysis
│   └── History Timeline
├── Domain & Registry Section
│   ├── Domain Registry Readiness
│   └── Domain Health Summary
├── Storage & Distribution Section
│   ├── Publish Manifest
│   ├── R2 Inventory
│   └── RSS Feed
└── Settings & Configuration
```

## Features

### Data Visualization
- Sparkline charts with gradients
- Quality score rings (animated SVG)
- P95 latency gauges
- Progress bars with shimmer
- Heatmap grids

### User Experience
- Collapsible sections
- Table sorting
- Search & filtering
- Modal dialogs
- Keyboard shortcuts
- Drag & drop

### Configuration
- Auto-refresh intervals
- Alert thresholds
- Theme toggle
- Notification settings
- Date range filters

### Export Formats
- JSON (complete data)
- CSV (spreadsheet)
- Markdown (reports)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/latest` | GET | Latest benchmark snapshot |
| `/api/index` | GET | Snapshot index/history |
| `/api/rss` | GET | RSS feed |
| `/api/loop-status` | GET | Loop closure status |
| `/api/domain-health` | GET | Domain health metrics |
| `/api/domain-registry-status` | GET | Domain registry status |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Refresh dashboard |
| `Ctrl+1` | Load Local Latest |
| `Ctrl+2` | Load R2 Latest |
| `Ctrl+H` | Load History |
| `Ctrl+E` | Export Data |
| `Ctrl+T` | Toggle Theme |
| `?` | Show Help |
| `Esc` | Close modal/menu |

## File Structure

```
scripts/
└── search-benchmark-dashboard.ts    # Main dashboard server + UI

reports/
└── search-benchmark/
    ├── latest.json                  # Current snapshot
    ├── index.json                   # Snapshot index
    ├── rss.xml                      # RSS feed
    └── 2026-02-*/                   # Historical snapshots
```

## Usage

```bash
# Start dashboard server
bun scripts/search-benchmark-dashboard.ts

# With custom port
bun scripts/search-benchmark-dashboard.ts --port 3099

# With R2 configured
export R2_ACCOUNT_ID=xxx
export R2_ACCESS_KEY_ID=xxx
export R2_SECRET_ACCESS_KEY=xxx
bun scripts/search-benchmark-dashboard.ts --r2-base https://...
```

## Technology Stack

- **Runtime:** Bun v1.3.7+
- **Server:** Bun.serve with WebSocket hot-reload
- **Storage:** Local filesystem + Cloudflare R2
- **Charts:** Native Canvas API
- **Styling:** CSS3 with custom properties
- **Persistence:** localStorage

## Performance

- Bundle size: ~0.37 MB
- Load time: <100ms (cached)
- Polling: 5s-60s configurable
- Responsive: 60fps animations

## Future Enhancements

- WebSocket real-time updates (replace polling)
- Component modularization
- Unit test coverage
- i18n internationalization
- PWA offline support
