# Bookmaker Profiling & Registry Integration

Guide for profiling bookmaker APIs and storing endpoint parameter configurations in the registry for forensic logging.

## 🎯 Overview

As we build the bookmaker profile registry, we should record:
1. **Expected parameter counts per endpoint** - For forensic logging threshold detection
2. **URL encoding behavior** - HTML entity handling patterns
3. **Security risk levels** - Based on encoding anomalies

## 📋 Profiling Workflow

### Step 1: Profile Endpoint Parameters

During bookmaker discovery/profiling, record expected parameter counts:

```typescript
import { profileBookmakerEndpoint } from '../logging/bookmaker-profile';
import { Database } from 'bun:sqlite';

const db = new Database('security.db');

// Profile each endpoint as you discover it
await profileBookmakerEndpoint(db, 'draftkings', '/v2/events/:id/odds', 2);
await profileBookmakerEndpoint(db, 'draftkings', '/v2/events/:id/markets', 3);
await profileBookmakerEndpoint(db, 'draftkings', '/v2/events/:id/live', 4);
```

### Step 2: Test URL Encoding Behavior

```typescript
import { UrlAnomalyDetector } from '../research/fingerprinting/url-encoding-anomalies';

const detector = new UrlAnomalyDetector();
const encodingResults = await detector.testBookmakerEncoding('draftkings');

// encodingResults contains:
// - handlesHtmlEntities: boolean
// - entityVariants: string[]
// - securityRisk: 'low' | 'medium' | 'high'
```

### Step 3: Update Full Profile

```typescript
import { updateBookmakerProfile } from '../logging/bookmaker-profile';

updateBookmakerProfile(db, {
  bookmaker: 'draftkings',
  name: 'DraftKings',
  endpoints: new Map([
    ['/v2/events/:id/odds', 2],
    ['/v2/events/:id/markets', 3],
    ['/v2/events/:id/live', 4]
  ]),
  defaultThreshold: 5,
  urlEncodingBehavior: {
    handlesHtmlEntities: encodingResults.handlesHtmlEntities,
    entityVariants: encodingResults.entityVariants,
    securityRisk: encodingResults.securityRisk
  },
  lastProfiled: Date.now()
});
```

## 🔧 Integration with CorrectedForensicLogger

### Load Profile for Logger

```typescript
import { CorrectedForensicLogger } from '../logging/corrected-forensic-logger';
import { getEndpointConfigForLogger } from '../logging/bookmaker-profile';

const db = new Database('security.db');

// Load endpoint config from registry
const endpointConfig = getEndpointConfigForLogger(db, 'draftkings');

if (endpointConfig) {
  const logger = new CorrectedForensicLogger(config, {
    endpointConfig,
    securityMonitor: new RuntimeSecurityMonitor()
  });
  
  // Logger now uses dynamic thresholds based on endpoint
  const odds = await logger.fetchCompressedOdds('draftkings', 'event-123');
}
```

## 📊 Database Schema

### `bookmaker_profiles` Table

```sql
CREATE TABLE bookmaker_profiles (
  bookmaker TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint_config TEXT NOT NULL,  -- JSON: { endpoints: {...}, defaultThreshold: 5 }
  url_encoding_behavior TEXT,     -- JSON: { handlesHtmlEntities, entityVariants, securityRisk }
  last_profiled INTEGER,
  updated_at INTEGER NOT NULL
);
```

### Example Stored Data

```json
{
  "endpoint_config": {
    "endpoints": {
      "/v2/events/:id/odds": 2,
      "/v2/events/:id/markets": 3,
      "/v2/events/:id/live": 4
    },
    "defaultThreshold": 5
  },
  "url_encoding_behavior": {
    "handlesHtmlEntities": false,
    "entityVariants": [],
    "securityRisk": "low"
  }
}
```

## 🔄 Integration with Sharp Books Registry

### Build from SharpBookConfig

```typescript
import { buildEndpointConfigFromSharpBook } from '../logging/bookmaker-profile';
import { SHARP_BOOKS } from '../orca/sharp-books/registry';

const sharpBook = SHARP_BOOKS['draftkings'];
const endpointConfig = buildEndpointConfigFromSharpBook(sharpBook);

// Use in logger
const logger = new CorrectedForensicLogger(config, {
  endpointConfig
});
```

## 📝 Profiling Checklist

When profiling a new bookmaker:

- [ ] **Discover endpoints** - Identify all API endpoints
- [ ] **Count parameters** - Record expected parameter count per endpoint
- [ ] **Test encoding** - Run `testBookmakerEncoding()` to detect entity handling
- [ ] **Store profile** - Call `updateBookmakerProfile()` with complete data
- [ ] **Verify thresholds** - Test forensic logger with profile to ensure correct thresholds
- [ ] **Update SharpBookConfig** - Add `endpointParameters` to `SharpBookConfig` if needed

## 🎯 Example: Complete Profiling Flow

```typescript
import { Database } from 'bun:sqlite';
import { profileBookmakerEndpoint, updateBookmakerProfile } from '../logging/bookmaker-profile';
import { UrlAnomalyDetector } from '../research/fingerprinting/url-encoding-anomalies';

async function profileBookmaker(bookmaker: string) {
  const db = new Database('security.db');
  
  // 1. Profile endpoints
  await profileBookmakerEndpoint(db, bookmaker, '/v2/events/:id/odds', 2);
  await profileBookmakerEndpoint(db, bookmaker, '/v2/events/:id/markets', 3);
  
  // 2. Test URL encoding
  const detector = new UrlAnomalyDetector();
  const encodingResults = await detector.testBookmakerEncoding(bookmaker);
  
  // 3. Update full profile
  updateBookmakerProfile(db, {
    bookmaker,
    name: bookmaker.toUpperCase(),
    endpoints: new Map([
      ['/v2/events/:id/odds', 2],
      ['/v2/events/:id/markets', 3]
    ]),
    defaultThreshold: 5,
    urlEncodingBehavior: {
      handlesHtmlEntities: encodingResults.handlesHtmlEntities,
      entityVariants: encodingResults.entityVariants,
      securityRisk: encodingResults.securityRisk
    },
    lastProfiled: Date.now()
  });
  
  console.log(`✅ Profiled ${bookmaker}`);
}

// Profile all bookmakers
for (const bookmaker of ['draftkings', 'fanduel', 'betmgm']) {
  await profileBookmaker(bookmaker);
}
```

## 🔗 Related Documentation

- [Forensic Logging](./FORENSIC-LOGGING.md)
- [Forensic Logging Improvements](./FORENSIC-LOGGING-IMPROVEMENTS.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)

---

**Status**: ✅ Registry Integration Complete | 📊 Profile Storage Ready | 🔧 Logger Integration Ready
