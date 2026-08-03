# Concept Registry (Phase 1)

Persistent, versioned store for glossary concepts — Bun-native `bun:sqlite`, HTTP API, CLI, and semantic graph.

**Not** a second glossary SSOT for Kalshi cores. Seed **merges** from:

1. `lib/portal/semantic-vocabulary.ts` (portal UI concepts)
2. `public/registry/domain-glossary.json` (baked glossary)

TypeScript + bake remain the authoring surfaces; the registry is the operational query/review store.

## Quick start

```bash
bun run concept:registry:seed          # create data/concept-registry.db + seed
bun run concept:registry:serve -- --seed
# → http://127.0.0.1:8788/api/concepts

bun run concept:propose -- --id accounting.batch_import --label "Batch Import" --category ops --group accounting
bun run concept:approve -- accounting.batch_import
bun run concept:graph -- --output mermaid --summary
```

## Schema

| Table | Role |
|-------|------|
| `concepts` | Current concept row (status lifecycle) |
| `concept_versions` | JSON snapshot per mutation + author |
| `concept_usage` | board/file hit counts (portal scan) |
| `concept_provenance` | correlationId provenance |
| `concept_review` | proposed / approved / rejected audit trail |

## Lifecycle

```
draft → proposed → active → deprecated → archived
              ↘ rejected ↗ (resubmit)
```

| Command | Transition |
|---------|------------|
| `concept:propose -- --draft` | create **draft** |
| `concept:propose` | create **proposed** |
| `concept:submit` | draft → proposed |
| `concept:review -- --approve` | proposed → **active** |
| `concept:review -- --reject` | proposed → **rejected** (or draft with `--soft`) |
| `concept:deprecate` | active → **deprecated** |
| `concept:archive` | → **archived** |
| `concept:history` | version + review timeline |
| `concept:health` | registry health metrics + alerts |

## API

| Method | Path |
|--------|------|
| GET | `/api/concepts` |
| GET | `/api/concepts/:id` |
| GET | `/api/concepts/:id/versions` |
| GET | `/api/concepts/:id/usage` |
| POST | `/api/concepts/propose` |
| PATCH | `/api/concepts/:id/approve` |
| PATCH | `/api/concepts/:id/deprecate` |
| DELETE | `/api/concepts/:id?force=1` |
| GET | `/api/concepts/graph?output=json\|mermaid&centrality&orphans&stale` |

## Env

| Variable | Default |
|----------|---------|
| `CONCEPT_REGISTRY_DB_PATH` | `data/concept-registry.db` |
| `CONCEPT_REGISTRY_PORT` | `8788` |
| `CONCEPT_REGISTRY_HOST` | `127.0.0.1` |
| `CONCEPT_REGISTRY_AUTHOR` | git `user.name` or `system` |
| `CONCEPT_REGISTRY_SEED` | `0` (`1` seeds on serve) |

## Phase 2+

- Wire `concept:audit` to registry API (when audit lands on main)
- Portal `/portal/concepts/` graph view
- CI: fail on `proposed` concepts referenced in HTML
- Weekly proposed-without-approval report
