# Class Naming Guide & Best Practices

A comprehensive guide for naming and designing classes in the Geelark codebase following industry best practices and project conventions.

## Table of Contents
1. [Core Naming Convention](#core-naming-convention)
2. [Class Categories & Patterns](#class-categories--patterns)
3. [Real Project Examples](#real-project-examples)
4. [Naming Anti-Patterns](#naming-anti-patterns)
5. [Advanced Patterns](#advanced-patterns)
6. [Best Practices](#best-practices)

---

## Core Naming Convention

### ✅ Class Names - PascalCase (Upper Camel Case)

**Rule**: Start with uppercase, capitalize each word. No underscores, no lowercase. Simple, descriptive, single noun or noun phrase.

```typescript
// ✅ CORRECT
export class FeatureRegistry { }
export class ConfigLoader { }
export class BunServe { }
export class MemoryManager { }
export class AlertsSystem { }
export class UserValidator { }
export class DataProcessor { }
export class CacheManager { }

// ❌ INCORRECT
export class featureRegistry { }          // lowercase start
export class feature_registry { }         // snake_case
export class FEATURE_REGISTRY { }         // all caps
export class Feature_Registry { }         // mixed with underscore
export class featureRegistryClass { }     // redundant "Class" suffix
```

**Length**: Keep names concise but descriptive (2-4 words typically)
- Too short: `FR`, `Config` (ambiguous)
- Too long: `FeatureRegistryForManagingRuntimeFeatures` (verbose)
- Just right: `FeatureRegistry`, `ConfigLoader`, `MemoryManager`

---

## Class Categories & Patterns

### 1. **Manager Classes** - Manage lifecycle, state, or resources
**Pattern**: `<Resource>Manager`

```typescript
// ✅ Examples from Geelark
export class MemoryManager { }         // Manages memory resources
export class CacheManager { }          // Manages cache state
export class ProcessManager { }        // Manages process lifecycle
export class ConnectionManager { }     // Manages network connections
export class SessionManager { }        // Manages user sessions

// ✅ When to use
// - Controls lifecycle (start, stop, pause)
// - Manages resource allocation/deallocation
// - Maintains internal state
// - Provides coordination between components
```

---

### 2. **Processor Classes** - Process, transform, or compute data
**Pattern**: `<Data>Processor` or `<Operation>Processor`

```typescript
// ✅ Examples from Geelark
export class ConcurrentProcessor { }   // Process items concurrently
export class DataProcessor { }         // Transform/process data
export class ImageProcessor { }        // Process images
export class LogProcessor { }          // Process log entries
export class StreamProcessor { }       // Process streams

// ✅ When to use
// - Transforms input to output
// - Applies algorithms or operations
// - Batch processing
// - Data pipeline stages
```

---

### 3. **Registry/Factory Classes** - Create and register instances
**Pattern**: `<Entity>Registry` or `<Entity>Factory`

```typescript
// ✅ Examples from Geelark
export class FeatureRegistry { }       // Register and manage features
export class ServiceRegistry { }       // Register and manage services
export class ComponentRegistry { }     // Register components
export class PluginFactory { }         // Create plugin instances

// ✅ When to use
// - Singleton pattern implementations
// - Service locator pattern
// - Plugin systems
// - Dynamic instance creation
```

---

### 4. **Service Classes** - Provide business logic, abstraction layer
**Pattern**: `<Domain>Service` or just `<Domain>` when obvious

```typescript
// ✅ Examples from Geelark
export class Logger { }                // Logging service
export class Dashboard { }             // Dashboard service
export class AuthenticationService { } // Auth operations
export class ReportService { }         // Report generation
export class ValidationService { }     // Validation logic

// ✅ When to use
// - Encapsulates business logic
// - Provides high-level API
// - May have dependencies
// - Often instantiated multiple times
```

---

### 5. **Utility Classes** - Provide helper functions, formatting
**Pattern**: `<Purpose>Utility` or `<Purpose>Utils` or `<Purpose>Helper`

```typescript
// ✅ Examples from Geelark
export class StringWidth { }           // String width calculations
export class AnsiColorUtility { }      // ANSI color operations
export class PathUtility { }           // Path manipulation
export class DateUtils { }             // Date operations
export class ValidationHelper { }      // Validation utilities

// ✅ When to use
// - Static methods primarily
// - No instance state needed
// - Collection of related functions
// - Often used namespace
```

---

### 6. **Controller Classes** - Handle requests, orchestrate responses
**Pattern**: `<Resource>Controller` or `<Operation>Handler`

```typescript
// ✅ Examples
export class UserController { }        // Handle user requests
export class APIController { }         // Handle API requests
export class RequestHandler { }        // Handle incoming requests
export class ResponseBuilder { }       // Build responses

// ✅ When to use
// - HTTP request handling
// - Command orchestration
// - Input validation & dispatch
// - Response formatting
```

---

### 7. **Configuration Classes** - Load, validate, manage config
**Pattern**: `<Domain>Config` or `<Domain>ConfigLoader`

```typescript
// ✅ Examples from Geelark
export class ConfigLoader { }          // Load configuration
export class ServerConfig { }          // Server configuration
export class EnvironmentConfig { }     // Environment configuration
export class SecurityConfig { }        // Security settings

// ✅ When to use
// - Configuration management
// - Environment variable handling
// - Config validation
// - Settings storage
```

---

### 8. **Component Classes** - UI or structural components
**Pattern**: `<Feature>Component` or just `<Feature>` for React/Vue

```typescript
// ✅ Examples
export class DashboardComponent { }    // Dashboard UI component
export class HeaderComponent { }       // Header UI component
export class FormComponent { }         // Form UI component

// ✅ When to use
// - UI element representation
// - Reusable visual components
// - Component composition patterns
```

---

### 9. **Error/Exception Classes** - Custom error types
**Pattern**: `<Error>Error` or `<Error>Exception`

```typescript
// ✅ Examples
export class ValidationError extends Error { }      // Validation failures
export class ConfigurationError extends Error { }   // Config loading issues
export class TimeoutError extends Error { }         // Timeout exceptions
export class AuthenticationError extends Error { }  // Auth failures

// ✅ When to use
// - Custom error types
// - Domain-specific exceptions
// - Better error handling
```

---

### 10. **Decorator/Middleware Classes** - Cross-cutting concerns
**Pattern**: `<Purpose>Decorator` or `<Purpose>Middleware`

```typescript
// ✅ Examples from Geelark
export class CacheDecorator { }        // Caching decorator
export class LoggingMiddleware { }     // Logging middleware
export class AuthMiddleware { }        // Authentication middleware
export class ErrorHandlerMiddleware { }// Error handling

// ✅ When to use
// - Aspect-oriented programming
// - Cross-cutting concerns
// - Middleware chains
// - Decorator pattern implementations
```

---

## Real Project Examples

### ✅ Well-Named Classes in Geelark

```typescript
// Service with clear purpose
export class Logger { }
// Why: Simple, universally understood

export class Dashboard { }
// Why: Clear purpose, single responsibility

// Manager with clear domain
export class MemoryManager { }
// Why: Clearly manages memory resources

// Registry with clear purpose
export class FeatureRegistry { }
// Why: Clearly registers/manages features

// Processor with clear operation
export class ConcurrentProcessor { }
// Why: Clearly processes items concurrently

// Utility with clear purpose
export class StringWidth { }
// Why: Specific utility function

export class AnsiColorUtility { }
// Why: Clear domain (ANSI colors), clear purpose (utility)

// Factory with clear purpose
export class BunServe { }
// Why: Bun-specific server functionality

// Complex processor
export class ConcurrentProcessor {
  // Manages concurrent operations
  // Provides progress reporting
  // Handles error scenarios
}
```

---

## Naming Anti-Patterns

### ❌ Anti-Pattern #1: Redundant "Class" in Name
```typescript
// ❌ WRONG
export class LoggerClass { }
export class ConfigLoaderClass { }
export class UserValidatorClass { }

// ✅ CORRECT
export class Logger { }
export class ConfigLoader { }
export class UserValidator { }
```

### ❌ Anti-Pattern #2: Overly Generic Names
```typescript
// ❌ WRONG
export class Handler { }           // Handler of what?
export class Manager { }           // Manager of what?
export class Processor { }         // Process what?
export class Worker { }            // Work on what?

// ✅ CORRECT
export class ErrorHandler { }
export class MemoryManager { }
export class ImageProcessor { }
export class DataWorker { }
```

### ❌ Anti-Pattern #3: Abbreviations
```typescript
// ❌ WRONG
export class FeatReg { }
export class CfgLdr { }
export class ProcMgr { }
export class ConcProc { }

// ✅ CORRECT
export class FeatureRegistry { }
export class ConfigLoader { }
export class ProcessManager { }
export class ConcurrentProcessor { }
```

### ❌ Anti-Pattern #4: Implementation-Specific Names
```typescript
// ❌ WRONG - reveals implementation
export class ArrayDataProcessor { }
export class FileBasedConfigLoader { }
export class SingletonLogger { }

// ✅ CORRECT - implementation-agnostic
export class DataProcessor { }
export class ConfigLoader { }
export class Logger { }
```

### ❌ Anti-Pattern #5: Over-Descriptive Names
```typescript
// ❌ WRONG - too verbose
export class FeatureRegistryForManagingRuntimeFeaturesAndTheirDependencies { }
export class DataProcessorThatHandlesCSVAndXMLFormats { }

// ✅ CORRECT - concise and clear
export class FeatureRegistry { }
export class DataProcessor { }
// Details go in documentation or method names
```

### ❌ Anti-Pattern #6: Unclear Pronounceability
```typescript
// ❌ WRONG - hard to say/remember
export class FRD { }
export class QPMgr { }
export class XLSTranser { }

// ✅ CORRECT - easy to pronounce
export class FeatureRequestDispatcher { }
export class QueryPathManager { }
export class ExcelTransfer { }
```

---

## Advanced Patterns

### Pattern 1: Builder Pattern Naming
```typescript
export class StringBuilder { }         // Builds strings
export class ConfigBuilder { }         // Builds configs
export class QueryBuilder { }          // Builds queries
```

### Pattern 2: Strategy Pattern Naming
```typescript
export class SortingStrategy { }       // Base/interface
export class QuickSortStrategy { }     // Concrete strategy
export class MergeSortStrategy { }     // Concrete strategy
```

### Pattern 3: Observer Pattern Naming
```typescript
export class EventEmitter { }          // Source
export class EventListener { }         // Listener
export class ChangeObserver { }        // Observer
```

### Pattern 4: Adapter Pattern Naming
```typescript
export class DatabaseAdapter { }       // Adapts database
export class MailAdapter { }           // Adapts mail service
export class PaymentAdapter { }        // Adapts payment provider
```

### Pattern 5: Template Method Pattern
```typescript
export class DataImporter { }          // Base template
export class CSVImporter { }           // Concrete implementation
export class JSONImporter { }          // Concrete implementation
```

---

## Best Practices

### 1. **Single Responsibility Principle**
A class should have one reason to change.

```typescript
// ✅ GOOD - Single responsibility
export class Logger { }               // Only logs
export class ConfigLoader { }         // Only loads config
export class MemoryManager { }        // Only manages memory

// ❌ BAD - Multiple responsibilities
export class SystemManager {
  // Manages memory
  // Manages processes
  // Handles networking
  // Logs events
} // Too many reasons to change!
```

### 2. **Verb vs Noun**
Class names should typically be nouns (things/resources), not verbs (actions).

```typescript
// ✅ CORRECT - Nouns
export class Logger { }               // A logger (noun)
export class Server { }               // A server (noun)
export class Connection { }           // A connection (noun)

// ❌ INCORRECT - Verbs (unless truly descriptive)
export class LogData { }              // Ambiguous
export class ServeRequests { }        // Use ServerHandler instead
export class ConnectToDatabase { }    // Use DatabaseConnector instead
```

### 3. **Consistency Within Context**
Use consistent naming across related classes.

```typescript
// ✅ CONSISTENT
export class UserService { }
export class ProductService { }
export class OrderService { }

// ❌ INCONSISTENT
export class UserService { }
export class ProductManager { }       // Why "Manager" here?
export class OrderHandler { }         // And "Handler" here?
```

### 4. **Avoid Generic Suffixes**
Be specific about what the class does.

```typescript
// ✅ SPECIFIC
export class EmailValidator { }
export class PasswordEncryptor { }
export class RequestLogger { }

// ❌ TOO GENERIC
export class Validator { }           // Validates what?
export class Encryptor { }           // Encrypts what?
export class Logger { }              // Logs what?
```

### 5. **Use Established Patterns**
Follow recognized design pattern names when applicable.

```typescript
// ✅ RECOGNIZABLE PATTERNS
export class Factory { }             // Factory pattern
export class Singleton { }           // Singleton pattern
export class Observer { }            // Observer pattern
export class Strategy { }            // Strategy pattern
export class Adapter { }             // Adapter pattern
export class Decorator { }           // Decorator pattern
export class Proxy { }               // Proxy pattern
```

### 6. **Domain-Specific Language**
Consider project domain when naming.

```typescript
// ✅ GEELARK DOMAIN-SPECIFIC
export class FeatureRegistry { }     // Features are first-class
export class BunServe { }            // Bun runtime specific
export class DashboardComponent { }  // Dashboard is key feature

// This helps new developers understand the domain
```

### 7. **Avoid Misleading Names**
Class name should accurately reflect functionality.

```typescript
// ✅ ACCURATE
export class CacheManager { }        // Actually manages cache
export class DataProcessor { }       // Actually processes data

// ❌ MISLEADING
export class FastProcessor { }       // "Fast" is subjective, might not be
export class SmartValidator { }      // "Smart" is vague
export class MagicHelper { }         // "Magic" is unclear
```

### 8. **Naming in Family Hierarchies**
Parent classes should be general, children specific.

```typescript
// ✅ CLEAR HIERARCHY
export class Logger { }              // Base - general logging
export class FileLogger { }          // Specific - logs to files
export class ConsoleLogger { }       // Specific - logs to console
export class DatabaseLogger { }      // Specific - logs to database

// Clear inheritance chain: Logger > {FileLogger, ConsoleLogger, DatabaseLogger}
```

---

## Class Organization

### File Structure Alignment
Class name should match export or be kebab-case for helpers.

```
✅ CORRECT:
src/
  Logger.ts           → exports class Logger
  FeatureRegistry.ts  → exports class FeatureRegistry
  MemoryManager.ts    → exports class MemoryManager
  utils/
    string-width.ts   → exports class StringWidth (or kebab-case file for utility)
    ansi-colors.ts    → exports functions, no class

❌ INCONSISTENT:
src/
  Logger.ts           → exports class LoggerService (mismatch)
  feature-registry.ts → exports class FeatureRegistry (inconsistent case)
```

---

## Checklist for New Classes

Before naming a new class, ask:

- [ ] Does the name clearly convey the class's purpose?
- [ ] Is it a PascalCase noun (not a verb)?
- [ ] Does it follow one of the established patterns (Manager, Processor, Registry, etc.)?
- [ ] Could a new developer understand what this class does from the name alone?
- [ ] Is it concise (2-4 words typically)?
- [ ] Does it avoid redundancy (no "Class" suffix, no over-explanation)?
- [ ] Is it consistent with similar classes in the codebase?
- [ ] Does it avoid abbreviations (unless universally recognized)?
- [ ] Is the file name aligned with the class name (PascalCase)?
- [ ] Have I documented what it does in a header comment?

---

## Summary

| Pattern | Example | When to Use |
|---------|---------|------------|
| Manager | MemoryManager | Lifecycle/resource management |
| Processor | ConcurrentProcessor | Transform/process data |
| Registry | FeatureRegistry | Create/register instances |
| Service | Logger, Dashboard | Business logic, abstractions |
| Utility | StringWidth | Helper functions |
| Controller | UserController | Handle requests/orchestration |
| Config | ConfigLoader | Configuration management |
| Component | HeaderComponent | UI/structural element |
| Error | ValidationError | Custom exception types |
| Decorator | CacheDecorator | Cross-cutting concerns |

---

**Last Updated**: January 9, 2026  
**Status**: Active & in use  
**Maintainer**: Geelark Development Team
