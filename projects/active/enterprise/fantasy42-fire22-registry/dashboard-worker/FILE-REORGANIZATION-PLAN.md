# Fire22 Dashboard Worker - File Reorganization Plan

## Current Issues

1. **Inconsistent Naming**: Mix of kebab-case, CAPS, special characters
   (@packages.html)
2. **Poor Organization**: Root directory cluttered with documentation files
3. **Duplicate Concepts**: Multiple versions of similar files (index variations,
   dashboard versions)
4. **Release Management**: Release files scattered, not properly versioned
5. **No Clear Hierarchy**: Mixing operational code with docs, tests, and configs

## Proposed Structure

```text
dashboard-worker/
├── src/
│   ├── core/                    # Core functionality
│   │   ├── index.ts             # Main entry point
│   │   ├── router.ts            # Request routing
│   │   ├── config.ts            # Configuration
│   │   └── types.ts             # TypeScript definitions
│   │
│   ├── features/                # Feature modules
│   │   ├── dashboard/           # Dashboard UI
│   │   │   ├── index.html      # Main dashboard
│   │   │   ├── styles.css      # Dashboard styles
│   │   │   └── client.ts       # Client-side logic
│   │   │
│   │   ├── api/                 # API endpoints
│   │   │   ├── fire22/         # Fire22 integration
│   │   │   ├── manager/        # Manager endpoints
│   │   │   └── health/         # Health checks
│   │   │
│   │   ├── casino/              # Casino management
│   │   │   ├── live.ts         # Live casino
│   │   │   └── management.ts   # Casino operations
│   │   │
│   │   ├── sports/              # Sports betting
│   │   │   ├── betting.ts      # Betting logic
│   │   │   └── wagers.ts       # Wager management
│   │   │
│   │   └── telegram/            # Telegram integration
│   │       ├── bot.ts          # Bot logic
│   │       └── queue.ts        # Queue system
│   │
│   ├── ui/                      # UI Components
│   │   ├── terminal/            # Terminal UI system
│   │   │   ├── framework.css   # Core framework
│   │   │   ├── components.css  # Component styles
│   │   │   ├── components.js   # Interactive components
│   │   │   └── index.ts        # Terminal exports
│   │   │
│   │   └── themes/              # Theme variants
│   │       ├── dark.css        # Dark theme
│   │       └── light.css       # Light theme
│   │
│   ├── lib/                     # Shared libraries
│   │   ├── utils/              # Utility functions
│   │   ├── validation/         # Validation logic
│   │   └── formatting/         # Formatters
│   │
│   └── workers/                 # Worker-specific code
│       ├── durable/            # Durable Objects
│       │   ├── releases.ts     # Release management DO
│       │   ├── sessions.ts     # Session management DO
│       │   └── cache.ts        # Cache management DO
│       │
│       └── scheduled/          # Cron jobs
│           └── cleanup.ts      # Cleanup tasks
│
├── docs/                        # Documentation (clean names)
│   ├── api/                    # API documentation
│   │   ├── reference.md        # API reference
│   │   ├── endpoints.md        # Endpoint list
│   │   └── examples.md         # Usage examples
│   │
│   ├── guides/                  # User guides
│   │   ├── getting-started.md  # Getting started
│   │   ├── deployment.md       # Deployment guide
│   │   └── configuration.md    # Configuration guide
│   │
│   ├── terminal-ui/             # Terminal UI docs
│   │   ├── components.md       # Component library
│   │   ├── theming.md         # Theming guide
│   │   └── examples/          # Example implementations
│   │
│   └── architecture/           # Architecture docs
│       ├── overview.md         # System overview
│       ├── data-flow.md        # Data flow diagrams
│       └── decisions.md        # ADRs
│
├── tests/                       # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # End-to-end tests
│
├── scripts/                     # Build and utility scripts
│   ├── build.ts                # Build script
│   ├── deploy.ts               # Deployment script
│   └── migrate.ts              # Migration utilities
│
├── releases/                    # Release management
│   ├── current/                # Current version
│   │   └── v3.0.8/
│   │       ├── changelog.md    # Version changelog
│   │       ├── notes.md        # Release notes
│   │       └── manifest.json   # Version manifest
│   │
│   └── archive/                # Previous versions
│       └── v3.0.7/
│
├── config/                      # Configuration files
│   ├── wrangler.toml           # Cloudflare config
│   ├── tsconfig.json           # TypeScript config
│   └── .env.example            # Environment example
│
├── dist/                        # Build output (gitignored)
├── node_modules/                # Dependencies (gitignored)
└── package.json                 # Package definition
```

## File Renaming Rules

### 1. Source Files (src/)

```text
✅ Good:
- index.ts
- router.ts
- fire22-api.ts (kebab-case for multi-word)
- types.ts

❌ Bad:
- index-router-complete.ts
- dashboard-ultimate-v1.0.01
- CONSTANTS-DEFINITIONS.ts
```

### 2. Documentation (docs/)

```text
✅ Good:
- getting-started.md
- api-reference.md
- component-library.md

❌ Bad:
- @packages.html
- BUILD-INDEX.md
- DOCUMENTATION-HUB.html
```

### 3. HTML/CSS Files

```text
✅ Good:
- dashboard.html
- terminal-framework.css
- dark-theme.css

❌ Bad:
- build-automation-dashboard-enhanced.html
- terminal-ui-template.html (too generic)
```

## Migration Plan

### Phase 1: Create New Structure

```bash
# Create new directory structure
mkdir -p src/{core,features,ui,lib,workers}
mkdir -p src/features/{dashboard,api,casino,sports,telegram}
mkdir -p src/ui/{terminal,themes}
mkdir -p src/workers/{durable,scheduled}
mkdir -p docs/{api,guides,terminal-ui,architecture}
mkdir -p tests/{unit,integration,e2e}
mkdir -p scripts
mkdir -p releases/{current,archive}
mkdir -p config
```

### Phase 2: Move and Rename Files

```bash
# Core files
mv src/index.ts src/core/index.ts
mv src/router.ts src/core/router.ts
mv src/config.ts src/core/config.ts
mv src/types.ts src/core/types.ts

# Dashboard files
mv src/dashboard.html src/features/dashboard/index.html
mv docs/terminal-framework.css src/ui/terminal/framework.css
mv docs/terminal-components.css src/ui/terminal/components.css
mv docs/terminal-components.js src/ui/terminal/components.js

# API files
mv src/fire22-api.ts src/features/api/fire22/client.ts
mv src/fire22-config.ts src/features/api/fire22/config.ts

# Documentation cleanup
mv docs/@packages.html docs/api/packages.html
mv docs/BUILD-INDEX.md docs/guides/build-guide.md
mv docs/DOCUMENTATION-HUB.html docs/index.html

# Release files
mv releases/*.md releases/archive/
```

### Phase 3: Update Imports

```typescript
// Before
import { Fire22API } from '../fire22-api';
import '../dashboard.html';

// After
import { Fire22API } from '@/features/api/fire22/client';
import dashboardHTML from '@/features/dashboard/index.html';
```

### Phase 4: Implement Durable Objects for Releases

```typescript
// src/workers/durable/releases.ts
export class ReleaseManager {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/current':
        return this.getCurrentRelease();
      case '/history':
        return this.getReleaseHistory();
      case '/publish':
        return this.publishRelease(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async getCurrentRelease() {
    const current = await this.state.storage.get('current-release');
    return Response.json(current || { version: '3.0.8' });
  }

  async getReleaseHistory() {
    const history = await this.state.storage.list({ prefix: 'release-' });
    return Response.json(Array.from(history.entries()));
  }

  async publishRelease(request: Request) {
    const release = await request.json();
    const version = release.version;

    // Store release data
    await this.state.storage.put(`release-${version}`, release);
    await this.state.storage.put('current-release', release);

    // Broadcast to connected clients
    this.broadcast({ type: 'new-release', version });

    return Response.json({ success: true, version });
  }

  broadcast(message: any) {
    // WebSocket broadcast logic
  }
}
```

## Benefits of Reorganization

### 1. **Clear Separation of Concerns**

- Core logic separate from features
- UI components isolated
- Documentation properly organized

### 2. **Better Developer Experience**

- Intuitive file locations
- Consistent naming
- Easy navigation

### 3. **Improved Build Process**

- Clear source/dist separation
- Easier tree-shaking
- Better code splitting

### 4. **Version Management**

- Durable Objects for release tracking
- Proper version history
- Automated changelog generation

### 5. **Scalability**

- Modular structure for growth
- Feature-based organization
- Clear extension points

## Implementation Script

```bash
#!/bin/bash
# reorganize.sh - File reorganization script

echo "🔥 Fire22 Dashboard Worker Reorganization"
echo "========================================="

# Backup current structure
echo "📦 Creating backup..."
cp -r . ../dashboard-worker-backup-$(date +%Y%m%d)

# Create new structure
echo "🏗️ Creating new directory structure..."
mkdir -p src/{core,features,ui,lib,workers}
mkdir -p src/features/{dashboard,api,casino,sports,telegram}
mkdir -p src/ui/{terminal,themes}
mkdir -p src/workers/{durable,scheduled}
mkdir -p docs/{api,guides,terminal-ui,architecture}
mkdir -p tests/{unit,integration,e2e}
mkdir -p scripts
mkdir -p releases/{current,archive}
mkdir -p config

# Move files with proper naming
echo "📁 Reorganizing files..."

# Core files
[[ -f src/index.ts ]] && mv src/index.ts src/core/index.ts
[[ -f src/router.ts ]] && mv src/router.ts src/core/router.ts
[[ -f src/config.ts ]] && mv src/config.ts src/core/config.ts
[[ -f src/types.ts ]] && mv src/types.ts src/core/types.ts

# Dashboard files
[[ -f src/dashboard.html ]] && mv src/dashboard.html src/features/dashboard/index.html

# Terminal UI files
[[ -f docs/terminal-framework.css ]] && mv docs/terminal-framework.css src/ui/terminal/framework.css
[[ -f docs/terminal-components.css ]] && mv docs/terminal-components.css src/ui/terminal/components.css
[[ -f docs/terminal-components.js ]] && mv docs/terminal-components.js src/ui/terminal/components.js

# Clean up documentation names
for file in docs/*.md docs/*.html; do
  if [[ -f "$file" ]]; then
    # Convert CAPS to lowercase with dashes
    newname=$(basename "$file" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g')
    # Remove @ symbols
    newname=${newname//@/}
    # Move to appropriate subdirectory
    if [[ $newname == *"api"* ]]; then
      mv "$file" "docs/api/$newname"
    elif [[ $newname == *"guide"* ]] || [[ $newname == *"getting"* ]]; then
      mv "$file" "docs/guides/$newname"
    elif [[ $newname == *"terminal"* ]]; then
      mv "$file" "docs/terminal-ui/$newname"
    else
      mv "$file" "docs/architecture/$newname"
    fi
  fi
done

# Update imports
echo "🔄 Updating imports..."
find src -type f -name "*.ts" -o -name "*.js" | while read file; do
  # Update import paths
  sed -i '' "s|'../fire22-api'|'@/features/api/fire22/client'|g" "$file"
  sed -i '' "s|'../dashboard.html'|'@/features/dashboard/index.html'|g" "$file"
  sed -i '' "s|'./terminal-components'|'@/ui/terminal/components'|g" "$file"
done

# Create index files
echo "📝 Creating index files..."
cat > src/features/index.ts << 'EOF'
export * from './dashboard';
export * from './api';
export * from './casino';
export * from './sports';
export * from './telegram';
EOF

cat > src/ui/index.ts << 'EOF'
export * from './terminal';
export * from './themes';
EOF

echo "✅ Reorganization complete!"
echo ""
echo "Next steps:"
echo "1. Review the new structure in src/"
echo "2. Update wrangler.toml paths"
echo "3. Run tests to ensure everything works"
echo "4. Commit the changes"
```

## Next Steps

1. **Review and approve the reorganization plan**
2. **Run the migration script**
3. **Update build configurations**
4. **Test all functionality**
5. **Update documentation references**
6. **Implement Durable Objects for release management**

This reorganization will make the codebase much cleaner, more maintainable, and
easier to navigate. The consistent naming and logical structure will
significantly improve developer experience.

Would you like me to proceed with implementing this reorganization?
