# Remaining Work — FactoryWager Surfaces, Integrations, Domains

> Execution outline for agents. Every task carries: owner, prerequisites, exact steps, verification, and the SSOT to update on completion.
> State verified 2026-07-28 (dig + curl + CF API + R2 SigV4). SSOTs: `config/surfaces.toml`, `public/registry/surfaces-state.json`, `public/registry/bunfig-state.json`, `docs/harness/tenants/tunnel-inventory.md`, `.cloudflare-access.yml`, ADR-0002 (`docs/adr/0002-registry-index-ssot.md`).

## Domain map (who owns what)

| Domain | SSOT / tenant doc | Gate |
|---|---|---|
| Surfaces & DNS | `config/surfaces.toml` → `surfaces:bake` | `surfaces:check` (cross-check vs Access yml, wrangler, r2-env) |
| Tunnels | `docs/harness/tenants/tunnel-inventory.md` (machine state in `~/.cloudflared/`) | manual `dig` + `curl` |
| Access / SSO | `.cloudflare-access.yml` + `docs/harness/tenants/cloudflare-access.md` | `lib/verification/cloudflare-access-policy.ts` |
| Registry / R2 | ADR-0002 · `lib/factory/http-keys.ts` (read allowlist) | `functions/api/registry/[[path]].ts` 405 contract |
| Bunfig / install | `docs/UNIFIED.md` · `~/.bunfig.toml` | `bunfig:check` · `audit-bunfig --strict` |
| Env / TOML constants | `env:inventory:bake` (schema v4) | `env:inventory --ratchet` |
| Portal | `docs/portal-foundation.md` | `verify:portal:static` |

---

## Track A — External / human credentials (agents CANNOT complete from repo)

### A1. Delete dead tunnel `293ba37a-844f-413d-8b40-b9a9f8ae1c2a`
- **Owner:** human with access to the *other* Cloudflare account (not FactoryWager `7a470541…` — verified `cfd_tunnel` = 0 there, both IDs 404).
- **Steps:** dashboard → Zero Trust → Networks → Tunnels → delete `293ba37a-…`.
- **Verify:** `curl https://api.cloudflare.com/.../cfd_tunnel/293ba37a-…` 404s in the owning account.
- **Update:** `docs/harness/tenants/tunnel-inventory.md` credentials table (remove row).

### A2. Remove orphan credential file
- **Owner:** human (machine-local, destructive). Prereq: A1 done (tunnel gone).
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

### A5. support.factory-wager.com re-add (optional)
- **Owner:** human (HelpScout admin). Prereq: custom-domain SSL configured in HelpScout FIRST.
- **Steps:** re-create CNAME `support → helpscout.com` via DNS token; verify not-525.
- **Update:** `config/surfaces.toml` (retired → live/external), rebake.

---

## Track B — Repo / agent-executable

### B1. Cross-lane test failures — ✅ DONE 2026-07-28 (tree green, 109 pass 0 fail; SKIP no longer needed. NOTE: bun test --changed hangs intermittently at 0% CPU — verified transient, rerun completes)
- **Failures:** `proof-consistency` ×4 (dirty proof JSONs from in-flight bakes: channel-meta, install-platform, release-features), `verify-bun-release` ×2 (network probes to bun.com).
- **Owner:** the sessions that own those lanes; any agent can verify closure.
- **Steps (owners):** finish/revert the dirty bakes (`public/registry/channel-meta-bake.json`, `install-platform.json`, `release-features.json`), then `bun test --changed --bail=1` must be green.
- **Verify:** `bun test --pass-with-no-tests --changed --parallel --bail=1` → 0 fail; then stop using `SKIP_TEST_CHANGED` for commits.

### B2. Verify bunfig board renders post-Access
- **Owner:** agent with an Access session (browser login or service token).
- **Steps:** open `https://score.factory-wager.com/portal/bunfig/` after Access auth; confirm stat cards + provenance table render from `/registry/bunfig-state.json`.
- **Fallback check (no auth):** `curl` returns 302 (correct); data plane verified via `/registry/bunfig-state.json` = 200 (already done).

### B3. Vanity CNAMEs decision (health., telegram.)
- **Owner:** human decision; agent executes.
- Current: both CNAME → Pages app, serve landing page (misleading). Real endpoints are paths on score.
- Options: (a) leave + keep docs accurate (done), (b) add Pages `_redirects` 301s `health.factory-wager.com → score.factory-wager.com/health` etc. (needs host-scoped redirect rules — CF Page Rules or Snippets; `_redirects` is path-only), (c) delete CNAMEs.
- Recommend (a) — zero risk, docs already correct.

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

### C2. Access service token for non-interactive probes
- Mint `CF Access: Service Token` in the owning account → vault it → use for CI checks that portal returns 302/200 appropriately (currently untestable anonymously beyond 302).

### C3. launchd for ledger dev variant (only if used)
- Mirror `com.factorywager.ledger-tunnel.plist` for `config-ledger-dev.yml` (`/app/*` → Vite :5173). Skip unless the dev tunnel is actually used.

---

## Execution order

1. **B1** (unblock clean commits) → 2. **A3** (reasonix, unblocks access-yml cleanliness) → 3. **A1+A2** (tunnel cleanup, needs other account) → 4. **B5/B6** (paired product decision) → 5. **A4, B3, B4** (small confirmations) → 6. **C*** (hardening at leisure).

## Done already (for reference — do not redo)

bunfig machine SSOT + excludes + `frozenLockfile` drift · workspace bunfig dedupe · env-inventory TOML plane (v4) · `bake:all` + `portal-cli badge|bunfig|dashboard --list` · `/portal/bunfig/` board · surfaces.toml SSOT + `surfaces:bake` + cross-checks + `/portal/surfaces/` board + doctor check · Access applied (ledger, score/portal, pages.dev/portal) · terminal.+support. CNAMEs retired · 12 edge handlers GET-guarded (405 in prod) · R2 artifact plane activated with verified Tennis HQ SSOT 1.5.0 · ledger tunnel launchd · DNS zone fully mapped · `misson-control` zone removed · registry docs placeholder/bucket-reality notes.
