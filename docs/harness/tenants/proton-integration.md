# Proton Integration — Operations Runbook

**Token SSOT:** all API tokens, bot tokens, R2 keys, and registry secrets are stored in **Proton Pass** and resolved with **`pass-cli inject` / `pass-cli run`**. Do not mint into shell history or hand-append secrets to `~/.reasonix/.env` / `.env` as the authority path. Derived env files are a **cache** regenerated from vault templates.

## Official Pass CLI documentation

Canonical docs: **[protonpass.github.io/pass-cli](https://protonpass.github.io/pass-cli/)**

| Topic | Doc |
|-------|-----|
| Overview / install | [Overview](https://protonpass.github.io/pass-cli/) |
| Web / interactive / PAT login | [`login`](https://protonpass.github.io/pass-cli/commands/login/) |
| Personal access tokens (create, grant, renew) | [`pat`](https://protonpass.github.io/pass-cli/commands/personal-access-token/) |
| `pass://vault/item/field` URIs | [Secret references](https://protonpass.github.io/pass-cli/commands/contents/secret-references/) |
| Resolve env + exec | [`run`](https://protonpass.github.io/pass-cli/commands/contents/run/) — bare `pass://` |
| Template → file | [`inject`](https://protonpass.github.io/pass-cli/commands/contents/inject/) — `{{ pass://… }}` |
| Session status | [`info`](https://protonpass.github.io/pass-cli/commands/info/) · [`test`](https://protonpass.github.io/pass-cli/commands/test/) |
| Vaults / items | [`vault`](https://protonpass.github.io/pass-cli/commands/vault/) · [`item`](https://protonpass.github.io/pass-cli/commands/item/) |
| Troubleshoot | [Troubleshoot](https://protonpass.github.io/pass-cli/help/troubleshoot/) · [Configuration](https://protonpass.github.io/pass-cli/get-started/configuration/) (`PROTON_PASS_KEY_PROVIDER`, session dir) |

This monorepo prefers **`inject`** → project `.env` (see below). Sibling Kalshi-bot prefers **`run`** + `.env.protonpass` — see [`Kalshi-bot/docs/PROTONPASS.md`](../../../Kalshi-bot/docs/PROTONPASS.md).

## Vault Layout

| Vault | Purpose | Items | Agent PAT (`.env.pass-tokens`) |
|-------|---------|-------|--------------------------------|
| **Personal** | Personal SSH key | `id_ed25519 (dev)` | `agent-work` |
| **factorywager** | Monorepo deploy + CF + Telegram (factory bot) | R2, Registry, **Cloudflare API Token**, Telegram bot/webhook, emails | `PROTON_PASS_FACTORYWAGER_TOKEN` → `factorywager-bot` |
| **bet-ticker** | bet-ticker-worker secrets | VPS key, R2, Token, login | `PROTON_PASS_BET_TICKER_TOKEN` |
| **cascade-mover** | Cascade mover secrets | SSH key, Server config | `PROTON_PASS_CASCADE_TOKEN` |
| **cloudflare** | Optional CF-scoped agent session | (agent-only) | `PROTON_PASS_CLOUDFLARE_TOKEN` |

> **Note:** `factorywager-bot` only sees the **factorywager** vault. Root `env.template` therefore uses `pass://factorywager/...` for Telegram as well as CF/R2 (not a separate `tenants` vault name the agent cannot open).

### Cloudflare API token (canonical ref)

```
pass://factorywager/Cloudflare API Token/password
```

- Account tokens (`cfat_…`) verify at `/accounts/{account_id}/tokens/verify` — **not** `/user/tokens/verify`.
- Mint/rotate only in the [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens), then **update the vault item**.
- Runtime consumers read `CLOUDFLARE_API_TOKEN` after inject (MCP, Pages deploy, `cloudflare:env:*`).

## Vault health (gate vs dashboard)

| Layer | Command | Needs pass-cli session? | Role |
|-------|---------|-------------------------|------|
| **Gate (CI)** | `bun test tests/vault-health.test.ts` · `portal-cli vault health` | No | Report-shape + **env→vault inventory** snapshot SSOT in git (`tests/__snapshots__/vault-health.test.ts.snap`). Harness Gates step. |
| **Intentional drift** | `portal-cli vault health --update` | No | Refresh inventory/shape snaps after you move/rename a mapped item; commit the `.snap`. |
| **Live bake** | `bun run vault:health:bake` | Yes (agent session) | Cross-check live Proton Pass titles/states vs map; exit 1 on trashed/missing refs (purge risk). |
| **Dashboard** | `/portal/vault/` · `public/registry/vault-health.json` | — | Visual summary of the last bake — not the gate. |

```bash
bun run vault:health                 # same as portal-cli vault health
bun run vault:health:update          # intentional snap refresh
bun run vault:resolve                # list map (no secret values)
bun run vault:resolve --json         # machine inventory
source scripts/agent-env.sh factorywager && bun run vault:health:bake
```

Engine: [`lib/security/vault-health.ts`](../../../lib/security/vault-health.ts) · bake: [`tools/vault-health-bake.ts`](../../../tools/vault-health-bake.ts) · resolve: [`tools/vault-resolver.ts`](../../../tools/vault-resolver.ts). Portal nav: `/portal/vault/` (weave surface `vault`).

If pass-cli reports a corrupted local DB: `pass-cli logout --force` then re-login / re-run `source scripts/agent-env.sh factorywager`.

## Env inventory (code ↔ vault)

Map harness `Bun.env.*` usage to `env.template` / Proton Pass refs (no secret values printed):

```bash
bun run env:inventory              # human summary + dispositions
bun run env:inventory:vault        # vault coverage focus
bun run env:inventory:json         # machine JSON
bun run env:inventory:ratchet      # fail if actionable gaps grow (baseline)
bun run env:inventory:baseline     # lock current gaps after intentional debt
bun run check:env-defaults         # optional config without fallback (harness)
bun run proton:check               # inject proof for all templates
```

### Packages ↔ vault + env inventory (workspace `packages/*`)

`env:inventory` scans **`packages/`** alongside `lib`/`config`/`scripts`/`tools` and emits reverse **owners** + root/product runtime (claim `packages-graph-map-v11`):

```bash
bun run env:inventory              # includes packages plane section
bun run env:inventory:bake         # → /registry/env-inventory.json
bun run audit:packages:full        # --vault --env
bun run audit:packages:env         # --env --vault-gap + dual bake
bun run audit:packages:vault       # --vault --vault-gap
```

- Scanners: [`lib/harness/packages-vault-map.ts`](../../../lib/harness/packages-vault-map.ts) · [`scripts/lib/env-inventory-compact.ts`](../../../scripts/lib/env-inventory-compact.ts)
- Bake: `/registry/packages-graph-map.json` (`map.vault` · `map.env`) · `/registry/env-inventory.json`
- Boards: `/portal/packages/` · `/portal/env/`
- Never prints secret values — only key names, `pass://` refs, runtime present/missing booleans, and gap flags

Policy: [`scripts/lib/env-secret-policy.ts`](../../../scripts/lib/env-secret-policy.ts) · baseline: [`scripts/env-secret-gap-baseline.json`](../../../scripts/env-secret-gap-baseline.json)

| Signal | Meaning |
|--------|---------|
| Vaulted | Code name has `pass://` in an `env.template` |
| Alias | e.g. `TELEGRAM_BOT_TOKEN` → `TELEGRAM_BOT_FACTORY` (already vaulted) |
| Bun.secrets service label | `*_SECRETS_SERVICE` — service id, not password material |
| **Actionable vault gap** | Real operator secret used in code with no template/vault ref |
| `env:inventory --ratchet` | New actionable gaps fail (pre-commit soft; CI can hard-fail) |

## Secret Injection

```bash
# Resolve env.template → project .env (loads agent PAT from .env.pass-tokens)
bun run proton:inject:factorywager

# Same + strip/replace derived keys in ~/.reasonix/.env (MCP / Reasonix)
bun run proton:inject:factorywager:reasonix

# Per-product inject (writes product-local .env, not monorepo root)
bun run proton:inject:cascade
bun run proton:inject:bet-ticker
bun run proton:inject:scanner

# Prove all pass:// refs resolve (no secret values printed)
bun run proton:check
bun run proton:check:list   # refs only

# Inject then run a command with secrets in the environment
bun run proton:run -- factorywager --reasonix -- bun run cloudflare:env:validate
# or package alias:
bun run cloudflare:validate:vault

# Guided CF bootstrap (inject + verify + harness gates)
bash scripts/cloudflare-env-setup.sh

# Full deploy with vault injection
bun run proton:deploy:pages
# or
bun run cloudflare:deploy:vault
```

| Command | Script | Output `.env` |
|---------|--------|----------------|
| `proton:inject:factorywager` | [`scripts/proton-inject.sh`](../../../scripts/proton-inject.sh) | monorepo root `.env` |
| `proton:inject:factorywager:reasonix` | same + `--reasonix` | root `.env` + derived `~/.reasonix/.env` |
| `proton:inject:cascade` | same | `projects/active/enterprise/cascade-mover-v3/.env` |
| `proton:inject:bet-ticker` | same | `projects/active/enterprise/bet-ticker-worker-v1.1/.env` |
| `proton:inject:scanner` | same | `projects/active/analysis/scanner/.env` |
| `proton:check` | [`scripts/proton-vault-check.sh`](../../../scripts/proton-vault-check.sh) | temp only (deleted) |
| `proton:run` | [`scripts/proton-run.sh`](../../../scripts/proton-run.sh) | inject then `exec` |
| `proton:deploy:pages` | [`scripts/proton-deploy.sh`](../../../scripts/proton-deploy.sh) | root `.env` then deploy |
| Agent session | [`scripts/agent-env.sh`](../../../scripts/agent-env.sh) | — |
| Portal CLI wrapper | [`tools/portal-secret.ts`](../../../tools/portal-secret.ts) · `bun run portal:secret` / `portal-cli secret` | thin `pass-cli` only |
| Vault map display | [`config/vault-map.toml`](../../../config/vault-map.toml) · [`lib/security/vault-map.ts`](../../../lib/security/vault-map.ts) | label/color/icon (`type: "toml"`) |

### Portal `secret` subcommand

```bash
bun run portal:secret:which          # Bun.which pass-cli
bun run portal-cli secret help
bun run portal-cli secret get 'pass://factorywager/Cloudflare API Token/password'
bun run portal-cli secret run --env-file env.template -- bun run cloudflare:env:validate
bun run portal-cli secret autofill --vault factorywager -- ./start-agent.sh
bun run portal-cli secret map        # label/color/icon status (no secret values)
bun run portal-cli secret inject -i env.template -o .env -f
bun run portal-cli secret invite accept <INVITE_ID>
```

Maps to real CLI only (verified against pass-cli 2.2.3 source): `item view` / `item list --output json` / `run` / `inject` / `invite accept` / `share list` / `item share` / `vault share` / `vault member` / `item member`. No phantom flags, no invented secure-link URL accept (use invite id); shares are by email, one per call, roles `viewer|editor|manager`; revoke via `member … remove --member-share-id`. Autofill injects vault item passwords as env names derived from titles (`--parallel` fetches concurrently; `--json` prints a value-free `{injected, missing, errors}` report for `jq`, report-only when `--` is omitted); prefer `run --env-file` when a template exists. Status lines use vault-map label/color/glyph (never secret values).

### Vault map (display chrome)

**Source SSOT:** [`config/vault-map.toml`](../../../config/vault-map.toml) — Bun-native TOML (`import … with { type: "toml" }`), no JSON parse step for the map itself.

| Layer | Role |
|-------|------|
| [`env.template`](../../../env.template) | Machine truth: `KEY={{ pass://vault/item/field }}` ([secret references](https://protonpass.github.io/pass-cli/commands/contents/secret-references/)) |
| [`config/vault-map.toml`](../../../config/vault-map.toml) | Display chrome: `label` / `color` / `icon` / `glyph` / `type` + optional vault/item/field |
| [`lib/security/vault-map.ts`](../../../lib/security/vault-map.ts) | Normalize TOML `[env.KEY]` → bundle; `Bun.color` status lines (ansi-16m) |
| [`tools/vault-resolver.ts`](../../../tools/vault-resolver.ts) · `bun run vault:resolve` | List map entries (no secret values) |
| `public/registry/vault-map.json` | **Baked artifact** for portal `/portal/env/` (`bun run env:inventory:bake`) — not the edit SSOT |
| `config/vault-map.json` | Legacy fallback only — do not edit; prefer TOML |

```ts
// Prefer static import attribute (bundler + runtime loader)
import vaultMap from '../config/vault-map.toml' with { type: 'toml' };
// Dynamic: const mod = await import('../config/vault-map.toml', { with: { type: 'toml' } });
// Text: Bun.TOML.parse(await Bun.file('config/vault-map.toml').text())
```

Bun docs: [Import a TOML file](https://bun.com/docs/guides/runtime/import-toml) · [`Bun.TOML`](https://bun.com/docs/runtime/toml) · [loader:toml](https://bun.com/docs/bundler/loaders#toml).

TOML shape: `[metadata]`, `[env.KEY]` (`vault` / `item` / `field` / `label` / `color` / `type`), `[backlog]`. Paths align with Pass URIs (`pass://vault/item/field`) used by [`inject`](https://protonpass.github.io/pass-cli/commands/contents/inject/) (`{{ … }}`) and [`run`](https://protonpass.github.io/pass-cli/commands/contents/run/) (bare). Never stores secret values. Icons under `public/portal/icons/vault/`.

Template refs use `{{ pass://<vault>/<item>/<field> }}` — see root [`env.template`](../../../env.template).

## Agent Access

```bash
source scripts/agent-env.sh <project>
# Projects: factorywager, cloudflare, bet-ticker, cascade-mover, partners
# Always set: PROTON_PASS_AGENT_REASON="why" on pass-cli calls
```

Agent PATs (`pst_…`) live in gitignored **`.env.pass-tokens`** (or env). They are **not** the Cloudflare API token — they only authenticate `pass-cli` to vault shares via [`PROTON_PASS_PERSONAL_ACCESS_TOKEN`](https://protonpass.github.io/pass-cli/commands/login/#personal-access-token-login).

Mint / grant (main account) — official [typical workflow](https://protonpass.github.io/pass-cli/commands/personal-access-token/#typical-workflow):

```bash
pass-cli login
pass-cli pat create --name <bot> --expiration 1y
pass-cli pat access grant --pat-name <bot> --vault-name <vault> --role viewer
# Save pst_… into .env.pass-tokens as PROTON_PASS_<PROJECT>_TOKEN
```

## PAT Rotation

PATs expire 2027-07-27. To rotate ([`pat renew`](https://protonpass.github.io/pass-cli/commands/personal-access-token/#pat-renew)):

```bash
pass-cli pat renew --pat-name <name> --expiration 1y
# Update .env.pass-tokens only (never commit) — renew outputs a new token string
```

## SSH Agent

Daemon manages SSH keys from Personal vault.

- Socket: `~/.ssh/proton-pass-agent.sock`
- PID: `~/.ssh/proton-pass-agent.pid`
- Auto-start: `~/Library/LaunchAgents/com.proton.pass-cli.ssh-agent.plist`

## Orgs

- Org: **APEX-BIOLABS** (apexbiolabsdirect@proton.me)
- Domain: **factory-wager.com** (Cloudflare, Proton Mail)
- Users: admin@, dev@, bot@factory-wager.com
- Group: team@factory-wager.com

## Vault gaps (known)

| Template | Status | Notes |
|----------|--------|--------|
| root `env.template` | green | `bun run proton:check` factorywager |
| bet-ticker | green | R2 + INITIAL_TOKEN |
| cascade-mover | partial | Security items OK; **R2 login items not in vault yet** — commented in `cascade-mover-v3/env.template` until `R2 cascade-mover bucket` exists |
| scanner | green | CF token only |
| Cloudflare Access | blocked | Dedicated least-privilege Access token must be created in the Cloudflare dashboard, stored as `Cloudflare Access API Token`, then wired only after `proton:check` resolves it; see [`cloudflare-access.md`](cloudflare-access.md) |

When adding a secret: create the Proton Pass item first, then add `{{ pass://vault/item/field }}` to the matching `env.template`, then `bun run proton:check`.

After adding vault coverage, re-run `bun run env:inventory:vault` — the secret should move from “NOT in any env.template” to “used + vaulted”.

### Closing actionable gaps

**Two planes:**

| Plane | What | When |
|-------|------|------|
| **Machine-local mint** | `~/.factorywager/minted-secrets/<KEY>` | `pass-cli` dead / first boot |
| **Proton Pass inject** | `env.template` `pass://` → `.env` | multi-host SSOT |

```bash
bun run vault:gap:status         # Bun.inspect dashboard (offline-capable)
bun run vault:cli status         # same via tools/vault-cli.ts
bun run vault:gap:mint-local     # mint DOD + provision (+ play) to disk
bun run vault:gap:export-minted  # print pass-cli create lines for Terminal.app
bun run vault:gap:mint           # Pass CLI create (needs working pass-cli)
bun run vault:gap:wire           # env.template pass:// when Pass items exist
bun run vault:gap:close          # mint-local (+ Pass if available) + rebaseline
bun run env:inventory:ratchet    # human gaps only (OPENAI, SLACK)
bun run test:secrets             # one-shot secret ratchet tests
bun run test:secrets:watch       # continuous: bun test --watch secret-ratchet
bun run vault:cli:compile        # standalone ./vault binary (bun build --compile)
```

Continuous validation (`tests/secret-ratchet.test.ts`):

- Mintable keys resolve (env or `~/.factorywager/minted-secrets`)
- `getGapList()` is empty for **new** human gaps (within baseline)
- `SECRET_RATCHET_STRICT=1` → fail until OPENAI + SLACK are injected/vaulted

| Env key | Pass title | Ratchet? | Local mint? |
|---------|------------|----------|-------------|
| `DOD_PROOF_SECRET` | `DOD Proof Secret` | no | yes |
| `DOD_ID_ENCRYPTION_KEY` | `DOD ID Encryption Key` | no | yes |
| `PROVISION_ENCRYPTION_KEY` | `Provision Encryption Key` | no | yes |
| `OPENAI_API_KEY` | `OpenAI API Key` | **yes** | no |
| `SLACK_WEBHOOK_URL` | `Slack Webhook URL` | **yes** | no |
| `TELEGRAM_CATALOG_RESEARCH_LLM_KEY` | — | via OPENAI alias | no |
| `PLAY_SIGNING_SECRET` | `Play Signing Secret` | no | yes |
| `REPORT_SIGNING_SECRET` | `Report Signing Secret` | no | yes |

### Report / compliance HMAC (`REPORT_SIGNING_SECRET`)

Board integrity and deep-audit reports use [`lib/security/report-proof.ts`](../../../lib/security/report-proof.ts). Without a secret the digest is still tamper-detect (sha3-256); **HMAC** is only present when `REPORT_SIGNING_SECRET` (or fallback `PLAY_SIGNING_SECRET`) is injected or mint-local'd.

```bash
# Local mint (no Pass create required)
bun run vault:gap:mint-local     # writes ~/.factorywager/minted-secrets/REPORT_SIGNING_SECRET

# Prefer vault SSOT when ready:
#   pass://factorywager/Report Signing Secret/password
# Uncomment in env.template:
#   REPORT_SIGNING_SECRET={{ pass://factorywager/Report Signing Secret/password }}
bun run proton:inject:factorywager
bun run compliance:bake:vault    # bake with injected secret → board.integrity.proof.hmac
```

| Surface | How HMAC appears |
|---------|------------------|
| `public/registry/compliance-board.json` | `integrity.proof.hmac` + check `id: hmac` |
| Monitoring / ops-summary slice | `scoreHint: integrity+hmac` when present |
| Deep audit | `bun run ops:audit:deep` |

Full operator loop: [`compliance-portal.md`](compliance-portal.md). Bake ownership on Pages freshness: `ops:snapshot` (default) or `OPS_SNAPSHOT_COMPLIANCE=0` / `--no-compliance` to skip.

Code path: `requireSecret` / `requireMintableSecret` in [`lib/security/mintable-secret.ts`](../../../lib/security/mintable-secret.ts) — **env inject wins**, then local mint.

If `pass-cli` is **Killed: 9** (common in restricted agent hosts), use `mint-local` + export in Terminal.app / Pass UI.

CI: `harness-gates` runs `bun run env:inventory:ratchet` (hard fail on **new human** gaps only).

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| `echo 'CLOUDFLARE_API_TOKEN=…' >> ~/.reasonix/.env` | Update vault item → `bun run proton:inject:factorywager:reasonix` |
| Paste tokens into chat / shell history | Dashboard → Proton Pass item → inject |
| Treat `.env` as source of truth | Treat `.env` as generated; re-inject after rotation |
| Use `/user/tokens/verify` for `cfat_` tokens | Use account verify or `bun run cloudflare:env:validate` |
| Point template at vault items that do not exist | `bun run proton:check` before shipping template changes |

## DNS token & DKIM remediation

Audit-run findings (2026-07-27): the main account token (`CLOUDFLARE_API_TOKEN`) has **no** `Zone.DNS:Read/Edit` (verified 403) and no Access scope (verified 403). The separate vault item `Cloudflare API Token (DNS)` → `CLOUDFLARE_DNS_API_TOKEN` **has** `Zone.DNS:Read` (verified HTTP 200 on `dns_records`) **and** `Zone.DNS:Edit` (verified via invalid-type probe returning 400-validation, not 403 — same result for the duplicate `API Token DNS (factory-wager.com)` item in the `cloudflare` vault; both DNS tokens are mutation-capable, so `--apply` needs no new token). The three Proton DKIM CNAMEs (`protonmail[23]._domainkey.factory-wager.com`) **already exist and resolve publicly** — confirmed via the API and DNS-over-HTTPS (plain `dig` to 1.1.1.1 is blocked on this network; use `curl -H 'accept: application/dns-json' https://cloudflare-dns.com/dns-query?name=...&type=CNAME`). DKIM values were not needed from the vault; no vault item holds them (they live in the Proton dashboard).

pass-cli incident (2026-07-27, resolved): every new `pass-cli` exec was instantly SIGKILLed — kernel `load code signature error 2` ("embedded signature doesn't match attached signature") after the binary was rewritten in place at 03:35; the long-running ssh-agent daemon survived on the old inode. `codesign --verify` passed on disk, and a copy at a fresh path ran fine → stale code-signature state on the replaced inode. Repair: byte-identical inode refresh (`cp` → `mv` over `~/.local/bin/pass-cli`, backup at `/tmp/pass-cli-backup-20260727`). If it recurs, reinstall pass-cli from Proton instead.

Human steps if DNS records ever need (re)applying:

1. Mint/confirm a Cloudflare token with `Zone.DNS:Edit` scoped to the `factory-wager.com` zone.
2. Store it in the Proton vault item `Cloudflare API Token (DNS)` (field `password`).
3. `bun run proton:inject:factorywager:reasonix` — writes `CLOUDFLARE_DNS_API_TOKEN` into `~/.reasonix/.env`.
4. Get the three DKIM targets from the Proton dashboard → Domain names → factory-wager.com → DKIM (per-domain, not in the vault). Export as `PROTON_DKIM_TARGET_1/2/3` (order: `protonmail`, `protonmail2`, `protonmail3`).
5. `bash scripts/cloudflare-dns-sync.sh` (dry-run) → `bash scripts/cloudflare-dns-sync.sh --apply`.
6. Verify: `dig +short CNAME protonmail._domainkey.factory-wager.com` (or the DoH command above where port 53 is blocked).
