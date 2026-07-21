# Authority (capability ≠ permission)

Upstream thesis: [Maximize autonomy inside explicit authority](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/authority).

Capability (`bun run`, git, tools) is not a grant. Keep reversible work broad; stage consequential effects.

## Reversible (broad envelope)

Inspect, edit, type-check, test, format, lint staged files, local builds, draft commits **when asked**.

## Consequential (narrow grant)

- **`git commit`** — user asks to commit (or delivery rule after an explicit ship batch)
- **`git push` / PR** — user asks to push or open a PR; if the change touches a proof-claim owner, the PR body includes pasted output of that claim’s `freshRerun` ([`FRESH-RERUN.md`](FRESH-RERUN.md))
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

## Required status checks (`main`)

Branch protection should require these GitHub Actions check names (workflow / job):

- **`Harness Gates / Harness (ratchets · lint · brands · test:changed)`**  
  *Ratchet* → [harness-gates.yml](../../.github/workflows/harness-gates.yml) · `bun run ci:core` (install verify · hygiene · harness) + Claim on PRs

Install+hygiene for `main`/PRs is **inside** harness-gates (one runner). `repo-hygiene.yml` only covers `feat/**` / `codex/**`. Setup: [`.github/actions/setup-factory-bun`](../../.github/actions/setup-factory-bun/action.yml). Re-apply via Settings → Branches or `gh api` if the job name drifts.

## Credential custody

Install / R2 / registry tokens stay in machine env or Bun secrets — not in the prompt. Soft try\* merges: [`lib/security/r2-credentials.ts`](../../lib/security/r2-credentials.ts).

## Interpret instructions through this contract

“Ship it” means pass gates + commit + push **only if** the user asked for delivery. “Merge” means the protected workflow, not bypass. When irreversible scope is ambiguous, ask.
