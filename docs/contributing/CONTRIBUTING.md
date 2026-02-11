# 🤝 Contributing to FactoryWager

<div align="center">

[![Bun](https://img.shields.io/badge/⚡%20Bun-bb33ff?style=flat-square)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/🔷%20TypeScript-1a8cff?style=flat-square)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/📜%20License-00e673?style=flat-square)](LICENSE)

</div>

Thank you for your interest in contributing to FactoryWager! This guide will help you get started with contributing to our enterprise platform.

## 🎨 Visual Identity

We use a **bright HSL color system** for all visual elements:

| Color | HSL | Usage |
|-------|-----|-------|
| 🔮 Purple | `hsl(280, 100%, 60%)` | Bun Runtime |
| 🔷 Blue | `hsl(210, 100%, 55%)` | TypeScript |
| 🍀 Green | `hsl(150, 100%, 45%)` | Real-time Features |
| 💗 Pink | `hsl(320, 100%, 65%)` | WebSocket |
| 🔴 Red | `hsl(0, 100%, 60%)` | Security |

See [`.github/HSL-COLOR-SYSTEM.md`](../../.github/HSL-COLOR-SYSTEM.md) for full specifications.

## 🚀 Quick Start

### Prerequisites

- **Bun** 1.0+
- **Git** for version control
- **GitHub Account** for collaboration

### Setup Development Environment

```bash
# 1. Fork the repository
# Click the "Fork" button on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/project-R-score.git
cd project-R-score

# 3. Add upstream remote
git remote add upstream https://github.com/brendadeeznuts1111/project-R-score.git

# 4. Install dependencies
bun install

# 5. Setup development environment
bun run setup

# 6. Run tests to verify setup
bun test
```

## 📋 Development Workflow

### 1. Create an Issue

Before starting work, create an issue to discuss your changes:

- **Bug Reports**: Use bug report template
- **Features**: Use feature request template
- **Security**: Use security issue template (private)

### 2. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Changes

Follow our coding standards:

```typescript
// ✅ Good: Use TypeScript with strict typing
interface UserConfig {
  id: string;
  name: string;
  permissions: Permission[];
}

class UserManager {
  private config: UserConfig;
  
  constructor(config: UserConfig) {
    this.config = config;
  }
  
  async authenticate(token: string): Promise<boolean> {
    // Implementation
  }
}
```

### 4. Test Your Changes

```bash
# Run all tests
bun test

# Run specific test file
bun test lib/security/

# Run with coverage
bun test --coverage

# Run performance benchmarks
bun run benchmark

# Run linting
bun run lint

# Check formatting
bun run format:check
```

### 5. Commit Your Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(security): add atomic operations for secret management"

# Push to your fork
git push origin feature/your-feature-name
```

## 📝 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `security`: Security fixes

### Examples

```bash
feat(security): add atomic operations for secret management
fix(performance): resolve memory leak in process spawning
docs(readme): update installation instructions
test(security): add unit tests for password hashing
```

## 🔧 Code Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Rules

```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'plugin:security/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'security/detect-object-injection': 'warn'
  }
};
```

### Code Style

```typescript
// ✅ Use interfaces for type definitions
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// ✅ Use async/await instead of promises
async function fetchData(url: string): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

// ✅ Use proper error handling
class SecureOperation {
  async execute(): Promise<Result> {
    const lock = await this.acquireLock();
    try {
      return await this.performOperation();
    } finally {
      await this.releaseLock(lock);
    }
  }
}
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
// tests/security/versioned-secrets.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { VersionedSecretManager } from '../../lib/security/versioned-secrets';

describe('VersionedSecretManager', () => {
  let manager: VersionedSecretManager;
  
  beforeEach(() => {
    manager = new VersionedSecretManager();
  });
  
  describe('set()', () => {
    it('should set secret atomically', async () => {
      await manager.set('TEST_KEY', 'test-value');
      const result = await manager.get('TEST_KEY');
      expect(result.value).toBe('test-value');
    });
    
    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.set(`KEY_${i}`, `value_${i}`)
      );
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});
```

### Performance Tests

```typescript
// tests/performance/memory-pool.bench.ts
import { bench } from 'bun:test';
import { BunMemoryPool } from '../../lib/memory-pool';

bench('BunMemoryPool allocation', async () => {
  const pool = new BunMemoryPool(100);
  await pool.alloc(1024);
});

bench('BunMemoryPool concurrent allocation', async () => {
  const pool = new BunMemoryPool(100);
  const promises = Array.from({ length: 100 }, () => pool.alloc(1024));
  await Promise.all(promises);
});
```

## 🔐 Security Guidelines

### Secure Coding Practices

```typescript
// ✅ Validate inputs
function validateApiKey(key: string): boolean {
  return /^[a-zA-Z0-9]{32}$/.test(key);
}

// ✅ Use secure defaults
const secureConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536,
  timeCost: 3
};

// ✅ Handle secrets securely
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, secureConfig);
}

// ❌ Never log secrets
console.log('Secret:', secret); // DON'T DO THIS
```

### Security Review Checklist

- [ ] Input validation implemented
- [ ] No hardcoded secrets
- [ ] Proper error handling without information leakage
- [ ] Secure defaults used
- [ ] Dependencies scanned for vulnerabilities
- [ ] Thread safety considered for shared resources

## 📊 Performance Guidelines

### Optimization Principles

```typescript
// ✅ Use zero-copy operations
const fileBuffer = await Bun.file(path).arrayBuffer();
const view = new Uint8Array(fileBuffer);

// ✅ Use streaming for large files
if (fileSize > 10 * 1024 * 1024) {
  const stream = file.stream();
  await stream.pipeTo(writer);
}

// ✅ Pool resources
class ResourcePool<T> {
  private pool: T[] = [];
  
  acquire(): T {
    return this.pool.pop() || this.create();
  }
  
  release(resource: T): void {
    this.pool.push(resource);
  }
}
```

### Performance Testing

```bash
# Run benchmarks
bun run benchmark

# Profile memory usage
bun --profile script.ts

# Measure execution time
time bun run script.ts
```

## 📚 Documentation

### Code Documentation

```typescript
/**
 * Thread-safe secret manager with version tracking
 * 
 * @example
 * ```typescript
 * const manager = new VersionedSecretManager();
 * await manager.set('API_KEY', 'secret', { level: 'CRITICAL' });
 * ```
 */
export class VersionedSecretManager {
  /**
   * Store a secret with atomic operations
   * 
   * @param key - Secret key
   * @param value - Secret value
   * @param metadata - Optional metadata
   * @returns Promise resolving to version info
   * 
   * @throws {Error} When storage fails
   */
  async set(key: string, value: string, metadata?: VersionMetadata): Promise<VersionInfo> {
    // Implementation
  }
}
```

### README Updates

When adding new features:

1. Update the main README.md
2. Add API documentation to `docs/api/`
3. Include usage examples
4. Update the changelog

## 🔄 Pull Request Process

### Before Opening PR

1. **Sync with upstream**: `git pull upstream main`
2. **Run tests**: `bun test`
3. **Check formatting**: `bun run format:check`
4. **Run linting**: `bun run lint`
5. **Update documentation**: If needed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Performance tests run

## Security
- [ ] Security review completed
- [ ] No sensitive data exposed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### Review Process

1. **Automated checks**: CI/CD pipeline runs
2. **Code review**: Maintainer review required
3. **Security review**: For security-related changes
4. **Performance review**: For performance changes

## 🏷️ Issue Labels

### Priority Labels
- `p0` - Critical (security vulnerabilities, production issues)
- `p1` - High (important bugs, significant features)
- `p2` - Medium (minor bugs, enhancements)

### Team Labels
- `team-security` - Security team issues
- `team-performance` - Performance team issues
- `team-infrastructure` - Infrastructure team issues

### Type Labels
- `bug` - Bug reports
- `enhancement` - Feature requests
- `documentation` - Documentation issues
- `security` - Security issues

## 🚀 Release Process

### Version Management

We use [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- `MAJOR`: Breaking changes
- `MINOR`: New features (backward compatible)
- `PATCH`: Bug fixes (backward compatible)

### Release Checklist

1. **Update version** in package.json
2. **Update CHANGELOG.md**
3. **Create release tag**: `git tag v1.2.3`
4. **Push tag**: `git push origin v1.2.3`
5. **Create GitHub release**
6. **Update documentation**

## 🆘 Getting Help

### Resources

- **Documentation**: [docs/](docs/)
- **API Reference**: [docs/api/](docs/api/)
- **Issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/project-R-score/issues)
- **Discussions**: [GitHub Discussions](https://github.com/brendadeeznuts1111/project-R-score/discussions)

### Contact

- **Maintainers**: @brendadeeznuts1111
- **Security Issues**: Use private security issue
- **General Questions**: Use GitHub Discussions

## Optional Local Pre-commit Hook

This repository includes an optional local hook at:

- `/Users/nolarose/Projects/.githooks/pre-commit`

Enable it in your local clone:

```bash
git config core.hooksPath .githooks
```

Hook checks:

1. `bun run imports:verify`
2. `bun test tests/docs-urls-regression.test.ts`
3. `bun test packages/docs-tools/src/documentation-validator.test.ts`

Run the same checks manually:

```bash
bun run precommit:check
```

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- **Respect**: Treat all contributors with respect
- **Inclusivity**: Welcome diverse perspectives
- **Collaboration**: Work together constructively
- **Learning**: Help others learn and grow

### Unacceptable Behavior

- Harassment or discrimination
- Personal attacks or insults
- Spam or off-topic content
- Disruptive behavior

### Reporting

Report violations to maintainers or use GitHub's reporting features.

---

Thank you for contributing to FactoryWager! 🎉

Your contributions help make enterprise-grade software more secure, performant, and reliable.
