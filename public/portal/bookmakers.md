# Bookmakers registry

Canonical **book / sportsbook** registry for the deep-link pipeline — mirrored
from the `@factorywager/bookmakers` artifact onto the portal read plane.

| Surface | Path |
|---------|------|
| Board | [`/portal/bookmakers/`](./bookmakers/) |
| Bake | [`/registry/bookmakers.json`](../registry/bookmakers.json) |
| Artifact registry | `registry.factory-wager.com` · package `@factorywager/bookmakers` |
| Bake CLI | `bun run bookmakers:bake` · check `bookmakers:bake:check` |
| Tenant | [`docs/harness/tenants/bookmakers-registry.md`](../../docs/harness/tenants/bookmakers-registry.md) |
| Route map | [routing.md](./routing.md) |

## Live bake shape (v1)

```json
{
  "schemaVersion": 1,
  "generatedAt": "…",
  "artifact": { "name": "@factorywager/bookmakers", "version": "…", "checksum": "…", "source": "artifact-registry" },
  "bookmakers": { "<id>": { "id", "label", "domain", "fetcherType", "supportedSports", "regions", "color", … } },
  "summary": { "count", "webview", "rest", "seat", "sports": [] },
  "audit": { "ok": true, "issues": [] }
}
```

`bookmakers` is a **map keyed by id** (not an array). The board normalizes to a
sorted list for display.

## Fetcher types

| `fetcherType` | Role | Board filter |
|---------------|------|--------------|
| `rest` | HTTP API (e.g. Pinnacle) | REST pill |
| `webview` | Browser / scrape lane (US books) | Webview pill |
| `seat` | Seat / soft package books | Seat pill |

## Regions

Each region is typically `{ "country": "US", "stateCode": "NY" }` (state optional).
Board shows `US-NY` chips — not `[object Object]`.

## Board UX

| Control | Behavior |
|---------|----------|
| Stats strip | count · webview · rest · seat · unique sports |
| Fetcher filter | all / rest / webview / seat |
| Search | id · label · domain · sport |
| Sports chips | glossary-wired when `sport.<id>` exists |
| Domain | external link |
| Audit gate | `audit.ok` on hero |

## Related partner surfaces

| Concern | Board / bake |
|---------|--------------|
| Partner outs · book · max bet | [Partners](./partners/) · seat-capital-desk — match `BOOK` to registry `id` |
| Limit raises by node / book | [Limits](./limits/) · [limits.md](./limits.md) · `limit-raises.json` |
| Forecast lab | [`/portal/limits-lab/`](./limits-lab/) |
| Balance / slip image proof | [DOD](./dod/) · [dod.md](./dod.md) |
| Soft book types | Soft export · Partners Soft tables |
| Routing audit | [routing.md](./routing.md) · `bun run check:routes` |

## CLI

```bash
bun run bookmakers:bake
bun run bookmakers:bake:check
bun test tests/bookmakers-registry-bake.test.ts
bun test tests/bookmakers-board.test.ts
# after package publish:
# bun lib/factory/cli.ts publish … → snapshot → bookmakers:bake
```

## Failure paths

| Symptom | Fix |
|---------|-----|
| Board empty / load failed | Fetch `/registry/bookmakers.json` · rebake · Pages deploy |
| `bookmakers:bake:check` fails | Mirror stale vs live artifact · re-run bake and commit |
| Regions show blank / wrong | Expect `{country,stateCode}` objects · board uses `formatRegion` |
| Outs book id unknown on Partners | Align seat desk `BOOK` with registry `id` |
| Glossary sport chips plain | Bake `domain-glossary.json` · `sport.*` concept ids |
| Audit fail gate | Inspect `audit.issues` on bake · invalid registry entries |

Weave surface: `bookmakers` · artifact `bookmakers-registry`.
