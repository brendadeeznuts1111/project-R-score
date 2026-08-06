# Bookmakers registry · @factorywager/bookmakers@0.4.1

<!-- REF:ID 0.1.bookmakers-portal-source -->
<a id="0.1.bookmakers-portal-source"></a>

Canonical **book / sportsbook** registry for the deep-link pipeline — **Pages
public catalog only** (`schemaVersion: 2`, package **0.4.1**). Ops credentials
live under `artifact-registry/bookmakers/v0.4.0/ops/` and are **never** deployed
to Pages.

| Surface | Path |
|---------|------|
| Board | [`/portal/bookmakers/`](./bookmakers/) |
| Public bake | [`/registry/bookmakers.json`](../registry/bookmakers.json) |
| Desk coverage bake | [`/registry/bookmakers-desk-coverage.json`](../registry/bookmakers-desk-coverage.json) |
| Ops desk (local/artifact) | `artifact-registry/bookmakers/v0.4.0/ops/books.json` |
| Migrate CLI | `bun run bookmakers:migrate` |
| Tenant | [`docs/harness/tenants/bookmakers-registry.md`](../../docs/harness/tenants/bookmakers-registry.md) |
| Open issues | [`docs/harness/tenants/bookmakers-open-issues.md`](../../docs/harness/tenants/bookmakers-open-issues.md) (BM-1…BM-5) |
| Route map | [routing.md](./routing.md) |

## Decisions (v0.3 → v0.4)

| Topic | Choice |
|-------|--------|
| Route key | `id === slug` (mode A — no UUID migration) |
| Regions | `{ country, stateCode? }` objects |
| Public branding | `label` · `skin` · `brandGroup` · `color` |
| URLs | `urls.{ web, api, limitsPage, termsPage }` — board domain falls back to host of `urls.web` |
| Fetcher | `fetcher` (`rest` \| `webview` \| `seat`) — **was** `fetcherType` |
| Sports | `sports` — **was** `supportedSports` |
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
  "limits": { "minBetUsd": null, "maxBetUsd": 500, "liquidityTier": "medium" },
  "color": "#db2777",
  "note": "…"
}
```

Current public summary (bake): **10** books · rest **1** · webview **4** · seat
**5**. Prefer package export `PUBLIC_BOOKMAKERS` over legacy `BOOKMAKERS`.

## Board UX

| Control | Behavior |
|---------|----------|
| Stats | count · webview · rest · seat · sports |
| Filter | fetcher all / rest / webview / seat |
| Search | id · skin · brandGroup · domain (`urls.web`) · sport |
| Label cell | label + skin + brandGroup |
| Regions | `US-FL` chips from objects or strings |
| Desk coverage card | matched / placeholder / unmatched vs seat-capital desk books |

## Desk coverage

Seat free-text `book` fields (Liquidity/Outs desk) are classified against the
public registry. Bake: `bookmakers-desk-coverage.json` on the board card.

| Class | Examples |
|-------|----------|
| matched | `Hard Rock Florida` → `hard-rock-florida` · `parlay21.com` → `parlay21-com` |
| placeholder | `Partner book TBD` · `SouthFL PPH Desk` |
| unmatched | `Orange777` — no domain SSOT; **do not invent** a registry id |

Max-bet fill: `bookmakers:desk-coverage -- --apply-max` writes desk-observed
`limits.maxBetUsd` into the public bake when missing. Align outs / raise book
ids with [limits.md](./limits.md) and [partners.md](./partners.md) seats.

## CLI

```bash
bun run bookmakers:migrate          # v0.3 mirror → v0.4 public + ops
bun run bookmakers:desk-coverage    # seat desk labels ↔ registry
bun run bookmakers:desk-coverage -- --apply-max
bun run bookmakers:desk-coverage -- --json
bun run bookmakers:prepare-publish  # sync package PUBLIC_BOOKMAKERS + tarball
bun run bookmakers:bake             # from published package (prefers PUBLIC_BOOKMAKERS)
bun run bookmakers:bake -- --version 0.4.1
bun run bookmakers:bake -- --local  # offline from artifacts/.../packages/bookmakers
bun run bookmakers:bake:check
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/bookmakers-migrate-v04.test.ts
bun test tests/bookmakers-board.test.ts
bun test tests/bookmakers-desk-coverage.test.ts
```

Publish path (when R2 available): `prepare-publish` → `factory:publish` →
`bun lib/factory/cli.ts snapshot public/registry/registry.json` →
`bookmakers:bake -- --version 0.4.1`.

## Failure paths

| Symptom | Fix |
|---------|-----|
| Live still shows v0.3 / secrets | Deploy Pages with committed v0.4 public bake |
| `apiKeyEnv` / `restBaseUrl` in public JSON | Re-run migrate · never bake ops into `public/` |
| Board empty domains | Ensure `urls.web` present (board falls back to `domain` only on legacy rows) |
| Still using `fetcherType` / `supportedSports` | v0.3 shape — migrate or fix consumer to `fetcher` / `sports` |
| brandGroup missing audit | Enrichment map in `lib/bookmakers/v04-types.ts` |
| Stale package bake | Prefer local artifact-registry 0.4.1 · then `bookmakers:bake -- --version 0.4.1` |
| Desk `Orange777` unmatched | Keep unmatched until domain SSOT exists (BM-1) |
| Desk `Partner book TBD` | Placeholder (not a book) |
| HTTP registry lag vs R2 | Snapshot `registry.json` after publish; bake prefers local snapshot (BM-2) |
| US webview `maxBetUsd` null | Enrichment / desk apply when sources exist (BM-3) |
| Tracked gaps | [`bookmakers-open-issues.md`](../../docs/harness/tenants/bookmakers-open-issues.md) |

## Related partner domain

| Concern | Where |
|---------|--------|
| Limit raises / coverage % | [limits.md](./limits.md) · [`/portal/limits/`](./limits/) |
| Outs · max bet · rails | [partners.md](./partners.md) · seat-capital-desk |
| Telegram Liquidity/Outs desk | [telegram.md](./telegram.md) |
| DOD image proofs | [dod.md](./dod.md) |
| Pages vs local API | [routing.md](./routing.md) |
| Ops pulse | [ops.md](./ops.md) · [index.md](./index.md) |

Mesh: [limits.md](./limits.md) · [partners.md](./partners.md) · [dod.md](./dod.md) ·
[telegram.md](./telegram.md) · [routing.md](./routing.md) · [factory.md](./factory.md) ·
[ops.md](./ops.md).

Tracked residual gaps: [`bookmakers-open-issues.md`](../../docs/harness/tenants/bookmakers-open-issues.md).
