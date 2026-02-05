# Test Organization

This directory contains the organized testing infrastructure for the project, following a structured approach to testing different aspects of the application.

## Directory Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── ci-detector.test.ts  # CI environment detection tests
│   ├── test-config.test.ts  # Test configuration tests
│   └── __tests__/           # Existing unit tests moved from src/__tests__
├── integration/             # Integration tests for component interactions
│   └── cli-commands.test.ts # CLI command integration tests
├── e2e/                     # End-to-end tests for complete workflows
│   └── test-organizer-e2e.test.ts
├── performance/             # Performance and benchmark tests
│   └── test-organizer-performance.test.ts
├── security/                # Security and vulnerability tests
│   └── test-organizer-security.test.ts
├── network/                 # Network-related tests
│   └── test-organizer-network.test.ts
├── fixtures/                # Test data and configuration files
│   ├── test-config.json     # Sample test configuration
│   └── test-package.json    # Sample package configuration
└── utils/                   # Shared test utilities and helpers
    └── test-helpers.ts      # Common test utilities
```

## Test Groups

The testing infrastructure is organized into the following groups:

### 1. Unit Tests (`unit/`)
- **Purpose**: Test individual components in isolation
- **Scope**: Single functions, classes, or modules
- **Speed**: Fast execution
- **Dependencies**: Minimal external dependencies
- **Examples**: CI detector, test configuration

### 2. Integration Tests (`integration/`)
- **Purpose**: Test component interactions
- **Scope**: Multiple components working together
- **Speed**: Medium execution time
- **Dependencies**: May require external services
- **Examples**: CLI commands, API integrations

### 3. End-to-End Tests (`e2e/`)
- **Purpose**: Test complete user workflows
- **Scope**: Full application scenarios
- **Speed**: Slow execution
- **Dependencies**: Full application stack
- **Examples**: Complete test organization workflows

### 4. Performance Tests (`performance/`)
- **Purpose**: Test application performance characteristics
- **Scope**: Execution time, memory usage, scalability
- **Speed**: Variable execution time
- **Dependencies**: Performance monitoring tools
- **Examples**: Test organizer startup time, large suite handling

### 5. Security Tests (`security/`)
- **Purpose**: Test security vulnerabilities and protections
- **Scope**: Input validation, access control, data protection
- **Speed**: Medium execution time
- **Dependencies**: Security testing tools
- **Examples**: Path traversal, command injection, input sanitization

### 6. Network Tests (`network/`)
- **Purpose**: Test network-related functionality
- **Scope**: External API calls, network configurations
- **Speed**: Variable execution time
- **Dependencies**: Network access
- **Examples**: DNS resolution, proxy configurations, SSL/TLS

## Test Utilities

### TestHelpers Class

The `TestHelpers` class provides common utilities for all test types:

```typescript
import { TestHelpers } from '../utils/test-helpers';

// Create temporary directories
const { tempDir, cleanup } = await TestHelpers.createTempDir('test-');

// Create test fixtures
await TestHelpers.createFixtureFile(tempDir, 'config.json', '{}');

// Mock environment variables
const restore = TestHelpers.mockEnvironment({ CI: 'true' });

// Run commands and capture output
const result = await TestHelpers.runCommand('test-organizer --list');

// Cleanup
await cleanup();
restore();
```

### Common Test Patterns

```typescript
// Test with temporary directory
test('should handle file operations', async () => {
  const { tempDir, cleanup } = await TestHelpers.createTempDir('file-test-');

  try {
    // Setup test data
    await TestHelpers.createFixtureFile(tempDir, 'test.json', '{}');

    // Run test
    const result = await TestHelpers.runCommand('command', { cwd: tempDir });

    // Assertions
    expect(result.exitCode).toBe(0);
  } finally {
    await cleanup();
  }
});
```

## Running Tests

### Using Test Organizer

The test organizer provides commands to run different test groups:

```bash
# Run all tests
bun run test:organizer --all

# Run specific test groups
bun run test:organizer --group=unit
bun run test:organizer --group=integration
bun run test:organizer --group=e2e
bun run test:organizer --group=performance
bun run test:organizer --group=security
bun run test:organizer --group=network

# Run tests by priority
bun run test:organizer --priority=high
bun run test:organizer --priority=medium
bun run test:organizer --priority=low

# Run tests by tags
bun run test:organizer --tag=fast
bun run test:organizer --tag=critical
```

### Using Bun Test Directly

```bash
# Run all tests
bun test tests/

# Run specific test types
bun test tests/unit/
bun test tests/integration/
bun test tests/e2e/
bun test tests/performance/
bun test tests/security/
bun test tests/network/

# Run with coverage
bun test tests/ --coverage

# Run with specific patterns
bun test tests/ --test-name-pattern="should handle"
```

## CI/CD Integration

The testing infrastructure is integrated with GitHub Actions through the `.github/workflows/test-organization.yml` workflow:

- **Matrix Testing**: Tests across multiple Node.js versions and test groups
- **Parallel Execution**: Tests run in parallel for faster feedback
- **Artifact Upload**: Test results and coverage reports are preserved
- **Performance Monitoring**: Performance tests run on main branch pushes
- **Security Scanning**: Security tests run on main branch pushes

## Test Configuration

### Test Organizer Configuration

The `test-organizer.config.json` file defines test groups and their configurations:

```json
{
  "groups": {
    "unit": {
      "name": "Unit Tests",
      "description": "Fast, isolated unit tests",
      "patterns": ["tests/unit/**/*.test.ts"],
      "priority": "high",
      "tags": ["unit", "fast", "isolated"],
      "timeout": 5000,
      "parallel": true
    }
  }
}
```

### Environment Variables

Tests can be configured using environment variables:

```bash
# CI environment
CI=true
GITHUB_ACTIONS=true

# Test modes
TEST_MODE=unit|integration|e2e|performance|security|network

# Performance thresholds
PERFORMANCE_THRESHOLD=5000

# Security settings
SECURITY_AUDIT=true
VULNERABILITY_SCAN=true

# Network settings
ALLOW_NETWORK=true
NETWORK_TIMEOUT=10000
```

## Best Practices

### Test Organization

1. **Follow the directory structure**: Place tests in the appropriate subdirectory
2. **Use descriptive test names**: Make test names clear and descriptive
3. **Group related tests**: Use test suites to group related functionality
4. **Use fixtures**: Create reusable test data in the fixtures directory

### Test Implementation

1. **Isolate tests**: Each test should be independent
2. **Clean up resources**: Always clean up temporary files and processes
3. **Use helpers**: Leverage the TestHelpers class for common operations
4. **Mock external dependencies**: Use mocks for external services
5. **Test error conditions**: Include tests for error scenarios

### Performance Considerations

1. **Use appropriate timeouts**: Set reasonable timeouts for different test types
2. **Run in parallel**: Use parallel execution for independent tests
3. **Monitor performance**: Use performance tests to track execution time
4. **Optimize slow tests**: Identify and optimize slow-running tests

### Security Considerations

1. **Test input validation**: Verify all input validation logic
2. **Test access control**: Verify authentication and authorization
3. **Test data protection**: Verify sensitive data handling
4. **Use security tools**: Integrate security scanning tools

## Troubleshooting

### Common Issues

1. **Test timeouts**: Increase timeout values in test configuration
2. **Resource leaks**: Ensure proper cleanup in test teardown
3. **Flaky tests**: Add retry logic or improve test isolation
4. **CI failures**: Check environment variables and dependencies

### Debugging

1. **Enable verbose output**: Use `--verbose` flag with test commands
2. **Check logs**: Review test output and error messages
3. **Use debug mode**: Run tests in debug mode for detailed information
4. **Check artifacts**: Review uploaded test artifacts for detailed reports

## Contributing

When adding new tests:

1. **Follow the structure**: Place tests in the appropriate directory
2. **Use existing patterns**: Follow established test patterns and utilities
3. **Add documentation**: Document new test utilities and helpers
4. **Update configuration**: Update test organizer configuration if needed
5. **Run locally**: Test locally before submitting changes
