# Pull Request

## Summary

<!-- 1–3 bullets: why this change exists -->

-

## Claim → evidence

State the user/ops claim this PR closes. Match kind to evidence ([PROOF.md](../docs/harness/PROOF.md)).
**Non-draft PRs fail CI** when this table has no filled row (`bun scripts/check-pr-claim.ts`).

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence (command or path that exited 0) |
|----------------------|-----------------------------------------------------|------------------------------------------|
| | | |

<!-- Shape only (replace the blank row — do not paste this as a table line):
     Terminal markdown uses Bun native ANSI · unit · bun test tests/bun-markdown-ansi.test.ts
-->

Install/layout touched → also `bun run proof:install`.

## Portal / partner-domain

Fill when this PR touches portal boards, partner glossary, or Soft/Factory domain map.
Skip when N/A.

| Surface | Path / doc | Touched? |
|---------|------------|----------|
| Board slug | `/portal/<slug>/` · `PORTAL_BOARD_SLUGS` | |
| Registry bake | `/registry/<artifact>.json` | |
| Partner domain | [partner-domain-map.md](../docs/harness/tenants/partner-domain-map.md) | |
| Soft handshake | [soft-handshake.md](../docs/design/soft-handshake.md) | |

- [ ] Board · route · chrome · page-concepts stay synced (if board added/removed)
- [ ] Glossary / partners-ops bake checked when overlay concepts moved

## Artifact publish

Fill when publishing or rebaking a registry package (bookmakers, factory libs, ops snapshot).
Skip when N/A.

| Step | Command / note |
|------|----------------|
| Package + version | e.g. `@factorywager/bookmakers@0.4.x` |
| Publish | `bun run factory:publish …` or package-specific prepare |
| Snapshot / bake | `factory snapshot` · `bookmakers:bake` · `ops:snapshot` |
| Pages mirror | committed under `public/registry/` (ops never on Pages) |

- [ ] Public artifact has no secrets (`restBaseUrl`, `apiKeyEnv`, `envVars`, balance/health)
- [ ] Ops plane (if any) stays under `artifact-registry/…/ops/` only

## Naming (v0.4 bookmakers / public catalog)

Required when editing bookmaker registry rows or the public catalog shape.
Tenant: [bookmakers-registry.md](../docs/harness/tenants/bookmakers-registry.md).

| Field | Rule |
|-------|------|
| `id` / `slug` | **`id === slug`** (route primary key; no UUID) |
| `fetcher` | `rest` \| `webview` \| `seat` (not `fetcherType`) |
| `sports` | array of sport keys (not `supportedSports`) |
| `urls.web` | primary public URL under `urls.{ web, api, limitsPage, termsPage }` |

- [ ] Public rows use v0.4 names (`fetcher`, `sports`, `urls.web`)
- [ ] `id === slug` on every row touched
- [ ] `bun run bookmakers:bake:check` (or migrate + board tests) when catalog changed

## Concept-lane proof (when vocabulary / boards / limit-row wire change)

Keep kinds in `unit|boundary|journey|deployed`. Map: [CONCEPT_LIFECYCLE.md](../docs/CONCEPT_LIFECYCLE.md).

| Claim | Kind | Evidence |
|-------|------|----------|
| Concept audit passes | unit | `bun run concept:audit --strict` |
| Surface coverage passes | unit | `bun run validate:surface-coverage` |
| Wire enums valid/invalid | unit | `bun test tests/limit-row-wire.test.ts` |
| Board slug registered | unit | `PORTAL_BOARD_SLUGS` + `public/portal/<slug>/` + page-concepts |
| Deprecation has `replacedBy` | unit | vocabulary + consumers retargeted |
| Glossary bake current | unit | `bun run glossary:portal:check` |

### Concept-lane gates

- [ ] `concept:audit --strict` · `validate:surface-coverage` (allowlist warnings OK)
- [ ] Wire field change → `tests/limit-row-wire.test.ts`
- [ ] Board add/remove → slugs, page-concepts, public-routes, `_redirects`, `public/portal/<slug>/`
- [ ] Deprecate → `replacedBy` + successor bound in surface maps / HTML

Skip only when no concept/board/wire impact.

## Fresh-rerun paste

Required when this PR moves an owner of a [`CRITICAL_PROOF_PATHS`](../lib/harness/proof.ts) claim.
Lookup: `bun run docs:fresh-rerun` · [FRESH-RERUN.md](../docs/harness/FRESH-RERUN.md).
Soft tip: if the body mentions a proof id in backticks, include that claim’s `freshRerun` command too.

```text
# paste fresh-rerun / claim re-proof output here
```

## Color Kernel (when theme / kernels touched)

When touching `theme.jsonc`, kernel palettes, or `claim-reporter` / `color-kernel-align`
([`color-kernel-paths.ts`](../lib/portal/color-kernel-paths.ts)).
CI always runs `validate:colors:strict` via `test:colors` (claim `color-kernel-theme-aliases`).

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

- [ ] `SKIP_TEST_CHANGED=1` — reason + local proof:
- [ ] `SKIP_QUALITY_CONCEPT=1` — reason + local proof:
- [ ] `SKIP_GITLEAKS=1` — reason + local proof:

## Checklist

- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out)
- [ ] Prettier on every touched `lib/**/*.ts` (`bun x prettier --write <file...>` or `format:harness`)
- [ ] Brands / wire: no new bare `*Id: string` or interior `unknown` params
- [ ] Docs/JIT updated only when an owner moved (`docs/harness/`, `repo-docs`, AGENTS)
- [ ] Concept lifecycle / agents tenant docs updated when vocabulary or wire contract moved
- [ ] If spine touched: `bun run type-check` (`tsconfig.check.json`)
- [ ] Any `SKIP_*` escape justified above (or N/A)
- [ ] **Open issues closed** (optional): linked issues resolved by this PR — list `#…` or N/A

## Test plan

```bash
# claim-specific commands from Claim → evidence (prefer over full ci:harness:fast)
# Concept-lane default:
# bun run concept:audit --strict
# bun run validate:surface-coverage
```

## Notes for reviewers

<!-- Risk, rollout, authority: docs/harness/AUTHORITY.md · review: docs/harness/REVIEW.md -->

## Out of scope (optional)

<!-- What this PR explicitly does not do -->
