# Tenant: cloudflare-access

Cloudflare Access is the authentication and authorization edge for operator
surfaces. Cloudflare is the identity provider; account membership is the
authorization selector. Proton Pass is the credential source for automation.

## Managed surfaces

- `ledger.factory-wager.com` — whole hostname behind Access.
- `reasonix.factory-wager.com` — whole hostname behind Access.
- `score.factory-wager.com/portal` — portal path behind Access.
- `score.factory-wager.com/registry` and public proof/API read routes stay
  outside this app so package and verification consumers remain non-interactive.
- The Pages production `pages.dev` hostname and preview deployments use the
  Pages Access control in addition to the custom-domain application. A normal
  custom-domain Access app does not cover those hostnames.

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

## Apply gate

```bash
bun run cloudflare:access:verify
bun run proton:check
kimi-cloudflare-access plan
```

Review the plan for creates/updates only. Any delete is a stop condition.

Before apply, test the rollback path: preserve the prior app/policy snapshot and
confirm an administrator can disable the new policy or restore the prior one.
After apply, verify:

- authorized account member succeeds;
- non-member is denied;
- portal custom domain is protected;
- public registry read routes remain reachable without interactive login;
- Ledger and Reasonix are protected;
- Pages production and preview hostnames enforce Pages Access;
- Access authentication logs identify the matching app and policy.

Do not run `kimi-cloudflare-access apply` until the dedicated token, Cloudflare
IdP, Pages Access setting, and rollback snapshot all exist.
