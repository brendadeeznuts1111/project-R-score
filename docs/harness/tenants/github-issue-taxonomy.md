# Tenant: GitHub issue taxonomy

**Tenant** `github-issue-taxonomy`

**Domain authority**
[`config/github-issue-taxonomy.ts`](../../../config/github-issue-taxonomy.ts)

**Wire boundary**
[`lib/github-issue-taxonomy-wire.ts`](../../../lib/github-issue-taxonomy-wire.ts)

**Parent**
[#237](https://github.com/brendadeeznuts1111/project-R-score/issues/237)

Repository-governed metadata for FactoryWager GitHub issues. GitHub labels are a
mutable provider projection; the semantic dimensions, legal values, label
descriptions, GitHub hexes, and canonical color keys live in the repository.
This tenant does not make GitHub Issues the concept or domain graph.

## Phase ownership

| Phase                                      | Issue                                                                    | Status after this slice |
| ------------------------------------------ | ------------------------------------------------------------------------ | ----------------------- |
| Typed taxonomy + parse-once spine          | [#238](https://github.com/brendadeeznuts1111/project-R-score/issues/238) | implemented             |
| Form, doctor, audit, label synchronization | [#239](https://github.com/brendadeeznuts1111/project-R-score/issues/239) | implemented             |
| Deterministic public registry bake         | [#240](https://github.com/brendadeeznuts1111/project-R-score/issues/240) | implemented             |
| Static portal consumer                     | [#241](https://github.com/brendadeeznuts1111/project-R-score/issues/241) | not implemented         |

Do not add `/portal/issues/` until the preceding public artifact phase owns its
verifier and drift contract.

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

## Local tooling

The general harness issue form emits a fenced JSON spine. The wire boundary also
accepts the earlier HTML-comment block during migration. The audit is read-only
and checks parse failures, title priority/plane compatibility, required label
parity, conflicting labels, and unknown provider labels.

```bash
bun run issues:audit -- --issue=235,236
bun run issues:sync-labels -- --dry-run
bun run issues:sync-labels:write -- --confirm=brendadeeznuts1111/project-R-score
```

Label synchronization never deletes labels. Dry-run is the default at the tool
boundary; writes require `--write`, the exact `owner/name` confirmation, and an
ambient GitHub token. `PORT` and `BUN_PORT` are server bind inputs and are not
read by this client-only tool; an explicit `--api-url` controls test or GitHub
Enterprise endpoints.

The specialized P0 Markdown templates remain valid legacy entrypoints. They are
not silently rewritten into the general form.

## Public registry projection

`/registry/github-issue-taxonomy.json` is a credential-free, byte-deterministic
projection of the repository SSOT. It includes every semantic dimension and
legal value, provider label name/description/hex, resolved partner-ops color
token/hex, authority links, local audit health, and a SHA-256 source hash. It
contains no GitHub token, issue body, or mutable provider response.

```bash
bun run github-issue-taxonomy:bake
bun run github-issue-taxonomy:check
```

The check parses unknown JSON at `lib/github-issue-taxonomy-public-wire.ts`,
rejects duplicate or unresolvable rows, then requires exact SSOT and
serialized-byte parity. The artifact is wired through `registry-index.md`,
`wiki-index.md`, portal weave, and the bake manifest priority inventory.
`bake:all` runs it before the final manifest.

## Proof

```bash
bun tools/brand-manifest.ts
bun test tests/branded-catalog.test.ts tests/github-issue-taxonomy.test.ts
bun test tests/github-issue-tooling.test.ts
bun test tests/github-issue-taxonomy-public.test.ts
bun run github-issue-taxonomy:check
bun run check:brands:all
bun run type-check
bun run bun:ci
```

Fixtures #235 and #236 prove that current harness defects can enter the schema
without inventing a concept ID where the issue has none.

**Owner** `// owner: platform / governance`
