# Bookmakers registry (v0.4 public)

Canonical **book / sportsbook** registry for the deep-link pipeline — **Pages
public catalog only** (`schemaVersion: 2`). Ops credentials live under
`artifact-registry/bookmakers/v0.4.0/ops/` and are **never** deployed to Pages.

| Surface | Path |
|---------|------|
| Board | [`/portal/bookmakers/`](./bookmakers/) |
| Public bake | [`/registry/bookmakers.json`](../registry/bookmakers.json) |
| Ops desk (local/artifact) | `artifact-registry/bookmakers/v0.4.0/ops/books.json` |
| Migrate CLI | `bun run bookmakers:migrate` |
| Tenant | [`docs/harness/tenants/bookmakers-registry.md`](../../docs/harness/tenants/bookmakers-registry.md) |
| Route map | [routing.md](./routing.md) |

## Decisions (v0.3 → v0.4)

| Topic | Choice |
|-------|--------|
| Route key | `id === slug` (mode A) |
| Regions | `{ country, stateCode? }` objects |
| Public branding | `label` · `skin` · `brandGroup` · `color` |
| URLs | `urls.{ web, api, limitsPage, termsPage }` |
| Fetcher | `fetcher` (`rest` \| `webview` \| `seat`) — was `fetcherType` |
| Sports | `sports` — was `supportedSports` |
| Limits | `limits.{ minBetUsd, maxBetUsd, liquidityTier }` |
| Lifecycle | `lifecycle[]` (`pre_match` · `live` · …) |
| Ops only | `restBaseUrl` · `apiKeyEnv` · `envVars` · balance/health |

## Public row shape

```json
{
  "id": "hard-rock-florida",
  "slug": "hard-rock-florida",
  "label": "Hard Rock Florida",
  "skin": "HardRockBet Florida",
  "brandGroup": "Hard Rock International",
  "urls": { "web": "https://…", "api": null, "limitsPage": null, "termsPage": null },
  "fetcher": "seat",
  "lifecycle": ["pre_match"],
  "sports": ["basketball"],
  "regions": [{ "country": "US", "stateCode": "FL" }],
  "limits": { "minBetUsd": null, "maxBetUsd": null, "liquidityTier": "medium" },
  "color": "#db2777",
  "note": "…"
}
```

## Board UX

| Control | Behavior |
|---------|----------|
| Stats | count · webview · rest · seat · sports |
| Filter | fetcher all / rest / webview / seat |
| Search | id · skin · brandGroup · domain · sport |
| Label cell | label + skin + brandGroup |
| Regions | `US-FL` chips from objects or strings |

## CLI

```bash
bun run bookmakers:migrate          # v0.3 mirror → v0.4 public + ops
bun run bookmakers:desk-coverage    # seat desk labels ↔ registry (Orange777 unmatched)
bun run bookmakers:desk-coverage -- --apply-max
bun run bookmakers:prepare-publish  # sync package PUBLIC_BOOKMAKERS + tarball
bun run bookmakers:bake             # from published package (prefers PUBLIC_BOOKMAKERS)
bun run bookmakers:bake -- --local  # offline from artifacts/.../packages/bookmakers
bun run bookmakers:bake:check
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/bookmakers-migrate-v04.test.ts
bun test tests/bookmakers-board.test.ts
bun test tests/bookmakers-desk-coverage.test.ts
```

## Failure paths

| Symptom | Fix |
|---------|-----|
| Live still shows v0.3 / secrets | Deploy Pages with committed v0.4 public bake |
| `apiKeyEnv` in public JSON | Re-run migrate · never bake ops into `public/` |
| Board empty domains | Ensure `urls.web` present (board falls back to `domain`) |
| brandGroup missing audit | Enrichment map in `lib/bookmakers/v04-types.ts` |
| Stale package bake | `bookmakers:prepare-publish` → `factory:publish` 0.4.0 · until then migrate |
| Desk `Orange777` unmatched | No domain SSOT — keep unmatched; do not invent registry id |
| Desk `Partner book TBD` | Placeholder (not a book) |

Related: [limits.md](./limits.md) · [partners.md](./partners.md) · [dod.md](./dod.md) · [routing.md](./routing.md).
