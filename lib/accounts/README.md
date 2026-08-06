# accounts

Tree-node partners, agents, and sub-agents for the operations platform (growth
metrics, promotion, play routing, proof on mutations).

| File                                                 | Role                                            |
| ---------------------------------------------------- | ----------------------------------------------- |
| [`accounts.ts`](accounts.ts)                         | Unified tree-node account system (`bun:sqlite`) |
| [`account-types.ts`](account-types.ts)               | Shared account / tree types                     |
| [`account-r2-store.ts`](account-r2-store.ts)         | R2-backed account store                         |
| [`memory-account-store.ts`](memory-account-store.ts) | In-memory store (tests / lab)                   |
| [`automation.ts`](automation.ts)                     | Account automation helpers                      |

Related: [`../automation/`](../automation/) · [`../identity/`](../identity/) ·
[`../telegram/`](../telegram/).

```bash
# domain index only — import modules directly (no domain barrel required)
```
