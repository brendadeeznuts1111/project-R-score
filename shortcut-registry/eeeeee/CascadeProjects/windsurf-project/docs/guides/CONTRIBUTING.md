# Contributing to Windsurf Project

Thank you for your interest in contributing to the Windsurf fraud detection system! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites
- Bun (latest version)
- Node.js 18+ (for some dev tools)
- Git

### Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/windsurf-project.git
   cd windsurf-project
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🛠️ Development Workflow

### Running the System
```bash
# Start the fraud detection system
bun run cli/risk-hunter.ts

# Run tests
bun test

# Build the project
bun run build

# Run benchmarks
bun run bench/dashboard.bench.ts
```

### Code Quality
```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Formatting
bun run format
```

## 📁 Project Structure

```
windsurf-project/
├── ai/                    # AI/ML components
│   ├── anomaly-bench.ts   # Benchmarking suite
│   ├── anomaly-predict.ts # Core prediction engine
│   └── model-config.json  # Model configuration
├── bench/                 # Performance benchmarks
├── cli/                   # Command-line interface
├── dashboard/             # Web dashboard
├── docs/                  # Documentation
├── fraud-oracle/          # Fraud detection logic
├── ghost-shield/          # Privacy & proxy detection
├── feature-weights/       # Feature weight management
└── types/                 # TypeScript definitions
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test basic.test.ts

# Run tests with coverage
bun test --coverage
```

### Writing Tests
- Test files should end with `.test.ts` or `.spec.ts`
- Use Bun's built-in test runner
- Follow the AAA pattern: Arrange, Act, Assert

Example:
```typescript
import { test, expect } from 'bun:test';

test('fraud detection works correctly', () => {
  // Arrange
  const features = { root_detected: 1, vpn_active: 1, thermal_spike: 15, biometric_fail: 3, proxy_hop_count: 4 };
  
  // Act
  const result = predictRisk(features, 'test-session', 'test-merchant');
  
  // Assert
  expect(result.blocked).toBe(true);
  expect(result.score).toBeGreaterThan(0.9);
});
```

## 📝 Code Style

### TypeScript
- Use strict TypeScript mode
- Prefer explicit type annotations
- Use `type` imports for type-only imports
- Follow the existing naming conventions

### Naming Conventions
- **Variables**: `camelCase`
- **Functions**: `camelCase` with descriptive names
- **Classes**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Files**: `kebab-case.ts`

### Example
```typescript
// Good
const featureVector: FeatureVector = {
  root_detected: 0,
  vpn_active: 1
};

function calculateRiskScore(features: FeatureVector): number {
  return features.vpn_active * 0.3 + features.root_detected * 0.5;
}

// Bad
const fv = { rd: 0, va: 1 };
function calc(x) { return x.va * 0.3; }
```

## 🤝 Submitting Changes

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

### Commit Messages
Follow the conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```
feat(ai): add new anomaly detection algorithm
fix(cli): resolve parameter parsing issue
docs(readme): update installation instructions
```

### Pull Request Process
1. Update documentation if needed
2. Ensure all tests pass
3. Update the CHANGELOG.md
4. Submit a pull request with:
   - Clear title and description
   - Link to relevant issues
   - Screenshots if applicable

## 🐛 Bug Reports

When filing bug reports, please include:
- Environment information (OS, Bun version)
- Steps to reproduce
- Expected vs actual behavior
- Error messages and logs
- Any relevant configuration

## 💡 Feature Requests

Feature requests should:
- Describe the problem you're trying to solve
- Explain why this feature would be useful
- Consider alternative approaches
- Include examples of how it would be used

## 📊 Performance

### Benchmarking
- Use the built-in benchmarking suite
- Include before/after metrics for optimizations
- Test with realistic data volumes
- Consider memory usage and CPU performance

### Performance Guidelines
- Avoid unnecessary allocations in hot paths
- Use appropriate data structures
- Profile before optimizing
- Consider async/await for I/O operations

## 🔒 Security

### Security Considerations
- Never commit sensitive data
- Use environment variables for configuration
- Validate all inputs
- Follow secure coding practices
- Report security issues privately

## 📚 Documentation

### Documentation Types
- **API Docs**: Code comments with TSDoc
- **User Docs**: README and guides
- **Dev Docs**: CONTRIBUTING.md and technical docs
- **Architecture Docs**: High-level system design

### Documentation Standards
- Keep documentation up to date
- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts

## 🏷️ Release Process

### Versioning
Follow Semantic Versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps
1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag: `git tag v1.2.3`
4. Push tag: `git push origin v1.2.3`
5. GitHub Actions will automatically publish

## 🤖 Development Tools

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- Bun extension
- ESLint
- Prettier
- GitLens

### Useful Commands
```bash
# Check for outdated dependencies
bun outdated

# Audit for security vulnerabilities
bun audit

# Clean build artifacts
rm -rf dist/

# Generate type documentation
bun run type-docs
```

## 📞 Getting Help

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the docs/ folder and README
- **Examples**: Look at the test files and CLI examples

## 🙏 Code of Conduct

Please be respectful and constructive in all interactions. We're here to build great software together!

---

Thank you for contributing to Windsurf Project! 🎉
