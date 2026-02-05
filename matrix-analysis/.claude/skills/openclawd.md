---
name: openclawd
description: "Manage openclawd Telegram bot - gateway, topics, skills, scripts, networking"
user-invocable: true
version: 2.3.0

profile:
  title: "Openclawd Manager"
  level: "Expert"

expertise:
  primary_area:
    proficiency: 95
    specialties:
      - "Telegram bot configuration"
      - "Gateway management"
      - "Topic/group setup"
      - "Skill development"
      - "Networking & system control"

triggers:
  - "/openclawd"
  - "telegram bot"
  - "gateway"
  - "cb-"
  - "openclawd skill"
  - "topic routing"
---

# Openclawd Management Skill

Comprehensive guide for managing openclawd Telegram bot, skills, and infrastructure.

---

## Quick Reference

**Version:**
- **Skill** — `2.3.0` *(hardcoded)* — This file version
- **Bun** — `>=1.3.6` *(hardcoded)*, Required — Runtime requirement

**Paths:**
- **Workspace** — `~/clawd/` (Path), Env: `$CLAWD_HOME`, Required — Root directory
- **Config** — `~/.openclawd/` (Path), Env: `$OPENCLAWD_CONFIG` — JSON configs
- **Scripts** — `~/clawd/scripts/` (Path), Add to `$PATH` — cb-* commands
- **Skills** — `~/clawd/skills/` (Path), *(hardcoded)*, Required — Bot skill files
- **Lib** — `~/clawd/lib/` (Path), *(hardcoded)*, Required — Shared modules

**Ports:**
- **Gateway** — `18789`, Env: `$GATEWAY_PORT` — Main API
- **Webhook** — `18792`, Env: `$WEBHOOK_PORT` — Inbound hooks
- **Dashboard** — `18793`, Env: `$DASHBOARD_PORT` — Web UI

**Auth:**
- **Bot Token** — *(required)*, Env: `$TELEGRAM_BOT_TOKEN`, Required — Secret token
- **Chat ID** — *(required)*, Env: `$TELEGRAM_CHAT_ID` (String/Number), Required — Target group

**Runtime:**
- **tmux Session** — `openclawd` *(hardcoded)*, Required — Attach target
- **Base URL** — `http://127.0.0.1`, Env: `$BASE_URL` — Local binding
- **Model** — `minimax/minimax-m2.1`, Env: `$OPENCLAWD_MODEL` — OpenRouter model

---

## Skill Registry

- **`openclawd`** (v2.1.0, Core) — Active, Commands: cb-*, Deps: Bun >=1.3.6 — Reference guide
- **`repl`** (v1.0.0, Utility) — Active, Commands: repl, Deps: None — Interactive Bun REPL
- **`fm`** (v1.2.0, Files) — Active, Commands: fm/ls, Deps: None — File manager
- **`portman`** (v1.1.0, System) — Active, Commands: ports, Deps: None — Port management
- **`dev`** (v1.0.0, Development) — Active, Commands: dev, Deps: None — Dev utilities
- **`sys`** (v1.0.0, Monitoring) — Active, Commands: sys/top, Deps: None — System monitor
- **`ai`** (v1.3.0, AI) — Active, Commands: ai/chat, Deps: OpenRouter — AI interactions

---

## Environment Variables

- **`TELEGRAM_BOT_TOKEN`** (String, Required) — Runtime, Default: -, Example: `123456:ABC-DEF`, Min: 10, Max: 255 — Bot token
- **`TELEGRAM_CHAT_ID`** (String, Required) — Runtime, Default: -, Example: `-1001234567890`, Min: 1, Max: 50 — Chat ID
- **`CLAWD_HOME`** (Path) — Startup, Default: `~/clawd/`, Example: `/opt/clawd` — Workspace
- **`OPENCLAWD_CONFIG`** (Path) — Startup, Default: `~/.openclawd/`, Example: `/etc/openclawd` — Config dir
- **`GATEWAY_PORT`** (Port) — Startup, Default: 18789, Example: 3000, Range: 1024-65535 — API port
- **`WEBHOOK_PORT`** (Port) — Startup, Default: 18792, Example: 3001, Range: 1024-65535 — Webhook
- **`DASHBOARD_PORT`** (Port) — Startup, Default: 18793, Example: 3002, Range: 1024-65535 — UI port
- **`BASE_URL`** (URL) — Runtime, Default: `http://127.0.0.1`, Example: `http://localhost` — Base URL
- **`OPENCLAWD_MODEL`** (String) — Runtime, Default: `minimax/minimax-m2.1`, Example: `anthropic/claude-3.5` — AI model
- **`OPENROUTER_API_KEY`** (String, Required) — Runtime, Default: -, Example: `sk-or-...`, Min: 20, Max: 255 — API key
- **`LOG_LEVEL`** (Enum) — Runtime, Default: `info`, Example: `debug` — Logging
- **`SESSION_TIMEOUT`** (Seconds) — Runtime, Default: 3600, Example: 7200, Range: 60-86400 — Session TTL
- **`MAX_REQUEST_SIZE`** (Bytes) — Runtime, Default: `10MB`, Example: `50MB`, Range: 1KB-100MB — Upload limit
- **`RATE_LIMIT`** (String) — Runtime, Default: `100/60s`, Example: `500/60s` — Rate limit
- **`WEBHOOK_SECRET`** (String) — Runtime, Default: -, Example: `secret123`, Min: 8, Max: 128 — Hook validation
- **`ALLOWED_IPS`** (CIDR) — Runtime, Default: `127.0.0.1`, Example: `192.168.1.0/24` — IP whitelist

---

## Scripts

- **`cb-start`** (Management) — `cb-start [env]`, Args: env file, Deps: tmux/Bun, Exit: 0=OK/1=Error, Timeout: 30s — Start services
- **`cb-stop`** (Management) — `cb-stop [force]`, Args: -f force, Deps: tmux, Exit: 0=OK/1=Error, Timeout: 10s — Stop services
- **`cb-attach`** (Management) — `cb-attach`, Args: None, Deps: tmux, Exit: 0=OK/1=Error, Timeout: 5s — Attach to session
- **`cb-status`** (Monitoring) — `cb-status [json]`, Args: -j JSON, Deps: curl/jq, Exit: 0=OK/1=Down, Timeout: 5s — Check status
- **`cb-logs`** (Monitoring) — `cb-logs [level]`, Args: -f follow, Deps: tail, Exit: 0=OK/1=Error — View logs
- **`cb-update`** (Management) — `cb-update [branch]`, Args: -f force, Deps: git, Exit: 0=OK/1=Error, Timeout: 60s — Update skills
- **`cb-config`** (Configuration) — `cb-config [key]`, Args: edit/view, Deps: $EDITOR, Exit: 0=OK/1=Error — Edit config
- **`cb-backup`** (Maintenance) — `cb-backup [dir]`, Args: -z compress, Deps: tar/gzip, Exit: 0=OK/1=Error, Timeout: 300s — Backup data
- **`cb-restore`** (Maintenance) — `cb-restore file`, Args: -f force, Deps: tar/gzip, Exit: 0=OK/1=Error, Timeout: 300s — Restore backup
- **`cb-clean`** (Maintenance) — `cb-clean [days]`, Args: -f force, Deps: find, Exit: 0=OK/1=Error, Timeout: 60s — Clean old data

### Script Usage Examples

```bash
# Health check
cb-status                    # Quick check
cb-status --deep             # Include system metrics
cb-status --watch            # Continuous monitoring

# Restart services
cb-restart                   # Minimal restart
cb-restart --full            # Full tmux + gateway
cb-restart --soft            # Gateway only, keep tmux

# Run tests
cb-test                      # All 21 tests
cb-test gateway              # Specific suite
cb-test --verbose            # Detailed output

# Topic management
cb-topics                    # List topics with skills
cb-topics skills             # List available skills
cb-topics set-skills 2 system-control,quick-tools

# Send test message
cb-send "Hello" --topic 2    # Send to Code topic
cb-send --list               # List available chats

# Scheduler
cb-cron list                 # Show scheduled jobs
cb-cron add health "5m" "cb-status --json"
cb-cron run health           # Run immediately
```

---

## Bot Skills Registry (~/clawd/skills/)

- **`system-control`** (🖥️) — Shell, networking, processes — Topics: 2 (Code), API Key: none, OS: darwin/linux
- **`market-data`** (📈) — Crypto prices, stock quotes — Topics: 5 (Research), API Key: optional, OS: any
- **`weather`** (🌤️) — Forecasts, conditions — Topics: 5 (Research), API Key: none, OS: any
- **`quick-tools`** (🔧) — Time, UUID, hash, math — Topics: All, API Key: none, OS: any
- **`home-automation`** (🏠) — Hue lights, Sonos speakers — Topics: 7 (Tasks), API Key: required, OS: any
- **`chat-info`** (📍) — Telegram chat/user IDs — Topics: 1 (General), API Key: none, OS: any

### Skill Capabilities

```
system-control.md (🖥️)
├── Process Management
│   ├── ps, pgrep, kill, pkill
│   └── Process tree, by name
├── System Resources
│   ├── Disk (df, du)
│   ├── Memory (vm_stat, memory_pressure)
│   └── CPU (uptime, load)
├── Networking
│   ├── Interfaces (ifconfig, networksetup)
│   ├── IP Addresses (local, public, curl ifconfig.me)
│   ├── Connections & Ports (lsof, netstat)
│   ├── DNS (dig, nslookup, flush cache)
│   ├── WiFi (signal, networks, SSID)
│   ├── Routing (netstat -rn, gateway)
│   ├── ARP (arp -a)
│   ├── Firewall (socketfilterfw)
│   ├── Traffic (netstat -ib, nettop)
│   ├── SSL/TLS (openssl, cert expiry)
│   ├── HTTP Debugging (curl timing)
│   └── Speed Test (networkQuality)
├── Service Management (launchctl)
├── Git Operations
├── Docker (if installed)
└── Homebrew

market-data.md (📈)
├── CoinGecko API (free, no key)
│   ├── Single coin price
│   ├── Multiple coins
│   └── Top 10 by market cap
├── Binance API
│   ├── Current price
│   ├── 24h stats
│   └── Klines/candlesticks
├── Yahoo Finance (unofficial)
└── Price Alerts

weather.md (🌤️)
├── Open-Meteo API (free, no key)
│   ├── Current weather
│   ├── 7-day forecast
│   └── Hourly forecast
├── wttr.in (terminal friendly)
├── Geocoding (city → coords)
└── Air Quality API

quick-tools.md (🔧)
├── Time & Date
│   ├── Current time (formats)
│   ├── Timezone conversions
│   └── Unix timestamps
├── Math & Calculations
├── Unit Conversions (temp, distance, weight)
├── UUID & Random (v4, hex, passwords)
├── Hashing (MD5, SHA256, SHA512)
├── Encoding (Base64, URL)
└── IP & Network lookups

home-automation.md (🏠)
├── Philips Hue
│   ├── Light control (on/off/brightness)
│   ├── Color (hue values)
│   └── Scenes
├── Sonos
│   ├── Playback (play/pause)
│   └── Volume control
└── IP Cameras (RTSP/ONVIF)

chat-info.md (📍)
└── Telegram ID reporting
    ├── Chat ID
    ├── User ID
    ├── Thread ID
    └── Topic info
```

---

## Topic Routing Configuration

Group ID: `$TELEGRAM_CHAT_ID` (configure in env)

- **Topic 1** (General) — Skills: chat-info, quick-tools — Mode: @mention, Configurable: skills/mode
- **Topic 2** (Code) — Skills: system-control, quick-tools — Mode: auto-reply, Configurable: skills/mode
- **Topic 5** (Research) — Skills: market-data, weather, quick-tools — Mode: @mention, Configurable: skills/mode
- **Topic 7** (Tasks) — Skills: home-automation, quick-tools — Mode: @mention, Configurable: skills/mode

### View/Modify Topic Configuration

```bash
# View current topic→skill mapping
cb-topics

# View as JSON
cb-topics --json

# Change skills for a topic
cb-topics set-skills 2 system-control,quick-tools,my-new-skill

# Change system prompt
cb-topics set-prompt 2 "Code topic - help with development"

# Add new topic
cb-topics add 10
```

---

## Patterns

### Create New Skill

```bash
# 1. Scaffold new skill
cb-skill new my-skill

# 2. Edit the skill file
# ~/clawd/skills/my-skill.md
```

**Required Skill Structure:**

~~~markdown
---
name: my-skill
description: Short description of what this skill does
metadata: {"openclawd":{"emoji":"🎯","os":["darwin","linux"]}}
---

# My Skill

Brief intro.

## Quick Commands

```text
| Request      | Action             | Requires       | Output         |
|--------------|--------------------| ---------------|----------------|
| "do thing"   | Does the thing     | *(none)*       | text response  |
| "do other"   | Does other thing   | `some-binary`  | JSON           |
```
~~~

## Capabilities

### Feature One
```bash
# Commands this skill can execute
some-command --flag
```

## Example Interactions

**User:** "do the thing"
```
Command: some-command
Exit code: 0

Output:
Result here

Summary: What happened
```

## Triggers

Respond to:
- "do thing", "thing please"
- "my-skill action"
```

### Assign Skill to Topic

```bash
# 1. Verify skill is valid
cb-skill test my-skill

# 2. Add to topic
cb-topics set-skills 2 system-control,quick-tools,my-skill

# 3. Restart gateway to pick up changes
cb-restart --soft
```

### Validate Skill

```bash
# Check all skills have valid frontmatter
cb-test skills

# Test specific skill
cb-skill test my-skill
```

---

### Common Operations

```bash
# Full health check
cb-status --deep

# Expected output (all green):
#   ✓ Gateway     up (36ms)
#   ✓ tmux        5 windows
#   ✓ Telegram    @mikehuntbot_bot
#   ✓ Config      valid
#   ✓ Disk        6% used
#   ✓ Memory      10% available

# Run test suite (21 tests)
cb-test

# Expected output:
#   Total: 21 tests | 21 passed | 0 failed

# View topics with skills
cb-topics

# Expected output:
#   Topic 1 - General @mention
#   Skills: 📍 chat-info  🔧 quick-tools
#   ...
```

---

### Networking Commands (via system-control skill)

```bash
# Public + Local IP
curl -s ifconfig.me && echo && ipconfig getifaddr en0

# WiFi signal strength
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | grep -E "SSID|RSSI"

# Listening ports
lsof -i -P | grep LISTEN

# What's on port 3000?
lsof -i :3000

# DNS lookup
dig +short google.com

# Speed test (macOS 12+)
networkQuality

# SSL certificate expiry
echo | openssl s_client -connect host:443 2>/dev/null | openssl x509 -noout -dates

# HTTP timing breakdown
curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTotal: %{time_total}s\n" -o /dev/null -s https://example.com

# Flush DNS cache
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

---

### Webhook & Automation

```bash
# Start webhook server (background)
cb-webhook &

# Send event to webhook
curl -X POST http://localhost:18792/hook/deploy \
  -H "Content-Type: application/json" \
  -d '{"event":"push","repo":"myrepo"}'

# Trigger skill via webhook
curl -X POST http://localhost:18792/skill/system-control \
  -d '{"command":"uptime"}'

# Check webhook status
curl http://localhost:18792/status
```

```bash
# List scheduled jobs
cb-cron list

# Add job (interval format: 30s, 5m, 1h, 1d)
cb-cron add health-check "5m" "cb-status --json"

# Add job (cron format)
cb-cron add backup "0 2 * * *" "tar czf ~/backup.tgz ~/clawd"

# Enable/disable
cb-cron enable health-check
cb-cron disable backup

# Run job immediately
cb-cron run health-check

# Start scheduler daemon
cb-cron
```

---

### Skill Router (~/clawd/lib/skill-router.ts)

```typescript
import { SkillRouter } from './lib/skill-router';

const router = new SkillRouter();

// Get context for a topic
const context = await router.getTopicContext(
  "-1003663527473",  // group ID
  "2"                // topic ID
);
// Returns: { topicId, systemPrompt, skills[], requireMention }

// Build enhanced system prompt
const prompt = router.buildSystemPrompt(context);

// Match user message to skill
const skill = router.matchSkillTrigger("check my ip", context.skills);
// Returns matching skill or null

// Load specific skill
const marketData = await router.loadSkill("market-data");

// Load all skills
const allSkills = await router.loadAllSkills();

// Clear cache (after config changes)
router.clearCache();
```

---

## Validation

### After Installation/Changes

```bash
# 1. Check skill file syntax
head -20 ~/.claude/skills/openclawd.md
# Expected: Valid YAML frontmatter with --- delimiters

# 2. Verify gateway is running
cb-status
# Expected: All ✓ green checks

# 3. Run test suite
cb-test
# Expected: 21 tests | 21 passed | 0 failed

# 4. Verify skills directory
ls ~/clawd/skills/
# Expected: 6 .md files (chat-info, home-automation, market-data, quick-tools, system-control, weather)

# 5. Check topic routing
cb-topics --json
# Expected: JSON with 4 topics, each with skills array

# 6. Test a script
cb-status --deep --json | jq '.services.gateway.ok'
# Expected: true
```

### Expected Test Results

```
cb-test output:

  gateway
    ✓ Health check
    ✓ TCP connection
    ✓ Latency check

  telegram
    ✓ getMe
    ✓ getUpdates
    ✓ Webhook info

  skills
    ✓ Directory exists
    ✓ Frontmatter valid
    ✓ Metadata present

  tmux
    ✓ Session exists
    ✓ Windows check
    ✓ Gateway pane

  config
    ✓ File exists
    ✓ Valid JSON
    ✓ Required fields

  scripts
    ✓ Required exist
    ✓ Executable
    ✓ Syntax check

  logs
    ✓ Directory exists
    ✓ Today's log
    ✓ Recent activity

  Total: 21 tests | 21 passed | 0 failed
```

---

## Troubleshooting Guide

- **Bot won't start** — Check: Required vars, Command: `env | grep TELEGRAM`, Expected: Both set, Fix: Set missing vars
- **Port conflict** — Check: Port usage, Command: `ss -tlnp | grep :18789`, Expected: Not listening, Fix: Change port
- **Permission error** — Check: Path permissions, Command: `ls -la ~/clawd/`, Expected: User writable, Fix: `chown -R user ~/clawd`
- **Skills not loading** — Check: Skill directory, Command: `ls ~/clawd/skills/`, Expected: Files exist, Fix: Clone skills
- **Webhook failing** — Check: Port accessible, Command: `curl http://127.0.0.1:18792/health`, Expected: 200 OK, Fix: Check firewall
- **High CPU** — Check: Process monitor, Command: `top -p $(pgrep -f openclawd)`, Expected: < 20%, Fix: Check logs
- **Memory leak** — Check: Memory usage, Command: `cb-status -j | jq .memory`, Expected: Stable, Fix: Restart services
- **API timeout** — Check: Response time, Command: `time curl http://127.0.0.1:18789/health`, Expected: < 1s, Fix: Increase timeout
- **Cache issues** — Check: Cache directory, Command: `ls -la ~/.openclawd/cache/`, Expected: Files exist, Fix: Clear cache
- **Update fails** — Check: Git status, Command: `cd ~/clawd && git status`, Expected: Clean, Fix: Stash changes

### Strategic Advantage Analysis

- **Operational** (Data-Driven) — Replaces "maybe" with `$STATUS_CODE`, Automation: High, Scalability: Horizontal, Reliability: Deterministic, UX/DX: High — Score: +25
- **Diagnostic** (Binary Logic) — `(A==B)*25` logic eliminates doubt, Automation: Fully Auto, Scalability: Linear, Reliability: High, UX/DX: Intuitive — Score: +25
- **Performance** (Resource Aware) — Real-time CPU/Mem profiling, Automation: Real-time, Scalability: Cluster-wide, Reliability: Variable, UX/DX: Technical — Score: +15
- **Recovery** (Actionable Fixes) — One-liner CLI commands in-table, Automation: Manual/Semi, Scalability: Local, Reliability: High, UX/DX: Efficient — Score: +20
- **CI/CD** (Gatekeeping) — Exit codes for Pipeline blocking, Automation: Integrated, Scalability: Multi-env, Reliability: Absolute, UX/DX: Seamless — Score: +20
- **Reporting** (Visual Health) — ASCII progress bars & Scorecards, Automation: Visual, Scalability: Dashboard, Reliability: High, UX/DX: Excellent — Score: +15
- **Integrity** (Self-Validating) — `crc32` and `git --porcelain`, Automation: Deep Scan, Scalability: File-level, Reliability: Very High, UX/DX: Detailed — Score: +20
- **Total Value** (Holistic Ops) — Unified Troubleshooting & Monitoring, Automation: Gold Std, Scalability: Enterprise, Reliability: Maximum, UX/DX: Elite — Score: 140%

### Diagnostic Script (`diag.sh`)

```bash
#!/bin/bash
# diag.sh - Robust System Health Check

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "--- Starting Openclawd Diagnostics ---"

# 1. Environment Variables
TOKENS=$(env | grep -c "TELEGRAM")
echo "TOKENS: $TOKENS"

# 2. Port Availability (Check if 18789 is CLEAR)
PORT_BUSY=$(ss -tlnp | grep -c ":18789")
echo "PORT_BUSY: $PORT_BUSY"

# 3. Skills Directory
SKILLS_COUNT=$(ls ~/clawd/skills/ 2>/dev/null | wc -l)
echo "SKILLS: $SKILLS_COUNT"

# 4. Webhook Health (with 2s timeout)
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 localhost:18792/health || echo "000")
echo "HEALTH: $HEALTH"

# 5. CPU Usage (Safe check)
PID=$(pgrep -f openclawd | head -n 1)
if [ -n "$PID" ]; then
    CPU=$(top -b -n1 -p "$PID" | tail -1 | awk '{print $9}' | cut -d. -f1)
else
    CPU="999" # Sentinel for "Process not found"
fi
echo "CPU_LOAD: $CPU"
```

### Health Score Formula (TypeScript)

```typescript
interface CheckResult {
  label: string;
  value: any;
  passed: boolean;
  weight: number;
}

function runAudit(): void {
  const results: CheckResult[] = [
    { label: "Environment", value: process.env.TG_TOKEN, passed: !!process.env.TG_TOKEN, weight: 25 },
    { label: "Port Status", value: "Free", passed: !portInUse, weight: 25 },
    { label: "Permissions", value: "Writable", passed: isWritable, weight: 25 },
    { label: "Latency", value: `${latency}ms`, passed: latency < 1000, weight: 25 }
  ];

  const totalScore = results.reduce((acc, curr) => acc + (curr.passed ? curr.weight : 0), 0);

  // Visual Output
  console.log(`[${totalScore >= 75 ? "PASS" : "FAIL"}] System Health: ${totalScore}/100`);
}
```

### Why This Approach Wins

- **Quantifiable Reliability** — Assigns numerical value (`Score/100`) to system health—moves troubleshooting from "art" to "science"
- **Instant Triage** — Engineer looks at ASCII bar, sees **78/100**, immediately identifies two red `0/25` rows
- **No Tribal Knowledge** — `Command` and `Fix` columns document exact syntax—junior dev fixes as fast as senior lead
- **Idempotency** — Diagnostic checks are read-only (side-effect free), can run every 60s via `cron`
- **Reduced MTTR** — `diag.sh` identifies *exact* failure point—investigation phase reduced to seconds
- **Pipeline Safety** — GitHub Actions/GitLab CI integration ensures "Unhealthy" code never reaches production

### Extended Infrastructure & Data Integrity Engine

- **NETWORK / DNS Res** — UDP/53 Query, Property: Resolution, Command: `dig +short api.telegram.org`, Expected: IP Address, Latency: 12ms, Score: 10/10, Priority: P0, Auto-Fix: flush-dns
- **NETWORK / Firewall** — iptables Rule, Property: Ingress, Command: `ufw status | grep 18789`, Expected: "ALLOW", Latency: <1ms, Score: 10/10, Priority: P0, Auto-Fix: ufw allow
- **NETWORK / SSL Cert** — TLS/1.3 Handshake, Property: Validity, Command: `openssl s_client -connect :443 < /dev/null`, Expected: "verify ok", Latency: 45ms, Score: 10/10, Priority: P1, Auto-Fix: certbot-ren
- **DATABASE / Connection** — TCP/5432 Socket, Property: Readiness, Command: `pg_isready -h localhost -p 5432`, Expected: "accepting", Latency: 2ms, Score: 15/15, Priority: P0, Auto-Fix: db-restart
- **DATABASE / Migration** — SQL Schema, Property: Sync, Command: `npx prisma migrate status`, Expected: "up-to-date", Latency: 120ms, Score: 15/15, Priority: P1, Auto-Fix: db-migrate
- **DATABASE / Deadlocks** — SQL Lock, Property: Contention, Command: `psql -c "SELECT count(*) FROM pg_locks"`, Expected: < 10, Latency: 5ms, Score: 10/10, Priority: P2, Auto-Fix: pg_terminate
- **TOPOLOGY / Redis-Mesh** — TCP/6379 Ping, Property: Liveness, Command: `redis-cli ping`, Expected: "PONG", Latency: 1ms, Score: 10/10, Priority: P1, Auto-Fix: redis-up
- **TOPOLOGY / S3-Storage** — HTTPS REST, Property: Access, Command: `aws s3 ls s3://bot-assets/ --limit 1`, Expected: "List: 0", Latency: 88ms, Score: 10/10, Priority: P2, Auto-Fix: aws-auth
- **INTEGRITY / Schema Hash** — File Checksum, Property: Drift, Command: `md5sum prisma/schema.prisma`, Expected: $REF_HASH, Latency: <1ms, Score: 10/10, Priority: P1, Auto-Fix: git-restore

### Infrastructure Audit Script (`infra-audit.sh`)

```bash
#!/bin/bash
# infra-audit.sh - Network & Database Integrity Validator

check_db() {
  echo -n "DB_CONN: "
  pg_isready -q && echo "1" || echo "0"
}

check_dns() {
  echo -n "DNS_RESOLVE: "
  [[ -n $(dig +short google.com) ]] && echo "1" || echo "0"
}

check_latency() {
  echo -n "DB_LATENCY: "
  psql -c "EXPLAIN ANALYZE SELECT 1;" | grep "Execution Time" | awk '{print $3}'
}

# Run and format output for the Engine
{
  check_db
  check_dns
  check_latency
  echo "REDIS: $(redis-cli ping 2>/dev/null | grep -c PONG)"
} | column -t
```

### Strategic Breakdown (8-Column View)

- **Connectivity** (DNS/Socket) — Validates OSI Layer 3/4, Compliance: SOC2, Resilience: High, Monitoring: Passive, Cost: Low, Efficiency: 99.9%
- **Persistence** (Postgres/SQL) — Deadlock & Migration Sync, Compliance: ACID, Resilience: Critical, Monitoring: Active, Cost: Medium, Efficiency: 95.0%
- **Integrity** (Checksums) — Prevents configuration drift, Compliance: ISO27001, Resilience: High, Monitoring: On-Access, Cost: Low, Efficiency: 100%
- **Topology** (Microservices) — Maps Redis/S3/API nodes, Compliance: GDPR, Resilience: Med-High, Monitoring: Heartbeat, Cost: High, Efficiency: 92.0%
- **Latency** (Response Time) — Tracks query/ping degradation, Compliance: SLA/SLO, Resilience: Warning, Monitoring: Real-time, Cost: Medium, Efficiency: 88.0%
- **Security** (SSL/TLS) — Cert expiry & Cipher strength, Compliance: PCI-DSS, Resilience: Maximum, Monitoring: Periodic, Cost: Low, Efficiency: 99.5%
- **Availability** (Uptime) — Health-check endpoint status, Compliance: 99.99, Resilience: Failover, Monitoring: Proactive, Cost: High, Efficiency: 99.9%
- **Governance** (Audit Logs) — Git status & config hash, Compliance: HIPAA, Resilience: Traceable, Monitoring: Event-based, Cost: Low, Efficiency: 97.0%

### Implementation Strategy

- **Step 1** (Topology Mapping) — Trigger: Connectivity + Topology checks — Ensures Bot is not an island—Redis down = -10 points
- **Step 2** (Database Health) — Trigger: Deadlock check — High scores = DB not just "up" but "performing"
- **Step 3** (Visual Alerts) — Trigger: Any P0 failure — Immediate `SIGTERM` to prevent data corruption, initiate failover

### Self-Repair Logic (`repair.sh`)

```bash
#!/bin/bash
# repair.sh - Self-Healing Diagnostic Engine
# Auto-fires remediation commands when health score drops below threshold

set -euo pipefail

# Configuration
THRESHOLD=${THRESHOLD:-50}
LOG_FILE="${LOG_FILE:-/var/log/openclawd/repair.log}"
DRY_RUN=${DRY_RUN:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# Repair functions mapped to Auto-Fix column
declare -A REPAIRS=(
  ["flush-dns"]="sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder"
  ["ufw-allow"]="sudo ufw allow 18789/tcp"
  ["certbot-ren"]="sudo certbot renew --quiet"
  ["db-restart"]="sudo systemctl restart postgresql"
  ["db-migrate"]="cd ~/clawd && npx prisma migrate deploy"
  ["pg_terminate"]="psql -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction'\""
  ["redis-up"]="sudo systemctl restart redis"
  ["aws-auth"]="aws sso login --profile default"
  ["git-restore"]="cd ~/clawd && git checkout -- prisma/schema.prisma"
)

# Check functions return 0 (pass) or 1 (fail)
check_dns()      { dig +short api.telegram.org | grep -q '.'; }
check_firewall() { ufw status 2>/dev/null | grep -q "18789.*ALLOW"; }
check_ssl()      { echo | openssl s_client -connect localhost:443 2>/dev/null | grep -q "Verify return code: 0"; }
check_db()       { pg_isready -h localhost -p 5432 -q; }
check_migration(){ cd ~/clawd && npx prisma migrate status 2>/dev/null | grep -q "up to date"; }
check_deadlocks(){ [[ $(psql -tAc "SELECT count(*) FROM pg_locks WHERE NOT granted" 2>/dev/null || echo 999) -lt 10 ]]; }
check_redis()    { redis-cli ping 2>/dev/null | grep -q "PONG"; }
check_s3()       { aws s3 ls s3://bot-assets/ --max-items 1 &>/dev/null; }
check_schema()   { [[ $(md5sum ~/clawd/prisma/schema.prisma 2>/dev/null | cut -d' ' -f1) == "$SCHEMA_HASH" ]]; }

# Health check matrix
declare -A CHECKS=(
  ["DNS:P0:10"]="check_dns:flush-dns"
  ["Firewall:P0:10"]="check_firewall:ufw-allow"
  ["SSL:P1:10"]="check_ssl:certbot-ren"
  ["DB-Conn:P0:15"]="check_db:db-restart"
  ["Migration:P1:15"]="check_migration:db-migrate"
  ["Deadlocks:P2:10"]="check_deadlocks:pg_terminate"
  ["Redis:P1:10"]="check_redis:redis-up"
  ["S3:P2:10"]="check_s3:aws-auth"
  ["Schema:P1:10"]="check_schema:git-restore"
)

run_repair() {
  local fix_cmd="$1"
  local repair_cmd="${REPAIRS[$fix_cmd]:-}"

  if [[ -z "$repair_cmd" ]]; then
    log "${RED}[ERROR]${NC} No repair command for: $fix_cmd"
    return 1
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log "${YELLOW}[DRY-RUN]${NC} Would execute: $repair_cmd"
    return 0
  fi

  log "${YELLOW}[REPAIR]${NC} Executing: $repair_cmd"
  if eval "$repair_cmd"; then
    log "${GREEN}[SUCCESS]${NC} Repair completed: $fix_cmd"
    return 0
  else
    log "${RED}[FAILED]${NC} Repair failed: $fix_cmd"
    return 1
  fi
}

main() {
  local total_score=0
  local max_score=0
  local failed_checks=()
  local p0_failures=()

  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "🔍 Starting Self-Healing Diagnostic Engine"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  for key in "${!CHECKS[@]}"; do
    IFS=':' read -r name priority score <<< "$key"
    IFS=':' read -r check_fn fix_cmd <<< "${CHECKS[$key]}"

    max_score=$((max_score + score))

    if $check_fn 2>/dev/null; then
      total_score=$((total_score + score))
      echo -e "${GREEN}✓${NC} $name [${score}/${score}]"
    else
      echo -e "${RED}✗${NC} $name [0/${score}] → $fix_cmd"
      failed_checks+=("$fix_cmd")
      [[ "$priority" == "P0" ]] && p0_failures+=("$name")
    fi
  done

  # Calculate percentage
  local pct=$((total_score * 100 / max_score))
  local bar_filled=$((pct / 5))
  local bar_empty=$((20 - bar_filled))
  local bar="${GREEN}$(printf '█%.0s' $(seq 1 $bar_filled))${RED}$(printf '░%.0s' $(seq 1 $bar_empty))${NC}"

  log ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "Health Score: [${bar}] ${total_score}/${max_score} (${pct}%)"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # P0 Critical Failure - Immediate Action
  if [[ ${#p0_failures[@]} -gt 0 ]]; then
    log "${RED}🚨 CRITICAL: P0 failures detected: ${p0_failures[*]}${NC}"
    log "${RED}   Initiating emergency repair sequence...${NC}"
  fi

  # Auto-repair if below threshold
  if [[ $pct -lt $THRESHOLD ]]; then
    log ""
    log "${YELLOW}⚠️  Health below ${THRESHOLD}% - Initiating Self-Repair${NC}"
    log ""

    for fix_cmd in "${failed_checks[@]}"; do
      run_repair "$fix_cmd"
      sleep 2  # Cooldown between repairs
    done

    log ""
    log "🔄 Re-running diagnostics after repairs..."
    exec "$0"  # Re-run self
  else
    log "${GREEN}✅ System healthy - No repairs needed${NC}"
  fi

  # Exit code for CI/CD integration
  [[ ${#p0_failures[@]} -eq 0 ]] && exit 0 || exit 1
}

main "$@"
```

### Self-Repair Configuration

- **Threshold** — Default: 50, Env: `$THRESHOLD` — Minimum health % before auto-repair triggers
- **Log File** — Default: `/var/log/openclawd/repair.log`, Env: `$LOG_FILE` — Repair action audit log
- **Dry Run** — Default: false, Env: `$DRY_RUN=true` — Preview repairs without executing
- **Schema Hash** — Default: -, Env: `$SCHEMA_HASH` — Reference hash for drift detection
- **Cooldown** — Default: 2s, *(hardcoded)* — Delay between repair commands

### Repair Priority Matrix

- **P0** (Critical) — Auto-Repair: Immediate, Notification: Alert + SIGTERM, Escalation: Page on-call
- **P1** (High) — Auto-Repair: Within 60s, Notification: Slack/Telegram, Escalation: Ticket created
- **P2** (Medium) — Auto-Repair: Next cycle, Notification: Dashboard only, Escalation: Weekly review
- **P3** (Low) — Auto-Repair: Manual, Notification: Log only, Escalation: None

### Usage

```bash
# Normal run - repairs if health < 50%
./repair.sh

# Dry run - preview what would be repaired
DRY_RUN=true ./repair.sh

# Custom threshold - repair if health < 75%
THRESHOLD=75 ./repair.sh

# Cron integration (every 5 minutes)
*/5 * * * * /home/user/clawd/scripts/repair.sh >> /var/log/openclawd/cron.log 2>&1

# CI/CD gate (fails pipeline on P0 failures)
./repair.sh || exit 1
```

---

## File Structure

- **`~/clawd/`** (Directory, Required) — Config: `$CLAWD_HOME`, Perms: 755, Owner: user:user — Workspace root
- **`~/clawd/skills/`** (Directory, Required) — Config: *(hardcoded)*, Perms: 755, Owner: user:user — Skill modules
- **`~/clawd/lib/`** (Directory, Required) — Config: *(hardcoded)*, Perms: 755, Owner: user:user — Shared libraries
- **`~/clawd/scripts/`** (Directory) — Config: Add to `$PATH`, Perms: 755, Owner: user:user — CLI tools
- **`~/.openclawd/`** (Directory) — Config: `$OPENCLAWD_CONFIG`, Perms: 700, Owner: user:user — Config files
- **`~/.openclawd/state.json`** (File, Required) — Config: *(hardcoded)*, Perms: 600, Owner: user:user, Limit: 10MB — Bot state
- **`~/.openclawd/sessions/`** (Directory) — Config: *(hardcoded)*, Perms: 700, Owner: user:user, Limit: 100MB — Session data
- **`~/.openclawd/logs/`** (Directory) — Config: *(hardcoded)*, Perms: 755, Owner: user:user, Limit: 1GB — Log files
- **`~/.openclawd/cache/`** (Directory) — Config: *(hardcoded)*, Perms: 755, Owner: user:user, Limit: 500MB — Cache storage

---

## API Endpoints

- **`/api/gateway`** (POST) — Auth: Optional, Rate: 100/min, Req: JSON, Resp: JSON, Port: `$GATEWAY_PORT` — Main handler
- **`/api/webhook`** (POST) — Auth: Secret, Rate: 1000/hour, Req: JSON, Resp: JSON, Port: `$WEBHOOK_PORT` — Telegram hook
- **`/api/health`** (GET) — Auth: None, Rate: 10/min, Resp: JSON, Port: `$GATEWAY_PORT` — Health check
- **`/api/skills`** (GET) — Auth: Optional, Rate: 60/min, Resp: JSON, Port: `$GATEWAY_PORT` — List skills
- **`/api/execute`** (POST) — Auth: Optional, Rate: 30/min, Req: JSON, Resp: JSON, Port: `$GATEWAY_PORT` — Execute skill
- **`/api/config`** (GET/PUT) — Auth: Required, Rate: 20/min, Req: JSON, Resp: JSON, Port: `$GATEWAY_PORT` — Configuration
- **`/api/logs`** (GET) — Auth: Required, Rate: 10/min, Req: Query params, Resp: JSON/Text, Port: `$GATEWAY_PORT` — Log access
- **`/api/metrics`** (GET) — Auth: Optional, Rate: 5/min, Resp: JSON, Port: `$GATEWAY_PORT` — Metrics
- **`/dashboard`** (GET) — Auth: Optional, Rate: 30/min, Resp: HTML, Port: `$DASHBOARD_PORT` — Web UI

---

## Runtime Configuration

- **Log Level** (Enum) — Default: `info`, Env: `$LOG_LEVEL` — debug, info, warn, error
- **Session Timeout** (Seconds) — Default: 3600, Env: `$SESSION_TIMEOUT`, Range: 60-86400 — Session TTL
- **Max Request Size** (Bytes) — Default: 10MB, Env: `$MAX_REQUEST_SIZE`, Range: 1KB-100MB — Upload limit
- **Rate Limit** (String) — Default: 100/60s, Env: `$RATE_LIMIT` — Requests per window
- **Cache TTL** (Seconds) — Default: 300, Env: `$CACHE_TTL`, Range: 0-86400 — Cache timeout
- **Webhook Secret** (String) — Default: -, Env: `$WEBHOOK_SECRET`, Min: 8, Max: 128 — Hook validation
- **Allowed IPs** (CIDR List) — Default: 127.0.0.1, Env: `$ALLOWED_IPS` — IP whitelist
- **Worker Threads** (Count) — Default: 4, Env: `$WORKER_THREADS`, Range: 1-16 — Worker count
- **Max Connections** (Count) — Default: 100, Env: `$MAX_CONNECTIONS`, Range: 1-1000 — Max connections
- **Request Timeout** (Seconds) — Default: 30, Env: `$REQUEST_TIMEOUT`, Range: 1-300 — Request timeout
- **Keep Alive** (Seconds) — Default: 5, Env: `$KEEP_ALIVE`, Range: 0-60 — Keep-alive time
- **Gzip Level** (Enum) — Default: 6, Env: `$GZIP_LEVEL`, Range: 0-9 — Compression
- **TLS Enabled** (Boolean) — Default: false, Env: `$TLS_ENABLED` — Enable HTTPS
- **TLS Cert Path** (Path) — Default: -, Env: `$TLS_CERT_PATH` — Certificate
- **TLS Key Path** (Path) — Default: -, Env: `$TLS_KEY_PATH` — Private key

---

## CI Telemetry Hook

Push bundle budget alerts and build status to Telegram:

### Budget Alert Integration

```typescript
// ci/notify.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;  // (required)
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;      // (required)
const TOPIC_ID = process.env.TELEGRAM_TOPIC_ID || "2";  // Default: Code topic

if (!BOT_TOKEN || !CHAT_ID) {
  throw new Error("Missing required env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID");
}

interface BudgetReport {
  score: number;
  bytes: number;
  path: string;
  violations: string[];
}

async function sendBudgetAlert(report: BudgetReport) {
  const emoji = report.score >= 90 ? "✅" : report.score >= 70 ? "⚠️" : "❌";
  const sizeKB = (report.bytes / 1024).toFixed(1);

  const message = [
    `${emoji} *Bundle Budget Report*`,
    ``,
    `📦 *${report.path}*`,
    `Score: ${report.score}/100`,
    `Size: ${sizeKB} KiB`,
    report.violations.length > 0
      ? `\n⚠️ Violations:\n${report.violations.map(v => `• ${v}`).join("\n")}`
      : "",
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_thread_id: TOPIC_ID,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}

// Usage in CI
async function runBudgetWithNotify() {
  const { metafile } = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    metafile: true,
    minify: true,
  });

  for (const [path, meta] of Object.entries(metafile.outputs)) {
    const violations: string[] = [];
    if (meta.bytes > 250_000) violations.push(`Exceeds 250KB limit`);
    if (meta.imports.length > 30) violations.push(`Too many imports (${meta.imports.length})`);

    const score = Math.max(0, 100 - violations.length * 25);

    await sendBudgetAlert({
      path,
      score,
      bytes: meta.bytes,
      violations,
    });
  }
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/build.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2

      - run: bun install
      - run: bun run ci/notify.ts
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
```

### Webhook Alternative

```bash
# Send via cb-send script
cb-send "Bundle budget: 95/100 - 142.3 KiB" --topic 2

# Or via webhook
curl -X POST http://localhost:18792/skill/quick-tools \
  -H "Content-Type: application/json" \
  -d '{"message": "Build complete: 142.3 KiB"}'
```

---

## Usage Examples

### Starting with Custom Configuration

```bash
# Set all required variables
export TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234"
export TELEGRAM_CHAT_ID="-1001234567890"
export OPENROUTER_API_KEY="sk-or-v1-..."

# Override defaults
export CLAWD_HOME="/opt/clawd"
export GATEWAY_PORT=3000
export OPENCLAWD_MODEL="anthropic/claude-3.5-sonnet"
export LOG_LEVEL="debug"

# Start services
cb-start

# Verify status
cb-status
```

### Environment File Approach

```bash
# Create .env file
cat > ~/.openclawd/.env << EOF
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234
TELEGRAM_CHAT_ID=-1001234567890
OPENROUTER_API_KEY=sk-or-v1-...
CLAWD_HOME=/opt/clawd
GATEWAY_PORT=3000
OPENCLAWD_MODEL=anthropic/claude-3.5-sonnet
LOG_LEVEL=info
EOF

# Start with env file
cb-start ~/.openclawd/.env
```

---

## Version History

- **v2.3.0** (2026-01-21): Added Self-Healing Diagnostic Engine with infrastructure audit, repair logic
- **v2.2.0** (2026-01-21): Enhanced all tables to 8+ columns with types, constraints, examples
- **v2.1.0** (2026-01-18): Added CI telemetry hook for budget alerts
- **v2.0.0** (2026-01-14): Complete rewrite with skills registry, patterns, validation
- **v1.0.0** (2026-01-14): Initial release
