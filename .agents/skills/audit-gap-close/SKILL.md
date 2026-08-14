---
name: audit-gap-close
description: |
  Close harness and tenant gaps with audit evidence — compose reference-discovery,
  audit catalog verify, tenant gap maps, and fresh-rerun gates. Use when a gap map
  row needs proof (bake/test/proof), audit catalog is stale, or discovery findings
  need an execute owner after triage.
---

# Audit gap close

Compose **Discovery → Audit → Tenant gap map → Execute → Re-gate**. Rejects
prose-only gap closure; tenant rows close only with bake/test/proof evidence.

## Quick start

```bash
bun tools/reference-discovery.ts --json > /tmp/ref-discover.json
bun run reference:discover:check
bun run discover:compose:check
bun run audit:verify
bun tools/doc-map-check.ts
bun tools/bun-doc-refs.ts integrity
bun run test:toc-ops   # when tenant is toc-ops
```

## Agent loop

1. **Discovery** (sibling) — run Reference Discovery first when the gap is
   ref/naming/plane drift
   - `.agents/skills/reference-discovery/SKILL.md`
   - Fix `plane-mismatch` (error) before tenant work
2. **Audit evidence** — catalog must verify before claiming a gap closed
   ```bash
   bun run audit:verify
   bun tools/bun-doc-refs.ts suggest --audit "<concept>"   # JIT finding/concept
   ```
   SSOT: [`docs/audit/README.md`](../../../docs/audit/README.md)
3. **Tenant gap map** — read `docs/harness/tenants/<tenant>.md` gap table
   - Primary tenant default: **toc-ops** →
     [`docs/harness/tenants/toc-ops.md`](../../../docs/harness/tenants/toc-ops.md)
   - Mark **Closed** only after fixture bake + tests + portal/registry evidence
4. **Execute** — smallest reversible fix at owning boundary
   - TOC fixture/portal → `lib/toc-ops/` · `bun run ops:seed:toc -- --force` ·
     `bun run ops:snapshot --no-routing`
   - Live CT / Soft mutations → toc-ops-repo `ct` (Pages POST 503 — open by
     design)
   - **Do not** implement dual-write toc-ops-repo → Pages unless explicitly
     requested
5. **Re-gate**
   ```bash
   bun run harness:status
   bun run discover:compose:check
   bun run reference:discover:check
   bun run public:discover:check
   bun run audit:verify
   bun tools/doc-map-check.ts
   bun tools/bun-doc-refs.ts integrity
   bun run ci:harness:fast           # when harness/docs/skills lane touched
   bun run test:toc-ops              # toc-ops tenant suite under tests/toc-ops/
   ```

## Lane rules

- Stage only claimed paths (`git add <file1> <file2>`) — never `git add -A`
- Do not sweep Telegram/outbox/partner dirty files into a toc-ops or discovery
  commit
- Commit message names the tenant/lane

## Open by design (toc-ops — do not close on Pages)

| Gap                                   | Owner                  |
| ------------------------------------- | ---------------------- |
| Live CT mutations on Pages            | toc-ops-repo `ct`      |
| Soft `force` wipe under append-only   | insert-missing only    |
| Full CT Soft / DoD close on Pages     | toc-ops-repo           |
| Dual-write from toc-ops-repo read API | optional later — defer |

## Compose with siblings

| Tool                   | When                                     |
| ---------------------- | ---------------------------------------- |
| public-audit-gap-close | Portal/registry gap map under `public/`  |
| public-discovery       | Broken `/registry/` refs · portal chrome |
| reference-discovery    | Naming/plane/env drift                   |
| harness-improve        | Commit thrash / failed handoff           |
| ast-grep `audit`       | Code-shape rules, not domain gaps        |
| CLAIM-DISCOVERY        | New proof claims, not tenant rows        |

Runbook:
[`docs/harness/tenants/reference-discovery.md`](../../../docs/harness/tenants/reference-discovery.md)

Shared agent tooling:
[references/agent-tooling.md](../references/agent-tooling.md)
