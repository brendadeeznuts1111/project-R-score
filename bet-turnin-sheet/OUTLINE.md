# Ash Settlement Bot — Project Outline

Architecture, planned layout, and phased delivery for **spec v2.6**. Field-level tables, edge-case matrix, and interactive demo live in [spec.html](spec.html).

| | |
|---|---|
| **Status** | Spec v2.6 · documentation complete · **not yet implemented** |
| **Start here** | [README.md](README.md) (DOC-01) · Ref IDs: [REFS.md](REFS.md) (DOC-04) |

## Contents

- [Problem and goals](#problem-and-goals)
- [Architecture layers](#architecture-layers)
- [Reference registry](#reference-registry)
- [REFS.md](REFS.md)
- [Bun API references](#bun-api-references)
- [Effect references](#effect-references)
- [grammY & Telegram references](#grammy--telegram-references)
- [Google Sheets references](#google-sheets-references)
- [Planned directory layout](#planned-directory-layout)
- [Command catalog](#command-catalog)
- [Sheet contracts](#sheet-contracts-summary)
- [Config schema](#config-schema-index)
- [Edge cases](#edge-cases-index)
- [Implementation phases](#implementation-phases)
- [Future enhancements](#future-enhancements)
- [Spec cross-reference](#spec-cross-reference)

---

## Problem and goals

Ash logs bets for multiple partners in one Telegram supergroup. Each partner uses a dedicated forum topic. Running totals and P&L must stay correct without manual spreadsheet fixes after every command.

| Goal | Mechanism |
|------|-----------|
| Zero mis-logged bets | Strict `message_thread_id` → partner mapping |
| Typo protection | Inline keyboard when `risk > big_ticket_threshold` |
| Self-service config | Config sheet tab, 5-second reload |
| Autonomous visibility | Daily P&L digest + midnight integrity check |

---

## Architecture layers

| Layer | Responsibility | Planned modules |
|-------|----------------|-----------------|
| **L1 — Telegram** | Supergroup, forum topics, webhooks | grammY bot, webhook handler |
| **L2 — Processing** | Security, config, mapping, parsing | `ConfigService`, `PartnerMapper`, Effect Schema parsers |
| **L3 — Safety** | Confirmations, rate limits, audit | `PendingBetStore`, callback handlers, `AuditLogger` |
| **L4 — Storage** | Sheet I/O, config cache | `SheetApiService`, tab appenders |
| **Cron** | Background jobs | `dailySummaryJob`, `integrityCheckJob`, `weeklyReportJob`, `leaderboardCacheJob` |

### Request flow

Canonical diagram: [spec.html#architecture](spec.html#architecture).

```mermaid
flowchart TD
    subgraph PLATFORM["L1 Telegram"]
        G["Ash Settlement Hub"]
        T1["Eddie — 101"]
        T2["Mike — 102"]
        T3["Stacks — 103"]
        T4["Admin/General — 104"]
        G --- T1 & T2 & T3 & T4
    end

    subgraph PROCESSING["L2 Processing"]
        BOT["Webhook handler"]
        T1 & T2 & T3 & T4 --> BOT
        SEC["Security whitelist"]
        CONF["Config loader — 5s cache"]
        MAP["Thread to partner"]
        PARSE["Command parser"]
        VALIDATE["Validation"]
        BOT --> SEC --> CONF
        SEC --> MAP --> PARSE --> VALIDATE
        VALIDATE -->|invalid| ERROR["Typed error"]
        VALIDATE -->|valid| PAYLOAD["Typed payload"]
    end

    subgraph SAFETY["L3 Safety"]
        PAYLOAD --> CHECK{"Risk > threshold?"}
        CHECK -->|yes| KB["Confirm / Cancel keyboard"]
        KB -->|cancel| ABORT["Audit: CANCELLED"]
        KB -->|confirm| GO["Proceed"]
        CHECK -->|no| GO
        GO --> AUDIT["Audit logger"] --> RATE["Rate limiter"]
    end

    subgraph STORAGE["L4 Storage"]
        RATE --> API["Sheets API"]
        API --> BL["BetLog"]
        API --> PL["PaymentLog"]
        API --> AL["AuditLog"]
        API --> CF["Config"]
        API --> REPLY["Confirmation reply"]
    end

    subgraph CRON["Cron"]
        C1["Daily summary 09:00"]
        C2["Integrity check 00:00"]
        C1 --> T4
        C2 --> AL
    end
```

### Bun API references

Official docs for Bun primitives. Registry: [REFS.md](REFS.md#bun-b01-b08).

| Ref ID | API | Documentation | Where in project |
|--------|-----|---------------|------------------|
| B01 | Runtime | [Overview](REFS.md#ref-b01) | TypeScript runtime and tooling |
| B02 | `bun-types` | [TypeScript](REFS.md#ref-b02) | Strict typing across `src/` |
| B03 | `Bun.serve` | [HTTP server](REFS.md#ref-b03) | `src/index.ts` — webhook endpoint |
| B04 | `Bun.cron` | [Cron scheduler](REFS.md#ref-b04) | `src/cron/` — daily summary, integrity check |
| B05 | `Bun.env` | [Environment variables](REFS.md#ref-b05) | Token, sheet ID, cache TTL |
| B06 | `Bun.file` | [File I/O](REFS.md#ref-b06) | `config.example.json`, service-account JSON |
| B07 | install | [Package manager](REFS.md#ref-b07) | Dependency setup (future) |
| B08 | Test runner | [Test runner](REFS.md#ref-b08) | Unit/integration tests (future) |

**Cross-links:** [README — Bun references](README.md#bun-references) · [spec — Scheduled jobs](spec.html#scheduled-jobs) · [spec — Architecture](spec.html#architecture)

### Effect references

| Ref ID | API | Documentation | Where in project |
|--------|-----|---------------|------------------|
| E01 | Overview | [Effect docs](REFS.md#ref-e01) | Typed services, error handling |
| E02 | Schema | [Schema introduction](REFS.md#ref-e02) | Command parsers, config validation |
| E03 | Layers | [Requirements management](REFS.md#ref-e03) | `ConfigService`, `SheetApiService` |
| E04 | Retry | [Retrying](REFS.md#ref-e04) | Cron error recovery |
| E05 | `Effect.gen` | [Getting started](REFS.md#ref-e05) | `dailySummaryJob`, handlers |

**Cross-links:** [README — Effect references](README.md#effect-references) · [spec — Edge cases](spec.html#edge-cases)

### grammY & Telegram references

| Ref ID | API | Documentation | Where in project |
|--------|-----|---------------|------------------|
| T01 | grammY | [Guide](REFS.md#ref-t01) | `src/bot.ts` command routing |
| T02 | Webhooks | [Deployment types](REFS.md#ref-t02) | `Bun.serve` [B03](REFS.md#ref-b03) webhook handler |
| T03 | Inline keyboards | [Keyboard plugin](REFS.md#ref-t03) | Big-ticket confirm flow |
| T04 | Forum topics | [Bot API — forum topics](REFS.md#ref-t04) | Strict `message_thread_id` mapping |
| T05 | Bot API | [Telegram Bot API](REFS.md#ref-t05) | Updates, callbacks |

**Cross-links:** [README — grammY references](README.md#grammy--telegram-references) · [spec — Command matrix](spec.html#command-matrix) · [spec — Demo](spec.html#mockup)

### Google Sheets references

| Ref ID | API | Documentation | Where in project |
|--------|-----|---------------|------------------|
| S01 | Concepts | [Sheets API overview](REFS.md#ref-s01) | Spreadsheet and tab layout |
| S02 | Append | [Append values](REFS.md#ref-s02) | BetLog, PaymentLog, AuditLog |
| S03 | Read | [Read values](REFS.md#ref-s03) | Config tab, cron totals |
| S04 | Auth | [Service account](REFS.md#ref-s04) | Credentials |
| S05 | REST | [values.append](REFS.md#ref-s05) | HTTP API reference |

**Cross-links:** [README — Sheets references](README.md#google-sheets-references) · [spec — Sheet contracts](spec.html#sheet-contracts)

---

## Reference registry

Canonical Ref IDs: **[REFS.md](REFS.md)** (DOC-04) · machine-readable **[refs.json](refs.json)** (validated by `bun run audit:refs`).

| Prefix | Range | Link |
|--------|-------|------|
| B | B01–B08 | [REFS.md#bun-b01-b08](REFS.md#bun-b01-b08) |
| E | E01–E05 | [REFS.md#effect-e01-e05](REFS.md#effect-e01-e05) |
| T | T01–T05 | [REFS.md#grammy-telegram-t01-t05](REFS.md#grammy-telegram-t01-t05) |
| S | S01–S05 | [REFS.md#google-sheets-s01-s05](REFS.md#google-sheets-s01-s05) |
| SPEC | SPEC-01–SPEC-09 | [REFS.md#internal-spec-sections](REFS.md#internal-spec-sections) |
| DOC | DOC-01–DOC-04 | [REFS.md#project-documents](REFS.md#project-documents) |

**Key pairings:** [REFS.md#key-pairings](REFS.md#key-pairings) · **Cross-reference matrix:** [REFS.md#cross-reference-matrix](REFS.md#cross-reference-matrix) · Detail tables: [OUTLINE.md](OUTLINE.md#bun-api-references)

---

## Planned directory layout

Future structure — **no source files exist yet**.

```
bet-turnin-sheet/
├── refs.json                 # Canonical registry (SSOT)
├── REFS.md                   # DOC-04 — human-readable registry
├── README.md                 # DOC-01
├── OUTLINE.md                # DOC-02
├── spec.html                 # DOC-03
├── docs/                     # later: SETUP.md, SHEETS.md
├── src/
│   ├── index.ts              # Bun.serve webhook + cron bootstrap
│   ├── bot.ts                # grammY setup, command routing
│   ├── config/               # Effect schema + ConfigService
│   ├── commands/             # logbet, settle, payment, status, ...
│   ├── safety/               # big-ticket keyboard, rate limiter
│   ├── sheets/               # Google Sheets client + writers
│   ├── cron/                 # scheduled jobs
│   └── schemas/              # BetPayload, PaymentPayload, ...
├── scripts/
│   ├── audit-refs.ts         # Ref registry audit CLI
│   └── refs-schema.ts        # Zod validation
├── ref-audit.json            # Latest audit report
└── .env.example
```

### Entry point (planned)

```typescript
// B03 — Bun.serve webhook · REFS.md#ref-b03
import { startBot } from "./bot";
import { registerCronJobs } from "./cron";

await startBot();
registerCronJobs();
```

### Cron pattern (planned)

From [spec.html#scheduled-jobs](spec.html#scheduled-jobs):

```typescript
import { Effect } from "effect";

// B04 — daily summary cron · REFS.md#ref-b04
// E04 — retry · E05 — Effect.gen · REFS.md#ref-e04 · REFS.md#ref-e05
Bun.cron("daily_summary", {
  pattern: "0 9 * * *",
  timezone: "America/Los_Angeles",
  async run() {
    await Effect.runPromise(
      dailySummaryJob.pipe(
        Effect.retry({ times: 3, delay: 1000 }),
        Effect.catchAll((err) => Effect.logError("Cron failed", err))
      )
    );
  },
});
```

---

## Command catalog

Full matrix: [spec.html#command-matrix](spec.html#command-matrix).

### Core

| Command | Behavior |
|---------|----------|
| `/logbet` | Log straight bet or parlay |
| `/status` | Last 5 bets + running total (partner topic) |
| `/settle` | Partner total; General topic → master total |
| `/payment` | Log settlement payment |
| `/listpartners` | Active partners list |

### Extended (v2.6 demo)

| Command | Behavior |
|---------|----------|
| `/editbet` | Update row; recalculate totals; audit entry |
| `/leaderboard` | Rank partners by P&L |
| `/settleup` | Settlement summary + payment deep links |
| `/check` | Verify bot math vs sheet formulas |

### Admin and context rules

- **`--force`** — `admin_user_ids` only; cross-topic log allowed; `Admin_Override` + `ADMIN_OVERRIDE` audit
- **Cross-topic (non-admin)** — rejected: *Switch to their topic*
- **`/logbet` in General** — rejected · **`/settle` in General** — allowed

Interactive examples: [spec.html#mockup](spec.html#mockup).

---

## Sheet contracts summary

Full specs: [spec.html#sheet-contracts](spec.html#sheet-contracts).

| Tab | Role |
|-----|------|
| **BetLog** | Bot writes A–I, L, M. Formulas: **Result** `=IF(I2="W",H2*(G2/100),IF(I2="L",-H2,0))`, **Running_Total** `=SUM(J$2:J2)` |
| **PaymentLog** | Payments; negative amount = Ash pays partner |
| **AuditLog** | Immutable log with `Payload_JSON` |
| **Config** | Live config; polled every 5s |

**AuditLog actions:** `BET_LOGGED` · `PAYMENT_LOGGED` · `CONFIRM_CLICKED` · `CANCELLED` · `REJECTED` · `ADMIN_OVERRIDE`

---

## Config schema index

Full table: [spec.html#hub-config](spec.html#hub-config).

| Group | Paths |
|-------|-------|
| Hub | `hub.chat_id`, `hub.name`, `general_topic_id` |
| Partners | `partners[].key`, `.thread_id`, `.display_name`, `.is_active`, `.settle_threshold` |
| Access | `admin_user_ids[]` |
| Rate limit | `rate_limit.commands_per_minute`, `rate_limit.burst_size` |
| Safety | `big_ticket_threshold` |
| Cron | `scheduled_jobs.timezone`, `scheduled_jobs.daily_summary.*`, `scheduled_jobs.weekly_report.*` |

---

## Edge cases index

Full table: [spec.html#edge-cases](spec.html#edge-cases).

**Rejected — not written to AuditLog**

- DM to bot · `/logbet` in General · rate/burst limit · schema validation failure · unknown/inactive topic · cross-topic without `--force`

**Written to AuditLog**

- Big-ticket confirm/cancel · `/settle` in General · `--force` overrides · successful bet/payment writes

---

## Implementation phases

### Phase 0 — Docs and spec alignment ✓

- [x] README.md entrypoint
- [x] OUTLINE.md architecture and phases
- [x] Cross-links to spec.html

### Phase 1 — Config in Sheets

**Deliverables:** `ConfigService` (5s TTL) · Effect schema · JSON dev fallback

**Acceptance criteria**

- Config tab edits visible within 5 seconds
- Invalid values fail schema validation with typed errors
- Dev mode runs from `config.example.json` without Sheets

### Phase 2 — Core path: `/logbet`

**Deliverables:** Webhook · security whitelist · thread mapping · BetLog append · confirmation reply

**Acceptance criteria**

- Partner-topic bet appears in BetLog with correct `partners[].key`
- `/logbet` in General rejected
- Unknown `thread_id` returns *Unknown topic*

### Phase 3 — Big-ticket keyboard

**Deliverables:** Threshold check · pending bet store · `confirm_bet` / `cancel_bet` callbacks

**Acceptance criteria**

- No sheet write until Confirm when `risk > big_ticket_threshold`
- Cancel → AuditLog `CANCELLED`
- Confirm → AuditLog `CONFIRM_CLICKED`, then BetLog row

### Phase 4 — Daily summary cron

**Deliverables:** `fetchYesterdaysTotals()` · formatted Admin-topic post · enable toggle

**Acceptance criteria**

- Fires at configured cron in `scheduled_jobs.timezone`
- Message lists per-partner and total yesterday P&L
- Retries 3× on failure; errors logged

### Phase 5 — Integrity check cron

**Deliverables:** Midnight `/check` for all partners · mismatch reporting

**Acceptance criteria**

- Detects manual formula drift on BetLog
- No false positives on clean data
- Mismatches in AuditLog or Admin alert

### Phase 6 — Extended features

**Deliverables:** Parlay parser · `/editbet` · `/leaderboard` · `/settleup` · weekly PDF · leaderboard cache

**Acceptance criteria**

- Combined parlay odds correct
- Edit recalculates totals + audit entry
- Weekly PDF posts to Admin when enabled

---

## Future enhancements

| Enhancement | Layer | Notes |
|-------------|-------|-------|
| Partner web dashboard | Storage → External | Read-only per-partner totals |
| Anomaly detection | Safety | Unusual pattern alerts |
| Multi-currency odds | Parser | Decimal / fractional / American |
| Slack / Discord webhooks | Output | Big-bet alerts off Telegram |

---

## Spec cross-reference

| This outline | spec.html | Ref IDs |
|--------------|-----------|---------|
| Architecture layers | [#architecture](spec.html#architecture) | SPEC-08 · B03, T01, T02 |
| Config schema | [#hub-config](spec.html#hub-config) | SPEC-02 · E02, B05, S03 |
| Cron jobs | [#scheduled-jobs](spec.html#scheduled-jobs) | SPEC-03 · B04, E04, E05 |
| Commands | [#command-matrix](spec.html#command-matrix) | SPEC-04 · T01, T04, T05 |
| Edge cases | [#edge-cases](spec.html#edge-cases) | SPEC-05 · E02 |
| Sheet tabs | [#sheet-contracts](spec.html#sheet-contracts) | SPEC-06 · S01, S02, S05 |
| Business rules | [#rules-summary](spec.html#rules-summary) | SPEC-07 · T03, B04 |
| Telegram demo | [#mockup](spec.html#mockup) | SPEC-09 · T03, T04 |
| v2.6 changelog | [#changelog](spec.html#changelog) | SPEC-01 |
| Reference registry | [REFS.md](REFS.md) | DOC-04 · B01–S05, SPEC-01–09 |

```bash
open spec.html
```
