# Remaining Work — FactoryWager Surfaces, Integrations, Domains

> Execution outline for agents. Every task carries: owner, prerequisites, exact steps, verification, and the SSOT to update on completion.
> State verified 2026-10-06 (dig + curl + Access list + tunnel list). SSOTs: `config/surfaces.toml`, `public/registry/surfaces-state.json`, `public/registry/bunfig-state.json`, `docs/harness/tenants/tunnel-inventory.md`, `.cloudflare-access.yml`, ADR-0002 (`docs/adr/0002-registry-index-ssot.md`).
>
> Open work is A1, A2, A5, B2, and deferred C2. Everything else in this file is done or explicitly skipped.

## Domain map (who owns what)

| Domain | SSOT / tenant doc | Gate |
|---|---|---|
| Surfaces & DNS | `config/surfaces.toml` → `surfaces:bake` | `surfaces:check` (cross-check vs Access yml, wrangler, r2-env) |
| Tunnels | `docs/harness/tenants/tunnel-inventory.md` (machine state in `~/.cloudflared/`) | manual `dig` + `curl` |
| Access / SSO | `.cloudflare-access.yml` + `docs/harness/tenants/cloudflare-access.md` | `cloudflare:access:verify`, then `cloudflare:access:drift` |
| Registry / R2 | ADR-0002 · `lib/factory/http-keys.ts` (read allowlist) | `functions/api/registry/[[path]].ts` 405 contract |
| Bunfig / install | `docs/UNIFIED.md` · `~/.bunfig.toml` | `bunfig:check` · `audit-bunfig --strict` |
| Env / TOML constants | `env:inventory:bake` (schema v4) | `env:inventory --ratchet` |
| Portal | `docs/portal-foundation.md` | `verify:portal:static` |

---

## Track A — External / human credentials (agents CANNOT complete from repo)

### A1. Delete dead tunnel `293ba37a-844f-413d-8b40-b9a9f8ae1c2a` — blocked
- **Owner:** human with access to the *other* Cloudflare account (not FactoryWager `7a470541…`).
- **Re-checked 2026-10-06:** that account's tunnel list returns 200 with 0 tunnels for both the Pages token and the Access token. GET of this id with the Pages token returns **401 Not authorized**, not 404.
- **Steps:** in the owning account, dashboard → Zero Trust → Networks → Tunnels → delete `293ba37a-…`.
- **Verify:** the same GET returns 404 in the owning account.
- **Update:** `docs/harness/tenants/tunnel-inventory.md` credentials table (remove row).

### A2. Remove orphan credential file — blocked on A1
- **Owner:** human (machine-local, destructive). Prereq: A1 done (tunnel gone).
- **Re-checked 2026-10-06:** `~/.cloudflared/293ba37a-844f-413d-8b40-b9a9f8ae1c2a.json` is still present (`-r--------`, 175 bytes). Leave it until A1 is done in the owning account.
- **Steps:** `rm ~/.cloudflared/293ba37a-844f-413d-8b40-b9a9f8ae1c2a.json`
- **Update:** `tunnel-inventory.md` credentials table.

### A3. reasonix decision (install OR decommission) — ✅ DONE 2026-07-28 (branch 2: decommissioned)
- **Owner:** human decision; agent executes either branch.
- **Constraint:** tunnel creation needs the *other* CF account (same as A1).
- Branch 1 (install): create tunnel + credential in owning account → add DNS CNAME `reasonix.factory-wager.com → <id>.cfargotunnel.com` (DNS token works for this) → install `scripts/cloudflared-reasonix.yml` → verify 200.
- Branch 2 (decommission): delete `scripts/cloudflared-reasonix.yml`, drop the reasonix app from `.cloudflare-access.yml`, mark `surfaces.reasonix` `status = "retired"` in `config/surfaces.toml`, rebake `surfaces:bake`, run `bun test tests/bake-surfaces.test.ts`.
- **Update:** surfaces.toml + tunnel-inventory + cloudflare-access.md.

### A4. `_probe/channel-plane.txt` in R2 — ✅ DONE 2026-07-28 (deleted; bucket 12→11)
- **Owner:** channels pipeline owner. 27 B leftover probe object in `factory-wager-registry`.
- **Steps:** delete via `Bun.S3Client` (`client.file("channels/_probe/channel-plane.txt").delete()`) with `R2_ACCESS_KEY_ID/SECRET` from env.
- **Verify:** `client.list()` shows 11 objects (was 12).

### A5. support.factory-wager.com re-add (optional) — not started
- **Owner:** human (HelpScout admin). Prereq: custom-domain SSL configured in HelpScout FIRST.
- **Re-checked 2026-10-06:** `support.factory-wager.com` does not resolve. Do not recreate the CNAME until HelpScout SSL exists.
- **Steps:** re-create CNAME `support → helpscout.com` via DNS token; verify not-525.
- **Update:** `config/surfaces.toml` (retired → live/external), rebake.

---

## Track B — Repo / agent-executable

### B1. Cross-lane test failures — ✅ DONE 2026-07-28 (tree green, 109 pass 0 fail; SKIP no longer needed. NOTE: bun test --changed hangs intermittently at 0% CPU — verified transient, rerun completes)
- **Failures:** `proof-consistency` ×4 (dirty proof JSONs from in-flight bakes: channel-meta, install-platform, release-features), `verify-bun-release` ×2 (network probes to bun.com).
- **Owner:** the sessions that own those lanes; any agent can verify closure.
- **Steps (owners):** finish/revert the dirty bakes (`public/registry/channel-meta-bake.json`, `install-platform.json`, `release-features.json`), then `bun test --changed --bail=1` must be green.
- **Verify:** `bun test --pass-with-no-tests --changed --parallel --bail=1` → 0 fail; then stop using `SKIP_TEST_CHANGED` for commits.

### B2. Verify bunfig board renders post-Access — needs a browser session
- **Owner:** human or agent with an Access browser login. Do not mint a service token for this.
- **Re-checked 2026-10-06 (anonymous):** `https://score.factory-wager.com/portal/bunfig/` returns 302 to the Access login. `https://score.factory-wager.com/registry/bunfig-state.json` returns 200. `.env` has no Access service-token client id, so the logged-in board was not opened.
- **Steps:** open `https://score.factory-wager.com/portal/bunfig/` after Access auth; confirm stat cards + provenance table render from `/registry/bunfig-state.json`.

### B3. Vanity CNAMEs decision (health., telegram.) — ✅ DONE 2026-10-06 (option a: leave)
- **Owner:** human decision; recorded here as leave.
- Current: both CNAME → Pages app and serve the landing page. Real endpoints stay paths on score.
- **Re-checked 2026-10-06:** `health.factory-wager.com` and `telegram.factory-wager.com` return 200. `https://score.factory-wager.com/health` returns 200. `config/surfaces.toml` and `docs/brand-alignment.md` already call the hosts vanity. No DNS change.

### B4. R2 bucket multi-tenancy note — ✅ DONE 2026-07-28 (option a: ADR-0002 addendum, accepted)
- **Owner:** architect decision; agent documents.
- Current: `factory-wager-registry` holds registry index + telegram channels + cursors (12 objects). Read plane is safe (allowlist in `lib/factory/http-keys.ts` never exposes `channels/*`); writes share one credential set.
- Options: (a) document as accepted (add ADR note), (b) split channels to a dedicated bucket + rebind webhook function.
- Recommend (a) — the allowlist is the enforced boundary; split only if write-scope separation is ever needed.

### B5. ADR-0002 artifact plane — ✅ ACTIVATED 2026-08-04

- **Owner:** product decision; completed via the direct-to-R2 lane.
- Published `@tennis-hq/ssot@1.5.0` with `bun run factory:publish -- <archive>` to
  `@tennis-hq/ssot/1.5.0.tgz`.
- Verified R2 download size and SHA-256 through `RegistryClient.install()`, then
  refreshed the committed registry snapshot and Tennis tenant slice.

### B6. registry-write.internal — ✅ DONE 2026-07-28 (dropped: surface retired, ADR addendum)
- **Owner:** product decision (pairs with B5).
- If B5-branch-1: provision a private publish origin (Worker/Pages Function with Bearer auth, or the local gateway fronted by an Access service-token tunnel) and update `publishUrl` examples.
- If B5-branch-2: mark `surfaces.registry_write` `status = "retired"`, remove from docs, rebake.

---

## Track C — Hardening (optional, agent-executable)

### C1. Live `--probe` mode — ✅ DONE 2026-07-28 (97c837654; first run 13/13 match, retired hosts confirmed NXDOMAIN)
- Add opt-in `dig`/`curl` re-verification of each surface's status (offline default stays). Turns the "verified 2026-07-28" note into a repeatable gate.
- Steps: add `--probe` flag → per surface, DNS resolve + HTTPS status → compare with TOML status → report drift (fail on mismatch with `--check`).
- Tests: mock fetch; assert drift detection on a stale status.

### C2. Access service token for non-interactive probes — deferred
- Not minted on 2026-10-06. Anonymous checks already prove the Access 302 and the public registry 200. Mint a vaulted service token only when someone asks for a non-interactive authenticated portal probe.

### C3. launchd for ledger dev variant (only if used) — skipped 2026-10-06
- `~/.cloudflared/config-ledger-dev.yml` exists. Nothing accepted connections on `127.0.0.1:5173` or `:3000`. There is no dev LaunchAgent.
- The prod plist `~/Library/LaunchAgents/com.factorywager.ledger-tunnel.plist` is on disk (2026-07-28) and is **not loaded**. Leave it unloaded while the ledger origin is down.

---

## Execution order

1. **A1**, then **A2**, in the other Cloudflare account.
2. **B2**, with an Access browser session.
3. **A5** and **C2** only when a human asks for HelpScout or a non-interactive authenticated probe.

## Done already (for reference — do not redo)

bunfig machine SSOT + excludes + `frozenLockfile` drift · workspace bunfig dedupe · env-inventory TOML plane (v4) · `bake:all` + `portal-cli badge|bunfig|dashboard --list` · `/portal/bunfig/` board · surfaces.toml SSOT + `surfaces:bake` + cross-checks + `/portal/surfaces/` board + doctor check · Access applied (ledger, score/portal, pages.dev/portal) · scoped Access name, domain, 4h session, and email allowlist re-matched live 2026-10-06 (`bun run cloudflare:access:drift` exit 0) · B3 vanity CNAMEs left in place · C3 dev launchd skipped · terminal.+support. CNAMEs retired · 12 edge handlers GET-guarded (405 in prod) · R2 artifact plane activated with verified Tennis HQ SSOT 1.5.0 · DNS zone fully mapped · factory-wager `misson-control` zone removed (`dsh.misson-control.com` is a separate host and still returns Access 302) · registry docs placeholder/bucket-reality notes.
