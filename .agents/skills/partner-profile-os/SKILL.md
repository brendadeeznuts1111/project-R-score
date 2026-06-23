---
name: partner-profile-os
description: Partner Profile OS for Sports Terminal v5.2+. TOML templates, PartnerGateway kernel, lifecycle state machine, multi-layered data source routing. Bun-native.
---

# Partner Profile OS

Canonical partner identity layer for Sports Terminal v5.2+. Use when implementing or operating partner profiles, TOML materialization, lifecycle transitions, SOR gates, settlement, or cascade-engine consumption.

## Canonical docs

| Resource | Path |
|----------|------|
| Full implementation spec | [`docs/sports-terminal/partner-profile-full-impl.md`](../../../docs/sports-terminal/partner-profile-full-impl.md) |
| Doc index | [`docs/sports-terminal/README.md`](../../../docs/sports-terminal/README.md) |
| Mermaid atlas (PDF) | [`docs/sports-terminal/mermaid-atlas.pdf`](../../../docs/sports-terminal/mermaid-atlas.pdf) |

## When to use

- Materialize or transition partner profiles from TOML templates
- Wire `PartnerGateway.evaluate(signal)` into SDN / cascade / settlement
- Debug lifecycle guards, bookIndex routing, or SQLite backup state

## Runtime

Bun-native. Zero non-Bun dependencies except Zod. Import from `src/zones/partner-profile/` (see full spec for module order).

## Agent tooling

| Tool | Use when |
|------|----------|
| `ast_grep_outline` | Map partner-profile modules under sports-terminal-os |
| `ast_grep_search` | Find `PartnerGateway.evaluate` call sites |
| `/precommit` | Before committing TOML templates or gateway changes |

Shared reference: [agent-tooling.md](../references/agent-tooling.md)
