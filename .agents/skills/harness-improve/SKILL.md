---
name: harness-improve
description: >-
  Improve FactoryWager harness velocity: observe trajectory, earliest failed
  handoff, smallest reversible fix at owning boundary, fresh rerun. Use when
  commit loops thrash, day-loop proof is false, or NFRs are unresolved in prose.
---

# Harness improve (one job)

Observe a failed or slow agent trajectory, find the earliest failed handoff, apply the smallest reversible fix at the owning boundary, then fresh-rerun and keep/revise/drop.

Upstream shape: [improve-harness playbook](https://github.com/lopopolo/harness-engineering/blob/trunk/playbooks/improve-harness.md) — transform, don't clone.

## When to use

- Pre-commit fail → annotate → re-stage loops
- Day-loop commands that don't cover edited surfaces
- Repeated review corrections that never become ratchets
- Unclear which doc owns a nonfunctional requirement

## Job contract (record before changing the harness)

```text
Target and revision:
Fixed model / agent:
Representative job:
Accepted outcome:
Evidence that proves the outcome:
Authority envelope:          # see docs/harness/AUTHORITY.md
Budget and stop conditions:
Suspected harness gap:
```

## Loop

1. **Observe** — capture the failing command, claim made, and files touched.
2. **Earliest failed handoff** — classify: context | capability | domain ownership | authority | proof | feedback | worker limitation (candidate only).
3. **Owner** — route via [`docs/harness/README.md`](../../../docs/harness/README.md) (one thesis hop).
4. **Hypothesis** — If \<intervention\> at \<owner\>, then \<observable change\> on \<job\>, because \<mechanism\>.
5. **Smallest reversible fix** — prefer type/lint/skill/doc-map over new scripts; verify native checks + claim journey.
6. **Fresh rerun** — run the affected claim’s `freshRerun` from [`lib/harness/proof.ts`](../../../lib/harness/proof.ts) (see [`FRESH-RERUN.md`](../../../docs/harness/FRESH-RERUN.md)); paste terminal output into the PR; confirm the intervention was actually retrieved/invoked.
7. **Retain / revise / remove** — justify carrying cost; record lesson if it will recur. No retain without fresh-rerun output.

## Ratchet promote

Before promoting a warn-tier rule to **error**, run the gate once with `--max-warnings 0` (or equivalent dry-run), capture hit count + owner, burn or scope, then flip. Do not surprise CI with an unknown population.

## Lesson

Fill [`docs/harness/FEEDBACK.md`](../../../docs/harness/FEEDBACK.md) or `bun run harness:lesson --title="…"`.

## Do not

- Sweep parallel-lane dirty trees (see AUTHORITY)
- Add package.json aliases as a substitute for proof
- Clone upstream harness-engineering docs wholesale
- Weaken a grader / skip hooks to make a run pass
