# ShortcutRegistry System

A comprehensive keyboard shortcut management system with database persistence, conflict detection, profiles, and macros.

## Features

- **Shortcut Management**: Register, unregister, and trigger keyboard shortcuts
- **Profile System**: Create and manage multiple shortcut profiles with overrides
- **Conflict Detection**: Automatically detect and resolve keyboard shortcut conflicts
- **Macro Support**: Create and execute sequences of shortcuts
- **Database Persistence**: SQLite-based storage with usage tracking
- **Platform Awareness**: Platform-specific key bindings (Windows, macOS, Linux)
- **Event System**: EventEmitter-based notifications for registry changes
- **Usage Analytics**: Track shortcut usage and generate statistics
- **Migration System**: Database schema versioning and migrations
- **Development Tools**: Comprehensive testing, logging, and error handling

## Installation

This project uses [Bun](https://bun.sh/) as the runtime.

```bash
# Install dependencies
bun install

# Initialize database and run migrations
bun run db:migrate

# Seed database with default data
bun run db:seed

# Run the integration test
bun run test:integration
```

## Quick Start

```bash
# Development mode
bun run dev

# Watch mode (auto-reload)
bun run dev:watch

# Start API server
bun run dev:api

# Run tests
bun run test

# Type checking
bun run type-check
```

### API Server

The API server provides HTTP endpoints with seed data initialization via headers:

```bash
# Start API server
bun run dev:api

# Start with watch mode
bun run dev:api:watch
```

See [API Documentation](src/api/README.md) for details on endpoints and seed header usage.

## Scripts

### Development Scripts

- `bun run dev` - Run integration test in development mode
- `bun run dev:watch` - Run in watch mode with auto-reload
- `bun run dev:debug` - Run with debugger attached

### Testing Scripts

- `bun run test` - Run all tests using Bun's test runner
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage reporting
- `bun run test:integration` - Run integration tests

### Database Scripts

- `bun run db:migrate` - Run database migrations
- `bun run db:reset` - Reset database (use `--confirm` flag)
- `bun run db:seed` - Seed database with default data
- `bun run db:backup` - Create database backup
- `bun run db:health` - Check database health

### Build Scripts

- `bun run build` - Build the project
- `bun run build:check` - Check build without generating output
- `bun run build:example` - Build macro example
- `bun run build:example:watch` - Build macro example in watch mode

### CLI Scripts

- `bun run cli` - Run the CLI tool (show help)
- `bun run cli info` - Display build information
- `bun run cli shortcuts` - List all shortcuts
- `bun run cli stats` - Show statistics
- `bun run cli search <keyword>` - Search shortcuts
- `bun run cli:demo` - Run CLI demo script

See [CLI Documentation](src/cli/README.md) for all available commands.

### Quality Scripts

- `bun run lint` - Lint code with ESLint
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting
- `bun run type-check` - Type check with TypeScript
- `bun run clean` - Clean build artifacts

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database paths
DATABASE_PATH=shortcuts.db
DATABASE_PATH_DEV=shortcuts.dev.db
DATABASE_PATH_TEST=shortcuts.test.db

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Feature flags
ENABLE_AUTO_SAVE=true
AUTO_SAVE_INTERVAL_MS=300000
ENABLE_USAGE_TRACKING=true
```

### Bun Configuration

The `bunfig.toml` file configures Bun-specific settings:

- Linker strategy (isolated/hoisted)
- Auto-install peer dependencies
- Trusted dependencies

## Project Structure

```
wind/
├── src/
│   ├── core/
│   │   ├── registry.ts      # Main ShortcutRegistry class
│   │   └── detector.ts      # Conflict detection logic
│   ├── database/
│   │   ├── init.ts          # Database initialization
│   │   ├── migrations.ts    # Migration system
│   │   ├── seeds.ts         # Seed data
│   │   ├── reset.ts         # Database reset utility
│   │   ├── backup.ts         # Backup utility
│   │   └── health.ts         # Health check utility
│   ├── types/
│   │   ├── index.ts         # TypeScript type definitions
│   │   └── bun.d.ts         # Bun type definitions
│   ├── utils/
│   │   └── logger.ts        # Logging utility
│   └── errors/
│       └── index.ts         # Error types and recovery
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── fixtures/            # Test fixtures
├── .env.example             # Environment variables template
├── bunfig.toml              # Bun configuration
├── .prettierrc              # Prettier configuration
├── .eslintrc.json           # ESLint configuration
├── package.json             # Package configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Usage

### Basic Example

```typescript
import { ShortcutRegistry } from './src/core/registry';
import type { ShortcutConfig } from './src/types';

// Create registry instance
const registry = new ShortcutRegistry();

// Register a shortcut
const shortcut: ShortcutConfig = {
  id: 'file.save',
  action: 'save',
  description: 'Save file',
  category: 'general',
  default: {
    primary: 'Ctrl+S',
    macOS: 'Cmd+S'
  },
  enabled: true,
  scope: 'global'
};

registry.register(shortcut);

// Listen for shortcut triggers
registry.on('file.save', (context, event) => {
  console.log('Save triggered!');
});

// Trigger a shortcut programmatically
registry.trigger('file.save');
```

### Profile Management

```typescript
// Create a new profile
const profile = registry.createProfile(
  'My Profile',
  'Custom shortcut profile'
);

// Set active profile
registry.setActiveProfile(profile.id);

// Override a shortcut key for this profile
registry.setOverride('file.save', 'Ctrl+Shift+S', profile.id);
```

### Conflict Detection

```typescript
// Detect conflicts in current profile
const conflicts = registry.detectConflicts();

conflicts.forEach(conflict => {
  console.log(`Conflict: ${conflict.key} used by ${conflict.actions.join(', ')}`);
  console.log(`Severity: ${conflict.severity}`);
});
```

### Macros

```typescript
// Create a macro
const macro = registry.createMacro(
  'Save and Close',
  [
    { action: 'file.save', delay: 0 },
    { action: 'file.close', delay: 100 }
  ]
);

// Execute macro
await registry.executeMacro(macro.id);
```

### Bun Macros (Build-Time)

The project includes Bun macros that execute at bundle-time:

```typescript
// Import macros with import attributes
import { getDefaultShortcuts } from './macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getGitCommitHash } from './macros/getGitCommitHash.ts' with { type: 'macro' };
import { getBuildInfo } from './macros/getBuildInfo.ts' with { type: 'macro' };

// These execute at build-time and results are inlined
const shortcuts = getDefaultShortcuts();
const commitHash = getGitCommitHash();
const buildInfo = await getBuildInfo();
```

**Try the CLI to see macros in action:**
```bash
bun run cli info
bun run cli shortcuts
bun run cli:demo
```

See [Macros Documentation](src/macros/README.md) and [CLI Documentation](src/cli/README.md) for more details.

### Usage Statistics

```typescript
// Get usage statistics for last 30 days
const stats = registry.getUsageStatistics(30);

// Get most used shortcuts
const mostUsed = dbUtils.getMostUsedShortcuts(10);
```

## Project Structure

```
src/
├── core/
│   ├── registry.ts      # Main ShortcutRegistry class
│   └── detector.ts      # Conflict detection logic
├── database/
│   └── init.ts          # Database initialization and utilities
└── types/
    └── index.ts         # TypeScript type definitions
```

## Database Management

### Schema

The system uses SQLite with the following tables:

- `shortcuts` - Shortcut definitions
- `profiles` - Shortcut profiles
- `profile_overrides` - Profile-specific key overrides
- `macros` - Macro sequences
- `user_preferences` - User settings
- `shortcut_usage` - Usage tracking
- `training_progress` - Training/learning progress
- `migrations` - Migration history

### Migrations

The migration system tracks database schema versions and allows for safe updates:

```bash
# Run migrations
bun run db:migrate

# Check migration status
bun run src/database/migrations.ts
```

### Seeding

Seed the database with default shortcuts and profiles:

```bash
# Basic seeding
bun run db:seed

# Clear existing shortcuts and reseed
bun run db:seed --clear

# Include test data
bun run db:seed --test-data

# Specify user ID
bun run db:seed --user=myuser
```

### Backup & Restore

```bash
# Create backup
bun run db:backup

# List backups
bun run db:backup list

# Restore from backup
bun run db:backup restore shortcuts.backup.2024-01-01.db
```

### Health Check

Check database health and integrity:

```bash
bun run db:health
```

## API Reference

### ShortcutRegistry

The main class for managing keyboard shortcuts.

#### Core Methods

##### Shortcut Management

- **`register(config: ShortcutConfig): void`** - Register a new shortcut
  - Validates configuration and checks for conflicts
  - Persists to database
  - Emits `shortcut:registered` event

- **`unregister(shortcutId: string): void`** - Unregister a shortcut
  - Soft deletes from database
  - Emits `shortcut:unregistered` event

- **`trigger(shortcutId: string, context?: any, event?: KeyboardEvent): boolean`** - Trigger a shortcut
  - Executes shortcut if enabled and conditions met
  - Tracks usage
  - Emits `shortcut:triggered` event
  - Returns `true` if triggered successfully

- **`on(shortcutId: string, callback: Function): () => void`** - Listen for shortcut triggers
  - Returns unsubscribe function
  - Callback receives `(context, event)` parameters

##### Profile Management

- **`createProfile(name: string, description: string, basedOn?: string): ShortcutProfile`** - Create a profile
  - Optionally inherits from another profile
  - Emits `profile:created` event

- **`setActiveProfile(profileId: string): void`** - Set the active profile
  - Throws `ProfileNotFoundError` if profile doesn't exist
  - Emits `profile:changed` event

- **`setOverride(shortcutId: string, keyCombination: string, profileId?: string): void`** - Override a shortcut key
  - Validates key combination
  - Checks for conflicts
  - Emits `override:set` event

- **`removeOverride(shortcutId: string, profileId?: string): void`** - Remove an override
  - Emits `override:removed` event

##### Conflict Detection

- **`detectConflicts(profileId?: string): ShortcutConflict[]`** - Detect conflicts
  - Returns array of conflicts with severity levels
  - Platform-aware detection

- **`findConflicts(keyCombination: string, excludeShortcutId?: string, profileId?: string): string[]`** - Find conflicts for a key
  - Returns array of conflicting shortcut IDs

##### Macros

- **`createMacro(name: string, sequence: Array<{action: string; delay: number}>, profileId?: string): ShortcutMacro`** - Create a macro
  - Emits `macro:created` event

- **`executeMacro(macroId: string, context?: any): Promise<void>`** - Execute a macro
  - Runs actions in sequence with delays
  - Updates usage count

##### Utility Methods

- **`getEffectiveKey(config: ShortcutConfig, profileId?: string): string`** - Get effective key combination
  - Considers platform and profile overrides

- **`getShortcutsForProfile(profileId: string): ShortcutConfig[]`** - Get shortcuts for a profile

- **`getUsageStatistics(days: number = 30): any`** - Get usage statistics

- **`getTrainingProgress(userId: string = 'default'): any`** - Get training progress

#### Getters

- `getShortcutCount(): number` - Total number of shortcuts
- `getProfileCount(): number` - Total number of profiles
- `getActiveProfile(): ShortcutProfile` - Current active profile
- `getAllProfiles(): ShortcutProfile[]` - All profiles
- `getAllShortcuts(): ShortcutConfig[]` - All shortcuts
- `getPlatform(): string` - Current platform (windows/macOS/linux)
- `getPreferences(): ShortcutPreferences` - User preferences

#### Event Methods

- `onEvent(event: string, listener: Function): void` - Listen for registry events
- `offEvent(event: string, listener: Function): void` - Remove event listener

## Events

The registry emits the following events:

- `loaded` - Emitted when data is loaded from database
- `shortcut:registered` - Emitted when a shortcut is registered
- `shortcut:unregistered` - Emitted when a shortcut is unregistered
- `shortcut:triggered` - Emitted when a shortcut is triggered
- `shortcut:disabled` - Emitted when a shortcut is disabled
- `conflict` - Emitted when a conflict is detected
- `profile:created` - Emitted when a profile is created
- `profile:updated` - Emitted when a profile is updated
- `profile:changed` - Emitted when the active profile changes
- `override:set` - Emitted when an override is set
- `override:removed` - Emitted when an override is removed
- `macro:created` - Emitted when a macro is created

## Error Handling

The system includes structured error types:

- `ShortcutNotFoundError` - Shortcut doesn't exist
- `ProfileNotFoundError` - Profile doesn't exist
- `ProfileLockedError` - Profile is locked and cannot be modified
- `ConflictError` - Key combination conflict detected
- `InvalidKeyCombinationError` - Invalid key combination format
- `ValidationError` - Configuration validation failed
- `DatabaseError` - Database operation failed
- `MigrationError` - Migration failed

Example error handling:

```typescript
import { ShortcutRegistry, ProfileNotFoundError } from './src/core/registry';

try {
  registry.setActiveProfile('nonexistent');
} catch (error) {
  if (error instanceof ProfileNotFoundError) {
    console.error('Profile not found:', error.context.profileId);
  }
}
```

## Logging

The system includes a structured logging utility:

```typescript
import { logger } from './src/utils/logger';

logger.info('Application started', { version: '1.0.0' });
logger.warn('Deprecated feature used', { feature: 'old-api' });
logger.error('Operation failed', error, { operation: 'save' });
logger.debug('Debug information', { data: someData });
```

Configure logging via environment variables:

```bash
LOG_LEVEL=debug  # debug, info, warn, error
LOG_FORMAT=json  # json or text
```

## Bun Macros

This project includes Bun macros that execute at bundle-time to provide build-time functionality. Macros allow you to:

- Embed shortcuts and configuration data at build time
- Validate shortcuts before runtime
- Include Git commit information in your bundle
- Generate build metadata

### Available Macros

See [src/macros/README.md](src/macros/README.md) for complete documentation.

**Quick Example:**

```ts
import { getDefaultShortcuts } from './src/macros/getDefaultShortcuts.ts' with { type: 'macro' };
import { getBuildInfo } from './src/macros/getBuildInfo.ts' with { type: 'macro' };

// These values are computed at build-time and inlined
const shortcuts = getDefaultShortcuts();
const buildInfo = getBuildInfo();

console.log(`Built v${buildInfo.version} from commit ${buildInfo.shortCommit}`);
console.log(`Loaded ${shortcuts.length} shortcuts`);
```

### Building with Macros

```bash
# Build example with macros
bun run build:example

# Build without macros (if needed)
bun build examples/macro-example.ts --outdir dist --no-macros
```

### Example Usage

See [examples/macro-example.ts](examples/macro-example.ts) for a complete example demonstrating all available macros.

## Testing

### Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage

# Run integration tests only
bun run test:integration
```

### Test Structure

- `tests/unit/` - Unit tests for individual components
- `tests/integration/` - Integration tests for full workflows
- `tests/fixtures/` - Test data and fixtures

## Development Workflow

1. **Setup**
   ```bash
   bun install
   bun run db:migrate
   bun run db:seed
   ```

2. **Development**
   ```bash
   bun run dev:watch  # Auto-reload on changes
   ```

3. **Testing**
   ```bash
   bun run test:watch  # Watch mode for tests
   ```

4. **Code Quality**
   ```bash
   bun run format      # Format code
   bun run lint       # Lint code
   bun run type-check # Type check
   ```

5. **Database Management**
   ```bash
   bun run db:migrate  # Run migrations
   bun run db:backup   # Backup database
   bun run db:health   # Check health
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure they pass
5. Format and lint your code
6. Submit a pull request

## License

MIT
