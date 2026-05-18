# What to Export from scan.ts

Based on the discovery audit: **who actually imports from scan** (excluding `scan.test.ts` and `src/code-discovery.ts`).

## Must export (used by other modules)

| Export                  | Used by                                                                      | Reason                             |
| ----------------------- | ---------------------------------------------------------------------------- | ---------------------------------- |
| `scanProject`           | `src/scan-worker.ts`                                                         | IPC worker entry; core scanner API |
| `ProjectInfo`           | `src/cookie-sessions.ts`, `src/project-utils.ts`                             | Shared project shape               |
| `BunInfoResponseSchema` | `lib/packument-zero-trust.ts` (+ test)                                       | Packument validation               |
| `NpmPackument`          | `lib/packument-zero-trust.ts`, `cli/renderers/packument-matrix.ts` (+ tests) | Packument type                     |
| `NpmPerson`             | `cli/renderers/packument-matrix.ts`                                          | Packument type                     |
| `escapeXml`             | `benchmarks/bench-rss.ts`                                                    | RSS/XML helpers                    |
| `decodeXmlEntities`     | `benchmarks/bench-rss.ts`                                                    | RSS/XML helpers                    |
| `generateRssXml`        | `benchmarks/bench-rss.ts`                                                    | RSS/XML helpers                    |
| `parseRssFeed`          | `benchmarks/bench-rss.ts`                                                    | RSS/XML helpers                    |

**Minimum public API:** 9 symbols (1 function, 2 types, 1 schema, 4 RSS helpers).

## Keep for CLI surface (used only inside scan.ts)

These are not imported elsewhere but are part of the CLI (e.g. `--store-token`, `--check-tokens`, help text):

| Export                                                                               | Why keep (for now)                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `BUN_KEYCHAIN_SERVICE`                                                               | Referenced in keychain hints / docs                   |
| `BUN_KEYCHAIN_TOKEN_NAMES`                                                           | Used by token commands                                |
| `isValidTokenName`, `validateTokenValue`, `tokenValueWarnings`                       | Token commands                                        |
| `keychainGet`, `keychainSet`, `keychainDelete`                                       | Token commands                                        |
| `tokenSource`                                                                        | Token listing                                         |
| `KeychainErr`, `classifyKeychainError`                                               | Error handling in token flow                          |
| `BUN_TOKEN_AUDIT_RSS_PATH`, `BUN_SCAN_RESULTS_RSS_PATH`, `BUN_ADVISORY_MATCHES_PATH` | Paths for RSS; could move to a constants module later |

You can keep these exported so tests and future tools can use them, or move them to e.g. `src/keychain.ts` and only
export from there.

## Candidate to stop exporting (or move)

| Export                     | Mark              | Recommendation                                                                                                                                |
| -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `platformHelp`             | REMOVAL-CANDIDATE | Only used in scan.ts (help text). Make internal (remove `export`) or inline.                                                                  |
| All other **VERIFY** items | VERIFY            | Used by `scan.test.ts` only. Either: keep exported for tests, or move test-only helpers to a test/shared module and stop exporting from scan. |

## Suggested export tiers

1. **Public API (export and support)**  
   `scanProject`, `ProjectInfo`, `BunInfoResponseSchema`, `NpmPackument`, `NpmPerson`, `escapeXml`, `decodeXmlEntities`,
   `generateRssXml`, `parseRssFeed`.

2. **CLI / keychain (export for now, consider moving)**  
   Keychain constants and functions above; optional: move to `src/keychain.ts` and re-export from scan or from a single
   `scanner` entrypoint.

3. **Internal (remove export)**  
   `platformHelp` and any symbol only used inside scan.ts or only by tests that you’re willing to import from a test
   helper instead.

4. **Schemas/types used only in scan.ts**  
   e.g. `ThreatFeedItemSchema`, `PackageJsonSchema`, `ProjectInfoSchema`, `XrefEntrySchema`, `XrefSnapshotSchema` — used
   internally. You can keep them exported for tests or make them internal and have tests import from a separate test
   fixture/schema module.

**TL;DR:** Export at least the 9 symbols in “Must export.” Keep keychain/RSS path exports if you want them part of the
public surface; otherwise move to a module and re-export. Make `platformHelp` and other “only used in scan or in tests”
symbols internal (or move to a test/shared module) when you’re ready to shrink the surface.
