# Domain → concept → shape → surface

Canonical decision model for extending FactoryWager vocabulary, contracts, and
portal delivery. Use this before adding a domain-valued field, semantic concept,
wire payload, registry artifact, or board.

## The four layers

| Layer | Question | Authority | Proof |
| --- | --- | --- | --- |
| **Domain** | Which business lane owns the meaning? | [`lib/portal/concept-domains.ts`](../lib/portal/concept-domains.ts) | `bun test tests/concept-domains.test.ts` |
| **Concept** | What stable semantic idea is being named? | [`lib/portal/semantic-vocabulary.ts`](../lib/portal/semantic-vocabulary.ts) · page identities in [`lib/portal/page-concepts.ts`](../lib/portal/page-concepts.ts) | `bun run concept:audit -- --strict` |
| **Shape** | What parsed representation is trusted after the boundary? | [`docs/WIRE_BOUNDARY.md`](WIRE_BOUNDARY.md) · owning parser/schema · branded values in [`lib/types/branded/`](../lib/types/branded/) | boundary tests · `bun run check:brands` |
| **Surface** | Where is the meaning consumed or operated? | board/API/artifact catalogs · surface maps beside the vocabulary | `bun run validate:surface-coverage` · `bun run public:audit:verify` |

The direction is intentional:

```text
business ownership → stable meaning → validated representation → visible consumer
       domain       →    concept     →          shape           →     surface
```

A surface does not create a concept, a wire key does not define its business
domain, and a concept identifier does not by itself prove a valid runtime shape.

## Terms that must stay distinct

- **Business domain** is a `ConceptDomain` such as `compliance`, `operations`,
  or `portal`. It is not a hostname and not the first segment of a concept id.
- **Namespace** is the first dotted segment (`api`, `ops`, `page`, `section`,
  `ui`). It groups vocabulary keys but does not replace business ownership.
- **Concept** is a stable semantic record with lifecycle, provenance, and
  relations. Reuse an existing concept before proposing another.
- **Shape** is the representation accepted by a parser, schema, branded
  constructor, or contract. Shape validation proves form; it does not prove
  provenance or entity existence.
- **Surface** is a consumer: portal board, endpoint, registry artifact, CLI, or
  operator workflow. Derived bakes are evidence and delivery artifacts, not the
  source of meaning.
- **Session archive lane** (`partner`, `portal-ui`, `harness-infra`, …) is a
  Reasonix chat/history filter — not a `ConceptDomain` and not a chrome Domain
  lane. See [`naming-grammar.md`](organization/naming-grammar.md) and claim
  `workspace-lane-cross-map`.
- **Chrome Domain lane** (`partner` · `control` · `trading` · …) is issue/PR
  routing and portal desk filter — orthogonal to ConceptDomain ownership.
- **Commit scope** in `type(scope):` is an open git-history hint — not a frozen
  child of session lane or ConceptDomain.

## Agent workflow

1. **Discover ownership.** Check `CONCEPT_DOMAINS`, `DOMAIN_METADATA`, and the
   owning tenant/runbook. If ownership is unclear, stop at `tbd`; do not invent
   a new lane implicitly.
2. **Reuse or define meaning.** Search `PORTAL_SEMANTIC_CONCEPTS`, page
   concepts, and the domain glossary. New concepts require honest provenance,
   lifecycle metadata, and resolvable relations.
3. **Parse once.** Treat network, file, environment, and user input as boundary
   data. Parse there; pass domain types and branded values through the interior.
4. **Bind a consumer.** Register the board/API/artifact and connect its surface
   inventory to the concept. Do not infer production fields that are absent on
   the wire.
5. **Bake derived artifacts.** Run only the bakes owned by the changed source.
   Keep source and bake commits separate when lane policy requires it.
6. **Prove and deliver.** Run the concept gates, `bun run bun:ci`, merge to
   `main`, deploy Pages from the merged revision, then verify the custom domain.

## Change matrix

| Change | Minimum focused commands |
| --- | --- |
| Domain mapping | `bun test tests/concept-domains.test.ts` · `bun run concept:domain:stats` |
| Vocabulary or lifecycle | `bun run concept:audit -- --strict` · `bun run validate:concept-metadata` |
| Wire/parser shape | owning boundary tests · `bun run check:brands` · `bun run type-check:ci` |
| Board/surface binding | `bun run validate:surface-coverage` · `bun run verify:portal:static` |
| Concept/glossary bake | `bun run concepts:bake:check` · `bun run glossary:portal:check` |
| Publish | `bun run cloudflare:preflight` · `bun run cloudflare:deploy:verify` · `bun run verify:pages-edge` |

Full lifecycle details: [`docs/CONCEPT_LIFECYCLE.md`](CONCEPT_LIFECYCLE.md).
Live operator view: [`/portal/concepts/`](https://score.factory-wager.com/portal/concepts/)
and the [concept graph](https://score.factory-wager.com/portal/concepts/graph/).

## Delivery boundary

- `score.factory-wager.com` is the Cloudflare Pages production surface for the
  portal and registry.
- `wiki.factory-wager.com` is the GitHub Pages documentation surface. It remains
  a separate delivery plane.
- `tennis.factory-wager.com` is a separate Worker Market Desk plane — not Pages.
  Portal evidence lives at `/portal/tennis/` only. See
  [`docs/design/portal-design-agent.md`](design/portal-design-agent.md) (Portal
  Design agent) and [`tennis-hq-registry.md`](harness/tenants/tennis-hq-registry.md).
- Merge authority is local `bun run bun:ci`; hosted checks do not replace it.
- Deploy only a merged `main` revision, using the Proton-backed Pages workflow.

**Visual identity vs ConceptDomain:** theme / color kernels / venue marks are
owned by Portal Design
([`.agents/skills/portal-design/`](../.agents/skills/portal-design/)); typed
branded IDs stay with [`branded-ids`](../.agents/skills/branded-ids/).
