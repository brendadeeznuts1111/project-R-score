/**
 * branded.ts — stable import path for branded domain strings.
 *
 * Implementation lives in domain modules under `lib/types/branded/`:
 *   session · identity · documents · security · deployment · audit · operations · portal · surfaces
 * Each module repeats the same pattern (type + as* + try* + parse* + SPECS)
 * so agents learn the invariant by structure, not by one dense file.
 *
 * Detector: `bun tools/branded-id-check.ts --smart`
 * Manifest: `bun tools/brand-manifest.ts` → `lib/types/brand-manifest.json`
 * Provenance (optional): `BRAND_PROVENANCE=1` logs mint events
 * Empty policy: never `'' as Brand` — use try* (undefined) or as* / parse* (throw)
 * Aggregate types: AnyId (Id suffix only) · AnyBrandedValue (IDs + keys + codes)
 * Runtime shape guards: BRAND_GUARDS.isSessionId(value) · isBrandedValue(name, value)
 *
 * @see ./branded/README.md
 * @see ./brand-manifest.json
 */

export * from './branded/index.ts';
