# Bun release contracts

This package turns official Bun release posts into deterministic adoption
inventories. It does not generate `test.todo()` placeholders and does not count
planned announcements as executable coverage.

```bash
# Active runtime or an explicit release
bun --filter @factorywager/bun-release-contracts generate
bun --filter @factorywager/bun-release-contracts generate v1.3.14

# Feed-driven generation (RSS URL and timeout come from config/bun-channels.toml)
bun --filter @factorywager/bun-release-contracts generate:latest
bun --filter @factorywager/bun-release-contracts generate:all --since v1.3.0 --limit 10

# Deterministic drift checks
bun --filter @factorywager/bun-release-contracts check v1.3.14
bun --filter @factorywager/bun-release-contracts test
```

Inventories are written to `contracts/bun-v<version>.json`;
`contracts/index.json` aggregates release, planned, and executable counts. Batch
generation fetches at most four posts at once by default (`--concurrency`,
capped at eight). `--limit` applies only to `--all`; `latest` always selects
exactly one release.

Generation is two-phase. Every selected post is fetched, parsed, and validated,
then the future aggregate index is validated before any contract output is
written. Changed files are staged on the same filesystem, inventories are
installed first, and `index.json` is installed last as the batch commit marker.
An output lock serializes publishers, and a failed commit restores every target
from its staged backup. Check mode performs the same validation but never
writes.

The publisher targets the repository's supported macOS and Linux operator/CI
environments. Its atomic same-filesystem moves, cleanup, and real-path checks
use argv-safe `Bun.spawn` calls to the platform `mv`, `rm`, and `realpath`
utilities; native Windows is not currently supported.

Each new announcement starts with `status: "planned"` and `testPath: null`.
After adding a real assertion, change it to `status: "covered"` and record a
repository-relative `testPath`. Regeneration preserves that adoption metadata by
announcement identity and fails if a covered test path is missing or escapes the
repository. Stable item keys no longer depend on list order, so an upstream
insertion does not renumber every contract.

The executable release gate remains the root `test:bun:release-contracts`
script. Inventory counts and executable test counts must always be reported
separately.
