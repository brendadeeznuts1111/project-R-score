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

## Surface map (portal vs live)

Two planes. Cloudflare MCP is **not** a TOC desk API — it only helps deploy/inspect Pages.

| Concern | Live SSOT (`toc-ops-repo` `ct`) | `/portal/toc` (fixture) | `/portal/ops` |
|---------|--------------------------------|-------------------------|---------------|
| Channels / MessageLog / Ball-in-Court | MessageLog + package Telegram | BIC tasks + `telegramRef` | FW channel outbox (separate) |
| Rails (partner payment) | Rail profiles + confirm | Confirmed/unconfirmed rails | FW agent `rails` usage totals |
| Accounts (call signs, WARMED, capital) | Accounts + journals | Demo ASH/PAT/NOV | TOC rollup card |
| Cellphone / data plan | `ct phone-*` logistics | Not on TOC board | FW phone inventory counts |
| Places / ROI (T/I/OE) | Soft + `ct t-ioe` / expert ROI | Capital location + buffer | Ops-loop ≠ TOC T |
| Message return / SLA | Bottlenecks + `partner-health` | PendingPartner + bottleneck list | Channel oldest-pending |
| Accounting (Soft / Gate 12) | Soft journal + principal | Soft + Gate 12 pills | `toc.principalOutstandingTotal` |
| Deal structure (70/20/10) | Package split | Catalog `defaultSplit` | FW `cut_percentage` (plays) |
| Bots | `@TOC_Op_bot` / package `/status` | Labels only | Portal/ops bots (separate) |

**Partner identity bridge** ([`ops-partner-bridge.md`](ops-partner-bridge.md)) gates FactoryWager plays; it does not own Soft Balance, rail confirm, or MessageLog.

**Cloudflare MCP** ([`cloudflare-pages.md`](cloudflare-pages.md) · [`.mcp.json`](../../../.mcp.json)): platform account/docs/bindings/builds/observability only. No TOC Ops MCP server. Pages serves baked `/registry/toc-ops.json` as ASSETS.

## Artifacts

| Path | Role |
|------|------|
| `lib/toc-ops/types.ts` | Fixture types |
| `lib/toc-ops/fixture.ts` | ASH + PAT + NOV demo (WARMED / Warming / Gate 12 / rails / plays) |
| `lib/toc-ops/enforcement.ts` | Operate-lite Hard Gate + T/I/OE + Rope diagnosis (baked) |
| `lib/toc-ops/export-snapshot.ts` | Bake + ops-summary slice |
| `lib/operations/toc-ops-seed.ts` | `ops:seed:toc` |
| `lib/operations/toc-soft-balance.ts` | Append-only `toc_soft_entries` (local ops DB) |
| `lib/operations/toc-identity-bridge.ts` | TOC ↔ tree_nodes / rails / sb_accounts |
| `public/registry/toc-ops.json` | Pages ASSETS |
| `public/portal/toc/` | Board UI |
| `functions/api/toc/[[path]].ts` | GET snapshot; POST → 503 |
| `ops-summary.json` → `toc` | Compact rollup for `/portal/ops/` card |

## Commands

```bash
bun run ops:seed:toc              # write fixture (skip if present)
bun run ops:seed:toc -- --force   # rebuild
bun run ops:snapshot --no-routing # bake + embed + ops-summary.toc
bun test tests/toc-ops-fixture.test.ts tests/toc-ops-enforcement.test.ts
```

## Gap map (discovery)

| Gap | Status |
|-----|--------|
| No TOC board on Pages | **Closed** — `/portal/toc/` + fixture |
| Soft Balance / WARMED / Gate 12 invisible | **Closed** — fixture fields + UI |
| FUND/WARM/PLAY/WD + Ball-in-Court | **Closed** — openTasks in fixture |
| ONB + LIMIT / account limits freshness | **Closed** — v2 NOV onboarding + stale/fresh/unknown |
| Rails confirmation + daily/monthly | **Closed** — confirmed/unconfirmed rails |
| Plays / bets + experiment routing | **Closed** — `recentPlays` + active switchback |
| Bottleneck rule keys | **Closed** — demo open events (`TOC_BOTTLENECK_RULE_KEYS`; dynamic `reconcile_*` lives in toc-ops-repo only) |
| Live Central Tool mutations on Pages | **Open by design** — POST 503; use toc-ops-repo `ct` |
| Demo/read-only labeling | **Closed (P0)** — banner + `plane: demo-readonly` |
| Identity bridge TOC ↔ ops | **Closed (P0)** — `toc_identity_bindings` + call_sign / hardrock accounts |
| Soft/Hard Gate enforcement | **P1 operate-lite** — baked `enforcement` slice (eval only; Pages POST still 503) |
| SQLite Soft journal in FactoryWager ops DB | **P1** — append-only `toc_soft_entries` (seed from fixture; local post helper) |
| Dual-write from toc-ops-repo read API | **Open** — optional later sync |
| Full CT Soft mutations / DoD close on Pages | **Open by design** — use toc-ops-repo `ct` |

## Signal

Missing/stale `public/registry/toc-ops.json`, or ops card shows “Fixture missing”.

## Intervention

1. `bun run ops:seed:toc -- --force`
2. `bun run ops:snapshot --no-routing`
3. Open `/portal/toc/` and `/registry/toc-ops.json`

**Owner** `// owner: platform / ops portal` **Fresh-rerun** `bun run ops:seed:toc -- --force`
