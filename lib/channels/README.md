# channels

Unified ops messaging: R2 append log + SQLite outbox projectors (R2 · Telegram · Slack).

| Module | Role |
|--------|------|
| [`channels.ts`](channels.ts) | `R2ChannelStore` / `MemoryChannelStore` event log |
| [`ops-channel-event.ts`](ops-channel-event.ts) | Topics: identity · plays · dod · experiments · alerts · provisioning · **toc** |
| [`outbox.ts`](outbox.ts) | `enqueueOpsChannelEvent` · `processChannelOutbox` · play/identity helpers |
| [`toc-outbox.ts`](toc-outbox.ts) | TOC bake · Soft post · critical gates · ranked capital actions |
| [`outbox-prod-opts.ts`](outbox-prod-opts.ts) | Production R2 projector resolution |
| [`r2-channel-bucket.ts`](r2-channel-bucket.ts) | R2 store factory |

## TOC topic

`topic: 'toc'` is the FactoryWager bridge for TOC operate-lite (not toc-ops-repo MessageLog).

| eventType | When |
|-----------|------|
| `toc.metrics.baked` | After `ops:seed:toc` / metrics bake |
| `toc.gate.critical` | Critical Hard Gate fails (up to 5 per bake) |
| `toc.action.ranked` | Top ranked capital actions (LIMIT/WD/PLAY/…) |
| `toc.soft.posted` | Local Soft journal insert (not bulk seed) |

Default projectors: **r2** (critical gates also **slack**). Pages remains read-only.

```bash
bun test tests/ops-channel-outbox.test.ts tests/toc-ops-enforcement.test.ts
```
