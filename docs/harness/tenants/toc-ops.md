# Tenant: toc-ops

**Tenant** `toc-ops` **Runs** `bun run ops:seed:toc` · baked by `ops:snapshot`
**Proof** static fixture `public/registry/toc-ops.json` (Pages-safe)
**Catalog** portal `/portal/toc/` · ops-summary `toc` slice · `/api/toc`

Fixture-first integration of the TOC Ops edge-case surface (Drum / Buffer / Rope,
Soft Balance, Gate 12, Ball-in-Court, FUND→WARM→PLAY→WD) into FactoryWager Pages
without embedding toc-ops-repo SQLite on the edge.

## SSOT hierarchy (do not redefine)

| Concern | Owner |
|---------|--------|
| TOC theory | `toc-ops-repo/docs/reference/TOC-Production-Reference.md` |
| Soft / Gate 12 / T/I/OE | `toc-ops-repo/docs/system/ACCOUNTING.md` |
| Enums / exception families | `toc-ops-repo/docs/DOMAIN_CONSTANTS.md` |
| SOP Known Exceptions | `toc-ops-repo/docs/sop/*-sop.md` |
| Pages fixture + portal | this tenant · `lib/toc-ops/` |

SOPs §13/§14 specialize only. New edges land in toc-ops-repo first, then mirror
into `lib/toc-ops/fixture.ts`.

## Artifacts

| Path | Role |
|------|------|
| `lib/toc-ops/types.ts` | Fixture types |
| `lib/toc-ops/fixture.ts` | ASH + PAT demo (WARMED / Warming / Gate 12 / rails) |
| `lib/toc-ops/export-snapshot.ts` | Bake + ops-summary slice |
| `lib/operations/toc-ops-seed.ts` | `ops:seed:toc` |
| `public/registry/toc-ops.json` | Pages ASSETS |
| `public/portal/toc/` | Board UI |
| `functions/api/toc/[[path]].ts` | GET snapshot; POST → 503 |
| `ops-summary.json` → `toc` | Compact rollup for `/portal/ops/` card |

## Commands

```bash
bun run ops:seed:toc              # write fixture (skip if present)
bun run ops:seed:toc -- --force   # rebuild
bun run ops:snapshot --no-routing # bake + embed + ops-summary.toc
bun test tests/toc-ops-fixture.test.ts
```

## Gap map (discovery)

| Gap | Status |
|-----|--------|
| No TOC board on Pages | **Closed** — `/portal/toc/` + fixture |
| Soft Balance / WARMED / Gate 12 invisible | **Closed** — fixture fields + UI |
| FUND/WARM/PLAY/WD + Ball-in-Court | **Closed** — openTasks in fixture |
| Rails confirmation | **Closed** — confirmed/unconfirmed rails |
| Bottleneck rule keys | **Closed** — demo open events |
| Live Central Tool mutations on Pages | **Open by design** — POST 503; use toc-ops-repo `ct` |
| SQLite Soft journal in FactoryWager ops DB | **Open** — next elevation after portal UX |
| Dual-write from toc-ops-repo read API | **Open** — optional later sync |

## Signal

Missing/stale `public/registry/toc-ops.json`, or ops card shows “Fixture missing”.

## Intervention

1. `bun run ops:seed:toc -- --force`
2. `bun run ops:snapshot --no-routing`
3. Open `/portal/toc/` and `/registry/toc-ops.json`

**Owner** `// owner: platform / ops portal` **Fresh-rerun** `bun run ops:seed:toc -- --force`
