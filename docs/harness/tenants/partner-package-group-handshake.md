# Partner package-group handshake (factory ↔ ct, manual v0)

**SSOT** for bridging factory partner onboard to Soft-desk package Telegram groups without crossing plane ownership.

| Role | Doc / code |
|------|------------|
| This spec | [`partner-package-group-handshake.md`](partner-package-group-handshake.md) |
| Partner identity spine | [`partner-onboarding-package.md`](partner-onboarding-package.md) |
| Factory Telegram | [`telegram-factory.md`](telegram-factory.md) |
| Package title grammar (factory) | [`lib/telegram/surfaces.ts`](../../../lib/telegram/surfaces.ts) `formatPackageGroupTitle` |
| Package title grammar (ct) | [`toc-ops-repo/src/central-tool/telegram-surfaces.ts`](../../../toc-ops-repo/src/central-tool/telegram-surfaces.ts) `packageGroupTitle` |
| Registry | [`lib/telegram/package-group-registry.ts`](../../../lib/telegram/package-group-registry.ts) |
| Onboard emit | [`lib/operations/partner-onboard-package.ts`](../../../lib/operations/partner-onboard-package.ts) |
| Link CLI | [`tools/telegram-ops.ts`](../../../tools/telegram-ops.ts) `link-package-group` |
| **Machine reference** | `bun run telegram:handshake:catalog` — constants, lanes, verify checks, CLI flags (JSON: `--json`) |

**Doc rule:** this file is the operator runbook only. Do not add new constant tables elsewhere — extend [`handshake-catalog.ts`](../../../lib/telegram/handshake-catalog.ts) and regenerate the catalog.

---

## Planes

| Plane | Owns | Must not |
|-------|------|----------|
| **Factory** (this repo) | DM link, welcome templates, `package_group_registry`, pending JSONL artifact | Create Soft groups via Bot API; mutate Soft ledger |
| **Soft desk (`ct`)** | Package forum creation, `telegram_ref` on partner package, MessageLog | Factory `ops_chat_channel_meta` for package groups |

`tree_nodes.telegram_id` remains the **DM** link only.

---

## Forum topic plans (SSOT)

Two **different** topic grammars. Do not apply house-surface topics to partner package forums (or vice versa).

| Kind | One chat per | Topic SSOT (code) | Thread ids |
|------|--------------|-------------------|------------|
| **Partner package forum** | Partner **CODE** (`SPEN`, `ASH`, `BIL`, …) | [`package-group-forum.ts`](../../../lib/telegram/package-group-forum.ts) `PARTNER_PACKAGE_FORUM_TOPIC_PLAN` | Per chat: `reports/telegram/forums/{CODE}.json` |
| **House surface** | Concern (`hq`, `sandbox`, `all-accounting`, …) | [`surfaces.ts`](../../../lib/telegram/surfaces.ts) `TOC_OPS_SURFACES` | Per surface via `TELEGRAM_SURFACES` env |

Machine dump: `bun run telegram:handshake:catalog --json` → `packageForumTopics` · `houseForumTopics`.

### Partner package forum (same for every partner)

Title grammar: `TOC Ops · {CODE} · {DisplayName}`. **Identical topic titles** on every linked partner forum. Only numeric thread ids differ per chat.

| Topic title | `topicsThreadMap` key | Role |
|-------------|----------------------|------|
| General | `general` | Implicit thread `1` |
| Ops | `ops` | House ops |
| Alerts | `alerts` | Outbox alerts |
| Liquidity/Outs | `liquidity/outs` | Pinned seat desk + rails pipe |
| Accounting | `accounting` | Deposit/withdraw proof |

Map key rule: **`title.toLowerCase()`** — titles are case-sensitive Bot API names (`Liquidity/Outs`, not `Liquidity-Outs`).

Ensure full plan on all linked partners:

```bash
bun run telegram:package-group:enhance CODE --ensure-topics
bun run telegram:package-group:accounting
```

### House surfaces (not partner forums)

| Surface slug | Group title | Forum topics |
|--------------|-------------|--------------|
| `hq` | TOC Ops · HQ | alerts · day-ops · aar · identity |
| `ash-staging` | TOC Ops · ASH · staging | plays · balances · onboard · alerts |
| `all-accounting` | TOC Ops · Accounting | Deposits · Withdrawals · Reconcile |
| `sandbox` | TOC Ops · sandbox | scratch · experiments |

Partners post proof in **their package forum · Accounting** topic. Ops may mirror in **`all-accounting`** (separate supergroup).

`TELEGRAM_SURFACES` key `pkg-{code}` binds the **chat id** only — topic routing for package forums comes from `reports/telegram/forums/{CODE}.json`, not from house `TELEGRAM_TOPICS`.

**Catalog research agent** — compares catalog + live forum metadata and proposes enhancements (icons, pinned templates, missing topics):

```bash
bun run telegram:catalog:research          # write reports/telegram/catalog-enhancements.json
bun run telegram:catalog:research --json   # stdout only
bun run telegram:catalog:research --llm    # optional LLM pass (OPENAI_API_KEY)
```

Code: [`lib/telegram/catalog-research/`](../../../lib/telegram/catalog-research/) · schema `factorywager.telegram-catalog-enhancement.v1`

**Daily cron (Reasonix / OS Bun.cron — primary):**

```bash
bun run telegram:catalog:research:cron:preview    # next fire times + system TZ
bun run telegram:catalog:research:cron:register   # launchd @ 07:00 system local
bun run telegram:catalog:research:once            # manual tick (structured JSON report)
bun run telegram:catalog:apply-enhancements       # merge safe changes → catalog-overrides.json
bun run telegram:catalog:research:cron:remove     # uninstall
```

Worker pipeline: **load catalog → gather Bot API signals → deterministic + optional LLM → `catalog-enhancements.json`**.

Env: `TELEGRAM_CATALOG_RESEARCH_TZ=America/New_York` · `TELEGRAM_CATALOG_RESEARCH_APPLY_SAFE=1` (auto-merge icon metadata) · `OPENAI_API_KEY` (LLM pass). macOS logs: `/tmp/bun.cron.telegram-catalog-research.stdout.log`.

---

## Nomenclature

| Concept | Example | Notes |
|---------|---------|-------|
| Partner **code** | `ASH` | Package / parent — used by **package-group** CLIs only |
| Call-sign **seat** | `ASH-001` | Agent seat — used by **onboard** CLI only |
| Package group title | `TOC Ops · ASH · Ash Ops` | `TOC Ops · {CODE} · {DisplayName}` — display from partner parent `name` |

**CLI ref rule (strict — no cross-acceptance):**

| Command | Ref | Example |
|---------|-----|---------|
| `onboard-partner-package.ts` | call-sign | `BIL-001` |
| `package-group-create-forum` | partner CODE | `BIL` |
| `package-group-wire` | partner CODE | `BIL` |
| `link-package-group` | partner CODE | `BIL` |

Passing `BIL` to onboard or `BIL-001` to create-forum fails with a redirect message.

House ops groups (`TOC Ops · HQ`, `TOC Ops · ASH · staging`, `TOC Ops · sandbox`) are separate surfaces — see [`telegram-factory.md`](telegram-factory.md).

---

## Flow (manual v0)

```text
1. bun tools/onboard-partner-package.ts ASH-001 --create-package-group
     → reports/telegram/pending-package-groups.jsonl
     → prints operator recipe (create forum + add @TOC_Op_bot)

2. Operator creates Telegram forum with exact title; copies chat_id + invite link

3. bun run telegram:ops -- link-package-group ASH -100… --invite https://t.me/+…
     → package_group_registry upsert
     → optional “package room ready” DM to linked seat
```

---

## Artifact JSONL

Path: `reports/telegram/pending-package-groups.jsonl` (append-only).

```json
{
  "action": "create_package_group",
  "partner_code": "ASH",
  "display_name": "Ash Ops",
  "suggested_title": "TOC Ops · ASH · Ash Ops",
  "requested_by": "ASH-001",
  "tree_node_id": "<uuid>",
  "timestamp": "2026-07-26T20:00:00.000Z"
}
```

---

## Registry DDL

```sql
CREATE TABLE IF NOT EXISTS package_group_registry (
  partner_code TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  invite_link TEXT,
  title TEXT NOT NULL,
  requested_by TEXT,
  created_at TEXT NOT NULL,
  linked_at TEXT NOT NULL
);
```

---

## CLI contracts

### `--create-package-group`

On [`tools/onboard-partner-package.ts`](../../../tools/onboard-partner-package.ts):

```bash
bun tools/onboard-partner-package.ts ASH-001 --create-package-group
bun tools/onboard-partner-package.ts ASH-001 --dry-run --create-package-group
```

Resolves `partner_code` from the seat call-sign prefix or parent partner node.
Without `--dry-run`, the command appends the create request to the pending JSONL
event log. With `--dry-run`, it prints the operator recipe without writing the
event log. This boundary is covered by
[`tests/onboard-partner-package.test.ts`](../../../tests/onboard-partner-package.test.ts).

### `link-package-group`

```bash
bun run telegram:ops -- link-package-group ASH -1003937534779
bun run telegram:ops -- link-package-group ASH -1003937534779 --invite 'https://t.me/+…'
bun run telegram:ops -- link-package-group ASH -1003937534779 --no-dm
bun run telegram:ops -- link-package-group ASH -1003937534779 --requested-by ASH-001
```

| Flag | Effect |
|------|--------|
| `--invite <url>` | Store invite; include in DM |
| `--no-dm` | Skip package-room DM |
| `--no-ack` | Skip `ack_package_group_linked` JSONL append |
| `--requested-by <call-sign>` | Audit trail + prefer that seat's telegram_id for DM |

### `designate-dm-seat` (post-link seat ack)

Acknowledge which seat receives package-room DMs **after** a `package_group_registry` row exists (via `link-package-group`). Does **not** require `tree_nodes.telegram_id` yet — only a registry row + active seat.

```bash
bun run telegram:ops -- designate-dm-seat NOV NOV-001
bun run telegram:ops -- designate-dm-seat PAT PAT-001 --force
```

SSOT: `package_group_registry.requested_by`. Appends `ack_dm_seat_designated` to JSONL:

```json
{
  "action": "ack_dm_seat_designated",
  "partner_code": "NOV",
  "call_sign": "NOV-001",
  "designated_by": "factory",
  "timestamp": "2026-07-26T20:00:00.000Z"
}
```

Welcome DM + bot commands stay blocked until:

```bash
bun tools/telegram-link-chat.ts NOV-001 <telegram_user_id>
```

`link-package-group … --requested-by NOV-001` also designates + JSONL acks (use `--no-dm` when telegram not ready).

**DM seat status** (`assessPackageGroupDmSeat`):

| Status | Meaning |
|--------|---------|
| `none` | No `requested_by` on registry |
| `designated` | Seat acknowledged; operator telegram pending |
| `linked` | Telegram id linked to designated seat (primary owner) |
| `shared` | Telegram id linked but owned by another call-sign; designated seat in `ChatChannelMeta.callSigns` — use `/seat CODE-001` to switch bot context |

Seat map (all seats ↔ telegram ↔ package forum): `bun run telegram:ops -- seat-map`

### Readiness (phased E2E)

```bash
bun run telegram:handshake:readiness              # summary table
bun run telegram:handshake:readiness NOV --detail   # per-lane audit (--detail alone enables deep lanes)
bun run telegram:handshake:verify NOV --live      # live Telegram title match
```

Flags: `[CODE…]` · `--detail` · `--deep` (optional; `--detail` alone runs deep lanes) · `--live` · `--json` · `--db <path>`

| Phase | Meaning |
|-------|---------|
| `blocked` | Missing registry row or forum metadata gap |
| `forum_ready` | Registry + forum metadata OK; DM seat not designated |
| `designated` | Seat acknowledged in registry; operator telegram pending — outbox routing tracked in gaps/deep lanes, not a phase gate |
| `operator_ready` | Linked telegram **and** handshake verify OK — welcome DM + `/status` + play callbacks |

Exit **`1`** only when any row has phase **`blocked`** (not for `designated` or invite-pending membership).

Deep lanes (`--detail`): forum · audit (JSONL) · routing (outbox thread map) · operator (blocked-until-link explicit). Audit lane **`jsonl_dm_designated`** passes when an `ack_dm_seat_designated` line exists **or** when `create_package_group.requested_by` matches registry `requested_by` (fallback when designate ran via link without a separate ack line).

### Group membership model (member count tell)

Every package forum is expected to contain **at least three actors** once fully staffed:

| # | Actor | Notes |
|---|--------|--------|
| 1 | **Factory bot** | `@TOC_Op_bot` — administrator |
| 2 | **House operator** | Your personal Telegram — creates / owns the group |
| 3 | **Partner / agent** | Human for the designated seat (e.g. `NOV-001`) — joins via invite |

More humans (experts, observers) increase the count — that is normal.

`getChatMemberCount` (via `handshake:desk --refresh` or `directory --refresh`) is a cheap sanity check:

| Count | Interpretation |
|-------|----------------|
| `1` | Understaffed — re-check bot admin |
| `2` | Bot + house only — **normal** while partner not in forum or telegram not linked |
| `3` | Bot + house + partner — typical steady state (`3·OK`) |
| `4+` | Core trio + extras — desk cell **`N·ext`** (e.g. `4·ext`, `5·ext`) |

**`!` suffix** (e.g. `2·house!`): operator telegram is linked but partner has not joined the forum yet — send the registry invite (expect `3·OK` after join). Deep lane **`forum_members`** fails at **`2·house!`** until partner joins.

Code: [`lib/telegram/package-group-membership.ts`](../../../lib/telegram/package-group-membership.ts) · desk column `MEMBERS` · readiness `MEM` · deep lane `forum_members`.

### Forum invite gap (`2·house!`)

Operator DM linked but partner not in forum yet:

```bash
bun run telegram:handshake:invite-gap
bun run telegram:handshake:invite-gap ASH BIL --refresh
bun run telegram:handshake:desk --invite-gap
bun run telegram:handshake:readiness --invite-gap
bun run telegram:ops -- send-forum-invite NOV
bun run telegram:ops -- send-forum-invite --all
bun run telegram:handshake:invite-gap --send --dry-run
```

Flags: `[CODE…]` · `--refresh` · `--json` · `--send` · `--dry-run` · `--force` · `--db <path>`

Exit **`1`** when gaps exist (scriptable). Readiness exits **`1`** only on phase **`blocked`**. After partner joins → **`3·OK`**.

Send path appends **`ack_forum_invite_sent`** to package group JSONL. Deep lanes: **`forum_invite_gap`** · **`jsonl_forum_invite_sent`**. Code: [`lib/telegram/forum-invite-gap.ts`](../../../lib/telegram/forum-invite-gap.ts).

### Portal dashboard

Read-only on Pages — **no live Telegram API**. Data flows CLI → SQLite → snapshot bake → static JSON → portal panels.

```text
assessHandshakeReadiness({ deep: true }) (handshake-readiness.ts)
  → exportTelegramHandshakeSnapshot + exportTelegramHandshakeCatalog (handshake-snapshot.ts)
  → public/registry/telegram-handshake.json + telegram-handshake-catalog.json
  → ops-summary.telegramHandshake (buildOpsSummary / ops:snapshot)
  → public/registry/ops-summary.json + static.json
  → portal panels (fetch same-origin JSON)
```

| Surface | URL | What it shows |
|---------|-----|---------------|
| **Full Ops panel** | `/portal/ops/` | Invite-gap metric, verify/lanes columns, expandable row details (gap · invite link · blocked lanes · next steps), gaps-only filter, CLI hints, catalog link |
| **Executive dashboard** | `/portal/dashboard/` | Handshake plane card — invite gaps · operator_ready · blocked · link to ops panel |
| **Monitoring** | `/monitoring/` | TG invite gaps card + proof tile → ops panel |
| **Health** | `/portal/health/` | Loads `ops-summary` (enriched TOC/loop; handshake via ops slice) |
| **Registry artifact** | `/registry/telegram-handshake.json` | Full `factorywager.telegram-handshake.v1` rows (verify, lanes, nextSteps) + CLI hints |
| **Catalog artifact** | `/registry/telegram-handshake-catalog.json` | Machine SSOT — lanes, CLI flags, constants (`telegram:handshake:catalog`) |
| **Portal weave** | `/registry/portal-weave.json` | Links handshake + catalog artifacts in registry index |
| **TOC board** | `/portal/toc/` | Partner profile telegram lanes (Soft fixture) — **not** package-group handshake desk |

Refresh bake after CLI changes:

```bash
bun run telegram:handshake:desk --refresh
bun run ops:snapshot          # telegram-handshake.json + catalog + ops-summary slice
bun run serve:public:hot      # local portal
```

Machine reference (constants / CLI flags): `bun run telegram:handshake:catalog`

---

## Error handling

| Condition | Behavior |
|-----------|----------|
| Unknown call-sign / tree node | Throw on resolve |
| Cannot derive `partner_code` | Throw with hint to set parent partner or valid call-sign |
| Invalid `partner_code` on link | Exit 1 (`^[A-Z]{3,6}$` — [`handshake-ref.ts`](../../../lib/telegram/handshake-ref.ts)) |
| Invalid `chat_id` | Exit 1 (numeric Telegram id) |
| No DM + no `--no-dm` | Upsert registry; skip DM quietly |
| No invite + DM requested | Upsert registry; DM without link text |

---

## Manual ct / Telegram steps (operator recipe)

1. Create **supergroup** with **Topics** enabled.
2. Set title exactly: `TOC Ops · {CODE} · {DisplayName}` (from JSONL `suggested_title`).
3. Add `@TOC_Op_bot` as **administrator** (Manage Topics when forum topics are needed).
4. Create invite link; copy `chat_id` (e.g. `-100…`) and invite URL.
5. Run factory `link-package-group`.

### Soft assist (v1 — honest wire)

After factory emits JSONL, `ct` consumes pending lines and guides the operator (create remains human):

```bash
bun run ct package-group-pending [--path ../reports/telegram/pending-package-groups.jsonl]
bun run ct package-group-wire ASH --chat tg:chat:-100… [--invite-create] --apply
```

Soft writes `partners.telegram_ref`; prints factory `link-package-group` handoff + allowlist CSV (manual `.env` paste).

Use `--apply --ack` on wire to append `ack_package_group_wired` and remove the partner from `package-group-pending`.

### JSONL lifecycle (append-only acks)

| Action | Plane | When |
|--------|-------|------|
| `create_package_group` | Factory | `--create-package-group` |
| `ack_package_group_wired` | Soft | `package-group-wire --apply --ack` |
| `ack_package_group_linked` | Factory | `link-package-group` (default) or `acknowledge-pending` |
| `ack_dm_seat_designated` | Factory | `designate-dm-seat` or `link-package-group --requested-by` |

Open pending = latest `create_package_group` per code without a matching `ack_package_group_wired`. The JSONL file is never rewritten — only appended.

```bash
bun run ct package-group-wire ASH --chat tg:chat:-100… --apply --ack
bun run telegram:ops -- link-package-group ASH -100… --invite '…'
bun run telegram:ops -- acknowledge-pending ASH
```

Future: MTProto auto-create — **implemented** (Decision #52). See [`toc-ops-repo/docs/system/TELEGRAM.md`](../../../toc-ops-repo/docs/system/TELEGRAM.md) § MTProto user lane.

### Forum metadata (`reports/telegram/forums/{CODE}.json`)

Written by MTProto `package-group-create-forum`, Bot API `package-group-forum-enhance`, or backfilled for manual forums:

```bash
cd toc-ops-repo
bun run forum-metadata-backfill ASH PAT NOV BIL --apply --factory-db ../data/operations.db

# Factory Bot API — icon + Ops/Alerts/Liquidity/Outs/Accounting topics
bun run telegram:package-group:enhance ASH --ensure-topics
bun run telegram:package-group:accounting              # all linked partners
bun run telegram:package-group:enhance SPEN --accounting-prompt
```

Factory verify reads metadata when present (`forum_metadata` check in `verify-package-group-handshake.ts`).

Topic plan: see **[Forum topic plans (SSOT)](#forum-topic-plans-ssot)** above — five topics, identical titles per partner.

| Field | Notes |
|-------|-------|
| `chatId` / `chatRef` | Must match registry + wired ack |
| `topics` | Five-topic plan above; `topicsComplete` when every thread id is set |
| `topicsThreadMap` | Lowercase title keys — e.g. `liquidity/outs`, `accounting` |
| `accountingPromptMessageId` | Set when Accounting bootstrap prompt posted once |
| `accountingPromptPostedAt` | ISO timestamp of accounting prompt |
| `iconUploaded` | `true` when Bun.Image JPEG uploaded via MTProto `EditPhoto` |
| `backfilled` | `true` for manual forums without MTProto branding |

**Accounting bootstrap** — `@TOC_Op_bot` needs **Manage Topics** to create the Accounting thread via Bot API. When missing, create the topic manually and post:

```bash
bun run seat:desk:accounting-prompt SPEN-001 --thread-id 37 --post
```

Every desk publish/refresh also tries `ensurePartnerForumAccounting` (non-blocking). See [`seat-capital-desk.md`](seat-capital-desk.md).

---

## E2E validation runbook

Validate the full lifecycle before production use:

| Step | Command | Pass criteria |
|------|---------|---------------|
| 1 Emit | `bun tools/onboard-partner-package.ts ASH-001 --create-package-group` | JSONL `create_package_group`; title matches `formatPackageGroupTitle` |
| 2 Pending | `bun run ct package-group-pending --path reports/telegram/pending-package-groups.jsonl` | ASH listed with operator recipe |
| 3 Human | Create forum with exact `suggested_title`; add `@TOC_Op_bot` admin | Manual (Bot API cannot create groups) |
| 4 Soft wire | `bun run ct package-group-wire ASH --chat tg:chat:-100… --apply --ack` | `ack_package_group_wired`; pending list empty for ASH |
| 5 Factory link | `bun run telegram:ops -- link-package-group ASH -100… --invite '…'` | `package_group_registry` row; `ack_package_group_linked` |
| 6 Verify | `bun run telegram:handshake:verify ASH` | All checks green incl. `forum_metadata` when backfilled (exit 0) |

### Staging shortcut (non-prod)

To skip human forum create when a house surface already exists (e.g. ash-staging `-1003937534779`):

```bash
bun run ct package-group-wire ASH --chat tg:chat:-1003937534779 --apply --ack
bun run telegram:ops -- link-package-group ASH -1003937534779
bun run telegram:handshake:verify ASH
```

Do not use staging chat_ids as production package forums.

**Soft plane note:** `ct package-group-wire --apply` requires partner `ASH` in `toc-ops.sqlite`. Use `bun scripts/bootstrap-handshake-partner.ts CODE --confirm-operational` on operational `data/toc-ops.sqlite`, or demo seed on `/tmp/toc-ops-demo.sqlite` (see below).

**Soft demo DB (isolated wire test):**

```bash
cd toc-ops-repo
bun run src/db/migrate.ts --demo-reset --db /tmp/toc-ops-demo.sqlite
TOC_OPS_DB=/tmp/toc-ops-demo.sqlite bun run src/db/seed.ts --db /tmp/toc-ops-demo.sqlite
TOC_OPS_DB=/tmp/toc-ops-demo.sqlite bun run ct package-group-wire ASH \
  --chat tg:chat:-1003937534779 --apply --ack \
  --path ../reports/telegram/pending-package-groups.jsonl
```

**Operational Soft DB (`data/toc-ops.sqlite`):**

```bash
cd toc-ops-repo
bun scripts/bootstrap-handshake-partner.ts ASH --confirm-operational \
  --display-name "Cascade Partner" \
  --wire --chat tg:chat:-1003937534779 --ack \
  --path ../reports/telegram/pending-package-groups.jsonl
bun run ct package-group-wire ASH --chat tg:chat:-1003937534779 --apply --ack \
  --path ../reports/telegram/pending-package-groups.jsonl
```

Requires `--confirm-operational` once (Decision #36). Creates operational partner row + optional wire; no demo `seed_profile`.

### Verify commands

```bash
# Handshake lifecycle
bun run test:telegram-handshake
bun run telegram:handshake:verify ASH
bun run telegram:handshake:verify ASH --json
bun run telegram:handshake:verify ASH --live
# Flags: --path <jsonl> · --forums-dir <dir> · --db <path> · --json · --live

# Unified desk (registry + known chats + handshake)
bun run telegram:handshake:desk
bun run telegram:handshake:desk ASH PAT --refresh --live --detail
bun run telegram:handshake:desk --json --invite-gap
# Flags: --refresh · --live (implies --refresh) · --invite-gap · --detail · --json · --path <jsonl> · --db <path>

# Phased readiness + invite gap
bun run telegram:handshake:readiness
bun run telegram:handshake:readiness NOV --detail --live --json
bun run telegram:handshake:invite-gap --refresh
# readiness: --detail · --deep · --live · --json · --db
# invite-gap: --refresh · --json · --db

# Seat map
bun run telegram:ops -- seat-map

# Broadcast queue
bun test tests/ops-channel-outbox.test.ts tests/telegram-broadcast.test.ts
bun run telegram:ops -- send --all --queue --preview "hello {{title}}"
bun run telegram:ops:consume -- --preview
```

---

## Acceptance checklist

- [x] JSONL line matches title grammar and `partner_code` ≠ call-sign (ASH staging)
- [x] Manual forum title matches `suggested_title` byte-for-byte (`setChatTitle` on `-1003937534779`)
- [x] `package_group_registry` row for `ASH` with correct `chat_id`
- [x] DM received when `--invite` + linked `telegram_id` present (ASH-001 → 8013171035)
- [x] `tree_nodes.telegram_id` unchanged (still DM)
- [x] ct surface map can register same title (demo DB wire proved `telegram_ref`)
- [x] NOV package forum wired (`-1004464761699`) · verify 9/9 live · desk OK

Optional Soft automation (Decision #52): `bun run package-group-create-forum CODE` in `toc-ops-repo` when MTProto session configured — see [`toc-ops-repo/docs/system/TELEGRAM.md`](../../../toc-ops-repo/docs/system/TELEGRAM.md) § MTProto App Registry + bootstrap troubleshooting.

- [x] MTProto session bootstrapped (2026-07-26) · `bun run telegram-user-health` → OK in `toc-ops-repo`

---

## Non-goals (v0)

- Bot API `createChat` / `createChatInviteLink` from factory
- KV / webhook handoff between repos
- MTProto / forum creation inside factory monorepo (Soft `package-group-create-forum` when session set; manual UI otherwise)
- Soft / FUND / capital from package-room messages
