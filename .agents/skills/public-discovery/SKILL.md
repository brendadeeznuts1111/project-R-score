---
name: public-discovery
description: |
  Discover stale references, broken registry paths, and portal static anti-patterns
  under public/ (portal, registry bake, monitoring, lander). Use when cleaning Pages
  artifact drift, orphan registry JSON, or portal foundation violations.
---

# Public discovery

Deterministic discovery for the **Pages static plane** (`public/portal/`, `public/registry/`, `public/monitoring/`, lander shells). Composes with harness reference-discovery (code/env planes) — run both before closing public gap rows.

## Quick start

```bash
bun tools/public-discovery.ts
bun tools/public-discovery.ts --check          # exit 1 on error-tier
bun tools/public-discovery.ts --json
bun run public:discover:check
bun run verify:portal:static                   # structural gate (throws on violation)
```

## Agent workflow

1. **Discover** — `bun tools/public-discovery.ts --json > /tmp/public-discover.json`
2. **Triage (fix in order)**
   - `error` · `broken-registry-ref`, `portal-chrome-missing`, `portal-inline-health`, `portal-process-env`, `portal-typescript-leak`
   - `warn` · `legacy-domain`
   - `info` · `orphan-registry-artifact` — document or wire; not blocking
3. **Repair SSOT**
   - Portal shells → [`docs/portal-foundation.md`](../../../docs/portal-foundation.md) · `bun tools/portal-apply-chrome.ts`
   - Registry bake → `bun run ops:snapshot --no-routing` · tenant ops rows
   - Routing → [`docs/platform-routing.md`](../../../docs/platform-routing.md) · `bun run check:routes`
4. **Hand off** — Public Audit Gap Close agent · `bun run public:audit:verify`
5. **Re-gate**
   ```bash
   bun run discover:compose:check
   bun run public:discover:check
   bun run verify:portal:static
   bun run check:routes
   bun run audit:verify
   bun tools/doc-map-check.ts
   bun tools/bun-doc-refs.ts integrity
   ```

## Doctor (skill loop)

```bash
bun run public:discover:check
bun run discover:compose:check
```

## Finding kinds

| Kind | Meaning | Typical repair |
|------|---------|----------------|
| `broken-registry-ref` | `/registry/*.json` fetch with no baked file | `ops:snapshot` or fix portal path |
| `portal-chrome-missing` | HTML without `data.js` / `topbar.js` | `_page-template.html` / apply-chrome |
| `portal-inline-health` | Client fetch `/api/health` | Use `data.js` · `portal:data` |
| `portal-process-env` | `process.env` in portal `.js` | `/api/env` only |
| `portal-typescript-leak` | TS syntax in browser `.js` | Strip annotations |
| `legacy-domain` | `registry.factory-wager.co` typo | `.com` SSOT |
| `orphan-registry-artifact` | JSON not referenced from portal | Wire or document |

## Compose with siblings

| Tool | When |
|------|------|
| reference-discovery | Env/plane drift in `lib/` · `config/` |
| audit-gap-close | Harness tenant gap maps |
| public-audit-gap-close | Public-plane gap map |
| verify:portal | Live + static portal gates |

Runbook: [`docs/harness/tenants/public-plane.md`](../../../docs/harness/tenants/public-plane.md)

Shared agent tooling: [references/agent-tooling.md](../references/agent-tooling.md)
