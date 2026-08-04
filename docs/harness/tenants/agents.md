# Agent endpoints × concept / wire integration

Tenant note for **limit-row and partner-agent JSON** consumed by the portal and
ops tools. Complements:

- [`docs/CONCEPT_LIFECYCLE.md`](../../CONCEPT_LIFECYCLE.md) — full lifecycle
- [`docs/WIRE_BOUNDARY.md`](../../WIRE_BOUNDARY.md) — parse-once policy
- [`partner-limits.md`](partner-limits.md) — desk, multi-factor raises, E3 table
- [`docs/platform-routing.md`](../../platform-routing.md) — local vs Pages APIs

---

## Concept and wire integration

### Agent endpoints and the semantic boundary

Endpoints that return limit / raise rows (for example
`/api/agents/v1/limits/raises`, history-style limit rows, and fixture twins)
are **edge inputs**. Before interior use they must pass a boundary parser.

**Primary stub (E3 fields):**
[`lib/operations/limits/limit-row-wire.ts`](../../../lib/operations/limits/limit-row-wire.ts)

| Rule | Detail |
| --- | --- |
| Entry type | `unknown` only at the function boundary |
| Exit type | `ParsedLimitRowWire` (optional fields) |
| Missing fields | Omitted — incremental deploy |
| Malformed fields | Throw (fail closed at the edge) |
| Interiors | No re-decode; no bare `any` escape |

Field names on the wire are **camelCase** (`lifecycleState`, `derivesFrom`).

### Expected fields (E3 readiness)

| Field | Type | Values / notes |
| --- | --- | --- |
| `lifecycleState` | `string` | `pending`, `active`, `expired`, `superseded`. Distinct from monitoring chrome (`monitored` / `attention` / `blocked` / `incomplete` → `ops.limits.monitoring_status`). |
| `derivesFrom` | `string[]` | Glossary concept ids (e.g. `["ops.limits.effective_limit", "api.limit_cache"]`). Optional until backend ships. |

These fields are **not required to be live** yet. The parser returns
`undefined`/omitted properties when keys are absent so clients can deploy ahead
of the wire.

Authoritative short table + fixture JSON:
[partner-limits § E3 wire contract](partner-limits.md#e3-wire-contract-pending).

### Vocabulary mapping

| Wire field | Concept id | Validation |
| --- | --- | --- |
| `lifecycleState` | `ops.limits.lifecycle_state` | Enum must match `LIMIT_LIFECYCLE_STATES` / concept `values` |
| `derivesFrom[]` | each string is a concept key | Present strings must eventually resolve in `PORTAL_SEMANTIC_CONCEPTS`; do not invent edges before samples exist |

Surface binding helpers in vocabulary (examples):

- `LIMIT_FIELD_CONCEPTS.lifecycleState` → `ops.limits.lifecycle_state`
- Partner-history chrome: `PARTNER_HISTORY_SURFACE_CONCEPTS.lifecycleState`

### Related infrastructure concepts

Defined in `semantic-vocabulary.ts` with `seeAlso` into downstream limit
fields:

| Id | Role |
| --- | --- |
| `api.limit_events` | Event stream for direction / delta style evidence |
| `api.limit_cache` | Cache-backed effective / high-water style inputs |
| `api.bookmaker_feed` | Sport / league catalog upstream of desk columns |

Treat these as **inventory nodes**, not as license to fabricate wire payloads.

### Adding a new agent-facing field

1. Extend `ParsedLimitRowWire` and `parseLimitRowWire` (or a dedicated sibling
   parser if the payload is not a limit row).
2. Add/adjust the concept in `lib/portal/semantic-vocabulary.ts`.
3. Document the field here and in `partner-limits.md` if desk-visible.
4. Bind board surfaces (HTML + surface map) only after parse succeeds on
   fixtures.
5. Tests: `bun test tests/limit-row-wire.test.ts` (+ board tests as needed).
6. Gates: `bun run concept:audit --strict` and
   `bun run validate:surface-coverage`.

See the checklists in
[`docs/CONCEPT_LIFECYCLE.md`](../../CONCEPT_LIFECYCLE.md).

### Concept-lane commands (agent / vocabulary work)

```bash
bun test tests/limit-row-wire.test.ts
bun test tests/concept-audit.test.ts tests/concept-graph.test.ts
bun run concept:audit --strict
bun run validate:surface-coverage
```

Do not use full monorepo `bun test` as the default gate for vocabulary-only
changes (foreign toc-ops / vault / bake noise).
