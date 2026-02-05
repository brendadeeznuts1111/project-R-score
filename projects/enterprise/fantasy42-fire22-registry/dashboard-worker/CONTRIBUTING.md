# Contributing to Fire22 Dashboard Worker

Thank you for your interest in contributing to the Fire22 Dashboard Worker
project! This document provides guidelines and information for contributors.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Requirements](#testing-requirements)
8. [Security Guidelines](#security-guidelines)
9. [Documentation](#documentation)
10. [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be respectful**: Treat all community members with respect and kindness
- **Be inclusive**: Welcome newcomers and create an inclusive environment
- **Be collaborative**: Work together constructively and help others
- **Be professional**: Maintain professional standards in all interactions
- **Focus on the project**: Keep discussions relevant and constructive

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Bun** >= 1.2.20 installed
- **Git** for version control
- **Node.js** >= 18.0.0 (fallback support)
- **TypeScript** knowledge
- **Cloudflare Workers** familiarity (for deployment features)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/fire22-dashboard-worker.git
cd fire22-dashboard-worker

```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/brendadeeznuts1111/fire22-dashboard-worker.git
```

## Development Setup

### Initial Setup

```bash
# Install dependencies
bun install --frozen-lockfile

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Verify setup
bun run test:quick
bun run lint

```

### Environment Configuration

```bash
# Set up development environment
bun run env:setup development

# Validate configuration
bun run env:validate

# Run security audit
bun run security:audit

```

## Contributing Guidelines

### Types of Contributions

We welcome the following types of contributions:

- **Bug fixes**: Fix issues and improve stability
- **New features**: Add new functionality (discuss first in issues)
- **Documentation**: Improve docs, guides, and examples
- **Performance**: Optimize code and improve performance
- **Testing**: Add or improve test coverage
- **Security**: Enhance security measures

### Before You Start

1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For new features or significant changes
3. **Discuss approach**: Get feedback before investing significant time
4. **Follow conventions**: Use our coding standards and commit format

### Branch Strategy & Protection

- **main**: Production-ready code (protected)
  - Requires 2 approved reviews
  - Must pass all CI checks
  - Code owner approval required
  - No direct pushes allowed
- **develop**: Active development (lightly protected)
  - Requires 1 approved review
  - Code owner approval required
- **feature/**: New features (`feature/add-real-time-metrics`)
- **bugfix/**: Bug fixes (`bugfix/fix-auth-timeout`)
- **hotfix/**: Critical production fixes
- **docs/**: Documentation updates

### Commit Message Format

Follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Testing
- `chore`: Maintenance tasks

**Scopes:**

- `core`: Core dashboard
- `api`: API client
- `pattern`: Pattern system
- `betting`: Sports betting
- `telegram`: Telegram integration
- `build`: Build system
- `security`: Security features

**Examples:**

```bash
feat(api): add real-time wager tracking

Implements Server-Sent Events for live wager updates
- Updates every 5 seconds
- Includes filtering by agent
- Adds error handling for connection issues

Closes #123

fix(auth): resolve JWT token expiration issue

The JWT middleware was not properly handling token renewal.
Now implements automatic token refresh.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:

```bash
git fetch upstream
git rebase upstream/develop

```

2. **Run quality checks**:

```bash
# Code quality
bun run quality:check

# Security audit
bun run security:audit

# Full test suite
bun test --coverage

# Build verification
bun run scripts/enhanced-executable-builder.ts

# Workspace health
bun run scripts/workspace-health-monitor.ts

```

3. **Update documentation** if needed

### PR Guidelines

- **Clear title**: Descriptive and concise
- **Detailed description**: Explain what and why
- **Link issues**: Reference related issues
- **Add tests**: Include test coverage for new features
- **Update docs**: Update relevant documentation
- **Small PRs**: Keep changes focused and reviewable

### PR Template

Use our PR template:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## Coding Standards

### TypeScript Guidelines

- **Strict mode**: Use TypeScript strict mode
- **Type safety**: Avoid `any`, use proper types
- **Interfaces**: Define clear interfaces for data structures
- **Null safety**: Handle null/undefined cases
- **Import organization**: Group and sort imports

### Code Style

- **Prettier**: Use Prettier for formatting
- **ESLint**: Follow ESLint rules
- **Naming**: Use descriptive, camelCase names
- **Comments**: Document complex logic
- **File structure**: Follow project organization

### Performance Guidelines

- **Bun-native**: Use Bun's native features where possible
- **Bundle size**: Keep workspace bundles under limits
- **Async/await**: Use proper async patterns
- **Memory**: Avoid memory leaks
- **Caching**: Implement appropriate caching

## Testing Requirements

### Test Coverage

- **Minimum 80%** overall test coverage
- **90%+ for critical paths**
- All new features must include tests
- Bug fixes must include regression tests

### Testing Strategy

```bash
# Unit tests
bun test

# Integration tests
bun run test:integration

# End-to-end tests
bun run test:e2e

# Performance tests
bun run test:performance

# Security tests
bun run security:scanner-test

```

### Test Organization

- **Unit tests**: `test/` or alongside source files
- **Integration**: `test/integration/`
- **E2E tests**: `test/e2e/`
- **Fixtures**: `test/fixtures/`

## Security Guidelines

### Security Requirements

- **No secrets in code**: Use environment variables
- **Input validation**: Validate all inputs
- **SQL injection**: Use parameterized queries
- **XSS protection**: Sanitize outputs
- **Authentication**: Implement proper auth
- **HTTPS only**: Ensure secure connections

### Security Testing

```bash
# Security audit
bun run security:audit

# Vulnerability scan
bun audit --audit-level=high

# Credential leak check
grep -r "password\|secret\|token" src/

```

## Documentation

### Documentation Requirements

- **Code comments**: Document complex functions
- **README updates**: Keep README current
- **API docs**: Document public APIs
- **Examples**: Provide usage examples
- **Architecture docs**: Update system design docs

### Documentation Style

- **Clear and concise**: Easy to understand
- **Examples**: Include code examples
- **Structure**: Use consistent formatting
- **Links**: Cross-reference related docs
- **Up-to-date**: Keep documentation current

## Community

### Communication

- **GitHub Issues**: Report bugs, request features (with templates)
- **GitHub Discussions**: Ask questions, share ideas
- **Pull Requests**: Code review and collaboration (with comprehensive template)
- **Code Owners**: Automatic review assignment based on CODEOWNERS
- **Project Boards**: Track progress across workspaces

### Getting Help

- **Documentation**: Check existing docs first
- **Issues**: Search existing issues
- **Discussions**: Ask questions in discussions
- **Discord**: Join Fire22 Discord for real-time chat

### Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md**: List of contributors
- **Release notes**: Credit for significant contributions
- **GitHub contributors**: Automatic GitHub recognition

## Review Process

### Code Review

All contributions go through code review:

1. **Automated checks**: CI/CD pipeline runs tests
2. **Peer review**: Team members review code
3. **Feedback**: Address review comments
4. **Approval**: Get approval from maintainers
5. **Merge**: Code is merged to develop/main

### Review Criteria

- **Functionality**: Does it work as intended?
- **Code quality**: Is it well-written and maintainable?
- **Performance**: Does it meet performance requirements?
- **Security**: Are there security considerations?
- **Testing**: Is it properly tested?
- **Documentation**: Is it documented appropriately?
- **Workspace isolation**: Does it respect workspace boundaries?
- **CI/CD compatibility**: Does it work with our automation?

### Automated Quality Gates

All PRs must pass:

- 🔍 **Code Quality & Linting**: ESLint, Prettier, TypeScript checks
- 🔒 **Security Scanning**: Dependency audit, secret detection, SAST
- 🧪 **Test Suite**: Unit, integration, and edge case tests for affected
  workspaces
- 🏗️ **Build Verification**: Cross-platform executable compilation
- 🏢 **Workspace Health**: Workspace consistency and isolation validation

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Cycle

- **Regular releases**: Monthly minor releases
- **Patch releases**: As needed for bug fixes
- **Major releases**: When breaking changes accumulate

## License

By contributing to Fire22 Dashboard Worker, you agree that your contributions
will be licensed under the project's proprietary license. See [LICENSE](LICENSE)
file for details.

## Questions?

If you have questions about contributing, please:

1. Check this document and existing documentation
2. Search existing issues and discussions
3. Create a new discussion or issue
4. Contact maintainers: engineering@fire22.com

Thank you for contributing to Fire22 Dashboard Worker! 🚀
