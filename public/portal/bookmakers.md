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

## What the bake holds

| Field group | Use |
|-------------|-----|
| `id` · `label` · `domain` | Book identity + public site |
| `fetcher` | Strategy (webview / rest / …) for scrape / deep-link |
| `sports` · `regions` | Coverage chips (glossary-wired sports when possible) |
| `artifact` | Version · checksum · source package proof |
| `audit` | Bake self-check (`ok` · `issues`) |

Do **not** treat this mirror as mutable live inventory — refresh via bake after
the package is published.

## Related partner surfaces

| Concern | Board / bake |
|---------|--------------|
| Partner outs · book · max bet | [Partners](./partners/) · seat-capital-desk |
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
# after package publish:
# bun lib/factory/cli.ts publish … → snapshot → bookmakers:bake
```

## Failure paths

| Symptom | Fix |
|---------|-----|
| Board empty / “resolving…” stuck | Fetch `/registry/bookmakers.json` · rebake · check Pages deploy |
| `bookmakers:bake:check` fails | Mirror stale vs live artifact · re-run bake and commit |
| Outs book id unknown on Partners | Align seat desk `BOOK` with registry `id` · refresh partners-ops |
| Glossary sport chips missing | Bake `domain-glossary.json` · sport concept ids |

Weave surface: `bookmakers` · artifact `bookmakers-registry`.
