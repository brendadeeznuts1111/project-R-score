# Development workflow (Bun-native testing & gates)

How day-loop testing, pre-commit, and quality gates work in this monorepo —
aligned with Bun’s runner (`--changed`, `--watch`, `pathIgnorePatterns`) while
keeping the FactoryWager **husky** harness (not a second hooks stack).

| Related | Path |
| --- | --- |
| Coding standards | [`docs/DEVELOPMENT-STANDARDS.md`](DEVELOPMENT-STANDARDS.md) |
| Portal foundation / semantics | [`docs/portal-foundation.md`](portal-foundation.md) |
| Wire boundary | [`docs/WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md) |
| Bunfig / install | [`docs/UNIFIED.md`](UNIFIED.md) |
| Agent entry | [`AGENTS.md`](../AGENTS.md) |

---

## Day-loop commands

| Command | What it does |
| --- | --- |
| `bun run test:dev` | `bun test --watch` on `tests/` (file watchers + re-run) |
| `bun run test:watch` | `bun test --changed --watch` — only tests affected by the dirty tree |
| `bun run test:changed` | Wrapper → **`bun test --changed`** (+ parallel by default) |
| `bun run test` | Full monorepo suite under `tests/` (`NODE_ENV=test`) |
| `bun run test:ci` | Same tree + JUnit report |
| `bun run test:concept` | Concept-lane subset (graph, audit, boards, limit-row wire) |

### Why not bare `bun test` at repo root?

`bunfig.toml` `[test].pathIgnorePatterns` excludes nested product noise
(`toc-ops-repo/**`, `Kalshi-bot/**`, worktrees, artifacts). Default scripts still
pass **`tests/`** explicitly so discovery stays monorepo-first.

```toml
# bunfig.toml [test]
pathIgnorePatterns = [
  # …
  "toc-ops-repo/**",
  "Kalshi-bot/**",
  ".codex-worktrees/**",
]
```

@see https://bun.com/docs/test/configuration#pathignorepatterns  
@see https://bun.com/blog/bun-v1.3.13#bun-test-changed

---

## Pre-commit (husky — keep this)

Hooks live in [`.husky/pre-commit`](../.husky/pre-commit). They already:

1. Repo hygiene + harness format/lint on staged paths  
2. package.json scripts guard  
3. ast-grep + semver  
4. gitleaks (staged)  
5. **`scripts/bun-test-changed-staged.ts`** — runs `bun test --changed` in a
   **HEAD ∪ staged** scratch repo so **another lane’s dirty failing tests cannot
   block your commit**

### Escape hatches (document in the commit message)

| Env | When |
| --- | --- |
| `SKIP_TEST_CHANGED=1` | Staged-temp / foreign-gate evidence only — write reason + local proof |
| `SKIP_GITLEAKS=1` | Rare; credential scan exception with reason |

### Why we did **not** switch to `bun-git-hooks`

This monorepo’s merge bar is the **husky + harness** stack (branded IDs, import
graph, doctor, mixed-lane bake warnings, staged-scoped `--changed`). A second
hooks manager would fight `core.hooksPath` and drop those gates.  
`bun-git-hooks` / simple-git-hooks style staged lint is **already covered** by
`pre-commit-harness` + staged test selection.

Use **`bun run format:staged -- <files…>`** (`prettier --check` with paths) for
ad-hoc staged checks; husky’s harness formatter runs on staged lib paths
automatically.

---

## Concept / vocabulary changes

Always (local or CI day-loop):

```bash
bun run test:concept
bun run quality:concept   # audit --strict + surface-coverage + SURFACE_COVERAGE.md --check
```

| Command | Role |
| --- | --- |
| `bun run surface-coverage:map` | Regenerate [`docs/SURFACE_COVERAGE.md`](SURFACE_COVERAGE.md) |
| `bun run surface-coverage:check` | Fail if the map doc is stale (ignores Generated timestamp) |
| `bun run quality:concept` | Full concept-lane quality gate |

See also portal semantic contract in [`portal-foundation.md`](portal-foundation.md)
and the lifecycle map in [`CONCEPT_LIFECYCLE.md`](CONCEPT_LIFECYCLE.md).

---

## Time-sensitive tests

Prefer Bun’s clock mock over wall-clock flakiness:

```ts
import { setSystemTime, afterEach } from 'bun:test';
// @see https://bun.com/docs/test/dates-times

afterEach(() => setSystemTime());
setSystemTime(new Date('2026-07-31T12:00:00.000Z'));
```

Note: SQLite `unixepoch()` is **not** mocked — set SQL timestamps from JS
`Date.now()` under the fake clock.

---

## Bake hygiene

| Rule | Why |
| --- | --- |
| Never `tool > public/registry/foo.json` if the tool writes the path itself | Corrupts JSON with status lines (brand-keymap incident) |
| Prefer `chore(bake):` separate from source | pre-commit mixed-lane warning |
| Proof taxonomy | `bun run verify:proof-taxonomy:save` → `public/registry/proof-taxonomy-audit.json` |

---

## Quick start

```bash
bun install                    # husky via prepare
bun run test:dev               # watch monorepo tests
# edit → commit (hooks run staged --changed)
bun run test:concept           # before concept PRs
bun run concept:audit --strict
```
