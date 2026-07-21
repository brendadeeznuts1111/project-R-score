# Repository review (JIT)

Upstream playbook: [repository-review](https://github.com/lopopolo/harness-engineering/blob/trunk/playbooks/repository-review.md). Transform only — do not clone the full playbook.

Follow one representative job from request → outcome. Ask each question; open **one** owner.

| # | Question | Local owner |
|---|----------|-------------|
| 1 | How does the agent classify the task? | [`AGENTS.md`](../../AGENTS.md) · [`docs/AGENTS.md`](../AGENTS.md) |
| 2 | Which root guidance routes to domain context? | [`docs/harness/README.md`](README.md) · `bun run harness:status` |
| 3 | Can it find the existing owner of the concept? | [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts) · brand map · WIRE_BOUNDARY |
| 4 | Can it observe the behavior without a human relay? | `bun run help` · named CLI / `harness:status` ratchets |
| 5 | One domain model / one source of truth? | brands · wire eslint · path-bun · bun-env · UNIFIED |
| 6 | Does proof exercise the claim at the right boundary? | [`PROOF.md`](PROOF.md) · `lib/harness/proof.ts` · `bun run proof:install` |
| 7 | Review, CI, conflicts, delivery? | husky / pre-commit-harness · `.github/workflows/` · AUTHORITY lanes |
| 8 | Which ops need human judgment / new authority? | [`AUTHORITY.md`](AUTHORITY.md) |
| 9 | Durable improvement for the next run? | [`FEEDBACK.md`](FEEDBACK.md) · `bun run harness:lesson` |

Stop conditions and credentials: AUTHORITY. “Done” without matching evidence: PROOF.
