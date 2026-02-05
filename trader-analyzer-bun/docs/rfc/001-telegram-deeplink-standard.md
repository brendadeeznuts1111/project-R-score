# RFC 001: Telegram Deep-Link Standard for Hyper-Bun Alerts

**Status**: Active  
**Version**: 1.0.0  
**Date**: 2025-01-06  
**Author**: Hyper-Bun Team

---

## Abstract

This RFC defines the mandatory structure and parameters for all Hyper-Bun alert deep-links embedded in Telegram messages. Deep-links transform Telegram notifications into **actionable, traceable entry points** into the Hyper-Bun intelligence system, enabling operators to instantly navigate from alerts to relevant dashboard views with full context.

---

## 1. Deep-Link Base URL

### 1.1 Base URL Resolution

All deep-links MUST use the Hyper-Bun Dashboard Server base URL:

- **Development**: `http://localhost:8080` (see `DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV` in `src/utils/rss-constants.ts`)
- **Production**: `https://dashboard.hyperbun.com` (see `DEEP_LINK_DEFAULTS.DASHBOARD_URL_PROD` in `src/utils/rss-constants.ts`)
- **Configurable**: Via `HYPERBUN_DASHBOARD_URL` environment variable or `UIPolicyManager` context

### 1.2 Base URL Detection

The base URL SHALL be resolved from:
1. `HYPERBUN_DASHBOARD_URL` environment variable (highest priority)
2. `UIPolicyManager.buildUIContext()` → `apiBaseUrl` (replacing port `:3001` with `:8080` for dashboard)
   - API port: `DEEP_LINK_DEFAULTS.API_PORT` (`3001`)
   - Dashboard port: `DEEP_LINK_DEFAULTS.DASHBOARD_PORT` (`8080`)
3. Default fallback: `DEEP_LINK_DEFAULTS.DASHBOARD_URL_DEV` (`http://localhost:8080`)

**Constants Reference**: See `src/utils/rss-constants.ts` for `DEEP_LINK_DEFAULTS` constants.

---

## 2. Standard Path Segments

### 2.1 Alert Paths

| Path | Purpose | Alert Type | Constant |
|------|---------|------------|----------|
| `/alert/` | General alert overview | All alerts | `DEEP_LINK_PATHS.ALERT_BASE` |
| `/alert/covert-steam/` | Covert Steam Event details | `CovertSteamEventRecord` | `DEEP_LINK_PATHS.ALERT_COVERT_STEAM` |
| `/alert/perf-regression/` | Performance regression details | Performance alerts (`6.7.1A.0.0.0.0`) | `DEEP_LINK_PATHS.ALERT_PERF_REGRESSION` |
| `/alert/market-anomaly/` | Market anomaly detection | Market intelligence alerts | `DEEP_LINK_PATHS.ALERT_MARKET_ANOMALY` |
| `/audit/url-anomaly/` | URL anomaly pattern details | `UrlAnomalyPattern` | `DEEP_LINK_PATHS.AUDIT_URL_ANOMALY` |
| `/audit/security-threat/` | Security threat details | Security incidents | `DEEP_LINK_PATHS.AUDIT_SECURITY_THREAT` |
| `/registry/` | Registry browser | Registry-related alerts | `DEEP_LINK_PATHS.REGISTRY` |
| `/dashboard/` | Main dashboard | System status, general navigation | `DEEP_LINK_PATHS.DASHBOARD` |

**Constants Reference**: All path segments are defined in `DEEP_LINK_PATHS` in `src/utils/rss-constants.ts`. Use these constants in code instead of hardcoded strings.

### 2.2 Path Segment Rules

- Paths MUST be lowercase
- Paths MUST use hyphens (`-`) for word separation
- Paths MUST end with `/` for consistency
- Paths MUST be URL-encoded when used in query strings

---

## 3. Mandatory Query Parameters

### 3.1 Required Parameters (RFC 9.1.1.9.1.4.0)

All deep-links MUST include these mandatory parameters to ensure alert tracking and traceability:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | ✅ Yes | Unique identifier for the specific alert instance, ensuring traceability | `NFL-2025-001-1704556800000` |
| `type` | string | ✅ Yes | Alert type identifier | `covert-steam`, `perf-regression` |
| `ts` | number | ✅ Yes | Epoch timestamp (milliseconds) of when alert was generated | `1704556800000` |

**Traceability Emphasis**: The `id` parameter explicitly ensures alert tracking by combining event identifier and timestamp, creating a unique fingerprint for each alert instance.

### 3.2 Optional Parameters (RFC 9.1.1.9.1.5.0)

Conditionally included based on alert context. These optional fields enable intelligent routing and context preservation:

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `bm` | string | ❌ No | Bookmaker name (if applicable) | `DraftKings`, `Betfair` |
| `ev` | string | ❌ No | Event identifier (sports event) | `NFL-2025-001` |
| `node` | string | ❌ No | Market node ID (for node-specific alerts) | `node_abc123` |
| `severity` | number | ❌ No | Alert severity score (0-10) | `9.5` |
| `source` | string | ❌ No | Alert source system | `covert-steam-detector`, `perf-monitor` |
| `ref` | string | ❌ No | Reference to documentation section | `9.1.1.9.1.0.0` |

**Context Parameters**: Optional fields enable intelligent routing by preserving alert context without cluttering the URL with unnecessary data.

### 3.3 Parameter Encoding

- All parameter values MUST be URL-encoded using `encodeURIComponent()`
- Parameter names MUST be lowercase
- Parameter values MUST be strings (numbers converted to strings)

---

## 4. Deep-Link Generation Examples

### 4.1 Covert Steam Alert

```typescript
// Input
const alert = {
  event_identifier: "NFL-2025-001",
  bookmaker_name: "DraftKings",
  detection_timestamp: 1704556800000,
  source_dark_node_id: "node_abc123",
  impact_severity_score: 9.5
};

// Generated Deep-Link
https://dashboard.hyperbun.com/alert/covert-steam/?id=NFL-2025-001-1704556800000&type=covert-steam&ts=1704556800000&bm=DraftKings&ev=NFL-2025-001&node=node_abc123&severity=9.5
```

### 4.2 Performance Regression Alert

```typescript
// Input
const alert = {
  regression_id: "perf-reg-20250106-001",
  detected_at: 1704556800000,
  endpoint: "/api/arbitrage/scan",
  severity: 8.0
};

// Generated Deep-Link
https://dashboard.hyperbun.com/alert/perf-regression/?id=perf-reg-20250106-001&type=perf-regression&ts=1704556800000&severity=8.0&source=perf-monitor
```

### 4.3 URL Anomaly Pattern Alert

```typescript
// Input
const alert = {
  pattern_id: "url-anom-001",
  detected_at: 1704556800000,
  bookmaker: "Betfair",
  anomaly_type: "query-parameter-anomaly"
};

// Generated Deep-Link
https://dashboard.hyperbun.com/audit/url-anomaly/?id=url-anom-001&type=url-anomaly&ts=1704556800000&bm=Betfair
```

---

## 5. Message Formatting Integration

### 5.1 Telegram HTML Format

Deep-links MUST be embedded in Telegram messages using HTML anchor tags:

```html
<a href="<DEEPLINK_URL>">View Details on Dashboard</a>
```

### 5.2 Link Text Standards

| Context | Link Text | Icon |
|---------|-----------|------|
| Covert Steam Alert | `View Details on Dashboard` | 🔗 |
| Performance Alert | `View Performance Details` | 📊 |
| Security Alert | `View Security Details` | 🔒 |
| Registry Alert | `View Registry Entry` | 📋 |
| General Alert | `View Alert Details` | 📌 |

### 5.3 Complete Message Example

```html
🚨 <b>CRITICAL Covert Steam Alert!</b>

<b>Event:</b> <code>NFL-2025-001</code>
<b>Bookmaker:</b> <code>DraftKings</code>
<b>Severity:</b> <code>9.5</code> (Threshold: <code>8.0</code>)
<b>Move:</b> <code>0.5</code> points in Q1 (Lag: <code>45s</code>)
<b>Status:</b> <code>Confirmed Sharp Money</code> / <code>Potential Arbitrage</code>

<a href="https://dashboard.hyperbun.com/alert/covert-steam/?id=NFL-2025-001-1704556800000&type=covert-steam&ts=1704556800000&bm=DraftKings&ev=NFL-2025-001&node=node_abc123&severity=9.5">View Details on Dashboard</a>
```

### 5.4 Template Integration with Deep-Link Validation

Templates MUST validate deep-link generation before rendering:

```handlebars
{{! templates/covert_steam_alert.tmpl.hbs }}
{{#if deepLink}}
  🚨 *{{#if (eq severity 10)}}CRITICAL{{else if (gte severity 8)}}HIGH{{else}}MEDIUM{{/if}} Covert Steam Alert!*
  *Event:* `{{payload.event_identifier}}`
  *Bookmaker:* `{{payload.bookmaker_name}}`
  *Severity:* `{{payload.impact_severity_score}}` (Threshold: `{{threshold}}`)
  *Move:* `{{payload.covert_line_movement_magnitude}}` pts in `{{payload.market_internal_id}}` (Lag: `{{payload.visible_market_response_lag_ms}}`ms)
  *Status:* `{{payload.sharp_money_footprint_indicator}}` / `{{#if payload.potential_arbitrage_opportunity}}Potential Arbitrage{{else}}No immediate arb{{/if}}`
  *Deep-Link:* [View Details on Dashboard]({{deepLink}})
{{else}}
  🚨 *CRITICAL Covert Steam Alert!*
  *Event:* `{{payload.event_identifier}}`
  *Bookmaker:* `{{payload.bookmaker_name}}`
  *Deep-Link:* *Generation failed - check alert data*
{{/if}}
```

**Template Validation**:
- Deep-link MUST be validated before template rendering
- If deep-link generation fails, template MUST display error message
- All required alert fields MUST be present before generating deep-link

---

## 6. Implementation Requirements

### 6.1 DeepLinkGenerator Class

All deep-link generation MUST use the centralized `DeepLinkGenerator` class with proper error handling and validation:

```typescript
// src/utils/deeplink-generator.ts
class DeepLinkGenerator {
  /**
   * Constructor accepts:
   * - string: Explicit dashboard base URL
   * - HyperBunUIContext: Automatically converts API URL to dashboard URL
   * - undefined: Uses HYPERBUN_DASHBOARD_URL env var or default
   */
  constructor(dashboardBaseUrlOrContext?: string | HyperBunUIContext);
  
  /**
   * Generates RFC-compliant deep-link for Covert Steam alerts
   * @throws {TypeError} if required parameters are missing
   */
  generateCovertSteamLink(alert: CovertSteamEventRecord): string;
  
  /**
   * Generates link for performance regression alerts
   * @throws {TypeError} if required parameters are missing
   */
  generatePerfRegressionLink(alert: PerformanceRegressionAlert): string;
  
  generateUrlAnomalyLink(alert: UrlAnomalyPattern): string;
  generateGenericAlertLink(alert: GenericAlert): string;
  
  /**
   * Static factory method for creating from UI context
   */
  static fromUIContext(uiContext: HyperBunUIContext): DeepLinkGenerator;
}
```

### 6.2 Error Handling

The `DeepLinkGenerator` class MUST:
- Validate required parameters before generating URLs
- Throw `TypeError` with descriptive messages for missing required fields
- Handle URL encoding automatically via `URLSearchParams`
- Validate dashboard base URL format during construction

### 6.3 HyperBunUIContext Integration

The generator supports integration with `HyperBunUIContext`:

```typescript
// Example: Using UI context to automatically resolve dashboard URL
const context = await uiPolicyManager.buildUIContext(request);
const generator = DeepLinkGenerator.fromUIContext(context);
// or
const generator = new DeepLinkGenerator(context);
```

The generator automatically converts API base URL (port 3001) to dashboard URL (port 8080) when provided with a `HyperBunUIContext` instance.

### 6.2 Integration Points

Deep-link generation MUST be integrated at:

1. **Telegram Message Router** (`9.1.1.10.0.0.0`): Generates deep-links before message formatting
2. **Templating Engine** (`9.1.1.9.2.0.0`): Templates receive pre-generated deep-links
3. **Changelog Poster** (`src/telegram/changelog-poster.ts`): Commit links use deep-link format
4. **RSS Poster** (`src/telegram/rss-poster.ts`): RSS items include deep-links to dashboard views

---

## 7. Dashboard Route Implementation

### 7.1 Required Dashboard Routes

The Hyper-Bun dashboard MUST implement routes to handle deep-links:

| Route | Handler | Purpose |
|-------|---------|---------|
| `/alert/covert-steam/` | `dashboard/alert-covert-steam.html` | Display Covert Steam alert details |
| `/alert/perf-regression/` | `dashboard/alert-perf-regression.html` | Display performance regression details |
| `/audit/url-anomaly/` | `dashboard/audit-url-anomaly.html` | Display URL anomaly pattern details |

### 7.2 Query Parameter Parsing

Dashboard routes MUST:
1. Parse all query parameters from the deep-link
2. Validate required parameters (`id`, `type`, `ts`)
3. Load alert data using the `id` parameter
4. Display context-rich view with all available parameters

---

## 8. Testing Requirements

### 8.1 Unit Tests

- `test/utils/deeplink-generator.test.ts`: Test deep-link generation for all alert types
- Verify URL encoding correctness
- Verify parameter inclusion/exclusion logic

### 8.2 Integration Tests

- `test/integration/telegram-deeplink.test.ts`: End-to-end test of Telegram → Dashboard navigation
- Verify deep-links are clickable in Telegram
- Verify dashboard routes correctly parse and display alert data

### 8.3 Cross-Reference Tests

- `test/docs/cross-reference.test.ts`: Verify RFC document references are valid
- Verify all code references to RFC sections are accurate

### 8.4 UI Integration Tests

- `test/ui/telegram-deep-link.test.ts`: End-to-end UI routing validation
- Verify deep-links are clickable in Telegram
- Verify dashboard routes correctly parse and display alert data
- Validate RFC compliance through UI interaction

**UI Integration Testing Formula**:
```typescript
// test/ui/telegram-deep-link.test.ts
describe('Deep-Link RFC Compliance', () => {
  test('UI routing rule generates RFC-compliant deep-link', async () => {
    // 1. Navigate to Telegram routing configuration UI
    await page.goto('/dashboard/telegram-routing');
    
    // 2. Click on CovertSteamEvent routing rule
    await page.click('[data-testid="covert-steam-rule"]');
    
    // 3. Capture generated deep-link from new tab
    const newTab = await browser.newPage();
    const url = newTab.url();
    
    // 4. Validate RFC compliance
    expect(url).toMatch(/^http:\/\/localhost:8080\/alert\/covert-steam\?/);
    expect(url).toContain('id=');
    expect(url).toContain('type=covert-steam');
    expect(url).toContain('ts=');
    
    // Optional parameters validation
    if (url.includes('bm=')) {
      expect(url).toMatch(/bm=[^&]+/);
    }
  });
});
```

---

## 9. Versioning & Compatibility

### 9.1 RFC Versioning

- RFC version format: `MAJOR.MINOR.PATCH`
- Breaking changes increment MAJOR version
- New optional parameters increment MINOR version
- Bug fixes increment PATCH version

### 9.2 Backward Compatibility

- New optional parameters MUST NOT break existing deep-links
- Dashboard routes MUST handle missing optional parameters gracefully
- Deprecated parameters MUST be supported for at least one MAJOR version

---

## 10. References

- **Telegram Bot API**: https://core.telegram.org/bots/api#html-style
- **Hyper-Bun Dashboard**: `dashboard/registry.html`
- **UI Context Rewriter**: `src/services/ui-context-rewriter.ts` (`6.1.1.2.2.0.0`)
- **Telegram Integration**: `docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md` (`9.1.1.9.1.0.0`)
- **Message Formatting**: `docs/TELEGRAM-DEV-SETUP.md` (`9.1.1.9.2.0.0`)

---

## 11. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-06 | Initial RFC specification |

---

**Cross-Reference**: This RFC is referenced in `docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md` section `9.1.1.9.1.0.0`.
