# Pull Request

<!--
  FactoryWager PR body — start from this file (agents: do not invent HEREDOC stubs).

  Authority: local merge proof only (bun run bun:ci). Hosted GHA is not merge authority.
  See docs/harness/AUTHORITY.md · docs/harness/PROOF.md · docs/harness/REVIEW.md

  Fill rule:
  - Complete **required** sections (Summary · Claim → evidence · Test plan · Checklist · Local merge proof).
  - Optional sections: write `n/a` on the first line when not applicable — keep the heading
    (routing / claim scanners and agents rely on stable section titles).
  - Prefer short, scannable bullets over essays.
-->

> **Local authority** · GHA is side-signal only · Squash-merge + delete branch · Prefer claim-scoped commands over full suite when the change is narrow

## Summary

<!-- 1–3 bullets: *why* this change exists (user/ops outcome), not a file list -->

-

## Claim → evidence

State the user/ops claim this PR closes. Match **kind** to evidence
([PROOF.md](../docs/harness/PROOF.md)). **Non-draft PRs fail** when this table
has no filled row (`bun scripts/check-pr-claim.ts`).

| Kind | Means |
| ---- | ----- |
| `unit` | Pure code/type/gate property (tests, checkers, types) |
| `boundary` | Wire/edge parse or adapter contract |
| `journey` | Multi-step operator or install path |
| `deployed` | Live surface / Pages / remote probe |

Kinds may be joined with `+` (e.g. `unit+boundary`).

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence (command or path that exited 0) |
| -------------------- | --------------------------------------------------- | ---------------------------------------- |
|                      |                                                     |                                          |

<!-- Example (replace the blank row — do not leave both):
| Terminal markdown uses Bun native ANSI | unit | `bun test tests/bun-markdown-ansi.test.ts` |
| bun-types inventory harvests enum members | unit | `bun test tests/bun-types-inventory.test.ts` · `bun run bun:types-inventory:check` |
-->

Install/layout owners touched → also `bun run proof:install`.
If you mention a CRITICAL_PROOF_PATHS id in the body, paste that claim’s
freshRerun command too ([FRESH-RERUN.md](../docs/harness/FRESH-RERUN.md)).

## Lane / routing

Optional human queue fields. GitHub is **not** concept SSOT
([ISSUE-ROUTING.md](../docs/harness/ISSUE-ROUTING.md)).

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| **Domain**  | `partner` · `control` · `trading` · `identity` · `knowledge` · `platform` · or n/a |
| **Tracker** | e.g. `BM-1` · link to `*-open-issues.md` · or n/a                                  |
| **Concept** | glossary id only if vocabulary changed · or n/a                                    |
| **Lane**    | worktree / branch purpose (e.g. `feat/console-depth-doc-refs`) · or n/a            |

## Portal / partner-domain

Fill when this PR touches portal boards, partner glossary, Soft/Factory domain
map, or partner-surface inventory. Otherwise: **n/a**.

| Surface          | Path / doc                                                             | Touched? |
| ---------------- | ---------------------------------------------------------------------- | -------- |
| Board slug       | `/portal/<slug>/` · `PORTAL_BOARD_SLUGS`                               |          |
| Registry bake    | `/registry/<artifact>.json`                                            |          |
| Partner domain   | [partner-domain-map.md](../docs/harness/tenants/partner-domain-map.md) |          |
| Soft handshake   | [soft-handshake.md](../docs/design/soft-handshake.md)                  |          |
| Partner-surface  | [partner-surface-inventory.md](../docs/design/partner-surface-inventory.md) |          |

- [ ] Board · route · chrome · page-concepts stay synced (if board added/removed)
- [ ] Glossary / partners-ops bake checked when overlay concepts moved
- [ ] If **Concept** filled: `bun run concept:audit --strict` green
- [ ] If **Tracker** filled: mark acceptance on the tenant open-issues doc in this PR

## Harness / Bun tooling

Fill when this PR changes brands, wire boundary, console-depth, bun-types
inventory, doc refs, or pre-commit gates. Otherwise: **n/a**.

| Surface | Doc / command | Touched? |
| ------- | ------------- | -------- |
| Branded IDs | [`lib/types/branded/README.md`](../lib/types/branded/README.md) · `bun run check:brands` | |
| Wire boundary | [`docs/WIRE_BOUNDARY.md`](../docs/WIRE_BOUNDARY.md) · `// brand-ok` / `// wire-ok` | |
| Console depth | [object inspection depth](https://bun.com/docs/runtime/console#object-inspection-depth) · [`lib/console-depth.md`](../lib/console-depth.md) | |
| Bun-types inventory | [`docs/design/bun-types-inventory.md`](../docs/design/bun-types-inventory.md) · `bun:types-inventory:check` · tip-diff | |
| Doc refs (`@see`) | `bun tools/bun-doc-refs.ts check` / `annotate --write` | |
| Console format gate | `lib/console-format-scan.ts` · `// console-ok` | |

- [ ] Staged brand check green (`--staged --strict`) when `*Id` fields change
- [ ] Inventory/artifacts regenerated when pin or parser changes (`:write` + `:check`)
- [ ] Tip-diff local ok when bun-types surface moves (`bun:types-inventory:tip-diff:local`)

## Artifact publish

Fill when publishing or rebaking a registry package (bookmakers, factory libs,
ops snapshot). Otherwise: **n/a**.

| Step              | Command / note                                          |
| ----------------- | ------------------------------------------------------- |
| Package + version | e.g. `@factorywager/bookmakers@0.4.x`                   |
| Publish           | `bun run factory:publish …` or package-specific prepare |
| Snapshot / bake   | `factory snapshot` · `bookmakers:bake` · `ops:snapshot` |
| Pages mirror      | committed under `public/registry/` (ops never on Pages) |

- [ ] Public artifact has no secrets (`restBaseUrl`, `apiKeyEnv`, `envVars`, balance/health)
- [ ] Ops plane (if any) stays under `artifact-registry/…/ops/` only

## Naming (v0.4 bookmakers / public catalog)

Required when editing bookmaker registry rows or the public catalog shape.
Tenant: [bookmakers-registry.md](../docs/harness/tenants/bookmakers-registry.md).
Otherwise: **n/a**.

| Field         | Rule                                                                |
| ------------- | ------------------------------------------------------------------- |
| `id` / `slug` | **`id === slug`** (route primary key; no UUID)                      |
| `fetcher`     | `rest` \| `webview` \| `seat` (not `fetcherType`)                   |
| `sports`      | array of sport keys (not `supportedSports`)                         |
| `urls.web`    | primary public URL under `urls.{ web, api, limitsPage, termsPage }` |

- [ ] Public rows use v0.4 names (`fetcher`, `sports`, `urls.web`)
- [ ] `id === slug` on every row touched
- [ ] `bun run bookmakers:bake:check` (or migrate + board tests) when catalog changed

## Concept-lane proof

When vocabulary / boards / limit-row wire change. Map:
[CONCEPT_LIFECYCLE.md](../docs/CONCEPT_LIFECYCLE.md). Otherwise: **n/a**.

| Claim                        | Kind | Evidence                                                       |
| ---------------------------- | ---- | -------------------------------------------------------------- |
| Concept audit passes         | unit | `bun run concept:audit --strict`                               |
| Surface coverage passes      | unit | `bun run validate:surface-coverage`                            |
| Wire enums valid/invalid     | unit | `bun test tests/limit-row-wire.test.ts`                        |
| Board slug registered        | unit | `PORTAL_BOARD_SLUGS` + `public/portal/<slug>/` + page-concepts |
| Deprecation has `replacedBy` | unit | vocabulary + consumers retargeted                              |
| Glossary bake current        | unit | `bun run glossary:portal:check`                                |

### Concept-lane gates

- [ ] `concept:audit --strict` · `validate:surface-coverage` (allowlist warnings OK)
- [ ] Wire field change → `tests/limit-row-wire.test.ts`
- [ ] Board add/remove → slugs, page-concepts, public-routes, `_redirects`, `public/portal/<slug>/`
- [ ] Deprecate → `replacedBy` + successor bound in surface maps / HTML

## Fresh-rerun paste

Required when this PR moves an owner of a
[`CRITICAL_PROOF_PATHS`](../lib/harness/proof.ts) claim. Lookup:
`bun run docs:fresh-rerun` · [FRESH-RERUN.md](../docs/harness/FRESH-RERUN.md).
Soft tip: if the body mentions a proof id in backticks, include that claim’s
`freshRerun` command too.

```text
# paste fresh-rerun / claim re-proof output here
```

## Color Kernel

When touching `theme.jsonc`, kernel palettes, or `claim-reporter` /
`color-kernel-align`
([`color-kernel-paths.ts`](../lib/portal/color-kernel-paths.ts)). CI always runs
`validate:colors:strict` via `test:colors` (claim id color-kernel-theme-aliases).
Otherwise: **n/a**.

- [ ] `bun run validate:colors` (or `:strict`) exits 0
- [ ] Extended keys left intentional (not forced onto theme SSOT)

### Color Kernel Evidence

```text
# paste: bun run validate:colors
# expect: Claim: Color kernel theme-dark aliases are complete and conflict-free (theme v…).
```

## Escape hatches used (if any)

Only when a commit set `SKIP_*=1`. Policy:
[DEVELOPMENT-WORKFLOW.md](../docs/DEVELOPMENT-WORKFLOW.md#escape-hatches).
Otherwise: **n/a**.

| Hatch | Reason + local proof that still passed |
| ----- | -------------------------------------- |
| `SKIP_TEST_CHANGED=1` | |
| `SKIP_QUALITY_CONCEPT=1` | |
| `SKIP_GITLEAKS=1` | |
| `SKIP_WIRE_LINT=1` | |
| `SKIP_DOMAIN_LINT=1` | |
| `SKIP_BUN_TYPES_CI=1` / `BUN_TYPES_CI=0` | |

- [ ] Every `SKIP_*` used is listed with **owner path + green command evidence**
- [ ] Message does not hide foreign-lane failures as “ours”

## Checklist

- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out of commit)
- [ ] Explicit pathspec commit when index is multi-lane
- [ ] Prettier on every touched `lib/**/*.ts`
      (`bun x prettier --write <file...>` or `format:harness`)
- [ ] Brands / wire: no new bare `*Id: string` or interior `unknown` params
- [ ] If adding/removing a first-level `lib/*/` **domain**: update
      [`lib/README.md`](../lib/README.md) Domains table + lifecycle ·
      `bun run lib:domains:check`
- [ ] Docs/JIT updated only when an owner moved (`docs/harness/`, `repo-docs`,
      AGENTS)
- [ ] Concept lifecycle / agents tenant docs updated when vocabulary or wire
      contract moved
- [ ] If spine touched: `bun run type-check` (`tsconfig.check.json`)
- [ ] Any `SKIP_*` escape justified above (or N/A)
- [ ] **Open issues closed** (optional): linked issues resolved — list `#…` or N/A

## Local merge proof (required — GHA is not merge authority)

Operator machine / clean worktree. Policy:
[`docs/harness/AUTHORITY.md`](../docs/harness/AUTHORITY.md) (**Local CI
authority**). Hosted checks (Pages, Socket, bot review) are side signals — never
a substitute.

- [ ] Claim → evidence commands exited 0 (prefer over full suite when scoped)
- [ ] `bun run lint:bun-native:changed` (or `check:harness` when rolling out
      harness paths)
- [ ] If merge-blocking confidence needed: `bun run bun:ci` on a **clean** tree
- [ ] Soft bun-types step ok or skipped with reason (`bun:types-ci` ·
      `BUN_TYPES_CI=0`)
- [ ] Remaining `node:fs` / `node:url` / `node:zlib` under `lib/` are listed
      below (or this PR removes them). See [`lib/README.md`](../lib/README.md)
      **Bun-native exceptions**.

### Known exceptions (this PR)

- [ ] None
- [ ] Listed: …

## Test plan

```bash
# 1) Claim-specific commands from Claim → evidence (required)
# 2) Scoped suite for this lane (examples):
# bun test tests/console-depth.test.ts
# bun test tests/bun-types-inventory.test.ts
# bun run bun:types-inventory:check
# bun run concept:audit --strict
# bun run validate:surface-coverage
# 3) Merge confidence on a clean tree (when needed):
# bun run bun:ci
```

- [ ] Listed commands were actually run (not aspirational)
- [ ] Failures attributed to owning lane (or fixed here)

## Notes for reviewers

<!-- Risk · rollout · rollback · authority: docs/harness/AUTHORITY.md · review: docs/harness/REVIEW.md -->

## Out of scope

<!-- What this PR explicitly does not do (keeps review focused) -->

n/a
