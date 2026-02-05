# 🔥 Fire22 Code Standards & Quality Guide

## 📋 Overview

This document outlines the coding standards, formatting requirements, and quality gates for the Fire22 project. All code must adhere to these standards to ensure consistency, maintainability, and reliability across the entire codebase.

## 🎯 Code Formatting

### Prettier Configuration

All code is automatically formatted using Prettier with the following configuration:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "printWidth": 100,
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "bracketSameLine": false
}
```

### File Extensions Supported
- **JavaScript/TypeScript**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Configuration**: `.json`, `.toml`, `.yml`, `.yaml`
- **Markup**: `.html`, `.md`
- **Styles**: `.css`, `.scss`

## 🛠️ Development Workflow

### Pre-commit Hooks

All commits are automatically validated using Husky and lint-staged:

```bash
# Pre-commit checks run automatically:
bun run format:fix    # Auto-format staged files
bun run lint         # Run ESLint on TypeScript/JavaScript files
```

### Manual Commands

```bash
# Check formatting without making changes
bun run format:check

# Auto-fix formatting issues
bun run format:fix

# Run linting
bun run lint

# Run comprehensive tests
bun test
```

## 📏 Code Quality Rules

### ESLint Configuration

```javascript
// .eslintrc.js
{
  env: {
    node: true,
    es2022: true,
    browser: true
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'comma-dangle': ['error', 'always-multiline']
  }
}
```

### TypeScript Standards

- **Strict mode**: Always enabled
- **Type annotations**: Required for function parameters and return types
- **Interface naming**: PascalCase with `I` prefix (e.g., `IUserService`)
- **Generic types**: Use descriptive names (e.g., `TData`, `TResult`)

### JavaScript Standards

- **ES2022 features**: Fully supported
- **Async/await**: Preferred over Promises for readability
- **Arrow functions**: Use for concise expressions
- **Template literals**: Use for string interpolation

## 🏗️ Project Structure

### Directory Organization

```
fire22/
├── src/                    # Main application code
├── enterprise/            # Enterprise features
├── dashboard-worker/      # Dashboard worker code
├── scripts/               # Build and utility scripts
├── testing/               # Test files
├── packages/              # Monorepo packages
└── docs/                  # Documentation
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types**: PascalCase with suffix (e.g., `UserTypes.ts`)

## 🚀 CI/CD Quality Gates

### GitHub Actions Workflow

The CI/CD pipeline enforces the following quality gates:

1. **Formatting Check**: `bun run format:check`
2. **Linting**: `bun run lint`
3. **Type Checking**: TypeScript compilation
4. **Unit Tests**: `bun test`
5. **Integration Tests**: End-to-end validation

### Build Requirements

- **Node.js**: >= 18.0.0
- **Bun**: >= 1.2.0
- **Zero formatting errors**: All files must pass Prettier
- **Zero linting errors**: All TypeScript/JavaScript must pass ESLint
- **Zero TypeScript errors**: All type checking must pass

## 🔒 Security Standards

### Dependency Management

- **Isolated installs**: `linker = "isolated"` in `bunfig.toml`
- **Version pinning**: Exact versions for production dependencies
- **Security audits**: Regular dependency scanning
- **No vulnerable packages**: Automated vulnerability detection

### Code Security

- **Input validation**: All user inputs validated
- **XSS prevention**: Proper escaping of HTML content
- **CSRF protection**: Token-based request validation
- **Secure headers**: HTTPS and security headers enabled

## 📊 Performance Standards

### Bundle Size
- **Main bundle**: < 500KB (gzipped)
- **Vendor chunks**: < 200KB each
- **Initial load**: < 2 seconds

### Runtime Performance
- **First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 3 seconds
- **Lighthouse score**: > 90

## 🧪 Testing Standards

### Test Coverage
- **Unit tests**: > 80% coverage
- **Integration tests**: > 70% coverage
- **E2E tests**: Critical user paths covered

### Test Organization
- **Unit tests**: `*.spec.ts` or `*.test.ts`
- **Integration tests**: `*.integration.spec.ts`
- **E2E tests**: `*.e2e.spec.ts`

## 📚 Documentation Standards

### Code Documentation
- **Functions**: JSDoc comments for public APIs
- **Classes**: Class-level documentation
- **Complex logic**: Inline comments explaining business logic
- **Type definitions**: Clear type descriptions

### README Files
- **Project overview**: What the project does
- **Setup instructions**: How to get started
- **Usage examples**: Common use cases
- **Contributing guide**: How to contribute

## 🔧 Development Environment

### Required Tools
- **Bun**: Runtime and package manager
- **Node.js**: Fallback runtime
- **Git**: Version control
- **VS Code**: Recommended editor

### Editor Configuration
- **Prettier extension**: Auto-formatting
- **ESLint extension**: Real-time linting
- **TypeScript extension**: Type checking

## 🚨 Breaking Changes Policy

### When to Break
- **Security fixes**: Immediate deployment allowed
- **Critical bugs**: Patch release within 24 hours
- **API changes**: Major version bump required

### Communication
- **Breaking changes**: Documented in release notes
- **Migration guides**: Provided for major updates
- **Deprecation warnings**: 2 minor versions notice

## 📈 Continuous Improvement

### Code Reviews
- **Required**: All PRs require review
- **Standards check**: Automated quality gates
- **Pair programming**: Encouraged for complex features

### Metrics Tracking
- **Code coverage**: Monitored weekly
- **Performance**: Benchmark tracking
- **Error rates**: Application monitoring

---

## 🎯 Quick Reference

### Daily Development Commands
```bash
# Start development
bun dev

# Check code quality
bun run format:check
bun run lint

# Run tests
bun test

# Build for production
bun run build
```

### Pre-commit Checklist
- [ ] Code formatted with Prettier
- [ ] ESLint passes with no errors
- [ ] TypeScript compilation succeeds
- [ ] Tests pass
- [ ] Documentation updated

---

*This document is living and will be updated as standards evolve. Last updated: $(date)*
