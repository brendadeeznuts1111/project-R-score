# Session domain brands

**Module:** `lib/types/branded/session.ts`

| Brand | Meaning | Prefer mint via |
|-------|---------|-----------------|
| `SessionId` | Terminal/agent session | system-internal UUID + `asSessionId` |
| `TerminalId` | PTY instance | system-internal |
| `RequestId` | Per-request handle | middleware `asRequestId` / wire `parseRequestId` |
| `CorrelationId` | Distributed trace | propagate with parse on inbound headers |
| `SnapshotId` | State snapshot | system-internal |

All five export full tiers: `as*` · `try*` · `parse*`.
