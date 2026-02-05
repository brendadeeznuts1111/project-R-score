# Contributing to Dev HQ

Thank you for your interest in contributing to Dev HQ! We welcome contributions from the community.

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/brendadeeznuts1111/geelark.git
cd geelark
```

### 2. Set up Development Environment
```bash
# Install dependencies
bun install

# Run setup (if available)
bun run setup-dev

# Verify everything works
bun test
bun run type-check
```

### 3. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/issue-description
```

### 4. Make Your Changes
- Write clear, concise code
- Add tests for new functionality
- Update documentation as needed
- Follow TypeScript best practices
- Use Bun's APIs when possible

### 5. Test Your Changes
```bash
# Run all tests
bun test

# Run specific test suites
bun test:unit
bun test:integration
bun test:e2e

# Check TypeScript compilation
bun run type-check

# Run linting
bun run lint
```

### 6. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with conventional format
git commit -m "feat: add amazing new feature"
git commit -m "fix: resolve issue with authentication"
git commit -m "docs: update API documentation"
```

### 7. Push and Create Pull Request
```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
# - Use a clear title
# - Provide detailed description
# - Reference any related issues
```

## Commit Conventions

We follow [Conventional Commits](https://conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `test:` | Testing changes |
| `refactor:` | Code refactoring |
| `perf:` | Performance improvements |
| `chore:` | Maintenance tasks |
| `security:` | Security-related changes |

## Development Guidelines

### Code Style
- **TypeScript First**: All new code must be written in TypeScript
- **Bun-Pure Standards**: Leverage Bun's built-in APIs instead of adding dependencies
- **Clear Naming**: Use descriptive variable and function names
- **Documentation**: Add JSDoc comments for public APIs
- **Error Handling**: Implement proper error handling and logging

### Testing
- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows
- **Type Tests**: Use `expectTypeOf` for type validation
- **Coverage**: Aim for >80% test coverage

### Feature Flags
When adding new features, consider using the feature flag system:
- Add flag definitions to `src/constants/features/compile-time.ts`
- Implement feature-gated code
- Update build configurations
- Document the feature flag

### Documentation
- Update relevant README files
- Add code examples for new APIs
- Update the changelog
- Ensure all links work correctly

## Getting Help

- 📖 **Documentation**: Check the `docs/` directory
- 🐛 **Issues**: Search existing GitHub issues
- 💬 **Discussions**: Use GitHub Discussions for questions
- 📧 **Email**: dev-hq@example.com for support

## Recognition

Contributors will be recognized in:
- The changelog for significant contributions
- GitHub's contributor insights
- Future release notes

Thank you for contributing to Dev HQ! 🚀
