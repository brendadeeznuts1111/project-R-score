# Root Directory Reorganization Plan

**Date**: January 19, 2026  
**Status**: Planning Phase

---

## 📊 Current State Analysis

### Root Files (Too Many!)
- 22 markdown documentation files
- 6 shell scripts
- 4 configuration files
- Multiple loose JavaScript files

### Issues
- ❌ Cluttered root directory
- ❌ Hard to find main entry points
- ❌ Documentation scattered
- ❌ Configuration files mixed with code
- ❌ Build artifacts in root

---

## 🎯 Proposed Structure

```
quantum-terminal-dashboard/
├── README.md                          # Main entry point
├── package.json
├── tsconfig.json
├── wrangler.toml
├── bun.lock
├── bun.yaml
│
├── .github/                           # GitHub workflows
│   └── workflows/
│
├── .config/                           # Configuration files
│   ├── bun.yaml
│   ├── quantum-config.yaml
│   └── config.yaml
│
├── src/                               # Source code
│   ├── quantum-app.ts
│   ├── headscale-server.ts
│   ├── headscale-cli.ts
│   ├── quantum-1-5-x-patch.ts
│   ├── s3-inline-patch.ts
│   ├── api/
│   ├── servers/
│   ├── components/
│   ├── utils/
│   └── ...
│
├── workers/                           # Cloudflare Workers
│   ├── headscale-proxy.ts
│   └── headscale-observability.ts
│
├── headscale/                         # Headscale config
│   ├── config.yaml
│   └── policy.yaml
│
├── scripts/                           # Executable scripts
│   ├── opr
│   ├── deploy.sh
│   ├── build-simd.sh
│   └── ...
│
├── test/                              # Tests
│   ├── headscale-integration.test.ts
│   ├── quantum-1-5-x-patch.test.ts
│   └── ...
│
├── docs/                              # Documentation
│   ├── README.md
│   ├── HEADSCALE-BUN-NATIVE.md
│   ├── QUANTUM-1-5-1-RELEASE-NOTES.md
│   ├── api/
│   └── guides/
│
├── examples/                          # Example code
│   ├── README.md
│   ├── api-usage-examples.js
│   └── ...
│
├── builds/                            # Build outputs
│   ├── stable/
│   ├── canary/
│   └── ...
│
├── dist/                              # Distribution
│   ├── quantum-app.js
│   └── ...
│
├── reports/                           # Performance reports
│   └── README.md
│
├── benchmarks/                        # Benchmark data
│   └── README.md
│
└── node_modules/                      # Dependencies
```

---

## 📋 Migration Steps

### Phase 1: Create New Directories
- [ ] Create `.config/` directory
- [ ] Create `.github/workflows/` directory
- [ ] Verify existing directories

### Phase 2: Move Configuration Files
- [ ] Move `bun.yaml` → `.config/bun.yaml`
- [ ] Move `configs/*.yaml` → `.config/`
- [ ] Update references in package.json

### Phase 3: Consolidate Documentation
- [ ] Move root `*.md` files → `docs/`
- [ ] Create `docs/INDEX.md` for navigation
- [ ] Update README.md

### Phase 4: Clean Root
- [ ] Remove moved files
- [ ] Verify all references updated
- [ ] Test build process

---

## 🔄 Files to Move

### To `.config/`
- `bun.yaml`
- `configs/config.yaml`
- `configs/quantum-config.yaml`
- `configs/config-fixed.yaml`

### To `docs/`
- All root `*.md` files (22 files)
- Create `docs/INDEX.md` for navigation

### To `scripts/` (Already there)
- Verify all scripts are in place

---

## ✅ Benefits

✅ **Cleaner Root** – Only essential files  
✅ **Better Organization** – Clear directory structure  
✅ **Easier Navigation** – Find files quickly  
✅ **Professional Layout** – Industry standard  
✅ **Scalability** – Room to grow  

---

## 🚀 Next Steps

1. Review this plan
2. Approve structure
3. Execute migration
4. Test all references
5. Update documentation

