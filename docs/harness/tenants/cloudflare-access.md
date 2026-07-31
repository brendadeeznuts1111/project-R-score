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
- `*.project-r-score.pages.dev` — branch and hash preview hostnames. **TARGET**; sampled previews returned public 200 on 2026-07-31.
- `score.factory-wager.com/registry` and public proof/API read routes stay
  outside this app so package and verification consumers remain non-interactive.
- Pages preview deployments are public by default. The wildcard app in policy is
  the source-controlled protection target; the Pages dashboard preview-Access
  switch is an equivalent fallback.

The policy source is
[`.cloudflare-access.yml`](../../../.cloudflare-access.yml). It is deliberately
`scoped: true`; the toolchain must ignore unlisted live Access apps instead of
deleting them.

## Identity contract

1. Configure Cloudflare as an identity provider with “restrict to account
   members” enabled.
2. Each managed app uses one `cloudflare_account_member: {}` include rule.
   Omitting `account_id` selects the current account and keeps identifiers out
   of source.
3. Email-domain one-time PIN is not the SSO contract.
4. Interactive sessions are capped at four hours.
5. Access authorization cookies remain `HttpOnly`. Do not enable a binding
   cookie or change `SameSite` without browser-flow verification.
6. App Launcher visibility is configured after the application policies
   pass authorized and unauthorized tests.

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
are never used as a fallback. The dedicated vault item exists at
`pass://factorywager/Cloudflare Access API Token/password`, but its current
value failed Cloudflare authentication on 2026-07-31. Before a live plan:

1. Mint a replacement restricted to the FactoryWager account with Access Apps
   and Policies Read/Edit plus Access Service Tokens Read. Do not add Pages
   Edit, DNS Edit, or Service Tokens Edit.
2. Replace the password field of `Cloudflare Access API Token` in Proton.
3. Inject and run `bun run cloudflare:access:token:validate`; the read-only
   probe checks apps and service-token expiry without printing the credential.
4. Run the plan with that injected token; do not copy it into the Kimi keychain
   or a shell command.

Token creation is a human Cloudflare-dashboard action. Source changes must not
pretend the permission exists before the vault item is real.

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

### Apply blocker (Access API)

The dedicated Proton item currently fails read-only probes with **Cloudflare API
400 Authentication failed**. The general Pages token fails with 403 because it
has no Access scope. This is a credential-value blocker, not permission to
reuse or widen either existing token.

**Human steps before apply:**

1. Cloudflare dashboard → replace the token with the least-privilege permissions above.
2. Proton Pass `factorywager` vault → update item `Cloudflare Access API Token`.
3. `bun run proton:inject:factorywager:reasonix` (or use `portal-cli secret run`).
4. Run `cloudflare:access:token:validate` and `cloudflare:access:verify`.
5. Run `kimi-cloudflare-access plan` (creates/updates only).
6. Review plan → apply only with a rollback snapshot.
7. Confirm a preview URL returns Access 302, then re-run the infra doctor.

Do **not** run apply until token + IdP + Pages Access + rollback exist.

## Apply gate

```bash
bun run cloudflare:access:verify
bun run cloudflare:access:token:validate
bun run proton:check
kimi-cloudflare-access plan   # requires Access-scoped token
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

The contract sets a frame/object/base-restricted CSP, `DENY` framing,
`nosniff`, no-referrer, a restrictive permissions policy, COOP, and one-year
HSTS. HSTS omits `includeSubDomains` until every `factory-wager.com` hostname
has an HTTPS inventory and owner.
