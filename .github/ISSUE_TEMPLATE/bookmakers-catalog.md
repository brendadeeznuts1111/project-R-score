---
name: Bookmakers catalog
about: Add, fix, or migrate a bookmaker row in the v0.4 public/ops catalog
title: "[bookmakers] "
labels: bookmakers, registry
---

## Bookmaker

| Field | Value |
|-------|-------|
| Proposed `id` / `slug` | **must be equal** (`id === slug`) |
| Label / skin / brandGroup | |
| `fetcher` | `rest` · `webview` · `seat` (not `fetcherType`) |
| `sports` | e.g. `basketball`, `tennis` (not `supportedSports`) |
| `urls.web` | primary public URL |
| Regions | `{ country, stateCode? }` objects |
| Lifecycle | e.g. `pre_match`, `live` |

## Plane split (v0.4)

| Plane | Allowed | Never |
|-------|---------|-------|
| **Public** (`public/registry/bookmakers.json`) | id, slug, label, skin, brandGroup, urls, fetcher, lifecycle, sports, regions, limits, color, webViewConfig, note | secrets, balance, health |
| **Ops** (`artifact-registry/bookmakers/v0.4.0/ops/`) | restBaseUrl, restProtocol, apiKeyEnv, envVars, balance/health placeholders, contact | deployed to Pages |

## Why

<!-- New desk, unmatched seat label, wrong max bet, migrate from v0.3, etc. -->

-

## Acceptance criteria

- [ ] `id === slug` on the row
- [ ] Public shape uses `fetcher`, `sports`, `urls.web` (v0.4 names)
- [ ] No ops secrets in the public bake
- [ ] Desk coverage checked if seat desk free-text is involved (`bun run bookmakers:desk-coverage`)
- [ ] Bake / migrate evidence: `bookmakers:bake:check` or migrate + board tests
- [ ] PR Claim → evidence filled; Naming (v0.4) section completed

## Commands (operator)

```bash
bun run bookmakers:migrate          # v0.3 → v0.4 public + ops
bun run bookmakers:desk-coverage
bun run bookmakers:bake             # or -- --local
bun run bookmakers:bake:check
bun test tests/bookmakers-board.test.ts
```

## Related

Tenant: [bookmakers-registry.md](../../docs/harness/tenants/bookmakers-registry.md) · board `/portal/bookmakers/`
