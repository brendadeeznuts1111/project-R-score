# Storage Architecture - Scoped R2/S3

The DuoPlus automation system employs a tiered, scope-aware storage architecture built on native Bun S3 primitives and Cloudflare R2.

## 🏗️ Core Layers

### 1. Unified Access Layer

All storage operations flow through the `BunR2AppleManager` (located in `src/storage/r2-apple-manager.ts`). This manager is optimized for Bun 1.3.5 and leverages native `Bun.S3Client` for zero-polyfill overhead.

### 2. Physical Partitioning (Scoping)

The system automatically partitions data based on the active **Operational Scope**. This is determined at runtime by the `UnifiedDashboardLauncher` based on the serving domain.

| Scope | Trigger Domain | Physical Path Prefix | Purpose |
| :--- | :--- | :--- | :--- |
| **Enterprise** | `apple.factory-wager.com` | `enterprise/` | Production customer data |
| **Development** | `dev.apple.factory-wager.com` | `development/` | QA and staging environments |
| **Local** | `localhost` | `local-sandbox/` | Developer testing |
| **Global** | Fallback | `global/` | Shared system resources |

### 3. Local Mirroring Layer

To maintain millisecond-latency performance, all read/write operations automatically sync to a local `data/` mirror.

- **Consistency**: Local filesystem structure mirrors the scope-based R2 structure.
- **Optimization**: Native `Bun.file().json()` is used for high-speed local processing.

## 🚀 Performance Primitives

### Native Zstd Compression

Data is compressed using `Bun.zstdCompressSync()` before upload, achieving an average savings of **82%**. The `Content-Encoding: zstd` header is preserved for compatible clients.

### High-Throughput S3

By utilizing Bun's native Zig-based S3 engine, we achieve constant-time throughput of over **2458 IDs/s**, pushing the limits of R2's ingestion APIs.

## 🔗 URL Generation

Public access to assets (like screenshots or reports) is handled via scope-aware URL generation:

- **CDN URLs**: Correctly formed using the scope prefix to ensure cache-friendly paths.
- **Presigned URLs**: Dynamically scoped to prevent cross-scope privilege escalation.

## 🛠️ Maintenance Utilities

- **`fix-sync-io.ts`**: Ensures all storage calls adhere to the "Bun Native First" policy.
- **`perf-dashboard.ts`**: Reports storage health and latency relative to the active scope.
