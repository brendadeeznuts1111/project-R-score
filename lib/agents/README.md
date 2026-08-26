# Agent capability authority

<!-- area-map-verified: 2026-08-26 -->

This domain owns the typed, default-deny capability boundary shared by agents,
tools, MCP servers, and skills. It inventories entrypoints but does not grant
credentials or remote access. Runtime flag semantics remain owned by
`lib/security/control-policy.ts`, and content identity remains owned by
`lib/content-store/`.

## Area map

| Area                                                   | Owner                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| Strict wire parsing and exact invocation authorization | [`capability-manifest.ts`](./capability-manifest.ts)           |
| MCP, skill, tool, and preload inventory ratchets       | [`agent-inventory.ts`](./agent-inventory.ts)                   |
| Parse-authorize-before-effect execution                | [`authorized-execution.ts`](./authorized-execution.ts)         |
| Executable consumer ownership and effect ratchet       | [`agent-consumer-inventory.ts`](./agent-consumer-inventory.ts) |

Consumer migration is explicit: `executeAuthorizedAgentInvocation` parses an
unknown manifest and invocation, refuses unknown controls or undeclared
capabilities, and only then enters an injected effect callback. The consumer
inventory covers executable shebang files plus configured MCP launches; helper
modules and declarative skill definition documents are not misreported as
entrypoints. Source rows classify direct effect calls. Imported helper effects
remain debt owned by the executable row until that row adopts the guarded
boundary.
