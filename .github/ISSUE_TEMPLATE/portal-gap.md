---
name: Portal gap
about: Missing or incomplete portal board, route, bake, or chrome surface
title: "[portal] "
labels: portal, gap
---

## Routing (human queue only)

GitHub is **not** concept/domain SSOT. Use these fields so humans can filter;
concepts stay in vocabulary + `concept:audit`. **Domain** = chrome nav lane
(not entity ontology). For `BM-*` catalog gaps also set **Tenant** /
**Owner** — [ISSUE-ROUTING.md](../../docs/harness/ISSUE-ROUTING.md).

| Field | Value | Rule |
|-------|-------|------|
| **Domain** | `partner` · `control` · `trading` · `identity` · `knowledge` · `platform` | Required — chrome `domainLanes` (UI container) |
| **Tenant** | e.g. `bookmakers` · or `n/a` | When a residual table owns the entity (bookmaker ≠ partner) |
| **Owner** | chrome lane or tenant id · or `n/a` | When the fix lane differs from Tenant (e.g. BM-5 → `platform`) |
| **Tracker** | e.g. `BM-1` · link to tenant `*-open-issues.md` · or `n/a` | Optional — residual product gap |
| **Concept** | e.g. `telegram.topic.accounting` · or `n/a` | Only if vocabulary changes; must exist or land with PR + `concept:audit` |
| **Surface** | e.g. `/portal/dod/` · `/registry/dod-queue.json` | Path operators hit |

Map: [partner-domain-map.md](../../docs/harness/tenants/partner-domain-map.md) ·
[CONCEPT_LIFECYCLE.md](../../docs/CONCEPT_LIFECYCLE.md) ·
[bookmakers-open-issues.md](../../docs/harness/tenants/bookmakers-open-issues.md)

## Gap

<!-- What is missing or wrong on the portal plane? -->

| Field | Value |
|-------|-------|
| Board / surface | e.g. `/portal/<slug>/` |
| Registry artifact | e.g. `/registry/<name>.json` (or none) |
| Tenant / doc owner | e.g. `docs/harness/tenants/…` |
| Observed | local serve-public · Pages preview · production |

## Expected

-

## Actual

-

## Acceptance criteria

- [ ] Board route registered (`PORTAL_BOARD_SLUGS` · public-routes · `_redirects` as needed)
- [ ] Chrome / page-concepts updated if the board is first-class nav
- [ ] Bake or fixture produces the registry JSON the board reads
- [ ] Proof: `bun run verify:portal:static` and/or board-specific check exits 0
- [ ] PR uses Claim → evidence table ([pull_request_template.md](../pull_request_template.md))
- [ ] If **Concept** filled: `bun run concept:audit --strict` green on that change

## Related

<!-- Issues, PRs, tracker ids (BM-*), tenant docs -->

-
