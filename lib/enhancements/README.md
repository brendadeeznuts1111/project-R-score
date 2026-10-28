# Enhancement domain

Small runtime layer for Project R's Bun enhancement registry. The source
contract lives at `config/enhancements/registry.jsonc`; this domain parses it,
resolves environment decisions, and exposes an atomic live snapshot.

| Module        | Ownership                                                          |
| ------------- | ------------------------------------------------------------------ |
| `types.ts`    | Registry, resolved item, and snapshot shapes                       |
| `registry.ts` | JSONC wire-boundary parsing and structural validation              |
| `resolver.ts` | Bun-version, lifecycle, environment, and strict override decisions |
| `store.ts`    | Atomic snapshot plus development-only file notification reload     |
| `public.ts`   | Redacted agent-facing `/.well-known/experiments` projection        |

Consumers read the store; they do not mutate `process.env`. The source and
generated public artifact are checked through `bun run enhancements -- check`.
Lifecycle and rollback policy live in
[`docs/design/bun-enhancement-pipeline.md`](../../docs/design/bun-enhancement-pipeline.md).
