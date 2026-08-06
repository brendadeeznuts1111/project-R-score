# Enterprise Enhancement Plan v2.0 — Execution Blueprint (Stack-Corrected)

**Owner:** Engineering
**Target Go-Live:** 2026-08-25 (3 weeks from start)
**Status:** `DRAFT` → `IN_PROGRESS` (Phase 0–1)
**Merge Proof:** `bun run bun:ci`

---

## 0. Executive Summary

| Metric | Current | Target (30 days) | Delta |
|--------|---------|------------------|-------|
| D1 Monthly Cost | ~$530 | **$0** | −100% |
| Auth Coverage (MFA/Passkeys/Geo/Lockout) | 0/6 phases | **6/6 phases** | +600% |
| Cross-system signals (per hour) | 0 (manual) | **>100** | New capability |
| League config maintenance | 3 separate edits | **1 canonical edit** | −66% toil |
| API debugging workflow | 4 separate tools | **1 unified playground** | −75% context-switching |

---

## Phase 0 – Foundational Prep (Days 0–1, Parallel)

*Blocking prerequisite for all phases.*

| Task | Owner | Output | Verification |
|------|-------|--------|--------------|
| **0.1** Confirm R2 bucket `fw-shade-prod` exists with TTL policies | Infra | Bucket ARN, write keys | `bun run cloudflare:env:validate` |
| **0.2** Create feature-flag toggles in env / `config.toml`: `SHADE_PACKAGE`, `IDENTITY_LEGACY`, `SIGNAL_BRIDGE`, `UNIFIED_REGISTRY`, `CODEPOINT_V2` | Lead | All flags default `0` | `grep SHADE_PACKAGE .env` / `config.toml` |
| **0.3** Verify Grafana dashboard access for D1 vs R2 latency, auth error rates, signal bridge throughput | SRE | Dashboard URL | Manual smoke-test with probe |
| **0.4** Create GitHub Issues for Phase 1.1 and 1.2 | Agent | Issue #284, #285 | Issues open with AC and runbooks |

**Phase Gate 0:** `bun run bun:ci` passes on `main` with all new flags disabled.

---

## Phase 1 – Core Infrastructure & Security (Days 2–10)

---

### 1.1 Bet Ticker D1→R2 migration + extract `@factorywager/shade-pipeline` (6–8 days)

**GitHub Issue:** [#284](https://github.com/brendadeeznuts1111/project-R-score/issues/284)
**Labels:** `enhancement`, `phase-1`, `infrastructure`
**Branch:** `feat/shade-pipeline-extract`

#### Objective
Eliminate the $530/mo D1 cost by migrating all Bet Ticker read/write ops to R2, and extract the normalized odds engine into a local workspace package (`@factorywager/shade-pipeline`) that `cascade-mover` and `Registry` can import directly.

#### Day-by-Day Execution

| Day | Task | Success Criteria |
|-----|------|-------------------|
| **1** | Write `scripts/migrate-d1-to-r2.ts` using D1 HTTP API + R2 `bun:aws` client. Stream exports to temp files, upload with `x-amz-meta-checksum`. | Export row count matches D1 `SELECT COUNT(*)`; checksums verified on R2 head. |
| **2** | Build R2 read-adapter in `bet-ticker/src/adapters/r2.ts` with retry/backoff. Wrap it with the same `OddsRepository` interface as the D1 adapter. | `getOdds()` returns identical shape; p95 latency <5ms delta vs D1 in staging. |
| **3** | Extract domain logic (`normalizeOdds`, `sportMapping`, `rotationResolver`) into `packages/shade-pipeline/src/`. Add `bun build` for ESM/CJS. | `bun run build` inside package outputs `dist/index.js`; no runtime errors. |
| **4** | Update `bet-ticker`, `cascade-mover`, and `registry` to import from `@factorywager/shade-pipeline` via `"workspace:*"` in `package.json`. | All 3 services build with `bun build --compile` under `SHADE_PACKAGE=1`. |
| **5** | Chaos test: kill R2 connectivity, verify `SHADE_PACKAGE=0` falls back to D1 within 30s (no crash, just warn logs). | Logs show `D1_FALLBACK_ACTIVE`; health checks remain `200`. |
| **6** | Run `k6` load test against Bet Ticker (`/odds/stream`) – 500 concurrent users, 10k requests/min. | p95 R2 read < 50ms; p95 write < 200ms. |
| **7–8** | Staging canary (10% traffic for 24hrs). Cutover prod: set `SHADE_PACKAGE=1` in `config.toml` and `systemctl restart bet-ticker`. Monitor cost dashboard. | `D1` cost hits $0 after 24hr; `bun:ci` passes on all PRs. |

#### Acceptance Criteria

- [ ] `scripts/migrate-d1-to-r2.ts` exports to `fw-shade-prod` bucket.
- [ ] R2 objects have `x-amz-meta-row_count` and `x-amz-meta-checksum`.
- [ ] `@factorywager/shade-pipeline` is a workspace package (no `npm publish`; `bun link` works locally).
- [ ] `config.toml` for Bet Ticker contains `[shade] pipeline_enabled = true` (flag gate).
- [ ] Rollback: set `pipeline_enabled = false`, then `systemctl restart bet-ticker` (tested in staging).
- [ ] Grafana panel "D1 vs R2 op latency" shows R2 consistently faster.

#### Rollback Runbook

```bash
# 1. Disable pipeline flag in config.toml
sed -i 's/pipeline_enabled = true/pipeline_enabled = false/' /etc/bet-ticker/config.toml

# 2. Restart via systemd
systemctl restart bet-ticker

# 3. Verify fallback logs
journalctl -u bet-ticker -f | grep "D1_FALLBACK_ACTIVE"
```

---

### 1.2 Integrate `lib/identity` into Sports Terminal OS (4–6 days)

**GitHub Issue:** [#285](https://github.com/brendadeeznuts1111/project-R-score/issues/285)
**Labels:** `enhancement`, `phase-1`, `security`
**Branch:** `feat/identity-sports-terminal`
**Dependency:** Phase 1.1 (#284) complete + `bun run bun:ci` green

#### Objective
Make Sports Terminal OS the flagship identity showcase by adding MFA, WebAuthn passkeys, geo-blocking (via existing `ipapi.co` resolver), audit trails (to SQLite), and account lockout — all gated by a legacy env flag.

#### Day-by-Day Execution

| Day | Task | Success Criteria |
|-----|------|-------------------|
| **1** | Import `@factorywager/lib-identity` into Sports Terminal OS. Wrap the login handler with `enforceMFA()` middleware. Add UI for TOTP QR enrollment (saving backup codes to user profile). | User scans QR, enters 6-digit code, and sees "MFA Enabled" in settings. |
| **2** | Integrate WebAuthn passkey registration/login via `@simplewebauthn/browser`. Store credential IDs in `users.passkey_credential` (JSON column). | Passkey registration completes on Chrome/Safari; login with fingerprint/face works. |
| **3** | Geo-blocking: use the existing `defaultGeoResolver()` (which calls `ipapi.co` with 2s timeout). Block requests from non-US/UK/CA markets (configurable via `config.toml`). | Requests from blocked IPs return `403 Forbidden` with `X-Geo-Blocked: true` header. |
| **4** | Audit trail: write to `auth_audit` SQLite table (already used by `lib/identity`). Include `user_id`, `action`, `ip`, `geo_country`, `user_agent`, `timestamp`. | `SELECT * FROM auth_audit WHERE action = 'LOGIN_ATTEMPT'` returns new enriched rows. |
| **5** | Lockout policy: track failed attempts in Redis (or in-memory cache with TTL). After 5 failures in 15min, block login for that IP/user. Admin override via `pm2 restart` + env flag. | 6th attempt within window returns `429 Too Many Requests`; admin can clear with `LOCKOUT_BYPASS=1`. |
| **6** | UAT with 50 internal users. Run `IDENTITY_LEGACY=1 pm2 restart sports-terminal-os` to confirm old flow still works. | 0 auth regressions; legacy flag preserves session-only auth. |

#### Acceptance Criteria

- [ ] MFA required for all users with `role = "admin"` (configurable via `config.toml` → `[identity] enforce_mfa_roles = ["admin"]`).
- [ ] Passkey login includes `amr: ["mfa", "passkey"]` in issued JWT.
- [ ] Geo-block list lives in `config.toml: [identity] blocked_countries = ["RU", "CN"]` (default to non-US/UK/CA).
- [ ] `auth_audit` table stores full IP/geo/UA for every authentication event.
- [ ] Lockout threshold (`max_attempts = 5`, `window_seconds = 900`) configurable via env vars.
- [ ] Rollback: `IDENTITY_LEGACY=1 pm2 restart sports-terminal-os` bypasses all new checks.
- [ ] Dashboard "Auth Success Rate" > 99.95% over 24hr staging canary.

#### Rollback Runbook

```bash
# 1. Flip legacy env and restart via PM2
pm2 set sports-terminal-os IDENTITY_LEGACY 1
pm2 restart sports-terminal-os

# 2. Verify old session flow works
curl -I https://sports-terminal.internal/health | grep "200 OK"
```

---

## Phase 2 – Intelligence & Automation (Days 11–18)

---

### 2.1 Cross-system signal bridge: Cascade Mover → Partner Risk Engine (4–5 days)

**Branch:** `feat/signal-bridge`

#### Objective
Consume Cascade Mover's existing `AccumulationMessage` broadcasts (WebSocket `/ws` + MCP `/mcp/stream`) and feed them into Sports Terminal OS's Partner Risk Engine as normalized REST payloads. No new transport layer — just a thin adapter.

#### Architecture

```
Cascade Mover WS /ws  ──►  Signal Relay Worker  ──►  POST /api/partners/signal
     (JSON-LD)              (thin adapter)           (Partner Gateway evaluate())
```

#### Day-by-Day Execution

| Day | Task | Success Criteria |
|-----|------|-------------------|
| **1** | Map `AccumulationMessage` → `PartnerSignal` schema: `patternId`→`signalId`, `marketKey`→`market`, `confidence`→`confidence`, tier derived from confidence threshold. | Schema validation passes on sample messages. |
| **2** | Build `signal-relay` worker that subscribes to Cascade Mover WS `/ws` topic `cascade-events`. | Worker receives live messages; logs show parsed signals. |
| **3** | Wire relay to POST `PartnerSignal` to Sports Terminal OS `/api/partners/signal`. Add per-partner `min_tier` filter in `[cascade_bridge]` config section. | Partner profile TOML supports `enabled`, `min_tier`, `book_id`. |
| **4** | Add dead-letter queue (SQLite table `signal_dlq`) with exponential backoff retry. | Failed signals land in DLQ; retry 3× then alert. |
| **5** | Staging load test: simulate 10k signals/min. Validate Risk Engine adjusts exposure within 500ms. | p95 end-to-end latency < 1s; >100 signals/hr sustained. |

#### Acceptance Criteria

- [ ] Signal includes `sharp_money_pct` and `line_movement` fields mapped from indicator scores.
- [ ] Partner Risk Engine receives signal and logs decision (`ADJUST`, `IGNORE`, `ALERT`).
- [ ] >100 signals/hr sustained in prod (baseline).
- [ ] DLQ auto-retries up to 3 times; failed alerts go to on-call channel.
- [ ] Feature flag `SIGNAL_BRIDGE=1` enables relay; `0` falls back to no-op.
- [ ] Rollback: `systemctl stop signal-relay` stops consumption instantly.

---

### 2.2 Unified Profile & Registry Automation (5–6 days)

**Branch:** `feat/unified-registry`

#### Objective
One canonical YAML per league (`nfl.yaml`, `nba.yaml`) → transpiler → 3 output dialects (cascade-mover TOML, partner TOML, registry SQL).

#### Day-by-Day Execution

| Day | Task | Success Criteria |
|-----|------|-------------------|
| **1** | Design canonical schema (sport, teams, rotation, scoring_rules, scheduling_window) in `packages/registry-schema/src/schema.ts` with Zod validation. | Schema validates all 21 existing cascade-mover profiles. |
| **2** | Build `packages/registry-automation/src/transpile.ts` that reads canonical YAML and emits: Cascade Mover JSON, Partner Risk JSON, Registry SQL inserts. | `bun run transpile --league=nfl` produces 3 files with no data loss. |
| **3** | Add watch-mode + file watcher to auto-deploy on change (via GitHub Actions or `bun run registry:watch`). | Editing `nfl.yaml` triggers regeneration in <2s. |
| **4** | Migrate 5 test leagues (NFL, NBA, MLB, NHL, WNBA) to new canonical files. | Diff test: transpiled output matches committed legacy files exactly. |
| **5–6** | Validate outputs: cascade-mover boots, partner risk loads, registry inserts pass integrity checks. | All 3 systems start with zero config errors. |

#### Acceptance Criteria

- [ ] Editing `nfl.yaml` triggers 3 generated artifacts via `bun run registry:sync`.
- [ ] Schema validation fails build if required fields missing (Zod strict mode).
- [ ] Rollback: revert YAML commit and re-run transpile (old configs restored).
- [ ] Feature flag `UNIFIED_REGISTRY=1` enables transpiler in CI; `0` uses legacy manual files.
- [ ] Diff test: run sync, assert zero changes against committed generated files (idempotency proof).

---

## Phase 3 – Developer Experience (Days 19–22)

---

### 3.1 Promote `codepoint` → `api-inspector` active tooling (3–4 days)

**Branch:** `feat/api-inspector`

#### Objective
Unified playground for proxy debug, MCP introspection, and broadcast WebSocket tracing.

#### Day-by-Day Execution

| Day | Task | Success Criteria |
|-----|------|-------------------|
| **1** | Inventory `codepoint` capabilities; decide keep/merge/extract scope. | Documented decision in `api-inspector/ARCHITECTURE.md`. |
| **2** | Build Proxy Inspector panel: introspect Sports Terminal OS `GET /api/proxy/*` requests/responses with latency + status. | Last 50 requests visible with curl-like replay. |
| **3** | Build MCP Sandbox panel: browse and invoke all 62 cascade-mover MCP tools with live responses. | Tool list loads; invocation returns JSON. |
| **4** | Build Broadcast Monitor panel: connect to Bet Ticker WS and show live wager stream with message filtering. | Live wager cards render; filter by sport works. |

#### Acceptance Criteria

- [ ] `api-inspector` boots with `bun run dev` and serves React/Vite UI on configurable port.
- [ ] One UI can send requests to proxy, inspect MCP tool calls, and listen to broadcast events.
- [ ] Keyboard shortcuts: `Cmd+Enter` send, `Ctrl+Space` autocomplete.
- [ ] Export/Import request collections (JSON).
- [ ] Feature flag `CODEPOINT_V2=1` enables new UI; `0` serves legacy codepoint.
- [ ] Listed in `projects/active/README.md` under `tools/`.

---

## Phase 4 – Post-Launch Hygiene (Days 23–30, Ongoing)

*Not a delivery phase, but mandatory stabilization.*

| Task | Frequency | Owner |
|------|-----------|-------|
| **4.1** Monitor D1 cost dashboard — confirm $0 | Daily | SRE |
| **4.2** Audit identity logs (`auth_audit` table) for unusual geolocations | Weekly | Security |
| **4.3** Review signal bridge throughput & adjust relay worker concurrency | Bi-weekly | Backend |
| **4.4** Sweep legacy config files (delete after 2 weeks of `UNIFIED_REGISTRY=1`) | Day 30 | Lead |
| **4.5** Post-mortem template — document any rollbacks or anomalies | As needed | All |

---

## Dependency Graph

```
Phase 0 (Prep)
    │
    ▼
Phase 1.1 (Shade Pipeline) ──► Phase 2.1 (Signal Bridge)
    │                              │
    ▼                              ▼
Phase 1.2 (Identity) ◄───────────┘
    │
    ▼
Phase 2.2 (Unified Registry)
    │
    ▼
Phase 3.1 (API Inspector)
    │
    ▼
Phase 4 (Hygiene)
```

**Critical path:** P0 → P1.1 → P1.2 → P3.1 → P4 (12 days if parallelized well).

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| R2 write throttling under peak load | Med | High | Use multipart uploads; implement client-side backpressure |
| Passkey FIDO2 failures on older devices | Low | Med | Fallback to TOTP; log device model for metrics |
| Signal bridge overloads Risk Engine | Med | High | Rate-limit relay to 500 req/min; circuit breaker |
| Canonical schema misses edge case | Med | Med | Build schema validator with `x-tests` per league; allow custom overrides |
| API Inspector breaks proxy auth flow | Low | High | Run smoke tests against staging proxy before prod deploy |

---

## Success Metrics (SLIs)

| Enhancement | SLI | Target |
|-------------|-----|--------|
| Shade Pipeline | R2 read latency (p95) | < 50ms |
| Identity | Login success rate | > 99.95% |
| Signal Bridge | Signal delivery latency (p95) | < 1s |
| Unified Registry | Time to deploy new league | < 5min (from 45min manual) |
| API Inspector | DAU (internal devs) | > 80% of eng team weekly |

---

## Appendix: File Paths

| System | Key Files |
|--------|-----------|
| Bet Ticker | `projects/active/enterprise/bet-ticker-worker-v1.1/docs/adr/0009-migrate-d1-to-r2.md` |
| Cascade Mover | `projects/active/enterprise/cascade-mover-v3/profiles/*.toml`, `src/server/cascade-mover-mcp.ts` |
| Sports Terminal OS | `projects/active/sports-terminal-os/src/auth/jwt.ts`, `src/auth/session.ts`, `src/zones/partner-profile/partner-gateway.ts` |
| Identity | `lib/identity/README.md`, `lib/identity/identity.ts`, `lib/identity/http.ts` |
| Codepoint | `projects/experimental/codepoint/` |
| Registry | `projects/active/factorywager/registry/` |

---

## GitHub Issues

| Phase | Issue | Title |
|-------|-------|-------|
| 1.1 | [#284](https://github.com/brendadeeznuts1111/project-R-score/issues/284) | Phase 1.1 – Complete Bet Ticker D1→R2 migration + extract @factorywager/shade-pipeline |
| 1.2 | [#285](https://github.com/brendadeeznuts1111/project-R-score/issues/285) | Phase 1.2 – Integrate lib/identity into Sports Terminal OS |
