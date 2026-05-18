# 🚀 Quick Start Guide - Windsurf Automation

## 📋 Prerequisites

- **Bun Runtime** (Required for high-performance R2 operations)
- **Cloudflare Account** (For R2 storage)
- **Git**

## ⚡ 2-Minute Setup

### 1. Clone & Install

```bash
git clone git@github.com:brendadeeznuts1111/duo-automation.git
cd duo-automation
bun install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Cloudflare R2 credentials.

### 3. Initialize Storage

```bash
# Verify R2 connection and setup storage structure
bun run scripts/setup-r2-apple.ts
```

## 🛠️ Main CLI Control

We now use a unified CLI for all major operations.

```bash
# Get help on all commands
bun cli --help

# Run R2 Queries (Now with auto-decoding and local data mirroring)
bun cli query --limit 100 success=true country=US

# Run Performance Benchmarks
bun cli bench r2
bun cli bench urlpattern
```

## 🎯 Important Workflows

### Data Synchronization (R2 ➔ Local)

The system now automatically mirrors R2 data to your local machine for a smoother development experience.

- **Cloud Path**: `accounts/apple-id/`
- **Local Path**: `./data/accounts/apple-id/`
- **Feature**: Mirrored files are auto-decompressed (Zstd ➔ JSON) for immediate readability.

### Benchmarking System

```bash
# Test R2 upload speed with parallel streams
bun cli bench r2

# Test URLPattern classification throughput
bun cli bench urlpattern
```

## 📁 Project structure

- **`cli/`**: Unified command-line tool definitions.
- **`data/`**: **Local mirror of R2 storage** (Auto-populated).
- **`src/storage/`**: Core R2 and Apple ID management logic.
- **`docs/`**: Comprehensive guides, architecture, and archives.

## 🆘 Troubleshooting

### 403 Forbidden (R2)

Ensure your `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` in `.env` are correct and have `Read/Write` permissions on the bucket.

### Build Errors

Run `bun upgrade` to ensure you are on the latest runtime version (1.3.5+ recommended).

---

## 🚀 Next Steps

- Visit the **[Command Reference](../reference/QUICK_REFERENCE.md)** for a full list of CLI tools.
- Read the **[System Overview](../architecture/SYSTEM_OVERVIEW.md)** for architectural deep dives.
