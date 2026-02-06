# Scripts Directory Index

Organized scripts for building, deploying, and managing the Nebula-Flow™ project.

## Directory Structure

```text
scripts/
├── build.ts                    # Main build script
├── sync-version.ts             # Version synchronization utility
├── INDEX.md                    # This file
│
├── setup/                      # Environment setup scripts
│   └── setup-lnd.sh           # LND node setup and configuration
│
├── build/                      # Build automation scripts
│   └── factory.sh             # App factory build pipeline
│
├── deployment/                 # Multi-phase deployment scripts
│   ├── phase-01.sh through phase-12.sh
│   └── (12 phases of deployment automation)
│
└── docs/                       # Documentation and guides
    ├── ENVIRONMENT_TEMPLATE.md # Environment variables template
    ├── INSTALLATION_GUIDE.md   # Installation instructions
    ├── QUICK_START.txt         # Quick start guide
    └── COMPLETION_SUMMARY.txt  # Deployment completion summary
```

## Quick Commands

### Build
```bash
bun run scripts/build.ts
```

### Setup LND
```bash
bash scripts/setup/setup-lnd.sh
```

### Run Deployment Phases
```bash
bash scripts/deployment/phase-01.sh
bash scripts/deployment/phase-02.sh
# ... continue through phase-12.sh
```

### Sync Version
```bash
bun run scripts/sync-version.ts
```

## Script Categories

### Build Scripts (`build/`)
- `factory.sh` - Complete app factory automation pipeline

### Setup Scripts (`setup/`)
- `setup-lnd.sh` - Lightning Network Daemon configuration

### Deployment Scripts (`deployment/`)
- `phase-01.sh` through `phase-12.sh` - Multi-phase deployment automation

### Utilities
- `build.ts` - TypeScript build orchestration
- `sync-version.ts` - Version management across codebase

## Documentation

See `docs/` directory for:
- Environment setup guides
- Installation instructions
- Quick start guide
- Deployment completion checklist

