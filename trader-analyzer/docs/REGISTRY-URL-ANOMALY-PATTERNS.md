# **URL Anomaly Patterns Registry API**

**Endpoint:** `GET /api/registry/url-anomaly-patterns`  
**Version:** 1.0.0  
**Status:** ✅ Operational

---

## **Overview**

The URL Anomaly Patterns Registry provides access to discovered URL anomaly patterns from forensic logging. These patterns are used for false steam detection and filtering in the trading intelligence system.

### **Key Features**

- ✅ **Pattern Discovery**: Automatically discovers patterns from forensic logs
- ✅ **False Steam Detection**: Identifies patterns that cause false steam alerts
- ✅ **Bookmaker Analysis**: Tracks anomalies by bookmaker
- ✅ **Confidence Scoring**: Provides confidence levels for each pattern
- ✅ **Market Impact Metrics**: Quantifies impact on line movements

---

## **API Endpoint**

### **GET /api/registry/url-anomaly-patterns**

Returns URL anomaly patterns discovered from forensic logging.

#### **Query Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sport` | string | No | `"NBA"` | Sport filter (NBA, NFL, NHL, MLB, etc.) |
| `hours` | number | No | `24` | Time window in hours for pattern discovery |

#### **Example Request**

```bash
# Default (NBA, 24 hours)
curl http://localhost:3001/api/registry/url-anomaly-patterns

# Custom sport and time window
curl "http://localhost:3001/api/registry/url-anomaly-patterns?sport=NFL&hours=48"
```

#### **Response Structure**

```typescript
{
  registry: "url-anomaly-patterns",
  timestamp: "2024-12-07T01:54:51.807Z",
  query: {
    sport: "NBA",
    hours: 24,
    timeRange: {
      start: "2024-12-06T01:54:51.000Z",
      end: "2024-12-07T01:54:51.806Z"
    }
  },
  patterns: [
    {
      patternId: "pattern-123",
      pattern_name: "HTML Entity Encoding",
      anomaly_type: "entity_encoding",
      affected_bookmakers: ["DraftKings", "Betfair"],
      url_signature: "&amp;",
      confidence_level: 0.85,
      market_impact: {
        avg_line_delta: 2.5,
        frequency_per_hour: 12.3,
        false_steam_probability: 0.92
      },
      tags: ["html-entity", "false-steam", "high-confidence"]
    }
  ],
  metrics: {
    total: 1,
    by_bookmaker: {
      "DraftKings": 1,
      "Betfair": 1
    },
    by_anomaly_type: {
      "entity_encoding": 1
    },
    market_impact_summary: {
      avg_line_delta: 2.5,
      total_frequency_per_hour: 12.3,
      avg_false_steam_probability: 0.92
    },
    confidence_summary: {
      avg_confidence: 0.85,
      high_confidence_count: 1,
      medium_confidence_count: 0,
      low_confidence_count: 0
    }
  },
  database_stats: {
    total_anomalies: 150,
    total_movements: 5000,
    anomaly_rate: 0.03
  },
  diagnostics: {
    database_accessible: true,
    tables_exist: {
      url_anomaly_audit: true,
      line_movement_audit_v2: true
    },
    anomalies_by_sport: {
      "NBA": 100,
      "NFL": 50
    },
    anomalies_by_bookmaker: {
      "DraftKings": 75,
      "Betfair": 50,
      "Pinnacle": 25
    },
    anomalies_all_time: 150,
    movements_all_time: 5000,
    recent_security_threats: 0
  }
}
```

---

## **Pattern Structure**

### **Pattern Object**

```typescript
interface URLAnomalyPattern {
  patternId: string;              // Unique pattern identifier
  pattern_name: string;           // Human-readable pattern name
  anomaly_type: string;           // Type of anomaly (entity_encoding, malformed_url, etc.)
  affected_bookmakers: string[];  // Bookmakers affected by this pattern
  url_signature: string;          // URL signature/pattern string
  confidence_level: number;        // Confidence score (0-1)
  market_impact: {
    avg_line_delta: number;        // Average line movement delta
    frequency_per_hour: number;    // Frequency of pattern occurrence
    false_steam_probability: number; // Probability of false steam (0-1)
  };
  tags: string[];                 // Pattern tags for filtering
}
```

---

## **Use Cases**

### **1. False Steam Filtering**

```typescript
// Filter out false steam alerts based on discovered patterns
const patterns = await fetch('/api/registry/url-anomaly-patterns').then(r => r.json());

const highConfidencePatterns = patterns.patterns.filter(
  p => p.confidence_level >= 0.7 && 
       p.market_impact.false_steam_probability >= 0.8
);

// Use patterns to filter alerts
function isFalseSteam(url: string): boolean {
  return highConfidencePatterns.some(pattern => 
    url.includes(pattern.url_signature)
  );
}
```

### **2. Bookmaker-Specific Analysis**

```typescript
// Analyze patterns by bookmaker
const patterns = await fetch('/api/registry/url-anomaly-patterns').then(r => r.json());

const bookmakerPatterns = patterns.patterns.reduce((acc, p) => {
  p.affected_bookmakers.forEach(bm => {
    if (!acc[bm]) acc[bm] = [];
    acc[bm].push(p);
  });
  return acc;
}, {} as Record<string, URLAnomalyPattern[]>);
```

### **3. Pattern Monitoring**

```typescript
// Monitor pattern frequency over time
async function monitorPatterns() {
  const patterns24h = await fetch('/api/registry/url-anomaly-patterns?hours=24').then(r => r.json());
  const patterns48h = await fetch('/api/registry/url-anomaly-patterns?hours=48').then(r => r.json());
  
  // Compare frequencies
  patterns24h.patterns.forEach(pattern => {
    const pattern48h = patterns48h.patterns.find(p => p.patternId === pattern.patternId);
    if (pattern48h) {
      const freqChange = pattern.market_impact.frequency_per_hour - 
                        pattern48h.market_impact.frequency_per_hour;
      console.log(`${pattern.pattern_name}: ${freqChange > 0 ? '+' : ''}${freqChange} freq/hour`);
    }
  });
}
```

---

## **Related Endpoints**

### **Diagnostics**

```bash
GET /registry/url-anomaly-patterns/diagnostics
```

Returns database diagnostics and table existence checks.

### **Initialize Database**

```bash
POST /api/registry/url-anomaly-patterns/initialize
```

Initializes the URL anomaly pattern database tables.

---

## **Performance**

- **Response Time**: <100ms (typical)
- **Database Queries**: Optimized with indexes
- **Caching**: Consider caching for high-frequency access

---

## **Cross-References**

- **9.1.5.21.0.0.0** → WebSocket Audit Server (uses URL parsing)
- **docs/URL-PARSING-EDGE-CASE.md** → URL parsing edge cases
- **docs/FORENSIC-LOGGING.md** → Forensic logging system
- **src/research/patterns/url-anomaly-patterns.ts** → Pattern engine implementation

---

## **OpenAPI Documentation**

Full OpenAPI specification available at:
- `http://localhost:3001/docs/openapi.json`
- Path: `/registry/url-anomaly-patterns`

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready
