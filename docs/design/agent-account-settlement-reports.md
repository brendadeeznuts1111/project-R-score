# Agent-account settlement reports

Status: **design** · owner: agent settlement / Telegram factory (transport) ·
updated 2026-08-07

Greenfield relative to partner Soft Balance. This plane is **agent provides
accounts → clickers play → commission on net winnings → freeze-on-win until
paid**. It is not the partner CODE weekly ledger path in
[`settlement-feed.md`](settlement-feed.md).

| Existing plane | This plane |
| -------------- | ---------- |
| Partner CODE · `partner_ledger` · signed net P&L × `commissionPct` | Agent owns N sportsbook accounts; commission on **positive** week net only |
| Daily finance/capacity → package `liquidity/outs` | Daily + weekly reports → **agent private Telegram group** |
| `fundStatus` margin pause/block | Account **FROZEN** at settlement boundary until commission paid |
| No clicker entity | Clicker assigned per account; frozen ⇒ no clicker access |
| Weekly settlement posts ledger only (no chat invoice) | Weekly report **is** the settlement invoice |

Reuse (transport / patterns only): report publisher shape in
`lib/telegram/daily-*-report.ts`, `nf:` / `sd:` callback grammar, `Bun.cron`
register CLIs, package-forum addressing patterns, Command/HQ outbox routing.

---

## 1. Agent–account–settlement relationship

```text
AGENT (Account Provider)
│
├── Provides 3–10 accounts to Command
├── Earns % commission on NET WINNINGS per account per week
│     (commission only when week net_pnl > 0; 0% on losing / break-even weeks)
├── Settles weekly on each account's settlement_day
│
└── When account has WINNING WEEK:
      ├── Account AUTO-FROZEN at settlement boundary
      ├── Agent owes Command their commission (+ any prior unpaid remainder)
      ├── Account stays FROZEN until agent pays in full
      └── Once paid + Command confirms → unfreeze for next week
```

### Roles

| Role | Owns | Does not |
| ---- | ---- | -------- |
| **Agent** | Account supply, commission payment, win-max requests | Clicker play decisions |
| **Clicker** | Day-to-day wagering within win max | Settlement / unfreeze |
| **Command** | Verify payment, approve win-max raises, unfreeze | Paying the agent's commission |

### Account status (this plane)

| Status | Meaning |
| ------ | ------- |
| `ACTIVE` | Clicker may play; under win max |
| `FROZEN` / `FROZEN_PENDING_PAYMENT` | Settlement freeze — winning week unpaid |
| `READY_FOR_ASSIGNMENT` / `POOL` | Losing or break-even week; available (optional pool return) |
| `LIMITED` / `BANNED` | Ops / book constraints (orthogonal to settlement freeze) |

`freeze_reason = SETTLEMENT_PENDING` is the settlement-specific freeze. Other
freeze reasons (compliance, book lock) must not be cleared by commission pay.

---

## 2. Commission and balance carry-forward

### Per-account week math

```text
week_start_balance = accounts.week_start_balance   # snapshot at week open / last settle
week_end_balance   = accounts.current_balance
net_pnl            = week_end_balance - week_start_balance

if net_pnl > 0:
  week_commission = net_pnl * commission_rate     # e.g. 0.30
  account_status_next = FROZEN_PENDING_PAYMENT
else:
  week_commission = 0
  account_status_next = ACTIVE | READY_FOR_ASSIGNMENT
```

### Prior-week remainder (“our way” balance)

Command keeps a **settlement balance** per agent (internal books — not the
sportsbook `current_balance`). When commission is settled out:

1. **Invoice total** = Σ this week’s winning commissions + **prior unpaid
   remainder** still on the settlement balance.
2. Agent pays (Cash / Venmo / Crypto, etc.).
3. Command applies the payment **to the settlement balance** (partial OK):
   - `settlement_balance_after = max(0, settlement_balance_before - amount_paid)`
   - If remainder &gt; 0 → stays on the books; invoice next week still shows it;
     winning accounts that generated unpaid commission **stay FROZEN**.
   - If remainder = 0 → mark commissions `PAID`, unfreeze those accounts.
4. On full settle for an account: roll the **sportsbook week window**:
   - `week_start_balance = current_balance`
   - `week_pnl = 0`, `commission_due = 0`, `agent_paid = 1` for that week row
   - `last_settlement_date = now`, recompute `next_settlement_date` from
     `settlement_day`

Losing weeks do **not** create makeup that reduces future commission. Prior
losses are already reflected in a lower `week_start_balance` / bankroll; they
do not credit the settlement balance.

### Example

| Week | Account P&amp;L | New commission (30%) | Prior remainder | Invoice | Paid | Remainder after |
| ---- | --------------- | -------------------- | --------------- | ------- | ---- | --------------- |
| W31  | +$740           | $222                 | $0              | $222    | $150 | $72             |
| W32  | +$200           | $60                  | $72             | $132    | $132 | $0 → unfreeze   |

Daily report WTD projection should show **projected new commission only** plus
a separate line for **outstanding prior remainder** when &gt; 0.

---

## 3. Daily Agent Report

### Purpose

Per-agent snapshot of **their accounts only**: today, win-max proximity,
freezes, week trend, and what the settlement invoice is heading toward
(including prior unpaid remainder).

### When / where

| | |
| - | - |
| Time | End of clicker shift (e.g. 23:59 local) or 08:00 next day |
| Channel | Agent private Telegram group (account handover group) |
| Format | HTML Telegram message + inline action buttons |

### Data pulls

| Need | Source | Fields |
| ---- | ------ | ------ |
| Agent’s accounts | `accounts` | `agent_id` |
| Balances | `accounts` | `current_balance`, `week_start_balance` |
| Today’s activity | `transactions` | `tx_type`, `amount`, `created_at` (+ clicker) |
| Win max progress | `accounts` | `win_max`, week P&amp;L / lifetime week window |
| Status | `accounts` | `status`, `freeze_reason` |
| Open exposure | `accounts` or derived | `open_bets_exposure` |
| Settlement | `accounts` | `settlement_day`, `next_settlement_date` |
| Rate / carry | agent + settlement balance | `commission_rate`, prior unpaid remainder |

### Template (shape)

```text
📊 DAILY REPORT — Agent: @AgentMike
📅 {date} ({weekday})
🗓️ Settlement: {day} ({N} days remaining)

💰 YOUR ACCOUNTS SUMMARY
  ACC-…  Skin  STATUS  $bal  ▓…  Win: $w / $win_max  [Near limit | 🧊 Pending payment]

📈 TODAY'S ACTIVITY
  ACC-…  ±$  (W/L counts)  Clicker: @…

🎯 WEEK-TO-DATE PROJECTION
  Total Net Winnings:     +$…
  Your Commission (R%):   +$…          # new week only
  Outstanding prior:      $…           # settlement balance remainder (omit if 0)
  Projected invoice:      $…           # new + prior
  Status: Winning week (so far) | …
  ⚠️ If week ends positive, {accounts} FROZEN on {day} until commission settled.

🔧 ACTIONS
  [Adjust Win Max] [Request Unfreeze] [View Details] [Settle Early]
```

### Inline buttons

| Button | Behavior |
| ------ | -------- |
| Adjust Win Max | Pick account → new win max → create `raise_request` → notify Command |
| Request Unfreeze | Frozen accounts only; agent attaches/claims payment proof → Command queue |
| View Details | Full transaction dump (or link to ledger/CSV) for one account |
| Settle Early | Optional; runs settlement math before `settlement_day` |

---

## 4. Weekly Agent Report (settlement invoice)

### Purpose

1. Performance summary for the week  
2. **Settlement invoice** (new commission + prior remainder)  
3. Next-week setup (win maxes, which accounts available / frozen)

### When / where

| | |
| - | - |
| Time | Morning of settlement day (e.g. 08:00) |
| Channel | Agent private Telegram group |
| Trigger | Cron keyed by each account’s `settlement_day` (group by agent) |

### Settlement side effects (same cron window)

For each account of the agent when `today == settlement_day`:

1. Persist `weekly_snapshots` row (immutable).
2. Upsert `agent_commissions` row (`PENDING` if `week_commission > 0`).
3. Add `week_commission` onto agent **settlement balance**.
4. If `net_pnl > 0`: set `status=FROZEN`, `freeze_reason=SETTLEMENT_PENDING`;
   DM clicker “frozen — pending payment”.
5. If `net_pnl <= 0`: leave `ACTIVE` / return to pool; no freeze.
6. Send weekly report to agent group.
7. Post Command channel digest: agent owes **invoice total** (new + prior).

### Template (shape)

```text
📅 WEEKLY SETTLEMENT REPORT
Agent: @… · Week: {start} — {end} · Settlement Day: {DAY} (TODAY)

💰 ACCOUNT PERFORMANCE
  Account  Skin  Start  End  P&L  WIN|LOSS

🧾 SETTLEMENT INVOICE
  Total Winning Accounts:  N
  Total Net Winnings:      +$…
  Commission Rate:         R%
  New commission:          $…
  Prior unpaid remainder:  $…     # from settlement balance
  ────────────────────────────────
  YOU OWE COMMAND:         $…     # new + prior
  Payment Methods: Cash / Venmo / Crypto
  Contact @CommandBoss to settle

🧊 POST-SETTLEMENT STATUS
  Winning → FROZEN until payment · Losing → ACTIVE (never frozen for settle)

📊 NEXT WEEK PREVIEW
  [Adjust Win Maxes for Next Week] [Confirm Settlement] [Dispute] [View Full Ledger]
```

### Inline buttons

| Button | Behavior |
| ------ | -------- |
| Confirm Settlement | Agent asserts payment sent → notify Command to verify |
| Adjust Win Maxes | Per-account Keep / Raise / Lower → `raise_request` (applies for next week; account may stay frozen until pay) |
| Dispute | Opens ticket; commission row → `DISPUTED` |
| View Full Ledger | CSV / web ledger for the week snapshot |

---

## 5. Freeze-on-win workflow

```text
Daily 23:59
  └── Update accounts.week_pnl from transactions (all accounts)
  └── Send Daily Agent Report (per agent)

Settlement day 08:00
  └── Weekly report + freeze winning accounts + Command owe digest

Agent pays → taps Confirm Settlement
  └── Command verifies → /unfreeze or dashboard
        ├── Apply payment to settlement balance (Command books)
        ├── If remainder == 0 for those accounts:
        │     status=ACTIVE, freeze_reason=NULL
        │     week_start_balance = current_balance
        │     agent_commissions.status = PAID
        │     DM clicker resume + DM agent confirmed
        └── Else: keep FROZEN; report remaining figure on next daily/weekly
```

Win-max raise approved while frozen updates `accounts.win_max` (or
`next_win_max`) but **does not** unfreeze.

---

## 6. Data requirements

### `accounts` columns (new / extended)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `week_start_balance` | REAL | Snapshot at week open / last full settle |
| `week_pnl` | REAL | Running week P&amp;L |
| `win_max` | REAL | Soft stop for clicker week wins |
| `settlement_day` | TEXT/INT | Weekday key (e.g. `tue` / 2) |
| `commission_rate` | REAL | Agent % (or inherited from agent row) |
| `commission_due` | REAL | This week’s unpaid commission on this account |
| `last_settlement_date` | DATETIME | Last completed settle |
| `next_settlement_date` | DATETIME | From `settlement_day` |
| `agent_paid` | INTEGER 0/1 | Paid for current settlement cycle |
| `freeze_reason` | TEXT | `SETTLEMENT_PENDING` \| … |
| `open_bets_exposure` | REAL | Optional denorm |
| `clicker_id` | FK | Assigned clicker |

### `agent_settlement_balances` (Command books)

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `agent_id` | FK PK | Agent |
| `balance` | REAL | Unpaid remainder (&gt; 0 means money still owed) |
| `currency` | TEXT | Default USD |
| `updated_at` | DATETIME | Last payment or settle accrual |

Payment application always hits this table first (“add/subtract our way”).
Sportsbook `accounts.current_balance` is never rewritten by commission pay.

### `agent_commissions`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `commission_id` | PK | |
| `agent_id` | FK | |
| `account_id` | FK | |
| `week_start` / `week_end` | DATE | |
| `week_pnl` | REAL | |
| `commission_rate` | REAL | |
| `commission_amount` | REAL | |
| `status` | TEXT | `PENDING` \| `PAID` \| `WAIVED` \| `DISPUTED` \| `PARTIAL` |
| `paid_at` | DATETIME | |
| `confirmed_by` | FK | Command operator |
| `payment_method` | TEXT | Cash / Venmo / Crypto / … |

### `weekly_snapshots`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `snapshot_id` | PK | |
| `account_id` | FK | |
| `week_starting` | DATE | Canonical week start (align to settlement week, not necessarily ISO Monday) |
| `starting_balance` / `ending_balance` | REAL | |
| `net_pnl` | REAL | |
| `win_max_hit` | INTEGER | |
| `status_at_end` | TEXT | |

Immutable once written — dispute flow references snapshot, does not rewrite.

### `raise_requests`

| Field | Type | Purpose |
| ----- | ---- | ------- |
| `request_id` | PK | |
| `account_id` / `agent_id` | FK | |
| `type` | TEXT | `WIN_MAX` |
| `from_value` / `to_value` | REAL | |
| `status` | TEXT | `PENDING` \| `APPROVED` \| `DENIED` |
| `effective` | TEXT | `NEXT_WEEK` (default) |

---

## 7. Automation triggers

| Trigger | Action |
| ------- | ------ |
| Cron daily ~23:59 | Refresh `week_pnl`; send Daily Agent Report |
| Cron settlement day ~08:00 | Weekly invoice; accrue settlement balance; freeze winners |
| Cron settlement day ~08:01 | Command channel owe digest |
| Event: Confirm Settlement | Notify Command; mark payment claimed |
| Event: Command verifies pay | Apply to settlement balance; unfreeze iff remainder 0; roll `week_start_balance` |
| Event: Adjust Win Max | `raise_request` → Command approve/deny |
| Event: Dispute | Commission → `DISPUTED`; ticket |

Cron contract: OS-persistent `Bun.cron` workers under `lib/harness/cron.ts`
(same pattern as `partner:finance-report:cron:*` /
`partner:settlement:cron:*`).

---

## 8. Telegram interaction (from report)

```text
Weekly report
  → [Adjust Win Maxes]
      → inline Keep / Raise / Lower per account
      → raise_request PENDING
      → Command channel [Approve] [Deny]
      → on Approve: win_max (or next_win_max) updated; report message edited
  → [Confirm Settlement]
      → Command verifies against settlement_balance
      → unfreeze + week roll only when remainder clears
```

Callback prefix proposal (avoid colliding with `sd:` / `nf:` / `play:` /
`f:`): `as:` (agent-settlement) — e.g. `as:wm:`, `as:pay:`, `as:uf:`,
`as:dispute:`.

Webhook `lib/telegram/bot.ts` and long-poll `ops-bot.ts` must both route `as:*`
(today `nf:*` is webhook-only — do not repeat that gap).

---

## 9. What this solves

| Problem | Solution |
| ------- | -------- |
| Agent doesn’t know amount owed | Weekly invoice = new commission + prior remainder |
| Partial pay / forgotten remainder | Settlement balance carries until cleared |
| Forgot settlement day | Report morning of `settlement_day` |
| Clicker plays winning account before pay | Auto-freeze at boundary |
| Hot account needs higher win max | Inline adjust → Command approve |
| Who paid? | `agent_commissions` + settlement balance + `confirmed_by` |
| Number disputes | Immutable `weekly_snapshots` |

---

## 10. Explicit non-goals (v1)

- Do **not** dual-write into `partner_ledger` / Soft Balance / toc-ops `ct`.
- Do **not** treat Sports Terminal `agent_billing` period rows as SSOT (may
  later project).
- No losing-week makeup credit against future commission.
- No rewriting sportsbook balance when commission is paid — only Command
  settlement balance + account freeze/week window fields.
- `winMax` remains a **forbidden partner-dashboard wire alias**; this plane’s
  `win_max` is account-ops vocabulary, not the partner dashboard MVP wire.

---

## 11. Implementation sketch (later PRs)

| Phase | Deliverable |
| ----- | ----------- |
| **D0** | This design SSOT |
| **D1** | Schema migration: account week fields, `agent_settlement_balances`, `agent_commissions`, `weekly_snapshots`, `raise_requests` + brands |
| **D2** | Pure engines: week P&amp;L, invoice (new + prior), freeze/unfreeze, payment apply |
| **D3** | Telegram templates + `as:*` callbacks + agent-group addressing |
| **D4** | Cron workers: daily report, settlement-day invoice/freeze |
| **D5** | Command verify / unfreeze ops commands + portal/queue bake (optional) |

Proof owners: unit tests on invoice/carry math; journey test on
freeze → partial pay → remainder → full pay → unfreeze + week roll.

---

## Related

- [`settlement-feed.md`](settlement-feed.md) — partner CODE weekly ledger (different plane)
- [`unified-partner-profile.md`](unified-partner-profile.md) — partner `settlement.*` terms
- [`soft-handshake.md`](soft-handshake.md) — Soft ↔ Factory reporting boundary
- [`../harness/tenants/telegram-factory.md`](../harness/tenants/telegram-factory.md) — report transport / cron
- [`../harness/tenants/partner-domain-map.md`](../harness/tenants/partner-domain-map.md) — desk domain map
- Reuse candidates: `lib/telegram/daily-finance-report.ts`,
  `lib/partner-profile/settlement-runner.ts` (math shape only),
  `lib/harness/cron.ts`
