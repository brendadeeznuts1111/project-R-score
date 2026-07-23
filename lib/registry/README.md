# lib/registry

Public artifact contracts — structural validators for the JSON artifacts served
by Cloudflare Pages from `public/registry/`.

| File                                   | Purpose                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`contracts.ts`](contracts.ts)         | `validateOpsSummary`, `validateDodRegistry`, `validateDodRegistryEntry`, `validateArtifact` |
| [`publish-auth.ts`](publish-auth.ts)   | Fail-closed publish Bearer gate (`REGISTRY_SECRET` / `FACTORY_WAGER_TOKEN`) for serve-public |

These are the wire contracts for the portal: if an artifact stops validating,
the portal breaks. Validators are pure (no I/O); tests run them against both
live artifacts (`tests/registry-contracts.test.ts`) and synthetic fixtures.

Related:

- `tests/functions-edge-safety.test.ts` — keeps Bun-only APIs out of edge
  `functions/`
- `lib/dod/verifier.ts` — writes `dod-registry.json` snapshots (signed entries)
