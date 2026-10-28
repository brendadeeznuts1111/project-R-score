# Agent skill rating

Executable rating mechanics for repository-owned skills. This domain measures
static Bun compliance and explicitly attributed finite evidence; it does not
decide when a skill should trigger or claim that compliance proves quality.

| Module                | Ownership                                             |
| --------------------- | ----------------------------------------------------- |
| `rating-static*.ts`   | Small, testable static-rule groups and score assembly |
| `rating-model.ts`     | Fail-closed dynamic evidence configuration parser     |
| `rating-evidence.ts`  | Managed proof collection and finite-evidence scoring  |
| `rating-portfolio.ts` | Active-skill discovery and portfolio result assembly  |
| `rating-types.ts`     | Shared result and evidence contracts                  |

The CLI facade remains `scripts/rate-agent-skills.ts`. Policy and interpretation
remain in `.agents/skills/references/bun-skill-rating.md`; this library should
not duplicate skill guidance or become an agent controller.

## Proof

```bash
bun test tests/agent-skills-rating.test.ts
bun run skills:rate
bun run skills:rate:dynamic
```
