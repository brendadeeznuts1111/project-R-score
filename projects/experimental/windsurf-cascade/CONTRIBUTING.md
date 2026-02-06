# Contributing to Odds Protocol

Thank you for your interest in contributing to the Odds Protocol! This guide will help you get started and ensure your contributions are successful.

## 🚀 Getting Started

### Prerequisites

- **Bun 1.3.0+**: High-performance JavaScript runtime
- **Node.js 20+**: For certain development tools
- **Git**: Version control
- **VS Code**: Recommended IDE (with extensions)

### Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/odds-protocol.git
   cd odds-protocol
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Setup Environment**
   ```bash
   cp config/environment/.env.example .env
   # Edit .env with your configuration
   ```

4. **Run Initial Setup**
   ```bash
   bun run automation:setup
   ```

5. **Verify Installation**
   ```bash
   bun run test:all
   bun run typecheck
   ```

## 🏗️ Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-fix-name
```

### 2. Development

- **Start Development Server**
  ```bash
  bun run dev
  ```

- **Run Tests Continuously**
  ```bash
  bun run test:watch
  ```

- **Type Check**
  ```bash
  bun run typecheck
  ```

### 3. Code Quality Standards

#### **Golden Rules Compliance**

All code must follow our [Golden Rules](./docs/golden-rules.md):

```bash
bun run rules:validate
```

#### **Linting and Formatting**

```bash
bun run lint
bun run format
```

#### **Type Safety**

- Strict TypeScript mode enabled
- No `any` types unless absolutely necessary
- Proper interface definitions
- Comprehensive type coverage

### 4. Testing Requirements

#### **Test Coverage**

- **Unit Tests**: 80%+ coverage required
- **Integration Tests**: Critical paths must be covered
- **Property Tests**: For complex algorithms
- **Performance Tests**: For performance-critical code

#### **Test Categories**

```bash
bun run test:unit         # Unit tests
bun run test:integration  # Integration tests
bun run test:property     # Property-based tests
bun run test:performance  # Performance tests
```

#### **Writing Tests**

```typescript
// Example unit test
import { describe, it, expect } from 'bun:test';
import { calculateOdds } from '../src/odds-calculator';

describe('calculateOdds', () => {
  it('should calculate correct odds for valid input', () => {
    const result = calculateOdds({ home: 2.0, away: 3.5 });
    expect(result.homeWin).toBeCloseTo(0.36, 2);
  });

  it('should handle edge cases', () => {
    expect(() => calculateOdds({ home: 0, away: 0 })).toThrow();
  });
});
```

### 5. Documentation

#### **Code Documentation**

- JSDoc comments for all public APIs
- Inline comments for complex logic
- Type annotations for all functions

#### **README Updates**

- Update relevant README files
- Document new features
- Update configuration examples

## 📦 Package Development

### Creating New Packages

1. **Create Package Structure**
   ```bash
   mkdir packages/your-package
   cd packages/your-package
   ```

2. **Initialize Package**
   ```json
   {
     "name": "@odds-protocol/your-package",
     "version": "1.0.0",
     "main": "src/index.ts",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "bun build src/index.ts --outdir dist",
       "test": "bun test src/tests",
       "lint": "bunx eslint src"
     }
   }
   ```

3. **Add to Workspace**
   ```json
   // root package.json
   "workspaces": {
     "packages": [
       "packages/*",
       "packages/your-package"
     ]
   }
   ```

### Package Standards

- **TypeScript**: Strict mode enabled
- **Testing**: Comprehensive test suite
- **Documentation**: API documentation
- **Dependencies**: Minimal and justified
- **Performance**: Benchmarks for critical operations

## 🔧 Architecture Guidelines

### Core Principles

1. **Performance First**: Optimize for 700k+ msg/sec throughput
2. **Type Safety**: Leverage TypeScript for reliability
3. **Modularity**: Clear separation of concerns
4. **Testing**: Comprehensive test coverage
5. **Documentation**: Self-documenting code

### Code Organization

```text
packages/your-package/
├── src/
│   ├── index.ts          # Main exports
│   ├── core/             # Core functionality
│   ├── utils/            # Utility functions
│   ├── types/            # Type definitions
│   └── tests/            # Test files
├── dist/                 # Built files
├── docs/                 # Documentation
├── package.json          # Package configuration
└── README.md             # Package documentation
```

### Performance Guidelines

- **Memory Management**: Avoid memory leaks
- **Async Patterns**: Use async/await properly
- **Streaming**: Use streams for large data
- **Caching**: Implement appropriate caching
- **Profiling**: Profile performance-critical code

## 🧪 Testing Guidelines

### Test Structure

```typescript
// Test file organization
describe('ModuleName', () => {
  describe('FunctionName', () => {
    it('should handle happy path', () => {
      // Test
    });

    it('should handle edge cases', () => {
      // Edge case tests
    });

    it('should handle errors', () => {
      // Error handling tests
    });
  });
});
```

### Property-Based Testing

```typescript
import { fc } from 'fast-check';

describe('calculateOdds', () => {
  it('should maintain mathematical properties', () => {
    fc.assert(
      fc.property(fc.float({ min: 0.1, max: 10 }), fc.float({ min: 0.1, max: 10 }), 
        (home, away) => {
          const result = calculateOdds({ home, away });
          return result.homeWin + result.awayWin + result.draw <= 1.01;
        }
      ),
      { numRuns: 1000 }
    );
  });
});
```

### Performance Testing

```typescript
describe('Performance', () => {
  it('should handle 100k calculations within time limit', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100000; i++) {
      calculateOdds({ home: 2.0, away: 3.5 });
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // 1 second
  });
});
```

## 📝 Commit Guidelines

### Commit Message Format

```text
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
git commit -m "feat(websocket): add connection pooling"
git commit -m "fix(arbitrage): handle zero division edge case"
git commit - -m "docs(readme): update installation instructions"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run All Tests**
   ```bash
   bun run test:all
   ```

2. **Validate Rules**
   ```bash
   bun run rules:validate
   ```

3. **Type Check**
   ```bash
   bun run typecheck
   ```

4. **Update Documentation**
   - README files
   - API documentation
   - Code comments

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
- [ ] Performance tests updated

## Checklist
- [ ] Code follows project guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Golden rules validated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline validation
2. **Code Review**: At least one maintainer review
3. **Testing**: All tests must pass
4. **Performance**: No performance regressions
5. **Documentation**: Documentation must be updated

## 🚨 Common Issues

### TypeScript Errors

- **Missing Types**: Add proper type definitions
- **Any Types**: Replace with specific types
- **Async/Await**: Use proper async patterns

### Performance Issues

- **Memory Leaks**: Check for proper cleanup
- **Blocking Operations**: Use async patterns
- **Large Objects**: Consider streaming

### Test Failures

- **Flaky Tests**: Fix test reliability
- **Missing Coverage**: Add comprehensive tests
- **Slow Tests**: Optimize test performance

## 📞 Getting Help

### Resources

- **Documentation**: [./docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/odds-protocol/issues)
- **Discussions**: [GitHub Discussions](https://github.com/odds-protocol/discussions)
- **Discord**: [Community Discord](https://discord.gg/odds-protocol)

### Contact

- **Maintainers**: @odds-protocol/maintainers
- **Support**: support@odds-protocol.com
- **Security**: security@odds-protocol.com

## 🏆 Recognition

Contributors are recognized through:

- **Contributors List**: In README and documentation
- **Release Notes**: Mentioned in release notes
- **Community**: Highlighted in community channels
- **Swag**: Contributors receive project swag

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Odds Protocol! 🚀
