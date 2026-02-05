# Forensic Logging - URL Entity Parsing Correction

Complete implementation of `CorrectedForensicLogger` that detects and corrects HTML entity encoding edge cases in URLs.

## 🔍 Problem

URL parsers treat HTML entities for `&` as valid parameter separators:

```typescript
// Note: Standard HTML entities are &#x26; (hex), &#38; (decimal), or &amp; (named)
// The example below uses &#x26 ; (with space) which is MALFORMED but still parsed
// The URL constructor strips the space before parsing

const myURL = new URL('https://example.org/?a=b&#x26 ;c=d');

// Results in two parameters (entity is parsed as & separator)
myURL.searchParams.forEach((value, name) => {
  console.log(name, value); // "a" "b" AND "c" "d"
});
```

**HTML Entity Formats:**
- **Standard**: `&#x26;` (hex), `&#38;` (decimal), `&amp;` (named) - **no spaces**
- **Malformed**: `&#x26 ;` (with space) - still parsed by URL constructor

**Impact**: Both standard and malformed entities are interpreted as literal `&` separators, causing parameter splitting.

## 🛡️ Solution

The `CorrectedForensicLogger` class:

1. **Detects** entity encoding in URLs before making API calls
2. **Corrects** parameter parsing to preserve entities as literal text
3. **Logs** anomalies to forensic audit database
4. **Integrates** with security monitoring for threat detection

## 📁 Files

### Base Class
- **`src/logging/forensic-movement-logger.ts`**
  - **`ForensicMovementLogger`** - Base class for forensic logging
  - Provides core functionality:
    - Bookmaker API call logging to forensic database
    - Standard `fetchCompressedOdds()` implementation
    - Database schema management (`line_movement_audit_v2`)
    - `getExpectedParameterCount()` method (override point)
  - **Override Points**: `fetchCompressedOdds()`, `getExpectedParameterCount()`

### Corrected Implementation
- **`src/logging/corrected-forensic-logger.ts`**
  - **`CorrectedForensicLogger`** extends `ForensicMovementLogger`
  - **What it adds**:
    - Overrides `fetchCompressedOdds()` to detect entity encoding before API calls
    - Custom `parseUrlWithEntities()` method for corrected parameter parsing
    - Overrides `getExpectedParameterCount()` to detect entity patterns
    - Anomaly logging to `url_anomaly_audit` table
    - Integration with `RuntimeSecurityMonitor` for threat detection

## 🔧 Usage

```typescript
import { CorrectedForensicLogger } from '../logging/corrected-forensic-logger';
import { RuntimeSecurityMonitor } from '../security/runtime-monitor';

// Configure bookmakers
const bookmakerConfig = new Map([
  ['bookmaker', {
    baseUrl: 'https://api.bookmaker.com',
    apiKey: 'your-api-key',
    headers: { 'Authorization': 'Bearer your-token' }
  }]
]);

// Create security monitor
const securityMonitor = new RuntimeSecurityMonitor();

// Create corrected logger
const logger = new CorrectedForensicLogger(
  { bookmakers: bookmakerConfig },
  { securityMonitor }
);

// Fetch odds - automatically detects and corrects entity encoding
try {
  const odds = await logger.fetchCompressedOdds('bookmaker', 'event-123');
  console.log('Odds fetched:', odds);
} catch (error) {
  console.error('Fetch failed:', error);
}

// Audit existing logs for anomalies
logger.auditForensicLogs();

// Cleanup
logger.close();
securityMonitor.destroy();
```

## 🔍 How It Works

### 1. URL Validation

Before making API calls, the logger:
- Parses the URL to detect entity encoding
- Compares expected vs actual parameter count
- Triggers anomaly detection if mismatch found

### 2. Entity Parsing Correction

```typescript
private parseUrlWithEntities(url: string): Map<string, string> {
  // 1. Escape entities temporarily
  const escaped = url.replace(/&([^;]+);/g, '__ENTITY__$1__');
  
  // 2. Parse normally
  const parsed = new URL(escaped);
  
  // 3. Restore entities in parameter values
  const corrected = new Map<string, string>();
  for (const [key, value] of parsed.searchParams) {
    const restoredKey = key.replace(/__ENTITY__([^_]+)__/g, '&$1;');
    const restoredValue = value.replace(/__ENTITY__([^_]+)__/g, '&$1;');
    corrected.set(restoredKey, restoredValue);
  }
  
  return corrected;
}
```

### 3. Anomaly Logging

All detected anomalies are logged to `url_anomaly_audit` table:
- Original URL
- Parsed parameter count
- Corrected parameter count
- Threat level
- Timestamp

### 4. Security Integration

When anomalies are detected:
- `RuntimeSecurityMonitor` is notified
- Threat alert is triggered (`entity_encoding_detected`)
- Incident response playbook is executed
- Request may be quarantined

## 📊 Database Schema

### `line_movement_audit_v2`
```sql
CREATE TABLE line_movement_audit_v2 (
  auditId TEXT PRIMARY KEY,
  bookmaker TEXT NOT NULL,
  eventId TEXT NOT NULL,
  raw_url TEXT NOT NULL,
  parsed_params TEXT,
  response_status INTEGER,
  response_size INTEGER,
  timestamp INTEGER NOT NULL
);
```

### `url_anomaly_audit`
```sql
CREATE TABLE url_anomaly_audit (
  anomalyId TEXT PRIMARY KEY,
  bookmaker TEXT NOT NULL,
  eventId TEXT NOT NULL,
  original_url TEXT NOT NULL,
  parsed_param_count INTEGER NOT NULL,
  corrected_param_count INTEGER NOT NULL,
  threat_level TEXT NOT NULL,
  detected_at INTEGER NOT NULL
);
```

## 🔗 Integration Points

### Security Monitoring
- Integrates with `RuntimeSecurityMonitor`
- Triggers `entity_encoding_detected` threat alerts
- Severity: 10 (CRITICAL)

### Incident Response
- Auto-quarantines suspicious requests
- Blocks IP addresses if needed
- Creates forensic snapshots

### Compliance Logging
- All API calls logged to forensic database
- Anomalies tracked separately
- Ready for SOC2/GDPR audits

## 📝 Examples

See `src/api/examples.ts` for complete code examples:
- `CorrectedForensicLogger - URL Entity Parsing Correction`

## 🚀 Production Deployment

### Enable Corrected Logger

```typescript
import { CorrectedForensicLogger } from './logging/corrected-forensic-logger';
import { RuntimeSecurityMonitor } from './security/runtime-monitor';

// Replace standard logger with corrected logger
const logger = new CorrectedForensicLogger(config, {
  securityMonitor: new RuntimeSecurityMonitor()
});
```

### Audit Existing Logs

```typescript
// Run audit on existing forensic logs
logger.auditForensicLogs();
```

### Monitor Anomalies

```typescript
// Query anomalies
const anomalies = db.query(`
  SELECT * FROM url_anomaly_audit
  WHERE threat_level = 'suspicious'
  ORDER BY detected_at DESC
`).all();
```

## 📚 Related Documentation

- [Security Architecture](./SECURITY-ARCHITECTURE.md)
- [URL Parsing Edge Case](./URL-PARSING-EDGE-CASE.md)
- [Bun API Reference](https://bun.com/reference)

---

**Status**: ✅ Implemented | 🔒 Security Hardened | 📊 Forensic Ready
