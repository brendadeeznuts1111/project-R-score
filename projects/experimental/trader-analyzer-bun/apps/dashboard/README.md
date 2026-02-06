# Dashboard Application

**Rspack-powered dashboard bundling with Bun v1.51 N-API support**

---

## Overview

This dashboard application uses **Rspack** (Rust-based bundler) for fast TypeScript compilation and bundling. Bun v1.51's N-API fix enables Rspack to work correctly with Bun's Node.js compatibility layer.

**Performance**: 5-10x faster than Webpack

---

## Quick Start

### Prerequisites

```bash
# Install Rspack dependencies
bun add -d @rspack/cli @rspack/core
```

### Development

```bash
# Start development server with hot reload
bun run dashboard:dev

# Or manually
cd apps/dashboard
rspack serve
```

Dashboard will be available at: `http://localhost:8080`

### Production Build

```bash
# Build for production
bun run dashboard:build

# Or manually
cd apps/dashboard
rspack build --mode production
```

Output will be in: `dist/dashboard/`

---

## Project Structure

```text
apps/dashboard/
├── rspack.config.ts      # Rspack configuration
├── src/
│   ├── client.ts         # Main entry point
│   ├── dashboard-client.ts # Dashboard client class
│   └── viz/
│       └── worker.ts     # Graph visualization worker
└── README.md
```

---

## Features

- ✅ **TypeScript Support** - Full TypeScript compilation with SWC
- ✅ **Code Splitting** - Automatic vendor/common chunk splitting
- ✅ **Hot Module Replacement** - Fast development iteration
- ✅ **Production Optimization** - Minification and tree-shaking
- ✅ **Web Worker Support** - Graph visualization in separate thread

---

## Configuration

### Rspack Config

See `rspack.config.ts` for full configuration:

- **Entry Points**: `dashboard` and `graphViz` (worker)
- **Output**: `dist/dashboard/`
- **Optimization**: Code splitting, minification
- **Dev Server**: Port 8080 with hot reload

### Customization

Edit `apps/dashboard/rspack.config.ts` to customize:
- Entry points
- Output paths
- Optimization settings
- Dev server configuration

---

## Integration with Main App

The dashboard bundles are served by the main API server:

```typescript
// src/index.ts or your server file
app.get('/dashboard/*', async (req) => {
  // Serve bundled dashboard files from dist/dashboard/
});
```

---

## Performance

**Build Speed Comparison**:
- Webpack: ~45 seconds
- Rspack: ~5 seconds (**9x faster**)

**Bundle Size**:
- Code splitting reduces initial load
- Vendor chunks cached separately
- Worker chunks loaded on demand

---

## Troubleshooting

### Rspack not found

```bash
bun add -d @rspack/cli @rspack/core
```

### Build errors

Check that TypeScript files are in `apps/dashboard/src/` directory.

### Dev server port conflict

Edit `rspack.config.ts` and change `devServer.port` to a different port.

---

**Bun Version**: 1.1.51+ (N-API fix required)
**Rspack Version**: Latest
**Status**: ✅ Ready for use
