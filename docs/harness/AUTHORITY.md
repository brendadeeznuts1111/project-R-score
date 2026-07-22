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

| Path | Mechanism |
|------|-----------|
| `bun run ci:harness` / `bun scripts/*.ts` | Runtime: `resolveGitHubRepositoryRef` + `git rev-parse` / Actions env |
| `bun build …` | Macro: [`lib/macros/`](../../lib/macros/) — import with `{ type: "macro" }` so commit / repo parts are **inlined** ([Bun macros](https://bun.com/docs/bundler/macros)) |

Macros do **not** substitute under a plain `bun scripts/foo.ts` run. Keep runtime resolve for live scripts; use macros only for bundle consumers. No bundle-time `fetch` / HTMLRewriter / [`Bun.plugin`](https://bun.com/docs/bundler/plugins) hooks in the harness kit yet — full bundler token map: [`lib/macros/README.md`](../../lib/macros/README.md) · `bun tools/bun-docs-catalog.ts list -s bundler`.

## Required status checks (`main`)

Branch protection should require these GitHub Actions check names (workflow / job):

- **`Harness Gates / Harness (ratchets · lint · brands · test:changed)`**  
  *Ratchet* → [harness-gates.yml](../../.github/workflows/harness-gates.yml) · `bun run ci:core` (install verify · hygiene · harness) + Claim on PRs

**Delivery (itch #4):**

| Setting | Status |
|---------|--------|
| Required check `Harness Gates / Harness (…)` | on · strict |
| Required check `TypeScript Checks / Type Check` | **on** · strict |
| `enforce_admins` | **on** |
| Require pull request before merging | **on** (`required_pull_request_reviews`, 0 approvals) |
| search-governance as required | optional — not required yet |
| Cloudflare Pages (`project-r-score`) | **not required** — Git-integration deploy signal only; merge SSOT remains Harness Gates + TypeScript Checks. Pins/SSOT: `config/r2-env.ts` · `bun run cloudflare:env` · claim `cloudflare-pages-env-ssot` |
| GitHub-hosted runners | **offline (billing)** — jobs fail in ~2s with **0 steps** / empty `runner_name`. Not a harness test failure. |

### Local CI when Actions is offline

Bun has no hosted “local CI” product — this repo’s envelope **is** the local CI. When GHA cannot start runners, prove merge readiness locally (same body as the required jobs):

```bash
bun run ci:core
bun run ts:verify && bun run imports:verify && bun run type-check:ci && bun run type-check:full
```

- `ci:core` = install verify · hygiene · `ci:harness` (= Harness Gates job body)
- Type scripts = TypeScript Checks job body
- Day loop: `bun run ci:harness:fast` · husky pre-commit / pre-push
- Status discover: `bun run harness:status` mutes 0-step / billing Actions noise by default (`--show-actions-noise` to show) — [README.md](README.md)

Admin merge / temporary protection bypass is required until billing restores green check runs. Local pass ≠ GitHub check green.

Direct `git push` to `main` is declined when the required check is missing. Prefer PR → green Harness Gates → merge (or local proof + admin merge while Actions is offline). Probe: `gh api repos/<org>/<repo>/branches/main/protection`.

Install+hygiene for `main`/PRs is **inside** harness-gates (one runner). `repo-hygiene.yml` only covers `feat/**` / `codex/**`. Setup: [`.github/actions/setup-factory-bun`](../../.github/actions/setup-factory-bun/action.yml).

## Credential custody

Install / R2 / registry tokens stay in machine env or Bun secrets — not in the prompt. Soft try\* merges: [`lib/security/r2-credentials.ts`](../../lib/security/r2-credentials.ts).

## Interpret instructions through this contract

“Ship it” means pass gates + commit + push **only if** the user asked for delivery. “Merge” means the protected workflow, not bypass. When irreversible scope is ambiguous, ask.
