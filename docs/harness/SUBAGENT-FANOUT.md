# Subagent fanout board — multi-lane execute

**Created:** 2026-08-05  
**Parent goal:** Close dual-plane residuals (Tennis edge **R2-only**, monorepo tip docs, operator-research agent tooling) without crossing lanes.  
**Policy:** **No D1** on Workers. Durable edge snapshots = **R2** (+ embed fallback). Auth planes stay `PARTNER_API_TOKEN` / `FACTORY_WAGER_TOKEN` — do **not** invent parallel public API-key stacks on Tennis.  
**Orchestrator:** one parent session; spawn **general-purpose** subagents with the spawn prompts below; merge via worktree PRs (squash).

## Status legend

| Status | Meaning |
| ------ | ------- |
| **DONE** | Merged + live proof or green verify |
| **READY** | Spec clear; safe to spawn |
| **SERIAL** | Wait for dependency lane |
| **BLOCKED** | Needs secret / operator machine / pass-cli session |

## Live anchors (re-probe before spawn)

```bash
# Tennis
curl -fsS https://tennis.factory-wager.com/api/version | jq '{shortSha,deploymentId}'
curl -sS 'https://tennis.factory-wager.com/api/partners/ledger?partner=ASH&limit=1' | jq '{source,meta}'
# Expect tip ≥ 8f21bf2 · meta.cache == "url" (R2)

# Monorepo
git -C ~/Projects fetch origin main && git -C ~/Projects log -1 --oneline origin/main
```

## Lane map (parallel-safe)

```text
WAVE 0 (parallel)          WAVE 1 (after 0)           WAVE 2 (optional product)
┌──────────────┐           ┌────────────────┐         ┌─────────────────────┐
│ T1 tip docs  │           │ T3 R2 cron     │         │ O2 auth (optional)  │
│ monorepo     │           │ producer       │         │ operator-research   │
└──────────────┘           └────────────────┘         └─────────────────────┘
┌──────────────┐           ┌────────────────┐         ┌─────────────────────┐
│ T2 de-D1     │           │ O1 doctor CLI  │         │ O3 HTTP serve       │
│ monorepo     │           │ monorepo       │         │ + gzip / escapeHTML │
└──────────────┘           └────────────────┘         └─────────────────────┘
┌──────────────┐
│ P1 poly join │  (producer, independent)
└──────────────┘
```

| ID | Lane | Repo | Status | Depends |
| -- | ---- | ---- | ------ | ------- |
| **T1** | Tennis tip pin `8f21bf2` + R2-first wording | monorepo `project-R-score` | **READY** | — |
| **T2** | Strip residual “D1 dual-driver” from tennis docs | monorepo | **READY** | — (can merge with T1) |
| **T3** | Partner snapshot R2 cron (no redeploy) | producer `plum-spruce-dawn-dune1` | **READY** | T1 optional |
| **P1** | Poly join hydrate residual | producer | **READY** | — |
| **O1** | `operator-research` doctor CLI | monorepo | **READY** | — |
| **O2** | Optional `Bun.password` API keys for research HTTP only | monorepo | **SERIAL** | O3 design decision |
| **O3** | Optional `Bun.serve` for research agent | monorepo | **SERIAL** | product yes |
| **O4** | Fetch backoff `Bun.sleep` in classify | monorepo | **READY** | — |
| **H1** | Handoff / release: deploy:verify + monorepo tip PR | either | **SERIAL** | T1 + T3 |

**Do not spawn O2/O3 unless the parent explicitly greenlights an HTTP agent surface.**

---

## Global rules (every subagent)

1. **One lane’s files only.** Pathspec commits. Never sweep foreign dirty trees.
2. **Primary `~/Projects` stays on `main`.** Feature work in `git worktree` / producer clone.
3. **Delivery:** conventional commit → `git push -u origin HEAD:refs/heads/<lane>` → `gh pr create` → `gh pr merge --squash`.
4. **No D1.** No `wrangler` `d1_databases` bindings. Edge durable = R2 JSON objects.
5. **No second Tennis auth.** Do not add `X-API-Key` / `data/auth.json` on `tennis.factory-wager.com`.
6. **Secrets:** Proton Pass only; never paste tokens into PRs or logs.
7. **Verify:** every lane lists a green command; paste evidence in PR body Claim table.
8. **Bun APIs:** add `// @see <canonical-url>` when introducing `Bun.*` (pre-commit annotator).

---

## T1 — Monorepo tennis tip pin (R2 live)

| | |
| -- | -- |
| **Status** | READY |
| **Repo** | `~/Projects` worktree off `origin/main` |
| **Branch** | `docs/tennis-tip-8f21bf2-r2` |
| **Owner files** | `docs/harness/tenants/tennis-hq-ui-audit.md` · `docs/harness/tenants/tennis-hq-registry.md` · `public/portal/tennis.md` · `config/surfaces.toml` · `public/registry/surfaces-state.json` (via `bun run surfaces:bake`) |
| **Goal** | Pin production tip to live `8f21bf2` / current Worker deploymentId; document R2-first `meta.cache=url` for ledger + executions |

**Verify**

```bash
curl -fsS https://tennis.factory-wager.com/api/version | jq -r .shortSha   # 8f21bf2
curl -sS 'https://tennis.factory-wager.com/api/partners/ledger?partner=ASH&limit=1' | jq -r .meta.cache   # url
bun run surfaces:bake
```

**Spawn prompt**

```text
Lane T1 only. Monorepo worktree from origin/main, branch docs/tennis-tip-8f21bf2-r2.
Re-probe tennis.factory-wager.com /api/version and partners/ledger?partner=ASH + partners/executions.
Update tennis-hq-ui-audit.md, tennis-hq-registry.md, public/portal/tennis.md, config/surfaces.toml note to tip SHA 8f21bf2 and live Worker deploymentId; state R2-first cache (meta.cache=url). Run bun run surfaces:bake. Commit pathspec only those files + surfaces-state.json. Open PR, squash-merge. Do not touch producer. No D1 wording.
```

---

## T2 — De-D1 residual prose (can combine with T1)

| | |
| -- | -- |
| **Status** | READY (merge into T1 PR if same worktree) |
| **Owner files** | same tennis docs as T1 |
| **Goal** | Remove “D1 dual-driver” residuals; residual = **R2 cron + optional JSONL writes**, POST ledger still 503 by design |

**Spawn prompt**

```text
Lane T2 (or fold into T1). In monorepo tennis-hq-ui-audit / registry remediations: replace all D1 dual-driver residual language with R2-only policy (publish cron, embed fallback, POST 503). Do not invent D1 schemas. Commit + PR if not already in T1.
```

---

## T3 — Producer partner R2 cron (zero-redeploy)

| | |
| -- | -- |
| **Status** | READY |
| **Repo** | `~/Projects/plum-spruce-dawn-dune1` |
| **Branch** | `feat/partner-snapshot-cron` |
| **Owner files** | `scripts/partner-snapshot-watch.ts` (new) · `package.json` scripts · `docs/SUBAGENT-TASKS.md` · optionally reuse `edge-archive-watch.ts` patterns · **do not** change route auth |
| **Goal** | Bun.cron (or watch script) every 5m: `partner-ledger:publish` + `partner-executions:publish` → R2; document operator runbook |

**Constraints**

- Reuse `scripts/lib/edge-snapshot-r2.ts` / existing publish scripts.
- Default `EDGE_ARCHIVE_R2_OPTIONAL=0` in prod operator docs; optional skip only for dry machines.
- No D1. No redeploy required for data refresh once Worker has `EDGE_PARTNER_*_URL`.

**Verify**

```bash
bun run partner-ledger:publish
bun run partner-executions:publish
curl -sS https://pub-820f74c52ec34b01b449b9fe8c55e3e4.r2.dev/partner-ledger-latest.json | jq .generatedAt
# After watch runs once: generatedAt newer; Worker meta.cache=url still
```

**Spawn prompt**

```text
Lane T3 only. Repo plum-spruce-dawn-dune1, branch feat/partner-snapshot-cron.
Add scripts/partner-snapshot-watch.ts modeled on edge-archive-watch (Bun.cron */5, no overlap): run partner-ledger:publish and partner-executions:publish. Wire package.json partner-snapshot:watch / :once. Document in docs/SUBAGENT-TASKS.md Agent E. No D1, no route redesign, no PARTNER_API_TOKEN changes. PR + squash-merge. Do not deploy unless parent asks.
```

---

## P1 — Poly join hydrate residual

| | |
| -- | -- |
| **Status** | READY |
| **Repo** | producer |
| **Branch** | `fix/poly-join-hydrate` |
| **Owner files** | poly volume cache / live-enrichment / poly-* tests only (see producer `docs/SUBAGENT-TASKS.md` Agent C) |
| **Goal** | Cold start poly miss chip not stuck 100%; hydrate before first enrich |

**Verify**

```bash
bun test src/lib/tennis-hq/__tests__/poly-hydrate-order.test.ts src/lib/tennis-hq/__tests__/poly-lookup-memo.test.ts
```

**Spawn prompt**

```text
Lane P1 only. plum-spruce-dawn-dune1. Follow docs/SUBAGENT-TASKS.md Agent C. Hydrate poly cache before first board enrich; tests only under poly-*. Do not touch partner ledger, wrangler.jsonc, or R2 publish scripts. PR + squash-merge.
```

---

## O1 — Operator-research doctor CLI

| | |
| -- | -- |
| **Status** | READY |
| **Repo** | monorepo |
| **Branch** | `feat/operator-research-doctor` |
| **Owner files** | `tools/operator-agent.ts` · `lib/operator-research/doctor.ts` (new) · `package.json` script `agent:doctor` · tests under `tests/operator-research-doctor.test.ts` |
| **Goal** | `bun run agent:doctor` / `bun tools/operator-agent.ts doctor [--json]` probes: Bun.version vs engines, `Bun.which` for curl/git, operators TOML count via Glob, evidence dir writable, optional WebView/Image capability flags |

**Constraints**

- CLI only — **no** HTTP server in this lane.
- Use `lib/console-depth` (`jsonOut` / `logTable`) for TTY; no raw `console.table`.
- Do not implement `Bun.password` here (O2).

**Verify**

```bash
bun run agent:doctor
bun run agent:doctor -- --json
bun test tests/operator-research-doctor.test.ts
```

**Spawn prompt**

```text
Lane O1 only. Monorepo worktree. Implement lib/operator-research/doctor.ts and wire tools/operator-agent.ts doctor + package.json agent:doctor. Check: engines.bun, Bun.which curl/git, config/operators/*.toml count, data/operator-research dirs, export paths. --json machine output. Tests in tests/operator-research-doctor.test.ts. No HTTP serve, no password auth, no Tennis Worker files. PR + squash-merge.
```

---

## O4 — Fetch classify backoff (`Bun.sleep`)

| | |
| -- | -- |
| **Status** | READY |
| **Repo** | monorepo |
| **Branch** | `fix/operator-research-fetch-backoff` |
| **Owner files** | `lib/operator-research/fetch-classify.ts` (+ tests) |
| **Goal** | Exponential backoff with `Bun.sleep` on 429 / transient network errors |

**Verify**

```bash
bun test tests/operator-research-fetch*.test.ts
# or nearest existing enrich/fetch tests
```

**Spawn prompt**

```text
Lane O4 only. Add Bun.sleep exponential backoff to lib/operator-research/fetch-classify.ts for 429 and transient failures. Cap retries. Add // @see Bun.sleep canonical ref. Tests for backoff schedule (mock fetch). No doctor, no HTTP, no producer. PR + squash-merge.
```

---

## O2 / O3 — Optional research HTTP agent (SERIAL — parent must approve)

| ID | Goal | Do not |
| -- | ---- | ------ |
| **O2** | `Bun.password` hashed keys in `data/operator-research/auth.json` (gitignored) for a **future** research HTTP surface only | Do not apply to Tennis Worker |
| **O3** | `Bun.serve` dashboard: enrich status, gzip JSON, `Bun.escapeHTML` in any HTML, wire doctor to `/api/platform` | Do not replace portal Pages boards |

**Spawn only after parent message: `APPROVE O2+O3 research HTTP`.**

**Spawn prompt (O3 scaffold)**

```text
Lane O3 only after parent APPROVE. Scaffold tools/operator-research-serve.ts with Bun.serve: health, doctor JSON, optional enrich trigger behind auth hook stub. HTML must Bun.escapeHTML. Gzip when Accept-Encoding includes gzip. Document that this is NOT tennis.factory-wager.com. No D1. PR as draft if incomplete.
```

---

## H1 — Orchestrator handoff checklist

After wave 0+1:

```bash
# Producer
cd ~/Projects/plum-spruce-dawn-dune1
bun run partner-ledger:publish && bun run partner-executions:publish
# optional: bun run cloudflare:deploy:verify if wrangler vars changed

# Monorepo
# T1 tip PR merged; surfaces bake committed

# Live proof paste into parent session
curl -fsS https://tennis.factory-wager.com/api/version | jq .
curl -sS 'https://tennis.factory-wager.com/api/partners/ledger?partner=ASH&limit=1' | jq '{source,meta}'
bun run agent:doctor -- --json   # after O1
```

---

## Parallel spawn recipe (parent)

Spawn **wave 0** together (disjoint files):

| Subagent | Branch | Isolation |
| -------- | ------ | --------- |
| T1+T2 | monorepo worktree | `isolation: worktree` recommended |
| P1 | producer | shared producer clone **or** worktree |
| O1 | monorepo worktree | separate worktree from T1 |
| O4 | monorepo worktree | third worktree **or** after O1 |

Then **wave 1**: T3 (producer), then H1.

Machine-readable catalog: [`subagent-fanout.json`](./subagent-fanout.json).

---

## Cross-links

| Surface | Doc |
| ------- | --- |
| Tennis producer board | `plum-spruce-dawn-dune1/docs/SUBAGENT-TASKS.md` |
| Tennis audit | `docs/harness/tenants/tennis-hq-ui-audit.md` |
| Tennis registry | `docs/harness/tenants/tennis-hq-registry.md` |
| Operator research CLI | `tools/operator-agent.ts` · `lib/operator-research/` |
| Authority | `docs/harness/AUTHORITY.md` |
