# 🏗️ Nebula-Flow™ Root Organization Plan

## Current State Analysis
The project has some organization (docs/, scripts/, src/, etc.) but the root directory still contains many files that should be relocated for better structure.

## Root Files to Organize

### Documentation Files (Move to docs/)
- [ ] 50-COL-MATRIX-GUIDE.md → docs/
- [ ] ARCHITECTURE.md → docs/
- [ ] BUN_CONTENT_TYPE_GUIDE.md → docs/
- [ ] BUN_DNS_CACHE_GUIDE.md → docs/
- [ ] BUN_SERVER_DEMO.md → docs/
- [ ] CONTENT_MANAGER_USAGE.md → docs/
- [ ] CONTRIBUTING.md → docs/
- [ ] ENHANCED_MATRIX_CHANGES.md → docs/
- [ ] ENHANCED_MATRIX_SUMMARY.md → docs/
- [ ] HOSTNAME_SETUP.md → docs/
- [ ] NEBULA_DEPLOYMENT_SUMMARY.md → docs/
- [ ] NEBULA_DNS_INTEGRATION.md → docs/
- [ ] NEBULA_FLOW_HARDENING.md → docs/
- [ ] NEBULA_QUICK_START.md → docs/
- [ ] NEBULA_README.md → docs/
- [ ] SERVER_CONTROL_GUIDE.md → docs/
- [ ] SOLUTION_SUMMARY.md → docs/

### Demo/Example Files (Move to demos/)
- [ ] 50-col-matrix.ts → demos/
- [ ] abstract-hot-reload.ts → demos/
- [ ] bun-content-type-demo.ts → demos/
- [ ] bun-dns-demo-app.ts → demos/
- [ ] bun-dns-live-stats.ts → demos/
- [ ] bun-server-showcase.ts → demos/
- [ ] nebula-dns-live.ts → demos/
- [ ] server-control-demo.ts → demos/

### CLI Tools (Move to cli/)
- [ ] content-manager.ts → cli/
- [ ] dev-tools.ts → cli/

### AI/ML Files (Move to ai/)
- [ ] anomaly-predict.ts → ai/
- [ ] train-anomaly → ai/ (directory)

### Data/State Files (Move to data/)
- [ ] logger → data/ (directory)
- [ ] signalStore → data/ (directory)
- [ ] my-socket.sock → data/ (or remove if temporary)
- [ ] .env → keep at root (configuration)
- [ ] .env.example → keep at root (template)

### Configuration Files (Keep at root)
- [ ] .gitignore → keep
- [ ] .cspell.json → keep
- [ ] package.json → keep
- [ ] bun.lock → keep
- [ ] CODEOWNERS → keep

### Organization Files (Keep at root for reference)
- [ ] ORGANIZATION.md → keep
- [ ] ORGANIZATION_COMPLETE.md → keep
- [ ] ORGANIZATION_SUMMARY.txt → keep
- [ ] README.md → keep (main entry point)

### Scripts (Move to scripts/)
- [ ] ai-build.ts → scripts/
- [ ] nebula-harden.ts → scripts/
- [ ] train-anomaly.ts → scripts/
- [ ] validate-model.ts → scripts/
- [ ] verify-nebula.ts → scripts/

### Tools (Move to tools/)
- [ ] analyze-dashboard-export.ts → tools/
- [ ] enhanced-dashboard-schema.ts → tools/
- [ ] system-health-analysis.ts → tools/
- [ ] view-export.ts → tools/

### Web App (Move to web-app/)
- [ ] web-app/ already exists, but check if any root files belong there

### Entry/Exports (Keep as is)
- [ ] entry/ → keep
- [ ] exports/ → keep

### Tests (Keep as is)
- [ ] tests/ → keep

### Models (Keep as is)
- [ ] models/ → keep

### Dist (Keep as is)
- [ ] dist/ → keep

### Node Modules (Keep as is)
- [ ] node_modules/ → keep

### Git (Keep as is)
- [ ] .git/ → keep

## New Root Structure After Organization

```text
d-network/
├── README.md                   # Main entry point
├── ORGANIZATION.md             # Organization reference
├── ORGANIZATION_COMPLETE.md    # Completion summary
├── ORGANIZATION_SUMMARY.txt    # Quick reference
├── ORGANIZATION_PLAN.md        # This file
├── package.json                # NPM configuration
├── bun.lock                    # Bun lockfile
├── .gitignore                  # Git ignore rules
├── .cspell.json                # Spell check config
├── CODEOWNERS                  # Code ownership
├── .env                        # Environment config (keep at root)
├── .env.example                # Environment template
│
├── src/                        # Source code (unchanged)
├── cli/                        # Command-line tools (enhanced)
├── demos/                      # Demo scripts (enhanced)
├── tools/                      # Analysis tools (enhanced)
├── tests/                      # Test suite (unchanged)
├── web-app/                    # Web dashboard (unchanged)
├── scripts/                    # Build & deployment (enhanced)
├── docs/                       # Documentation (enhanced)
├── data/                       # Runtime data (enhanced)
├── logs/                       # Application logs (unchanged)
├── exports/                    # Generated exports (unchanged)
├── archives/                   # Archived files (unchanged)
├── entry/                      # Entry documentation (unchanged)
├── ai/                         # AI/ML files (enhanced)
├── models/                     # ML models (unchanged)
└── dist/                       # Build output (unchanged)
```

## Implementation Steps

1. **Create comprehensive todo list**
2. **Move documentation files to docs/**
3. **Move demo files to demos/**
4. **Move CLI tools to cli/**
5. **Move AI files to ai/**
6. **Move data/state files to data/**
7. **Move scripts to scripts/**
8. **Move tools to tools/**
9. **Update package.json if needed**
10. **Verify all references**
11. **Create final summary**

## Success Criteria

✅ Root directory reduced to ~15 essential files
✅ All files organized by function
✅ Clear directory purposes
✅ Updated documentation
✅ All references working
✅ No broken imports

## Timeline

Estimated time: 15-20 minutes
Status: Planning phase complete, ready for execution