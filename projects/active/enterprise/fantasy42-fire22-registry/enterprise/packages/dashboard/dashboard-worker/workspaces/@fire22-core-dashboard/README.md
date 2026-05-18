# @fire22/core-dashboard

Main dashboard functionality and UI

## Workspace Isolation with Bun

This workspace uses **Bun's isolated installs** for strict dependency isolation.
Each workspace gets complete isolation while maintaining efficient development
linking.

### 🔗 Linked Mode (Development)

- Uses `workspace:*` dependencies
- Bun isolated installs prevent phantom dependencies
- Hot reloading and fast development
- Cross-workspace dependency resolution
- Run: `bun run dev`
- Deploy: `bun run deploy:linked`

### 📦 Standalone Mode (Production)

- Resolved dependencies (no workspace references)
- Optimized and minified builds
- Independent deployment
- Run: `bun run build && bun run start`
- Deploy: `bun run deploy:standalone`

## Scripts

```bash
# Development (Linked)
bun run dev                 # Start development server
bun run build               # Build linked version
bun run deploy:linked       # Deploy linked version

# Production (Standalone)
bun run build:standalone    # Build standalone version
bun run deploy:standalone   # Deploy standalone version

# Installation (Bun Isolated)
bun run install:isolated    # Install with isolated strategy
bun run install:linked      # Install linked dependencies
bun run install:standalone  # Install standalone dependencies

# Testing
bun test                    # Run tests
bun run typecheck          # TypeScript checking
bun run lint               # Lint code
```

## Dependencies

- `@fire22/pattern-system`: workspace:\*
- `@fire22/api-client`: workspace:\*

## Bun Isolated Installs

This workspace uses Bun's isolated install strategy which:

- **Prevents phantom dependencies** — Packages cannot access undeclared
  dependencies
- **Ensures deterministic builds** — Same dependency tree every time
- **Provides workspace isolation** — No cross-contamination between packages
- **Optimizes performance** — Uses symlinks and efficient storage

### Directory Structure

```text
node_modules/
├── .bun/                          # Central package store
│   ├── package@1.0.0/             # Versioned package installations
│   │   └── node_modules/
│   │       └── package/           # Actual package files
│   └── ...
└── package-name -> .bun/package@1.0.0/node_modules/package  # Symlinks
```

## Architecture

- **Isolation**: Each workspace is completely independent with Bun isolated
  installs
- **Linking**: Development mode uses workspace references with isolation
- **Deployment**: Production uses resolved dependencies with isolation
- **Testing**: Isolated test environment prevents phantom dependencies
- **Building**: Separate build outputs for each mode with strict dependency
  resolution
