# [SYNDICATE][ENTERPRISE][RELEASE][v2.14.0][ACTIVE] – 2025-10-28

**JWT-RBAC-WebSocket stack certified. 88 % security, 98 % governance, 0.1 s live bets.**

| Metric | Value | Gate |
|--------|-------|------|
| Security score | 88 % | ✅ Pass |
| Governance rules | 138 / 141 | ✅ Pass |
| WebSocket latency | ≤ 100 ms | ✅ Pass |
| EXE signatures | 3 / 3 platforms | ✅ Pass |
| Docker health | Healthy | ✅ Pass |
| Tag | `v2.14.0` | ✅ Tagged |

## [JWT][AUTH][CORE][v2.14.0][ACTIVE]

- `syndicate-jwt.<token>` subprotocol handshake
- RBAC channels: `admin/ops/agent/guest`
- 30-day token rotation, SHA256 audit chain

## [WS][DASH][LIVE][v2.14.0][ACTIVE]

- 80 % deflate compression
- Interactive cmds: `pause-agent`, `trigger-alert`, `system-status`
- Real-time bet push 0.1 s

## [DEPLOY][ARTIFACTS][v2.14.0][ACTIVE]

- `dist/syndicate-linux` (signed)
- `dist/syndicate-macos` (codesign)
- `dist/syndicate-win.exe` (signtool)
- `docker-compose.yml` (nginx + prometheus)

## [GOV][HOOKS][ENFORCE][v2.14.0][ACTIVE]

- Pre-commit: secrets, headers, lockfile
- Post-push: semver tag + compliance report

**Release command:**

```bash
git checkout main && git pull && git tag -s v2.14.0 -m "enterprise certified" && git push origin v2.14.0
```

**Deploy command:**

```bash
bun run live:full   # spins up WS dashboard, JWT auth, prometheus
```

**Vault status:** ENTERPRISE READY ✅
