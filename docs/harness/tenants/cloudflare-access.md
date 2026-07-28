# Tenant: cloudflare-access

Cloudflare Access is the authentication and authorization edge for operator
surfaces. Cloudflare is the identity provider; account membership is the
authorization selector. Proton Pass is the credential source for automation.

## Managed surfaces

Live status (verified 2026-07-28 — see `.cloudflare-access.yml` header):

- `ledger.factory-wager.com` — whole hostname behind Access. **APPLIED** (302 → Access login).
- `reasonix.factory-wager.com` — whole hostname behind Access. **STAGED** (no DNS record yet).
- `score.factory-wager.com/portal` — portal path behind Access. **APPLIED** 2026-07-28 17:18 (302 → Access login; also `project-r-score.pages.dev/portal`).
- `score.factory-wager.com/registry` and public proof/API read routes stay
  outside this app so package and verification consumers remain non-interactive.
- The Pages production `pages.dev` hostname and preview deployments should use the
  Pages Access control in addition to the custom-domain application — **not yet
  enforced**. A normal custom-domain Access app does not cover those hostnames.

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
4. Sessions are capped at eight hours.
5. App Launcher visibility is configured after the three application policies
   pass authorized and unauthorized tests.

Current Cloudflare references:

- [Cloudflare as identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/)
- [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
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

The existing general Cloudflare token and DNS token do not have Access scope.
Before a live plan:

1. Mint a dedicated token with the current least-privilege Access read/write
   permissions required for identity providers, apps, and policies.
2. Store it as `Cloudflare Access API Token` in the `factorywager` Proton vault.
3. Add a template reference only after `pass-cli` proves the item resolves.
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

### Live status (re-probed 2026-07-28)

| Surface | Edge | Doctor |
|---------|------|--------|
| `ledger.factory-wager.com` | **Access 302** | `infra-ledger-access` PASS |
| `score.factory-wager.com/portal` | **public 200** | `infra-portal-access` FAIL warn |
| `project-r-score.pages.dev/portal` | **public 200** | (same) |
| `terminal.factory-wager.com` | **502 dangling** | `infra-terminal-host` FAIL warn |
| `reasonix.factory-wager.com` | **NXDOMAIN** | `infra-reasonix-dns` info (expected) |

```bash
bun tools/portal-cli.ts doctor --group infra --no-write          # live
bun tools/portal-cli.ts doctor --group infra --offline --layout plain
```

### Apply blocker (Access API)

`kimi-cloudflare-access plan` currently fails with **Cloudflare API 403** —
`CLOUDFLARE_API_TOKEN` has no Access/Zero Trust scope; DNS token is Zone.DNS-only.

**Human steps before apply:**

1. Cloudflare dashboard → create API token with Access:Apps & Policies Edit (account).
2. Proton Pass `factorywager` vault → item `Cloudflare Access API Token`.
3. `bun run proton:inject:factorywager:reasonix` (or wire `CLOUDFLARE_ACCESS_API_TOKEN`).
4. `bun run cloudflare:access:verify` then `kimi-cloudflare-access plan` (creates/updates only).
5. Review plan → `kimi-cloudflare-access apply` only with rollback snapshot.
6. Re-probe: `portal-cli doctor --group infra` → portal warn must go green.
7. Pages: enable Access on production + preview in Pages project settings (custom-domain app alone does **not** cover `pages.dev`).

Do **not** run apply until token + IdP + Pages Access + rollback exist.

## Apply gate

```bash
bun run cloudflare:access:verify
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
