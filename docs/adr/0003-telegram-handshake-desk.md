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
