# Contributing to Foxy Proxy

Thank you for your interest in contributing to Foxy Proxy! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Bun**: Latest version (https://bun.sh/)
- **Node.js**: 18.x or higher
- **Git**: For version control

### Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies:
   ```bash
   bun install
   cd packages/dashboard && bun install
   ```

### Development

```bash
# Start development server
bun run dev

# Run tests
bun run test

# Type checking
bun run typecheck

# Linting
bun run lint
```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Use consistent formatting
- **Conventional Commits**: Use semantic commit messages

### Feature Flags

When adding new features, consider using feature flags:

```typescript
// Check if feature is enabled
if (isNewFeatureEnabled()) {
  // Feature implementation
}
```

### Component Structure

```typescript
// Component file structure
src/components/
├── ComponentName/
│   ├── index.ts          // Exports
│   ├── ComponentName.tsx // Main component
│   ├── ComponentName.test.tsx // Tests
│   └── styles.module.css // Styles (if needed)
```

### Testing

- **Unit Tests**: For utility functions and hooks
- **Integration Tests**: For component interactions
- **E2E Tests**: For critical user flows
- **Coverage**: Aim for 80%+ coverage

## 🔄 Git Workflow

### Branch Strategy

- **main**: Stable, production-ready code
- **refactor**: Development and feature work
- **feature/xyz**: Specific feature branches

### Commit Messages

Use conventional commit format:

```
type(scope): description

feat(core): add feature flag system
fix(ui): resolve React hooks violation
docs(readme): update installation guide
```

### Pull Requests

1. Create feature branch from `refactor`
2. Make changes with proper commits
3. Add tests for new functionality
4. Update documentation
5. Create PR to `refactor` or `main`

## 🏗️ Architecture

### Monorepo Structure

```
foxy-proxy/
├── packages/
│   └── dashboard/          # Main React application
├── scripts/                # Build and utility scripts
├── docs/                   # Documentation
└── examples/               # Usage examples
```

### Key Directories

- **src/components/**: Reusable UI components
- **src/pages/**: Feature-based page components
- **src/utils/**: Utility functions and helpers
- **src/hooks/**: Custom React hooks
- **src/types/**: TypeScript type definitions

## 📝 Documentation

### Code Comments

- **JSDoc**: For public APIs
- **Inline**: For complex logic
- **TODO/FIXME**: For temporary notes

### README Updates

- Update main README for major features
- Add component-specific READMEs for complex components
- Include usage examples

## 🧪 Testing Guidelines

### Test Structure

```typescript
// Test file example
describe("ComponentName", () => {
  it("should render correctly", () => {
    // Test implementation
  });

  it("should handle user interactions", () => {
    // Interaction tests
  });
});
```

### Mock Data

- Use consistent mock data
- Mock external dependencies
- Test error states

## 🐛 Bug Reports

### Bug Report Template

```markdown
## Description

Brief description of the bug

## Steps to Reproduce

1. Go to...
2. Click on...
3. See error

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 108]
- Version: [e.g. 1.0.0]
```

## ✨ Feature Requests

### Feature Request Template

```markdown
## Description

Clear description of the feature

## Problem Statement

What problem does this solve?

## Proposed Solution

How should this work?

## Alternatives

What alternatives have you considered?

## Additional Context

Any other context or screenshots
```

## 📊 Performance

### Guidelines

- **Bundle Size**: Keep under 5MB
- **Load Time**: Optimize for <3s initial load
- **Memory Usage**: Monitor for memory leaks
- **Animations**: Use CSS transforms for smooth animations

## 🔒 Security

### Guidelines

- **Input Validation**: Validate all user inputs
- **API Keys**: Never commit secrets
- **Dependencies**: Audit dependencies regularly
- **XSS Prevention**: Sanitize user content

## 🚀 Release Process

### Version Bumping

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Create GitHub release

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Tag created
- [ ] Release published

## 🤝 Community

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Help others learn

### Getting Help

- Create an issue for bugs
- Start a discussion for questions
- Join our Discord/Slack (if available)

## 📞 Contact

- **Issues**: https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues
- **Discussions**: https://github.com/brendadeeznuts1111/foxy-duo-proxy/discussions
- **Email**: support@foxyproxy.com

---

Thank you for contributing to Foxy Proxy! 🎉
