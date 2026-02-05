# Dashboard CLI Usage Guide

## Quick Commands

### Start Development Server
```bash
bun cli/dashboard/dashboard-cli.ts serve
```
Opens: `http://localhost:8080/dashboard.html?demo=ai-risk-analysis`

### Custom Port
```bash
bun cli/dashboard/dashboard-cli.ts serve 3000
```
Opens: `http://localhost:3000/dashboard.html?demo=ai-risk-analysis`

### Run Benchmarks
```bash
bun cli/dashboard/dashboard-cli.ts bench
```
Validates performance optimizations with mitata benchmarks

### Validate Optimizations
```bash
bun cli/dashboard/dashboard-cli.ts validate
```
Checks all 5 layer optimizations are active:
- ✅ HTML Preconnect
- ✅ Element Caching  
- ✅ DNS Prefetch
- ✅ Response Buffering
- ✅ Max Requests Config

### Build for Production
```bash
bun cli/dashboard/dashboard-cli.ts build
```
Compiles TypeScript files (risk-heatmap.ts → risk-heatmap.js) with `--define` for dead code elimination.

**Production build** (default):
- Uses `--define process.env.NODE_ENV="'production'"`
- Enables dead code elimination
- Removes development-only code

**Development build**:
```bash
NODE_ENV=development bun cli/dashboard/dashboard-cli.ts build
```
- Uses `--define process.env.NODE_ENV="'development'"`
- Keeps development code, removes production-only code

## All Commands

| Command | Description | Example |
|---------|-------------|---------|
| `serve` | Start dev server | `bun cli/dashboard/dashboard-cli.ts serve` |
| `bench` | Run benchmarks | `bun cli/dashboard/dashboard-cli.ts bench` |
| `validate` | Validate optimizations | `bun cli/dashboard/dashboard-cli.ts validate` |
| `build` | Build for production | `bun cli/dashboard/dashboard-cli.ts build` |
| `help` | Show help | `bun cli/dashboard/dashboard-cli.ts help` |

## Workflow Examples

### Development Workflow
```bash
# 1. Start dev server
bun cli/dashboard/dashboard-cli.ts serve

# 2. Open browser
# http://localhost:8080/dashboard.html?demo=ai-risk-analysis

# 3. Make changes to HTML/CSS/JS

# 4. Refresh browser to see changes
```

### Performance Testing Workflow
```bash
# 1. Validate optimizations are active
bun cli/dashboard/dashboard-cli.ts validate

# 2. Run benchmarks
bun cli/dashboard/dashboard-cli.ts bench

# 3. Check results for improvements
```

### Production Build Workflow
```bash
# 1. Build TypeScript files
bun cli/dashboard/dashboard-cli.ts build

# 2. Deploy pages/ directory
# All files are ready for production
```

## Environment Variables

### Using .env File (Recommended)

Bun automatically loads environment variables from `.env` files:

1. Create `.env` file in `pages/` directory:
```bash
cp pages/.env.example pages/.env
```

2. Edit `pages/.env`:
```ini
PORT=8080
HOST=localhost
NODE_ENV=development
```

3. Bun loads files in this order (increasing precedence):
   - `.env`
   - `.env.production`, `.env.development`, `.env.test` (based on `NODE_ENV`)
   - `.env.local` (not loaded when `NODE_ENV=test`)

### Using Command Line

```bash
# Custom port
PORT=3000 bun cli/dashboard/dashboard-cli.ts serve

# Custom host
HOST=0.0.0.0 bun cli/dashboard/dashboard-cli.ts serve

# Both
PORT=3000 HOST=0.0.0.0 bun cli/dashboard/dashboard-cli.ts serve
```

### Accessing Variables

The code uses `Bun.env` (Bun's preferred method) with fallback to `process.env`:

```typescript
const port = Bun.env.PORT || process.env.PORT || "8080";
const host = Bun.env.HOST || process.env.HOST || "localhost";
```

Both `Bun.env.PORT` and `process.env.PORT` work identically.

## Troubleshooting

### Port Already in Use
```bash
# Use different port
bun cli/dashboard/dashboard-cli.ts serve 3001
```

### Build Fails
```bash
# Check TypeScript file exists
ls pages/risk-heatmap.ts

# Rebuild
bun cli/dashboard/dashboard-cli.ts build
```

### Validation Fails
```bash
# Check which optimization is missing
bun cli/dashboard/dashboard-cli.ts validate

# Fix the missing optimization
# Re-run validation
```
