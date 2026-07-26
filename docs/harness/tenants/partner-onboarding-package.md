# Partner identity deep integration (Players · Profiles · Cellphones · Telegram)

**SSOT** for the identity chain that terminates in structured, templated, keyboard-driven Telegram flows — subordinated to TOC (Ready gate, Soft on leaf, Connection Last, least capital per asset).

| Role | Doc / code |
|------|------------|
| This spec | [`partner-onboarding-package.md`](partner-onboarding-package.md) |
| Partner TOML / SoR gate | [`ops-partner-bridge.md`](ops-partner-bridge.md) |
| Telegram transport | [`telegram-factory.md`](telegram-factory.md) |
| TOC capital / Soft | [`toc-ops.md`](toc-ops.md) |
| Templates | [`lib/telegram/templates/`](../../../lib/telegram/templates/) |
| Chat meta | [`lib/telegram/flows/channel-meta.ts`](../../../lib/telegram/flows/channel-meta.ts) |
| Package apply | [`lib/operations/partner-onboard-package.ts`](../../../lib/operations/partner-onboard-package.ts) |
| Package group handshake | [`partner-package-group-handshake.md`](partner-package-group-handshake.md) |

---

## 1. Identity chain (single spine)

```text
Cellphone (physical asset)
    → Partner Profile (template: default-prospect | …)
        → Player / Agent (human operator under package)
            → Call-sign seat (ASH-001 / PAT-001 · Soft + capital)
                → Telegram chat + ChatChannelMeta
                    → Message templates + inline keyboards
```

| Layer | Owns | SSOT / store | Must not own |
|-------|------|--------------|--------------|
| **Cellphone** | Device/SIM, carrier, cost | `phones` (+ `tree_nodes.phone_id` / `phones.assigned_to`) | Capital, Soft, credentials |
| **Profile** | Onboarding TOML, cut, expert/parent, **message template ids**, locale | `partner_profile_bindings` (+ `metadata_json`) | Live Soft posts |
| **Player / Agent** | Human, pause/owing, seat binds | `tree_nodes` (type agent/partner) | Soft ledger |
| **Call-sign seat** | Capital, FUND/WARM/PLAY/WD, limits, Soft journal | TOC `accounts` + Soft · `call_sign` on leaf | Telegram ACL invention |
| **Telegram** | Transport, cards, keyboards, image meta | MessageLog / outbox + `ops_chat_channel_meta` | Mutations of Soft or tasks |

Parent partner nodes (ASH / PAT / NOV) already exist; agent seats bind under them. Cellphones attach to a partner (and optionally a call-sign) **before** capital moves.

**Soft and principal stay on the leaf call-sign**, not on the phone id or player id.

---

## 2. Ownership split (portal vs TOC)

| Concern | Plane | Notes |
|---------|-------|-------|
| Org tree, profile bind, Telegram link, welcome | Ops / portal | `tree_nodes`, bindings, outbox |
| Soft, FUND, LIMIT, WARM, Gate 12, Ball-in-Court | TOC | Never from bot buttons |
| Baked TOC board | Pages `/portal/toc/` | Fixture mirror — not live desk |
| Live Soft / rails / phones desk | `toc-ops-repo` (`ct`) | Cloudflare MCP is **not** a TOC desk |

Same call-sign spine across planes; org/Telegram in portal, Soft/capital in TOC.

---

## 3. Cellphone → first DM (deep path)

**Goal:** least capital, fastest path to a usable seat + Telegram surface.

```text
1. Phone assign (phones + tree_nodes.phone_id / assigned_to)
2. Ensure tree_node exists for the seat (agent under parent)
3. onboard-partner-package <call-sign|tree-node-id>
      · assignOnboardingDefaults (expert, parent, cut)
      · onboardPartnerProfile (default-prospect)
      · attachProfileMessageTemplates (welcome/balances/status + phoneLabel)
      · enqueue partner.welcome + partner.onboard.complete (if telegram linked)
4. telegram-link-chat <call-sign> tg:chat:…  → ChatChannelMeta + telegram_id
5. telegram:ops:consume → render partner.welcome.v1 (HTML + keyboard)
6. User taps Balances → balances.v1 (fresh Soft/hard, edit-capable)
7. Only then: FUND → LIMIT → WARM×2 → WARMED (TOC Rope)
```

### Rules

- No FUND until profile + seat are Ready and rail screenshot exists (TOC ONB Rope).
- Welcome DM only after chat is linked; consume stays Connection Last (token + linked ids).
- Never invent `tg:chat` ids — link step is explicit.
- Missing phone → **warn** on plan (welcome still allowed); attach asset before capital when possible.

### Shipped vs future cellphone ops

| Capability | Status |
|------------|--------|
| `phones` table · issue/return via AccountService | Shipped |
| Phone label in templates via `getPhoneForSeat` | Shipped |
| `phone-add` / `phone-sportsbook-add` CLI · `phone_sportsbooks` journal | **Future** (spec reserved) |
| Geo sportsbook active evidence before welcome hard-gate | **Future** (today: warn only) |

---

## 4. Players ↔ Profiles ↔ Seats

| Concept | Role |
|---------|------|
| **Profile template** (`default-prospect` TOML) | SoR / cut / lifecycle — partner-profile bridge |
| **Message templates** (`metadata_json`) | `welcomeTemplate`, `balancesTemplate`, `statusTemplate`, `locale`, `phoneLabel` |
| **Player / Agent** | Human who operates one or more seats |
| **Expert** | May-play permission + weight; default NBA expert on seats |
| **Call-sign** | Capital + Soft + limits; one sportsbook seat |

### Deep bind on onboard

```text
onboardPartnerProfile(treeNodeId) + attachProfileMessageTemplates →
  template: default-prospect
  welcomeTemplate: partner.welcome.v1
  balancesTemplate: balances.v1
  statusTemplate: status.v1
  locale: en
  phoneLabel: <from phones.model|carrier when present>
```

After bind:

- Player appears on `/tree` / roster surfaces.
- `play-route` / play notify resolve agent via package chat / `telegram_id`.
- Profile supplies **message template ids** and locale for all subsequent Telegram renders.

---

## 5. Template registry + `renderForNode`

**Code SSOT:** [`lib/telegram/templates/`](../../../lib/telegram/templates/)

```text
Profile.welcomeTemplate  →  enqueue partner.welcome  →  outbox  →  consume
Profile.balancesTemplate →  flow "balances"          →  card + keyboard
Profile.statusTemplate   →  flow "status"
Play dispatch            →  play.ack / play.dispatched keyboard
Gate failure             →  gate.blocked.v1          →  reason + Menu
```

### Types (locked)

```ts
type TemplateId =
  | 'partner.welcome.v1' | 'status.v1' | 'balances.v1'
  | 'accounts.v1' | 'plays.v1' | 'tree.v1'
  | 'play.ack.v1' | 'onboard.complete.v1'
  | 'limit.stale.v1' | 'gate.blocked.v1';

type TemplateContext = {
  callSign?, displayName?, parentName?, expertName?,
  locale, soft?, principalOut?, hard?, pending?,
  treeNodeId?, phoneLabel?, jurisdiction?, sportsbook?,
  taskId?, gateReason?, playId?, partnerTemplate?,
  accountsCount?, placedCount?, pnl?, treeHint?
};

type RenderedMessage = {
  templateId, text, parseMode: 'HTML',
  keyboard?: KeyboardSpec,  // textKeys only → translateKeyboard(locale)
  photo?
};
```

### Deep render path

```ts
renderForNode(db, templateId, treeNodeId)
  → getPartnerMessageProfile + getBalancesSnapshot + getPhoneForSeat
  → TemplateContext
  → renderTemplate → HTML + KeyboardSpec
```

Flow cards (`welcome`, `balances`, `status`) are **thin callers** of `renderForNode`. Outbox `enqueuePartnerWelcomeEvent` uses the same path (HTML + `replyMarkup`).

### Template pack

| TemplateId | Use | Keyboard |
|------------|-----|----------|
| `partner.welcome.v1` | First DM after link | Status · Balances · Tree · Menu |
| `balances.v1` | Soft / hard / principal | Refresh · Accounts · Status · Menu |
| `status.v1` | Accounts · placed · P&L | Refresh · Menu |
| `accounts.v1` | Book count · hard | Refresh · Menu |
| `plays.v1` | Pending / placed counts | Refresh · Menu |
| `tree.v1` | Parent / network hint | Status · Balances · Tree · Menu |
| `play.ack.v1` | Ack prompt | Placed · Skip (`play:`) |
| `onboard.complete.v1` | Package bind ack | Welcome keyboard |
| `limit.stale.v1` | LIMIT freshness nudge | Menu |
| `gate.blocked.v1` | Policy deny | Menu |

### Example: `partner.welcome.v1`

```html
<b>Welcome · {{displayName}}</b>
Seat: <code>{{callSign}}</code>
Parent: {{parentName}}
Expert: {{expertName}}
Phone: {{phoneLabel}} · {{sportsbook}} ({{jurisdiction}})

You are bound to the <code>default-prospect</code> package.
Next: confirm rail → Funding → Warm-up (2 cycles).

<i>Ball is in your court when Ops sends the next task.</i>
```

### Example: `balances.v1`

```html
<b>Balances · {{callSign}}</b>
Soft Partner: …
Soft Expert: …
Soft House: …
Principal out: …
Hard: … · Pending: …
<i>Read-only · no Soft post from bot</i>
```

Refresh: `f:balances:r` → re-render → `editMessageText` when `lastTemplateIds` known.

---

## 6. ChatChannelMeta (per-chat deep state)

**Store:** `ops_chat_channel_meta` · [`channel-meta.ts`](../../../lib/telegram/flows/channel-meta.ts)

```ts
type ChatChannelMeta = {
  chatId: string;
  treeNodeIds: string[];          // seats this chat may see
  callSigns: string[];
  locale: 'en' | 'es';
  topics: Partial<Record<'identity'|'plays'|'alerts'|'toc'|'ops', number>>;
  imageBundleId?: string;
  lastTemplateIds?: Partial<Record<TemplateId, number>>; // edit-in-place
  linkedAt?: string;
};
```

| API | Role |
|-----|------|
| `normalizeTelegramChatRef` | `tg:chat:-100…` → `-100…` (digits only) |
| `linkTelegramChat` | Upsert meta + SET `tree_nodes.telegram_id` |
| `rememberTemplateMessageId` | Edit-in-place bookkeeping |
| `chatAllowsCallSign` | ACL check when meta present |

**CLI:** `bun tools/telegram-link-chat.ts ASH-001 tg:chat:-100…` · `bun run telegram:link-chat`

Also: portal `/start link_<nonce>` → `telegram_linked` ops-sync (sets `telegram_id`; prefer also running link-chat for full `ChatChannelMeta`).

Image/proof meta (file_id, purpose) remains in `ops_chat_media` ([`media.ts`](../../../lib/telegram/flows/media.ts)).

---

## 7. Outbox event contracts

| Event | Topic | Projectors | Payload essentials |
|-------|-------|------------|--------------------|
| `partner.welcome` | `identity` | `r2`, `telegram` | `telegramId`, `text` (HTML), `parseMode: HTML`, `replyMarkup`, `templateId` |
| `partner.onboard.complete` | `identity` | `r2`, `telegram` | same shape · `onboard.complete.v1` |
| `partner.bound` | `identity` | `r2` | bind observability |
| `play.dispatched` | `plays` | `r2`, `telegram` | ack keyboard |
| `play.gate.*` | `plays` | `r2` (+ telegram when configured) | gate reason |

Helpers: `enqueuePartnerWelcomeEvent`, `enqueueOnboardCompleteEvent` in [`lib/channels/outbox.ts`](../../../lib/channels/outbox.ts).

Drain: `bun run telegram:ops:consume` · projector honors `parseMode: HTML` and `replyMarkup`.

Idempotency keys: `welcome:<treeNodeId>`, `onboard.complete:<treeNodeId>`.

---

## 8. Message format standards (locked)

1. **HTML only** for partner cards (`parse_mode: HTML`); escape via `escapeHtml` in templates.
2. **Keyboard labels** always via `textKey` + locale map — no hardcoded English in builders.
3. **Callback data** ≤ 64 bytes; prefixes `f:` (flow) and `play:` (ack) only.
4. **Edit-in-place** when `lastTemplateIds[templateId]` exists.
5. **Read-only bot** — no Soft post, no task transition, no capital move from buttons.
6. **Proof photos** — caption must include task id + `proof:<purpose>`; meta in `ops_chat_media`.
7. **Welcome / alerts / plays** — channel outbox topics; consume gated on token + linked ids.

---

## 9. Shallow vs deep

| Shallow (avoid) | Deep (target — shipped) |
|-----------------|-------------------------|
| One-off welcome string | Template id on profile + context from phone + seat + Soft |
| Balances as raw text | `balances.v1` + refresh keyboard + edit bookkeeping |
| Phone as note field | First-class `phones` asset + label in templates |
| Player as display name | Agent seat with call-sign, expert/parent, play-route |
| Chat id in env only | `ChatChannelMeta` with call-signs, topics, locale, lastTemplateIds |
| Separate TOC vs portal | Same call-sign spine; Soft/capital in TOC; org/Telegram in portal |

---

## 10. CLI surface

```bash
# Deep package bind (call-sign preferred)
bun tools/onboard-partner-package.ts ASH-001
bun tools/onboard-partner-package.ts ASH-001 --dry-run
bun tools/onboard-partner-package.ts ASH-001 --expert-id=… --parent-id=…
bun tools/onboard-partner-package.ts ASH-001 --force

# Explicit Telegram link (never invent ids)
bun tools/telegram-link-chat.ts ASH-001 tg:chat:-1001234567890
# alias:
bun run telegram:link-chat -- ASH-001 tg:chat:-1001234567890

# Transport + drain
bun run telegram:verify
bun run telegram:factory:setup
bun run telegram:ops:consume
bun run telegram:ops:consume -- --dry-run

# Portal / TOC proof
bun run ops:snapshot:demo
bun run verify:portal:static
bun run ops:seed:toc
```

### Cellphone → first DM checklist (ops)

| Step | Command / system | Result |
|------|------------------|--------|
| 1 | Phone assign (`phones` / `phone_id`) | Physical asset on seat |
| 2 | Agent seat exists with call-sign | TOC seat mapped |
| 3 | `onboard-partner-package ASH-001` | Profile + message templates; welcome if linked |
| 4 | `telegram-link-chat ASH-001 tg:chat:…` | `ChatChannelMeta` written |
| 5 | `telegram:ops:consume` | `partner.welcome.v1` HTML + keyboard |
| 6 | User taps Balances | `balances.v1` live Soft/hard |
| 7 | Ops FUND after Ready + rail | Capital enters TOC loop |
| 8 | LIMIT / WARM×2 | Seat becomes Drum |

Dry-run plan prints phone warn, message template ids, and welcome skip reason when unlinked.

---

## 11. Standard package (portal + ops)

| Step | Mechanism | Default |
|------|-----------|---------|
| Portal account | `POST /api/onboard?step=assign` | factory tenant, role viewer |
| Referral | `?referral=<tree-node-id>` | parent + cut |
| Expert feed | `assignOnboardingDefaults` | NBA expert / `onboarding-defaults.toml` |
| Profile TOML | `templateIdForSource` | `default-prospect` |
| Message templates | `attachProfileMessageTemplates` | welcome/balances/status v1 |
| Telegram link | link-chat or `/start link_<nonce>` | ChatChannelMeta + telegram_id |
| Welcome DM | `partner.welcome` | HTML template + keyboard |
| Onboard complete | `partner.onboard.complete` | `onboard.complete.v1` |
| Play delivery | `play.dispatched` | Place ✓ / Skip |
| Funding | TOC ONB Rope | FUND → LIMIT → WARM×2 |

---

## 12. Telegram commands (factory webhook)

| Command | Card / template |
|---------|-----------------|
| `/start link_*` | Portal link nonce |
| `/start` | `partner.welcome.v1` (registered) |
| `/status` | `status.v1` |
| `/balances` | `balances.v1` |
| `/accounts` | accounts card / `accounts.v1` |
| `/plays` | plays card / `plays.v1` |
| `/tree` | tree card / `tree.v1` |
| `/register` | Sub-agent under referral + bind + welcome |
| `/link` | Link instructions |

Callbacks: `f:menu` · `f:status` · `f:balances` · `f:balances:r` · `play:{id}:{node}:placed|skip`.

---

## 13. Proof / tests

```bash
bun test tests/telegram-templates.test.ts
bun test tests/telegram-flows.test.ts
bun test tests/onboard-partner-package.test.ts
bun test tests/partner-onboarding-e2e.test.ts
bun test tests/ops-channel-outbox.test.ts
```

| Test | Covers |
|------|--------|
| `telegram-templates` | HTML pack, `renderForNode`, welcome outbox HTML, link-chat meta |
| `telegram-flows` | Thin cards + `f:` callbacks |
| `onboard-partner-package` | Call-sign resolve, dry-run, idempotency, template metadata, onboard.complete |
| `partner-onboarding-e2e` | Portal assign → telegram link → welcome |

---

## 14. Config SSOT

| Asset | Path |
|-------|------|
| Partner TOML templates | [`config/partner-templates/`](../../../config/partner-templates/) |
| Onboarding defaults | [`config/onboarding-defaults.toml`](../../../config/onboarding-defaults.toml) |
| Package plan/apply | [`lib/operations/partner-onboard-package.ts`](../../../lib/operations/partner-onboard-package.ts) |
| Defaults + bind | [`lib/operations/partner-onboarding.ts`](../../../lib/operations/partner-onboarding.ts) |
| Profile bridge | [`lib/operations/partner-profile-bridge.ts`](../../../lib/operations/partner-profile-bridge.ts) |
| Message templates | [`lib/telegram/templates/`](../../../lib/telegram/templates/) |
| Flow cards | [`lib/telegram/flows/`](../../../lib/telegram/flows/) |
| Outbox | [`lib/channels/outbox.ts`](../../../lib/channels/outbox.ts) |

---

## 15. Implementation status

| Slice | Status |
|-------|--------|
| Template registry + `renderForNode` | Done |
| Welcome / balances / status thin cards | Done |
| Profile `metadata_json` template ids + phoneLabel | Done |
| `partner.welcome` HTML + keyboard outbox | Done |
| `partner.onboard.complete` | Done |
| `ChatChannelMeta` store + `telegram-link-chat` | Done |
| HTML parseMode in telegram projector | Done |
| `phone-add` / sportsbook geo journal CLI | Future |
| Hard-gate welcome on active phone sportsbook | Future |
| All flow cards on templates (`accounts`/`plays`/`tree`/`menu`) | Done |
| Auto `rememberTemplateMessageId` on every deliver | Done (deliver + outbox projector) |
| `linkTelegramChat` on register + onboard apply + ops-sync `telegram_linked` | Done |
| Command queue HTML+keyboard via `dispatchOpsFlowOutput` | Done |

---

## Related

- [`ops-partner-bridge.md`](ops-partner-bridge.md) — TOML SoR · play gate · identity channel
- [`telegram-factory.md`](telegram-factory.md) — token · webhook · rate limits · topics
- [`toc-ops.md`](toc-ops.md) — Soft · Ready · FUND rope
- [`lib/telegram/README.md`](../../../lib/telegram/README.md)
- [`lib/telegram/flows/README.md`](../../../lib/telegram/flows/README.md)
