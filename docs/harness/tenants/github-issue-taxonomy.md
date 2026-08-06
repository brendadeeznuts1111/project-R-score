# Tenant: GitHub issue taxonomy

**Tenant** `github-issue-taxonomy`

**Domain authority** [`config/github-issue-taxonomy.ts`](../../../config/github-issue-taxonomy.ts)

**Wire boundary** [`lib/github-issue-taxonomy-wire.ts`](../../../lib/github-issue-taxonomy-wire.ts)

**Parent** [#237](https://github.com/brendadeeznuts1111/project-R-score/issues/237)

Repository-governed metadata for FactoryWager GitHub issues. GitHub labels are
a mutable provider projection; the semantic dimensions, legal values, label
descriptions, GitHub hexes, and canonical color keys live in the repository.
This tenant does not make GitHub Issues the concept or domain graph.

## Phase ownership

| Phase | Issue | Status after this slice |
|---|---|---|
| Typed taxonomy + parse-once spine | [#238](https://github.com/brendadeeznuts1111/project-R-score/issues/238) | implemented |
| Form, doctor, audit, label synchronization | [#239](https://github.com/brendadeeznuts1111/project-R-score/issues/239) | not implemented |
| Deterministic public registry bake | [#240](https://github.com/brendadeeznuts1111/project-R-score/issues/240) | not implemented |
| Static portal consumer | [#241](https://github.com/brendadeeznuts1111/project-R-score/issues/241) | not implemented |

Do not add `/registry/github-issue-taxonomy.json` or `/portal/issues/` until the
preceding phase owns its verifier and drift contract.

## Domain contract

- Schema: `factorywager.issue-spine.v1`
- Required dimensions: type · priority · plane · runtime · team · status
- Optional label-only facets: urgency · concern
- GitHub issue numbers are positive-integer nominal values.
- Artifact IDs, optional concept IDs, label keys/names, and every dimension
  value remain branded after the boundary.
- `p0` is reserved for bug/incident work; bugs enter active, blocked, or done.
- GitHub color hex is a provider projection; `colorKey` is the repository
  semantic color authority.

## Boundary

`parseGithubIssueSpine(unknown)` is the only untrusted-object entrypoint. It
parses every required value once, applies legal-combination rules, and returns
`GithubIssueSpine`. Interior code must not re-decode that object.

`githubIssueSpineToWire` is the explicit serialization edge. It strips brands
without leaking GitHub credentials or resolving mutable provider state.

## Proof

```bash
bun tools/brand-manifest.ts
bun test tests/branded-catalog.test.ts tests/github-issue-taxonomy.test.ts
bun run check:brands:all
bun run type-check
bun run bun:ci
```

Fixtures #235 and #236 prove that current harness defects can enter the schema
without inventing a concept ID where the issue has none.

**Owner** `// owner: platform / governance`
