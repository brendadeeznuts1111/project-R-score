# Concept Registry Service

Persistent, versioned store for glossary concepts — Phase 1 of the "deeper"
registry/graph proposal. `bun:sqlite` storage, a repository layer, a `Bun.serve`
HTTP API, and a one-shot migration seeded from the two real SSOTs.

## Why this exists / scope

- Glossary concepts live in `lib/portal/semantic-vocabulary.ts` (live SSOT) and
  `public/registry/domain-glossary.json` (baked, 428 concepts). The registry
  persists them with version history, usage rows, provenance, and a review
  workflow so the lifecycle can be queried and governed.
- Phase 1 = storage + repo + API + migration. The `concept:audit` rewrite,
  on-build usage auto-sync watcher, graph dashboard (`/portal/glossary/` is the
  real surface — there is no `/portal/concepts/`), and lifecycle cron are later
  phases. `concept:audit` itself still lives in open PR #228; the registry is
  built so that lane can consume it.
- The proposal's `concept-provenance.json` does not exist anywhere; provenance
  is sourced from the bake (`domain-glossary.json`) and the vocabulary
  `correlationId` fields (neither carries correlationIds on main yet — the
  `concept_provenance` table is ready for when they do).

## Schema (`lib/concept-registry/schema.ts`)

| Table | Purpose |
|---|---|
| `concepts` | live row: id, label, description, kind, category, group_prefix, status, color, unit, format, maps_to, see_also, synonyms, values, url, deprecated_by, source, timestamps |
| `concept_versions` | immutable JSON snapshot per change (propose/approve/deprecate/archive bump a version) |
| `concept_usage` | concept × board × file counts (seeded by a one-shot `data-glossary-concept` scan of `public/portal`) |
| `concept_provenance` | correlationId/author provenance (empty on main; ready for PR-228 correlationIds) |
| `concept_review` | proposed/approved/rejected review trail |

Lifecycle: `proposed → active → deprecated → archived` (soft delete). Reject
leaves the concept `proposed` and records a rejected review.

## API (routes)

```
GET    /api/concepts?status=&category=&group=&limit=&offset=
GET    /api/concepts/graph                 # { nodes, edges, summary } from seeAlso/mapsTo/deprecatedBy
POST   /api/concepts/propose               # { id, label, ... } → 201 proposed
GET    /api/concepts/:id                   # single concept
GET    /api/concepts/:id/versions          # version history
GET    /api/concepts/:id/usage             # usage rows
GET    /api/concepts/:id/reviews           # review trail
PATCH  /api/concepts/:id/approve           # { reviewer?, comments? } proposed → active
PATCH  /api/concepts/:id/reject            # { reviewer?, comments? } records rejected review
PATCH  /api/concepts/:id/deprecate         # { replaceBy? } active → deprecated
DELETE /api/concepts/:id                   # { force: true } soft archive
```

Errors: `400` zod validation · `404` missing concept · `405` method ·
`409` conflict / invalid transition.

## CLI

```bash
bun run concept:registry:sync         # lightweight vocabulary → DB (existing main SSOT)
bun run concept:registry:check        # verify lightweight DB
bun run concept:registry:serve        # migrate + serve versioned API on 127.0.0.1:8790
bun run concept:registry:migrate      # seed/refresh versioned data/concept-registry.db
bun run concept:registry:usage-sync   # refresh service rows, then scan portal HTML → usage + orphan report
bun run concept:registry:graph        # graph summary (central concepts)
bun run concept:registry:graph -- --output json
```

Port: `config/ports.ts` `CONCEPT_REGISTRY` (env `CONCEPT_REGISTRY_PORT`, default
8790). DB: `data/concept-registry.db` (gitignored) or `CONCEPT_REGISTRY_DB` /
`:memory:` for tests.

## Migration sources

1. `public/registry/domain-glossary.json` — baked glossary (zod-parsed at the
   file boundary): 428 concepts with category/kind/status/color/unit/mapsTo/
   seeAlso/synonyms/values/url/deprecatedBy.
2. `lib/portal/semantic-vocabulary.ts` — `PORTAL_SEMANTIC_CONCEPTS` gap-fill
   (label/description/kind=semanticType/unit/format/seeAlso/synonyms/values)
   without clobbering bake-owned metadata.
3. `data-glossary-concept` scan of `public/portal/**` HTML → `concept_usage`.

Idempotent: re-running merges diffs and bumps versions only on actual changes.
