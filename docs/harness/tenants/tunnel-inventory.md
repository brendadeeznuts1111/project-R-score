# Tenant: tunnel-inventory

**Tenant** `cloudflared-tunnels` (machine-side cloudflared state, `~/.cloudflared/`)
**Scope** Local tunnels for `factory-wager.com` hostnames — audited 2026-07-27, re-verified 2026-10-06
**Owner** human (no repo SSOT; configs are machine-local)

## Tunnels

| Tunnel | Hostname | Target | Config file | Status |
|--------|----------|--------|-------------|--------|
| `accounting-ledger` (`2029fc06-…`) | `ledger.factory-wager.com` | `http://127.0.0.1:3000` | `~/.cloudflared/config-ledger.yml` | DNS resolves; Access 302 on 2026-10-06. Origin `:3000` was down. LaunchAgent plist exists and is not loaded. |
| `accounting-ledger` dev variant | `ledger.factory-wager.com` `/app/*` | `http://127.0.0.1:5173` (Vite) | `~/.cloudflared/config-ledger-dev.yml` | Manual only. `:5173` was down on 2026-10-06. No dev LaunchAgent. |
| prometheus (`fa7dbf98-…`) | — none (catch-all only) | `http://localhost:9090` | `~/.cloudflared/prometheus-config.yml` | No hostname ingress; no DNS route known |
| `reasonix-serve` | `reasonix.factory-wager.com` (would be) | `http://localhost:8787` | ~~`scripts/cloudflared-reasonix.yml`~~ | **DECOMMISSIONED 2026-07-28** — template deleted, staged Access app dropped, surface retired |

The ledger ingress comments used to claim `bun run tunnel:init`. No such script exists in the monorepo. On 2026-10-06 those two comments were rewritten so they no longer name a generator. The files stay machine-local.

## Credentials (`~/.cloudflared/`)

| File | Referenced by | Status |
|------|---------------|--------|
| `2029fc06-5bbf-415e-9fa1-6b7d3f0b1527.json` | `config-ledger.yml`, `config-ledger-dev.yml` | Live (`accounting-ledger`) |
| `fa7dbf98-3128-4b8d-9b6e-6e0e7fd2c8e6.json` | `prometheus-config.yml` | Live (prometheus tunnel) |
| `293ba37a-844f-413d-8b40-b9a9f8ae1c2a.json` | **nothing** | **Orphaned** — was the tunnel behind deleted `terminal.factory-wager.com` CNAME (removed 2026-07-28). Still on disk 2026-10-06 (`-r--------`, 175 bytes). Delete only after the owning account deletes the tunnel. |
| `3b081e1e-9bd7-4f6e-b953-084940fa0503.json` | `config-dsh.yml`, `config-kalshi-research.yml` | Local credential for `dsh.misson-control.com` (resolves, Access 302). The Kalshi research ingress uses the same tunnel; `kalshi.research.factory-wager.com` did not resolve on 2026-10-06. |
| `cert.pem` | cloudflared login | Full-account origin cert |

Credential files were **left in place**; deletion is a human decision.

## DNS (re-verified live 2026-10-06)

| Hostname | Resolves | Serving |
|----------|----------|---------|
| `ledger.factory-wager.com` | Yes — Cloudflare proxy IPs | 302 → Cloudflare Access login |
| `terminal.factory-wager.com` | **No** | CNAME **deleted 2026-07-28** (was dangling tunnel → 502). Brand/DNS overview: [`docs/brand-alignment.md`](../../brand-alignment.md) |
| `reasonix.factory-wager.com` | **No** | — |
| `support.factory-wager.com` | **No** | CNAME deleted 2026-07-28. Still retired. |

## Service management

**launchd plist installed 2026-07-28, not loaded on 2026-10-06.** `~/Library/LaunchAgents/com.factorywager.ledger-tunnel.plist` is still on disk. `launchctl` has no `com.factorywager.ledger-tunnel` service in the user gui domain. `127.0.0.1:3000` and `:5173` did not accept connections. Leave the agent unloaded until the ledger origin is up. The plist runs `cloudflared tunnel --config ~/.cloudflared/config-ledger.yml run` with RunAtLoad + KeepAlive and logs to `~/.cloudflared/ledger-tunnel.{out,err}.log`. Binary: `/opt/homebrew/bin/cloudflared`.

**Tunnel ownership (re-checked 2026-10-06):** FactoryWager account `7a470541…` returns **0** tunnels from `cfd_tunnel` for both the Pages token and the Access token (HTTP 200). GET of `293ba37a-…`, `2029fc06-…`, `fa7dbf98-…`, and `3b081e1e-…` with the Pages token returns **401 Not authorized**, not 404. The earlier "both IDs 404" note is stale. Zone CNAMEs can still point at a tunnel in another account. Deleting `293ba37a-…` requires that account. No FactoryWager vault token can do it. The `~/.cloudflared/cert.pem` origin cert belongs to that other account. Do not delete the local `293ba37a-….json` until the owning-account delete returns 404.

## Repo-side template

~~`scripts/cloudflared-reasonix.yml`~~ — **deleted 2026-07-28** (decommissioned; never installed, DNS never existed, tunnel creation needs the other CF account). Re-create from scratch if the surface is ever wanted.

## Gaps / recommended actions

1. ~~**Access policy in front of `ledger.factory-wager.com`**~~ — **DONE 2026-07-28** (Access app live; verified 302 to Access login). Also applied same day: `score…/portal` + `project-r-score.pages.dev/portal` (302 verified). All staged apps resolved (reasonix decommissioned — see 4).
2. ~~**launchd service for HA**~~ — plist installed 2026-07-28. **Not loaded on 2026-10-06**, and the origin was down. Do not boot it until `:3000` is serving.
3. **Orphan credential** — still open. `293ba37a-…json` remains because the dead tunnel can only be deleted in the other Cloudflare account (A1, then A2).
4. ~~**`reasonix-serve`: install or decommission**~~ — **DECOMMISSIONED 2026-07-28** (template deleted, Access app dropped, `surfaces.reasonix` retired).
5. ~~**`tunnel:init` generator missing**~~ — **RESOLVED 2026-10-06**: the two ledger comments no longer claim a generator. The script was not added.
6. ~~**`terminal.factory-wager.com` dangling (502)**~~ — **RESOLVED 2026-07-28**: zone CNAME removed; host does not resolve. Not Sports Terminal. Full domain map: [`docs/brand-alignment.md`](../../brand-alignment.md).

## Retirement

Remove when tunnels are centrally managed (dashboard-named tunnels / IaC) and machine-local configs are gone.

**Fresh-rerun** `ls ~/.cloudflared/ && dig +short ledger.factory-wager.com && curl -sI https://ledger.factory-wager.com/ | head -3`
