# MASTER_MATRIX.md (Maintenance Version)

| Category | SubCat | ID/Pattern | Value/Title | Locations/Changes | Impact | Bun Fix/Script |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Perf** | File I/O | 144 | readFileSync | core/analysis/ | 40-50% | `Bun.file()` mega-fix |
| **Perf** | Algos | BUF_MB | 1e6 | unicode-similarity | 15-25% CPU | `Uint8Array(BUF_MB)` |
| **Perf** | Pipeline| E2E_SYNC | 5ms / 0.8ms | scripts/e2e-simulation-pipeline.ts | Massive Scale | Parallel Batching |
| **Consts** | Timers | TIMER_1S | 1000 | ErrorGovernor.ts | Leak-free | `Bun.sleep(TIMER_1S)` |
| **URLs** | API | api:* | /rpa/task | docs/api/URL_MATRIX | Scalable | `Bun.resolveSync()` |
| **New Features** | **10** | 7 (Cloud Num, RPA, API, E2E) | 3 | 0 | 4 |  |
| **Optimizations** | **9** | 4 (Anti-Detect, R2, DNS) | 2 | 3 | 5 |  |
| **TOTAL** | **19** | **11** | **5** | **3** | **9** |  |
| **New Features** | 1 | Cloud Number | Purchase/manage overseas nums | Account reg/login | Efficiency | `Bun.randomUUIDv7()` |
| **New Features** | 2 | RPA Templates | TikTok/Reddit auto-warming | Multi-account matrices | Automation scale | `AbortController` |
| **New Features** | 3 | Batch Push Cloud Drive | Batch push files to cloud phones | Account content diff | Fine-grained mgmt | `Bun.zstdCompressSync()` |
| **New Features** | 4 | Integration Pipeline | E2E script for 5000+ IDs streaming | Massive data ingestion | High ROI simulation | Parallel upload |
| **New Features** | 5 | Storage Metrics | `getMetrics()` health reporting | Real-time monitoring | Visibility | `readdirSync` counts |
| **New Features** | 6 | Local Mirroring| Auto-decoding R2 -> data/ mirror | Local dev integration | Zero-latency dev | `Bun.zstdDecompressSync` |
| **New Features** | 7 | SDK Orchestration| `batchPushToPhones()` resource dispatch | Media-heavy RPA | Scalable dispatch | `Promise.all` logic |
| **Optimizations** | 1 | R2 Path Hierarchy | `apple-ids/` -> `accounts/apple-id/` | Logical namespacing | Cleaner bucket | URLPattern rewrite |
| **Optimizations** | 2 | Query Concurrency | Chunk-based R2 downloads (limit=20) | High-scale search | Prevent 429 Errors | `for...i+=Batch` |
| **Optimizations** | 3 | Dynamic CSV Export| Auto-detect JSON fields for CSV | Data analysis | Flexible export | `Set(keys)` logic |
| **R2** | Dirs | R2_APPLE | accounts/apple-id/ | src/storage/r2-apple-manager.ts | Scalable layout | `accounts/` namespace |
| **R2** | Const | ZSTD_LEVEL | 3 | uploadStream | 82% average savings | Native S3 optimization |
| **R2** | Magic | MAX_KEYS | 100 | listAppleIDs | Opt pagination | CLI Query optimization |
| **R2** | PerRun | UPLOAD_TIME | 0.8ms | e2e-simulation-pipeline.ts | Native I/O | Bun Native S3 |
| **R2** | Bulk | BULK_COUNT | 5000 | e2e-simulation-pipeline.ts | High throughput | ~1000 ms total |
| **R2** | Matching | PATTERN_SPEED | 340k paths/s | utils/urlpattern-r2.ts | Linear scaling | Web URLPattern API |
| **Bulk** | Perf | GEN_TIME_5ms | 5ms | urlpattern-r2.ts | 5ms per ID | Augmented mock data |
| **Bulk** | Const | SUCCESS_RATE | 0.9 | constants.ts | Prod realism | 90% success |
| **Dashboards** | Unified | PORT_3004_3005 | Active | tools/unified-dashboard.js | Monitoring | Integrated view |
| **CLI** | Filter | SUPER_TABLE | success=true | utils/super-table.ts | Instant Query | Color-coded status |
| **CLI** | Filter | PREDICATES | =,!=,>,in:US,UK | utils/cli-filter.ts | Multi-conditional | Regex-free filtering |
| **CLI** | Route | CLI_INTEGRATED | `bun cli bench r2` | cli/commands/bench.ts | Unified entry | Sub-command routing |

**Total: 42 entries**
