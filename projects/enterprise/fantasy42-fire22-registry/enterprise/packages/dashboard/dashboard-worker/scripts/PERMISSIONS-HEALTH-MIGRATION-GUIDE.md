# 🔐 Enhanced Permissions Health Test Suite - Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the original
`test-permissions-health.ts` to the enhanced version
`test-permissions-health-enhanced.ts`. The enhanced version includes significant
improvements in type safety, configuration management, network resilience, and
error handling.

## What's New in the Enhanced Version

### ✅ Key Improvements

1. **Type Safety**

   - Complete TypeScript interfaces for all API responses
   - Strong typing for configuration options
   - Proper error type definitions
   - Exported types for better integration

2. **Configuration Management**

   - Environment variable support for all configuration options
   - Runtime configuration updates
   - Command-line argument parsing
   - Verbose logging options

3. **Network Resilience**

   - Configurable timeout handling
   - Automatic retry logic with exponential backoff
   - Proper cleanup of network resources
   - Detailed network error reporting

4. **Enhanced Error Handling**

   - Structured error reporting with HTTP status codes
   - Detailed error messages and stack traces (optional)
   - Graceful handling of network failures
   - Proper error propagation

5. **Testing Infrastructure**
   - Comprehensive unit test suite
   - Mock support for network calls
   - Test coverage for all major functionality

## Migration Steps

### Step 1: File Replacement

Replace the original file with the enhanced version:

```bash
# Backup the original file (optional)
mv dashboard-worker/scripts/test-permissions-health.ts dashboard-worker/scripts/test-permissions-health-original.ts

# Use the enhanced version
mv dashboard-worker/scripts/test-permissions-health-enhanced.ts dashboard-worker/scripts/test-permissions-health.ts
```

### Step 2: Update Usage Patterns

#### Basic Usage (No Changes Required)

The basic usage remains the same:

```bash
# Original usage (still works)
bun run dashboard-worker/scripts/test-permissions-health.ts

# Enhanced usage (same command)
bun run dashboard-worker/scripts/test-permissions-health.ts
```

#### Advanced Usage (New Features Available)

```bash
# With custom configuration via command line
bun run dashboard-worker/scripts/test-permissions-health.ts --url https://api.example.com --timeout 15000 --retries 5 --verbose true

# With environment variables
export PERMISSIONS_TEST_BASE_URL="https://api.example.com"
export PERMISSIONS_TEST_TIMEOUT="15000"
export PERMISSIONS_TEST_RETRIES="5"
export PERMISSIONS_TEST_VERBOSE="true"
bun run dashboard-worker/scripts/test-permissions-health.ts
```

### Step 3: Update Script References

If you have any scripts or automation that reference the original file, update
them:

```json
// package.json example
{
  "scripts": {
    "test:permissions": "bun run dashboard-worker/scripts/test-permissions-health.ts",
    "test:permissions:dev": "bun run dashboard-worker/scripts/test-permissions-health.ts --url http://localhost:8787 --verbose true"
  }
}
```

### Step 4: Update CI/CD Pipelines

If you use the test in CI/CD pipelines, you may want to add the new
configuration options:

```yaml
# GitHub Actions example
- name: Test Permissions Health
  run: bun run dashboard-worker/scripts/test-permissions-health.ts
  env:
    PERMISSIONS_TEST_BASE_URL: ${{ vars.API_BASE_URL }}
    PERMISSIONS_TEST_TIMEOUT: '30000'
    PERMISSIONS_TEST_RETRIES: '5'
    PERMISSIONS_TEST_VERBOSE: 'true'
```

## Configuration Options

### Environment Variables

| Variable                       | Description                           | Default                 |
| ------------------------------ | ------------------------------------- | ----------------------- |
| `PERMISSIONS_TEST_BASE_URL`    | Base URL for the API                  | `http://localhost:8787` |
| `PERMISSIONS_TEST_TIMEOUT`     | Request timeout in milliseconds       | `10000`                 |
| `PERMISSIONS_TEST_RETRIES`     | Number of retry attempts              | `3`                     |
| `PERMISSIONS_TEST_RETRY_DELAY` | Delay between retries in milliseconds | `1000`                  |
| `PERMISSIONS_TEST_VERBOSE`     | Enable verbose logging                | `false`                 |

### Command Line Arguments

| Argument    | Description            | Example                         |
| ----------- | ---------------------- | ------------------------------- |
| `--url`     | Set base URL           | `--url https://api.example.com` |
| `--timeout` | Set timeout in ms      | `--timeout 15000`               |
| `--retries` | Set number of retries  | `--retries 5`                   |
| `--verbose` | Enable verbose logging | `--verbose true`                |

### Programmatic Configuration

```typescript
import { PermissionsHealthTester } from './dashboard-worker/scripts/test-permissions-health';

// Create with custom configuration
const tester = new PermissionsHealthTester({
  baseUrl: 'https://api.example.com',
  timeout: 15000,
  retries: 5,
  retryDelay: 2000,
  enableVerboseLogging: true,
});

// Update configuration at runtime
tester.updateConfig({
  timeout: 30000,
  enableVerboseLogging: false,
});

// Get current configuration
const config = tester.getConfig();
```

## Breaking Changes

### 1. TypeScript Types

The enhanced version exports TypeScript types. If you were importing the class,
you might need to update your imports:

```typescript
// Before (if you were importing types)
import { PermissionsHealthTester } from './test-permissions-health';

// After (with types)
import {
  PermissionsHealthTester,
  type HealthResponse,
  type TestConfig,
} from './test-permissions-health';
```

### 2. Error Handling

The enhanced version has more detailed error handling. If you were catching
specific errors, you might need to update your error handling:

```typescript
// Before
try {
  await tester.testPermissionsHealth();
} catch (error) {
  console.error('Test failed:', error);
}

// After (enhanced error information)
try {
  await tester.testPermissionsHealth();
} catch (error) {
  if (error instanceof Error) {
    console.error('Test failed:', error.message);
    // Additional error details available
    console.error('Code:', (error as any).code);
    console.error('HTTP Status:', (error as any).response?.status);
  }
}
```

### 3. Constructor Behavior

The constructor now accepts a partial configuration object and merges it with
defaults:

```typescript
// Before (hardcoded baseUrl)
const tester = new PermissionsHealthTester();

// After (flexible configuration)
const tester = new PermissionsHealthTester({
  baseUrl: 'https://custom.example.com',
  timeout: 15000,
});
```

## Testing the Migration

### 1. Run the Enhanced Tests

```bash
# Run the unit tests
bun test dashboard-worker/scripts/test-permissions-health-enhanced.test.ts

# Run the actual test script
bun run dashboard-worker/scripts/test-permissions-health.ts
```

### 2. Verify Configuration

```bash
# Test with verbose logging to see configuration
bun run dashboard-worker/scripts/test-permissions-health.ts --verbose true

# Test with custom timeout
bun run dashboard-worker/scripts/test-permissions-health.ts --timeout 5000
```

### 3. Test Error Scenarios

```bash
# Test with invalid URL to see enhanced error handling
bun run dashboard-worker/scripts/test-permissions-health.ts --url https://invalid.example.com
```

## Rollback Plan

If you need to rollback to the original version:

```bash
# Restore the original file
mv dashboard-worker/scripts/test-permissions-health-original.ts dashboard-worker/scripts/test-permissions-health.ts

# Or recreate the original file with this content:
# (content from the original test-permissions-health.ts)
```

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**

   - Ensure you're using the correct import statements
   - Check that all required dependencies are installed
   - Verify your TypeScript configuration

2. **Network Timeout Issues**

   - Increase the timeout value: `--timeout 30000`
   - Check network connectivity to the API endpoint
   - Verify the API endpoint is accessible

3. **Environment Variables Not Working**
   - Ensure environment variables are set correctly
   - Check that the variable names are spelled correctly
   - Verify that the environment is properly loaded

### Getting Help

If you encounter issues during migration:

1. Check the comprehensive documentation in
   `PERMISSIONS-HEALTH-ENHANCED-README.md`
2. Review the unit tests in `test-permissions-health-enhanced.test.ts`
3. Run tests with verbose logging to get detailed information
4. Check the error messages for specific guidance

## Benefits of Migration

### ✅ Immediate Benefits

1. **Better Reliability**: Automatic retry logic handles temporary network
   issues
2. **Improved Debugging**: Enhanced error reporting with detailed information
3. **Flexible Configuration**: Environment variables and command-line arguments
4. **Type Safety**: Full TypeScript support prevents runtime errors

### ✅ Long-term Benefits

1. **Maintainability**: Better code organization and type safety
2. **Extensibility**: Easy to add new features and configuration options
3. **Testing**: Comprehensive test suite ensures reliability
4. **Documentation**: Complete documentation and migration guide

## Conclusion

The enhanced permissions health test suite provides significant improvements
over the original version while maintaining backward compatibility for basic
usage. The migration process is straightforward, and the benefits in terms of
reliability, maintainability, and developer experience make it a worthwhile
upgrade.

The enhanced version is designed to be a drop-in replacement for basic usage
while providing powerful new features for advanced use cases. Take advantage of
the new configuration options, improved error handling, and comprehensive
testing infrastructure to build more robust and maintainable applications.
