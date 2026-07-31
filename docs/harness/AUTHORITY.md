# Authority (capability ≠ permission)

Upstream thesis: [Maximize autonomy inside explicit authority](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/authority).

Capability (`bun run`, git, tools) is not a grant. Keep reversible work broad; stage consequential effects.

## Reversible (broad envelope)

Inspect, edit, type-check, test, format, lint staged files, local builds, draft commits **when asked**.

## Consequential (narrow grant)

- **`git commit`** — user asks to commit (or delivery rule after an explicit ship batch)
- **`git push` / PR** — user asks to push or open a PR; if the change touches a proof-claim owner, the PR body includes pasted output of that claim’s `freshRerun` ([`FRESH-RERUN.md`](FRESH-RERUN.md)).
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

## Main protection and proof

GitHub-hosted Actions are retired. Main protection keeps pull requests, linear
history, and resolved review threads; it does not require GitHub-hosted status
contexts. Merge-readiness proof is produced before push by the local harness.

**Delivery (itch #4):**

| Setting | Status |
|---------|--------|
| GitHub-hosted required checks | **off** |
| `enforce_admins` | **on** |
| Require pull request before merging | **on** (`required_pull_request_reviews`, 0 approvals) |
| search-governance as required | optional — not required yet |
| Cloudflare Pages (`project-r-score`) | **not required** — external Git-integration deploy signal only. Pins/SSOT: `config/r2-env.ts` · `bun run cloudflare:env` / `:assert-apex` · claim `cloudflare-pages-env-ssot` |
| GitHub-hosted runners | **not used** |
| Self-hosted Actions | manual cache prune only (`cache-lifecycle.yml`) |

### Local merge-readiness proof

The repository's Bun envelope is the merge-readiness proof:

```bash
bun run ci:core
bun run ts:verify && bun run imports:verify && bun run type-check:ci && bun run type-check:full
```

- `ci:core` = install verify · hygiene · `ci:harness`
- Type scripts = TypeScript proof
- Day loop: `bun run ci:harness:fast` · husky pre-commit / pre-push
- Status discover: `bun run harness:status` mutes 0-step / billing Actions noise by default (`--show-actions-noise` to show) — [README.md](README.md)

Direct `git push` to `main` remains outside the delivery contract. Prefer local
proof → PR → review-thread resolution → merge. Probe live governance with
`gh api repos/<org>/<repo>/rulesets`.

## Credential custody

Install / R2 / registry tokens stay in machine env or Bun secrets — not in the prompt. Soft try\* merges: [`lib/security/r2-credentials.ts`](../../lib/security/r2-credentials.ts).

## Interpret instructions through this contract

“Ship it” means pass gates + commit + push **only if** the user asked for delivery. “Merge” means the protected workflow, not bypass. When irreversible scope is ambiguous, ask.
