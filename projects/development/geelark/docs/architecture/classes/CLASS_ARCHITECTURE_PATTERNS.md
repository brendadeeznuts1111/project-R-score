# Class Architecture Patterns & Organization

Comprehensive documentation of Geelark's class architecture, organization patterns, and dependencies.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Class Hierarchy](#core-class-hierarchy)
3. [Module Organization](#module-organization)
4. [Dependency Patterns](#dependency-patterns)
5. [Class Responsibilities](#class-responsibilities)
6. [Integration Points](#integration-points)

---

## Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Index Entry Point                     │
│                    (index.ts)                           │
└────────────────┬──────────────────────────────┬─────────┘
                 │                              │
         ┌───────▼────────┐            ┌────────▼────────┐
         │   CLI Layer    │            │  Server Layer   │
         │  (CLI.ts)      │            │ (server/*)      │
         └───────┬────────┘            └────────┬────────┘
                 │                              │
         ┌───────▼──────────────────────────────▼─────────┐
         │      Core Services & Managers                  │
         │  - Logger                                      │
         │  - Dashboard                                   │
         │  - MemoryManager                               │
         │  - FeatureRegistry                             │
         │  - ConcurrentProcessor                         │
         └───────┬──────────────────────────────┬─────────┘
                 │                              │
         ┌───────▼────────┐            ┌────────▼────────┐
         │  Utilities &   │            │  Configuration  │
         │  Helpers       │            │  & Constants    │
         │  (utils/*)     │            │  (constants/*)  │
         └────────────────┘            └─────────────────┘
```

---

## Core Class Hierarchy

### Tier 1: Entry Points

#### **Main Classes**
```typescript
// File: src/index.ts
export class Geelark {
  // Main application entry point
  // Initializes all major subsystems
}

// File: src/CLI.ts
export class CLI {
  // Command-line interface handler
  // Orchestrates CLI commands
  // Dependency: Logger, FeatureRegistry
}

// File: src/main.ts
export class MainApplication {
  // Main application initialization
  // Boot sequence coordinator
}
```

---

### Tier 2: Core Services

#### **Logging Service**
```typescript
// File: src/Logger.ts
export class Logger {
  // Purpose: Application-wide logging
  // Responsibilities:
  //   - Log messages at different levels (info, warn, error, debug)
  //   - Format log output
  //   - Route logs to appropriate destinations
  // Dependencies: AnsiColorUtility
  // Usage: Used by virtually all other classes
  // Scope: Singleton (typically instantiated once)
}
```

#### **Dashboard Service**
```typescript
// File: src/Dashboard.ts
export class Dashboard {
  // Purpose: Real-time system monitoring and display
  // Responsibilities:
  //   - Render dashboard UI
  //   - Update metrics in real-time
  //   - Display health status
  //   - Manage component layout
  // Dependencies: Logger, MemoryManager, AnsiColorUtility
  // Usage: CLI commands for monitoring
  // Scope: Singleton
}
```

#### **Memory Manager**
```typescript
// File: src/MemoryManager.ts
export class MemoryManager {
  // Purpose: Monitor and manage memory usage
  // Responsibilities:
  //   - Track memory consumption
  //   - Detect memory leaks
  //   - Trigger cleanup operations
  //   - Provide memory statistics
  // Dependencies: Logger
  // Usage: Dashboard, Performance monitoring
  // Scope: Singleton
}
```

#### **Feature Registry**
```typescript
// File: src/FeatureRegistry.ts
export class FeatureRegistry {
  // Purpose: Manage runtime feature flags and capabilities
  // Responsibilities:
  //   - Register features and their metadata
  //   - Check feature availability
  //   - Manage feature dependencies
  //   - Provide feature introspection
  // Dependencies: Logger, config utilities
  // Usage: Feature gating, capability detection
  // Scope: Singleton
  
  // Key Methods:
  // - registerFeature(name, metadata)
  // - isFeatureEnabled(name)
  // - getFeatureMetadata(name)
  // - listAvailableFeatures()
}
```

---

### Tier 3: Data Processing & Utilities

#### **Concurrent Processor**
```typescript
// File: src/ConcurrentProcessor.ts
export class ConcurrentProcessor {
  // Purpose: Handle concurrent data processing operations
  // Responsibilities:
  //   - Process items concurrently
  //   - Track progress
  //   - Handle errors in batch operations
  //   - Manage worker pools
  // Dependencies: Logger
  // Usage: Batch operations, parallel processing
  // Scope: Typically instantiated per batch operation
  
  // Key Methods:
  // - process<T>(items, processor, options)
  // - getProgress()
  // - onProgress(callback)
}
```

#### **String Width Utility**
```typescript
// File: src/StringWidth.ts
export class StringWidth {
  // Purpose: Calculate true visual width of strings
  // Responsibilities:
  //   - Account for wide characters
  //   - Handle ANSI color codes
  //   - Handle Unicode characters
  // Dependencies: None
  // Usage: Dashboard rendering, table formatting
  // Scope: Utility class (mostly static methods)
}
```

#### **ANSI Color Utility**
```typescript
// File: src/utils/AnsiColorUtility.ts
export class AnsiColorUtility {
  // Purpose: ANSI color code generation and manipulation
  // Responsibilities:
  //   - Generate color codes
  //   - Style text
  //   - Parse color specifications
  //   - Handle color compatibility
  // Dependencies: None
  // Usage: Logger, Dashboard, CLI output
  // Scope: Utility class (static methods)
}
```

---

### Tier 4: Configuration & Constants

#### **Config Module**
```typescript
// File: src/config.ts
export class ConfigManager {
  // Purpose: Manage application configuration
  // Responsibilities:
  //   - Load configuration files
  //   - Parse environment variables
  //   - Validate configuration
  //   - Provide typed config interface
  // Dependencies: Logger, validation utilities
  // Usage: Application initialization
  // Scope: Singleton
}

// File: src/constants/SystemDefaults.ts
export const DASHBOARD_DEFAULTS = { /* ... */ }
export const MEMORY_DEFAULTS = { /* ... */ }
export const TELEMETRY_DEFAULTS = { /* ... */ }
export const PERFORMANCE_DEFAULTS = { /* ... */ }
// ... and more constants
```

---

## Module Organization

### `/src/` - Main Application
```
src/
├── index.ts                    # Application entry point
├── main.ts                     # Main initialization
├── CLI.ts                      # CLI command handler
├── Logger.ts                   # Core logging service
├── Dashboard.ts                # Dashboard service
├── MemoryManager.ts            # Memory management
├── FeatureRegistry.ts          # Feature registration
├── ConcurrentProcessor.ts      # Concurrent processing
├── StringWidth.ts              # String width utility
├── config.ts                   # Configuration manager
├── types.ts                    # Shared type definitions
│
├── constants/                  # All constants
│   ├── index.ts               # Main constants export
│   ├── SystemDefaults.ts      # System defaults
│   ├── templates.ts           # Template constants
│   └── features/
│       └── compile-time.ts    # Feature flags
│
├── utils/                      # Utility functions & classes
│   ├── AnsiColorUtility.ts    # ANSI colors
│   ├── ErrorHandlingPattern.ts # Error handling
│   ├── InputValidation.ts     # Input validation
│   ├── initializeEnvironment.ts # Env initialization
│   └── version.ts             # Version utilities
│
├── cli/                        # CLI functionality
│   ├── version-manager.ts     # Version management CLI
│   └── benchmark-cli.ts       # Benchmarking CLI
│
├── server/                     # Server implementations
│   ├── ServerConstants.ts     # Server constants
│   └── *.ts                   # Various server files
│
├── security/                   # Security features
│   ├── TLS.ts                 # TLS/SSL handling
│   └── Headers.ts             # Security headers
│
├── proxy/                      # Proxy functionality
│   ├── headers.ts             # Proxy headers
│   └── *.ts                   # Proxy utilities
│
└── [other modules]/           # Feature-specific modules
```

---

## Dependency Patterns

### Dependency Hierarchy

```
┌─────────────────────────────────────────┐
│      Independent (No Dependencies)      │
├─────────────────────────────────────────┤
│  • StringWidth                          │
│  • AnsiColorUtility                     │
│  • Constants (all)                      │
│  • Type definitions                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Base Services (Few Dependencies)     │
├─────────────────────────────────────────┤
│  • Logger                               │
│  • ConfigManager                        │
│  • ErrorHandler                         │
│  • InputValidator                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Core Services (Mid-Level Deps)       │
├─────────────────────────────────────────┤
│  • MemoryManager (depends: Logger)      │
│  • Dashboard (depends: Logger, etc)     │
│  • FeatureRegistry (depends: Logger)    │
│  • ConcurrentProcessor (depends: Logger)│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  High-Level (Many Dependencies)         │
├─────────────────────────────────────────┤
│  • CLI (depends: Logger, services)      │
│  • Main (depends: all core services)    │
└─────────────────────────────────────────┘
```

### Dependency Rules
1. **No Circular Dependencies** - Classes should flow downward
2. **Minimize Coupling** - Use dependency injection when possible
3. **Abstract Interfaces** - Depend on interfaces, not concrete classes
4. **Configuration Objects** - Pass configs as parameters, not global state

---

## Class Responsibilities

### Single Responsibility Principle Breakdown

#### **Logger**
- ✅ Format log messages
- ✅ Route logs to destinations
- ✅ Apply color formatting
- ❌ Manage file I/O (depends on utilities)
- ❌ Parse configuration (depends on ConfigManager)

#### **Dashboard**
- ✅ Render UI components
- ✅ Update display metrics
- ✅ Manage layout
- ❌ Process CPU data (delegates to MemoryManager)
- ❌ Generate logs (depends on Logger)

#### **MemoryManager**
- ✅ Track memory usage
- ✅ Detect anomalies
- ✅ Provide statistics
- ❌ Clean memory (delegates to Bun runtime)
- ❌ Log events (depends on Logger)

#### **FeatureRegistry**
- ✅ Register features
- ✅ Check availability
- ✅ Provide metadata
- ❌ Execute features (depends on feature implementations)
- ❌ Load from files (would delegate to config system)

#### **ConcurrentProcessor**
- ✅ Manage concurrent execution
- ✅ Track progress
- ✅ Handle batching
- ❌ Process specific data types (accepts processor functions)
- ❌ Report results (delegates to Logger)

---

## Integration Points

### Service Initialization Sequence

```
1. Initialize Constants
   └─ Load DASHBOARD_DEFAULTS, MEMORY_DEFAULTS, etc.

2. Initialize ConfigManager
   └─ Load configuration from files and env variables

3. Initialize Logger
   └─ Configure logging level and destinations

4. Initialize MemoryManager
   └─ Start memory monitoring
   └─ Report to Logger

5. Initialize FeatureRegistry
   └─ Register all available features
   └─ Report to Logger

6. Initialize Dashboard
   └─ Subscribe to MemoryManager updates
   └─ Use Logger for status messages

7. Initialize CLI
   └─ Register commands
   └─ Set up command handlers

8. Start Main Application
   └─ Begin processing user requests
```

### Service Communication Patterns

#### **Event-Based Communication**
```typescript
// Example: Dashboard updates when memory changes
memoryManager.onUpdate(() => {
  dashboard.updateMemoryMetrics(memoryManager.getStats());
  logger.debug('Memory updated', memoryManager.getStats());
});
```

#### **Dependency Injection**
```typescript
// Example: Logger injected into Dashboard
export class Dashboard {
  constructor(private logger: Logger) {}
  
  render() {
    this.logger.info('Rendering dashboard');
  }
}
```

#### **Observer Pattern**
```typescript
// Example: Multiple listeners for feature changes
featureRegistry.on('feature:enabled', (feature) => {
  logger.info(`Feature enabled: ${feature}`);
  dashboard.refresh();
});
```

---

## Class Creation Guidelines

### When Creating a New Service Class

1. **Identify Responsibility**
   - What is this class's primary purpose?
   - What does it manage or provide?

2. **Choose Pattern**
   - Manager: Resource/state management
   - Service: Business logic
   - Processor: Data transformation
   - Utility: Helper functions

3. **Plan Dependencies**
   - What other services does it need?
   - Can dependencies be injected?
   - Are there circular dependency risks?

4. **Design Interface**
   - What public methods should it expose?
   - What is the input/output?
   - What errors can it throw?

5. **Document Scope**
   - Singleton or multiple instances?
   - Lifetime: Application, request, operation?

6. **Integration Points**
   - Where will this class be instantiated?
   - What will invoke its methods?
   - How will it report status/errors?

---

## Architecture Best Practices

### ✅ DO
- Create focused classes with single responsibility
- Use dependency injection for testability
- Define clear public interfaces
- Document class purpose in header comments
- Follow inheritance hierarchies
- Use composition over inheritance

### ❌ DON'T
- Create god classes with many responsibilities
- Use global state excessively
- Create circular dependencies
- Hide dependencies (inject, don't import everywhere)
- Violate single responsibility principle
- Mix multiple patterns in one class

---

## Future Architecture Considerations

### Planned Patterns
1. **Plugin Architecture** - Extensible feature system
2. **Service Registry** - Dynamic service discovery
3. **Event Bus** - Decoupled communication
4. **Middleware Chain** - Cross-cutting concerns
5. **State Management** - Centralized state (like Redux)

### Scalability Notes
- Services can be split into separate modules
- Consider moving services to worker threads
- Implement caching layer for frequently accessed data
- Consider microservices architecture for complex apps

---

## Summary

| Component | Type | Responsibility | Dependencies |
|-----------|------|-----------------|--------------|
| Logger | Service | Logging | None |
| Dashboard | Service | UI Display | Logger |
| MemoryManager | Service | Memory tracking | Logger |
| FeatureRegistry | Registry | Feature management | Logger |
| ConcurrentProcessor | Processor | Concurrent execution | Logger |
| StringWidth | Utility | Width calculation | None |
| AnsiColorUtility | Utility | Color codes | None |
| ConfigManager | Service | Configuration | Logger |

---

**Last Updated**: January 9, 2026  
**Status**: Active & Reference Document  
**Maintainer**: Geelark Development Team
