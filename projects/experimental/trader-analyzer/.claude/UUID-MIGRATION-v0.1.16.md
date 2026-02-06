# ORCA UUID Migration to Bun.randomUUIDv5 v0.1.16

**All UUID generation migrated to Bun native APIs. Zero external dependencies.**

---

## Migration Summary

### Files Updated
1. `src/canonical/uuidv5.ts` - Migrated to `Bun.randomUUIDv5`
2. `src/orca/namespace.ts` - Migrated to `Bun.randomUUIDv5`
3. `src/arbitrage/matcher.ts` - Replaced `uuid` package with `Bun.randomUUIDv5`
4. `src/arbitrage/crypto-matcher.ts` - Replaced `uuid` package with `Bun.randomUUIDv5`
5. `src/arbitrage/detector.ts` - Replaced `uuid` package with `Bun.randomUUIDv7`
6. `src/api/docs.ts` - Updated documentation example

### API Changes
- **Before**: `import { v5 as uuidv5 } from "uuid"`
- **After**: `Bun.randomUUIDv5(name, namespace)`

- **Before**: `import { v4 as uuidv4 } from "uuid"`
- **After**: `Bun.randomUUIDv7()` (non-deterministic IDs)

---

## Implementation Details

### Canonical UUID Generation
```typescript
// src/canonical/uuidv5.ts
export function uuidv5(name: string, namespace: string): string {
  return Bun.randomUUIDv5(name, namespace);
}
```

### ORCA Namespace UUID Generation
```typescript
// src/orca/namespace.ts
export function generateOrcaId(key: string): string {
  return Bun.randomUUIDv5(key, ORCA_NAMESPACE);
}
```

### Namespace Constants
- **ORCA_NAMESPACE**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- **PREDICTION_NAMESPACE**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- **CRYPTO_PREDICTION_NAMESPACE**: `6ba7b810-9dad-11d1-80b4-00c04fd430c9`

---

## Blueprint Reference

```yaml
Blueprint: {
  id: "BP-CANONICAL-UUID",
  version: "0.1.16",
  root: "ROOT-MARKET-TAXONOMY",
  properties: {
    namespace: {
      value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      @root: "ROOT-ORCA-SHA1",
      @immutable: true
    },
    salt: {
      value: "{bookId}-{home}-{away}-{period}",
      @root: "ROOT-DETERMINISTIC",
      @validate: "string-format"
    },
    cache: {
      value: {ttl:300s;hitTrack:true},
      @root: "ROOT-SQLITE-WAL",
      @db: "/data/api-cache.db"
    },
    fetch: {
      value: "exchange-wrap-canonical",
      @chain: ["BP-EXCHANGE-FETCH","BP-UUID-GEN"]
    }
  },
  hierarchy: "0.1.16.CANONICAL.UUID.1.0.A.1.1"
}
```

---

## Canonical String Format

**Format**: `{sport}|{league}|{event_id}|{period}|{market_type}|{selection}|{line}|{subtype}`

**Example**:
```
basketball|nba|abc-123-def|0|spread|home|-3.5|
```

**Implementation**: Used in `src/orca/namespace.ts` via `buildMarketKey()`, `buildSelectionKey()`, etc.

---

## Performance

- **Native implementation**: Zero external package overhead
- **Deterministic**: Same input always produces same UUID
- **Cache support**: `generateOrcaIdCached()` for frequently used keys
- **Batch operations**: `generateOrcaIdBatch()` for bulk generation

---

## Validation

- All type checks pass
- No linter errors
- External `uuid` package usage eliminated
- Deterministic behavior maintained

---

**Status**: Deployed  
**Version**: 0.1.16  
**Instance**: ORCA-UUID-001, ORCA-NAMESPACE-001  
**Dependencies**: Zero external npm packages
