# URL Anomaly Pattern Detection

Research engine that discovers patterns caused by URL parsing anomalies, analyzing their impact on line movements and false steam signals.

## 🔍 Overview

The `UrlAnomalyPatternEngine` analyzes correlations between URL parsing bugs and false positive trading signals, helping identify when "steam moves" are actually artifacts of URL encoding issues.

## 📊 Pattern Types

### 1. HTML Entity Splitting
- **Type**: `html_entity_splitting`
- **Cause**: URLs with `&amp;` or `&#x26;` entities split parameters incorrectly
- **Impact**: Creates duplicate line movements within 100ms
- **False Steam Probability**: ~95%

### 2. Parameter Injection
- **Type**: `parameter_injection`
- **Cause**: URLs with `undefined` or malformed parameters
- **Impact**: Unexpected parameter splitting
- **False Steam Probability**: ~90%

### 3. Encoding Mismatch
- **Type**: `encoding_mismatch`
- **Cause**: Hex/decimal entity encoding (`&#x26;`, `&#38;`)
- **Impact**: Parameter count mismatches
- **False Steam Probability**: ~85%

### 4. Duplicate Parameters
- **Type**: `duplicate_params`
- **Cause**: URLs with duplicate parameter names (`?a=1&a=2`)
- **Impact**: Parameter confusion
- **False Steam Probability**: ~80%

## 🔧 Usage

### Discover Patterns

```typescript
import { UrlAnomalyPatternEngine } from '../research/patterns/url-anomaly-patterns';

const engine = new UrlAnomalyPatternEngine('research.db');

// Discover patterns for NBA
const patterns = await engine.discoverAnomalyPatterns('NBA', 24);

patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.pattern_name}`);
  console.log(`  Type: ${pattern.anomaly_type}`);
  console.log(`  False Steam Prob: ${pattern.market_impact.false_steam_probability * 100}%`);
  console.log(`  Frequency: ${pattern.market_impact.frequency_per_hour}/hour`);
});
```

### Calculate False Steam Rate

```typescript
// Calculate false positive rate for a bookmaker
const falseSteamRate = engine.calculateFalseSteamRate('draftkings', 24);
console.log(`False steam rate: ${(falseSteamRate * 100).toFixed(2)}%`);
```

### Get Bookmaker Anomalies

```typescript
// Get all anomalies for a specific bookmaker
const anomalies = engine.getBookmakerAnomalies('draftkings', 24);
console.log(`Found ${anomalies.length} anomalies`);
```

## 📡 API Endpoints

### Discover Patterns
```text
GET /research/url-anomalies?sport=NBA&hours=24
```

Returns discovered URL anomaly patterns with market impact metrics.

### Get Bookmaker Anomalies
```text
GET /research/url-anomalies/:bookmaker?hours=24
```

Returns all anomalies for a specific bookmaker.

### Calculate False Steam Rate
```text
GET /research/url-anomalies/:bookmaker/false-steam-rate?hours=24
```

Returns the false positive rate for steam detection caused by URL bugs.

## 🔬 How It Works

### 1. Pattern Discovery

The engine uses SQL window functions to:
- Join `url_anomaly_audit` with `line_movement_audit_v2`
- Cluster anomalies by URL signature
- Calculate frequency and parameter deltas
- Identify patterns with >5 occurrences

### 2. Market Impact Calculation

For each pattern, calculates:
- **avg_line_delta**: Average line movement caused by anomaly
- **frequency_per_hour**: How often the pattern occurs
- **false_steam_probability**: Probability of false steam signals

### 3. False Steam Rate

Calculates the ratio of:
- Line movements associated with URL anomalies
- Total line movements for the bookmaker

**Formula**:
```text
false_steam_rate = url_anomaly_moves / total_moves
```

## 📊 Example Output

```json
{
  "patterns": [
    {
      "patternId": "url_anom_abc123",
      "pattern_name": "suspicious_url_anomaly_draftkings",
      "anomaly_type": "html_entity_splitting",
      "affected_bookmakers": ["draftkings"],
      "url_signature": "https://api.draftkings.com/v2/events",
      "market_impact": {
        "avg_line_delta": 0.5,
        "frequency_per_hour": 12.5,
        "false_steam_probability": 0.95
      },
      "confidence_level": 0.85,
      "backtest_accuracy": 0.85
    }
  ],
  "sport": "NBA",
  "hours": 24,
  "total": 1
}
```

## 🔗 Integration Points

### With Forensic Logging
- Uses `url_anomaly_audit` table from `CorrectedForensicLogger`
- Correlates anomalies with line movements

### With Research Patterns
- Extends `ResearchPattern` interface
- Integrates with `SubMarketPatternMiner`
- Can be backtested using research tools

### With Security Monitoring
- Uses threat levels from `RuntimeSecurityMonitor`
- Correlates security threats with market impact

## 📝 Database Schema

### Required Tables

1. **`url_anomaly_audit`** (from `CorrectedForensicLogger`)
   - `anomalyId`, `bookmaker`, `eventId`, `original_url`
   - `parsed_param_count`, `corrected_param_count`, `threat_level`, `detected_at`

2. **`line_movement_audit_v2`** (from `ForensicMovementLogger`)
   - `auditId`, `bookmaker`, `eventId`, `raw_url`
   - `parsed_params`, `response_status`, `timestamp`

## 🎯 Use Cases

1. **Steam Signal Filtering**: Filter out false positives caused by URL bugs
2. **Bookmaker Profiling**: Identify which bookmakers have URL encoding issues
3. **Pattern Validation**: Validate if discovered patterns are real or artifacts
4. **Data Quality**: Improve data quality by identifying corrupted logs

## 🔗 Related Documentation

- [Forensic Logging](./FORENSIC-LOGGING.md)
- [Bookmaker Profiling](./BOOKMAKER-PROFILING.md)
- [URL Parsing Edge Case](./URL-PARSING-EDGE-CASE.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)

---

**Status**: ✅ Implemented | 🔬 Research Ready | 📊 Pattern Discovery Active
