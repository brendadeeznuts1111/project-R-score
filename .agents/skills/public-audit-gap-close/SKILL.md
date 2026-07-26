---
name: public-audit-gap-close
description: |
  Close public-plane gap rows with discovery + portal verify + audit catalog evidence.
  Use when Pages portal/registry rows need bake/test/proof closure after public-discovery triage.
---

# Public audit gap close

Compose **Public Discovery → Portal verify → Audit catalog → Execute → Re-gate**. Rejects prose-only closure for `public/` artifacts.

## Quick start

```bash
bun run public:discover:check
bun run verify:portal:static
bun run audit:verify
bun run public:audit:verify   # all three
```

## Agent loop

1. **Public discovery** (sibling) — `.agents/skills/public-discovery/SKILL.md`
   - Fix all **error** findings before claiming a gap closed
2. **Portal structural gate**
   ```bash
   bun run verify:portal:static
   bun run check:routes
   ```
3. **Audit evidence** — harness catalog must still verify
   ```bash
   bun run audit:verify
   ```
4. **Gap map** — [`docs/harness/tenants/public-plane.md`](../../../docs/harness/tenants/public-plane.md)
   - Mark **Closed** only with discovery clean + portal verify + registry/portal proof
5. **Execute** — smallest fix at owning boundary
   - Portal UI → `public/portal/` · `docs/portal-foundation.md`
   - Registry bake → `bun run ops:snapshot` · `public/registry/`
   - Edge functions → `functions/` (not `public/` mutations for API behavior)
6. **Re-gate**
   ```bash
   bun run public:discover:check
   bun run verify:portal:static
   bun run audit:verify
   ```

## Lane rules

- Stage only claimed paths — never `git add -A`
- Do not sweep unrelated harness lanes (telegram, toc-ops) into public commits
- Commit message names `public-plane` or specific portal/registry surface

## Compose with siblings

| Tool | When |
|------|------|
| public-discovery | public/ ref + chrome drift |
| reference-discovery | lib/config plane naming |
| audit-gap-close | toc-ops / harness tenant rows |
| harness-improve | commit thrash on bake loops |

Runbook: [`docs/harness/tenants/public-plane.md`](../../../docs/harness/tenants/public-plane.md)

Shared agent tooling: [references/agent-tooling.md](../references/agent-tooling.md)
