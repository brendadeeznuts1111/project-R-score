# Development workflow (Bun-native testing & gates)

How day-loop testing, pre-commit, and quality gates work in this monorepo —
aligned with Bun’s runner (`--changed`, `--watch`, `pathIgnorePatterns`) while
keeping the FactoryWager **husky** harness (not a second hooks stack).

| Related                       | Path                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| Coding standards              | [`docs/DEVELOPMENT-STANDARDS.md`](DEVELOPMENT-STANDARDS.md) |
| Portal foundation / semantics | [`docs/portal-foundation.md`](portal-foundation.md)         |
| Wire boundary                 | [`docs/WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md)                 |
| Bunfig / install              | [`docs/UNIFIED.md`](UNIFIED.md)                             |
| Agent entry                   | [`AGENTS.md`](../AGENTS.md)                                 |

---

## Day-loop commands

| Command                | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `bun run test:dev`     | `bun test --watch` on `tests/` (file watchers + re-run)              |
| `bun run test:watch`   | `bun test --changed --watch` — only tests affected by the dirty tree |
| `bun run test:changed` | Wrapper → **`bun test --changed`** (+ parallel by default)           |
| `bun run test`         | Full monorepo suite under `tests/` (`NODE_ENV=test`)                 |
| `bun run test:ci`      | Same tree + JUnit report                                             |
| `bun run test:concept` | Concept-lane subset (graph, audit, boards, limit-row wire)           |

### Why not bare `bun test` at repo root?

`bunfig.toml` `[test].pathIgnorePatterns` excludes nested product noise
(`toc-ops-repo/**`, `Kalshi-bot/**`, worktrees, artifacts). Default scripts
still pass **`tests/`** explicitly so discovery stays monorepo-first.

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
6. **`quality:concept` (path-gated)** — only when concept SSOT is staged:
   `lib/portal/semantic-vocabulary.ts`, `lib/portal/concept-*`,
   `lib/portal/page-concepts.ts`, `scripts/validate-surface-coverage.ts`,
   `scripts/concept-audit.ts`, `tools/generate-surface-coverage-map.ts`,
   `docs/SURFACE_COVERAGE.md`, `docs/DOMAIN_CONCEPT_SHAPE.md`,
   `public/portal/concepts/index.html`, `public/registry/domain-glossary.json`,
   `public/registry/concepts-state.json`

### Escape hatches

These environment variables bypass a specific pre-commit gate **in exceptional
cases only**. Every skip must be accompanied by a clear reason and local proof
in the **commit message**. Without that, post-merge review should flag the
commit.

| Env                      | When to use                                                                                                                                                                                                             | Requirements                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKIP_TEST_CHANGED=1`    | Staged-temp / foreign-gate noise only — when `bun test --changed` false-fails (runner symlink / HEAD∪staged scratch limits, or another lane’s dirty suite).                                                             | Local proof the change is safe (e.g. `bun test tests/<affected>.test.ts` green) plus why the gate is not yours.                              |
| `SKIP_QUALITY_CONCEPT=1` | Concept SSOT is staged but the gate fails for a **documented** exception (foreign-lane surface drift, temporary env mismatch, known allowlist work in flight).                                                          | Reference issue/PR or owner lane; prefer fixing or narrowing the gate over skipping.                                                         |
| `SKIP_GITLEAKS=1`        | Rare — false positive credential scan (e.g. test fixture with a clearly fake secret).                                                                                                                                   | Explain why the match is not a real secret.                                                                                                  |
| `SKIP_WIRE_LINT=1`       | Partner-surface wire lint (`lint-wires`) false-fails — e.g. empty nested checkout while proving unrelated `.ts`, or inventory globs in flight. Prefer `// wire-ok: <reason>` or `boundaryPathGlobs`.                    | Local `bun scripts/validate-wire-traps.ts --scan` (and `--strict-globs` when inventory SSOT staged) plus why the hit is not yours.           |
| `SKIP_DOMAIN_LINT=1`     | Partner-surface domain isolation lint (`lint-domains`) false-fails — e.g. temporary out-of-home brand use while expanding home globs, or SSOT `--strict` noise from another lane. Prefer fixing homes on the brand bag. | Local `bun scripts/validate-partner-domain-isolation.ts --scan` (and `--strict` when domain-lint SSOT staged) plus why the hit is not yours. |

**Usage example:**

```bash
SKIP_QUALITY_CONCEPT=1 git commit -m "$(cat <<'EOF'
fix: retarget glossary alias (SKIP_QUALITY_CONCEPT=1)

Upstream board HTML pending in PR#123; quality:concept fails on allowlist-only
surface until that lands. Local: bun run concept:audit --strict exits 0.
EOF
)"
```

**Caution:** skips are temporary. Prefer fixing the underlying issue or
adjusting the gate so false positives do not recur. Do not use escape hatches as
a routine day-loop shortcut.

**Commit message must include:**

1. Which gate was skipped (`SKIP_*` name)
2. Why the skip was necessary
3. Evidence the change is safe (command + exit 0, or path to proof)

### Why we did **not** switch to `bun-git-hooks`

This monorepo’s merge bar is the **husky + harness** stack (branded IDs, import
graph, doctor, mixed-lane bake warnings, staged-scoped `--changed`). A second
hooks manager would fight `core.hooksPath` and drop those gates.  
`bun-git-hooks` / simple-git-hooks style staged lint is **already covered** by
`pre-commit-harness` + staged test selection.

Use **`bun run format:staged -- <files…>`** (`prettier --check` with paths) for
ad-hoc staged checks; husky’s harness formatter runs on staged lib paths
automatically.

### Commit messages

Husky’s [`commit-msg`](../.husky/commit-msg) hook runs the Bun-native
`bun run commitlint --edit <file>` gate. It accepts the conventional form
`type(scope)!: subject`, the standard config-conventional type vocabulary, and
Git-generated merge, revert, fixup, squash, and amend messages.

```text
feat(factory): add color gradient context
fix!: remove the legacy wire
chore(Kalshi-bot): bump the nested product
```

The repository intentionally implements this small contract locally instead of
adding `@commitlint/*` and `bun-git-hooks`: Husky already owns `core.hooksPath`,
and the staged harness remains the only pre-commit owner.

DX inspection is built in:

```bash
bun run commitlint --print-config
bun run commitlint --edit .git/COMMIT_EDITMSG --json
```

Structured output reports the parsed type, scope, breaking-change state,
subject, ignore decision, and every validation error. `--edit=<path>` is also
accepted for compatibility with common commitlint invocations.

---

## Concept / vocabulary changes

Always (local or CI day-loop):

```bash
bun run test:concept
bun run quality:concept   # audit --strict + surface-coverage + SURFACE_COVERAGE.md --check
```

| Command                          | Role                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `bun run surface-coverage:map`   | Regenerate [`docs/SURFACE_COVERAGE.md`](SURFACE_COVERAGE.md) |
| `bun run surface-coverage:map:check` | Fail if the map doc is stale (ignores Generated timestamp) |
| `bun run quality:concept`        | Full concept-lane quality gate                               |

See also portal semantic contract in
[`portal-foundation.md`](portal-foundation.md) and the lifecycle map in
[`CONCEPT_LIFECYCLE.md`](CONCEPT_LIFECYCLE.md).

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

| Rule                                                                       | Why                                                                                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Never `tool > public/registry/foo.json` if the tool writes the path itself | Corrupts JSON with status lines (brand-keymap incident)                            |
| Prefer `chore(bake):` separate from source                                 | pre-commit mixed-lane warning                                                      |
| Proof taxonomy                                                             | `bun run verify:proof-taxonomy:save` → `public/registry/proof-taxonomy-audit.json` |

---

## Quick start

```bash
bun install                    # husky via prepare
bun run test:dev               # watch monorepo tests
# edit → commit (hooks run staged --changed)
bun run test:concept           # before concept PRs
bun run concept:audit --strict
```
