# Contributing to @bun-tools/markdown-constants

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd bun-markdown-constants

# Install dependencies
bun install

# Link for local development
bun link
```

## Running Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test file
bun test test/regression.test.ts

# Run verification script
bun run verify
```

## Running Benchmarks

```bash
# Run performance benchmarks
bun run benchmark

# Run interactive demo
bun run demo
```

## Project Structure

```
bun-markdown-constants/
├── src/
│   └── index.ts              # Main source code
├── test/
│   ├── bun-137-features.test.ts   # Bun v1.3.7 feature tests
│   ├── regression.test.ts         # Performance regression tests
│   └── verify.ts                  # Standalone verification
├── benchmark/
│   └── performance.bench.ts       # Benchmarks
├── demo/
│   └── demo.ts                    # Interactive demo
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI configuration
├── README.md
├── CHANGELOG.md
└── package.json
```

## Adding New Features

### Adding a New Preset

```typescript
// In src/index.ts
export const MARKDOWN_FEATURES = {
  // ... existing presets
  
  /** Your new preset */
  YOUR_PRESET: {
    tables: true,
    strikethrough: true,
    // ... other options
  } as const,
};
```

### Adding a New Renderer

```typescript
// In src/index.ts
export const HTML_RENDERERS = {
  // ... existing renderers
  
  YOUR_RENDERER: {
    heading: (children, { level }) => `<h${level}>${children}</h${level}>`,
    paragraph: (children) => `<p>${children}</p>`,
    // ... other renderers
  } as const,
};
```

## Testing Guidelines

### Writing Tests

All tests should be placed in the `test/` directory with the `.test.ts` extension:

```typescript
import { describe, test, expect } from "bun:test";
import { YourFeature } from "../src/index";

describe("Your Feature", () => {
  test("should do something", () => {
    const result = YourFeature.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Performance Regression Tests

For performance-critical features, add regression tests:

```typescript
test("your feature maintains performance", () => {
  const iterations = 1000000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    YourFeature.operation();
  }
  
  const end = performance.now();
  const opsPerSec = (iterations / (end - start)) * 1000;
  
  console.log(`Operations: ${opsPerSec.toFixed(0)} ops/sec`);
  expect(opsPerSec).toBeGreaterThan(expectedMinimum);
});
```

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use `const` instead of `let` where possible
- Prefer explicit types over inferred types for public APIs

## Commit Messages

Follow conventional commits:

```
feat: add new markdown preset
test: add performance regression test
docs: update README with new feature
fix: correct typo in preset name
refactor: simplify renderer logic
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests (`bun test`)
6. Run benchmarks if applicable (`bun run benchmark`)
7. Commit your changes (`git commit -m 'feat: add amazing feature'`)
8. Push to your branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## CI Checks

All pull requests must pass:

- ✅ Tests on Ubuntu and macOS
- ✅ Tests with Bun 1.3.7 and latest
- ✅ TypeScript type checking
- ✅ Performance benchmarks (for PRs)

## Reporting Issues

When reporting issues, please include:

- Bun version (`bun --version`)
- Operating system
- Steps to reproduce
- Expected behavior
- Actual behavior
- Code example if applicable

## Questions?

Feel free to open an issue for questions or discussions.
