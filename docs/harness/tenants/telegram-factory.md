# Telegram factory bot — env, API, rate limits

Harness tenant doc for the **factory** Telegram integration (`@factorywager_bot`). Code SSOT: [`lib/telegram/telegram-config.ts`](../../../lib/telegram/telegram-config.ts) · [`lib/telegram/telegram-api.ts`](../../../lib/telegram/telegram-api.ts).

## Prerequisites (before consume / welcome drain)

| Step | Command / env | Notes |
|------|----------------|-------|
| 1. Bot token | `TELEGRAM_BOT_FACTORY` via Proton Pass (`pass://factorywager/Telegram: factorywager_bot/password`) → `bun run proton:inject:factorywager` | Create via [@BotFather](https://t.me/BotFather); store in vault; never commit |
| 2. Verify | `bun run telegram:verify` | Calls `getMe` + `getWebhookInfo` |
| 2b. Discover | `bun run telegram:discover` | Bot API inventory + `ops_telegram_known_chats` (learned from updates) |
| 2c. Brand | `bun run telegram:brand -- --groups` | Bun.Image profile, concern-separated groups, photos/topics |
| 2d. Surfaces | `bun run telegram:brand -- --matrix` | Concern matrix + naming grammar (`lib/telegram/surfaces.ts`) |
| 2e. Surfaces pipeline | `bun run telegram:surfaces:pipeline` | discover → audit → map (`telegram:surfaces:discover` · `:audit` · `:map`) |
| 2f. Graph | `bun run telegram:ops -- graph` | Live topology from known chats (`--mermaid` · `--env`) |
| 3. Webhook + menu | `bun run telegram:factory:setup` | `setMyCommands` + `setWebhook` → Pages `/api/telegram/webhook/factory` (R2 enqueue; see Architecture) |
| 3b. Drain updates | `bun run telegram:ops:consume` | Processes R2 `telegram-updates` + `telegram-commands` + outbox |
| 4. Linked seats | `/start link_<nonce>` or `bun tools/telegram-link-chat.ts ASH-001 tg:chat:…` | Sets `tree_nodes.telegram_id` + `ChatChannelMeta`; CLI also enqueues `partner.welcome` when a profile binding exists (`--no-welcome` to skip) |
| 5. Drain | `bun run telegram:ops:consume` | R2 command queue + `ops_channel_outbox` projectors (HTML templates) |
| 5b. Dry-run drain | `bun run telegram:ops:consume -- --preview` | Queue + outbox counts only |

**Full identity integration** (cellphone → profile → seat → ChatChannelMeta → HTML templates): [`partner-onboarding-package.md`](partner-onboarding-package.md).

**Package group bridge:** [`partner-package-group-handshake.md`](partner-package-group-handshake.md) · machine ref: `bun run telegram:handshake:catalog`

**Seat capital desk** (pinned Liquidity/Outs table + Fill keyboard): [`seat-capital-desk.md`](seat-capital-desk.md) · `bun run seat:desk:refresh SPEN-001`

**Soft assist** (after factory JSONL): `bun run ct package-group-pending` · `bun run ct package-group-wire CODE --chat tg:chat:-100… --apply --ack` (in `toc-ops-repo`).

Transport health API: [`lib/telegram/telegram-transport-health.ts`](../../../lib/telegram/telegram-transport-health.ts) · `bun run telegram:verify -- --json`

## Known chats (self-learning)

Bot API has no membership list. On each drained update, Bun upserts `chat.id` into `ops_telegram_known_chats` (`lib/telegram/known-chats.ts`) from `message`, `callback_query`, and `my_chat_member`. Leave/kick sets `active=0`. Webhook `allowed_updates` includes `my_chat_member` via `telegram:factory:setup`.

| Action | Command |
|--------|---------|
| Directory table | `bun run telegram:ops -- directory` |
| Rich directory (package join) | `bun run telegram:ops -- directory --rich` |
| Refresh titles / member counts | `bun run telegram:ops -- directory --refresh` or `telegram:discover -- --refresh` |
| Handshake (package groups) | [`partner-package-group-handshake.md`](partner-package-group-handshake.md) · `bun run telegram:handshake:catalog` |
| Broadcast (direct) | `bun run telegram:ops -- send --all "text"` | Rate-limited immediate send + `ops_broadcast_log` |
| Broadcast (queued) | `bun run telegram:ops -- send --all --queue "text"` | Enqueue per chat; drain via `telegram:ops:consume` |

Broadcast audits each attempt in `ops_broadcast_log`. Sends go through rate-limited `sendTelegramBotMessage`. In-chat ops gates: `/register` is DM-only; `/deploy` requires portal admin or `OPS_ADMIN_USER_IDS` ([`lib/telegram/ops-acl.ts`](../../../lib/telegram/ops-acl.ts)). CLI `send` trusts the local token holder (no ACL on broadcast).

## Concern separation + naming

**One Telegram group per concern** — do not mix production alerts with staging Soft or bot experiments.

| Slug | Title format | Topics (inside the group) |
|------|----------------|---------------------------|
| `all-accounting` | `TOC Ops · Accounting` | Deposits · Withdrawals · Reconcile |
| `hq` | `TOC Ops · HQ` | alerts · day-ops · aar · identity |
| `ash-staging` | `TOC Ops · ASH · staging` | plays · balances · onboard · alerts |
| `sandbox` | `TOC Ops · sandbox` | scratch · experiments |

Grammar (middle-dot U+00B7):

| Kind | Format | Example |
|------|--------|---------|
| Ops desk | `TOC Ops · HQ` | production |
| Env desk | `TOC Ops · {CALL_SIGN} · {env}` | `TOC Ops · ASH · staging` |
| Sandbox | `TOC Ops · sandbox` | experiments |
| Partner package (ct) | `TOC Ops · {CODE} · {DisplayName}` | `TOC Ops · BILLY · Billy Ops` |

**Partner package forum topics** — identical for every partner CODE. Full plan: [partner-package-group-handshake.md § Forum topic plans](partner-package-group-handshake.md#forum-topic-plans-ssot) · code `PARTNER_PACKAGE_FORUM_TOPIC_PLAN` · `bun run telegram:handshake:catalog --json`.

Factory SSOT: [`lib/telegram/surfaces.ts`](../../../lib/telegram/surfaces.ts) (house surfaces only). Package titles in Soft desk: [`toc-ops-repo` telegram-surfaces](../../../toc-ops-repo/src/central-tool/telegram-surfaces.ts). Bind chat ids with `TELEGRAM_SURFACES` JSON (`pkg-{code}` for package forums); primary projector fallback remains `TELEGRAM_OPS_CHAT_ID`.

**Outbox routing (no DM `telegramId`):** `alerts`/`dod`/`toc` → `hq` · `plays`/`identity`/`provisioning` → `ash-staging` · `experiments` → `sandbox` · else `TELEGRAM_OPS_CHAT_ID`. Directory tags `surface_slug` from title/env. Broadcast: `telegram:ops -- send --surface ash-staging --all …`. ACL: `/register` DM-only · `/deploy` needs portal admin or `OPS_ADMIN_USER_IDS`.

## Partner message path (deep)

```text
renderForNode(templateId, treeNodeId)
  → HTML + KeyboardSpec (textKey → locale)
  → outbox payload (partner.welcome / partner.onboard.complete)
  → processChannelOutbox → sendTelegramBotMessage (parseMode HTML + replyMarkup)

Flow cards (welcome / balances / status) call the same renderForNode.
ChatChannelMeta (ops_chat_channel_meta) holds callSigns · topics · lastTemplateIds.
```

Templates SSOT: [`lib/telegram/templates/`](../../../lib/telegram/templates/) · link CLI: `bun run telegram:link-chat`

## Environment variables

Token SSOT: [`loadTelegramEnv()`](../../../lib/telegram/telegram-config.ts) → `effectiveToken = TELEGRAM_BOT_FACTORY ?? TELEGRAM_BOT_TOKEN`. Prefer FACTORY; legacy TOKEN remains for older hosts.

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_FACTORY` | Yes (or legacy `TELEGRAM_BOT_TOKEN`) | Factory tenant token — [`config/tenants.ts`](../../../config/tenants.ts) |
| `TELEGRAM_WEBHOOK_SECRET` | Required on Pages | Same value in local `.env` + Pages Variables/Secrets (prod+preview). Without it the edge webhook returns **503**. Redeploy after setting. |
| `TELEGRAM_OPS_CHAT_ID` | For group alerts | Supergroup id when outbox row has no `telegramId` |
| `TELEGRAM_SURFACES` | Recommended | JSON slug→chat_id — house (`hq`, `all-accounting`, `ash-staging`, `sandbox`) + package `pkg-{code}`; see `telegram:handshake:catalog` |
| `TELEGRAM_ACCOUNTING_CHAT_ID` | Optional | Cross-partner accounting rollup supergroup (also sets `all-accounting` in surfaces map) |
| `TELEGRAM_TOPICS` | For forum threads | JSON map → `message_thread_id` (see below) |
| `TELEGRAM_RATE_LIMIT_MIN_INTERVAL_MS` | Optional | Default `34` (~29 msg/s; Telegram ~30/s) |

Science / tennis tenants use `TELEGRAM_BOT_SCIENCE` / `TELEGRAM_BOT_TENNIS` (same pattern).

## Forum topics (`TELEGRAM_TOPICS`)

Routes outbox posts to threads inside a **house** supergroup (HQ, staging, sandbox). **Not** used for partner package forum thread ids — those live in `reports/telegram/forums/{CODE}.json`.

Partner vs house topic plans: [partner-package-group-handshake.md § Forum topic plans](partner-package-group-handshake.md#forum-topic-plans-ssot).

Example (house HQ):

```json
{"ops": 2, "alerts": 5, "toc": 8, "plays": 3, "welcome": 0}
```

- **DMs** (`partner.welcome`, play ack to `tree_nodes.telegram_id`) — no thread id.
- **Group fallback** — when payload lacks `telegramId`, projector uses `TELEGRAM_OPS_CHAT_ID` + thread from outbox `topic` / `event_type` via [`threadIdForOutboxTopic`](../../../lib/telegram/telegram-config.ts).

Payload overrides: `messageThreadId` or `message_thread_id` on outbox JSON.

## Rate limiting

All `sendMessage` calls go through [`sendTelegramBotMessage`](../../../lib/telegram/telegram-api.ts):

- Per-token minimum interval (default 34 ms).
- On HTTP 429 / `error_code: 429`, waits `retry_after` seconds and retries once.

No rate limiter on `getMe` / webhook setup (infrequent).

## Account dossier (bot ↔ portal)

Linked seats can open the single-account portal board from Telegram:

| Command | Handler | Portal |
|---------|---------|--------|
| `/dossier` · `/dossier CODE` · `/dossier CODE-001` | [`handleOpsDossier`](../../../lib/telegram/ops-commands.ts) | `https://score.factory-wager.com/portal/account/?account={TreeNodeId\|CODE}` |
| `/limits` | [`handleOpsLimits`](../../../lib/telegram/ops-commands.ts) | `/portal/limits/#account:{TreeNodeId}` (+ dossier link) |

`/dossier CODE` is allowed for linked seats under that CODE, or when the caller
is in `OPS_ADMIN_USER_IDS`. Seat capital desk root keyboard includes
**📁 Dossier** (URL button → same portal board).

Board sections `#section:telegram` / `#section:accounting` / `#section:activity`
join `partners-ops.json` + `telegram-handshake.json` (concepts:
`page.accountDossier` · `ops.view.per_account` · `section.partnersTelegram` ·
`telegram.handshake` · `telegram.message.*` · `partner.ops.event`). Refresh bot
menu after deploy: `bun run telegram:factory:setup`.

### Ops reporting-view glossary (MVP)

Factory overlay — events stay Kalshi-owned (`accounting.*` · `event.*`). Soft
Balance / per-play ledgers stay in `toc-ops-repo`.

| Shipped | Deferred |
|---------|----------|
| `ops.view.per_account` · `per_play` · `per_week` · `per_book_type` (dimensions) | Per-play field chrome (`play_stake`, …) |
| `ops.view.account_summary` · `account_deposits` · `account_settlements` · `account_credit` · `account_freeplay` · `account_net` | Weekly composites / WoW / rolling windows |
| `telegram.message.{incoming,outgoing,alert,command,receipt}` | Book-type deposit/settlement/fee rollups |
| `telegram.status.{delivered,failed}` · `telegram.action.{reply,forward,pin}` | `telegram.status.read` · `ops.view.account_fees` · `account_high_water` |
| Pure helper [`lib/telegram/ops-accounting-view.ts`](../../../lib/telegram/ops-accounting-view.ts) + `validateOpsAccountingViewShape` + Soft wire [`soft-accounting-export.ts`](../../../lib/telegram/soft-accounting-export.ts) · dossier/partners Soft plays chrome | Soft `byBookType` builders · live `source: soft-ct` bake when Soft DB aligned |
| Dossier + partners ledger: event codes → `event.*` via generated [`partner-ops-event-concepts.js`](../../../public/portal/components/partner-ops-event-concepts.js) (`partners:event-concepts:bake`) | Soft MessageLog / Soft Balance mutations (stay in toc-ops `ct`) |

Authority: [`lib/telegram/ops-view-glossary.ts`](../../../lib/telegram/ops-view-glossary.ts) · bake `bun run glossary:portal`.
Soft handshake + board Soft plays chrome: [`docs/design/soft-handshake.md`](../../design/soft-handshake.md) · `soft:accounting:check` in `partners:governance`. Book-type builders wait on Soft `byBookType`; **no new glossary IDs** — collapse via `OPS_VIEW_COLLAPSE_BACKLOG`.

## Accounting delivery & DOD proof ingest (deep)

Two directional surfaces, deliberately split — **figures go out**, **proof comes back in**. Glossary refs: `section.partnersAccounting` · `ops.dod.ingest` · `ops.dod.reconcile` · `page.dodReview` ([semantic vocabulary](../../../lib/portal/semantic-vocabulary.ts)).

### Outbound — commission / finance figures → `liquidity/outs`

Per-partner daily finance report posts figures + `Commission: {pct}%` to the partner forum's `liquidity/outs` thread (default resolution) — [`lib/telegram/daily-finance-report.ts`](../../../lib/telegram/daily-finance-report.ts) · `bun run telegram:ops -- daily-finance` (cron entry `runDailyFinanceReport`).

```text
aggregatePartnerFinance(db, days=7)          # ledger window per partner
  → loadPartnerNotificationSettings          # config/partner-profiles/*.toml
  → filter: telegram.preferences.dailyFinance (all-on default; false opts out)
  → commissionPct = profile.settlement.commissionPct
  → target: packageGroupForumMetadata(CODE).chatId + topicsThreadMap['liquidity/outs']
  → sendTelegramBotMessage (HTML + "Acknowledge" inline keyboard)
```

- `targetFor` override: `publishFinanceReports({ targetFor })` swaps the per-partner chat/topic resolution (`null` skips).
- Same thread also receives daily capacity reports (`daily-capacity-report.ts`) and event alerts (`event-alerts.ts:238`).
- **Weekly settlement** (`partner-settlement-cron.ts` → `settlement-runner.ts`) computes commission **amount** into the ledger + profile TOML only — it never posts to chat; the daily report posts the **rate**.

### Inbound — proof photos → `dod_submissions` → `/portal/dod/`

Partner posts a deposit/withdraw/reconcile photo in the package `accounting` topic or the house `all-accounting` thread → [`lib/dod/telegram-accounting-ingest.ts`](../../../lib/dod/telegram-accounting-ingest.ts) (`ingestAccountingDodPhoto`).

```text
resolveAccountingForumTarget(message)        # package (forum Accounting topic) vs house (all-accounting)
  → extractTelegramImageFileId + parseDodCaption
  → resolveIngestAgentId (Telegram user → tree_nodes seat, /register bound)
  → findDodByTelegramMessage (dedupe by chat+message)
  → downloadTelegramFile → DODVerifier.process (lib/dod/verifier.ts)
      validate magic → aHash visualHash → watermark → R2/local webp → HMAC sign
      → OCR extractAmount → platform cross-check → auto-approve / flagged / pending
      → reconcileDodAmounts(expectedStake, accountingAmount)   # >$0.01 delta → mismatch → flag
      → INSERT dod_submissions (accounting_amount, expected_amount, reconciled, telegram_* ids)
  → in-thread reply: "✅ DOD queued · <id> · Review: /portal/dod/"
```

- Routing: chat ∈ `package_group_registry` + `Accounting` topic → `{kind:'package', partnerCode}`; else house `all-accounting` chat + `Deposits|Withdrawals|Reconcile` thread → `{kind:'house'}` (house requires partner CODE in caption).
- Review queue: `bun run ops:snapshot` bakes [`public/registry/dod-queue.json`](../../../public/registry/dod-queue.json) → [`/portal/dod/`](../../../public/portal/dod/) board (reconcile-mismatch banners, links back to the Telegram message + Partners desk).
- Ledger link: `positions.last_reconciled` (`lib/operations/ops-summary.ts`) — book-position reconciliation timestamp, same reconcile concept as DOD amounts.

## Bot API surface (this repo)

| Method | Module | Used for |
|--------|--------|----------|
| `sendMessage` | `telegram-api.ts` | Outbox projector, webhook replies, ForceReply prompts |
| `sendRichMessage` | `telegram-api.ts` | Seat capital desk (Bot API 10.1 `InputRichMessage`) |
| `editMessageText` | `telegram-api.ts` | Flow deliver + rich desk updates |
| `editMessageReplyMarkup` | `telegram-api.ts` | Seat desk Fill wizard (keyboard-only edits) |
| `answerCallbackQuery` | `telegram-api.ts` | Play + seat desk (`sd:*`) inline ack |
| `setMyCommands` | `telegram-api.ts` | `telegram:factory:setup` |
| `getMe` | `telegram-api.ts` | `telegram:verify` |
| `getWebhookInfo` | `telegram-api.ts` | `telegram:verify` |
| `setWebhook` | `tools/telegram-bot-setup.ts` | Webhook URL → Pages edge enqueue |

Canonical API reference: [Telegram Bot API](https://core.telegram.org/bots/api) · MTProto rich text (client TL, not bot wire): [RichText](https://core.telegram.org/type/RichText)

## Architecture

**Deploy plane (Pages):** [`functions/api/telegram/webhook/[[tenant]].ts`](../../../functions/api/telegram/webhook/[[tenant]].ts) → [`lib/telegram/webhook-pages.ts`](../../../lib/telegram/webhook-pages.ts) — edge-safe R2 enqueue to topic `telegram-updates` (no `bun:sqlite`). Bun [`telegram:ops:consume`](../../../tools/telegram-ops-consumer.ts) drains updates with full [`bot.ts`](../../../lib/telegram/bot.ts).

**Local Bun plane:** [`functions-bun-only/api/telegram/webhook/[[tenant]].ts`](../../../functions-bun-only/api/telegram/webhook/[[tenant]].ts) keeps sync handling for low-latency local/dev (see [`docs/platform-routing.md`](../../platform-routing.md)).

```text
Telegram → Pages webhook (await R2 publish, then 200 — retries on failure)
         → R2 channels/telegram-updates
         → bun run telegram:ops:consume (poison updates skipped; cursor advances)
         → lib/telegram/bot.ts → deliverFlowOutput (HTML + keyboards; /start included)

Outbox → processChannelOutbox → sendTelegramBotMessage (rate-limited)
       → DM: payload.telegramId
       → Group: TELEGRAM_OPS_CHAT_ID + TELEGRAM_TOPICS thread
       → projectorBackend r2|memory (ops-summary loop slice)
```

Long-poll [`lib/telegram/ops-bot.ts`](../../../lib/telegram/ops-bot.ts) is **dev fallback** only when `OPS_DB_PATH` is local.

## Related

- [`lib/telegram/README.md`](../../../lib/telegram/README.md)
- [`partner-onboarding-package.md`](partner-onboarding-package.md)
- [`ops-partner-bridge.md`](ops-partner-bridge.md)
- [`partner-limits.md`](partner-limits.md) — sportsbook limit raises board
  (`/portal/limits/`); not TOC LIMIT tasks · not seat maxBet terms
