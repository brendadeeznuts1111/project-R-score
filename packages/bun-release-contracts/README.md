# Bun release contracts

This package turns an official Bun release post into a deterministic adoption inventory.
It does not generate `test.todo()` placeholders and does not count planned announcements
as executable coverage.

```bash
bun --filter @factorywager/bun-release-contracts generate v1.3.14
bun --filter @factorywager/bun-release-contracts check v1.3.14
bun --filter @factorywager/bun-release-contracts test
```

Generated inventories are written to `contracts/bun-v<version>.json`. Each announcement
starts with `status: "planned"`. Promote an item by adding a real assertion to Project R's
version-specific Bun tests, then record that test path in the inventory during review.

The executable release gates remain the root `test:bun:release-contracts` scripts. Inventory
counts and executable test counts must be reported separately.
