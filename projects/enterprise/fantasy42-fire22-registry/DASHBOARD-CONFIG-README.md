# 🔥 Fire22 Dashboard Configuration

This document explains how to use the dashboard configuration in `bunfig.toml`
and the available commands.

## 📋 Configuration Overview

The dashboard configuration is located in `bunfig.toml` under the `[dashboard]`
section and includes:

### 🔧 Core Settings

```toml
[dashboard]
serve_dashboard = true          # Enable dashboard serving
entry_point = "crystal-clear-architecture/dashboard.html"  # Main dashboard file
dev_port = 3001                 # Development server port
hot_reload = true               # Enable hot reloading
enable_api_routes = true        # Enable dashboard API routes
```

### 🏗️ Build Configuration

```toml
[dashboard.build]
output_dir = "dist/dashboard"   # Build output directory
minify = true                   # Minify for production
sourcemap = true               # Enable source maps
bundle = true                  # Bundle all assets
target = "browser"             # Target environment
```

### 🚀 Development Server

```toml
[dashboard.dev]
live_reload = true              # Live reload on changes
console_bridge = true          # Browser console to terminal
error_overlay = true           # Error overlay in browser
cors = { enabled = true, origins = ["*"] }  # CORS settings
websocket_port = 3002          # Hot reload WebSocket port
```

### 🛣️ Routes Configuration

```toml
[dashboard.routes]
"/dashboard" = "crystal-clear-architecture/dashboard.html"    # Main route
"/api/dashboard/*" = "src/api/dashboard-integration.ts"      # API routes
"/assets/*" = "crystal-clear-architecture/assets/*"          # Static assets
```

## 🚀 Quick Start

### Start Development Server

```bash
# Using npm scripts
bun run dashboard:dev

# Or directly
bun run scripts/serve-dashboard-dev.ts
```

### Access Dashboard

- **Local Development**: http://localhost:3001/dashboard
- **Live Dashboard**:
  https://dashboard-worker.brendawill2233.workers.dev/dashboard
- **GitHub Pages**:
  https://brendadeeznuts1111.github.io/crystal-clear-architecture/dashboard.html

### Available Commands

```bash
# Development
bun run dashboard:dev      # Start development server
bun run dashboard:serve    # Alias for dev server

# Build & Deploy
bun run dashboard:build    # Build for production
bun run dashboard:preview  # Preview production build
bun run dashboard:test     # Test dashboard functionality
```

## 🔧 Development Features

### Hot Reload

- Automatically refreshes browser on file changes
- WebSocket connection on port 3002
- Console bridge for browser debugging

### API Mocking

- Mock API responses for development
- CORS enabled for cross-origin requests
- Real-time data simulation

### Live Reload

- File watching for HTML, CSS, JS changes
- Automatic browser refresh
- Error overlay for debugging

## 📊 Dashboard Features

### ✨ Modern UI Components

- Gradient backgrounds with Fire22 branding
- Interactive KPI cards with hover effects
- Real-time data visualization with Chart.js
- Professional tab navigation
- Responsive design for all devices

### 🎯 Real-time Updates

- Live data refresh every 5 seconds
- WebSocket integration for instant updates
- Performance monitoring
- Error handling and recovery

### 🎨 Theme Configuration

```toml
[dashboard.env]
DASHBOARD_VERSION = "5.0.0"
THEME_MODE = "dark"
PRIMARY_COLOR = "#DC2626"
SECONDARY_COLOR = "#EA580C"
ACCENT_COLOR = "#CA8A04"
```

## 🔧 Customization

### Change Port

```toml
[dashboard]
dev_port = 8080  # Change to your preferred port
```

### Modify Routes

```toml
[dashboard.routes]
"/custom-dashboard" = "path/to/your/dashboard.html"
```

### Add Environment Variables

```toml
[dashboard.env]
CUSTOM_API_URL = "https://your-api.com"
DEBUG_MODE = true
```

## 🚀 Production Deployment

### Build for Production

```bash
bun run dashboard:build
```

### Deploy to Cloudflare

```bash
bun run dashboard:preview
wrangler pages deploy dist/dashboard
```

### Environment Variables

Set production environment variables in Cloudflare Dashboard or wrangler.toml:

```toml
[vars]
DASHBOARD_API_URL = "https://your-production-api.com"
UPDATE_INTERVAL = "30"  # Longer interval for production
```

## 🐛 Troubleshooting

### Server Won't Start

- Check if port 3001 is available
- Verify bunfig.toml configuration
- Ensure dashboard.html exists at specified path

### Hot Reload Not Working

- Check WebSocket port 3002 is available
- Verify file paths in configuration
- Check browser console for errors

### API Routes Not Working

- Verify enable_api_routes = true
- Check API route configuration
- Ensure CORS settings are correct

## 📞 Support

For dashboard configuration issues:

- Check `bunfig.toml` syntax
- Verify file paths exist
- Review console logs for errors
- Test with minimal configuration

---

**🎉 Your Fire22 Dashboard is now fully configured and ready for development!**
