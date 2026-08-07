# Issue routing (domain · tenant · tracker · concept)

GitHub Issues are a **human queue**, not the concept or domain graph.

| Field | When to fill | SSOT lives in |
|-------|--------------|---------------|
| **Domain** | Chrome lane for the **board / nav surface** (UI container) | Chrome `domainLanes` · [partner-domain-map.md](tenants/partner-domain-map.md) |
| **Tenant** | Product catalog / residual table owner (entity SSOT) | e.g. [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) (`bookmakers`) |
| **Owner** | Who owns the **fix** when it differs from Tenant | Chrome lane or tenant id — e.g. `platform` for factory publish |
| **Tracker** | Residual product gaps with a tenant id | e.g. `BM-*` in bookmakers-open-issues |
| **Concept** | Only when vocabulary / wire chrome changes | `semantic-vocabulary` · `concept:audit --strict` · [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md) |

## Domain values (chrome lanes)

`partner` · `control` · `trading` · `identity` · `knowledge` · `platform`

**Domain is a nav filter, not ontology.** A board can live under the `partner`
chrome lane without the entity being a partner.

### Bookmakers (worked example)

| Axis | Value | Meaning |
|------|-------|---------|
| Entity | bookmaker (sportsbook catalog) | **Not** a partner; partners *link* books via outs / `sportsbookId` |
| Chrome **Domain** | `partner` | `/portal/bookmakers/` sits on the partner-desk nav lane (UI container only) |
| **Tenant** | `bookmakers` | Catalog + `BM-*` tracker SSOT |
| **Owner** | `bookmakers` or `platform` | Catalog/desk gaps → `bookmakers`; factory publish / registry tooling (e.g. BM-5) → `platform` |
| **Tracker** | `BM-*` | Rows in [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) |

See [unified-partner-profile.md](../design/unified-partner-profile.md): books are
registry-linked; many bookmakers per partner, many partners per bookmaker.

## Do not

- Treat **Domain** = `partner` as “this entity is a partner”
- Invent concept ids on issues without a vocabulary PR
- Treat issue labels as glossary SSOT
- Invent bookmaker registry ids for unmatched desk labels (e.g. Orange777) without
  a verified book **site domain** (hostname SSOT — unrelated to chrome Domain)

## Templates

| Template | Path |
|----------|------|
| Portal gap | [`.github/ISSUE_TEMPLATE/portal-gap.md`](../../.github/ISSUE_TEMPLATE/portal-gap.md) |
| Bookmakers catalog | [`.github/ISSUE_TEMPLATE/bookmakers-catalog.md`](../../.github/ISSUE_TEMPLATE/bookmakers-catalog.md) |
| Default PR | [`.github/pull_request_template.md`](../../.github/pull_request_template.md) — Claim → evidence required; optional sections `n/a` |
| P0 PR | [`.github/pull_request_template_p0.md`](../../.github/pull_request_template_p0.md) — production blocker; same claim table |

P0 issue templates share a short **Routing** block (Domain · Tracker · Concept) for
filters only — security/arch labels stay as-is. Prefer adding **Tenant** /
**Owner** when the ticket is a `BM-*` or other tenant residual.

## Agents

When opening or triaging a ticket:

1. Set **Domain** from chrome lanes for the board surface (or `platform` for
   harness-only work with no board).
2. Set **Tenant** when a residual table owns the entity (`bookmakers`, …).
3. Set **Owner** when the fix lane differs from Tenant (e.g. BM-5 → `platform`).
4. Set **Tracker** when closing a tenant residual (`BM-*`, etc.).
5. Set **Concept** only if vocabulary/wire chrome moves — then `concept:audit --strict`.
6. Prove the fix with **Claim → evidence** on the PR, not by closing the issue alone.
7. When naming a Reasonix session rename or quarantine/scratch artifact, use
   **session archive lane** from
   [`naming-grammar.md`](../organization/naming-grammar.md) — do not reuse the
   issue **Domain** field as the filename `<lane>`. Homonyms:
   [`workspace-lane-cross-map.md`](tenants/workspace-lane-cross-map.md).
