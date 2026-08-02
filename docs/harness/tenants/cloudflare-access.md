# Tenant: cloudflare-access

Cloudflare Access is the authentication and authorization edge for operator
surfaces. Cloudflare is the identity provider; account membership is the
authorization selector. Proton Pass is the credential source for automation.

## Managed surfaces

Live status (verified 2026-07-31 — see `.cloudflare-access.yml` header):

- `ledger.factory-wager.com` — whole hostname behind Access. **APPLIED** (302 → Access login).
- ~~`reasonix.factory-wager.com` — whole hostname behind Access.~~ **DECOMMISSIONED 2026-07-28** (never provisioned; app removed from policy).
- `score.factory-wager.com/portal` — portal path behind Access. **APPLIED** (302 → Access login).
- `project-r-score.pages.dev/portal` — production Pages portal behind Access. **APPLIED** (302 → Access login).
- Pages branch and hash preview hostnames — **PAGES-OWNED TARGET**; sampled previews returned public 200 on 2026-07-31. Enable the project-level preview Access policy in Pages settings.
- `score.factory-wager.com/registry` and public proof/API read routes stay
  outside this app so package and verification consumers remain non-interactive.
- Pages preview deployments are public by default. Their protection owner is
  Pages → project settings → General → Enable access policy. The Access app plan
  deliberately excludes a wildcard preview app so it cannot duplicate or drift
  the Pages-owned policy.

The policy source is
[`.cloudflare-access.yml`](../../../.cloudflare-access.yml). It is deliberately
`scoped: true`; the toolchain must ignore unlisted live Access apps instead of
deleting them.

## Identity contract

1. IdPs in use: **Google** and **One-time PIN** (not Cloudflare account-member
   SSO). Operators sign in with an allowlisted personal or `@factory-wager.com`
   inbox.
2. Each managed app uses an explicit `email: { email: … }` allowlist (OR
   includes). Source of truth: [`.cloudflare-access.yml`](../../../.cloudflare-access.yml).
   Keep live Access policies in sync when adding/removing operators.
3. Domain-wide `email_domain` OTP is **not** the SSO contract (rejected by
   `bun run cloudflare:access:verify`).
4. Interactive sessions are capped at four hours.
5. Access authorization cookies remain `HttpOnly`. Do not enable a binding
   cookie or change `SameSite` without browser-flow verification.
6. App Launcher visibility is configured after the application policies
   pass authorized and unauthorized tests.
7. GitHub `noreply` commit emails cannot authenticate — use real inboxes only.

Current Cloudflare references:

- [Cloudflare as identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/)
- [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Authorization cookies](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/)
- [Preview deployment Access](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [App Launcher](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/app-launcher/)

## Project lanes

- Operator web surfaces with a deployed hostname enter `.cloudflare-access.yml`
  and must pass `bun run cloudflare:access:verify`.
- Static portal code stays in the public-plane lane; it does not implement a
  second login system.
- Registry and proof read planes remain public unless their consumer contract is
  intentionally migrated to service authentication.
- Active local-only projects have no Access app. Their credentials still follow
  the matching Proton template.
- Own-remote projects adopt Access in their owning repository and contribute
  only the resulting hostname/portal link here.
- Experimental projects do not receive SSO or vault credentials until promoted.

Inventory authority remains `projects/README.md` and
`bun run projects:roots:check`. Vault coverage authority remains
`bun run env:inventory:vault`.

## Agent and sub-agent split

- Root agent owns integration order, live plan review, commits, and rollback.
- Access-policy agent owns `.cloudflare-access.yml`, this runbook, and the
  static verifier/test.
- Vault agent owns Proton item existence and template injection. It never pastes
  a token into source, logs, or chat.
- Portal agent owns static navigation and Pages parity, not identity policy.
- Project agents report deployed hostnames and required non-human callers. They
  do not add wildcard apps or shared service tokens.

Agents claim disjoint files, re-check `git status` before staging, and commit in
this order: safety contract, identity hotfixes, vault wiring, live plan
evidence, then portal evidence.

## Token and vault lane

The general Cloudflare Pages token and DNS token do not have Access scope and
are never used as a fallback. The dedicated vault item at
`pass://factorywager/Cloudflare Access API Token/password` passed application
and service-token reads on 2026-07-31 after Proton injection. The policy plan
also authenticated, proving Apps and Policies Write without printing or
persisting the credential outside the vault-derived `.env`/Reasonix cache.

1. Inject with `bun run proton:inject:factorywager:reasonix`.
2. Run `bun run cloudflare:access:token:validate`; the read-only probe checks
   application/service-token health and expiry.
3. Map `CLOUDFLARE_ACCESS_API_TOKEN` to the policy CLI only for an inspected
   plan. Never substitute the Pages or DNS token.
4. Keep Pages preview protection in the Pages project setting; it does not
   require widening the Access token with Pages Edit.

## Doctor probes (live edge)

`portal-cli doctor` group **`infra`** observes edge behavior (no Access API token required):

| Check | Level | Proves |
|-------|-------|--------|
| `infra-ledger-access` | fatal | `ledger.factory-wager.com` returns Access challenge (302 → `*.cloudflareaccess.com` or `www-authenticate: Cloudflare-Access`) |
| `infra-portal-access` | warn | both `score.factory-wager.com/portal/` **and** `project-r-score.pages.dev/portal/` are Access-enforced |

```bash
bun tools/portal-cli.ts doctor --env ci --group infra
bun tools/portal-cli.ts doctor --group infra --verbose
```

For the full Pages/Access boundary, use the general **Pages Read** token only to
discover the newest preview, then probe all surfaces without credentials:

```bash
bun --env-file ~/.reasonix/.env run cloudflare:access:edge:validate
```

This command requires Ledger, both production portal hostnames, and the newest
Pages preview to challenge with Access. It simultaneously requires the public
registry route to remain JSON and carry the shared security-header contract.
It never uses `CLOUDFLARE_ACCESS_API_TOKEN` and cannot mutate policy.

### Live status (re-probed 2026-07-31)

| Surface | Edge | Doctor |
|---------|------|--------|
| `ledger.factory-wager.com` | **Access 302** | `infra-ledger-access` PASS |
| `score.factory-wager.com/portal` | **Access 302** | `infra-portal-access` PASS |
| `project-r-score.pages.dev/portal` | **Access 302** | (same) |
| sampled branch/hash preview hosts | **public 200** | not covered by production-path doctor |
| `terminal.factory-wager.com` | **NXDOMAIN** (CNAME deleted 2026-07-28) | `infra-terminal-host` — host gone; see [tunnel-inventory](tunnel-inventory.md) · [brand-alignment](../../brand-alignment.md) |
| `reasonix.factory-wager.com` | **NXDOMAIN** | `infra-reasonix-dns` info (expected) |

```bash
bun tools/portal-cli.ts doctor --group infra --no-write          # live
bun tools/portal-cli.ts doctor --group infra --offline --layout plain
```

### Plan safety finding

The dedicated Access token can read/update Access apps/policies. Account
**Members** invite remains out of scope for that token (403) — operator access
is granted via the email allowlist, not Cloudflare account membership.

Aligned 2026-08-02: source YAML and live portal/ledger policies use the same
explicit email allowlist (`utahj4754@gmail.com`, `brendawill2233@gmail.com`,
`nolarose@factory-wager.com`; ledger also keeps `inmikehuntglobal@gmail.com`).

**Pages preview steps:**

1. Cloudflare dashboard → Workers & Pages → `project-r-score` → Settings →
   General → Enable access policy.
2. Confirm a current hash/branch preview returns Access 302.
3. Run `bun run cloudflare:access:edge:validate` and confirm the registry public
   plane remains 200 with the shared security headers.
4. Review any later `kimi-cloudflare-access plan` separately with a rollback
   snapshot before changing the three production Access applications.

## Apply gate

```bash
bun run cloudflare:access:verify
bun run cloudflare:access:token:validate # read health; write scope was proved by plan
bun run cloudflare:access:edge:validate
bun run proton:check
kimi-cloudflare-access plan   # production apps only; inspect, do not use for Pages previews
```

After apply, verify:

- authorized account member succeeds;
- non-member is denied;
- portal custom domain is protected;
- public registry read routes remain reachable without interactive login;
- Ledger protected; Reasonix only when DNS exists;
- Pages production and preview enforce Pages Access.

## Response-header contract

Static assets use [`public/_headers`](../../../public/_headers). Pages Functions
and static responses passing through the edge use root
[`functions/_middleware.ts`](../../../functions/_middleware.ts), backed by
[`lib/http/cloudflare-security-headers.ts`](../../../lib/http/cloudflare-security-headers.ts).
Tests enforce parity while preserving route-specific CORS and cache headers.
`bun run verify:pages-edge` checks the deployed contract on one static asset and
one Pages Function response so `_headers`/middleware drift is visible after deploy.

The contract sets a frame/object/base-restricted CSP, `DENY` framing,
`nosniff`, no-referrer, a restrictive permissions policy, COOP, and one-year
HSTS. HSTS omits `includeSubDomains` until every `factory-wager.com` hostname
has an HTTPS inventory and owner.
