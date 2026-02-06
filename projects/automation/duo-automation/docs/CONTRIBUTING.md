# Contributing to DuoPlus Automation

🚀 **Welcome to the DuoPlus Automation project!** We're excited to have you contribute to our advanced artifact management and automation system.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Community Guidelines](#community-guidelines)

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Bun** >= 1.0.0 (preferred runtime)
- **Git** >= 2.30.0
- **VS Code** (recommended, with our extensions)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/duo-automation.git
cd duo-automation

# Install dependencies
bun install

# Run the development server
bun run dev

# Run tests
bun test

# Start the artifact dashboard
bun run scripts/dashboard.ts
```

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR-USERNAME/duo-automation.git
cd duo-automation

# Add upstream remote
git remote add upstream https://github.com/brendadeeznuts1111/duo-automation.git
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Development Environment

```bash
# Start development mode
bun run dev

# Run the interactive dashboard
bun run scripts/dashboard.ts

# Run artifact tag system
bun run scripts/tag-system.ts --help
```

### 4. VS Code Setup

Install our recommended extensions:

```bash
# Install VS Code extensions
code --install-extension oven.bun
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
```

## 🤝 How to Contribute

### Types of Contributions

We welcome the following types of contributions:

- 🐛 **Bug Fixes** - Help us squash bugs!
- ✨ **New Features** - Propose and implement new functionality
- 📚 **Documentation** - Improve our docs and guides
- 🧪 **Tests** - Add or improve test coverage
- 🎨 **UI/UX** - Improve user experience and design
- 🔧 **Performance** - Optimize and speed up the system
- 🛡️ **Security** - Help us maintain security
- 🌐 **Internationalization** - Add translations and localization

### Finding Issues to Work On

1. **Good First Issues** - Look for issues with the `good first issue` label
2. **Help Wanted** - Issues needing community help
3. **Bug Reports** - Help us fix reported issues
4. **Feature Requests** - Propose new functionality

### Creating an Issue

When creating a new issue, please include:

- **Clear Title** - Descriptive and concise
- **Detailed Description** - What, why, and how
- **Steps to Reproduce** - For bug reports
- **Expected Behavior** - What should happen
- **Actual Behavior** - What actually happens
- **Environment** - OS, Node/Bun version, etc.
- **Additional Context** - Any relevant information

## 📏 Code Standards

### TypeScript Standards

```typescript
// Use interfaces for type definitions
interface ArtifactConfig {
  name: string;
  version: string;
  tags: string[];
}

// Use proper async/await
async function processArtifact(config: ArtifactConfig): Promise<void> {
  try {
    await validateConfig(config);
    await executeProcessing(config);
  } catch (error) {
    handleError(error);
  }
}

// Use JSDoc comments
/**
 * Processes an artifact with the given configuration
 * @param config - The artifact configuration
 * @throws {ValidationError} When config is invalid
 */
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `artifact-processor.ts`)
- **Classes**: `PascalCase` (e.g., `ArtifactProcessor`)
- **Functions**: `camelCase` (e.g., `processArtifact`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Interfaces**: `PascalCase` with `I` prefix (e.g., `IArtifactConfig`)

### Code Style

We use **Prettier** and **ESLint** for consistent code formatting:

```bash
# Format code
bun run format

# Lint code
bun run lint

# Fix linting issues
bun run lint:fix
```

### Tag Standards

Follow our structured tag format: `[DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*][BUN-NATIVE]`

```typescript
/**
 * Core system component
 * [CORE][SYSTEM][TYPESCRIPT][META:version=1.0][CRITICAL][BUN-NATIVE]
 */
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
// File: tests/artifact-processor.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { ArtifactProcessor } from '../src/artifact-processor';

describe('ArtifactProcessor', () => {
  let processor: ArtifactProcessor;

  beforeEach(() => {
    processor = new ArtifactProcessor();
  });

  it('should process valid artifact', async () => {
    const config = { name: 'test', version: '1.0.0', tags: ['#test'] };
    const result = await processor.process(config);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid config', async () => {
    const config = { name: '', version: 'invalid' };
    await expect(processor.process(config)).rejects.toThrow();
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test tests/artifact-processor.test.ts

# Run tests in watch mode
bun test --watch
```

### Test Coverage

- **Target**: 90%+ code coverage
- **Critical Paths**: 100% coverage required
- **Utilities**: 80%+ coverage acceptable

## 📚 Documentation

### Documentation Types

1. **Code Documentation** - JSDoc comments in source code
2. **API Documentation** - Auto-generated from TypeScript interfaces
3. **User Guides** - Step-by-step tutorials
4. **Developer Docs** - Architecture and contribution guides
5. **README Files** - Project and component documentation

### Writing Documentation

```markdown
# Feature Title

Brief description of the feature.

## Usage

```bash
command example
```text

## Examples

Provide clear examples with expected output.

## API Reference

Link to auto-generated API docs.

## Contributing

How to contribute to this feature.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code standards
   - Add tests for new functionality
   - Update documentation
   - Ensure all tests pass

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Requirements

- **Clear Title** - Describe what the PR does
- **Detailed Description** - Why and how changes were made
- **Testing** - All tests must pass
- **Documentation** - Updated for any user-facing changes
- **Breaking Changes** - Clearly labeled and explained

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 🚀 Release Process

### Version Management

We use **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version**
   ```bash
   npm version patch|minor|major
   ```

2. **Update CHANGELOG**
   ```bash
   bun run changelog
   ```

3. **Create release tag**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

4. **Publish to npm**
   ```bash
   npm publish
   ```

### Release Types

- **Alpha**: Early development (`1.0.0-alpha.1`)
- **Beta**: Feature complete (`1.0.0-beta.1`)
- **RC**: Release candidate (`1.0.0-rc.1`)
- **Stable**: Production ready (`1.0.0`)

## 🌍 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and discussions
- **Discord** - Real-time chat (invite link in README)
- **Twitter** - Updates and announcements

### Getting Help

1. **Check Documentation** - Look for answers in our docs
2. **Search Issues** - See if your question has been asked
3. **Create Issue** - If you can't find an answer
4. **Join Discord** - For real-time help

## 🏆 Recognition

### Contributors

We recognize all contributions through:

- **GitHub Contributors** - Automatic recognition
- **Release Notes** - Mentioned in releases
- **Contributor List** - Maintained in documentation
- **Special Thanks** - For exceptional contributions

### Becoming a Maintainer

Active contributors may be invited to become maintainers:

1. **Consistent Contributions** - Regular, quality contributions
2. **Code Review** - Active participation in reviews
3. **Community Support** - Helping others in issues
4. **Technical Excellence** - Deep understanding of the project

## 📞 Getting Started Checklist

- [ ] Fork the repository
- [ ] Set up development environment
- [ ] Read the code standards
- [ ] Find an issue to work on
- [ ] Create your feature branch
- [ ] Make your changes
- [ ] Add tests
- [ ] Update documentation
- [ ] Submit pull request
- [ ] Respond to feedback

## 🎯 Next Steps

Ready to contribute? Here's what to do next:

1. **Star the repository** - Show your support
2. **Watch for issues** - Stay updated
3. **Join discussions** - Participate in community
4. **Find your first issue** - Look for `good first issue` label
5. **Make your first contribution** - We're here to help!

---

## 📞 Questions?

If you have any questions about contributing, please:

- 📧 **Email**: maintainers@duoplus.dev
- 💬 **Discord**: [Join our Discord](https://discord.gg/duoplus)
- 🐛 **GitHub**: [Create an issue](https://github.com/brendadeeznuts1111/duo-automation/issues)

---

**Thank you for contributing to DuoPlus Automation! 🚀**

*Every contribution, no matter how small, helps make this project better.*
