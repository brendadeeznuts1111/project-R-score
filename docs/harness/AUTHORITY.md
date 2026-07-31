# Authority (capability ≠ permission)

Upstream thesis: [Maximize autonomy inside explicit authority](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/authority).

Capability (`bun run`, git, tools) is not a grant. Keep reversible work broad; stage consequential effects.

## Reversible (broad envelope)

Inspect, edit, type-check, test, format, lint staged files, local builds, draft commits **when asked**.

## Consequential (narrow grant)

- **`git commit`** — user asks to commit (or delivery rule after an explicit ship batch)
- **`git push` / PR** — user asks to push or open a PR; if the change touches a proof-claim owner, the PR body includes pasted output of that claim’s `freshRerun` ([`FRESH-RERUN.md`](FRESH-RERUN.md)). Non-draft PRs: after **2026-07-28 UTC**, empty Claim→evidence tables fail Harness Gates (`check-pr-claim.ts`); drafts stay skipped. Rollback if false positives: extend `WARN_UNTIL_ISO`, do not drop the invariant.
- **`--force` / history rewrite** — explicit user request; never force-push `main` without warning
- **Skip hooks (`--no-verify`)** — explicit user request only
- **Secrets / credentials in trajectory** — prefer ambient sidecar / env already loaded; do not paste keys into chat or commit `.env`
- **Production deploy / cutover** — separate approve after canary/prep evidence
- **Sweep another agent’s dirty tree** — forbidden — claim a **lane** first

## Parallel lanes

Before editing: `git status`. Own disjoint paths. Never stage `projects/active/utilities/proton-pass/**` or other foreign WIP into an unrelated commit. Name the lane split in the commit message when relevant.

## Remotes

- `origin` → this monorepo (default push)
- `cascade` → separate project — not the default push target

## GitHub context

Interior identity is **owner / name / host / remote slot**, not a single `REPO_URL`. Resolve via [`lib/github-repository-ref.ts`](../../lib/github-repository-ref.ts): Actions `GITHUB_REPOSITORY` (+ `GITHUB_REPOSITORY_OWNER`, `GITHUB_SERVER_URL`) → `git remote get-url` → [`CANONICAL_REMOTES`](../../lib/docs/repo-docs.ts). Derive `https://…` only at the link edge (`htmlUrl` / `treeUrl` / `commitUrl`). Garbage Actions or unparseable git remotes **fail loud** — never silent hardcode disguised as env.

Bun create envs (`GITHUB_TOKEN`, `GITHUB_ACCESS_TOKEN`, `GITHUB_API_DOMAIN`) are **create-auth / API host** only — not repository identity. Prefer Actions `GITHUB_REPOSITORY*` on CI. Do not invent a novel env zoo in UNIFIED; Actions wire + Bun create tables are enough.

### Bundle-time vs runtime

| Path | Mechanism | Repo docs | Bun docs | Other external |
|------|-----------|-----------|----------|----------------|
| `bun run ci:harness` / `bun scripts/*.ts` | Runtime: `resolveGitHubRepositoryRef` + `git rev-parse` / Actions env | [`lib/github-repository-ref.ts`](../../lib/github-repository-ref.ts) · [`CANONICAL_REMOTES`](../../lib/docs/repo-docs.ts) | [Bun.env](https://bun.com/docs/runtime/utils#bun-env) · [spawnSync](https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync) | GitHub Actions `GITHUB_REPOSITORY*` |
| `bun build …` | Macro inline `{ type: "macro" }` for commit / repo parts | [`lib/macros/`](../../lib/macros/) · [`lib/macros/README.md`](../../lib/macros/README.md) · `bun tools/bun-doc-refs.ts bundler` | [macros](https://bun.com/docs/bundler/macros) · [serializability](https://bun.com/docs/bundler/macros#serializability) · [bundler](https://bun.com/docs/bundler/index) · [plugins](https://bun.com/docs/bundler/plugins) (unused here) | — |

Macros do **not** substitute under a plain `bun scripts/foo.ts` run. Keep runtime resolve for live scripts; use macros only for bundle consumers. Full lib map: [`PROOF.md` Lib surface](PROOF.md#lib-surface--docs-vs-bun-vs-other-external).

## Local CI authority (`main`)

GitHub Actions is disabled for this repository. Hosted-runner billing locks jobs
before step 1, so a GitHub check cannot prove artifact health and must never be
a merge dependency. The canonical merge proof runs on the operator machine:

```bash
bun run bun:ci
```

`bun:ci` composes the former hosted boundaries: `ci:core`, TypeScript config and
both type-check scopes, dependency/security audits, and portal/registry
isolation. It loads the machine's existing `~/.reasonix/.env`, applies the
non-secret registry bucket default, and installs the nested registry workspace
with its frozen lockfile. A passing local command is the merge authority. When
an open, disjoint lane owns an existing failure, the commit must record the
failing command, exact evidence, and owning lane; GitHub status is never a
substitute for that local evidence.

**Delivery:**

| Setting | Status |
|---------|--------|
| GitHub Actions | **disabled** at repository level; retained workflow YAML is reference-only |
| Required hosted status checks | **none** |
| Local merge proof | `bun run bun:ci` |
| Require pull request before merging | **on** (`required_pull_request_reviews`, 0 approvals) |
| Review-thread resolution | **on** |
| Linear history / no force-push | **on** |
| Cloudflare Pages (`project-r-score`) | External Git integration remains the deploy signal; it does not depend on GitHub Actions. Pins/SSOT: `config/r2-env.ts` · `bun run cloudflare:env` / `:assert-apex` · claim `cloudflare-pages-env-ssot` |

### Local operate loop

- `bun:ci` = complete merge proof; run before every merge.
- `ci:core` = install verify · hygiene · `ci:harness`.
- `ci:types` = config/import verification plus CI and full type scopes.
- `ci:security` = dependency guard plus security audit.
- `ci:portal-registry` = isolated writer tests plus clean-public-tree proof.
- Day loop: `bun run ci:harness:fast` · husky pre-commit / pre-push
- Status discover: `bun run harness:status`; hosted Actions state is not merge evidence.
- Main governance still requires a PR, resolved review threads, linear history,
  and non-destructive updates. Probe: `gh api repos/<org>/<repo>/rulesets`.

Workflow YAML under `.github/workflows/` is retained as historical/executable
reference only. Do not re-enable GitHub Actions or add hosted required checks;
extend `bun:ci` when a new merge boundary is needed.

## Credential custody

Install / R2 / registry tokens stay in machine env or Bun secrets — not in the prompt. Soft try\* merges: [`lib/security/r2-credentials.ts`](../../lib/security/r2-credentials.ts).

## Interpret instructions through this contract

“Ship it” means pass gates + commit + push **only if** the user asked for delivery. “Merge” means the protected workflow, not bypass. When irreversible scope is ambiguous, ask.
