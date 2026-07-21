# FactoryWager harness index (JIT)

Hold the model fixed; improve **context + tools**. Upstream: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) (transform ideas into our owners — do not clone their tree). Prefer **artifact** over “codebase.”

When a decision is unresolved, read **one** owner below — do not load the full standards stack.

## When unresolved → read

| When unresolved… | Read |
|------------------|------|
| Domain `*Id` / bare string IDs | [`lib/types/branded/README.md`](../../lib/types/branded/README.md) · skill `.agents/skills/branded-ids/` |
| `unknown` / decode / wire vs interior | [`docs/WIRE_BOUNDARY.md`](../WIRE_BOUNDARY.md) |
| Bun API usage / `@see` refs | `bun tools/bun-doc-refs.ts suggest "<api>"` · [`docs/BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md) |
| Install / bunfig / machine Bun | [`docs/UNIFIED.md`](../UNIFIED.md) |
| Day loop / affected / type-check honesty | [`docs/organization/VELOCITY_BASELINE.md`](../organization/VELOCITY_BASELINE.md) |
| Claim vs evidence (“done?”) | [`PROOF.md`](PROOF.md) · `bun run proof:install` |
| Repository review (9 trajectory questions) | [`REVIEW.md`](REVIEW.md) |
| Repeat failure → earliest owner | [`FEEDBACK.md`](FEEDBACK.md) |
| Lanes / push / credentials / irreversible ops | [`AUTHORITY.md`](AUTHORITY.md) |
| Discover day-loop + ratchet status | `bun run harness:status` |
| Improve the harness itself | [`.agents/skills/harness-improve/SKILL.md`](../../.agents/skills/harness-improve/SKILL.md) |
| Coding standards (full) | [`.custom-instructions.md`](../../.custom-instructions.md) |

## Upstream thesis → FactoryWager owner

| Thesis ([docs index](https://github.com/lopopolo/harness-engineering/tree/trunk/docs)) | Local owner |
|----------------------------------------------------------------------------------------|-------------|
| Hold the worker constant | This index + skill; do not “upgrade the model” mid-job |
| Private process-data iceberg | `AGENTS.md` routing · UNIFIED · brand manifest · projects triage |
| Whole job | One trajectory owns closeout; parallel **lanes** in AUTHORITY |
| Just-in-time context | This index (not the 700+ line standards fan-out) |
| Tool legibility | `bun run help` · `harness:status` · cli-categories · actionable gate errors |
| Repository teaches the agent | brands / wire eslint / path-bun / bun-env / doc-refs annotate-on-write |
| Autonomy inside authority | [`AUTHORITY.md`](AUTHORITY.md) |
| Prove in the real environment | [`PROOF.md`](PROOF.md) · `lib/harness/proof.ts` |
| Feedback → infrastructure | [`FEEDBACK.md`](FEEDBACK.md) · `harness:lesson` |
| Coherence / lifetime risk | finish migrations + ratchets (VELOCITY_BASELINE eras) |
| Continuous maintenance | day loop + pre-commit timings · `docs:refresh` operate loop |
| Measured effectiveness | gate timings · attention budget (serial ESLint still dominant) |

## Day loop (honest)

```bash
bun run harness:status          # discover ratchets + last gate timing
bun run help
bun run type-check              # tsconfig.check.json — spine agent surfaces
bun run build:affected          # git-true workspaces → bun --filter
bun run test:affected           # workspace package.json "test" scripts
bun run test:changed            # working tree (staged+unstaged+untracked)
#   bun run test:changed -- HEAD~1
#   bun run test:changed -- main
#   bun run test:changed:watch          # stay up; re-query git each restart
#   bun run test:changed -- main --parallel
# speed / CI (Bun ≥1.3.13):
#   bun run test:parallel | test:isolate
#   SHARD=1/3 bun run test:shard
bun run proof:install           # journey: install layout healthy
bun run check:path-bun          # lib/ path ratchet
bun run check:bun-env           # lib/ + scripts/ Bun.env ratchet
bun run cli:docs                # when CLI surface changes
```

Test axes: `test:affected` = changed **workspaces**; `test:changed` = Bun import-graph filter ([`scripts/bun-test-changed.ts`](../../scripts/bun-test-changed.ts) → `--changed` / `--changed=<ref>`; scan skips `node_modules`, no link/emit). Empty dirty set exits 0; `test:changed:watch` stays alive and re-filters on any local source edit. Prefer `--parallel` for large suites; `--shard=M/N` in CI. Docs: [bun test](https://bun.com/docs/test/index#run-tests) · [v1.3.13 `--changed`](https://bun.com/blog/bun-v1.3.13#bun-test-changed) · [release map](../BUN_NATIVE_CAPABILITIES.md#bun-v1313-release-map).

Commit: husky → hygiene → `pre-commit-harness` (annotate-on-write doc-refs; brands staged‖smart; path-bun / bun-env when lib\|scripts staged; ESLint `--max-warnings 0`) → ast-grep when triggered. Timings: `reports/harness-gate-timing.json`.

## Local theses (FactoryWager)

1. **Parse once** at the boundary into brands/structs.
2. **One concept → one owner** (brands manifest, path-bun, cli-args, repo-docs).
3. **Repository teaches the agent** — AGENTS routes; ratchets block regressions.
4. **Prove the claim** — match evidence kind to the statement (PROOF.md).
5. **Finish migrations** — no dual eras as prompt material.
6. **Feedback → infrastructure** — lesson template promotes into type/lint/skill/doc-map.
7. **Attention budget** — JIT this index; deep docs stay linked.
8. **Whole job + lanes** — one trajectory owns closeout; disjoint files for parallel agents.
