# Fire22 Dashboard Worker - File Reorganization Plan

## Current Structure Issues

- 100+ files in root directory
- SQL scripts scattered throughout
- Documentation files mixed with code
- No clear data population workflow
- Build scripts and configs mixed together

## Proposed New Structure

```text
dashboard-worker/
├── README.md                    # Main project README
├── CHANGELOG.md                 # Keep in root
├── package.json                 # Keep in root
├── tsconfig.json               # Keep in root
├── wrangler.toml               # Keep in root
├── bunfig.toml                 # Keep in root
├── lefthook.yml                # Keep in root
├── LICENSE                     # Keep in root
│
├── src/                        # Source code (already organized)
│   ├── index.ts
│   ├── worker.ts
│   └── ...
│
├── data/                       # NEW: Database and data files
│   ├── schemas/
│   │   ├── fire22-complete-schema.sql
│   │   ├── enhanced-schema.sql
│   │   └── d1-schema.sql
│   ├── population/
│   │   ├── generate-players-data.sql
│   │   ├── fix-player-data.sql
│   │   ├── generate-transactions-bets.sql
│   │   ├── fix-transactions.sql
│   │   ├── fix-bets.sql
│   │   └── bulk-import-customers.sql
│   ├── migration/
│   │   ├── import-real-fire22-customers.sql
│   │   ├── update-schema-fire22.sql
│   │   └── safe-schema-update.sql
│   └── workflows/
│       ├── populate-database.sh
│       ├── sync-production.sh
│       └── verify-data.sh
│
├── docs/                       # Documentation (keep existing structure)
│   ├── api/
│   │   ├── ENDPOINT-MATRIX.md
│   │   ├── FIRE22-INTEGRATION-GUIDE.md
│   │   └── API-SECURITY-GUIDE.md
│   ├── deployment/
│   │   ├── CLOUDFLARE-INTEGRATION-COMPLETE.md
│   │   ├── ENVIRONMENT-SETUP.md
│   │   └── deployment guides...
│   ├── development/
│   │   ├── DEVELOPER-CHEAT-SHEET.md
│   │   ├── TESTING-GUIDE.md
│   │   └── development guides...
│   └── business/
│       ├── FIRE22-CONSOLIDATION-REPORT.md
│       ├── BUSINESS-MANAGEMENT-ENHANCEMENT.md
│       └── business docs...
│
├── scripts/                    # Build and utility scripts (already organized)
│   ├── database/
│   │   ├── setup-database.js
│   │   ├── populate-production.ts
│   │   └── verify-data.ts
│   ├── build/
│   ├── deployment/
│   └── ...
│
├── workspaces/                 # Workspace packages (keep current)
├── test/                       # Test files (keep current)
├── assets/                     # Static assets (keep current)
├── dist/                       # Build output (keep current)
├── releases/                   # Release notes (keep current)
└── temp/                       # NEW: Temporary/archive files
    ├── archived-docs/          # Move old docs here
    ├── legacy-schemas/         # Old schema files
    └── backup/                 # Backup files
```

## Migration Plan

### Phase 1: Create New Directory Structure

1. Create `data/` directory with subdirectories
2. Create `temp/` directory for archives
3. Reorganize `docs/` by category

### Phase 2: Move Files

1. Move SQL files to appropriate `data/` subdirectories
2. Move documentation files to categorized `docs/` subdirectories
3. Archive old/unused files to `temp/`

### Phase 3: Create Workflow Scripts

1. Database population workflow
2. Production sync scripts
3. Data verification tools

### Phase 4: Update References

1. Update import paths in code
2. Update documentation links
3. Update build scripts

## Benefits

- **Clear separation of concerns**
- **Easier database management workflow**
- **Simplified root directory**
- **Better documentation organization**
- **Cleaner development experience**
- **Easier onboarding for new developers**

## Files to Move

### SQL Files → `data/`

- generate-players-data.sql → data/population/
- fix-player-data.sql → data/population/
- fix-transactions.sql → data/population/
- fix-bets.sql → data/population/
- fire22-complete-schema.sql → data/schemas/
- enhanced-schema.sql → data/schemas/
- d1-schema.sql → data/schemas/
- bulk-import-customers.sql → data/population/
- import-real-fire22-customers.sql → data/migration/
- update-schema-fire22.sql → data/migration/

### Documentation → `docs/categories/`

- API-related docs → docs/api/
- Deployment docs → docs/deployment/
- Development docs → docs/development/
- Business docs → docs/business/

### Archive to `temp/`

- Multiple duplicate documentation files
- Old schema versions
- Temporary test files
