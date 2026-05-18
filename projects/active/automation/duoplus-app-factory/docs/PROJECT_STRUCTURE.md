# 🌌 Nebula-Flow™ Project Structure

## Directory Organization

```text
d-network/
├── src/                          # Source code
│   ├── main.ts                   # Main application entry point
│   ├── atlas/                    # Device Atlas system
│   │   ├── agent.ts             # Atlas agent for VM automation
│   │   └── schema.ts            # Database schema and types
│   ├── compliance/              # Compliance & KYC
│   │   └── kycValidator.ts     # KYC validation logic
│   ├── database/                # Database layer
│   │   └── db.js                # SQLite database connection
│   ├── ecosystem/               # Ecosystem services
│   │   └── connection-system.js # Connection pool management
│   ├── finance/                 # Financial services
│   │   ├── savingsOptimizer.ts # Savings optimization
│   │   └── yieldQuest.ts       # Yield quest system
│   ├── nebula/                  # Nebula-Flow core
│   │   ├── cometCollect.ts     # Comet-Collect™ system
│   │   ├── core.ts             # Core Nebula functionality
│   │   ├── coverStardust.ts    # Cover-Stardust™ system
│   │   └── orbitAssign.ts      # Orbit-Assign™ system
│   ├── routes/                  # API routes
│   │   └── paymentRoutes.ts    # Payment handling routes
│   ├── services/                # Business logic services
│   │   ├── lightningService.ts  # Lightning Network service
│   │   └── lndMockClient.ts    # LND mock client
│   └── utils/                   # Utility functions
│       ├── operationalLogger.ts # Operational metrics logging
│       ├── qr.js               # QR code generation
│       └── version.ts          # Unified version management
│
├── cli/                         # Command-line tools
│   ├── atlas-restore.ts        # Atlas restore utility
│   ├── lightning-dashboard.ts  # Lightning dashboard CLI
│   ├── live-metrics.ts         # Live metrics display
│   └── log-metrics.ts          # Metrics logging tool
│
├── tools/                       # Analysis & utility tools
│   ├── analyze-dashboard-export.ts  # Dashboard export analyzer
│   ├── enhanced-dashboard-schema.ts  # Enhanced schema processor
│   ├── system-health-analysis.ts     # System health analyzer
│   └── view-export.ts                # Export viewer launcher
│
├── demos/                       # Demo scripts
│   ├── demo-atlas.ts           # Atlas demo
│   ├── demo-device-commander.ts # Device commander demo
│   ├── demo-filtering.ts      # Filtering demo
│   └── demo-web-app.ts        # Web app demo
│
├── tests/                       # Test files
│   ├── lightning.integration.test.ts # Lightning integration tests
│   └── test-duoplus.ts         # DuoPlus tests
│
├── web-app/                     # Web application
│   ├── app.js                  # Main application logic
│   ├── server.js               # Bun web server
│   ├── index.html              # Main HTML file
│   ├── styles.css              # Stylesheet
│   └── version.js              # Browser-compatible version
│
├── scripts/                     # Build & deployment scripts
│   ├── build.ts                # Main build script
│   ├── sync-version.ts         # Version synchronization
│   ├── setup/                  # Environment setup
│   │   └── setup-lnd.sh       # LND setup script
│   ├── deployment/             # Multi-phase deployment
│   │   ├── phase-01.sh through phase-12.sh
│   │   └── (12 phases of deployment automation)
│   └── docs/                   # Documentation
│       ├── ENVIRONMENT_TEMPLATE.md
│       ├── INSTALLATION_GUIDE.md
│       └── QUICK_START.txt
│
├── exports/                     # Generated exports
│   ├── data/                   # Export data files
│   │   ├── *.json             # JSON exports
│   │   ├── *.csv              # CSV exports
│   │   └── *.html             # HTML reports
│   └── reports/               # Analysis reports
│
├── data/                        # Application data
│   └── duoplus.db             # SQLite database
│
├── logs/                        # Application logs
│
├── entry/                       # Entry point documentation
│   └── readme.md
│
├── docs/                        # Documentation
│   ├── README.md               # Getting started guide
│   ├── PROJECT_STRUCTURE.md    # This file
│   └── VERSIONING.md           # Versioning guide
│
├── package.json                 # NPM package configuration
├── bun.lock                     # Bun lockfile
└── README.md                    # Main project documentation
```

## File Categories

### Source Code (`src/`)
- **Core application logic** - Main entry point and business logic
- **Organized by domain** - Each directory represents a domain/feature
- **TypeScript/JavaScript** - Mix of TS and JS files
- **Unified versioning** - All files use `src/utils/version.ts`

### CLI Tools (`cli/`)
- **Command-line interfaces** - Tools for terminal usage
- **Dashboard tools** - Lightning dashboard, metrics, logging
- **Restore utilities** - Atlas restore functionality

### Analysis Tools (`tools/`)
- **Export analyzers** - Dashboard export analysis
- **Health analyzers** - System health analysis
- **Viewers** - Export data viewers
- **Schema processors** - Enhanced data schema handling

### Demos (`demos/`)
- **Demonstration scripts** - Showcase features
- **Standalone examples** - Can run independently
- **Educational** - Help understand system capabilities

### Web Application (`web-app/`)
- **Frontend** - HTML, CSS, JavaScript
- **Backend** - Bun server with WebSocket support
- **Real-time features** - Live updates and streaming

### Scripts (`scripts/`)
- **Build scripts** - Deployment and build automation
- **Setup scripts** - Environment setup
- **Phase scripts** - Multi-phase deployment
- **Documentation** - Setup guides and templates

### Exports (`exports/`)
- **Generated data** - All exports go here
- **Organized by type** - Data and reports separated
- **Temporary** - Can be regenerated, safe to delete

## Import Paths

### From Root
```typescript
import { NEBULA_VERSION } from './src/utils/version.js';
import { LightningService } from './src/services/lightningService.js';
```

### From Tools
```typescript
import { VERSION_INFO } from '../src/utils/version.js';
```

### From Demos
```typescript
import { AtlasSchema } from '../src/atlas/schema.js';
```

### From CLI
```typescript
import { getDb } from '../src/database/db.js';
```

## NPM Scripts

All scripts updated to reflect new structure:

```bash
# Core
bun run start              # Start main server
bun run build              # Build project
bun run test               # Run tests
bun run sync-version       # Sync versions

# CLI Tools
bun run dashboard          # Lightning dashboard
bun run bench:watch        # Live metrics
bun run log-metrics        # Log metrics
bun run atlas-restore      # Restore atlas

# Web App
bun run web-app            # Start web app
bun run open-web           # Open in browser

# Tools
bun run analyze-export     # Analyze dashboard export
bun run view-export        # View export in browser

# Demos
bun run demo-filtering     # Filtering demo
bun run demo-atlas         # Atlas demo
bun run demo-device-commander  # Device commander demo
bun run demo-web-app       # Web app demo
```

## Best Practices

1. **Keep `src/` clean** - Only source code, no scripts or tools
2. **Organize by domain** - Group related functionality
3. **Use unified versioning** - Import from `src/utils/version.ts`
4. **Export to `exports/`** - All generated files go here
5. **Document imports** - Use relative paths from project root
6. **Separate concerns** - CLI, tools, demos, web-app are separate

## Migration Notes

- ✅ All demo files moved to `demos/`
- ✅ All analysis tools moved to `tools/`
- ✅ All exports moved to `exports/data/`
- ✅ CLI tools remain in `cli/`
- ✅ Source code remains in `src/`
- ✅ Package.json scripts updated
- ✅ Import paths updated

## Next Steps

1. Update any remaining hardcoded paths
2. Add `.gitignore` entries for `exports/` if needed
3. Update documentation references
4. Test all scripts and imports
