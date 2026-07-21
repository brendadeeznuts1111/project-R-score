# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next trajectory does not re-learn it in chat.

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
| lint | `config/eslint/plugin-harness/` |
| skill | `.agents/skills/<name>/SKILL.md` |
| doc-map | `lib/docs/repo-docs.ts` + SSOT markdown |
| script-gate | `scripts/pre-commit-harness.ts` or named `bun run` |
| proof | `docs/harness/PROOF.md` named path |

Scaffold: `bun scripts/harness-lesson.ts --title="…"`.
