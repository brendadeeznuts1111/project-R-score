# 📉 Performance Dashboard

Central hub for latency baselines and system optimizations.

## 🚀 E2E Simulation Pipeline Metrics

*Recorded on: Jan 12, 2026*

```text
[Generator] → [Bun.s3()] → [R2 Storage] → [Local Mirror] → [DuoPlus Sim] → [Screenshots]
   │              │            │               │               │              │
   └─ 5ms/ID      └─ 0.8ms     └─ 82%          └─ Async        └─ 10ms/task   └─ 2ms
   (CPU Latency)  (I/O Net)    (Zstd Savings)  (Non-blocking)  (Orchestration) (Canvas Simulation)
```

| Pipeline stage | Target Metric | Impact | Optimization method |
| :--- | :--- | :--- | :--- |
| **Data Generation** | 5ms / ID | CPU Idle | Parallel batching (size=100) |
| **R2 Upload (Native)** | 0.8ms | Link Speed | `Bun.s3()` Native implementation |
| **Data Compression** | 82% Savings | Storage Cost | Zstd Level 3 Pre-compression |
| **Local Mirroring** | Non-blocking | Real-time Dev | Fast Async `mirroredToLocal` |
| **Orchestration** | 10ms / task | Reliability | `batchPushToPhones` via SDK |
| **Visual Simulation** | 2ms | Speed | In-memory 1x1 PNG Buffering |

---

## 🛠️ Historic Optimizations

| Category | SubCat | ID/Pattern | Value/Title | Locations/Changes | Impact | Bun Fix/Script |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Perf** | File I/O | 144 | readFileSync | core/analysis/ | 40-50% | `Bun.file()` mega-fix |
| **Perf** | Algos | BUF_MB | 1e6 | unicode-similarity | 15-25% CPU | `Uint8Array(BUF_MB)` |

---
*Last Updated: January 12, 2026*
