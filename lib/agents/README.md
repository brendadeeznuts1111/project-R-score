# Agent capability authority

<!-- area-map-verified: 2026-08-26 -->

This domain owns the typed, default-deny capability boundary shared by agents,
tools, MCP servers, and skills. It inventories entrypoints but does not grant
credentials or remote access. Runtime flag semantics remain owned by
`lib/security/control-policy.ts`, and content identity remains owned by
`lib/content-store/`.

## Area map

| Area                                                   | Owner                                                |
| ------------------------------------------------------ | ---------------------------------------------------- |
| Strict wire parsing and exact invocation authorization | [`capability-manifest.ts`](./capability-manifest.ts) |
| MCP, skill, tool, and preload inventory ratchets       | [`agent-inventory.ts`](./agent-inventory.ts)         |

Consumer migration is explicit: a caller parses one manifest and invocation,
then refuses execution unless `authorizeAgentInvocation` returns `ok: true`.
