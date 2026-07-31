# tennis

Portal tennis desk — metrics, **avatar mapping**, live matches.

## Clean mapping model

```
Player display name  ──normalizePlayerSlug──►  slug
     │                                           │
     │                                    warehouse/avatars/{slug}.png
     │                                           │
     │                                    Bun.Image (batch or /avatar/:id)
     │                                           │
     └──── avatar-index.json ◄────────── public/avatars/{slug}.webp
              players[]
              bySlug{}
              nameToSlug{}   ◄── board + live-matches join on slug
```

| Artifact                | Path                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| Metrics                 | `/registry/tennis/board-metrics.json`                                   |
| Mid buckets             | `/registry/tennis/mid-distribution.json`                                |
| **Avatar index**        | `/registry/tennis/avatar-index.json`                                    |
| **Live matches**        | `/registry/tennis/live-matches.json`                                    |
| **Agent registry auth** | `/registry/tennis/agent-auth.json` (`FACTORY_WAGER_TOKEN` · configured) |
| Tenant packages         | `/registry/tennis/registry.json`                                        |
| Source photos           | `warehouse/avatars/{slug}.*`                                            |
| Static thumbs           | `public/avatars/{slug}.webp`                                            |

Cloud agent / private registry:
[`docs/harness/tenants/tennis-hq-registry.md`](../../docs/harness/tenants/tennis-hq-registry.md)
· `bun run tennis:agent-auth:check`.

## Modules

| File               | Role                                           |
| ------------------ | ---------------------------------------------- |
| `board-metrics.ts` | Mid buckets, series volume                     |
| `avatar-index.ts`  | Slug normalize, warehouse scan, name→slug maps |
| `live-matches.ts`  | Paired event rows + edge + venue               |
| Bake               | `bun run tennis:board:bake`                    |

## Operator

```bash
# Add a player photo (slug = filename stem)
cp photo.png warehouse/avatars/jannik-sinner.png

# Bake metrics + matches + index (+ generate WebPs unless --no-images)
bun run tennis:board:bake

# Board loads JSON — no HTML hardcoding
```

```bash
bun test tests/tennis-avatar-index.test.ts tests/tennis-live-matches.test.ts
```
