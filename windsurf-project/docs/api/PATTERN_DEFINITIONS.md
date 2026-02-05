# Code Reference Matrix: Pattern Definition Types

## §TYP:100 - Pattern Category Definitions

The Empire Pro engine classifies all logic into six primary semantic categories. Each category follows a specific **Domain Pattern** starting with `§`.

| Category | Prefix | Purpose | Primary Implementation | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Gate** | `§Gate:` | Pre-computation validation | `Gate` class | High (Security) |
| **Filter** | `§Filter:` | SIMD-accelerated data clean | `Filter` / `PhoneSanitizer` | Medium (Perf) |
| **Query** | `§Query:` | High-density data retrieval | `Query` builder | Low (I/O) |
| **Path** | `§Path:` | Physical-to-Semantic R2 mapping | `BunR2AppleManager` | Medium (Sync) |
| **Upload** | `§Upload:` | Stream-based data ingestion | `Upload` pipeline | Medium (I/O) |
| **Farm** | `§Farm:` | Scalable worker orchestration | `EnhancedOrchestrator` | High (Scale) |

---

## §INT:110 - TypeScript Unified Types

```typescript
/**
 * §SCHEMA:PatternType
 * Union of all valid pattern buckets
 */
export type PatternType = 
  | 'Gate'    // Security & Validation
  | 'Filter'  // Data Transformation
  | 'Query'   // Search & Retrieval
  | 'Path'    // Storage Mapping
  | 'Upload'  // Data Ingestion
  | 'Pattern' // URL & Route Matching
  | 'Farm';   // Worker Orchestration

/**
 * §INTERFACE:PatternDefinition
 * Complete structure for semantic pattern recovery
 */
export interface PatternDefinition {
  id: string;             // e.g. "Gate:12"
  signature: string;      // Initialization code one-liner
  perf: string;           // Target latency (e.g. "<10μs")
  semantics: string;      // Return object structure
  multiplier: number;     // Performance boost vs. legacy
  flags: string[];        // Optimization tags (simd, hyper, r2)
  locations: string;      // Source file path
}
```

---

## §BUN:120 - Implementation One-Liners

### 1. Gate Initialization (Security)

```typescript
// LSP: Fast security check with §Gate:12 semantics
const gate = new Gate({ scope: 'ENTERPRISE', perm: 'ops:metrics' });
const { score, status } = gate.validate(headers);
```

### 2. Filter / Sanitizer (Transformation)

```typescript
// LSP: SIMD-accelerated cleaner with §Filter:89-V3
const sanitizer = new PhoneSanitizerV2({ mode: 'strict' });
const cleanResult = sanitizer.process('+1 (415) 555-0199');
```

---

## §VAL:130 - Validation Rules

To maintain the **78.4% Doc Compression Efficiency**, all patterns must adhere to:

1. **Semantic Uniqueness**: IDs must be unique across the entire ecosystem.
2. **Performance Enforced**: Any logic exceeding its `perf` budget must be refactored to use Bun-native primitives.
3. **LSP Compliance**: All implementation code must be wrapped in properly tagged TypeScript blocks within documentation.

---
*Verified against MASTER_MATRIX v2.1.0*
