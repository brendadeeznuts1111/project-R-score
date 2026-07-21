# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next trajectory does not re-learn it in chat.

Upstream: [Turn feedback into infrastructure](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/feedback).

## Template

```markdown
## Lesson

- **Finding:** (what failed / what the agent did wrong)
- **Repair:** (what fixed this instance)
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof
- **Ratchet:** (concrete check or doc link that blocks recurrence)
- **Keep / revise / drop:** after a fresh rerun
```

## Promote

| Owner | Where |
|-------|--------|
| type | brand / path-bun / parse* |
| lint | `config/eslint/plugin-harness/` · `plugin-bun/` |
| skill | `.agents/skills/<name>/SKILL.md` |
| doc-map | `lib/docs/repo-docs.ts` + SSOT markdown |
| script-gate | `scripts/pre-commit-harness.ts` or named `bun run` |
| proof | `docs/harness/PROOF.md` named path |

Scaffold: `bun run harness:lesson --title="…"`.

## Retained lessons (velocity pass)

### Bun doc-refs re-stage loop

- **Finding:** Commit failed on missing `@see`; agent annotated and re-staged every session.
- **Repair:** Annotate-on-write inside `pre-commit-harness` before check.
- **Earliest owner:** script-gate
- **Ratchet:** `scripts/pre-commit-harness.ts` doc-refs-annotate → doc-refs-check
- **Keep / revise / drop:** keep

### Soft import / prefer / unknown warnings

- **Finding:** `--max-warnings 500` + warn-tier rules made ESLint a false green.
- **Repair:** Burn slices; promote restricted-imports, prefer-bun-env, prefer-import-meta-main, no-unknown-function-param to **error**; `--max-warnings 0`.
- **Earliest owner:** lint
- **Ratchet:** `eslint.bun-native.config.ts` + pre-commit max-warnings 0
- **Keep / revise / drop:** keep

### Affected / type-check fiction

- **Finding:** `build:affected` used Bun `'...'` dependents filter; thin `type-check` missed agent edit surfaces.
- **Repair:** `scripts/affected-workspaces.ts`; widen `tsconfig.check.json` spine includes.
- **Earliest owner:** script-gate + doc-map
- **Ratchet:** package.json scripts + VELOCITY_BASELINE
- **Keep / revise / drop:** keep (lib/docs/** still deferred)
