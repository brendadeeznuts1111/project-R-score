# Proof contracts

Match **evidence** to the **claim**. Green pre-commit alone does not prove a journey or deployed health.

**New claim?** → fill out [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) first (`bun run docs:claim-discovery`).

Upstream: [harness-engineering proof thesis](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof).

Markdown here is only a pointer. Enforcement is lint (**error**), `tsconfig.check.json` / brand types, and the ratchets named under each artefact.

## Claim kinds

- **`unit`** — pure logic / types  
  *Ratchet* → `bun test` · `bun run check:brands:types`
- **`boundary`** — wire → domain parse / spine ratchets  
  *Ratchet* → staged brand gate · harness eslint · `check:path-bun` · `check:bun-env`
- **`journey`** — multi-step user/ops path  
  *Ratchet* → scripted CLI sequence · contract JSON
- **`deployed`** — live / machine state  
  *Ratchet* → `install:verify` · machine health · CI workflow green

## Named critical paths

- **`branded-ids`** — new domain IDs are branded after the boundary (`boundary` + `unit`)  
  *Ratchet* → `bun tools/branded-id-check.ts --staged --strict`, `bun run check:brands:types`
- **`install-verify`** — Factory install produces a working Bun workspace (`journey` + `deployed`)  
  *Ratchet* → `bun run proof:install` · `bun run install:verify` (CI: `repo-hygiene.yml`)
- **`install-verify-journey`** — install:verify → HTML report → WebView asserts `#status = verified`  
  *Ratchet* → `bun run test:install-verify`
- **`test-changed`** — import-graph affected tests (`unit` + `journey`)  
  *Ratchet* → `bun run test:changed` · `bun run test:changed:main` (CI: `harness-gates.yml`)
- **`search-governance`** — bench gate policy holds (`journey`)  
  *Ratchet* → `.github/workflows/search-governance.yml`
- **`search-governance-basic`** — known query → WebView results (`journey`)  
  *Ratchet* → `bun run test:search-governance` · [`search-governance.md`](search-governance.md)
- **`path-bun`** — spine `lib/` + `tools/` do not import `path` / `node:path` (`boundary`)  
  *Ratchet* → `bun run check:path-bun`
- **`bun-env`** — spine `lib/` + `scripts/` do not use Node `process.env` (`boundary`)  
  *Ratchet* → `bun run check:bun-env` · eslint `bun/prefer-bun-env` (**error**)
- **`unknown-param`** — bare `unknown` params stay at parse edges (`boundary`)  
  *Ratchet* → eslint `harness/no-unknown-function-param` (**error**) · `bun eslint --config eslint.bun-native.config.ts --quiet`
- **`day-loop-typecheck`** — advertised `type-check` covers spine agent edit surfaces (`journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json`
- **`lib-docs-typecheck`** — `lib/docs/**` inside day-loop type-check (no dual-era docs island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/docs/**/*`
- **`lib-utils-typecheck`** — `lib/utils/**` inside day-loop type-check (no dual-era utils island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/utils/**/*`
- **`lib-core-typecheck`** — `lib/core/**` inside day-loop type-check with `ErrorSeverity` enum (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/core/**/*`
- **`lib-security-typecheck`** — `lib/security/**` inside day-loop type-check (no dual-era security island) (`boundary` + `journey`)  
  *Ratchet* → `bun run type-check` · `tsconfig.check.json` include `lib/security/**/*`
- **`bun-cron`** — OS-persistent primary; in-process complement (`unit` + `boundary`)  
  *Ratchet* → `bun run test:cron` · [`cron.md`](cron.md)
- **`cron-os-persistent`** — OS register → entry → fire `scheduled()` → marker → remove (`journey` + `boundary`)  
  *Ratchet* → `bun run test:cron-os` · [`cron.md`](cron.md)
- **`docs-integrity`** — Bun docs stack integrity pass (`journey` + `boundary`)  
  *Ratchet* → `bun tools/bun-doc-refs.ts schedule --once` · [`tenants/docs-integrity.md`](tenants/docs-integrity.md)
- **`spine-multi-tenant`** — spine runs ≥2 in-process tenants (docs-integrity + install-verify) (`journey` + `boundary`)  
  *Ratchet* → `bun run spine:schedule:once -- --tenant=install-verify` · [`cron.md`](cron.md)
- **`spine-maintenance-runbooks`** — TenantRunbook + SignalMonitor; retirement attested; live `freshRerun` (`boundary` + `journey`)  
  *Ratchet* → `bun run test:tenant-runbooks` · [`spine-tenants.md`](spine-tenants.md) · [`maintenance.ts`](../../lib/harness/maintenance.ts) · `assertRetirementEnforcement`
- **`spine-tenant-heal`** — sandboxed E2E heal loop (break → signal → intervene → recover) (`journey`)  
  *Ratchet* → `bun run test:tenant-heal` · [`heal-fixture.ts`](../../lib/harness/heal-fixture.ts) · [`tenant-heal.test.ts`](../../tests/journey/tenant-heal.test.ts)

## Fresh-rerun

Every path above has a `freshRerun` command in [`lib/harness/proof.ts`](../../lib/harness/proof.ts).  
*Ratchet* → [`FRESH-RERUN.md`](FRESH-RERUN.md) · paste command output in the PR body when touching the claim’s owner.

## New claim → discovery first

Do not invent a `ProofPath` by editing files ad hoc. Fill [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) (Q0–Q14) so ceremony path (slim vs full), `claim` / `kinds` / `evidence` / `freshRerun`, contract asserts, and PR paste are decided before code.  
*Ratchet* → `bun run docs:claim-discovery` · answered questionnaire in the PR or commit trail

## Agent checklist before “done”

1. For a **new** claim: complete [`CLAIM-DISCOVERY.md`](CLAIM-DISCOVERY.md) (slim or full path from Q0).
2. State the claim in one sentence (`ProofPath.claim`).
3. Pick kind(s) above.
4. Point at evidence paths or commands that actually ran.
5. If the change touches a claim owner, run that claim’s `freshRerun` and keep the output (PR body) — [`FRESH-RERUN.md`](FRESH-RERUN.md).
6. If evidence is missing, either run it or downgrade the claim.

Code SSOT: [`lib/harness/proof.ts`](../../lib/harness/proof.ts). Discover: `bun run harness:status` · `bun run docs:fresh-rerun` · `bun run docs:claim-discovery`.
