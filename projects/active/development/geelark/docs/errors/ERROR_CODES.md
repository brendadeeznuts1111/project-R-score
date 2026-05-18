================================================================================
                          ERROR CODES REGISTRY
                    Geelark Project - Master Reference
================================================================================

LAST UPDATED: January 9, 2026
PURPOSE: Centralized registry of all application error codes, messages, and actions
STATUS: Complete and Production-Ready

================================================================================
ERROR CODE RANGES & CATEGORIES
================================================================================

Range            Category                  Purpose
─────────────────────────────────────────────────────────────────────────────
1000-1999        System Errors             Core system initialization and runtime
2000-2999        API Errors                HTTP/request handling errors
3000-3999        Validation Errors         Input validation failures
4000-4999        Database Errors           Data persistence errors
5000-5999        Authentication Errors     Auth/authorization failures
6000-6999        Business Logic Errors     Domain-specific errors
7000-7999        Configuration Errors      Config loading/parsing errors
8000-8999        Network Errors            Network/connectivity errors
9000-9999        Unknown/Other Errors      Catch-all category

================================================================================
SYSTEM ERRORS (1000-1999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
SYS_001   System initialization failed         500   CRITICAL   RESTART
SYS_002   Configuration loading failed         500   CRITICAL   RESTART
SYS_003   Memory threshold exceeded            503   CRITICAL   ALERT_ADMIN
SYS_004   CPU threshold exceeded               503   WARNING    LOG_MONITOR
SYS_005   Disk space critical                  507   CRITICAL   ALERT_OPS
SYS_006   File system error                    500   ERROR      RETRY
SYS_007   Permission denied                    403   ERROR      LOG_AUDIT
SYS_008   Resource exhausted                   503   CRITICAL   THROTTLE
SYS_009   System shutdown initiated            503   WARNING    GRACEFUL_SHUTDOWN
SYS_010   Health check failed                  503   WARNING    ALERT

Context Needed:
  - Component name (e.g., 'logger', 'database')
  - Resource type (e.g., 'memory', 'disk')
  - Current usage vs. threshold

Example:
  {
    code: 'SYS_003',
    component: 'memory_manager',
    currentUsage: 950,
    threshold: 100,
    unit: 'MB'
  }

================================================================================
API ERRORS (2000-2999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
API_001   Invalid request format               400   ERROR      REJECT
API_002   Unauthorized access                  401   ERROR      DENY
API_003   Resource not found                   404   WARNING    RETURN_404
API_004   Rate limit exceeded                  429   WARNING    THROTTLE
API_005   Internal server error                500   CRITICAL   LOG_ERROR
API_006   Service unavailable                  503   CRITICAL   RETRY
API_007   Request timeout                      504   WARNING    RETRY
API_008   Method not allowed                   405   ERROR      REJECT
API_009   Content type unsupported             415   ERROR      REJECT
API_010   Bad gateway                          502   ERROR      RETRY
API_011   Too many requests                    429   WARNING    BACK_OFF
API_012   Gone (resource deleted)              410   WARNING    RETURN_410
API_013   Conflict (duplicate)                 409   ERROR      REJECT
API_014   Payload too large                    413   ERROR      REJECT
API_015   URI too long                         414   ERROR      REJECT

Context Needed:
  - Endpoint path (e.g., '/api/users')
  - HTTP method (GET, POST, etc.)
  - Request ID for tracking
  - Client IP for rate limiting

Example:
  {
    code: 'API_004',
    endpoint: '/api/data/process',
    method: 'POST',
    clientIp: '192.168.1.100',
    requestsInWindow: 150,
    limit: 100
  }

================================================================================
VALIDATION ERRORS (3000-3999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
VAL_001   Invalid email format                 400   ERROR      REJECT
VAL_002   Invalid phone number                 400   ERROR      REJECT
VAL_003   Missing required field               400   ERROR      REJECT
VAL_004   Password too weak                    400   ERROR      REJECT
VAL_005   String too long                      400   ERROR      REJECT
VAL_006   String too short                     400   ERROR      REJECT
VAL_007   Number out of range                  400   ERROR      REJECT
VAL_008   Invalid date format                  400   ERROR      REJECT
VAL_009   Invalid enum value                   400   ERROR      REJECT
VAL_010   Array element invalid                400   ERROR      REJECT
VAL_011   Regex pattern mismatch               400   ERROR      REJECT
VAL_012   Invalid URL format                   400   ERROR      REJECT
VAL_013   Invalid JSON structure               400   ERROR      REJECT
VAL_014   Constraint violation                 400   ERROR      REJECT
VAL_015   Type mismatch                        400   ERROR      REJECT

Context Needed:
  - Field name
  - Expected format/type
  - Actual value (sanitized)
  - Constraint details

Example:
  {
    code: 'VAL_001',
    field: 'email',
    value: 'not-an-email',
    expectedFormat: 'user@domain.com'
  }

================================================================================
DATABASE ERRORS (4000-4999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
DB_001    Database connection failed           503   CRITICAL   RETRY
DB_002    Query timeout                        504   WARNING    RETRY
DB_003    Duplicate entry                      409   ERROR      REJECT
DB_004    Transaction failed                   500   ERROR      ROLLBACK
DB_005    Connection pool exhausted            503   WARNING    QUEUE
DB_006    Deadlock detected                    500   WARNING    RETRY
DB_007    Constraint violation                 409   ERROR      REJECT
DB_008    Foreign key violation                409   ERROR      REJECT
DB_009    Record not found                     404   WARNING    RETURN_404
DB_010    Table locked                         503   WARNING    RETRY
DB_011    Invalid SQL syntax                   500   CRITICAL   LOG_ALERT
DB_012    Permission denied                    403   ERROR      DENY
DB_013    Database offline                     503   CRITICAL   ALERT_DBA
DB_014    Replication error                    500   CRITICAL   ALERT_DBA
DB_015    Backup failure                       500   WARNING    ALERT_OPS

Context Needed:
  - Database name
  - Table name
  - Query (first 200 chars)
  - Error from DB driver

Example:
  {
    code: 'DB_003',
    table: 'users',
    key: 'email',
    duplicateValue: 'user@example.com',
    dbError: 'Duplicate key value violates unique constraint'
  }

================================================================================
AUTHENTICATION ERRORS (5000-5999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
AUTH_001  Invalid credentials                  401   ERROR      DENY
AUTH_002  Session expired                      401   WARNING    CLEAR_SESSION
AUTH_003  Token invalid                        401   ERROR      DENY
AUTH_004  Token expired                        401   WARNING    REFRESH
AUTH_005  Insufficient permissions             403   ERROR      DENY
AUTH_006  API key invalid                      401   ERROR      DENY
AUTH_007  OAuth flow error                     500   ERROR      RETRY
AUTH_008  Two-factor auth required             401   WARNING    PROMPT_2FA
AUTH_009  Account locked                       403   WARNING    NOTIFY_ACCOUNT
AUTH_010  Account disabled                     403   CRITICAL   DENY
AUTH_011  Password reset required              401   WARNING    PROMPT_RESET
AUTH_012  Email not verified                   403   WARNING    PROMPT_VERIFY
AUTH_013  User not found                       401   ERROR      DENY
AUTH_014  SAML validation failed               401   ERROR      DENY
AUTH_015  Certificate validation failed        401   ERROR      DENY

Context Needed:
  - User ID (if known)
  - Auth method (password, token, oauth, etc.)
  - Reason (expired, invalid, insufficient perms)
  - Timestamp of attempt

Example:
  {
    code: 'AUTH_003',
    userId: 'user_123',
    method: 'JWT_TOKEN',
    token: 'eyJ...truncated',
    reason: 'Signature verification failed'
  }

================================================================================
BUSINESS LOGIC ERRORS (6000-6999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
BIZ_001   Insufficient funds                   400   WARNING    DENY
BIZ_002   Duplicate registration               409   WARNING    REJECT
BIZ_003   Resource already in use              409   WARNING    REJECT
BIZ_004   Invalid state transition             400   ERROR      REJECT
BIZ_005   Quota exceeded                       429   WARNING    THROTTLE
BIZ_006   Operation not reversible             400   ERROR      REJECT
BIZ_007   Dependency not satisfied             400   ERROR      REJECT
BIZ_008   Item out of stock                    400   WARNING    NOTIFY
BIZ_009   Expired offer                        410   WARNING    INFORM
BIZ_010   Invalid date range                   400   ERROR      REJECT
BIZ_011   Circular dependency                  400   ERROR      REJECT
BIZ_012   Operation already completed          409   WARNING    INFORM
BIZ_013   Resource in use                      409   WARNING    INFORM
BIZ_014   Version mismatch                     409   ERROR      REJECT
BIZ_015   Policy violation                     403   ERROR      REJECT

Context Needed:
  - Entity type
  - Current state/value
  - Required state/value
  - User/resource involved

Example:
  {
    code: 'BIZ_001',
    accountId: 'acc_123',
    currentBalance: 50.00,
    amountRequested: 100.00,
    currency: 'USD'
  }

================================================================================
CONFIGURATION ERRORS (7000-7999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
CFG_001   Configuration file missing           500   CRITICAL   RESTART
CFG_002   Invalid configuration format         500   CRITICAL   RESTART
CFG_003   Required config key missing          500   CRITICAL   RESTART
CFG_004   Invalid config value                 500   CRITICAL   RESTART
CFG_005   Config validation failed             500   CRITICAL   RESTART
CFG_006   Environment variable missing         500   CRITICAL   RESTART
CFG_007   Feature flag not found               500   WARNING    LOG
CFG_008   Invalid feature flag value           500   WARNING    LOG
CFG_009   Config reload failed                 500   WARNING    LOG
CFG_010   Incompatible config versions         500   CRITICAL   RESTART
CFG_011   Config permission denied             500   CRITICAL   ALERT_OPS
CFG_012   Config file corrupted                500   CRITICAL   RESTORE
CFG_013   TLS cert missing                     500   CRITICAL   ALERT_OPS
CFG_014   TLS key missing                      500   CRITICAL   ALERT_OPS
CFG_015   Port already in use                  500   CRITICAL   RESTART

Context Needed:
  - Config file path
  - Key/value that failed
  - Expected format
  - Validation error details

Example:
  {
    code: 'CFG_003',
    configFile: 'bunfig.toml',
    missingKey: 'database.url',
    section: 'database'
  }

================================================================================
NETWORK ERRORS (8000-8999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
NET_001   DNS resolution failed                503   WARNING    RETRY
NET_002   Connection refused                   503   ERROR      RETRY
NET_003   Connection timeout                   504   WARNING    RETRY
NET_004   Network unreachable                  503   ERROR      ALERT
NET_005   Host unreachable                     503   ERROR      ALERT
NET_006   Socket error                         500   ERROR      RETRY
NET_007   TLS handshake failed                 401   ERROR      RETRY
NET_008   Certificate validation failed        401   ERROR      ALERT
NET_009   Proxy error                          502   ERROR      RETRY
NET_010   Load balancer error                  502   ERROR      ALERT
NET_011   CDN error                            502   ERROR      RETRY
NET_012   Firewall blocked                     403   ERROR      ALERT_OPS
NET_013   Rate limited by upstream             429   WARNING    BACK_OFF
NET_014   Protocol error                       502   ERROR      RETRY
NET_015   Connection broken                    500   ERROR      RETRY

Context Needed:
  - Target host/service
  - Port/endpoint
  - Protocol (HTTP, TCP, etc.)
  - Underlying error message

Example:
  {
    code: 'NET_001',
    targetHost: 'api.service.com',
    targetPort: 3000,
    protocol: 'HTTP',
    dnsError: 'ENOTFOUND'
  }

================================================================================
OTHER ERRORS (9000-9999)
================================================================================

Code      Message                              HTTP  Severity   Action
─────────────────────────────────────────────────────────────────────────────
ERR_001   Unknown error                        500   ERROR      LOG_ALERT
ERR_002   Unexpected server error              500   CRITICAL   LOG_ALERT
ERR_003   Feature not implemented              501   ERROR      REJECT
ERR_004   Deprecated endpoint                  410   WARNING    INFORM
ERR_005   Experimental feature                 502   WARNING    LOG
ERR_999   Generic error                        500   ERROR      LOG_ALERT

================================================================================
ERROR HANDLING STRATEGY BY SEVERITY
================================================================================

CRITICAL
────────────────────────────────────────────────────────────────────────────
- Immediate logging at ALERT level
- Alert operations team
- May require system restart or failover
- Examples: SYS_002, DB_013, CFG_001
- HTTP Status: 500-503
- User response: "System maintenance in progress"

ERROR
────────────────────────────────────────────────────────────────────────────
- Log at ERROR level
- Return appropriate HTTP status code
- Includes context for debugging
- May auto-retry (if idempotent)
- Examples: DB_003, API_005, AUTH_001
- HTTP Status: 400-409, 500
- User response: Specific error message

WARNING
────────────────────────────────────────────────────────────────────────────
- Log at WARN level
- Monitor for trends
- May auto-retry or throttle
- Typically recoverable
- Examples: SYS_004, API_004, NET_003
- HTTP Status: 400, 429, 503-504
- User response: Friendly message, suggest action

================================================================================
ERROR TRACKING IMPLEMENTATION
================================================================================

Endpoint: POST /metrics/errors

Request Payload:
{
  code: string;                   // Error code (e.g., 'API_004')
  message: string;                // Human-readable message
  timestamp: number;              // ISO 8601 or Unix timestamp
  severity: string;               // 'critical', 'error', 'warning'
  context: {
    endpoint?: string;
    userId?: string;
    requestId?: string;
    [key: string]: any;
  };
  stackTrace?: string;            // For server-side errors
}

Response:
{
  success: boolean;
  errorId: string;                // Unique ID for tracking
  action?: string;                // Recommended action
  retryAfter?: number;            // Milliseconds to wait before retry
}

Example:
  POST /metrics/errors HTTP/1.1
  Content-Type: application/json
  
  {
    "code": "API_004",
    "message": "Rate limit exceeded",
    "timestamp": "2026-01-09T06:22:00Z",
    "severity": "warning",
    "context": {
      "endpoint": "/api/data/process",
      "userId": "user_123",
      "requestId": "req_abc123",
      "clientIp": "192.168.1.100"
    }
  }

================================================================================
DASHBOARD ERROR DISPLAY
================================================================================

Dashboard shows:
  1. Error Rate Trend (% of requests with errors)
  2. Top Error Codes (frequency in last 1h)
  3. Error Distribution (by severity)
  4. Recent Critical Errors (with timestamps)
  5. Error Patterns (rate trending up/down)
  6. Affected Endpoints (endpoints with errors)

Alert When:
  ✓ Error rate > 5% (over last 5 minutes)
  ✓ Critical error occurs
  ✓ Same error repeated >10 times in 1 minute
  ✓ Database errors > 3% of requests

================================================================================
LOGGING ERROR EXAMPLES
================================================================================

Bad Example (not enough context):
  logger.error('API call failed');

Good Example (complete context):
  logger.error('API request failed', {
    code: 'API_004',
    endpoint: '/api/users/123',
    method: 'GET',
    userId: 'user_abc',
    requestId: 'req_xyz',
    status: 429,
    message: 'Rate limit exceeded',
    context: {
      limit: 100,
      window: '1m',
      current: 150
    }
  });

================================================================================
ERROR CODE USAGE IN CODE
================================================================================

// Throw custom error with code
throw new ApplicationError(
  'User not found',
  'DB_009',
  404,
  { userId: '123' }
);

// Track error
metricsCollector.recordError({
  code: 'VAL_001',
  message: 'Invalid email format',
  severity: 'error',
  context: { field: 'email', value: 'invalid' }
});

// Error in catch block
try {
  // operation
} catch (error) {
  const trackedError = errorTracker.trackError('ERR_002', {
    originalError: error.message,
    context: { operation: 'user_creation' }
  });
  throw trackedError;
}

================================================================================
MONITORING & ALERTING
================================================================================

Alert Rules:
  1. IF any CRITICAL error occurs → Page oncall
  2. IF error_rate > 5% for 5 min → Notify team
  3. IF same error > 10x in 1 min → Alert platform
  4. IF database errors trending up → Notify DBA
  5. IF auth errors > 20/min → Check for attack

Dashboard Metrics:
  - Error count by code (24h)
  - Error rate trend (5m, 1h, 24h)
  - P95/P99 error latency
  - Top affected endpoints
  - Top affected users
  - Error code severity distribution

================================================================================
END OF REGISTRY
================================================================================

For development:
  1. Define error code needed
  2. Check if exists in this registry
  3. If new, follow naming pattern and add to CHANGELOG
  4. Update client error handling accordingly
  5. Add test cases for error scenarios

For deployment:
  1. Ensure all error codes are documented
  2. Configure alert thresholds
  3. Set up logging aggregation
  4. Configure retention policies
  5. Train team on error codes

Last Verified: January 9, 2026
Version: 1.0
Status: Complete and Production-Ready
