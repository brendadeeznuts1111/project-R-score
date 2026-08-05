# Issue routing (domain · tracker · concept)

GitHub Issues are a **human queue**, not the concept or domain graph.

| Field | When to fill | SSOT lives in |
|-------|--------------|---------------|
| **Domain** | Almost always on portal/product tickets | Chrome `domainLanes` · [partner-domain-map.md](tenants/partner-domain-map.md) |
| **Tracker** | Residual product gaps with a tenant id | e.g. [bookmakers-open-issues.md](tenants/bookmakers-open-issues.md) (`BM-*`) |
| **Concept** | Only when vocabulary / wire chrome changes | `semantic-vocabulary` · `concept:audit --strict` · [CONCEPT_LIFECYCLE.md](../CONCEPT_LIFECYCLE.md) |

## Domain values (chrome lanes)

`partner` · `control` · `trading` · `identity` · `knowledge` · `platform`

## Do not

- Invent concept ids on issues without a vocabulary PR
- Treat issue labels as glossary SSOT
- Invent bookmaker registry ids for unmatched desk labels (e.g. Orange777) without domain

## Templates

| Template | Path |
|----------|------|
| Portal gap | [`.github/ISSUE_TEMPLATE/portal-gap.md`](../../.github/ISSUE_TEMPLATE/portal-gap.md) |
| Bookmakers catalog | [`.github/ISSUE_TEMPLATE/bookmakers-catalog.md`](../../.github/ISSUE_TEMPLATE/bookmakers-catalog.md) |
| Default PR | [`.github/pull_request_template.md`](../../.github/pull_request_template.md) |
