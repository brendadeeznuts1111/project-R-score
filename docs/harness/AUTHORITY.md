# Authority (capability ≠ permission)

Upstream thesis: [Maximize autonomy inside explicit authority](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/authority).

Capability (`bun run`, git, tools) is not a grant. Keep reversible work broad; stage consequential effects.

## Reversible (broad envelope)

Inspect, edit, type-check, test, format, lint staged files, local builds, draft commits **when asked**.

## Consequential (narrow grant)

| Effect | Grant required |
|--------|----------------|
| `git commit` | User asks to commit (or delivery rule after an explicit ship batch) |
| `git push` / PR | User asks to push or open a PR |
| `--force` / history rewrite | Explicit user request; never force-push `main` without warning |
| Skip hooks (`--no-verify`) | Explicit user request only |
| Secrets / credentials in trajectory | Prefer ambient sidecar / env already loaded; do not paste keys into chat or commit `.env` |
| Production deploy / cutover | Separate approve after canary/prep evidence |
| Sweep another agent’s dirty tree | Forbidden — claim a **lane** first |

## Parallel lanes

Before editing: `git status`. Own disjoint paths. Never stage `projects/active/utilities/proton-pass/**` or other foreign WIP into an unrelated commit. Name the lane split in the commit message when relevant.

## Remotes

- `origin` → this monorepo (default push)
- `cascade` → separate project — not the default push target

## Required status checks (`main`)

Branch protection should require these GitHub Actions check names (workflow / job):

| Check | Workflow |
|-------|----------|
| `Harness Gates / Harness (install · lint · brands · spine smokes)` | [harness-gates.yml](../../.github/workflows/harness-gates.yml) |
| `Repo Hygiene / hygiene` | [repo-hygiene.yml](../../.github/workflows/repo-hygiene.yml) |
| `PR Claim Evidence / Claim → evidence` | [pr-claim.yml](../../.github/workflows/pr-claim.yml) |

Applied on `main` (2026-07-21): those three contexts, `strict` up-to-date, force-push off. Re-apply via Settings → Branches or `gh api` if contexts drift after workflow renames. Without required checks the ratchet is social only.

## Credential custody

Install / R2 / registry tokens stay in machine env or Bun secrets — not in the prompt. Soft try\* merges: [`lib/security/r2-credentials.ts`](../../lib/security/r2-credentials.ts).

## Interpret instructions through this contract

“Ship it” means pass gates + commit + push **only if** the user asked for delivery. “Merge” means the protected workflow, not bypass. When irreversible scope is ambiguous, ask.
