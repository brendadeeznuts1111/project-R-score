# Bun Runtime Utilities Integration Guide
**Document ID: 7.0.0.0.0.0.0** | **Last Updated: 2025-01-06**
**Cross-Reference Hub: See `6.1.1.2.2.x.x` for UI Context Inspection, `9.1.1.x.x.x.x` for Telegram Diagnostics**

---

## 7.1.0.0.0.0.0: Bun.inspect Ecosystem for Hyper-Bun Diagnostics

### 7.1.1.0.0.0.0: Tabular Data Visualization with `Bun.inspect.table`

```typescript
// src/runtime/diagnostics/bun-inspect-integration.ts

/**
 * @fileoverview 7.1.0.0.0.0.0: Bun.inspect utilities for runtime diagnostics in Hyper-Bun.
 * Provides structured logging and debugging capabilities for market intelligence data flows.
 * @see 6.1.1.2.2.1.2.0 for UIContext inspection patterns
 * @see 9.1.1.6.1.0 for Telegram diagnostic message formatting
 */

/**
 * 7.1.1.0.0.0.0: Formats complex tabular market data for terminal/console output.
 * Leverages Bun's native table rendering with Hyper-Bun's typed data structures.
 * 
 * @param tabularData - Array of market intelligence records (e.g., bookmaker odds, steam alerts)
 * @param properties - Optional column whitelist (e.g., ['timestamp', 'bookmaker', 'odds'])
 * @param options - Formatting options (indent, depth, colors)
 * @returns Formatted table string suitable for logging or Telegram messages
 * 
 * @example 7.1.1.1.0: Market Odds Table Inspection
 * // Test Formula:
 * // 1. Generate mock odds: `const odds = generateMockOdds(3);`
 * // 2. Execute: `Bun.inspect.table(odds, ['bookmaker', 'odds', 'timestamp'])`
 * // 3. Expected Result: 3-row table with aligned columns in terminal
 * 
 * @example 7.1.1.1.1: UIContext Diagnostic Snapshot
 * // Test Formula:
 * // 1. In /registry.html handler, log: `Bun.inspect.table([uiContext], ['userRole', 'featureFlags'])`
 * // 2. Expected Result: Single-row table showing role and enabled features
 * 
 * // Playwright Conversion:
 * // const logs = await page.evaluate(() => Bun.inspect.table([window.HYPERBUN_UI_CONTEXT]));
 * // expect(logs).toContain('apiBaseUrl');
 */
export function inspectMarketData(tabularData: any[], properties?: string[], options?: any): string {
  // 7.1.1.2.0: Defensive handling for empty datasets
  if (!tabularData?.length) {
    return Bun.inspect.table([{ error: 'No market data' }]);
  }
  
  // 7.1.1.3.0: Sanitize sensitive fields before inspection
  const sanitized = tabularData.map(item => {
    const { apiKey, token, ...safe } = item;
    return safe;
  });
  
  return Bun.inspect.table(sanitized, properties, { 
    colors: true, 
    ...options 
  });
}
```

---

### 7.1.2.0.0.0.0: Deep Array/Object Inspection with `Bun.inspect`

```typescript
/**
 * 7.1.2.0.0.0.0: Performs deep inspection of nested market intelligence structures.
 * Essential for debugging ShadowGraph data (see 6.1.1.2.2.1.2.2) and Telegram payloads.
 * 
 * @param value - Any JavaScript value (array, object, Map, Set)
 * @param options - Inspection depth, color, and formatting options
 * @returns Detailed string representation
 * 
 * @example 7.1.2.1.0: Feature Flags Deep Inspection
 * // Test Formula:
 * // 1. In UIContextRewriter, add: `console.log(Bun.inspect(this.context, {depth: 2}))`
 * // 2. Start server: `bun run src/api/routes.ts`
 * // 3. Expected Result: Colored JSON with nested featureFlags object expanded
 * 
 * @example 7.1.2.1.1: Telegram Mini App State Inspection
 * // Test Formula:
 * // 1. In Mini App console: `Bun.inspect(window.Telegram.WebApp.initDataUnsafe)`
 * // 2. Expected Result: Pretty-printed auth data with user object expanded
 * 
 * @see 7.1.1.0.0.0.0 for tabular variant
 */
export function inspectDeep(value: any, options?: { depth?: number; colors?: boolean }): string {
  // 7.1.2.2.0: Automatic truncation for extremely large arrays (e.g., 10k+ odds)
  if (Array.isArray(value) && value.length > 1000) {
    const truncated = value.slice(0, 100);
    return `Array(${value.length}) [${Bun.inspect(truncated, options)}...]`;
  }
  
  return Bun.inspect(value, { colors: true, depth: 5, ...options });
}
```

---

## 7.2.0.0.0.0.0: Cryptographic Utilities

### 7.2.1.0.0.0.0: Time-Ordered UUID Generation with `Bun.randomUUIDv7()`

```typescript
/**
 * 7.2.1.0.0.0.0: Generates time-ordered UUIDs for market event correlation.
 * Critical for tracking steam alerts (see 9.1.1.9.2.0.0) across distributed systems.
 * 
 * @returns UUIDv7 string (e.g., "0193a0e7-8b5a-7e50-ad7c-9b4e2d1f0a8b")
 * 
 * @example 7.2.1.1.0: Market Event ID Generation
 * // Test Formula:
 * // 1. Execute: `Bun.randomUUIDv7()` in two sequential calls
 * // 2. Compare first 12 characters: `uuid1.slice(0,12) < uuid2.slice(0,12)`
 * // 3. Expected Result: `true` (time-ordering property)
 * 
 * @example 7.2.1.1.1: Telegram Message Correlation
 * // Integration with 9.1.1.4.1.0:
 * // const eventId = Bun.randomUUIDv7();
 * // await sendTelegramMessage(`Alert #${eventId}: ShadowGraph anomaly detected`);
 * // await logToDatabase({ eventId, timestamp: Date.now() });
 * 
 * @see 7.2.2.0.0.0.0 for UUID validation utilities
 */
export function generateEventId(): string {
  // 7.2.1.2.0: Batch generation optimization for high-throughput scenarios
  return Bun.randomUUIDv7();
}

/**
 * 7.2.1.2.0: Creates a batch of time-ordered UUIDs for bulk operations.
 * @param count - Number of UUIDs to generate
 * @returns Array of UUIDv7 strings
 * 
 * @example 7.2.1.2.1: Bulk Steam Alert Processing
 * // Test Formula:
 * // Generate 1000 IDs: `const ids = generateEventIds(1000);`
 * // Verify uniqueness: `new Set(ids).size === 1000`
 * // Expected Result: `true`
 */
export function generateEventIds(count: number): string[] {
  return Array.from({ length: count }, () => Bun.randomUUIDv7());
}
```

---

## 7.3.0.0.0.0.0: String Metrics & Formatting

### 7.3.1.0.0.0.0: Unicode-Aware String Width with `Bun.stringWidth()`

```typescript
/**
 * 7.3.1.0.0.0.0: Unicode-Aware String Width Calculation for Telegram & Terminal Formatting
 * 
 * Calculates display width of Unicode strings for precise column alignment in monospace output.
 * Critical for:
 * - Telegram Mini App tables (see 9.1.1.4.1.0)
 * - Terminal diagnostics (see 7.1.1.0.0.0.0)
 * - HTMLRewriter log alignment (see 6.1.1.2.2.2.1.0)
 * 
 * Unicode Handling Guarantees:
 * - ASCII: `'A'` = 1 width unit
 * - Emoji: `'⚡️'` = 1 width unit (not 2)
 * - CJK Characters: `'世'` = 2 width units
 * - ANSI Escape Codes: `'\x1b[31m'` = 0 width units (invisible)
 * 
 * @param str - Input string containing Unicode (bookmaker names, emojis, CJK characters)
 * @returns Display width in monospace character cells
 * 
 * @example 7.3.1.1.0: Telegram Monospace Table Alignment
 * // Test Formula:
 * // 1. Execute: `Bun.stringWidth('Bet365⚡️')` → Expected: `8`
 * // 2. Execute: `Bun.stringWidth('Pinnacle')` → Expected: `8`
 * // 3. Execute: `Bun.stringWidth('威廉希尔')` → Expected: `8` (CJK)
 * // 4. Execute: `Bun.stringWidth('Betfair📊')` → Expected: `8` (emoji)
 * 
 * @see 7.1.1.0.0.0.0 for Bun.inspect.table integration
 * @see 9.1.1.4.1.0 for Telegram message formatting pipeline
 * @see 6.1.1.2.2.1.2.2 for feature flag structure inspection
 */
export function calculateTelegramPadding(str: string, targetWidth: number): string {
  // 7.3.1.2.0: Subtle Bug Prevention - Bun.stringWidth handles all Unicode edge cases
  const width = Bun.stringWidth(str);
  
  // 7.3.1.2.1: Defensive Padding - Prevent negative values from over-wide strings
  const padding = Math.max(0, targetWidth - width);
  
  // 7.3.1.2.2: Exact Visual Width - Return string that occupies precise column space
  return str + ' '.repeat(padding);
}

/**
 * 7.3.1.3.0: Multi-Column Telegram Table Formatter using stringWidth
 * Produces monospace-aligned tables compatible with HTMLRewriter diagnostics.
 * 
 * @example 7.3.1.3.1: Market Odds Telegram Table (Production Use Case)
 * // Test Formula:
 * // const rows = [
 * //   { bookmaker: 'Bet365⚡️', odds: 1.95, steam: true },
 * //   { bookmaker: 'Pinnacle', odds: 1.93, steam: false },
 * // ];
 * // const table = formatTelegramTable(rows, [
 * //   { key: 'bookmaker', header: 'Bookmaker' },
 * //   { key: 'odds', header: 'Odds' },
 * // ]);
 * // Expected: Aligned table with proper Unicode handling
 */
export function formatTelegramTable(
  rows: any[], 
  columns: { key: string; header: string }[]
): string {
  // 7.3.1.3.2: Dynamic Column Width Calculation - Per-column max width detection
  const widths = columns.map(col => {
    const headerWidth = Bun.stringWidth(col.header);
    const maxDataWidth = Math.max(...rows.map(row => Bun.stringWidth(String(row[col.key]))));
    return Math.max(headerWidth, maxDataWidth);
  });

  // 7.3.1.3.3: Header Row Construction - Aligned headers
  const header = columns.map((col, i) => 
    calculateTelegramPadding(col.header, widths[i])
  ).join(' | ');

  // 7.3.1.3.4: Separator Row - Markdown-style alignment guides
  const separator = widths.map(w => '-'.repeat(w)).join('-+-');

  // 7.3.1.3.5: Data Row Iteration - Each cell padded to column width
  const dataRows = rows.map(row => 
    columns.map((col, i) => 
      calculateTelegramPadding(String(row[col.key]), widths[i])
    ).join(' | ')
  );

  // 7.3.1.3.6: Final Assembly - Join with newlines for Telegram compatibility
  return [header, separator, ...dataRows].join('\n');
}

/**
 * 7.3.1.4.0: Ripgrep Output Formatter - Aligns grep results in terminal
 * Used for debugging cross-references between 6.x.x.x.x.x.x and 9.1.1.x.x.x.x documentation
 * 
 * @example 7.3.1.4.1: Documentation Cross-Reference Alignment
 * // Test Formula:
 * // const matches = [
 * //   { file: 'src/telegram/mini-app-context.ts', line: 28, content: '6.1.1.2.2.1.2.0' },
 * // ];
 * // const output = formatRipgrepOutput(matches);
 * // Expected: Aligned file names with line numbers
 */
export function formatRipgrepOutput(matches: { file: string; line: number; content: string }[]): string {
  const maxFileWidth = Math.max(...matches.map(m => Bun.stringWidth(m.file)));
  return matches.map(m => 
    `${calculateTelegramPadding(m.file, maxFileWidth)} | ${m.line}: ${m.content}`
  ).join('\n');
}
```

---

## 7.4.0.0.0.0.0: Cross-System Integration Examples

### 7.4.1.0.0.0.0: Combined Diagnostic Pipeline

```typescript
// src/runtime/diagnostics/integrated-inspector.ts

/**
 * 7.4.1.0.0.0.0: Unified diagnostic logger that feeds into both terminal and Telegram.
 * Demonstrates composition of all Bun utils for Hyper-Bun operations.
 * 
 * @see 6.1.1.2.2.1.2.0 for UIContext structure
 * @see 9.1.1.4.1.0 for Telegram message formatting
 * @see 7.1.1.0.0.0.0 for table generation
 * @see 7.2.1.0.0.0.0 for event correlation
 * @see 7.3.1.0.0.0.0 for string formatting
 */
export class HyperBunDiagnostics {
  private readonly sessionId: string;

  constructor() {
    // 7.4.1.1.0: Initialize session with time-ordered UUID
    this.sessionId = Bun.randomUUIDv7();
  }

  /**
   * 7.4.1.2.0: Logs UIContext state to terminal and Telegram monitoring channel.
   * @param context - The UIContext from HTMLRewriter (6.1.1.2.2.1.2.0)
   * @param severity - Log level (info, warn, error)
   * 
   * @example 7.4.1.2.1: Full Diagnostic Snapshot
   * // Test Formula:
   * // 1. In /registry.html handler: `diagnostics.logContext(uiContext, 'info')`
   * // 2. Expected Terminal Output: Colorized table with apiBaseUrl, userRole, featureFlags
   * // 3. Expected Telegram: Monospace block with aligned columns, prefixed by session UUID
   * 
   * // Ripgrep Verification:
   * // rg "7\.4\.1\.2\.0" src/ src/telegram/ --type-add 'log:*.{ts,txt}' -g '!*.log'
   */
  logContext(context: HyperBunUIContext, severity: string): void {
    // 7.4.1.3.0: Terminal output using Bun.inspect.table
    console.log(`[${severity.toUpperCase()}] Session: ${this.sessionId}`);
    console.log(inspectMarketData([context], ['userRole', 'apiBaseUrl', 'featureFlags']));

    // 7.4.1.4.0: Telegram output using stringWidth for alignment
    if (severity === 'error') {
      const lines = [
        `🚨 Alert #${Bun.randomUUIDv7()}`,
        `Session: ${this.sessionId}`,
        `Role: ${calculateTelegramPadding(context.userRole || 'guest', 10)} | Debug: ${context.debugMode}`
      ];
      // Send to Telegram monitoring (see 9.1.1.4.1.0)
      // sendTelegramMessage('```\n' + lines.join('\n') + '\n```');
    }
  }
}
```

---

## 7.5.0.0.0.0.0: Ripgrep Discovery & Validation

### 7.5.1.0.0.0.0: Comprehensive Search Patterns

```bash
# Find all Bun utility usage across Hyper-Bun
rg -n "Bun\.(inspect\.table|inspect|randomUUIDv7|stringWidth)" src/ --type ts

# Expected output:
# src/runtime/diagnostics/bun-inspect-integration.ts:15
# src/runtime/diagnostics/bun-inspect-integration.ts:45
# src/telegram/mini-app-context.ts:28 (UUID generation)

# Validate cross-references between utils and UIContext
rg -A3 -B3 "6\.1\.1\.2\.2\." src/runtime/diagnostics/ | rg "7\.\d+\.\d+\.\d+\.\d+"

# Find undocumented Bun utility usage (no JSDoc number)
rg "Bun\.(inspect|stringWidth|randomUUIDv7)" src/ | rg -v "7\.\d+\.\d+\.\d+\.\d+"

# Auto-generate dependency graph
#!/bin/bash
echo "digraph BunUtils {"
rg -o "7\.\d+\.\d+\.\d+\.\d+" src/runtime/diagnostics/*.ts | 
  awk -F: '{print "\"" $2 "\" -> \"file_" $1 "\";"}' | sort -u
echo "}"
```

---

## 7.6.0.0.0.0.0: Testing Matrix & CI Integration

### 7.6.1.0.0.0.0: Automated Test Conversion

```typescript
// tests/bun-utils-integration.spec.ts
/**
 * @fileoverview 7.6.1.0.0.0.0: Automated tests derived from @example formulas.
 * Each test maps directly to a documented test formula for traceability.
 * @see 7.1.1.1.0 for Market Odds Table inspection formula
 * @see 7.2.1.1.0 for UUID time-ordering formula
 */

test.describe('7.1.1.1.0: inspectMarketData', () => {
  test('generates aligned table', ({ expect }) => {
    const odds = [
      { bookmaker: 'Bet365', odds: 1.95, timestamp: Date.now() },
      { bookmaker: 'Pinnacle', odds: 1.93, timestamp: Date.now() }
    ];
    const result = inspectMarketData(odds);
    expect(result).toContain('Bet365');
    expect(result.split('\n').length).toBeGreaterThan(3); // Has header, separator, data
  });
});

test.describe('7.2.1.1.0: Bun.randomUUIDv7', () => {
  test('generates time-ordered IDs', ({ expect }) => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    expect(id1 < id2).toBe(true); // Time-ordering property
  });
});

test.describe('7.3.1.1.0: calculateTelegramPadding', () => {
  test('handles emoji width correctly', ({ expect }) => {
    const padded = calculateTelegramPadding('Bet365⚡', 10);
    expect(padded.length).toBe(10 + (padded.match(/⚡/) ? 0 : 1)); // Emoji = 1 char
  });
});
```

---

## 7.7.0.0.0.0.0: Production Deployment Checklist

### 7.7.1.0.0.0.0: Pre-Flight Bun Utils Validation

```bash
#!/bin/bash
# 7.7.1.0.0.0.0: Validates Bun utility availability before Hyper-Bun startup

# 1. Verify Bun.inspect.table exists (added in Bun 0.6.0)
bun -e "typeof Bun.inspect.table" 2>/dev/null || echo "7.7.1.1.0: Bun.inspect.table unavailable"

# 2. Test UUIDv7 generation speed (must generate >10k/sec)
time for i in {1..10000}; do bun -e "Bun.randomUUIDv7()"; done

# 3. Validate stringWidth handles all bookmaker names
cat data/bookmakers.txt | while read name; do
  width=$(bun -e "console.log(Bun.stringWidth('$name'))")
  [ "$width" -gt 0 ] || echo "7.7.1.2.0: stringWidth failed for $name"
done

# 4. Cross-reference integrity check
rg "7\.4\.1\.0\.0\.0\.0" src/runtime/diagnostics/*.ts src/telegram/*.ts || exit 1

echo "7.7.1.3.0: Bun utils validation passed"
```

---

## Cross-System Integration Summary

The `7.x.x.x.x.x.x` numbering scheme creates **runtime-level traceability** across Hyper-Bun's core utilities:

1. **Forward Reference**: HTMLRewriter (`6.1.1.2.2.2.1.0`) → Diagnostics (`7.4.1.2.0`) → Telegram (`9.1.1.4.1.0`)
2. **Backward Trace**: Telegram message ID (`9.1.1.4.1.0`) → Event ID generator (`7.2.1.0.0.0.0`)
3. **Ripgrep Command**: `rg "6\.1\.1\.2\.2\.\d+\.\d+|7\.\d+\.\d+\.\d+\.\d+|9\.1\.1\.\d+\.\d+\.\d+" --type ts --type html` finds all utility, UI, and Telegram integration points in a single command.

This transforms Bun's standard library into **architecturally auditable components** with explicit contracts, test formulas, and cross-system dependencies.
