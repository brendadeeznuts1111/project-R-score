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
| Return efficiency · CE · LE · next action | `toc-ops-repo/docs/system/RETURN_EFFICIENCY.md` · `ct return-efficiency` |
| Enums / exception families | `toc-ops-repo/docs/DOMAIN_CONSTANTS.md` |
| SOP Known Exceptions | `toc-ops-repo/docs/sop/*-sop.md` |
| Pages fixture + portal | this tenant · `lib/toc-ops/` |

SOPs §13/§14 specialize only. New edges land in toc-ops-repo first, then mirror
into `lib/toc-ops/fixture.ts`.

## Surface map (portal vs live)

Two planes. Cloudflare MCP is **not** a TOC desk API — it only helps deploy/inspect Pages.

| Concern | Live SSOT (`toc-ops-repo` `ct`) | `/portal/toc` (fixture) | `/portal/ops` |
|---------|--------------------------------|-------------------------|---------------|
| Channels / MessageLog / Ball-in-Court | MessageLog + package Telegram | BIC tasks + `telegramRef` | FW outbox topic `toc` (metrics / gates / ranked / Soft posts) |
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
| `lib/toc-ops/return-efficiency.ts` | R_P · CE · LE · ranked actions · dynamic buffer |
| `lib/toc-ops/export-snapshot.ts` | Bake via `withTocMetrics` (return-efficiency + enforce) |
| `lib/operations/toc-ops-seed.ts` | `ops:seed:toc` (+ Soft seed when DB open) |
| `lib/operations/toc-soft-balance.ts` | Append-only `toc_soft_entries` (local ops DB) |
| `lib/channels/toc-outbox.ts` | Outbox topic `toc` — bake · gates · ranked · Soft posts |
| `lib/operations/toc-identity-bridge.ts` | TOC ↔ tree_nodes / rails / sb_accounts |
| `public/registry/toc-ops.json` | Pages ASSETS |
| `public/registry/toc-ops-bake-proof.json` | Bake evidence (gates · T/I/OE · R_P) |
| `lib/toc-ops/bake-proof.ts` | Proof builder written on export |
| `public/portal/toc/` | Board UI (gates + T/I/OE) |
| `functions/api/toc/[[path]].ts` | GET index/summary/partners/proof; POST → 503 |
| `ops-summary.json` → `toc` | Compact rollup for `/portal/ops/` card |

## Commands

```bash
bun run ops:seed:toc              # write fixture (skip if present)
bun run ops:seed:toc -- --force   # rebuild
bun run ops:snapshot --no-routing # bake + embed + ops-summary.toc
bun run test:toc-ops
# or: bun test tests/toc-ops/fixture.test.ts tests/toc-ops/enforcement.test.ts \
  tests/toc-ops/return-efficiency.test.ts tests/toc-ops/contract.test.ts tests/toc-ops/api-edge.test.ts \
  tests/toc-ops/seed/
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
| Soft/Hard Gate enforcement | **Closed (operate-lite)** — `lib/toc-ops/enforcement.ts` baked into fixture; portal board + ops-summary T/I/OE + focus; Pages POST still 503 |
| SQLite Soft journal in FactoryWager ops DB | **Closed (local)** — append-only `toc_soft_entries` via `toc-soft-balance.ts`; seeded by `ops:seed:toc` |
| R_P · CE · LE return efficiency | **Closed (bake)** — `lib/toc-ops/return-efficiency.ts` via `withTocMetrics`; ranked actions + avg R_P on board / ops-summary (not ops-loop LCR) |
| TOC board ↔ ops loop cross-link | **Closed** — `opsLoop` baked in `toc-ops.json` at seed; portal defer pill + LCR |
| ops-summary.toc contract depth | **Closed** — `validateTocOpsSummarySlice` (focus · fails · T/I/OE · R_P) |
| Bake proof artifact | **Closed** — `/registry/toc-ops-bake-proof.json` + `GET /api/toc/proof` |
| `/api/toc` agent headers + summary | **Closed** — `X-TOC-*` · summary includes enforcement / returnEfficiency |
| Portal weave + llms parity | **Closed** — TOC surface/artifact/script + `portal/toc.md` |
| Geo / ZIP / IPv4 / IPv6 / DNS / ASN presence | **Closed (demo)** — `lib/toc-ops/presence.ts` on partner · account · play placement; rollup on board + ops-summary |
| Venue kinds (book · Kalshi/Polymarket · crypto · PPH · post-up · casino · kiosk · in-person) + sports + legal-by-state | **Closed (demo)** — `lib/toc-ops/venues.ts` on each account; catalog + rollup on board / ops-summary |
| Partner + agent profiles (phones/data · assets/rails · telegram/bot · deals · accounting · CLV · expert liquidity · history · limits · wager places) | **Closed (demo)** — `lib/toc-ops/profiles.ts`; board Agents + Profile sections; ops-summary rollups |
| MessageLog / BIC handoffs · rotor drift · experiment outcomes | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/channel-experiments.test.ts` · MessageLog + rotor + exception timeline; experiment `outcome`; ops-summary channel rollups |
| Capital moves · warm cycles · Gate 12 ledger · expert ROI · buffer history | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/capital-buffer.test.ts` · ledgers + `healthPulse` · agent `roi` · `buffer.history` |
| Soft A=L+E sheet · limit refresh · rail confirm · switchback windows · release/defer cards | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/accounting-releases.test.ts` · `balanceSheet` · `limitHistory` / `confirmHistory` · `switchbackWindows` · `releaseCards` |
| Pending exposure · recycle · SLA board · compliance · Soft audit trail · net capital flow | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/exposure-compliance.test.ts` · `pendingExposure` / `recycleCycles` · `slaBoard` / `auditTrail` / `complianceFlags` / `netCapital` |
| WD pipeline · exposure aging · ONB checklist · settlement calendar | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/settlement-wd.test.ts` · `wdPipeline` / `exposureAging` / `onbChecklist` / `settlementCalendar` |
| Constraint focus · exception resolution · play settlement · bot command audit | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/constraint-ops.test.ts` · account `constraint` · `exceptionResolution` / `playSettlementQueue` · `botCommandLog` |
| BIC handoffs · warm playbook · phone logistics · liquidity utilization | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/ops-handoffs.test.ts` · `bicHandoffs` / account `warmPlaybook` / profile `phoneLog` / agent `liquidityUtilSeries` |
| FUND corridor · task timeline · rail utilization · drum gate snapshots | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/fund-rails-gates.test.ts` · `fundCorridor` / `taskTimeline` / rail `utilization` / account `gateSnapshot` / `capitalLocationSeries` |
| Pending deploy queue · readiness trend · instruction SLA · deal split audit | **Closed (demo)** — `seed-deepen.ts` · `tests/toc-ops/seed/soft-desk.test.ts` · `pendingDeploymentItems` / `readinessTrend` / play `instructionAgeMin` / `dealSplitAudit` |
| Soft `force` wipe under append-only | **Open by design** — insert-missing only; no truncate |
| Dual-write from toc-ops-repo read API | **Open** — optional later sync |
| Full CT Soft mutations / DoD close on Pages | **Open by design** — use toc-ops-repo `ct` |

## Signal

Missing/stale `public/registry/toc-ops.json`, or ops card shows “Fixture missing”.

## Intervention

1. `bun run ops:seed:toc -- --force`
2. `bun run ops:snapshot --no-routing`
3. Open `/portal/toc/` and `/registry/toc-ops.json`

**Owner** `// owner: platform / ops portal` **Fresh-rerun** `bun run ops:seed:toc -- --force`

## Audit evidence (Discovery → Audit → Re-gate)

Compose loop: [`.agents/skills/audit-gap-close/`](../../../.agents/skills/audit-gap-close/) · [`docs/audit/README.md`](../../audit/README.md)

```bash
bun run reference:discover:check   # plane-mismatch must be 0
bun run audit:verify               # catalog · evidence · graph parity
bun run test:toc-ops               # 71 tests · seed + core planes
```

| Gate | Last run (session) | Result |
|------|-------------------|--------|
| `reference:discover:check` | 2026-07-26 | 0 errors · 12 warn (`similar-env`) |
| `audit:verify` | 2026-07-26 | pass · 4 findings · 5 concepts |
| `test:toc-ops` | 2026-07-26 | 71 pass · 18 files |
| Registry bake | 2026-07-26 | pass-11 fields (`pendingDeploymentItems`, `readinessTrend`, `dealSplitAudit`) |
