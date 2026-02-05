# Quick Reference Guide

Fast lookup for common commands, configurations, and tasks.

## 🚀 Essential Commands

### Development

```bash
# Start development server
cd packages/dashboard && bun --hot src/main.tsx

# Run tests
bun test

# Lint code
bun run lint
bun run lint:fix

# Type check
bun run typecheck
```

### Building

```bash
# Build for production
bun run build:prod

# Build for development
bun run build:dev

# Clean build artifacts
bun clean
```

### Deployment

```bash
# Deploy to Cloudflare
wrangler deploy --env production

# View logs
wrangler tail --env production

# Preview deployment
cd packages/dashboard && bun preview
```

## 📁 File Locations

| File               | Purpose                |
| ------------------ | ---------------------- |
| `.eslintrc.json`   | Linting rules          |
| `.prettierrc.json` | Code formatting        |
| `.env.example`     | Environment template   |
| `package.json`     | Dependencies & scripts |
| `tsconfig.json`    | TypeScript config      |
| `bunfig.toml`      | Bun config             |
| `wrangler.toml`    | Cloudflare config      |

## 🔧 Configuration

### Environment Variables (Development)

```bash
VITE_DEBUG=true
VITE_DEVELOPER_MODE=true
VITE_DUOPLUS_ENABLED=true
VITE_API_BASE_URL=http://localhost:3000
```

### Environment Variables (Production)

```bash
NODE_ENV=production
VITE_PRODUCTION_MODE=true
VITE_API_BASE_URL=https://api.example.com
```

## 📋 npm Scripts

```bash
# Linting
bun run lint            # Check for issues
bun run lint:fix        # Auto-fix issues
bun run format          # Format code
bun run format:check    # Check formatting

# Development
bun run dev             # Start dev server
bun run dev:staging     # Staging environment
bun run build           # Build dashboard
bun run build:prod      # Production build

# Testing
bun test                # Run tests
bun test --watch        # Watch mode
bun test --coverage     # With coverage

# Deployment
bun run deploy          # Deploy dashboard
bun run deploy:staging  # Deploy to staging
bun run deploy:prod     # Deploy to production

# Profiles
bun run profile:create  # Create unified profile
bun run profile:list    # List profiles
bun run profile:export  # Export profiles
bun run profile:import  # Import profiles
```

## 🎯 Common Tasks

### Setup New Project

```bash
# 1. Install dependencies
bun install

# 2. Create environment file
cp .env.example .env

# 3. Start development
cd packages/dashboard
bun --hot src/main.tsx
```

### Before Committing

```bash
# Run all checks
bun run lint && \
bun run typecheck && \
bun run format:check && \
bun run test && \
bun run build
```

### Debug Issues

```bash
# Enable debug mode
export DEBUG=foxy-proxy:*
bun --hot src/main.tsx

# Check types
bun run typecheck --pretty

# View recent errors
grep ERROR logs/*.log | tail -20
```

### Update Dependencies

```bash
# Check for updates
bun outdated

# Update all
bun update

# Update specific
bun update package-name

# Audit security
bun audit
```

## 🔗 Documentation Links

| Document                                               | Use Case                 |
| ------------------------------------------------------ | ------------------------ |
| [00-START-HERE.md](./00-START-HERE.md)                 | Finding documentation    |
| [GETTING_STARTED.md](./GETTING_STARTED.md)             | First-time setup         |
| [DEVELOPMENT.md](./DEVELOPMENT.md)                     | Development workflow     |
| [LINT_GUIDELINES.md](./LINT_GUIDELINES.md)             | Code standards           |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                       | Production deployment    |
| [CLOUDFLARE_DEPLOYMENT.md](./CLOUDFLARE_DEPLOYMENT.md) | Cloudflare configuration |
| [OPERATIONS.md](./OPERATIONS.md)                       | Running in production    |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)             | Solving problems         |
| [API_REFERENCE.md](./API_REFERENCE.md)                 | API documentation        |

## 🐛 Troubleshooting Quick Fixes

### Port 3000 Already in Use

```bash
lsof -ti:3000 | xargs kill -9
bun --hot --port 3001 src/main.tsx
```

### Module Not Found

```bash
rm -rf node_modules
bun install
```

### Build Fails

```bash
bun clean
rm -rf dist
bun run build
```

### TypeScript Errors

```bash
rm -rf .bun
bun install
bun run typecheck
```

## 💻 VS Code Setup

### Recommended Extensions

- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Bun (oven.bun-vscode)
- Thunder Client (rangav.vscode-thunder-client)

### Settings (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 🌐 API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

### Proxies

```bash
# Get all proxies
curl http://localhost:3000/api/proxies

# Get specific proxy
curl http://localhost:3000/api/proxies/:id

# Create proxy
curl -X POST http://localhost:3000/api/proxies \
  -H "Content-Type: application/json" \
  -d '{"ip":"1.2.3.4","port":8080}'
```

### Profiles

```bash
# Get all profiles
curl http://localhost:3000/api/profiles

# Create profile
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"My Profile","proxyId":"proxy-1"}'
```

## 🔑 Feature Flags

### Available Flags

```bash
VITE_DEBUG              # Debug logging
VITE_DEVELOPER_MODE     # Developer tools
VITE_DUOPLUS_ENABLED    # DuoPlus features
VITE_ENHANCED_TEMPLATES # Template system
VITE_PRODUCTION_MODE    # Production optimizations
```

### Usage

```typescript
import { isDebugMode, isDeveloperMode } from "@/utils/feature-flags";

if (isDebugMode()) {
  console.log("Debug info");
}
```

## 🔒 Security Checklist

- [ ] Never commit `.env` files
- [ ] Rotate API keys monthly
- [ ] Use HTTPS in production
- [ ] Enable two-factor authentication
- [ ] Review access permissions
- [ ] Audit dependency vulnerabilities
- [ ] Encrypt sensitive data

## 📊 Performance Commands

### Measure Build Time

```bash
time bun run build:prod
```

### Analyze Bundle Size

```bash
bun build src/main.tsx --outdir dist
du -sh dist/
ls -lh dist/
```

### Profile Runtime

```typescript
import { PerformanceTimer } from "@/utils/date-utils";

const timer = new PerformanceTimer();
// ... operation
console.log(timer.getFormattedDuration());
```

## 🚀 Release Checklist

- [ ] All tests passing
- [ ] All linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Build successful
- [ ] Deployment tested
- [ ] Rollback plan ready

## 📞 Getting Help

| Issue              | Resource                                   |
| ------------------ | ------------------------------------------ |
| **Setup Problems** | [GETTING_STARTED.md](./GETTING_STARTED.md) |
| **Code Questions** | [API_REFERENCE.md](./API_REFERENCE.md)     |
| **Errors**         | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| **Deployment**     | [DEPLOYMENT.md](./DEPLOYMENT.md)           |
| **Standards**      | [LINT_GUIDELINES.md](./LINT_GUIDELINES.md) |

## 🎯 Quick Navigation

**Just starting?** → [GETTING_STARTED.md](./GETTING_STARTED.md)
**Want to code?** → [DEVELOPMENT.md](./DEVELOPMENT.md)
**Ready to deploy?** → [DEPLOYMENT.md](./DEPLOYMENT.md)
**Something broken?** → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
**Need guidelines?** → [LINT_GUIDELINES.md](./LINT_GUIDELINES.md)

---

**Last Updated**: January 9, 2026
**Version**: 1.0
