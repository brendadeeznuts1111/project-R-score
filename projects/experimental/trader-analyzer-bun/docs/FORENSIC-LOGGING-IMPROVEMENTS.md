# Forensic Logging Improvements

Production-ready enhancements to the forensic logging system based on code review feedback.

## ✅ Improvements Implemented

### 1. Database Type Definitions

**Issue**: Database interactions used inferred types without explicit type definitions.

**Solution**: Created `src/logging/types.ts` with explicit type definitions:

```typescript
export type ForensicDatabase = Database;

export interface AuditResult {
  auditId: string;
  bookmaker: string;
  rawUrl: string;
  paramCount: number;
  expectedParamCount: number;
  threshold: number;
  isAnomalous: boolean;
  reason?: string;
}
```

**Benefits**:
- Type safety for database operations
- Better IDE autocomplete
- Clearer API contracts
- Easier refactoring

### 2. Dynamic Threshold Configuration

**Issue**: Arbitrary threshold (`paramCount > 5`) in `auditForensicCapture` was not context-aware.

**Solution**: Implemented dynamic thresholds based on endpoint configuration:

```typescript
export interface BookmakerEndpointConfig {
  bookmaker: string;
  endpoints: Map<string, number>; // endpoint -> expected param count
  defaultThreshold?: number;
}
```

**Features**:
- Endpoint-specific expected parameter counts
- Configurable variation thresholds
- Fallback to default threshold if endpoint not configured
- Returns detailed `AuditResult[]` with reasoning

**Usage**:
```typescript
const endpointConfig: BookmakerEndpointConfig = {
  bookmaker: 'bookmaker',
  endpoints: new Map([
    ['/v2/events/:id/odds', 2],  // Expected 2 params
    ['/v2/events/:id/markets', 3] // Expected 3 params
  ]),
  defaultThreshold: 5
};

const logger = new CorrectedForensicLogger(config, {
  endpointConfig
});

// Thresholds are now dynamic:
// - /v2/events/:id/odds: threshold = 2 + 2 = 4
// - /v2/events/:id/markets: threshold = 3 + 2 = 5
// - Unknown endpoints: threshold = 5 (default)
```

### 3. Enhanced Error Handling

**Issue**: HTTP error handling didn't provide detailed status code information.

**Solution**: Enhanced `testBookmakerEncoding` with detailed error information:

```typescript
export interface HttpErrorDetails {
  status: number;
  statusText: string;
  reason: string;
  category: "client_error" | "server_error" | "network_error" | "unknown";
}
```

**Features**:
- Categorizes HTTP errors (4xx, 5xx, network)
- Provides status codes and status text
- Distinguishes network errors from HTTP errors
- Returns error details in response

**Example Output**:
```typescript
{
  handlesHtmlEntities: false,
  entityVariants: [],
  securityRisk: 'low',
  errorDetails: [
    {
      encoding: '?a=b&#x26;c=d',
      httpError: {
        status: 400,
        statusText: 'Bad Request',
        category: 'client_error'
      }
    },
    {
      encoding: '?a=b&amp;c=d',
      httpError: {
        status: 0,
        statusText: 'Network Error',
        category: 'network_error'
      }
    }
  ]
}
```

## 📁 Files Modified

1. **`src/logging/types.ts`** (NEW)
   - Type definitions for forensic database
   - `ForensicDatabase` type alias
   - `AuditResult` interface
   - `BookmakerEndpointConfig` interface
   - `HttpErrorDetails` interface

2. **`src/logging/forensic-movement-logger.ts`**
   - Added explicit `ForensicDatabase` type
   - Exported type definitions

3. **`src/logging/corrected-forensic-logger.ts`**
   - Added `endpointConfig` parameter
   - Implemented dynamic threshold logic
   - Enhanced `getExpectedParameterCount()` with endpoint awareness
   - Updated `auditForensicLogs()` to return `AuditResult[]`
   - Added `extractBookmakerFromUrl()` helper

4. **`src/api/examples.ts`**
   - Updated `testBookmakerEncoding` example with error details
   - Updated `auditForensicCapture` example with dynamic thresholds

5. **`src/security/index.ts`**
   - Exported new type definitions

## 🔧 Usage Examples

### Dynamic Threshold Configuration

```typescript
import { CorrectedForensicLogger, BookmakerEndpointConfig } from '../logging/corrected-forensic-logger';

const endpointConfig: BookmakerEndpointConfig = {
  bookmaker: 'draftkings',
  endpoints: new Map([
    ['/v2/events/:id/odds', 2],
    ['/v2/events/:id/markets', 3],
    ['/v2/events/:id/live', 4]
  ]),
  defaultThreshold: 5
};

const logger = new CorrectedForensicLogger(config, {
  endpointConfig,
  securityMonitor: new RuntimeSecurityMonitor()
});

// Audit logs with dynamic thresholds
const results = logger.auditForensicLogs();
results.forEach(result => {
  if (result.isAnomalous) {
    console.warn(`Anomaly: ${result.reason}`);
  }
});
```

### Enhanced Error Handling

```typescript
const detector = new UrlAnomalyDetector();
const result = await detector.testBookmakerEncoding('bookmaker');

if (result.errorDetails) {
  result.errorDetails.forEach(error => {
    if (error.httpError?.category === 'client_error') {
      console.warn(`Client error (${error.httpError.status}): ${error.encoding}`);
    } else if (error.httpError?.category === 'network_error') {
      console.error(`Network error: ${error.encoding}`);
    }
  });
}
```

## 📊 Benefits

1. **Type Safety**: Explicit types prevent runtime errors
2. **Context Awareness**: Dynamic thresholds reduce false positives
3. **Better Debugging**: Detailed error information aids troubleshooting
4. **Production Ready**: All improvements align with production best practices

## 🔗 Related Documentation

- [Forensic Logging](./FORENSIC-LOGGING.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)
- [URL Parsing Edge Case](./URL-PARSING-EDGE-CASE.md)

---

**Status**: ✅ Production Ready | 🔒 Type Safe | 📊 Context Aware
