# Constants Matrix

| Category | SubCat | ID/Pattern | Value/Title | Locations/Changes | Impact | Bun Fix/Script |
|----------|--------|------------|-------------|-------------------|--------|---------------|
| **Consts** | Timers | TIMER_1S | 1000 | ErrorGovernor.ts | Leak-free | `Bun.sleep(TIMER_1S)` |
| **R2** | Storage | MAX_KEYS | 100 | listAppleIDs | Opt pagination | `R2_CONSTANTS.MAX_KEYS` |
| **R2** | Compression | ZSTD_LEVEL | 3 | uploadStream | Balanced Perf | `R2_CONSTANTS.ZSTD_LEVEL` |
| **R2** | Performance | COMP_TARGET | 80% | storage-savings | 5x space savings | `COMPRESSION_TARGET` |
| **Batch** | Generation | BULK_COUNT | 500 | bulk-apple-gen.ts | High throughput | `BULK_APPLE_COUNT` |
| **Success** | Threshold | SUCCESS_RATE | 0.9 | constants.ts | Prod realism | `EXPECTED_SUCCESS_RATE` |
| **CLI** | Filter | ARG_PREFIX | --filter | cli-filter.ts | Syntax | `CLI_FILTER.ARG_PREFIX` |
| **CLI** | Filter | OR_SEP | --or | cli-filter.ts | Logic | `CLI_FILTER.OR_SEP` |
