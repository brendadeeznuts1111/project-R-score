# ADR-0003: Package-group desk — unified read-side operator view

> Status: **decided** (2026-07-26)

## Context

Operators needed one command that joins handshake lifecycle status (`verify`), live Telegram metadata (`known_chats`), and registry state (`package_group_registry`). `directory --rich` lacked verify; `telegram:handshake:verify` lacked desk metadata.

## Decision

Add a standalone CLI — **`bun run telegram:handshake:desk`** — that merges the three existing sources read-only (no new stores). Optional `--live` refreshes member counts and asserts live forum title; `--detail` / `--json` for operator scripts.

Implementation: `lib/telegram/handshake-desk.ts`, `tools/telegram-handshake-desk.ts`. Spec: [`docs/harness/tenants/partner-package-group-handshake.md`](../harness/tenants/partner-package-group-handshake.md#verify-commands).

Do not extend `handshake:verify` or `directory` with overlapping flags.

## Consequences

- Single source of truth for factory package-group surfaces at the ops console.
- `getKnownChatById` added for direct registry joins (avoids `listKnownChats` limit skew).

## Follow-on (2026-07)

Phased readiness and invite-gap CLIs extend the desk read model without new stores:

- **`bun run telegram:handshake:readiness`** — phased gates (`blocked` → `forum_ready` → `designated` → `operator_ready`); `--detail` enables deep lanes; exit `1` only when any row is `blocked`.
- **`bun run telegram:handshake:invite-gap`** — `2·house!` rows (operator DM linked, partner not in forum); exit `1` when gaps exist.
- **`bun run telegram:ops -- designate-dm-seat`** — sets `package_group_registry.requested_by` after a registry row exists (requires `link-package-group`, not a pre-linked telegram id).
- **Membership tell** — desk `MEMBERS` / readiness `MEM` cells (`2·house`, `2·house!`, `3·OK`, `N·ext`); deep `forum_members` lane fails at `2·house!`.

Desk flags expanded: **`--refresh`**, **`--invite-gap`** (subset report; exit `1` on gaps), plus existing **`--live`**, **`--detail`**, **`--json`**, **`--path`**, **`--db`**.

Spec sections: [`partner-package-group-handshake.md`](../harness/tenants/partner-package-group-handshake.md) — readiness phases, group membership model, forum invite gap, `designate-dm-seat`, verify commands.
