# Proton Integration — Operations Runbook

**Token SSOT:** all API tokens, bot tokens, R2 keys, and registry secrets are stored in **Proton Pass** and resolved with **`pass-cli inject` / `pass-cli run`**. Do not mint into shell history or hand-append secrets to `~/.reasonix/.env` / `.env` as the authority path. Derived env files are a **cache** regenerated from vault templates.

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

## Env inventory (code ↔ vault)

Map harness `Bun.env.*` usage to `env.template` / Proton Pass refs (no secret values printed):

```bash
bun run env:inventory           # human summary
bun run env:inventory:vault     # vault coverage focus
bun run env:inventory:json      # machine JSON
bun run check:env-defaults      # optional config without fallback (harness)
bun run proton:check            # inject proof for all templates
```

| Signal | Meaning |
|--------|---------|
| Secrets used + vaulted | Code name appears in an `env.template` `pass://` ref |
| Secrets used but NOT in template | Candidate to add vault item + template line (or Bun.secrets service) |
| `check:env-defaults` fail | Optional config read lacks `\|\|` / `??` / guard |

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

Template refs use `{{ pass://<vault>/<item>/<field> }}` — see root [`env.template`](../../../env.template).

## Agent Access

```bash
source scripts/agent-env.sh <project>
# Projects: factorywager, cloudflare, bet-ticker, cascade-mover
# Always set: PROTON_PASS_AGENT_REASON="why" on pass-cli calls
```

Agent PATs (`pst_…`) live in gitignored **`.env.pass-tokens`** (or env). They are **not** the Cloudflare API token — they only authenticate `pass-cli` to vault shares.

## PAT Rotation

PATs expire 2027-07-27. To rotate:

```bash
pass-cli pat renew --pat-name <name> --expiration 1y
# Update .env.pass-tokens only (never commit)
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

When adding a secret: create the Proton Pass item first, then add `{{ pass://vault/item/field }}` to the matching `env.template`, then `bun run proton:check`.

After adding vault coverage, re-run `bun run env:inventory:vault` — the secret should move from “NOT in any env.template” to “used + vaulted”.

## Anti-patterns

| Do not | Do instead |
|--------|------------|
| `echo 'CLOUDFLARE_API_TOKEN=…' >> ~/.reasonix/.env` | Update vault item → `bun run proton:inject:factorywager:reasonix` |
| Paste tokens into chat / shell history | Dashboard → Proton Pass item → inject |
| Treat `.env` as source of truth | Treat `.env` as generated; re-inject after rotation |
| Use `/user/tokens/verify` for `cfat_` tokens | Use account verify or `bun run cloudflare:env:validate` |
| Point template at vault items that do not exist | `bun run proton:check` before shipping template changes |
