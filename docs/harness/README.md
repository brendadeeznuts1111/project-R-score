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
| Claim vs evidence (“done?”) | [`PROOF.md`](PROOF.md) |
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
bun run test:affected
bun run check:path-bun          # lib/ path ratchet
bun run check:bun-env           # lib/ + scripts/ Bun.env ratchet
bun run cli:docs                # when CLI surface changes
```

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
