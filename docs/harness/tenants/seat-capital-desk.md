# Seat capital desk — pinned Liquidity/Outs message

Harness tenant doc for **one pinned Telegram desk per call-sign** (e.g. `SPEN-001` in package forum **Liquidity/Outs**). Code SSOT: [`lib/telegram/seat-capital-desk.ts`](../../../lib/telegram/seat-capital-desk.ts).

Related: [`telegram-factory.md`](telegram-factory.md) · [`partner-package-group-handshake.md`](partner-package-group-handshake.md) · [Forum topic plans §](partner-package-group-handshake.md#forum-topic-plans-ssot)

## What it is

| Piece | Path / surface |
|-------|----------------|
| Intake SSOT | `reports/telegram/seat-intake/{CALL}.json` (gitignored) |
| Forum metadata | `reports/telegram/forums/{CODE}.json` → `topicsThreadMap['liquidity/outs']` · `accounting` |
| Pinned message | One desk per call-sign — edit in place |
| Pending send-to | `reports/telegram/seat-desk-pending.json` (15m TTL, keyed by Telegram user id) |

Columns: **# · BOOK · USERNAME · DEPOSIT METHOD · SEND TO · MAX BET · FP% DEP** (legacy `<pre>` / plain text) — the rich `blocks` table adds a trailing **STATUS** column. **PARTNER** is omitted (desk is pinned in the partner’s Liquidity/Outs forum thread). Book passwords stay in intake JSON only — never on the desk.

Per-out book terms: `maxBet` (e.g. `$500`) and `freeplay` (freeplay match % on deposits — bare numbers normalize to `N%`). Patch via CLI `--field SPEN-1.maxBet=$500 --field SPEN-1.freeplay=100`.

## Render modes

Soft-fallback chain in `publishSeatCapitalDesk` — each step falls through only when the server rejects the payload as unsupported (`isRichMessageUnsupported`):

| Mode | API | When |
|------|-----|------|
| **rich / blocks** (preferred) | [`sendRichMessage`](https://core.telegram.org/bots/api#sendrichmessage) / `editMessageText` + `InputRichMessage.blocks` | `TELEGRAM_SEAT_DESK_RICH≠0` ([`telegram-config.ts`](../../../lib/telegram/telegram-config.ts)) |
| **rich / html** | same call, `InputRichMessage.html` | Server soft-rejects `blocks` (older Bot API / disabled feature) |
| **legacy** | `sendMessage` / `editMessageText` + `parse_mode=HTML` + `<pre>` table | Server soft-rejects `rich_message` entirely |

Rich body helpers: [`lib/telegram/rich-message.ts`](../../../lib/telegram/rich-message.ts). Desk tree builder: `buildSeatCapitalDeskRichBlocks` in [`seat-capital-desk.ts`](../../../lib/telegram/seat-capital-desk.ts).

### Bot API `blocks` (typed RichText) vs extended HTML

Bot API 10.1 added `InputRichMessage.blocks` — a typed `InputRichBlock[]` tree whose inline text is a Bot API `RichText` union, a **desk-subset mirror of MTProto [`RichText`](https://core.telegram.org/type/RichText)** ([`textBold`](https://core.telegram.org/constructor/textBold), [`textConcat`](https://core.telegram.org/constructor/textConcat), …). The desk now builds that typed tree first and only serializes to extended HTML as a fallback (`serializeRichBlocksToHtml`) — see the full MTProto↔Bot API mapping tables in `rich-message.ts`.

| MTProto RichText | Bot API `RichText` | Helper |
|-------------------|---------------------|--------|
| `textPlain` | `string` | plain string literal |
| `textBold` | `{ type: "bold", text }` | `rtBold` |
| `textMarked` | `{ type: "marked", text }` | `rtMarked` (highlight — used for `blocked` STATUS) |
| `textConcat` | `RichText[]` | `rtConcat` |

| Desk element | `blocks` builder | HTML fallback (`serializeRichBlocksToHtml`) |
|--------------|-------------------|----------------------------------------------|
| Heading | `blockHeading(text, 2)` | `<h2>` |
| Timestamp | `blockParagraph(rtItalic(...))` | `<p><i>…</i></p>` |
| FUND status | `blockParagraph(rtConcat('FUND ', statusRichText, ' — ', detail))` | `<p>FUND <b>…</b> — …</p>` (nested `<u><b>` when `blocked`, via `rtMarked(rtBold(...))`) |
| Table | `blockTable(cells, { isBordered, isStriped })` — includes STATUS column | `<table bordered striped>` |
| Section breaks | `blockDivider()` | `<hr/>` |
| Per-out notes/balance | `blockDetails('Out N – book', fields)` | `<details><summary>…</summary>…</details>` |
| Funding checklist | `blockChecklist(items)` | `<ul>` with ☑/☐ markers |
| Actions | `blockHeading('Actions', 3)` + `blockParagraph(...)` | `<h3>` + `<p>` |

Inline **Fill** buttons live in `reply_markup` under the message — not inside table cells or list items.

## Bun native APIs

| API | Use in desk |
|-----|-------------|
| [`Bun.file`](https://bun.com/docs/runtime/file-io#reading-files-bun-file) | Load/save intake + pending JSON |
| [`Bun.stringWidth`](https://bun.com/docs/runtime/utils#bun-stringwidth) | Legacy `<pre>` column width via [`fitVisible` / `widthOf`](../../../lib/console-depth.ts) |
| [`Bun.sliceAnsi`](https://bun.com/reference/bun/sliceAnsi) | Truncate cells in `fitVisible` (emoji-safe ellipsis) |

Rich mode does not use string width — Telegram lays out HTML tables.

## Interactivity (`sd:*`)

**Copy table** uses [CopyTextButton](https://core.telegram.org/bots/api#copytextbutton) (Bot API 7.11+) — button sits under the rich table (not inside cells).

Wired in [`ops-bot.ts`](../../../lib/telegram/ops-bot.ts) and [`bot.ts`](../../../lib/telegram/bot.ts) **before** flow callbacks.

| Callback | Action |
|----------|--------|
| `sd:r:SPEN-001` | Refresh desk |
| `sd:f:SPEN-001:SPEN-2` | Open field picker |
| `sd:p:…:rail` / `:send` / `:user` / `:max` / `:fp` | Rail picker, ForceReply send-to, username, max bet, or freeplay % |
| `sd:bm:SPEN-001:SPEN-1` | Offer adopt book max → desk maxBet (confirm keyboard) |
| `sd:bmy:SPEN-001:SPEN-1` | Confirm adopt: set desk maxBet from last-known book max (no dual-write to limits) |
| `sd:rail:…:v` | Set rail (short codes `v/c/p/z/a`) |
| `sd:b:SPEN-001` | Back to Fill keyboard |

`callback_data` limit is **64 UTF-8 bytes** ([InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton)) — use `callbackDataUtf8ByteLength()` in tests, not `Bun.stringWidth`.

Freeform topic lines: `SPEN-1 | Venmo | @handle` or `2 | Venmo | @handle` (same patch path as Fill).

**FUND status** auto-derives from intake when `fundStatus` is unset: lead out must have deposit method + send-to (`blocked` otherwise); when lead is ready but other outs still missing fields → `partial`; when every out is complete → `ready`. Manual `fundStatus=` override still wins.

**Copy reply** button targets the first incomplete out number (not always `1`).

## Dashboard integration (today vs planned)

```text
┌─────────────────────────┐     ┌──────────────────────────────┐
│ seat-intake/{CALL}.json │────▶│ Telegram pinned desk (#31)   │
│ (gitignored SSOT)       │     │ rich table + Fill + Copy     │
└───────────┬─────────────┘     └──────────────────────────────┘
            │
            ├────▶ buildSeatDeskPartnerMessage  (copy-paste to partner)
            ├────▶ summarizeSeatDeskPartnerView (--json for panels)
            │
            ╳  not wired yet
            │
┌───────────▼─────────────┐     ┌──────────────────────────────┐
│ /portal/toc/ fixture    │     │ /portal/ops/ partner panel   │
│ liquidity / rails board │     │ profile bindings (templates) │
└─────────────────────────┘     └──────────────────────────────┘
```

| Surface | Reads intake? | Partner sees |
|---------|---------------|--------------|
| Pinned desk | Yes | Table cols + STATUS + Fill |
| Copy table / todo | Yes | Abbreviated paste rows |
| Partner paste message | Yes | Consolidated confirm / todo (`seat-desk-partner-message.ts`) |
| TOC ops portal | No (fixture) | Soft balances, rails, agent lanes |
| Ops dashboard `/portal/ops/` | No (DB bindings) | Welcome/status template prefs |
| Flow cards (`renderForNode`) | No (tree_nodes) | balances.v1, status.v1, etc. |

**Field visibility SSOT:** `SEAT_DESK_FIELD_MANIFEST` in [`seat-desk-partner-message.ts`](../../../lib/telegram/seat-desk-partner-message.ts) — which fields are intake-only, desk-table, rich details, partner message, fund gate, or internal (password).

| Field | Desk table | Partner msg | Fund gate | Internal |
|-------|------------|-------------|-----------|----------|
| book, username | ✓ | ✓ compact | username only | |
| deposit method, send-to | ✓ | ✓ | ✓ | |
| max bet, freeplay % | ✓ | ✓ | | |
| password | | | | ✓ |
| balance, note, withdraw | details only | | | |
| fundStatus | FUND line (ops) | | manual override | |
| deskStatus deferred | STATUS | ✓ note | excluded | |

## Partner message builder

[`seat-desk-partner-message.ts`](../../../lib/telegram/seat-desk-partner-message.ts) sources copy from the same intake JSON as the desk — no hand-written partner lists.

**Template SSOT:** `SEAT_DESK_PARTNER_MESSAGE_TEMPLATES` in that module (also exported via `bun run telegram:handshake:catalog --json` → `seatDeskTemplates.partner`).

| Template | Thread | Postable | Purpose |
|----------|--------|----------|---------|
| `confirm-active` | DM paste | no | Consolidated active-out confirm + missing fields |
| `todo` | desk copy | no | One line per incomplete out |
| `reply-hint` | desk copy | no | Single pipe line for first incomplete out |
| `topic-intake` | Liquidity/Outs | yes (`--post`) | First deposit-rails ask on pinned desk |
| `topic-rails` | Liquidity/Outs | yes (`--post`) | Short nudge when rails still missing |
| `topic-accounting` | Accounting | yes (`--post`) | Deposit/withdraw screenshots — not desk pipe |

House rollup (not a partner template): `ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC` → `bun run telegram:all-accounting`.

Dynamic fields per template are listed in the manifest (`dynamicFields` array) — all topic templates interpolate `partnerCode`, desk pin (`#messageId`), active out range, and deferred skip from intake.

```bash
# Copy-paste confirm message (4 active outs, deferred skipped, consolidated missing)
bun run seat:desk:partner-message SPEN-001

# Todo-only, reply hint, or Liquidity/Outs thread prompts
bun run seat:desk:partner-message SPEN-001 --template todo
bun run seat:desk:partner-message SPEN-001 --template reply-hint
bun run seat:desk:partner-message SPEN-001 --template topic-intake
bun run seat:desk:partner-message SPEN-001 --template topic-rails
bun run seat:desk:partner-message SPEN-001 --template topic-intake --post
bun run seat:desk:topic-prompts SPEN-001

# Staging harness — fill `@{code}.newpartner` + Venmo when rails missing (single-operator)
bun run seat:desk:harness-rails BIL-001 SPEN-001
bun run seat:desk:harness-staging CALL-SIGN [CALL-SIGN…]   # rails + staging login + default max/fp

# JSON snapshot for a future dashboard panel
bun run seat:desk:partner-message SPEN-001 --json
```

Templates: `confirm-active` (default) · `todo` · `reply-hint` · `topic-intake` · `topic-rails` · `topic-accounting`.

**Liquidity/Outs thread copy** — use `topic-intake` for the first deposit-rails ask; `topic-rails` for a short nudge on the pinned desk. Both are sourced from intake (active out range, deferred skip, desk `#messageId`).

**Accounting thread** — deposit/withdraw screenshots and optional bet-slip proof. Not parsed by the desk pipe handler; keep rails setup on Liquidity/Outs.

**Automatic bootstrap** — every `publishSeatCapitalDesk` / desk refresh tries `ensurePartnerForumAccounting` (create Accounting topic + post prompt once per partner forum). Bulk:

```bash
bun run telegram:package-group:accounting
bun run telegram:package-group:enhance SPEN --ensure-topics --accounting-prompt
```

**House all-accounting channel** — cross-partner rollup supergroup (`all-accounting` surface). Bind `TELEGRAM_ACCOUNTING_CHAT_ID`, then:

```bash
bun run telegram:all-accounting --chat -100… --brand --post-prompt
```

Manual bootstrap when bot lacks `can_manage_topics`:

```bash
bun run seat:desk:accounting-prompt SPEN-001 --thread-id 37 --post
```

## CLI

```bash
bun run seat:desk:post SPEN-001
bun run seat:desk:refresh SPEN-001
bun run seat:desk:update SPEN-001 --field SPEN-1.rail=Venmo --field SPEN-1.sendTo=@handle
# `update` republishes with pin by default; pass `--no-pin` to skip pinChatMessage on that pass
bun run seat:desk:partner-message SPEN-001
bun run seat:desk:pin SPEN-001
bun run seat:desk:unpin SPEN-001
bun run seat:desk:delete SPEN-001
```

## Tests

```bash
bun run test:seat-desk
# or:
bun test tests/seat-capital-desk.test.ts tests/seat-desk-callback.test.ts tests/seat-desk-snapshot.test.ts tests/handshake-snapshot.test.ts tests/telegram-catalog-research.test.ts tests/partner-forum-accounting.test.ts
```

## Portal / ops dashboard

Redacted desk rows (no passwords) bake alongside the telegram-handshake snapshot, mirroring its pattern end to end:

```text
reports/telegram/seat-intake/{CALL}.json   (gitignored SSOT, has passwords)
            │
            ▼  buildSeatDeskViewModel (lib/telegram/seat-capital-desk.ts)
            │  — same view model buildSeatCapitalDeskRichBlocks uses for the Telegram table/checklist
            ▼
public/registry/seat-capital-desk.json     (schema factorywager.seat-capital-desk.v1 — no passwords)
            │
            ▼  ops-summary.seatCapitalDesk (lib/operations/ops-summary.ts)
            ├──▶ /portal/ops/#seat-capital-desk   — wide panel: FUND/outs/incomplete table + per-desk checklist
            └──▶ /portal/dashboard/               — small plane-card teaser (incomplete outs / blocked)
```

| Piece | Path / surface |
|-------|----------------|
| Snapshot builder | [`lib/telegram/seat-desk-snapshot.ts`](../../../lib/telegram/seat-desk-snapshot.ts) — `buildSeatCapitalDeskSnapshot` (`Bun.Glob '*.json'` over intake dir) → `exportSeatCapitalDeskSnapshot` |
| Registry artifact | `public/registry/seat-capital-desk.json` · `/registry/seat-capital-desk.json` |
| ops-summary slice | `OpsSummaryPayload.seatCapitalDesk` (`loadSeatCapitalDeskSummarySlice`) |
| Bake step | `tools/ops-snapshot.ts` — runs after telegram-handshake export |
| Ops panel | `/portal/ops/#seat-capital-desk` (wide, right after `#telegram-handshake`) |
| Dashboard card | `/portal/dashboard/` plane-card, next to Package handshake |
| Portal weave | `bun run seat:desk:refresh` script + `seat-capital-desk` artifact entry |

The view model (`SeatDeskViewModel` / `SeatDeskOutView` / `SeatDeskChecklistItem`) is the single source for STATUS + checklist on both the Telegram rich desk and the dashboard panel — `buildSeatCapitalDeskRichBlocks` now calls `buildSeatDeskViewModel` internally instead of recomputing per-out status. Passwords never leave `SeatIntakeRecord`; the view model and every downstream JSON omit them.

```bash
bun run ops:snapshot                    # bakes seat-capital-desk.json alongside telegram-handshake.json
bun test tests/seat-desk-snapshot.test.ts
```

## Partners-ops taxonomy (v2 projection)

Collision-free factory mirror over this desk + handshake — phases, book types, funding rails, out status, accounting/event codes, Telegram topic leaves. Soft ledger mutations stay in `ct`.

| Piece | Path / command |
|-------|----------------|
| Glossary + colors | [`lib/telegram/partner-ops-glossary.ts`](../../../lib/telegram/partner-ops-glossary.ts) · [`partner-ops-color-kernel.ts`](../../../lib/telegram/partner-ops-color-kernel.ts) |
| Registry bake | `/registry/partners-ops.json` · `bun run partners:build` |
| Validate | `bun run partners:validate` |
| Event append (factory mirror JSONL) | `bun run partners:ledger:append -- --code DEPOSIT_RECEIVED --partner ASH --amount 1000` |
| Portal board | [`/portal/partners/`](../../../public/portal/partners/) |

Intake SSOT remains `reports/telegram/seat-intake/` → `seat-capital-desk.json` (v1). The v2 registry is derived — never a second intake writer.

## Module map

| Module | Role |
|--------|------|
| `seat-capital-desk.ts` | Intake types, publish (blocks→html→legacy fallback), `buildSeatCapitalDeskRichBlocks` |
| `rich-message.ts` | `InputRichMessage.blocks` (typed `RichText`/`InputRichBlock` builders) + HTML fallback serializers + MTProto mapping |
| `seat-desk-markup.ts` | Fill / rail / back keyboards + `sd:*` parse |
| `seat-desk-callback.ts` | Async callback handler |
| `seat-desk-pending.ts` | ForceReply pending store |
| `seat-desk-reply.ts` | Reply + pipe-line intake |
| `seat-desk-partner-message.ts` | Field manifest + partner paste builder + topic prompts + template SSOT + JSON summary |
| `partner-forum-accounting.ts` | Auto-create Accounting topic + post prompt once per partner forum |
| `partner-ops-registry.ts` | v2 taxonomy projection + collision validation |
| `partner-ops-glossary.ts` | Phase / book / rail / out / accounting / topic concepts |
| `partner-ops-events.ts` | Factory-mirror event codes |
| `partner-ops-color-kernel.ts` | Bun.color palette for partner-ops concepts |
