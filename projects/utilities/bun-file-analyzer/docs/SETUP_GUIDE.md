# Bun Setup Guide - Enhanced Configuration

## 🚀 Quick Setup

### 1. Automated Setup (Recommended)

```bash
# Clone and setup
git clone <repository-url>
cd b-react-hmr-refresh
./scripts/setup-bun.sh
```

### 2. Manual Setup

```bash
# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env

# Start development
./scripts/dev.sh
```

## 📋 Prerequisites

- **Node.js**: Not required (Bun is all-inclusive)
- **Bun**: v1.3.0+ (auto-installed by setup script)
- **Git**: For version control
- **Terminal**: Any modern terminal (zsh, bash, fish)

## 🔧 Configuration Files

### `.env` - Environment Variables

```bash
# Core configuration
PORT=3879                    # Frontend port
API_PORT=3005                # API port
NODE_ENV=development         # Environment

# Development features
BUN_HOT_RELOAD=true          # Hot reload
BUN_REACT_FAST_REFRESH=true  # React Fast Refresh
```

### `bun.config.js` - Build Configuration

```javascript
// Optimized build settings
reactFastRefresh: process.env.NODE_ENV !== "production",
minify: process.env.NODE_ENV === "production",
sourcemap: process.env.NODE_ENV === "development",
```

## 🛠 Available Scripts

### Development Scripts

```bash
./scripts/dev.sh          # Full development environment
bun run dev:api           # API server only
bun run dev:frontend      # Frontend build only
bun run dev:serve         # Static server only
```

### Build Scripts

```bash
bun run build:dev         # Development build
bun run build:prod        # Production build
bun run build:analyze     # Build analysis
bun run build:virtual     # Virtual files demo
```

### Utility Scripts

```bash
./scripts/monitor.sh      # Server monitoring
./scripts/deploy.sh       # Production deployment
./scripts/clean.sh        # Clean build artifacts
bun run health            # Health check
bun run status            # Server status
```

### Testing Scripts

```bash
bun test                  # Run all tests
bun run test:watch        # Watch mode
bun run test:coverage     # With coverage
```

## 🌐 Development Workflow

### 1. Start Development

```bash
# Option 1: Full environment
./scripts/dev.sh

# Option 2: Manual start
bun run dev:api &      # Start API
bun run dev:frontend & # Start frontend build
bun run dev:serve      # Start static server
```

### 2. Access Applications

- **Frontend**: http://localhost:3879
- **API**: http://localhost:3005
- **Health Check**: http://localhost:3005/health
- **Development Dashboard**: http://localhost:3879/dev

### 3. Monitor Performance

```bash
# Check server status
./scripts/monitor.sh

# View logs
bun run logs

# Health check
bun run health
```

## 🔍 Troubleshooting

### Port Conflicts

```bash
# Check what's using ports
lsof -ti:3879 | xargs kill -9  # Frontend port
lsof -ti:3005 | xargs kill -9  # API port

# Or use different ports
PORT=8080 API_PORT=3001 bun run dev
```

### Build Issues

```bash
# Clean everything
bun run clean:all

# Reinstall dependencies
rm -rf node_modules bun.lock
bun install

# Rebuild
bun run build:prod
```

### Permission Issues

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix file permissions
chmod -R 755 .
```

### Memory Issues

```bash
# Clear Bun cache
rm -rf .bun-cache

# Increase Node memory (if needed)
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 🚀 Production Deployment

### 1. Build for Production

```bash
# Set production mode
export NODE_ENV=production

# Build everything
./scripts/deploy.sh
```

### 2. Deploy with Docker

```dockerfile
# Dockerfile
FROM oven/bun:1.3-alpine

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile --production
RUN bun run build:prod

EXPOSE 3879 3005

CMD ["bun", "run", "start:prod"]
```

### 3. Environment Variables

```bash
# Production .env
NODE_ENV=production
BUN_BUILD_MINIFY=true
BUN_BUILD_SOURCEMAP=false
LOG_LEVEL=warn
API_CORS_ORIGIN=https://yourdomain.com
```

## 📊 Performance Optimization

### Build Optimization

```javascript
// bun.config.js
{
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  treeShaking: true,
  splitting: true,
  external: ["react", "react-dom"],
}
```

### Runtime Optimization

```bash
# Enable Bun's runtime optimizations
export BUN_RUNTIME_TRANSPORT=http
export BUN_RUNTIME_TYPE=bun

# Use worker threads
export WORKER_THREADS=4
```

### Caching Strategy

```bash
# Enable build caching
export BUN_BUILD_CACHE=true

# Use CDN for static assets
export CDN_URL=https://cdn.yourdomain.com
```

## 🔒 Security Configuration

### Environment Security

```bash
# Generate secure secrets
export API_JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)
export API_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### CORS Configuration

```javascript
// api/index.ts
app.use("/api/*", cors({
  origin: process.env.API_CORS_ORIGIN,
  credentials: true,
  maxAge: 86400,
}));
```

## 📈 Monitoring & Logging

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:3005/health

# System monitoring
./scripts/monitor.sh
```

### Log Configuration

```javascript
// Configure logging
const logger = {
  level: process.env.LOG_LEVEL || "info",
  format: process.env.LOG_FORMAT || "json",
  file: process.env.LOG_FILE || "logs/app.log",
};
```

## 🧪 Testing Strategy

### Unit Tests

```bash
# Run specific test
bun test test/cookiemap.test.ts

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

### Integration Tests

```bash
# API tests
bun test test/api/*.test.ts

# Frontend tests
bun test test/components/*.test.tsx
```

### Performance Tests

```bash
# Benchmark file analysis
bun test test/performance.test.ts

# Load testing
bun test test/load.test.ts
```

## 🔄 Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun run build:prod
```

### Development Workflow

1. **Feature Branch**: Create feature branch
2. **Development**: Use `./scripts/dev.sh`
3. **Testing**: Run `bun test`
4. **Build**: Verify with `bun run build:prod`
5. **Deploy**: Use `./scripts/deploy.sh`

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [React Fast Refresh](https://github.com/facebook/react/tree/main/packages/react-refresh)
- [Hono Framework](https://hono.dev/)
- [Project Structure](./PROJECT_STRUCTURE.md)

## 🆘 Getting Help

```bash
# Check Bun version
bun --version

# Show help
bun --help

# Debug mode
DEBUG=* bun run dev

# Verbose logging
bun run dev --verbose
```

For issues specific to this project, check the:
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [API Documentation](./API.md)
- [Development Guide](./DEVELOPMENT.md)
