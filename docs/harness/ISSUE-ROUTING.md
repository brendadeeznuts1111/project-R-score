# Issue routing (domain · tenant · tracker · concept)

GitHub Issues are a **human queue**, not the concept or domain graph.

| Field | When to fill | SSOT lives in |
|-------|--------------|---------------|
| **Domain** | Which **desk loop** / business lane owns the work | Chrome `domainLanes` · [partner-domain-map.md](tenants/partner-domain-map.md) |
| **Tenant** | Product catalog / residual table owner (entity SSOT) | e.g. [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) (`bookmakers`) |
| **Owner** | Who owns the **fix** when it differs from Tenant | Chrome lane or tenant id — e.g. `platform` for factory publish |
| **Tracker** | Residual product gaps with a tenant id | e.g. `BM-*` in bookmakers-open-issues |
| **Concept** | Only when vocabulary / wire chrome changes | `semantic-vocabulary` · `concept:audit --strict` · [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md) |

## Domain values (desk lanes)

`partner` · `control` · `trading` · `identity` · `knowledge` · `platform`

**Domain names the operating lane**, not a single entity type. The portal chrome
lanes mirror those desk loops so boards stay next to the operators who use them.

### Partner desk loop (why Domain = `partner` includes bookmakers)

The partner lane is the digital nervous system for:

1. **Partners** provide outs / account access (Telegram, direct login, later
   auto-placement) — the capital path into books.
2. **Intelligence** (in-house models, methods, expert feed) rates edges and
   people with winning information.
3. **Liquidity** is pooled across desk profiles (bankroll, risk, winmax).
4. **Offers** match an edge to the right capital source / profile.
5. **Execution** goes back through the partner out into the right book account.
6. **Tracking** keeps bookmakers, limits (pre-match / in-game), balance vs
   credit, hosts, and **providers** hot so the desk can act with a tight
   feedback loop (boards, live liquidity, registry).

**Partner ≠ bookmaker.** Partners hold outs; bookmakers are the sportsbook /
provider surface those outs sit on. Different `host` / `hostName` values may
share an in-game **line provider** — correlate and discount false arbs; do not
treat hostname alone as the supply-chain identity. See
[unified-partner-profile.md](../design/unified-partner-profile.md)
(registry-linked books · many-to-many).

### Bookmakers (worked example)

| Axis | Value | Meaning |
|------|-------|---------|
| Entity | bookmaker (sportsbook catalog) | Sportsbook / provider surface — **not** a partner CODE |
| **Domain** | `partner` | Partner-desk **loop** owns outs → books → limits → liquidity → offers |
| **Tenant** | `bookmakers` | Catalog + `BM-*` tracker SSOT (`@factorywager/bookmakers`, bake, desk-coverage) |
| **Owner** | `bookmakers` or `platform` | Catalog/desk/provider gaps → `bookmakers`; factory publish / registry tooling (e.g. BM-5) → `platform` |
| **Tracker** | `BM-*` | Rows in [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) |
| **Concept** | usually `n/a` | Only if glossary / wire chrome for books moves |

## Do not

- Treat **Domain** = `partner` as “this row’s entity type is partner”
- Collapse partner and bookmaker into one noun (outs vs sportsbook surface)
- Invent concept ids on issues without a vocabulary PR
- Treat issue labels as glossary SSOT
- Invent bookmaker registry ids for unmatched desk labels (e.g. Orange777) without
  a verified book **site domain** (hostname SSOT — unrelated to desk Domain)

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

1. Set **Domain** from the desk loop that owns the work (partner outs/books/limits
   → `partner`; harness-only with no desk surface → `platform`).
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
