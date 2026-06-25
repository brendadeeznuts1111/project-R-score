# Implementation Plan: Enterprise Pro CLI v3.7 - Comprehensive Enhancement

## [Overview]

Transform the DuoPlus CLI from a single-file entry point into a comprehensive, production-grade Enterprise Pro v3.7 infrastructure management system with modular command architecture, robust error handling, comprehensive testing, and automated deployment.

This implementation builds upon the existing Bun-native foundation (platform detection, enterprise secrets management, performance benchmarking) by introducing:

- **Modular Command Architecture**: Refactor monolithic index.ts into organized command modules with shared utilities
- **Six New Commands**: matrix (infrastructure overview), scope-lookup (scope detection), audit (compliance auditing), init (project initialization), config (configuration management), and health (system health monitoring)
- **Enterprise-Grade Error Handling**: Comprehensive validation, error recovery, and user-friendly error messages across all commands
- **Complete Test Coverage**: Unit tests, integration tests, E2E tests with 80%+ coverage
- **Professional Documentation**: README, API docs, command guides, troubleshooting, and examples
- **CI/CD Pipeline**: Automated testing, linting, building, and deployment workflows

The system maintains strict compliance with .clinerules requirements (Bun-native first, CRED_PERSIST_ENTERPRISE secrets, platform detection) while expanding capabilities for real-world production use.

---

## [Types]

New TypeScript interfaces, types, and enums for command management, error handling, and configuration.

### Command System Types

```typescript
// packages/cli/types/commands.ts
export interface CLICommand {
  name: string;
  description: string;
  category: CommandCategory;
  aliases?: string[];
  options?: CommandOption[];
  examples?: string[];
  handler: (options: any) => Promise<void>;
}

export interface CommandOption {
  flag: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'array';
  required?: boolean;
  default?: any;
  choices?: string[] | number[];
}

export enum CommandCategory {
  Infrastructure = 'infrastructure',
  Secrets = 'secrets',
  System = 'system',
  Development = 'development',
  Compliance = 'compliance'
}

export type CommandRegistry = Map<string, CLICommand>;
```

### Error Handling Types

```typescript
// packages/cli/types/errors.ts
export interface CLIErrorContext {
  command: string;
  operation: string;
  platform: NodeJS.Platform;
  timestamp: Date;
  details?: Record<string, any>;
}

export class CLIError extends Error {
  constructor(
    public code: string,
    message: string,
    public context?: CLIErrorContext,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export enum ErrorCode {
  PlatformUnsupported = 'PLATFORM_UNSUPPORTED',
  SecretsAccessDenied = 'SECRETS_ACCESS_DENIED',
  ConfigInvalid = 'CONFIG_INVALID',
  OperationTimeout = 'OPERATION_TIMEOUT',
  DependencyMissing = 'DEPENDENCY_MISSING'
}
```

### Configuration Types

```typescript
// packages/cli/types/config.ts
export interface CLIConfig {
  scope: ScopeType;
  platform: PlatformInfo;
  secrets: SecretsConfig;
  logging: LoggingConfig;
  cache: CacheConfig;
}

export type ScopeType = 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX';

export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  bunVersion: string;
  nodeVersion: string;
}

export interface SecretsConfig {
  enabled: boolean;
  persist: 'CRED_PERSIST_ENTERPRISE' | 'CRED_PERSIST_LOCAL';
  serviceName: string;
  timeout: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  colorize: boolean;
  verbosity: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  directory: string;
}
```

---

## [Files]

Comprehensive file structure changes including new modules, utilities, tests, and documentation.

### New Files to Create

**Command Modules** (packages/cli/commands/):
- `packages/cli/commands/matrix.ts` - Infrastructure matrix display with scope integration
- `packages/cli/commands/scope-lookup.ts` - Scope detection and validation
- `packages/cli/commands/audit.ts` - Compliance auditing and health checks
- `packages/cli/commands/init.ts` - Project initialization wizard
- `packages/cli/commands/config.ts` - Configuration management (get/set/list)
- `packages/cli/commands/health.ts` - System health monitoring and diagnostics

**Utilities** (packages/cli/utils/):
- `packages/cli/utils/command-registry.ts` - Central command registration and management
- `packages/cli/utils/error-handler.ts` - Comprehensive error handling and recovery
- `packages/cli/utils/config-manager.ts` - Configuration file loading and merging
- `packages/cli/utils/logger.ts` - Structured logging with multiple output formats
- `packages/cli/utils/validator.ts` - Input validation and schema checking
- `packages/cli/utils/cache.ts` - In-memory and file-based caching system

**Testing** (packages/cli/tests/):
- `packages/cli/tests/unit/commands.test.ts` - Unit tests for all commands
- `packages/cli/tests/unit/utils.test.ts` - Utility function tests
- `packages/cli/tests/integration/secrets.test.ts` - Secrets management integration
- `packages/cli/tests/integration/platform.test.ts` - Platform detection integration
- `packages/cli/tests/e2e/workflows.test.ts` - End-to-end workflow testing

**Documentation** (docs/):
- `docs/guides/CLI_COMMANDS.md` - Complete command reference
- `docs/guides/CLI_CONFIGURATION.md` - Configuration setup and options
- `docs/guides/ERROR_HANDLING.md` - Error codes and recovery strategies
- `docs/guides/TROUBLESHOOTING.md` - Common issues and solutions
- `docs/api/CLI_API.md` - CLI API documentation for programmatic use
- `packages/cli/README.md` - Package-specific documentation

**Configuration** (root level):
- `.github/workflows/cli-test.yml` - Automated testing workflow
- `.github/workflows/cli-build.yml` - Build and bundle workflow
- `packages/cli/.eslintrc.json` - Linting rules for CLI package
- `packages/cli/tsconfig.json` - TypeScript configuration

### Modified Files

**packages/cli/index.ts**:
- Remove inline command definitions
- Import commands from command registry
- Implement dynamic command loading and registration
- Add global error handling middleware
- Implement help system enhancements

**packages/cli/package.json**:
- Add "bin" field for CLI executable (empire-pro)
- Add test scripts for unit/integration/e2e testing
- Update build scripts to include minification
- Add pre-commit hooks configuration

**packages/cli/tsconfig.json**:
- Set strict mode to true
- Add source map generation
- Configure declaration files
- Add exclude patterns for tests

### Files to Delete

- `packages/cli/test-*.ts` (demo/test files)
- `packages/cli/demo-*.ts` (demo files)
- `packages/cli/*-demo.ts` (consolidate into proper test suite)

---

## [Functions]

New functions, modifications to existing functions, and required hooks.

### New Functions

**Command Management** (packages/cli/utils/command-registry.ts):
```typescript
export function registerCommand(command: CLICommand): void
export function getCommand(name: string): CLICommand | undefined
export function listCommands(category?: CommandCategory): CLICommand[]
export function executeCommand(name: string, options: any): Promise<void>
export function generateHelpText(command?: CLICommand): string
```

**Error Handling** (packages/cli/utils/error-handler.ts):
```typescript
export function handleError(error: unknown, context: CLIErrorContext): void
export function formatErrorMessage(error: CLIError): string
export function getSuggestions(code: ErrorCode): string[]
export function logError(error: CLIError, logger: Logger): void
export function createErrorContext(command: string, operation: string): CLIErrorContext
```

**Configuration** (packages/cli/utils/config-manager.ts):
```typescript
export function loadConfig(configPath?: string): Promise<CLIConfig>
export function saveConfig(config: CLIConfig, configPath?: string): Promise<void>
export function mergeConfigs(base: Partial<CLIConfig>, override: Partial<CLIConfig>): CLIConfig
export function validateConfig(config: unknown): CLIConfig
export function getDefaultConfig(): CLIConfig
```

**Logging** (packages/cli/utils/logger.ts):
```typescript
export function createLogger(config: LoggingConfig): Logger
export interface Logger {
  debug(message: string, meta?: any): void
  info(message: string, meta?: any): void
  warn(message: string, meta?: any): void
  error(message: string, error?: Error, meta?: any): void
  table(data: any[], title?: string): void
}
```

**Validation** (packages/cli/utils/validator.ts):
```typescript
export function validateString(value: unknown, minLength?: number, maxLength?: number): string
export function validateNumber(value: unknown, min?: number, max?: number): number
export function validateEnum<T>(value: unknown, enumType: Record<string, T>): T
export function validateObject(value: unknown, schema: Record<string, any>): Record<string, any>
export function validatePlatformCompatibility(): ValidationResult
```

**Caching** (packages/cli/utils/cache.ts):
```typescript
export function createCache(config: CacheConfig): Cache
export interface Cache {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttl?: number): void
  delete(key: string): boolean
  clear(): void
  has(key: string): boolean
}
```

### Modified Functions

**packages/cli/index.ts - main entry point**:
- Add `initializeCLI()` - Set up logger, config, error handlers
- Add `registerAllCommands()` - Load and register all commands
- Add `setupGlobalErrorHandler()` - Catch unhandled errors
- Modify `program.parse()` - Add pre/post hooks

**Command Handlers**:
- All command handlers now accept `CommandContext` with logger, config, cache
- Add validation before execution
- Add metrics collection for performance tracking
- Add audit logging for security-sensitive operations

---

## [Classes]

New classes for organizing functionality and managing state.

### New Classes

**packages/cli/services/CommandService.ts**
```typescript
export class CommandService {
  private registry: CommandRegistry
  private logger: Logger
  
  constructor(logger: Logger)
  register(command: CLICommand): void
  execute(name: string, options: any): Promise<void>
  list(category?: CommandCategory): CLICommand[]
  validate(name: string, options: any): ValidationResult
}
```

**packages/cli/services/ConfigService.ts**
```typescript
export class ConfigService {
  private config: CLIConfig
  private logger: Logger
  private configPath: string
  
  constructor(logger: Logger, configPath?: string)
  load(): Promise<void>
  save(): Promise<void>
  get(key: string): any
  set(key: string, value: any): void
  merge(overrides: Partial<CLIConfig>): void
  validate(): ValidationResult
}
```

**packages/cli/services/SecretsService.ts**
```typescript
export class SecretsService {
  private platform: PlatformCapabilities
  private logger: Logger
  
  constructor(logger: Logger)
  set(name: string, value: string): Promise<void>
  get(name: string): Promise<string | undefined>
  list(): Promise<string[]>
  delete(name: string): Promise<void>
  validate(): ValidationResult
}
```

**packages/cli/services/AuditService.ts**
```typescript
export class AuditService {
  private logger: Logger
  private cache: Cache
  
  constructor(logger: Logger, cache: Cache)
  logOperation(operation: string, result: OperationResult): Promise<void>
  getAuditLog(filters?: AuditFilter): Promise<AuditEntry[]>
  generateReport(timerange?: string): Promise<AuditReport>
}
```

### Modified Classes

**UnicodeTableFormatter** (packages/terminal/src/enhanced-unicode-formatter.ts):
- Add `generateCommandTable()` method
- Add `generateErrorTable()` method
- Add `formatMetrics()` method with alignment support

---

## [Dependencies]

New packages and version updates required.

### New Dependencies

- **@types/node**: Already present, ensure latest version for compatibility
- **joi**: ^17.11.0 - Schema validation library
- **dotenv**: ^16.3.1 - Environment variable loading
- **winston**: ^3.11.0 - Professional logging (optional, can use simpler logging)
- **chalk**: ^5.3.0 - Terminal string styling enhancements
- **table**: ^6.8.1 - Advanced table formatting

### Modified Dependencies

- **commander**: Update to ^11.1.0 for latest features
- **@types/bun**: Update to latest for Bun.secrets improvements

### Version Alignment

All dependencies must use the project's existing catalog system (packages/core/package.json):
```json
"[packages]": {
  "joi": "^17.11.0",
  "dotenv": "^16.3.1",
  "chalk": "^5.3.0",
  "table": "^6.8.1"
}
```

---

## [Testing]

Comprehensive multi-level testing strategy with specific test files and coverage requirements.

### Test Structure

**Unit Tests** (packages/cli/tests/unit/):
- Test each utility function in isolation
- Test error handling for edge cases
- Test configuration merging and validation
- Test command registry operations
- Target: 85%+ code coverage for utils

**Integration Tests** (packages/cli/tests/integration/):
- Test secrets service with platform detection
- Test config loading and environment variable merging
- Test command execution with validators
- Test error handling with recovery strategies
- Target: 75%+ coverage for services

**E2E Tests** (packages/cli/tests/e2e/):
- Test complete workflows: init → config → status
- Test multi-platform scenarios
- Test error scenarios and recovery
- Test secret storage and retrieval
- Target: Critical path coverage

### Test Configuration

**packages/cli/bunfig.toml**:
```toml
[test]
root = "tests"
preload = ["./tests/setup.ts"]
coverage = ["src", "utils", "commands", "services"]
```

**tests/setup.ts**:
- Initialize test environment
- Mock Bun APIs where needed
- Setup test fixtures
- Configure test logger

### Test Commands

```json
"scripts": {
  "test": "bun test",
  "test:unit": "bun test tests/unit/**/*.test.ts",
  "test:integration": "bun test tests/integration/**/*.test.ts",
  "test:e2e": "bun test tests/e2e/**/*.test.ts",
  "test:coverage": "bun test --coverage"
}
```

---

## [Implementation Order]

Logical sequence of changes to minimize conflicts and ensure successful integration.

1. **Create Type Definitions** (Step 1-2 hours)
   - Create packages/cli/types/ directory structure
   - Define all TypeScript interfaces and enums
   - Add type exports to packages/cli/types/index.ts
   - Update packages/cli/tsconfig.json for strict mode

2. **Create Utility Modules** (Step 2-4 hours)
   - Implement command-registry.ts with registration system
   - Implement error-handler.ts with comprehensive error handling
   - Implement config-manager.ts with file loading and merging
   - Implement logger.ts with multiple output formats
   - Implement validator.ts with schema validation
   - Implement cache.ts with TTL support

3. **Create Service Classes** (Step 3-5 hours)
   - Create CommandService with registry integration
   - Create ConfigService with file persistence
   - Create SecretsService wrapping Bun.secrets
   - Create AuditService for compliance logging
   - Add error handling and logging to all services

4. **Create Command Modules** (Step 4-8 hours)
   - Create matrix.ts command showing infrastructure overview
   - Create scope-lookup.ts for scope detection
   - Create audit.ts for compliance auditing
   - Create init.ts for project initialization
   - Create config.ts for configuration management
   - Create health.ts for system health monitoring
   - Each command implements CommandContext usage, error handling, validation

5. **Refactor index.ts** (Step 5-2 hours)
   - Remove inline command definitions
   - Import and register all commands
   - Implement global error handling
   - Add CLI initialization logic
   - Wire up logging and configuration

6. **Create Test Framework** (Step 6-3 hours)
   - Create tests/setup.ts with test utilities
   - Create tests/fixtures/ with mock data
   - Add test configuration to bunfig.toml
   - Implement test helpers for command testing

7. **Write Unit Tests** (Step 7-6 hours)
   - Create comprehensive unit tests for all utils
   - Create tests for error handling edge cases
   - Create tests for configuration validation
   - Achieve 85%+ coverage for utilities

8. **Write Integration Tests** (Step 8-5 hours)
   - Create integration tests for services
   - Test secrets storage with platform mocking
   - Test config loading from file and env
   - Test command execution workflow
   - Achieve 75%+ coverage for integration

9. **Write E2E Tests** (Step 9-4 hours)
   - Create workflows for complete user scenarios
   - Test end-to-end CLI usage
   - Test error recovery paths
   - Test multi-platform scenarios

10. **Create Documentation** (Step 10-4 hours)
    - Write CLI_COMMANDS.md with all command references
    - Write CLI_CONFIGURATION.md with setup instructions
    - Write ERROR_HANDLING.md with troubleshooting
    - Write API documentation
    - Write package README

11. **Create CI/CD Workflows** (Step 11-2 hours)
    - Create .github/workflows/cli-test.yml
    - Create .github/workflows/cli-build.yml
    - Add pre-commit hooks for linting
    - Configure code coverage reporting

12. **Update package.json** (Step 12-1 hour)
    - Add bin field for CLI executable
    - Update scripts for all test types
    - Add pre-commit configuration
    - Add repository and bugs fields

13. **Final Integration and Testing** (Step 13-2 hours)
    - Run complete test suite
    - Verify all workflows pass
    - Test CLI executable locally
    - Verify documentation completeness

**Total Estimated Time**: 45-50 hours

---

## [Task Summary]

This comprehensive implementation transforms the DuoPlus CLI from a basic entry point into a production-grade, enterprise-ready infrastructure management system. The modular architecture enables rapid feature additions, the comprehensive testing ensures reliability, and the documentation supports user adoption. All changes maintain strict compliance with project .clinerules requirements for Bun-native development and enterprise security standards.