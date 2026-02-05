# 🌌 Nebula-Flow™ Source Code

## Directory Structure

```
src/
├── main.ts                    # Application entry point
│
├── atlas/                     # Device Atlas System
│   ├── agent.ts              # Atlas agent (runs in VMs)
│   └── schema.ts             # Database schema & types
│
├── compliance/                # Compliance & KYC
│   └── kycValidator.ts      # KYC validation logic
│
├── database/                  # Database Layer
│   └── db.js                 # SQLite database connection
│
├── ecosystem/                 # Ecosystem Services
│   └── connection-system.js  # Connection pool management
│
├── finance/                   # Financial Services
│   ├── savingsOptimizer.ts  # Savings optimization
│   └── yieldQuest.ts        # Yield quest system
│
├── nebula/                    # Nebula-Flow Core
│   ├── cometCollect.ts      # Comet-Collect™ system
│   ├── core.ts              # Core Nebula functionality
│   ├── coverStardust.ts     # Cover-Stardust™ system
│   └── orbitAssign.ts       # Orbit-Assign™ system
│
├── routes/                    # API Routes
│   └── paymentRoutes.ts     # Payment handling routes
│
├── services/                  # Business Logic Services
│   ├── lightningService.ts  # Lightning Network service
│   └── lndMockClient.ts     # LND mock client
│
└── utils/                     # Utility Functions
    ├── operationalLogger.ts  # Operational metrics logging
    ├── qr.js                # QR code generation
    └── version.ts           # Unified version management
```

## Module Organization

### Core Modules

- **`main.ts`** - Application entry point, HTTP server setup
- **`nebula/core.ts`** - Core Nebula-Flow™ functionality
- **`services/lightningService.ts`** - Lightning Network integration

### Domain Modules

- **`atlas/`** - Device lifecycle management
- **`nebula/`** - Nebula-Flow™ subsystems (Comet-Collect, Orbit-Assign, Cover-Stardust)
- **`finance/`** - Financial services (savings, yield)
- **`compliance/`** - KYC and compliance validation

### Infrastructure

- **`database/`** - Database connection and queries
- **`routes/`** - HTTP API route handlers
- **`services/`** - Business logic services
- **`utils/`** - Shared utility functions
- **`ecosystem/`** - Connection and resource management

## Import Patterns

### Internal Imports
```typescript
// From same directory
import { AtlasSchema } from './schema.js';

// From parent directory
import { LightningService } from '../services/lightningService.js';

// From utils
import { NEBULA_VERSION } from '../utils/version.js';
```

### External Imports
```typescript
// NPM packages
import chalk from 'chalk';
import { ethers } from 'ethers';
```

## Best Practices

1. **Domain Separation** - Each directory represents a domain/feature
2. **Single Responsibility** - Each file has one clear purpose
3. **Unified Versioning** - Use `utils/version.ts` for all version info
4. **Type Safety** - Prefer TypeScript (.ts) over JavaScript (.js)
5. **Consistent Naming** - Use camelCase for files, PascalCase for classes
6. **Clear Exports** - Export only what's needed

## File Naming Conventions

- **Services**: `*Service.ts` (e.g., `lightningService.ts`)
- **Routes**: `*Routes.ts` (e.g., `paymentRoutes.ts`)
- **Schemas**: `schema.ts` or `*Schema.ts`
- **Utils**: Descriptive names (e.g., `operationalLogger.ts`)
- **Core**: `core.ts` or domain-specific names

## Adding New Modules

1. **Choose the right directory** - Match domain/feature
2. **Create the file** - Use appropriate naming convention
3. **Export public API** - Export only what's needed
4. **Add to main.ts** - If it's a route or service
5. **Update documentation** - Add to this README if needed

## Dependencies

- **Internal**: Import from other `src/` modules
- **External**: Use NPM packages (see `package.json`)
- **No circular dependencies**: Keep imports acyclic

## Testing

- Unit tests: `tests/` directory
- Integration tests: `tests/*.integration.test.ts`
- Test utilities: Can be added to `src/utils/` if shared
