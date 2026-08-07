# Issue routing (domain · tracker · concept)

GitHub Issues are a **human queue**, not the concept or domain graph.

| Field | When to fill | SSOT lives in |
|-------|--------------|---------------|
| **Domain** | Almost always on portal/product tickets | Chrome `domainLanes` · [partner-domain-map.md](tenants/partner-domain-map.md) |
| **Tracker** | Residual product gaps with a tenant id | e.g. [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) (`BM-*`) |
| **Concept** | Only when vocabulary / wire chrome changes | `semantic-vocabulary` · `concept:audit --strict` · [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md) |

## Domain values (chrome lanes)

`partner` · `control` · `trading` · `identity` · `knowledge` · `platform`

## Do not

- Invent concept ids on issues without a vocabulary PR
- Treat issue labels as glossary SSOT
- Invent bookmaker registry ids for unmatched desk labels (e.g. Orange777) without domain

## Templates

| Template | Path |
|----------|------|
| Portal gap | [`.github/ISSUE_TEMPLATE/portal-gap.md`](../../.github/ISSUE_TEMPLATE/portal-gap.md) |
| Bookmakers catalog | [`.github/ISSUE_TEMPLATE/bookmakers-catalog.md`](../../.github/ISSUE_TEMPLATE/bookmakers-catalog.md) |
| Default PR | [`.github/pull_request_template.md`](../../.github/pull_request_template.md) — Claim → evidence required; optional sections `n/a` |
| P0 PR | [`.github/pull_request_template_p0.md`](../../.github/pull_request_template_p0.md) — production blocker; same claim table |

P0 issue templates share a short **Routing** block (Domain · Tracker · Concept) for
filters only — security/arch labels stay as-is.

## Agents

When opening or triaging a ticket:

1. Set **Domain** from chrome lanes (or `platform` for harness-only).
2. Set **Tracker** when closing a tenant residual (`BM-*`, etc.).
3. Set **Concept** only if vocabulary/wire chrome moves — then `concept:audit --strict`.
4. Prove the fix with **Claim → evidence** on the PR, not by closing the issue alone.
5. When naming a Reasonix session rename or quarantine/scratch artifact, use
   **session archive lane** from
   [`naming-grammar.md`](../organization/naming-grammar.md) — do not reuse the
   issue **Domain** field as the filename `<lane>`. Homonyms:
   [`workspace-lane-cross-map.md`](tenants/workspace-lane-cross-map.md).

## Resolved backlog (close when still open on GitHub)

These landed on `main` before their GitHub issues were closed. Prefer
`Closes #N` on the closing PR over silent archive.

| Issue | Claim | Evidence |
| ----- | ----- | -------- |
| [#237](https://github.com/brendadeeznuts1111/project-R-score/issues/237)–[#241](https://github.com/brendadeeznuts1111/project-R-score/issues/241) | GitHub issue taxonomy spine | [`tenants/github-issue-taxonomy.md`](tenants/github-issue-taxonomy.md) · `bun run github-issue-taxonomy:check` |
| [#235](https://github.com/brendadeeznuts1111/project-R-score/issues/235) | Ephemeral `Bun.serve`/`Bun.listen` port:0 retry under parallel fixtures | [#528](https://github.com/brendadeeznuts1111/project-R-score/pull/528) · `bun test tests/harness-utilities.test.ts` |
| [#159](https://github.com/brendadeeznuts1111/project-R-score/issues/159) | `tests/tsconfig.snapshot.json` committed fixture | `git ls-files tests/tsconfig.snapshot.json` · `bun test tests/tsconfig-bun-types.test.ts` |
| [#4](https://github.com/brendadeeznuts1111/project-R-score/issues/4) | OWASP-aligned `Bun.password` Factory defaults | [`lib/security/password-hash.ts`](../../lib/security/password-hash.ts) · `bun test tests/fixtures/security-hash/password/` |

Still open by design: Phase 1 [#284](https://github.com/brendadeeznuts1111/project-R-score/issues/284) / [#285](https://github.com/brendadeeznuts1111/project-R-score/issues/285); dashboard flake [#23](https://github.com/brendadeeznuts1111/project-R-score/issues/23).
