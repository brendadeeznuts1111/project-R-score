# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next trajectory does not re-learn it in chat.

Upstream: [Turn feedback into infrastructure](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/feedback).

## Template

```markdown
## Lesson

- **Finding:** (what failed / what the agent did wrong)
- **Repair:** (what fixed this instance)
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof | CI | ops
- **Ratchet:** (concrete check or doc link that blocks recurrence)
- **Keep / revise / drop:** after a fresh rerun
```

Scaffold: `bun run harness:lesson --title="…"`.

## Promote

| Owner | Where |
|-------|--------|
| type | brand / path-bun / parse* |
| lint | `config/eslint/plugin-harness/` · `plugin-bun/` |
| skill | `.agents/skills/<name>/SKILL.md` |
| doc-map | `lib/docs/repo-docs.ts` + SSOT markdown |
| script-gate | `scripts/pre-commit-harness.ts` · named `bun run` |
| proof | `docs/harness/PROOF.md` |
| CI | `.github/workflows/` · `scripts/ci-*.ts` |

## Lesson index (detail in git)

| Lesson | Owner | Ratchet |
|--------|-------|---------|
| Doc-refs re-stage loop | script-gate | annotate-on-write in pre-commit |
| Soft warn-tier ESLint | lint | `--max-warnings 0` + error rules |
| Affected / type-check fiction | script-gate | `affected-workspaces` · `tsconfig.check.json` |
| Install journey proof | proof | `proof:install` / `install:verify` |
| Annotate thrash / dirty tree | script-gate | `assertStagedMatchesWorktree` |
| Full-tree ESLint every PR | script-gate | `lint:bun-native:changed` · `HARNESS_FULL_LINT` |
| CI install × N jobs | CI | `ci:core` · `setup-factory-bun` · path filters |
| Docs dump attention tax | doc-map | slim live `docs/` · `doc-map-check` |
| Heap profile / fat READMEs | doc-map | gitignore `lib/profile.md` · JIT READMEs |
| Pre-commit ESLint cold | script-gate | `.cache/eslint-bun-native` |
| GHA billing lock | ops | unlock Actions billing; local `ci:core` still proves |
| SSOT doc encyclopedia tax | doc-map | compress OPERATE / standards / docs/AGENTS to JIT |
| Generated CLI/REGISTRY tax | doc-map | stub + `help` / `packages:list`; regenerate on demand |

Full prose lessons: `git show 4bd1e324:docs/harness/FEEDBACK.md` (pre-compression).
