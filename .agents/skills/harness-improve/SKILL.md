---
name: harness-improve
description: >-
  Improve FactoryWager harness velocity: observe trajectory, earliest failed
  handoff, smallest reversible fix at owning boundary, fresh rerun. Use when
  commit loops thrash, day-loop proof is false, or NFRs are unresolved in prose.
---

# Harness improve (one job)

Observe a failed or slow agent trajectory, find the earliest failed handoff, apply the smallest reversible fix at the owning boundary, then fresh-rerun and keep/revise/drop.

Upstream shape: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) playbooks (transform, don't clone).

## When to use

- Pre-commit fail → annotate → re-stage loops
- Day-loop commands that don't cover edited surfaces
- Repeated review corrections that never become ratchets
- Unclear which doc owns a nonfunctional requirement

## Loop

1. **Observe** — capture the failing command, claim made, and files touched.
2. **Earliest failed handoff** — context missing? wrong proof? competing precedent? gate tax?
3. **Owner** — route via [`docs/harness/README.md`](../../../docs/harness/README.md).
4. **Smallest reversible fix** — prefer type/lint/skill/doc-map over new scripts.
5. **Fresh rerun** — same claim; keep / revise / drop.
6. **Lesson** — fill [`docs/harness/FEEDBACK.md`](../../../docs/harness/FEEDBACK.md) template if it will recur.

## Do not

- Sweep parallel-lane dirty trees (proton-pass, etc.)
- Add package.json aliases as a substitute for proof
- Clone upstream harness-engineering docs wholesale
