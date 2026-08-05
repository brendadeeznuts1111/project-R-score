# Registry hub

FactoryWager **artifact registry** board — R2-backed package index plus the
operator portal map (boards, bakes, domain lanes).

| Surface | Path |
|---------|------|
| HTML board | [`/portal/`](./) |
| Package search UI | same board · `#search` |
| Registry JSON | [`/registry/registry.json`](../registry/registry.json) |
| Portal chrome (nav SSOT) | [`/registry/portal-chrome.json`](../registry/portal-chrome.json) |
| Portal weave | [`/registry/portal-weave.json`](../registry/portal-weave.json) |

Static companion for the topbar **MD** link. Rendered via
`lib/http/portal-markdown.ts` (Bun.markdown).

## Domain lanes

Product domains on chrome (partner desk first). Full machine map:
`domainLanes[]` in portal-chrome.

| Lane | Boards (entry) | Focus |
|------|----------------|-------|
| **Partner** | [Partners](./partners/) · [Account](./account/) · [Limits](./limits/) · [Bookmakers](./bookmakers/) · [Factory](./factory/) | Package groups, outs, limit raises, seat capital, handshake |
| **Trading** | [Tennis](./tennis/) · prediction report | Tennis HQ desk · agent-auth · live metrics |
| **Control** | [Ops](./ops/) · [TOC](./toc/) · [Dashboard](./dashboard/) · [Compliance](./compliance/) · [Monitoring](./monitoring.md) | ops-summary pulse, loop, MA/NJ |
| **Identity** | [Identity](./identity/) · [Vault](./vault/) · [Env](./env/) | Auth · Proton · inject map |
| **Knowledge** | [Glossary](./glossary/) · [Concepts](./concepts/) · [Brands](./brands/) · [Catalog](./catalog/) · [Surfaces](./surfaces/) · [Skills](./skills/) | Vocabulary · scrape-wire · edge inventory |
| **Platform** | [Packages](./packages/) · [Health](./health/) · [DOD](./dod/) · [Tools](./tools/) | Graph map · monorepo score · proof |

## Priority boards

| Board | HTML | Primary bake |
|-------|------|--------------|
| Ops (control pulse) | [`/portal/ops/`](./ops/) | [`ops-summary.json`](../registry/ops-summary.json) |
| Partners | [`/portal/partners/`](./partners/) | [`partners-ops.json`](../registry/partners-ops.json) |
| Limits | [`/portal/limits/`](./limits/) | [`limit-raises.json`](../registry/limit-raises.json) |
| Packages | [`/portal/packages/`](./packages/) | [`packages-graph-map.json`](../registry/packages-graph-map.json) |
| Health | [`/portal/health/`](./health/) | [`monorepo-health.json`](../registry/monorepo-health.json) |
| Compliance | [`/portal/compliance/`](./compliance/) | [`compliance-board.json`](../registry/compliance-board.json) |
| Doctor | [`/portal/doctor/`](./doctor/) | [`doctor-state.json`](../registry/doctor-state.json) |
| Tennis | [`/portal/tennis/`](./tennis/) | [`tennis/agent-auth.json`](../registry/tennis/agent-auth.json) |

Markdown companions (when present): `ops.md` · `partners.md` · `packages.md` ·
`limits.md` · `compliance.md` · `brands.md` · `glossary.md` · `health.md` ·
`tennis.md` · `tools.md` · `toc.md` · `factory.md`.

## Registry artifacts (operator)

| Artifact | Role |
|----------|------|
| [`portal-chrome.json`](../registry/portal-chrome.json) | Nav · footer · domainLanes · boardCoverage · badgeSources |
| [`portal-weave.json`](../registry/portal-weave.json) | Cross-links · scripts · wiki[] · surfaces[] |
| [`ops-summary.json`](../registry/ops-summary.json) | Day-loop rollup (handshake · seat · loop · TOC · compliance) |
| [`partners-ops.json`](../registry/partners-ops.json) | Partner desk v2 (phases · outs · tracking) |
| [`telegram-handshake.json`](../registry/telegram-handshake.json) | Package-group readiness · invite gaps |
| [`seat-capital-desk.json`](../registry/seat-capital-desk.json) | Seat FUND · outs · partner messages |
| [`domain-glossary.json`](../registry/domain-glossary.json) | Concept glossary (Kalshi cores + Factory overlay) |
| [`registry.json`](../registry/registry.json) | Package index (R2 snapshot for Pages) |

Full bake index: [registry-index.md](../../registry-index.md) (wiki) ·
[wiki-index.md](../../wiki-index.md).

## Day-loop CLI

```bash
bun run ops:snapshot --no-seed     # rebake ops-summary + portal embeds
bun run partners:validate          # partners-ops v2
bun run telegram:handshake:catalog
bun run portal:chrome:bake         # nav + domainLanes
bun run audit:packages:full        # packages graph
bun run monorepo:health:bake
bun run portal:doctor
bun run verify:portal:static
```

Deploy Pages after Proton inject: `bun run proton:inject:factorywager:reasonix` →
`bun run proton:deploy:pages`.

## Docs

| Topic | Doc |
|-------|-----|
| Portal foundation | [`docs/portal-foundation.md`](../../docs/portal-foundation.md) |
| Platform routing | [`docs/platform-routing.md`](../../docs/platform-routing.md) |
| Partner domain map | [`docs/harness/tenants/partner-domain-map.md`](../../docs/harness/tenants/partner-domain-map.md) |
| Ops snapshot | [`docs/harness/tenants/ops-snapshot.md`](../../docs/harness/tenants/ops-snapshot.md) |
| Authority / merge | [`docs/harness/AUTHORITY.md`](../../docs/harness/AUTHORITY.md) · `bun run bun:ci` |
| Wiki hub | [wiki.factory-wager.com](https://wiki.factory-wager.com/) |

## Failure paths

| Symptom | Fix |
|---------|-----|
| Package count “—” / registry empty | Bind `REGISTRY_BUCKET` or deploy `public/registry/registry.json` |
| MD link 404 | Ensure `public/portal/index.md` is deployed (slug `index` in `PORTAL_MARKDOWN_SLUGS`) |
| Stale nav / domain lanes | `bun run portal:chrome:bake` · apply chrome · Pages deploy |
| Access 302 on score.\* | Cloudflare Access — login or service token; registry JSON may still be public on some paths |
