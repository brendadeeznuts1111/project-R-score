# Concept lifecycle & data flow

Canonical map of how a concept moves from **definition → wire parse →
inventory/graph → boards → audit**. Use this when you add, deprecate, or
consume semantic vocabulary.

Related:

| Role | Path |
| --- | --- |
| Wire boundary thesis | [`docs/WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md) |
| Domain → concept → shape → surface | [`docs/DOMAIN_CONCEPT_SHAPE.md`](DOMAIN_CONCEPT_SHAPE.md) |
| Portal UI foundation | [`docs/portal-foundation.md`](portal-foundation.md) |
| Partner limits + E3 contract | [`docs/harness/tenants/partner-limits.md`](harness/tenants/partner-limits.md#e3-wire-contract-pending) |
| Agent / limit-row integration | [`docs/harness/tenants/agents.md`](harness/tenants/agents.md) |
| Vocabulary SSOT | [`lib/portal/semantic-vocabulary.ts`](../lib/portal/semantic-vocabulary.ts) |
| Limit-row boundary parser | [`lib/operations/limits/limit-row-wire.ts`](../lib/operations/limits/limit-row-wire.ts) |
| Board slug SSOT | [`lib/http/portal-board-slugs.ts`](../lib/http/portal-board-slugs.ts) |
| Page identity catalog | [`lib/portal/page-concepts.ts`](../lib/portal/page-concepts.ts) |

---

## 1. Vocabulary definition

**Owner:** `PORTAL_SEMANTIC_CONCEPTS` in
[`lib/portal/semantic-vocabulary.ts`](../lib/portal/semantic-vocabulary.ts).

Page identities (`page.*`) are defined in
[`lib/portal/page-concepts.ts`](../lib/portal/page-concepts.ts) and merged into
the same concept list.

### Key fields

| Field | Role |
| --- | --- |
| `id` | Stable key (e.g. `ops.limits.lifecycle_state`, `ui.filter.partnerId`) |
| `namespace` | Top segment family (`ops`, `ui`, `api`, `page`, …) |
| `domain` | Business domain (`operations`, `portal`, `compliance`, …) |
| `group` | Optional subgroup for clustering / graph hubs |
| `status` | `active` (default) or `deprecated` |
| `replacedBy` | Required honesty target when `status: 'deprecated'` (metadata hubs may omit) |
| `deprecatedAt` | ISO date when deprecation landed |
| `seeAlso` | Semantic links (graph edges; classified by domain/group/page) |
| `derivesFrom` | Upstream concept ids for derived metrics (E3-ready; validate when present) |
| `values` | Enum literals when the concept is a closed set |
| `correlationId` | PR / change that introduced the concept (`PR#…` or `legacy`) |
| `addedAt` | Introduction date |

Surface binding maps (chrome inventories) live beside the vocabulary — e.g.
`PARTNER_HISTORY_SURFACE_CONCEPTS`, `LIMIT_FIELD_CONCEPTS` — and are what
`validate:surface-coverage` and partner integration checks treat as board
dependencies.

### Invariants

- Every `seeAlso`, `derivesFrom`, and `replacedBy` target must resolve to an
  existing concept id (checked by relation validators / `concept:audit`).
- Deprecations keep the old id for referential history; **new chrome** binds
  the replacement (`ui.*` / successor), not the deprecated stub.
- Do **not** invent `derivesFrom` edges in the registry until real wire samples
  exist (see E3 below).

---

## 2. Wire boundary (parse once)

**Thesis:** [`docs/WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md) — raw `unknown` is only
legal at the edge; interiors use domain shapes.

**Limit-row E3 stub:**
[`lib/operations/limits/limit-row-wire.ts`](../lib/operations/limits/limit-row-wire.ts)

```ts
parseLimitRowWire(input: unknown): ParsedLimitRowWire
// lifecycleState?: 'pending' | 'active' | 'expired' | 'superseded'
// derivesFrom?: readonly string[]  // glossary concept keys
```

| Input | Behavior |
| --- | --- |
| Field absent | Omitted (`undefined`) — safe incremental deploy |
| Valid enum / string[] | Parsed into `ParsedLimitRowWire` |
| Invalid present value | **Throw** at the boundary |

Rules of engagement:

- Agent/API JSON that carries limit rows must pass this (or a sibling) parser
  before business logic or UI projection.
- No bare `any` / re-decode of the same payload deeper in the stack.
- `derivesFrom` strings are glossary concept keys today (`// brand-ok`); brand
  promotion is a later step if inventory ids become a formal brand.

Tenant detail (endpoints, fixtures, go-signal):
[`partner-limits.md` § E3](harness/tenants/partner-limits.md#e3-wire-contract-pending)
and [`agents.md`](harness/tenants/agents.md).

---

## 3. Inventory, glossary, and graph bakes

Multiple bakes consume the vocabulary. They are **not** interchangeable:

| Command | Primary output | Role |
| --- | --- | --- |
| `bun run concepts:bake` | `public/registry/concepts-state.json` | Inventory / usage board (`/portal/concepts/`) |
| `bun run glossary:portal` | `public/registry/domain-glossary.json` | Human glossary projection |
| `bun run glossary:portal:check` | (check only) | Fail if glossary bake is stale |
| `bun run concept:graph` / `concept:graph:bake` | graph JSON / board assets | `seeAlso` (+ future `derivesFrom`) edges, domain hubs |
| Surface maps in vocabulary | in-module const objects | Chrome inventories for boards |

Graph schema is currently **v5** (`lib/portal/concept-graph.ts`); the portal
board shell at `/portal/concepts/graph/` must stay aligned.

**Audit:**

```bash
bun run concept:audit --strict
```

Strict mode fails on bake drift, broken replacements, and relation integrity.
Informational sections still list **unused** (including deprecated stubs) and
**surface-only** chrome (declared on a surface map but not bound in HTML).

---

## 4. Surfaces and boards

| Layer | SSOT |
| --- | --- |
| Board directory slugs | [`PORTAL_BOARD_SLUGS`](../lib/http/portal-board-slugs.ts) |
| Page concepts | [`PORTAL_PAGE_CONCEPT_DEFINITIONS`](../lib/portal/page-concepts.ts) |
| Dashboard / public route catalog | [`PORTAL_DASHBOARD_ROUTES`](../lib/http/public-routes.ts) |
| Trailing-slash redirects | `public/_redirects` |
| Serve wiring | `portalBoardRoutes` + slugs in `scripts/serve-public.ts` |
| Chrome / nav | `lib/portal/chrome-catalog.ts` |

**Registration rule:** a directory `public/portal/<slug>/index.html` must have:

1. `<slug>` in `PORTAL_BOARD_SLUGS`
2. `page.*` entry with `path: '/portal/<slug>/'`
3. Matching `public-routes` dashboard catalog path
4. `_redirects` 301 for bare `/portal/<slug>`

**Surface coverage:**

```bash
bun run validate:surface-coverage
```

Ensures concepts listed on a board surface inventory are either observed in
board HTML/JS (scraped) or explicitly allowlisted for planned chrome.

---

## 5. Adding a new concept — checklist

1. **Define** the concept in `semantic-vocabulary.ts` (or `page-concepts.ts` for
   a board identity).
2. **Link** with honest `seeAlso` (and `derivesFrom` only when wire-backed).
3. **Wire field?** Extend `ParsedLimitRowWire` + `parseLimitRowWire` (or the
   owning boundary module) and add unit tests.
4. **Board chrome?** Add to the surface map (`PARTNER_HISTORY_SURFACE_CONCEPTS`,
   etc.) and bind HTML with `data-glossary-concept` / surface attributes.
5. **Bake:**
   ```bash
   bun run glossary:portal
   bun run concepts:bake          # if inventory board cares
   bun run concept:graph:bake     # if graph edges changed
   ```
6. **Audit:**
   ```bash
   bun run concept:audit --strict
   bun run validate:surface-coverage
   bun run glossary:portal:check
   ```
7. **Commit** with `correlationId: 'PR#…'` and pathspec that does not sweep
   foreign-lane dirt. Prefer a separate `chore(bake):` commit when baking
   `public/registry/**` with source (pre-commit warns on mixed bake+source).

---

## 6. Deprecating a concept — checklist

1. Set `status: 'deprecated'`, `replacedBy: '<successor>'`, `deprecatedAt`.
2. Prefix the description with `Deprecated: use <successor>. …` (repo convention).
3. Retarget surface maps and HTML to the successor (E1/Option 3 pattern for
   `ops.filter.*` → `ui.filter.*`).
4. Keep the deprecated id in the vocabulary so old links/history still resolve.
5. Run `concept:audit --strict` and board tests that assert chrome inventories.
6. Commit with an explicit mapping table in the message/PR body.

---

## 7. E3 readiness (pending wire)

Backend is expected to return on limit-change / raise rows:

| Field | Concept | Notes |
| --- | --- | --- |
| `lifecycleState` | `ops.limits.lifecycle_state` | Enum: `pending` · `active` · `expired` · `superseded` — **not** `monitoring_status` |
| `derivesFrom` | edges to upstream ids | e.g. `ops.limits.effective_limit`, `api.limit_cache` |

Until those fields appear on real responses:

- Parser returns `undefined` for missing keys.
- Do **not** invent client-side lifecycle or derivation for production boards.
- Vocabulary may already name infrastructure nodes (`api.limit_events`,
  `api.limit_cache`, `api.bookmaker_feed`) with `seeAlso` to downstream
  concepts.

When wire samples land: parse → bind columns/filters → bake graph edges →
strict audit. Full agent-facing contract:
[`docs/harness/tenants/agents.md`](harness/tenants/agents.md).

---

## 8. Concept-lane gate set (local)

Prefer this over full monorepo `bun test` when changing vocabulary / boards /
limit-row wire:

```bash
bun test tests/concept-graph.test.ts \
  tests/concept-audit.test.ts \
  tests/partner-history-portal.test.ts \
  tests/portal-board-routes.test.ts \
  tests/limit-row-wire.test.ts   # when wire parser touched

bun run concept:audit --strict
bun run validate:surface-coverage
bun run glossary:portal:check    # when glossary bake changed
```

Full monorepo suites pull `toc-ops`, vault env, and stale-bake noise — useful
for product lanes, not as the default concept-lane gate.
