# Test Organization with Variables and Groups

This guide explains how to organize tests using environment variables and grouping strategies for better test management.

## 🎯 Overview

The Test Organizer provides:
- **Test Groups**: Organize tests by functionality, priority, and dependencies
- **Environment Variables**: Configure test behavior dynamically
- **Dependency Management**: Run tests in the correct order
- **Priority-based Execution**: Control test execution based on importance
- **Tag-based Filtering**: Run tests by tags like `fast`, `slow`, `critical`

## 📋 Test Groups

### Predefined Groups

| Group | Priority | Tags | Description | Timeout |
|-------|----------|------|-------------|---------|
| `smoke` | High | smoke, critical, fast | Critical path tests | 3s |
| `unit` | High | unit, fast, isolated | Isolated unit tests | 5s |
| `integration` | Medium | integration, api | Multi-component tests | 15s |
| `network` | Medium | network, external | Network-dependent tests | 20s |
| `ci` | High | ci, pipeline | CI-specific tests | 10s |
| `performance` | Low | performance, benchmark, slow | Performance tests | 60s |
| `security` | High | security, audit | Security tests | 30s |
| `e2e` | Low | e2e, slow, browser | End-to-end tests | 120s |

### Group Dependencies

```text
smoke (none)
    ↓
unit (none)
    ↓
integration → depends on: unit, smoke
network → depends on: unit
ci → depends on: unit
performance → depends on: unit
security → depends on: unit
    ↓
e2e → depends on: integration, network
```

## 🏷️ Tags

### Common Tags

- **Execution Speed**: `fast`, `slow`
- **Importance**: `critical`, `smoke`
- **Type**: `unit`, `integration`, `e2e`, `api`
- **Environment**: `ci`, `pipeline`, `browser`
- **Special**: `isolated`, `parallel`, `external`
- **Purpose**: `performance`, `security`, `benchmark`, `audit`

## 🚀 Quick Commands

### List All Groups

```bash
bun run test:groups
```

### Run Specific Groups

```bash
# Run smoke tests
bun run test:smoke

# Run unit tests
bun run test:unit

# Run integration tests
bun run test:integration

# Run all tests in dependency order
bun run test:all-groups
```

### Run by Tags

```bash
# Run all fast tests
bun run test:fast

# Run all critical tests
bun run test:critical

# Run all slow tests
bun run test:slow
```

### Run by Priority

```bash
# Run all high priority tests
bun run test:high-priority
```

### Advanced Usage

```bash
# Run with coverage
bun run test:unit --coverage

# Run in watch mode
bun run test:unit --watch

# Run with verbose output
bun run test:unit --verbose

# Stop after N failures
bun run test:unit --bail 5
```

## 🔧 Configuration

### Config File Structure

Create `test-organizer.config.json`:

```json
{
  "groups": {
    "custom-group": {
      "name": "Custom Tests",
      "description": "Custom test group",
      "patterns": ["tests/custom/**/*.test.ts"],
      "priority": "medium",
      "tags": ["custom", "special"],
      "timeout": 10000,
      "parallel": true,
      "dependencies": ["unit"],
      "environment": {
        "CUSTOM_VAR": "value",
        "SPECIAL_MODE": "1"
      }
    }
  },
  "globalEnvironment": {
    "NODE_ENV": "test",
    "REPORTER": "verbose"
  },
  "defaultTimeout": 10000,
  "maxConcurrency": 4,
  "retryCount": 2
}
```

### Environment Variables

#### Automatic Variables

- `TEST_GROUP`: Current test group name
- `TEST_PRIORITY`: Group priority (high/medium/low)
- `TEST_TAGS`: Comma-separated list of tags
- `TEST_MODE`: Test mode (from group config)

#### Group-specific Variables

Each group can define its own environment variables:

```json
{
  "environment": {
    "DATABASE_URL": "postgresql://test:test@localhost:5432/test",
    "API_BASE_URL": "http://localhost:3000",
    "MOCK_EXTERNAL": "1"
  }
}
```

## 📝 Writing Tests with Variables

### Accessing Variables in Tests

```typescript
import { describe, it, expect } from 'bun:test';

const testGroup = process.env.TEST_GROUP || 'unknown';
const testPriority = process.env.TEST_PRIORITY || 'medium';
const testTags = process.env.TEST_TAGS?.split(',') || [];
const testMode = process.env.TEST_MODE || 'default';

describe(`Test Group: ${testGroup}`, () => {
  it('should use group-specific configuration', () => {
    expect(testGroup).not.toBe('unknown');

    // Group-specific behavior
    if (testTags.includes('integration')) {
      expect(process.env.DATABASE_URL).toBeDefined();
    }

    if (testTags.includes('performance')) {
      // Performance test logic
    }
  });
});
```

### Conditional Test Execution

```typescript
describe('Conditional Tests', () => {

  // Only run in CI
  if (process.env.CI === '1') {
    it('should run in CI only', () => {
      // CI-specific test
    });
  }

  // Only run with network access
  if (process.env.ALLOW_NETWORK === '1') {
    it('should make network requests', async () => {
      // Network test
    });
  }

  // Skip in smoke tests
  if (!process.env.TEST_TAGS?.includes('smoke')) {
    it('should run detailed validation', () => {
      // Comprehensive test
    });
  }
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        group: [smoke, unit, integration, security]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run ${{ matrix.group }} tests
        run: bun run test:${{ matrix.group }}
```

### Parallel Execution

```yaml
strategy:
  matrix:
    include:
      - group: smoke
        priority: high
      - group: unit
        priority: high
      - group: security
        priority: high
      - group: integration
        priority: medium
      - group: performance
        priority: low
```

## 📊 Best Practices

### 1. Group Organization

- Keep groups focused on a single concern
- Use descriptive names and tags
- Define clear dependencies
- Set appropriate timeouts

### 2. Tag Strategy

- Use consistent tag naming
- Combine tags for precise filtering
- Include speed indicators (`fast`, `slow`)
- Mark critical tests with `smoke` or `critical`

### 3. Environment Variables

- Use prefixes for group-specific vars
- Document required variables
- Provide defaults in tests
- Keep sensitive data in CI secrets

### 4. Dependency Management

- Minimize dependencies between groups
- Use dependencies for true prerequisites
- Consider parallel execution possibilities
- Document dependency chains

## 🔍 Advanced Features

### Dynamic Configuration

```typescript
// Load configuration based on environment
const config = testMode === 'ci' ? ciConfig : localConfig;

// Adjust test behavior
const retries = testPriority === 'high' ? 0 : 2;
const timeout = testTags.includes('slow') ? 60000 : 10000;
```

### Custom Reporters

```typescript
if (process.env.TEST_REPORTER === 'json') {
  // Emit JSON results
} else if (process.env.TEST_REPORTER === 'junit') {
  // Emit JUnit XML
}
```

### Test Filtering

```bash
# Multiple tags
bun run test:organizer --tag fast --tag unit

# Multiple priorities
bun run test:organizer --priority high --priority medium

# Custom patterns
bun run test:organizer --group custom --coverage
```

## 🐛 Troubleshooting

### Common Issues

1. **Tests not found**

   - Check file patterns in config
   - Ensure files follow naming convention
   - Verify paths are correct

2. **Dependencies failing**

   - Check dependency order
   - Ensure all dependencies exist
   - Run dependencies first

3. **Environment variables missing**

   - Check group configuration
   - Verify global environment
   - Use defaults in tests

### Debug Mode

```bash
# Enable verbose output
DEBUG=test:* bun run test:organizer --group unit

# Show configuration
bun run test:organizer --list --verbose

# Dry run (show commands without executing)
DRY_RUN=1 bun run test:organizer --group unit
```

## 📚 Examples Repository

See the test files in `src/__tests__/test-organizer-example.test.ts` for complete examples of:

- Variable usage
- Conditional logic
- Group-specific behavior
- Priority-based configuration
