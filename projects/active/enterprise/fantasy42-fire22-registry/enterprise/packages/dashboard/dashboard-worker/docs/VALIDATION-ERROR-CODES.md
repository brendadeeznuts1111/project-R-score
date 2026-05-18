# L-Key Telegram Validation Error Codes

## Overview

This document provides comprehensive documentation for all error codes used in
the L-Key to Telegram validation system, including error descriptions, recovery
strategies, and troubleshooting guidance.

## Error Code Structure

All validation error codes follow the format `VAL_XXXX` where:

- `VAL` = Validation system identifier
- `XXXX` = Four-digit numeric code by category

## Error Categories

### System Errors (1000-1099)

Critical system-level errors that prevent the validation system from
functioning.

#### VAL_1001: SYSTEM_INITIALIZATION_FAILED

- **Severity**: Critical
- **Recoverable**: Yes
- **Description**: The validation system could not be initialized properly
- **Common Causes**:
  - Missing environment variables
  - Invalid system configuration
  - Dependency initialization failure
- **Recovery Strategy**: 3 retries with exponential backoff (5s, 10s, 20s)
- **Troubleshooting**:
  1. Check environment variables (see CLAUDE.md)
  2. Verify system dependencies with `bun install --frozen-lockfile`
  3. Restart the service
  4. Check system logs for detailed error information

#### VAL_1002: SYSTEM_CONFIGURATION_INVALID

- **Severity**: Critical
- **Recoverable**: No
- **Description**: Required configuration parameters are missing or invalid
- **Common Causes**:
  - Missing FIRE22_TOKEN
  - Invalid configuration file syntax
  - Missing required environment variables
- **Troubleshooting**:
  1. Review CLAUDE.md configuration requirements
  2. Validate environment variables: `bun run env:validate`
  3. Check configuration file syntax

#### VAL_1003: SYSTEM_DEPENDENCY_MISSING

- **Severity**: Critical
- **Recoverable**: No
- **Description**: A critical system dependency is not available
- **Troubleshooting**:
  1. Run `bun install --frozen-lockfile`
  2. Check package.json dependencies
  3. Verify Bun runtime version >= 1.2.20

### API Integration Errors (1100-1199)

Errors related to Fire22 API integration and external service communication.

#### VAL_1101: FIRE22_API_UNAVAILABLE

- **Severity**: High
- **Recoverable**: Yes
- **Description**: Cannot connect to Fire22 API endpoints
- **Recovery Strategy**: 5 retries with 1.5x backoff (2s, 3s, 4.5s, 6.75s,
  10.12s)
- **Troubleshooting**:
  1. Check Fire22 API status
  2. Verify network connectivity
  3. Test DNS resolution: `bun test scripts/dns-performance.test.ts`
  4. Switch to demo mode: `FIRE22_DEMO_MODE=true`

#### VAL_1102: FIRE22_API_UNAUTHORIZED

- **Severity**: High
- **Recoverable**: No
- **Description**: Invalid or expired Fire22 API credentials
- **Troubleshooting**:
  1. Check FIRE22_TOKEN environment variable
  2. Verify API credentials are current
  3. Test authentication:
     `curl -H "Authorization: Bearer $FIRE22_TOKEN" https://api.fire22.ag/health`
  4. Contact Fire22 API support

#### VAL_1103: FIRE22_API_RATE_LIMITED

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Too many requests to Fire22 API
- **Recovery Strategy**: 3 retries with 2x backoff (60s, 120s, 240s)
- **Troubleshooting**:
  1. Implement request throttling
  2. Use cached data when available
  3. Check API rate limits in dashboard

### Data Validation Errors (1200-1299)

Errors related to data format and validation issues.

#### VAL_1201: CUSTOMER_DATA_INVALID

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Customer data does not meet validation criteria
- **Troubleshooting**:
  1. Check data source integrity
  2. Validate customer data format
  3. Use partial validation mode

#### VAL_1202: CUSTOMER_ID_MISSING

- **Severity**: Medium
- **Recoverable**: No
- **Description**: Customer ID is required but not provided
- **Troubleshooting**:
  1. Verify customer data source
  2. Check API response format
  3. Implement default customer ID generation

#### VAL_1203: CUSTOMER_ID_INVALID_FORMAT

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Customer ID does not match expected AL### format
- **Expected Format**: `AL\d{3,6}` (AL followed by 3-6 digits)
- **Valid Examples**: AL501, AL1234, AL999999
- **Invalid Examples**: AL1, AL12, CUSTOMER123
- **Auto-Fix**: Yes - can sanitize and reformat

#### VAL_1204: TELEGRAM_ID_INVALID_FORMAT

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Telegram ID should be 9-10 digit numeric string
- **Expected Format**: `\d{9,10}` (9-10 digits)
- **Valid Examples**: 123456789, 1234567890
- **Invalid Examples**: abc123def, 12345 (too short), 12345678901 (too long)
- **Auto-Fix**: No - requires manual correction

#### VAL_1205: USERNAME_INVALID_FORMAT

- **Severity**: Low
- **Recoverable**: Yes
- **Description**: Username contains invalid characters or exceeds length limits
- **Expected Format**: `[a-zA-Z0-9_]{3,32}` (alphanumeric + underscore, 3-32
  chars)
- **Valid Examples**: john_doe, user123, test_user_2024
- **Invalid Examples**: user@domain.com, ab (too short), user with spaces
- **Auto-Fix**: Yes - automatic sanitization available

#### VAL_1206: LKEY_MISSING

- **Severity**: High
- **Recoverable**: Yes
- **Description**: No L-Key found for the specified entity type
- **Troubleshooting**:
  1. Generate new L-Key: `validator.generateNextLKey('CUSTOMERS')`
  2. Check L-Key mapping configuration
  3. Verify entity type classification
- **Auto-Fix**: Yes - automatic L-Key generation

#### VAL_1207: LKEY_INVALID_FORMAT

- **Severity**: High
- **Recoverable**: Yes
- **Description**: L-Key does not match expected format
- **Expected Format**: `L[1-9]\d{3}` (L + category digit + 3 digits)
- **Valid Examples**: L2001, L1234, L9999
- **Invalid Examples**: L0001, L12, LKEY123

#### VAL_1208: LKEY_GENERATION_FAILED

- **Severity**: High
- **Recoverable**: Yes
- **Description**: Unable to generate new L-Key for entity
- **Troubleshooting**:
  1. Check L-Key sequence integrity
  2. Verify category mapping exists
  3. Clear L-Key cache: `lKeyMapper.clearCache()`

### Auto-Fix Errors (1400-1499)

Errors that occur during automatic issue resolution.

#### VAL_1401: AUTOFIX_FAILED

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Unable to automatically fix validation issues
- **Troubleshooting**:
  1. Review specific error details in logs
  2. Apply manual fixes
  3. Check data permissions and access rights

#### VAL_1402: AUTOFIX_PARTIAL_SUCCESS

- **Severity**: Low
- **Recoverable**: Yes
- **Description**: Some issues were fixed, others require manual intervention
- **Troubleshooting**:
  1. Review auto-fix results
  2. Identify remaining manual fixes needed
  3. Re-run validation after manual fixes

### Export/Report Errors (1500-1599)

Errors related to report generation and export functionality.

#### VAL_1501: REPORT_GENERATION_FAILED

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Unable to generate validation report
- **Troubleshooting**:
  1. Check available memory
  2. Reduce report scope (filter by agent)
  3. Export in smaller chunks

#### VAL_1502: EXPORT_FORMAT_UNSUPPORTED

- **Severity**: Low
- **Recoverable**: No
- **Description**: Requested export format is not supported
- **Supported Formats**: json, summary
- **Troubleshooting**:
  1. Use supported format: `{ format: 'json' }`
  2. Check API documentation for available formats

#### VAL_1503: EXPORT_SIZE_LIMIT_EXCEEDED

- **Severity**: Medium
- **Recoverable**: Yes
- **Description**: Export data exceeds size limits
- **Troubleshooting**:
  1. Filter data by agent or date range
  2. Use paginated exports
  3. Export in multiple smaller files

### Cache/Storage Errors (1600-1699)

Errors related to caching and data storage operations.

#### VAL_1601: CACHE_READ_FAILED

- **Severity**: Low
- **Recoverable**: Yes
- **Description**: Unable to read data from cache storage
- **Troubleshooting**:
  1. Clear cache and retry
  2. Check cache service availability
  3. Fall back to direct API calls
  4. Verify KV namespace configuration

#### VAL_1602: CACHE_WRITE_FAILED

- **Severity**: Low
- **Recoverable**: Yes
- **Description**: Unable to write data to cache storage
- **Troubleshooting**:
  1. Check cache service availability
  2. Verify storage quota limits
  3. Clear old cache entries

## Error Recovery Best Practices

### 1. Graceful Degradation

- Always provide partial results when possible
- Use fallback data sources when primary sources fail
- Implement circuit breaker patterns for external services

### 2. Retry Strategies

- Use exponential backoff for recoverable errors
- Limit retry attempts to prevent infinite loops
- Log all retry attempts for debugging

### 3. Error Logging

- Include error codes in all log messages
- Provide contextual information (user ID, operation, timestamp)
- Use structured logging for better searchability

### 4. User Communication

- Provide user-friendly error messages
- Include actionable troubleshooting steps
- Offer alternative workflows when possible

## Monitoring and Alerting

### Critical Error Thresholds

- System initialization failures: Alert immediately
- API unavailability: Alert after 3 consecutive failures
- Fatal errors: Alert when > 5% of operations fail

### Warning Thresholds

- High error rates: Warn when > 10% of validations have errors
- Cache failures: Warn when cache hit rate < 80%
- Performance degradation: Warn when validation takes > 30s

## API Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VAL_1204",
    "message": "Invalid Telegram ID format",
    "details": {
      "telegramId": "abc123def",
      "expectedFormat": "\\d{9,10}",
      "userId": "AL501"
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "recoverable": true,
    "retryAfter": 0,
    "suggestions": [
      "Verify Telegram ID is numeric",
      "Check for leading/trailing spaces",
      "Validate against Telegram API"
    ]
  }
}
```

## Testing Error Scenarios

### Unit Tests

```bash
# Test specific error scenarios
bun test src/validation/test-error-handling.test.ts

# Test error recovery mechanisms
bun test src/validation/test-error-recovery.test.ts
```

### Integration Tests

```bash
# Test end-to-end error handling
bun run test:validation:errors

# Test with simulated API failures
FIRE22_SIMULATE_ERRORS=true bun test
```

## Support and Escalation

### Level 1 Support

- Check error code documentation
- Verify configuration and environment variables
- Restart services and clear caches

### Level 2 Support

- Analyze logs and error patterns
- Apply manual fixes for data issues
- Escalate system-level issues

### Level 3 Support

- Code-level debugging and fixes
- Infrastructure and architecture changes
- Emergency hotfixes and patches

---

**Last Updated**: 2024-01-01  
**Version**: 1.0.0  
**Contact**: Fire22 Development Team
