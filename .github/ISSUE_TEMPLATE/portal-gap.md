---
name: Portal gap
about: Missing or incomplete portal board, route, bake, or chrome surface
title: "[portal] "
labels: portal, gap
---

## Gap

<!-- What is missing or wrong on the portal plane? -->

| Field | Value |
|-------|-------|
| Board / surface | e.g. `/portal/<slug>/` |
| Registry artifact | e.g. `/registry/<name>.json` (or none) |
| Tenant / doc owner | e.g. `docs/harness/tenants/…` |
| Observed | local serve-public · Pages preview · production |

## Expected

<!-- What should operators or agents see? -->

-

## Actual

-

## Acceptance criteria

- [ ] Board route registered (`PORTAL_BOARD_SLUGS` · public-routes · `_redirects` as needed)
- [ ] Chrome / page-concepts updated if the board is first-class nav
- [ ] Bake or fixture produces the registry JSON the board reads
- [ ] Proof: `bun run verify:portal:static` and/or board-specific check exits 0
- [ ] PR uses Claim → evidence table ([pull_request_template.md](../pull_request_template.md))

## Related

<!-- Issues, PRs, tenant docs -->

-
