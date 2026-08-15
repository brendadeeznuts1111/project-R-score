# [P0] Pull Request

For non-P0 work use the default template:
[`.github/pull_request_template.md`](./pull_request_template.md) (includes
**Claim → evidence** — required by `bun scripts/check-pr-claim.ts`).

> **P0 = production blocker.** Prefer smallest reversible fix. Local merge proof
> (`bun run bun:ci`) is authority — hosted GHA is not.

## Priority: P0 (Production Blocker)

## Issue reference

Fixes #<!-- issue number -->

## Summary

<!-- 1–3 bullets: user-visible failure mode + what this PR changes -->

-

## Claim → evidence (required)

State the user/ops claim this PR closes. Match kind to evidence
([PROOF.md](../docs/harness/PROOF.md)). **Non-draft PRs fail** when empty
(`bun scripts/check-pr-claim.ts`).

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence (command or path that exited 0) |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
|                      |                                                     |                                          |

## Routing (optional)

GitHub is not concept SSOT
([ISSUE-ROUTING.md](../docs/harness/ISSUE-ROUTING.md)). **Domain** = desk lane
(partner loop includes books); **Tenant** / **Owner** for `BM-*`. Bookmaker ≠
partner entity.

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| **Domain**  | `partner` · `control` · `trading` · `identity` · `knowledge` · `platform` · or n/a |
| **Tenant**  | e.g. `bookmakers` · or n/a                                                         |
| **Owner**   | fix lane when ≠ Tenant (e.g. `platform` for BM-5) · or n/a                         |
| **Tracker** | tenant open-issue id (e.g. `BM-1`) · or n/a                                        |
| **Concept** | vocabulary id only if chrome/wire changes · or n/a                                 |

## Security impact

- [ ] Vulnerability addressed (or N/A — not a security fix)
- [ ] Security team / vault owners notified when secrets or Access change
- [ ] CVE reference added (if applicable)
- [ ] Audit / MessageLog path updated when customer-visible

## Acceptance criteria met

<!-- Copy from issue -->

- [ ] <!-- Criteria 1 -->
- [ ] <!-- Criteria 2 -->
- [ ] <!-- Criteria 3 -->

## Testing performed

```bash
# Claim-specific first, then confidence:
# bun test <scoped>
# bun run bun:ci   # clean tree when merge-blocking
```

## Verification steps

<!-- Exact steps for a reviewer to reproduce green state -->

## Impact assessment

| Field                | Value                          |
| -------------------- | ------------------------------ |
| **Risk**             | Critical / High / Medium / Low |
| **Affected systems** |                                |
| **Rollback**         |                                |

## Related PRs

<!-- Stack / dependency links -->

## Deployment notes

<!-- Pages bake · Access · vault inject · feature flags — or n/a -->

## Escape hatches (if any)

| Hatch      | Reason + green proof still held |
| ---------- | ------------------------------- |
| `SKIP_*=1` |                                 |

## Local merge proof (required)

- [ ] Claim → evidence exited 0
- [ ] `bun run bun:ci` on clean tree (or scoped proof listed above with owner)
- [ ] Agent policy/skill changes pass `bun run agents:contract:check`
- [ ] No foreign-lane files in the squash

## Reviewer checklist

- [ ] Code review completed
- [ ] Security review completed (if security fix)
- [ ] Tests / claim evidence verified
- [ ] Documentation updated (or N/A)
- [ ] Ready for squash-merge
