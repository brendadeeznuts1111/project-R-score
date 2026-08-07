# `@factorywager/shade-pipeline`

Workspace package for the normalized odds / shade engine extract
([#284](https://github.com/brendadeeznuts1111/project-R-score/issues/284)).

| Field | Value |
| ----- | ----- |
| Status | `scaffold-pending-extract` |
| Workspace | `packages/shade-pipeline` |
| Nested source | `projects/active/enterprise/bet-ticker-worker-v1.1` (own remote; often absent) |
| Plan | [`projects/active/automation/enterprise-enhancement-plan.md`](../../projects/active/automation/enterprise-enhancement-plan.md) §1.1 |

## What this PR1 slice owns

- Discoverable `@factorywager/shade-pipeline` workspace member
- Explicit `SHADE_PIPELINE_PACKAGE_TARGET` contract (status + pending symbols)
- Unit proof: `bun test tests/shade-pipeline-package.test.ts`

## What is intentionally absent

| Work | Blocker |
| ---- | ------- |
| `normalizeOdds` / `sportMapping` / `rotationResolver` bodies | Nested bet-ticker checkout + ADR `0009-migrate-d1-to-r2` |
| `scripts/migrate-d1-to-r2.ts` live I/O | D1 HTTP + `fw-shade-prod` R2 vault |
| `bet-ticker` R2 `OddsRepository` adapter | Nested product source |
| Cascade / Registry `workspace:*` consumers | Extract APIs + nested trees |
| Chaos / k6 / canary / systemd cutover | VPS (`bet-ticker-vps`) |

Do **not** invent domain logic here to “look complete.”

## Proof

```bash
bun test tests/shade-pipeline-package.test.ts
bun run validate:workspaces
bun pm ls --filter '@factorywager/shade-pipeline'
```
