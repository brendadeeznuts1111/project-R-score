# 🔐 Enhanced Permissions Health Test Suite

## Overview

The enhanced permissions health test suite provides comprehensive testing
capabilities for the Fire22 permissions health system with live casino
integration. This improved version includes:

- **Type Safety**: Full TypeScript interfaces for all API responses
- **Configuration Management**: Flexible configuration with environment variable
  support
- **Network Resilience**: Timeout handling and retry logic with exponential
  backoff
- **Enhanced Error Handling**: Detailed error reporting and debugging
  information
- **Flexible Usage**: Command-line arguments and runtime configuration updates

## Key Improvements

### 1. Type Safety

- Complete TypeScript interfaces for all API response types
- Strong typing for configuration options
- Proper error type definitions
- Exported types for integration with other modules

### 2. Configuration Management

- Environment variable support for all configuration options
- Runtime configuration updates
- Command-line argument parsing
- Verbose logging options

### 3. Network Resilience

- Configurable timeout handling
- Automatic retry logic with exponential backoff
- Proper cleanup of network resources
- Detailed network error reporting

### 4. Enhanced Error Handling

- Structured error reporting with HTTP status codes
- Detailed error messages and stack traces (optional)
- Graceful handling of network failures
- Proper error propagation

## Usage

### Basic Usage

```bash
# Run comprehensive test suite
bun run test-permissions-health-enhanced.ts

# Test specific endpoint
bun run test-permissions-health-enhanced.ts permissions
bun run test-permissions-health-enhanced.ts matrix
```

### Environment Variables

```bash
# Set base URL for the API
export PERMISSIONS_TEST_BASE_URL="http://localhost:8787"

# Set timeout in milliseconds
export PERMISSIONS_TEST_TIMEOUT="15000"

# Set number of retry attempts
export PERMISSIONS_TEST_RETRIES="5"

# Set retry delay in milliseconds
export PERMISSIONS_TEST_RETRY_DELAY="2000"

# Enable verbose logging
export PERMISSIONS_TEST_VERBOSE="true"
```

### Command Line Arguments

```bash
# Override base URL
bun run test-permissions-health-enhanced.ts --url http://api.example.com:8787

# Set timeout
bun run test-permissions-health-enhanced.ts --timeout 30000

# Set retry count
bun run test-permissions-health-enhanced.ts --retries 5

# Enable verbose logging
bun run test-permissions-health-enhanced.ts --verbose true
```

### Programmatic Usage

```typescript
import { PermissionsHealthTester } from './test-permissions-health-enhanced';

// Create tester with custom configuration
const tester = new PermissionsHealthTester({
  baseUrl: 'http://localhost:8787',
  timeout: 15000,
  retries: 5,
  retryDelay: 2000,
  enableVerboseLogging: true,
});

// Run comprehensive test
await tester.runComprehensiveTest();

// Test specific endpoint
await tester.testSpecificEndpoint('permissions');

// Update configuration at runtime
tester.updateConfig({
  timeout: 30000,
  enableVerboseLogging: false,
});

// Get current configuration
const config = tester.getConfig();
console.log('Current config:', config);
```

## Configuration Options

| Option                 | Type    | Default                 | Description                                   |
| ---------------------- | ------- | ----------------------- | --------------------------------------------- |
| `baseUrl`              | string  | `http://localhost:8787` | Base URL for the API endpoints                |
| `timeout`              | number  | `10000`                 | Request timeout in milliseconds               |
| `retries`              | number  | `3`                     | Number of retry attempts for failed requests  |
| `retryDelay`           | number  | `1000`                  | Base delay for retry attempts in milliseconds |
| `enableVerboseLogging` | boolean | `false`                 | Enable detailed logging output                |

## API Endpoints Tested

### 1. Permissions Health (`/api/health/permissions`)

Tests the basic permissions health endpoint and validates:

- Overall system health status
- Health score calculation
- Agent validation summary
- Live casino validation
- Live casino system statistics
- Individual agent validation details

### 2. Permissions Matrix Health (`/api/health/permissions-matrix`)

Tests the permissions matrix health endpoint and validates:

- Matrix health status and scoring
- Matrix statistics and data completeness
- Live casino matrix integration
- Cell validation results
- Permission keys and structure
- Matrix issues and recommendations

## Error Handling

The enhanced test suite provides comprehensive error handling:

### Network Errors

- Timeout errors with detailed timing information
- HTTP status code errors (4xx, 5xx)
- Connection refused and network unreachable errors
- DNS resolution failures

### API Errors

- Invalid response format errors
- Missing required fields in responses
- Data validation errors
- Server-side error messages

### Configuration Errors

- Invalid configuration values
- Missing required configuration
- Environment variable parsing errors

## Migration Guide

### From Original Version

The enhanced version maintains backward compatibility while adding new features:

1. **Import Changes**:

   ```typescript
   // Before
   import { PermissionsHealthTester } from './test-permissions-health';

   // After
   import { PermissionsHealthTester } from './test-permissions-health-enhanced';
   ```

2. **Configuration**:

   ```typescript
   // Before (hardcoded)
   const tester = new PermissionsHealthTester();

   // After (configurable)
   const tester = new PermissionsHealthTester({
     baseUrl: 'http://localhost:8787',
     timeout: 10000,
     retries: 3,
   });
   ```

3. **Error Handling**:

   ```typescript
   // Before (basic error handling)
   try {
     await tester.testPermissionsHealth();
   } catch (error) {
     console.error('Error:', error);
   }

   // After (enhanced error handling)
   try {
     await tester.testPermissionsHealth();
   } catch (error) {
     // Detailed error information with HTTP status, codes, etc.
     console.error('Enhanced error info:', error);
   }
   ```

## Testing

### Unit Tests

The enhanced version is designed to be easily testable:

```typescript
import { PermissionsHealthTester } from './test-permissions-health-enhanced';

// Mock fetch for testing
global.fetch = jest.fn();

describe('PermissionsHealthTester', () => {
  let tester: PermissionsHealthTester;

  beforeEach(() => {
    tester = new PermissionsHealthTester({
      baseUrl: 'http://test.example.com',
      timeout: 5000,
      retries: 1,
      retryDelay: 100,
      enableVerboseLogging: false,
    });
  });

  test('should test permissions health endpoint', async () => {
    // Mock successful response
    const mockResponse = {
      success: true,
      status: 'healthy',
      health_score: 95,
      total_agents: 10,
      agents_with_errors: 1,
      timestamp: new Date().toISOString(),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await expect(tester.testPermissionsHealth()).resolves.not.toThrow();
  });

  test('should handle network errors with retry', async () => {
    // Mock network error
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await expect(tester.testPermissionsHealth()).resolves.not.toThrow();
  });
});
```

### Integration Tests

For integration testing, you can use the enhanced configuration options:

```typescript
// Test with different configurations
const testConfigs = [
  { baseUrl: 'http://localhost:8787', timeout: 5000 },
  { baseUrl: 'http://staging.example.com', timeout: 15000, retries: 5 },
  {
    baseUrl: 'http://production.example.com',
    timeout: 30000,
    enableVerboseLogging: true,
  },
];

for (const config of testConfigs) {
  const tester = new PermissionsHealthTester(config);
  await tester.runComprehensiveTest();
}
```

## Performance Considerations

### Timeout Configuration

- **Development**: Shorter timeouts (5-10 seconds) for faster feedback
- **Staging**: Moderate timeouts (15-30 seconds) for realistic testing
- **Production**: Longer timeouts (30-60 seconds) for reliability

### Retry Configuration

- **Development**: Fewer retries (1-2) for faster failure detection
- **Staging**: Moderate retries (3-5) for network resilience testing
- **Production**: More retries (5-10) for maximum reliability

### Logging Configuration

- **Development**: Enable verbose logging for debugging
- **Staging**: Moderate logging for monitoring
- **Production**: Minimal logging for performance

## Troubleshooting

### Common Issues

1. **Timeout Errors**

   ```
   Error: The operation was aborted.
   ```

   - Increase timeout value using `--timeout` or `PERMISSIONS_TEST_TIMEOUT`
   - Check network connectivity to the API server
   - Verify API server is running and responsive

2. **Connection Refused**

   ```
   Error: fetch failed
   ```

   - Verify API server is running on specified port
   - Check firewall settings
   - Verify base URL configuration

3. **HTTP Errors**
   ```
   Error: HTTP 404: Not Found
   ```
   - Verify API endpoints are available
   - Check API server routes configuration
   - Verify correct base URL path

### Debug Mode

Enable verbose logging for detailed debugging information:

```bash
export PERMISSIONS_TEST_VERBOSE="true"
bun run test-permissions-health-enhanced.ts
```

Or use command line:

```bash
bun run test-permissions-health-enhanced.ts --verbose true
```

## Contributing

When contributing to the enhanced permissions health test suite:

1. **Type Safety**: Ensure all new features include proper TypeScript types
2. **Configuration**: Add new configuration options with environment variable
   support
3. **Error Handling**: Implement comprehensive error handling for new features
4. **Testing**: Add unit tests for new functionality
5. **Documentation**: Update this README with new features and usage examples

## License

This enhanced permissions health test suite is part of the Fire22 project and
follows the same license terms.
