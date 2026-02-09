# Search Benchmark Dashboard v2.0

![Dashboard](https://img.shields.io/badge/Dashboard-v2.0-teal)
![Bun](https://img.shields.io/badge/Bun-v1.3.7+-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

A comprehensive real-time dashboard for monitoring search benchmark performance with advanced visualizations, configurable alerts, and multi-format export capabilities.

## 🚀 Quick Start

```bash
# Start the dashboard
bun scripts/search-benchmark-dashboard.ts

# Access at localhost:3099/dashboard
```

## ✨ Features

### 📊 Data Visualization
- **Sparkline Charts** - Real-time trend visualization with Canvas API
- **Quality Rings** - Animated SVG rings showing quality scores
- **Latency Gauges** - Visual P95 latency indicators with thresholds
- **Heatmaps** - Density visualization for metric distribution
- **Progress Bars** - Animated bars with shimmer effects

### 🎨 User Interface
- **Glassmorphism Design** - Modern frosted glass aesthetics
- **Dark/Light Themes** - Toggle with persisted preference
- **Responsive Layout** - Optimized for mobile, tablet, and desktop
- **Collapsible Sections** - Organize content with persistent state
- **Keyboard Shortcuts** - Power user efficiency

### ⚙️ Configuration
- **Auto-Refresh** - Configurable intervals (5s - 1m)
- **Alert Thresholds** - Quality and latency monitoring
- **Webhook Notifications** - Slack/Discord integration
- **Date Range Filtering** - Focus on specific time periods
- **Theme Preferences** - Dark/light mode persistence

### 📤 Export & Sharing
- **JSON Export** - Complete data dump
- **CSV Export** - Spreadsheet compatible
- **Markdown Export** - Documentation ready
- **Print Reports** - Clean print styles
- **Share Links** - Quick URL copying

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + R` | Refresh dashboard |
| `Ctrl + 1` | Load Local Latest |
| `Ctrl + 2` | Load R2 Latest |
| `Ctrl + H` | Load History |
| `Ctrl + E` | Export Data |
| `Ctrl + T` | Toggle Theme |
| `?` | Show Help |
| `Esc` | Close modal/menu |

## 🔌 API Endpoints

### Latest Snapshot
```
GET /api/latest?source=local|r2
```

### Snapshot Index
```
GET /api/index?source=local|r2
```

### RSS Feed
```
GET /api/rss?source=local|r2
```

### Loop Status
```
GET /api/loop-status?source=local|r2
```

### Domain Health
```
GET /api/domain-health?source=local|r2
```

## 🎨 Customization

### Environment Variables
```bash
# R2 Configuration
export R2_ACCOUNT_ID=your_account_id
export R2_ACCESS_KEY_ID=your_access_key
export R2_SECRET_ACCESS_KEY=your_secret_key

# Dashboard Settings
export SEARCH_BENCH_DOMAIN=factory-wager.com
export SEARCH_BENCH_CACHE_TTL_MS=8000
export SEARCH_BENCH_HOT_RELOAD=1
```

### Command Line Options
```bash
bun scripts/search-benchmark-dashboard.ts \
  --port 3099 \
  --dir ./reports/search-benchmark \
  --r2-base <your-r2-public-url> \
  --cache-ttl-ms 8000 \
  --domain factory-wager.com \
  --hot-reload
```

## 📱 Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Desktop | >1200px | Full grid, all columns |
| Tablet | 768-1200px | Reduced columns, stacked cards |
| Mobile | <768px | Single column, compact view |

## 🔧 Architecture

```
Dashboard Server (Bun)
├── HTTP Server (Bun.serve)
├── Static HTML/CSS/JS Dashboard
├── API Routes
│   ├── /api/latest
│   ├── /api/index
│   ├── /api/rss
│   └── ...
├── Data Sources
│   ├── Local Filesystem
│   └── Cloudflare R2
└── WebSocket (Hot Reload)
```

## 📝 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🐛 Troubleshooting

### Dashboard not loading
- Check if port 3099 is available
- Verify reports/search-benchmark/ directory exists
- Check browser console for errors

### R2 connection failed
- Verify R2 credentials are set
- Check R2_BASE environment variable
- Ensure bucket is accessible

### Charts not rendering
- Verify Canvas API support in browser
- Check for JavaScript errors in console
- Try refreshing the page

## 🤝 Contributing

1. Follow existing code style
2. Test on multiple screen sizes
3. Update documentation for new features
4. Ensure keyboard accessibility

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ using [Bun](https://bun.sh)
