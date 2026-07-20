/**
 * branded.ts — stable import path for branded string ID types.
 *
 * Implementation lives in domain modules under `lib/types/branded/`:
 *   session · identity · documents · security · deployment · audit · operations
 * Each module repeats the same pattern (type + as* + try* + parse* + SPECS)
 * so agents learn the invariant by structure, not by one dense file.
 *
 * Detector: `bun tools/branded-id-check.ts --smart`
 * Manifest: `bun tools/brand-manifest.ts` → `lib/types/brand-manifest.json`
 * Provenance (optional): `BRAND_PROVENANCE=1` logs mint events
 * Empty policy: never `'' as Brand` — use try* (undefined) or as* / parse* (throw)
 *
 * @see ./branded/README.md
 * @see ./brand-manifest.json
 */

export * from './branded/index.ts';
