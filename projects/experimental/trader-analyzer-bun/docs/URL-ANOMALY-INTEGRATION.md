# URL Anomaly Pattern Detection - Integration Summary

Complete integration of URL anomaly pattern detection engine into the NEXUS platform.

## ✅ Implementation Complete

**Commits**:
- `ea81b52` - feat(research): Add URL anomaly pattern detection engine
- `75a5269` - feat(research): Integrate URL anomaly patterns into MCP tools and docs
- Latest - docs(dashboard): Add URL anomaly patterns documentation link

---

## 📁 Files Created/Modified

### New Files
- `src/research/patterns/url-anomaly-patterns.ts` - Pattern detection engine
- `docs/URL-ANOMALY-PATTERNS.md` - Complete documentation
- `docs/URL-ANOMALY-INTEGRATION.md` - This file

### Modified Files
- `src/research/index.ts` - Export URL anomaly patterns
- `src/api/routes.ts` - Added 3 API endpoints
- `src/api/examples.ts` - Added example code
- `src/research/mcp/tools/research-explorer.ts` - Added 2 MCP tools
- `README.md` - Updated with API endpoints and structure
- `dashboard/index.html` - Added documentation link

---

## 🔗 API Endpoints

### 1. Discover Patterns
```text
GET /research/url-anomalies?sport=NBA&hours=24
```
Returns discovered URL anomaly patterns with market impact metrics.

### 2. Get Bookmaker Anomalies
```text
GET /research/url-anomalies/:bookmaker?hours=24
```
Returns all anomalies for a specific bookmaker.

### 3. Calculate False Steam Rate
```text
GET /research/url-anomalies/:bookmaker/false-steam-rate?hours=24
```
Returns the false positive rate for steam detection.

---

## 🔧 MCP Tools

### 1. research-discover-url-anomalies
Discover URL anomaly patterns that cause false steam signals.

**Parameters**:
- `sport` (optional): Sport to analyze (default: "NBA")
- `hours` (optional): Time window in hours (default: 24)

### 2. research-calculate-false-steam-rate
Calculate false positive rate for steam detection caused by URL bugs.

**Parameters**:
- `bookmaker` (required): Bookmaker to analyze
- `hours` (optional): Time window in hours (default: 24)

---

## 📊 Pattern Types

1. **html_entity_splitting** - URLs with `&amp;` entities split incorrectly
2. **parameter_injection** - URLs with `undefined` or malformed parameters
3. **encoding_mismatch** - Hex/decimal entity encoding issues
4. **duplicate_params** - URLs with duplicate parameter names

---

## 🎯 Use Cases

1. **Steam Signal Filtering**: Filter out false positives caused by URL bugs
2. **Bookmaker Profiling**: Identify which bookmakers have URL encoding issues
3. **Pattern Validation**: Validate if discovered patterns are real or artifacts
4. **Data Quality**: Improve data quality by identifying corrupted logs

---

## 🔗 Integration Points

### With Forensic Logging
- Uses `url_anomaly_audit` table from `CorrectedForensicLogger`
- Correlates anomalies with line movements from `line_movement_audit_v2`

### With Research Patterns
- Extends `ResearchPattern` interface
- Integrates with `SubMarketPatternMiner`
- Can be backtested using research tools

### With Security Monitoring
- Uses threat levels from `RuntimeSecurityMonitor`
- Correlates security threats with market impact

---

## 📈 Example Usage

### TypeScript
```typescript
import { UrlAnomalyPatternEngine } from '../research/patterns/url-anomaly-patterns';

const engine = new UrlAnomalyPatternEngine('research.db');

// Discover patterns
const patterns = await engine.discoverAnomalyPatterns('NBA', 24);

// Calculate false steam rate
const rate = engine.calculateFalseSteamRate('draftkings', 24);

// Get bookmaker anomalies
const anomalies = engine.getBookmakerAnomalies('draftkings', 24);

engine.close();
```

### API
```bash
# Discover patterns
curl http://localhost:3000/research/url-anomalies?sport=NBA&hours=24

# Get bookmaker anomalies
curl http://localhost:3000/research/url-anomalies/draftkings?hours=24

# Calculate false steam rate
curl http://localhost:3000/research/url-anomalies/draftkings/false-steam-rate?hours=24
```

### MCP
```json
{
  "method": "tools/call",
  "params": {
    "name": "research-discover-url-anomalies",
    "arguments": {
      "sport": "NBA",
      "hours": 24
    }
  }
}
```

---

## 📚 Documentation

- **[URL-ANOMALY-PATTERNS.md](./URL-ANOMALY-PATTERNS.md)** - Complete guide
- **[FORENSIC-LOGGING.md](./FORENSIC-LOGGING.md)** - Related forensic logging
- **[BOOKMAKER-PROFILING.md](./BOOKMAKER-PROFILING.md)** - Bookmaker profiling
- **[URL-PARSING-EDGE-CASE.md](./URL-PARSING-EDGE-CASE.md)** - URL parsing details

---

## ✅ Integration Checklist

- [x] Pattern detection engine implemented
- [x] API endpoints added
- [x] MCP tools integrated
- [x] Examples added
- [x] Documentation created
- [x] README updated
- [x] Dashboard links added
- [x] All changes committed

---

**Status**: ✅ Fully Integrated | 🔬 Research Ready | 📊 Pattern Discovery Active | 🔗 MCP Tools Available
