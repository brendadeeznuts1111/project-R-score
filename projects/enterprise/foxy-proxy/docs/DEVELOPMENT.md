# Development Guide

Complete guide for local development environment setup and workflow.

## 🚀 Quick Start

### Prerequisites

- **Bun** 1.0+ ([Install](https://bun.sh))
- **Node.js** 18+ (optional, primarily for tooling)
- **Git** 2.0+

### Initial Setup

```bash
# Clone repository
git clone https://github.com/brendadeeznuts1111/foxy-duo-proxy.git
cd foxy-proxy

# Install dependencies
bun install

# Set up environment
cp .env.example .env.development
# Edit .env.development with your settings

# Start development server
cd packages/dashboard
bun --hot src/main.tsx
```

The dashboard will open at `http://localhost:3000`

## 🛠️ Development Commands

### Core Commands

```bash
# Start development server (with hot reload)
bun --hot src/main.tsx

# Run tests
bun test
bun test --watch

# Type check
bun run typecheck

# Lint code
bun run lint
bun run lint:fix

# Build for production
bun run build:prod

# Clean build artifacts
bun clean
```

### Project Structure

```
foxy-proxy/
├── packages/
│   └── dashboard/
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── pages/          # Page containers
│       │   ├── utils/          # Utilities and helpers
│       │   ├── hooks/          # Custom React hooks
│       │   ├── types/          # TypeScript types
│       │   └── main.tsx        # Entry point
│       ├── dist/               # Build output
│       └── package.json        # Package configuration
├── docs/                       # Documentation
├── scripts/                    # Maintenance scripts
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
├── tsconfig.json              # TypeScript configuration
└── bunfig.toml                # Bun configuration
```

## 📝 Code Quality

### Linting

```bash
# Check for lint issues
bun run lint

# Auto-fix lint issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check
```

### Before Committing

```bash
# Run full validation suite
bun run lint && \
bun run typecheck && \
bun run format:check && \
bun run test && \
bun run build
```

### Code Style

- **Quotes**: Double quotes (`"`)
- **Semicolons**: Required
- **Indentation**: 2 spaces
- **Line Length**: 100 characters max
- **Trailing Commas**: None (for monorepo compatibility)

## 🧪 Testing

### Run Tests

```bash
# Run all tests
bun test

# Run in watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Run specific test file
bun test src/test/unit/components/Button.test.tsx
```

### Writing Tests

```typescript
import { describe, it, expect } from "bun:test";

describe("MyComponent", () => {
  it("should render", () => {
    // Test code
    expect(true).toBe(true);
  });

  it("should handle user input", () => {
    // Test code
    expect(result).toEqual(expected);
  });
});
```

## 🔧 Environment Variables

### Development (.env.development)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# R2/Cloud Storage
VITE_R2_ACCOUNT_ID=dev-account-id
VITE_R2_ACCESS_KEY_ID=dev-access-key
VITE_R2_SECRET_ACCESS_KEY=dev-secret-key
VITE_R2_BUCKET_NAME=foxy-proxy-dev

# Feature Flags
VITE_DEBUG=true
VITE_DEVELOPER_MODE=true
VITE_DUOPLUS_ENABLED=true
VITE_ENHANCED_TEMPLATES=true

# API Keys
IPFOXY_API_TOKEN=your_token_here
DUOPLUS_API_KEY=your_key_here
```

### Test Environment

Tests use UTC timezone automatically for consistency:

```bash
TZ=UTC bun test
```

## 🐛 Debugging

### Browser DevTools

1. Open DevTools: **F12** or **Cmd+Option+I**
2. **Console**: View logs and errors
3. **Network**: Monitor API calls
4. **Application**: View storage and cookies
5. **Performance**: Profile rendering

### Debug Server

```bash
# Enable debug mode
export DEBUG=foxy-proxy:*
bun --hot src/main.tsx
```

### TypeScript Debugging

```bash
# Type check with verbose output
bun run typecheck --pretty
```

## 📦 Dependency Management

### Add Package

```bash
# Add runtime dependency
bun add package-name

# Add dev dependency
bun add -d package-name

# Install from specific version
bun add package-name@1.0.0
```

### Update Packages

```bash
# Check for outdated packages
bun outdated

# Update all packages
bun update

# Update specific package
bun update package-name
```

### Remove Package

```bash
# Remove package
bun remove package-name
```

## 🔄 Git Workflow

### Feature Branch

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature
```

### Pre-commit Hook (Optional)

Install Husky for automatic pre-commit checks:

```bash
# Install Husky
bun install -d husky

# Initialize
bunx husky install

# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 Running pre-commit checks..."
bun run lint && bun run typecheck && bun run format:check && echo "✅ Checks passed"
EOF

chmod +x .husky/pre-commit
```

## 🚀 Building & Deployment

### Development Build

```bash
cd packages/dashboard
bun build src/main.tsx --outdir dist --minify false
```

### Production Build

```bash
bun run build:prod
```

### Local Preview

```bash
cd packages/dashboard
bun preview
```

## 🌐 API Integration

### Testing APIs Locally

```bash
# Start mock server (if available)
bun run api:mock

# Or use curl to test endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/proxies
```

## 📊 Performance Profiling

### Build Performance

```bash
# Measure build time
time bun run build:prod

# Analyze bundle size
bun build src/main.tsx --outdir dist
ls -lh dist/
```

### Runtime Performance

```typescript
// Use PerformanceTimer utility
import { PerformanceTimer } from "./utils/date-utils";

const timer = new PerformanceTimer();
// ... perform operation
console.log("Duration:", timer.getFormattedDuration());
```

## 🔒 Security

### Environment Variables

- **Never commit** `.env` files
- **Use `.env.example`** as template
- **Store secrets** securely (password manager, CI/CD secrets)
- **Rotate credentials** regularly

### API Keys

- Use **read-only** keys when possible
- Implement **rate limiting** for API calls
- Monitor **key usage** for unauthorized access

## 🆘 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
bun --hot --port 3001 src/main.tsx
```

### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules
bun install
```

### Memory Issues

```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
bun run build
```

### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf .bun
bun install

# Force rebuild
bun run typecheck --force
```

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines and standards.

---

**Happy developing!** 🚀

For questions, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or [open an issue](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues).
