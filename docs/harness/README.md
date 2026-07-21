# FactoryWager harness index (JIT)

Hold the model fixed; improve **context + tools**. Upstream thesis: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering). Prefer **artifact** over “codebase.”

When a decision is unresolved, read **one** owner below — do not load the full standards stack.

| When unresolved… | Read |
|------------------|------|
| Domain `*Id` / bare string IDs | [`lib/types/branded/README.md`](../../lib/types/branded/README.md) · skill `.agents/skills/branded-ids/` |
| `unknown` / decode / wire vs interior | [`docs/WIRE_BOUNDARY.md`](../WIRE_BOUNDARY.md) |
| Bun API usage / `@see` refs | `bun tools/bun-doc-refs.ts suggest "<api>"` · [`docs/BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md) |
| Install / bunfig / machine Bun | [`docs/UNIFIED.md`](../UNIFIED.md) |
| Day loop / affected / type-check honesty | [`docs/organization/VELOCITY_BASELINE.md`](../organization/VELOCITY_BASELINE.md) · this index |
| Claim vs evidence (“done?”) | [`docs/harness/PROOF.md`](PROOF.md) |
| Repeat failure → earliest owner | [`docs/harness/FEEDBACK.md`](FEEDBACK.md) |
| Improve the harness itself | [`.agents/skills/harness-improve/SKILL.md`](../../.agents/skills/harness-improve/SKILL.md) |
| Parallel lanes / don’t sweep foreign dirty trees | Root [`AGENTS.md`](../../AGENTS.md) operating rules |
| Coding standards (full) | [`.custom-instructions.md`](../../.custom-instructions.md) |

## Day loop (honest)

```bash
bun run help
bun run type-check              # tsconfig.check.json — spine agent surfaces
bun run build:affected          # git-true workspaces → bun --filter
bun run test:affected
bun run check:path-bun          # lib/ path ratchet
bun run check:bun-env           # lib/ + scripts/ Bun.env ratchet
bun run cli:docs                # when CLI surface changes
```

Commit: husky → hygiene → `pre-commit-harness` (annotate-on-write doc-refs; brands staged‖smart; path-bun / bun-env when lib|scripts staged) → ast-grep when triggered. Timings: `reports/harness-gate-timing.json`.

## Local theses (FactoryWager)

1. **Parse once** at the boundary into brands/structs.
2. **One concept → one owner** (brands manifest, path-bun, cli-args, repo-docs).
3. **Repository teaches the agent** — AGENTS routes; ratchets block regressions.
4. **Prove the claim** — match evidence kind to the statement (PROOF.md).
5. **Finish migrations** — no dual eras as prompt material (path-bun, Bun.env).
6. **Feedback → infrastructure** — lesson template promotes into type/lint/skill/doc-map.
7. **Attention budget** — JIT this index; deep docs stay linked.
8. **Whole job + lanes** — one trajectory owns closeout; disjoint files for parallel agents.
