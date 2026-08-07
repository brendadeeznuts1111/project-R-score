# Agent-account settlement reports

Status: **design** · owner: agent settlement / Telegram factory (transport) ·
updated 2026-08-07 · **mock anchor: 08 v3** (v2 obsolete)

Greenfield relative to partner Soft Balance. This plane is **agent provides
accounts → clickers play → win-split on net winnings → freeze-on-win until
per-account unlock (or rolling reduction)**. It is not the partner CODE weekly
ledger path in [`settlement-feed.md`](settlement-feed.md).

| Existing plane | This plane |
| -------------- | ---------- |
| Partner CODE · `partner_ledger` · signed net P&L × `commissionPct` | Agent owns N sportsbook accounts; **positive** week net only enters the split |
| Daily finance/capacity → package `liquidity/outs` | Daily + weekly reports → **agent private Telegram group** |
| `fundStatus` margin pause/block | Account **FROZEN** at settlement; unlock via exact `unfreeze_price` |
| No clicker entity | Clicker assigned per account; frozen ⇒ no clicker access |
| Weekly settlement posts ledger only (no chat invoice) | Weekly report **is** the settlement invoice (**Mock 08 v3**) |

Reuse (transport / patterns only): report publisher shape in
`lib/telegram/daily-*-report.ts`, `nf:` / `sd:` callback grammar, `Bun.cron`
register CLIs, package-forum addressing patterns, Command/HQ outbox routing.

---

## Vocabulary

| UI / reports | DB / code | Meaning |
| ------------ | --------- | ------- |
| **Win Cap (Guaranteed)** | `win_max` | Ceiling the Operation guarantees to pay if the account wins. Not `max_bet` (stake limit). |
| **Agent keep rate** | `agent_keep_rate` (e.g. `0.30`) | Share of positive net credited to the agent |
| **Op share rate** | `op_share_rate` (= `1 - agent_keep_rate`, e.g. `0.70`) | Share added to the rolling figure owed to the Operation |
| **Rolling figure** | `rolling_figure` (agent-level) | Running amount owed to Op; accrues Op share each settle week |
| **Unfreeze price** | `unfreeze_price` | Per winning account: **that account’s net win** (`net_pnl`). Exact payment required to unlock |
| **Rolling reduction payment** | payment tag `ROLLING` | Money applied to rolling figure only — **does not** unfreeze any account |
| **Unfreeze payment** | payment tag `ACCOUNT:<id>` | Must equal that account’s `unfreeze_price`; unlocks that account |

Partner-dashboard wire alias `winMax` stays **forbidden**. This plane’s `win_max`
is account-ops vocabulary surfaced as **Win Cap (Guaranteed)**.

---

## 1. Agent–account–settlement relationship

```text
AGENT (Account Provider)
│
├── Provides 3–10 accounts to Command / Operation
├── On each winning account week (net_pnl > 0):
│     ├── Agent keep  = net_pnl × agent_keep_rate   (e.g. 30%) → credit to agent
│     └── Op share    = net_pnl × op_share_rate     (e.g. 70%) → added to rolling figure
├── Settles weekly on each account's settlement_day
│
└── When account has WINNING WEEK:
      ├── Account AUTO-FROZEN at settlement boundary
      ├── unfreeze_price = net_pnl  (full net win — not the 70% alone)
      ├── Account stays FROZEN until an unfreeze-tagged payment matches that price
      └── Agent may also pay the general rolling figure without unlocking accounts
```

### Roles

| Role | Owns | Does not |
| ---- | ---- | -------- |
| **Agent** | Account supply, keep credit, rolling / unfreeze payments, Win Cap requests | Clicker play decisions |
| **Clicker** | Day-to-day wagering within Win Cap (Guaranteed) | Settlement / unfreeze |
| **Command / Operation** | Verify payments, approve Win Cap raises, unfreeze, own rolling figure | Paying the agent’s keep (that is the agent’s credit) |

### Account status (this plane)

| Status | Meaning |
| ------ | ------- |
| `ACTIVE` | Clicker may play; under Win Cap (Guaranteed) |
| `FROZEN` / `FROZEN_PENDING_PAYMENT` | Settlement freeze — winning week; awaiting exact unfreeze payment |
| `READY_FOR_ASSIGNMENT` / `POOL` | Losing or break-even week; available (optional pool return) |
| `LIMITED` / `BANNED` | Ops / book constraints (orthogonal to settlement freeze) |

`freeze_reason = SETTLEMENT_PENDING` is the settlement-specific freeze. Other
freeze reasons (compliance, book lock) must not be cleared by settlement pay.

---

## 2. Split math, rolling figure, payments

### Per-account week math

```text
week_start_balance = accounts.week_start_balance
week_end_balance   = accounts.current_balance
net_pnl            = week_end_balance - week_start_balance

if net_pnl > 0:
  agent_keep_amt   = net_pnl * agent_keep_rate      # e.g. 0.30 — credit to agent
  op_share_amt     = net_pnl * op_share_rate        # e.g. 0.70 — to rolling figure
  unfreeze_price   = net_pnl                        # exact unlock price
  account_status_next = FROZEN_PENDING_PAYMENT
else:
  agent_keep_amt = 0
  op_share_amt   = 0
  unfreeze_price = 0
  account_status_next = ACTIVE | READY_FOR_ASSIGNMENT
```

Agent-week totals:

```text
total_net_winnings = Σ net_pnl        where net_pnl > 0
AGENT_KEEPS        = Σ agent_keep_amt               # credit
ADDED_TO_ROLLING   = Σ op_share_amt                 # debt accrual
rolling_figure_after = rolling_figure_before + ADDED_TO_ROLLING
                     − rolling_reduction_payments
                     − op_share portions cleared by confirmed unfreeze payments
```

### Worked example (Mock 08 v3 numbers)

Winning accounts: +$140, +$300, +$300 → **total net winnings +$740**  
`agent_keep_rate = 0.30`, `op_share_rate = 0.70`

| Line | Amount |
| ---- | ------ |
| **AGENT KEEPS (30%)** | **$222** (credit to agent) |
| **ADDED TO ROLLING FIGURE (70%)** | **$518** (owed to Op) |

| Account | Net win | Agent keep 30% | Op share 70% | Badge |
| ------- | ------- | -------------- | ------------ | ----- |
| ACC-142 | +$140 | $42 | $98 | `FROZEN — Pay $140 to unlock` |
| ACC-143 | +$300 | $90 | $210 | `FROZEN — Pay $300 to unlock` |
| ACC-145 | +$300 | $90 | $210 | `FROZEN — Pay $300 to unlock` |
| ACC-144 (loss) | −$60 | $0 | $0 | not frozen for settlement |

If `rolling_figure_before = $200`:

```text
rolling_figure_after (pre-payments) = 200 + 518 = 718
```

### Two payment rails (model both; default unfreeze = per-account)

| Rail | Tag | Amount rule | Effect |
| ---- | --- | ----------- | ------ |
| **Rolling reduction** | `ROLLING` | Any amount &gt; 0 | Decreases `rolling_figure` only. **No** account unfrozen. Shown on report as **Rolling Reduction Payments**. |
| **Unfreeze** | `ACCOUNT:<id>` | **Must exactly equal** that account’s `unfreeze_price` (net win) | Unfreezes that account; clears its settlement freeze; reduces rolling by that account’s `op_share_amt`; rolls `week_start_balance` for that account |

Default UX and automation: **per-account tagging for unfreezes**. Agents may still throw money at the general rolling figure to cut debt / credit utilization without unlocking seats.

Partial / wrong-amount unfreeze-tagged payments do **not** unlock (hold as in-transit or reject to rolling-only per Command policy — default: leave in **payment-in-transit** until amount matches or Command retags).

### Payment-in-transit

Reports show a dedicated section for payments claimed but not yet Command-confirmed, including **destination tag/address** (Venmo handle, crypto address, cash desk id, etc.) so agent and Command share one reference.

---

## 3. Mock 08 v3 — Weekly Settlement Report (structural anchor)

**Mock 08 v2 is obsolete.** Regen **08 v3** first; after layout + math approval, batch-regen
02 (limit profile matrix), 05 (varying raise rows), 07 (locked numbers).

### Required layout blocks (in order)

1. **Header** — Weekly Settlement Report · agent · week range · settlement day (TODAY)
2. **Per-account PnL lines** — Start / End / P&amp;L / WIN|LOSS · Win Cap (Guaranteed)
3. **Bold split headers** (prominent — the missing piece in v2):
   - `AGENT KEEPS (30%): $222` — credit to agent
   - `ADDED TO ROLLING FIGURE (70%): $518` — owed to Op
4. **Rolling figure update** — `rolling_figure_before` → `rolling_figure_after`
5. **Frozen badges** — each winner: `ACC-…: FROZEN — Pay $<unfreeze_price> to unlock`
6. **Rolling Reduction Payments** — dedicated row(s); deducts from rolling total; clearly **not** an unlock
7. **Payment-in-transit** — amount, method, **destination tag/address**, optional account tag
8. **Next week / actions** — Adjust Win Cap (Guaranteed) · Confirm payment · Dispute · Ledger

### Telegram template (08 v3 shape)

```text
📅 WEEKLY SETTLEMENT REPORT
Agent: @AgentMike
Week: July 31 — August 6, 2026
Settlement Day: TUESDAY (TODAY)

━━━━━━━━━━━━━━━━━━━━━━━
💰 ACCOUNT PERFORMANCE
━━━━━━━━━━━━━━━━━━━━━━━
Account   Skin         Start    End      P&L     Win Cap (Guaranteed)  Result
ACC-142   DGS-Alpha    $1,100   $1,240   +$140   $150                  🟢 WIN
ACC-143   ASI-Prime    $2,900   $3,200   +$300   $300                  🟢 WIN
ACC-144   PPHPro-Red   $950     $890     -$60    $100                  🔴 LOSS
ACC-145   BookMaker-Bl $4,200   $4,500   +$300   $250                  🟢 WIN

━━━━━━━━━━━━━━━━━━━━━━━
🧾 SETTLEMENT SPLIT
━━━━━━━━━━━━━━━━━━━━━━━
Total Net Winnings (winners):   +$740
Agent keep rate / Op share:     30% / 70%

AGENT KEEPS (30%):              $222      ← credit to agent
ADDED TO ROLLING FIGURE (70%):  $518      ← owed to Operation

Rolling figure:  $200  →  $718
  (before)           (after accrual; before new payments)

━━━━━━━━━━━━━━━━━━━━━━━
🧊 FROZEN — UNLOCK PRICES
━━━━━━━━━━━━━━━━━━━━━━━
ACC-142: FROZEN — Pay $140 to unlock
ACC-143: FROZEN — Pay $300 to unlock
ACC-145: FROZEN — Pay $300 to unlock
ACC-144: ACTIVE (loss — not frozen)

━━━━━━━━━━━━━━━━━━━━━━━
📉 ROLLING REDUCTION PAYMENTS
━━━━━━━━━━━━━━━━━━━━━━━
(none this week | or: -$X tagged ROLLING — reduces debt, does not unfreeze)

━━━━━━━━━━━━━━━━━━━━━━━
💸 PAYMENT IN TRANSIT
━━━━━━━━━━━━━━━━━━━━━━━
$… via Venmo → @OpDeskVenmo
Tag: ROLLING | ACCOUNT:ACC-142
Status: awaiting Command confirm

━━━━━━━━━━━━━━━━━━━━━━━
📊 NEXT WEEK
━━━━━━━━━━━━━━━━━━━━━━━
[Adjust Win Cap] [Confirm Payment] [Dispute] [View Full Ledger]
```

### Inline buttons

| Button | Behavior |
| ------ | -------- |
| Confirm Payment | Agent asserts payment sent (choose tag: rolling vs account) → Command verify queue |
| Adjust Win Cap | Per-account Keep / Raise / Lower → `raise_request` type `WIN_MAX` (UI: Win Cap) |
| Dispute | Ticket; snapshot immutable |
| View Full Ledger | CSV / web for week snapshot |

---

## 4. Daily Agent Report

### Purpose

Per-agent snapshot: today, Win Cap (Guaranteed) proximity, freezes with unlock
prices, week trend, projected keep vs rolling accrual, prior rolling figure.

### When / where

| | |
| - | - |
| Time | End of clicker shift (e.g. 23:59 local) or 08:00 next day |
| Channel | Agent private Telegram group |
| Format | HTML Telegram message + inline actions |

### Data pulls

| Need | Source | Fields |
| ---- | ------ | ------ |
| Agent’s accounts | `accounts` | `agent_id` |
| Balances | `accounts` | `current_balance`, `week_start_balance` |
| Today’s activity | `transactions` | `tx_type`, `amount`, `created_at` (+ clicker) |
| Win Cap progress | `accounts` | `win_max` (UI: Win Cap (Guaranteed)), week P&amp;L |
| Status / unlock | `accounts` | `status`, `freeze_reason`, `unfreeze_price` |
| Open exposure | `accounts` or derived | `open_bets_exposure` |
| Settlement | `accounts` | `settlement_day`, `next_settlement_date` |
| Rates / rolling | agent books | `agent_keep_rate`, `rolling_figure` |

### Template (shape)

```text
📊 DAILY REPORT — Agent: @AgentMike
📅 {date} ({weekday})
🗓️ Settlement: {day} ({N} days remaining)

💰 YOUR ACCOUNTS SUMMARY
  ACC-…  Skin  STATUS  $bal  ▓…  Win Cap: $w / $win_max
  ACC-…  FROZEN — Pay $unfreeze_price to unlock

📈 TODAY'S ACTIVITY
  ACC-…  ±$  (W/L)  Clicker: @…

🎯 WEEK-TO-DATE PROJECTION
  Total Net Winnings (so far):  +$…
  AGENT KEEPS (30%):            +$…     # credit
  TO ROLLING FIGURE (70%):      +$…     # projected accrual
  Rolling figure now:           $…
  ⚠️ Winners freeze on {day}; unlock = pay each account's net win exactly.

🔧 ACTIONS
  [Adjust Win Cap] [Pay Unlock] [Pay Rolling] [View Details]
```

### Inline buttons

| Button | Behavior |
| ------ | -------- |
| Adjust Win Cap | Account → new Win Cap → `raise_request` → Command |
| Pay Unlock | Frozen accounts only; amount locked to `unfreeze_price`; tag `ACCOUNT:<id>` |
| Pay Rolling | Free amount → tag `ROLLING` |
| View Details | Transaction dump / ledger link |

---

## 5. Freeze-on-win workflow

```text
Daily 23:59
  └── Update accounts.week_pnl
  └── Send Daily Agent Report

Settlement day 08:00
  └── Snapshot week · credit agent keep · accrue Op share to rolling_figure
  └── Freeze each winner; set unfreeze_price = net_pnl
  └── Send Mock-08-v3 weekly report + Command digest

Payments
  ├── tag ROLLING → reduce rolling_figure only
  └── tag ACCOUNT:X + amount == unfreeze_price(X)
        → unfreeze X
        → reduce rolling by X.op_share_amt
        → week_start_balance(X) = current_balance
        → DM clicker resume · DM agent confirmed
```

Win Cap raise approved while frozen updates `win_max` / `next_win_max` but
**does not** unfreeze.

---

## 6. Data requirements

### `accounts` columns (new / extended)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `week_start_balance` | REAL | Snapshot at week open / last full unlock settle |
| `week_pnl` | REAL | Running week P&amp;L |
| `win_max` | REAL | **Win Cap (Guaranteed)** — DB name stays `win_max` |
| `settlement_day` | TEXT/INT | Weekday key |
| `agent_keep_rate` | REAL | Override or inherit from agent (e.g. `0.30`) |
| `unfreeze_price` | REAL | Set at settle when `net_pnl > 0`; else 0 |
| `op_share_amt` | REAL | This week’s Op share parked on the account row (audit) |
| `agent_keep_amt` | REAL | This week’s agent keep (audit) |
| `last_settlement_date` | DATETIME | |
| `next_settlement_date` | DATETIME | |
| `freeze_reason` | TEXT | `SETTLEMENT_PENDING` \| … |
| `open_bets_exposure` | REAL | Optional denorm |
| `clicker_id` | FK | Assigned clicker |

### `agent_rolling_figures` (Operation books — replaces vague “settlement balance”)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `agent_id` | FK PK | |
| `rolling_figure` | REAL | Amount owed to Op (≥ 0) |
| `currency` | TEXT | Default USD |
| `updated_at` | DATETIME | |

Sportsbook `accounts.current_balance` is never rewritten by keep/rolling/pay.

### `agent_week_settlements` (per account per week — replaces old “commission invoice” framing)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `settlement_id` | PK | |
| `agent_id` / `account_id` | FK | |
| `week_start` / `week_end` | DATE | |
| `week_pnl` | REAL | |
| `agent_keep_rate` / `op_share_rate` | REAL | |
| `agent_keep_amt` / `op_share_amt` | REAL | |
| `unfreeze_price` | REAL | `max(week_pnl, 0)` |
| `status` | TEXT | `OPEN` \| `UNLOCKED` \| `WAIVED` \| `DISPUTED` |
| `unlocked_at` | DATETIME | |
| `confirmed_by` | FK | Command operator |

### `settlement_payments`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `payment_id` | PK | |
| `agent_id` | FK | |
| `amount` | REAL | |
| `tag` | TEXT | `ROLLING` \| `ACCOUNT:<id>` |
| `method` | TEXT | Cash / Venmo / Crypto / … |
| `destination` | TEXT | Tag/address/handle shown in-transit |
| `status` | TEXT | `IN_TRANSIT` \| `CONFIRMED` \| `REJECTED` \| `RETagged` |
| `confirmed_by` | FK | |
| `confirmed_at` | DATETIME | |

### `weekly_snapshots`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `snapshot_id` | PK | |
| `account_id` | FK | |
| `week_starting` | DATE | Settlement week start |
| `starting_balance` / `ending_balance` | REAL | |
| `net_pnl` | REAL | |
| `win_max` | REAL | Win Cap at end |
| `win_max_hit` | INTEGER | |
| `agent_keep_amt` / `op_share_amt` | REAL | |
| `unfreeze_price` | REAL | |
| `status_at_end` | TEXT | |

Immutable once written.

### `raise_requests`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `request_id` | PK | |
| `account_id` / `agent_id` | FK | |
| `type` | TEXT | `WIN_MAX` (UI: Win Cap (Guaranteed)) |
| `from_value` / `to_value` | REAL | |
| `status` | TEXT | `PENDING` \| `APPROVED` \| `DENIED` |
| `effective` | TEXT | `NEXT_WEEK` (default) |

---

## 7. Automation triggers

| Trigger | Action |
| ------- | ------ |
| Cron daily ~23:59 | Refresh `week_pnl`; send Daily Agent Report |
| Cron settlement day ~08:00 | Snapshot; credit keep; accrue rolling; freeze winners; set `unfreeze_price`; send 08 v3 report |
| Cron settlement day ~08:01 | Command digest: rolling after + unlock price list |
| Event: payment IN_TRANSIT | Show destination on report; notify Command |
| Event: Command confirms `ROLLING` | Decrease `rolling_figure` |
| Event: Command confirms `ACCOUNT:X` with exact price | Unfreeze X; decrease rolling by `op_share_amt`; week roll |
| Event: Adjust Win Cap | `raise_request` → Command approve/deny |
| Event: Dispute | Settlement row → `DISPUTED`; ticket |

Cron contract: OS-persistent `Bun.cron` via `lib/harness/cron.ts`.

---

## 8. Telegram interaction

```text
Weekly report (08 v3)
  → [Adjust Win Cap] → Keep / Raise / Lower → raise_request → Command
  → [Confirm Payment]
        → choose ROLLING (any $) or ACCOUNT (amount locked to unfreeze_price)
        → capture method + destination tag/address
        → IN_TRANSIT until Command confirms
```

Callback prefix: `as:` (agent-settlement) — `as:wm:`, `as:pay:rolling`,
`as:pay:acc:`, `as:dispute:`. Wire on **both** webhook `bot.ts` and long-poll
`ops-bot.ts`.

---

## 9. What this solves

| Problem | Solution |
| ------- | -------- |
| Confusion over who keeps what | Bold **AGENT KEEPS (30%)** vs **ADDED TO ROLLING (70%)** on 08 v3 |
| “Commission” misread as agent invoice only | Rolling figure is Op debt; keep is agent credit |
| Win Cap vs max bet | UI **Win Cap (Guaranteed)**; DB `win_max` |
| Unlock vs debt paydown | Per-account exact `unfreeze_price` vs general rolling reduction |
| Partial / in-flight pays | Payment-in-transit + destination displayed |
| Number disputes | Immutable `weekly_snapshots` |

---

## 10. Explicit non-goals (v1)

- Do **not** dual-write into `partner_ledger` / Soft Balance / toc-ops `ct`.
- Do **not** treat Sports Terminal `agent_billing` as SSOT.
- No losing-week makeup credit against rolling.
- No rewriting sportsbook balance on pay — only rolling figure + freeze/week fields.
- Do **not** unfreeze on rolling-only payments (even if rolling hits 0) unless
  Command runs an explicit waive/unlock policy (out of band).
- Mock 08 **v2** must not be reused; 02 / 05 / 07 wait until 08 v3 approved.

---

## 11. Implementation sketch (later PRs)

| Phase | Deliverable |
| ----- | ----------- |
| **D0** | This design SSOT + Mock 08 v3 approval |
| **D1** | Schema: week fields, `agent_rolling_figures`, `agent_week_settlements`, `settlement_payments`, snapshots, raise_requests + brands |
| **D2** | Pure engines: split math, rolling apply, exact unfreeze, payment tags |
| **D3** | Telegram 08 v3 / daily templates + `as:*` callbacks |
| **D4** | Cron workers |
| **D5** | Command confirm / retag ops + optional portal queue |

Proof: unit tests on 30/70 split + rolling before/after; journey on freeze →
rolling-only pay (still frozen) → exact unfreeze pay → unlock + week roll.

---

## 12. Mock regen sequence

1. **08 v3** (this doc) — structural anchor — **do first**
2. After layout + math sign-off: batch **02** (limit profile matrix), **05**
   (varying raise rows), **07** (locked numbers)
3. Align copy: always **Win Cap (Guaranteed)** in UI chrome of those mocks

---

## Related

- [`settlement-feed.md`](settlement-feed.md) — partner CODE weekly ledger (different plane)
- [`unified-partner-profile.md`](unified-partner-profile.md) — partner `settlement.*` terms
- [`soft-handshake.md`](soft-handshake.md) — Soft ↔ Factory reporting boundary
- [`../harness/tenants/telegram-factory.md`](../harness/tenants/telegram-factory.md) — report transport / cron
- [`../harness/tenants/partner-domain-map.md`](../harness/tenants/partner-domain-map.md) — desk domain map
- Reuse candidates: `lib/telegram/daily-finance-report.ts`,
  `lib/partner-profile/settlement-runner.ts` (scheduler shape only),
  `lib/harness/cron.ts`
