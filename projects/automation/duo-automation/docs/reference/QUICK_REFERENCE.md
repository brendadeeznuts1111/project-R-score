# 📖 Quick Command Reference

Essential CLI commands for the Windsurf Automation project.

## 🛠️ Unified CLI (`bun cli`)

The main entry point for all operations.

| Task | Command |
| :--- | :--- |
| **Global Help** | `bun cli --help` |
| **Storage Help** | `bun cli storage --help` |
| **Query Help** | `bun cli query --help` |
| **Benchmark Help** | `bun cli bench --help` |

---

## 📡 R2 Query Engine

Real-time searching and filtering of Cloudflare R2 objects.

| Use Case | Command Example |
| :--- | :--- |
| **Basic Search** | `bun cli query --limit 10` |
| **Content Filter** | `bun cli query success=true country=US` |
| **Date Range** | `bun cli query --since 2026-01-01 --until yesterday` |
| **Size Filter** | `bun cli query --min-size 100 --max-size 5000` |
| **Export Result** | `bun cli query --format csv --limit 500` |

---

## 📈 Performance & Benchmarks

| Test Type | Command Example |
| :--- | :--- |
| **R2 Uploads** | `bun cli bench r2` |
| **E2E Pipeline** | `bun run scripts/e2e-simulation-pipeline.ts 5000` |
| **URL Matching** | `bun cli bench urlpattern` |
| **String Width** | `bun cli bench string-width` |

---

## 🔥 Production Operations

For rapid validation and mass cleanup, see the **[Production Ops Kit](R2_OPS_KIT.md)**.

Example health check:

```bash
bun -e "const m=new (await import('./src/storage/r2-apple-manager')).BunR2AppleManager(); await m.initialize(); console.log('✅', JSON.stringify(await m.getMetrics()))"
```

---

## 📁 Key data Locations

- **Remote storage**: `accounts/apple-id/` (Root directory in R2)
- **Local Mirror**: `./data/accounts/apple-id/` (Auto-decoding enabled)
- **Local Reports**: `./reports/` (Local analysis results)

---
*Tip: Most commands support the `--help` flag for detailed option descriptions.*
