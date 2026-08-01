# Fresh-rerun contract

## Claim

When a harness change is proposed that touches a proof claim’s owner, there is a re-run of that claim in an environment that has not inherited help from the proposing conversation.

## Invariant

Every entry in `CRITICAL_PROOF_PATHS` (`lib/harness/proof.ts`) has a **`freshRerun`** command. Before merging a change that touches that claim’s owner file, run that command and **paste the terminal output into the PR body**.

No new tooling. Reviewer does not approve without that output.

## Evidence

- **`lib/harness/proof.ts`** — `freshRerun` on each path  
  *Ratchet* → `bun test tests/harness-fresh-rerun-contract.test.ts`
- **PR body** — pasted stdout/stderr of the claim’s `freshRerun`  
  *Ratchet* → human review (AUTHORITY / improve-harness)
- **Discover** — `bun run harness:status` · `bun run docs:fresh-rerun`

## Improve-harness loop

`observe → earliest handoff → smallest fix → verify → **fresh rerun** → retain|revise|remove`

The fresh-rerun step is what makes retain/revise/remove evidence-based. Lessons in [`FEEDBACK.md`](FEEDBACK.md) still require a fresh rerun of the affected claim.

## Three catalogs (same noun, different jobs)

| Catalog | Field | What exit 0 / paste proves |
|---------|-------|----------------------------|
| `ProofPath` (`CRITICAL_PROOF_PATHS`) | `freshRerun` + `freshRerunKind` | `claim` → behavioral re-proof; `catalog` → catalog/doc presence |
| `TenantRunbook` (spine) | `freshRerun` | Runbook/doc render (`docs:tenant-*`); linked `proofId` has the real claim command |
| `CiRunbook` (CI/deploy) | `freshRerun` | Catalog/doc render (`docs:ci-deploy`) |

Spine **splits** doc-rerun vs proof-rerun (`TenantRunbook.freshRerun` ≠ linked `ProofPath.freshRerun`). CI/deploy **children** set `freshRerunKind: 'catalog'` and `freshRerun` = `bun run docs:ci-deploy` — that paste proves **catalog presence**, not that `ci:core` / deploy ran. Intervention stays on `CiRunbook` (must not equal the catalog paste); fail-closed coverage is parent claim `ci-deploy-runbooks` (`bun run test:ci-deploy`).

### Id skew (intentional — do not “fix” by renaming casually)

| Surface | Key | Notes |
|---------|-----|-------|
| ProofPath | `install-verify` | Workspace install journey (`ci:core`) |
| Spine tenant | `install-verify` | Points at proof `install-verify-journey` (different claim) |
| CiRunbook.id | e.g. `ci-core` | ≠ ProofPath id `ci-core-envelope` — link via `proofId` |
| Code-quality | `types-covered` → `lib-docs-typecheck` | Sibling typecheck islands share `type-check` but are not CQ tenants |

Non-draft PRs: after **2026-07-28 UTC**, empty Claim→evidence tables fail CI (`scripts/check-pr-claim.ts`). Drafts stay skipped. Rollback if false positives: extend `WARN_UNTIL_ISO`, do not delete the invariant.

**Soft paste tip:** if the PR body mentions a proof id in backticks (`` `branded-ids` ``), `check-pr-claim` warns when that claim’s `freshRerun` command string is absent from the body. Soft only — does not fail CI.

**Color kernel:** when the change set touches theme/kernel owners (`lib/portal/color-kernel-paths.ts`), paste a **success** `bun run validate:colors` under **Color Kernel Evidence** (`Claim: Color kernel theme-dark aliases are complete and conflict-free…`). `check-pr-claim` soft-warns if that slot is still the template stub or shows an inconsistent Claim. CI always runs `validate:colors:strict` via `test:colors`. Fresh-rerun for claim `color-kernel-theme-aliases` is `bun run test:colors`.

## Lookup

```bash
bun run docs:fresh-rerun
bun run harness:status   # each proof path lists *Fresh-rerun* → …
```

Upstream: [Prove the outcome](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof) · [Improve one harnessed job](https://github.com/lopopolo/harness-engineering/blob/trunk/playbooks/improve-harness.md).
