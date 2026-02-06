# 🚀 Fire22 Dashboard Scripts - Enhanced Edition

Welcome to the **enhanced Fire22 Dashboard Scripts directory**! This is your
comprehensive automation and management toolkit for the Fire22 platform.

## 📁 **Enhanced Directory Structure**

```text
scripts/
├── 📁 categories/           # Scripts organized by purpose
│   ├── 🏗️ build/           # Build automation & compilation
│   ├── 🌍 workspace/       # Workspace & monorepo management
│   ├── 🔒 security/        # Security scanning & validation
│   ├── 🧪 testing/         # Testing & validation tools
│   ├── ⚡ performance/     # Performance monitoring & optimization
│   └── 🌍 environment/     # Environment management
├── 📁 core/                # Core utilities & shared components
│   ├── script-runner.ts    # Performance wrapper & execution engine
│   ├── error-handler.ts    # Enhanced error handling & recovery
│   └── config-validator.ts # Configuration validation & schemas
└── 📁 docs/                # Documentation & guides
```

## 🆕 **New Enhanced Features**

### **1. 🚀 Script Runner (Performance Wrapper)**

Every script now gets automatic performance monitoring, error handling, and
execution tracking.

```typescript
import { runScript } from './core/script-runner';

// Wrap your script execution
const result = await runScript(
  'my-script',
  async () => {
    // Your script logic here
    return await performOperation();
  },
  {
    timeout: 60000,
    retries: 3,
    tags: ['build', 'production'],
  }
);

// Get performance metrics
console.log(`Duration: ${result.performance.duration}ms`);
console.log(`Memory: ${result.performance.memoryDelta.heapUsed} bytes`);
```

### **2. 🛡️ Enhanced Error Handler**

Intelligent error categorization, automatic recovery, and detailed error
reporting.

```typescript
import { handleError, createError } from './core/error-handler';

try {
  // Your code here
} catch (error) {
  await handleError(error, {
    scriptName: 'build-script',
    operation: 'compile-typescript',
    environment: 'production',
  });
}

// Create custom errors with context
throw createError(
  'Configuration invalid',
  {
    scriptName: 'config-loader',
    operation: 'validate-env',
  },
  {
    type: 'validation',
    severity: 'high',
    recoverable: true,
  }
);
```

### **3. ✅ Configuration Validator**

Comprehensive input validation with schemas and common validation rules.

```typescript
import { validateConfig, getCommonRules } from './core/config-validator';

const schema = {
  port: {
    type: 'number',
    required: true,
    min: 1024,
    max: 65535,
  },
  apiKey: {
    type: 'string',
    required: true,
    min: 32,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
};

const result = validateConfig(config, schema);
if (!result.isValid) {
  console.log(result.errors);
}
```

## 🔧 **How to Use Enhanced Scripts**

### **Running Scripts with Performance Monitoring**

```bash
# Basic execution with monitoring
bun run scripts/categories/build/enhanced-build.ts

# With performance tracking
bun run scripts/core/script-runner.ts --script=enhanced-build.ts --monitor

# Get performance report
bun run scripts/core/script-runner.ts --report
```

### **Error Handling in Your Scripts**

```typescript
#!/usr/bin/env bun

import { runScript } from '../core/script-runner';
import { handleError } from '../core/error-handler';

async function main() {
  return await runScript('my-script', async () => {
    try {
      // Your main logic
      const result = await performOperation();
      return result;
    } catch (error) {
      await handleError(error, {
        scriptName: 'my-script',
        operation: 'main-operation',
      });
      throw error;
    }
  });
}

if (import.meta.main) {
  main().catch(console.error);
}
```

### **Configuration Validation**

```typescript
#!/usr/bin/env bun

import { validateConfig } from '../core/config-validator';

const configSchema = {
  database: {
    type: 'object',
    required: true,
    properties: {
      url: { type: 'string', required: true },
      poolSize: { type: 'number', min: 1, max: 100 },
    },
  },
  api: {
    type: 'object',
    required: true,
    properties: {
      port: { type: 'number', min: 1024, max: 65535 },
      timeout: { type: 'number', min: 1000, max: 30000 },
    },
  },
};

// Validate your config
const validation = validateConfig(config, configSchema);
if (!validation.isValid) {
  console.error('Configuration validation failed:');
  console.error(validation.errors);
  process.exit(1);
}
```

## 📊 **Performance Monitoring**

### **Built-in Metrics**

- **Execution Time**: How long each script takes
- **Memory Usage**: Memory consumption and deltas
- **CPU Usage**: CPU time spent in user and system space
- **Success Rate**: Track script success/failure rates
- **Error Patterns**: Identify common failure modes

### **Performance Reports**

```bash
# Generate performance report
bun run scripts/core/script-runner.ts --report

# Get metrics for specific script
bun run scripts/core/script-runner.ts --metrics=enhanced-build.ts

# Clear performance history
bun run scripts/core/script-runner.ts --clear-history
```

## 🛡️ **Error Handling & Recovery**

### **Automatic Recovery**

The enhanced error handler automatically attempts to recover from common errors:

- **File Not Found**: Waits and retries
- **Network Issues**: Exponential backoff retry
- **Permission Issues**: Provides clear guidance

### **Error Reporting**

- **Structured Error Logs**: Consistent error format
- **Context Information**: Script name, operation, environment
- **Recovery Suggestions**: Actionable advice for fixing issues
- **Error History**: Track error patterns over time

## ✅ **Configuration Validation**

### **Schema-Based Validation**

- **Type Checking**: Ensure correct data types
- **Range Validation**: Min/max values for numbers
- **Pattern Matching**: Regex validation for strings
- **Required Fields**: Ensure critical config is present
- **Custom Validators**: Your own validation logic

### **Common Validation Rules**

```typescript
import { getCommonRules } from '../core/config-validator';

const rules = getCommonRules();
const validation = validateValue(
  email,
  [rules.nonEmptyString, rules.validEmail],
  'email'
);
```

## 🚀 **Migration Guide**

### **From Old Scripts to Enhanced Scripts**

1. **Add Performance Wrapper**

   ```typescript
   // Before
   async function main() {
     /* ... */
   }

   // After
   import { runScript } from '../core/script-runner';
   async function main() {
     return await runScript('script-name', async () => {
       /* ... your logic ... */
     });
   }
   ```

2. **Add Error Handling**

   ```typescript
   // Before
   try {
     /* ... */
   } catch (error) {
     console.error(error);
   }

   // After
   import { handleError } from '../core/error-handler';
   try {
     /* ... */
   } catch (error) {
     await handleError(error, {
       scriptName: 'script-name',
       operation: 'operation-name',
     });
   }
   ```

3. **Add Configuration Validation**

   ```typescript
   // Before
   const config = loadConfig();

   // After
   import { validateConfig } from '../core/config-validator';
   const config = loadConfig();
   const validation = validateConfig(config, configSchema);
   if (!validation.isValid) {
     console.error('Invalid configuration');
     process.exit(1);
   }
   ```

## 📈 **Benefits of Enhanced Scripts**

### **✅ What You Gain**

- **Performance Insights**: Know exactly how your scripts perform
- **Better Error Handling**: Automatic recovery and clear error messages
- **Configuration Safety**: Validate inputs before they cause problems
- **Monitoring**: Track script health and usage patterns
- **Maintainability**: Consistent patterns across all scripts

### **✅ What You Keep**

- **All Existing Functionality**: No breaking changes
- **Performance**: Enhanced, not degraded
- **Flexibility**: Still can run scripts individually
- **CLI Interface**: All existing commands work

## 🔮 **Future Enhancements**

### **Phase 2: Smart Consolidation**

- Build script orchestrator
- Test runner consolidation
- Environment manager unification

### **Phase 3: Advanced Features**

- AI-powered script recommendations
- Predictive build optimization
- Multi-repository orchestration

## 📚 **Additional Documentation**

- [Build System Guide](./build-guide.md)
- [Testing Guide](./testing-guide.md)
- [CLI Reference](./cli-reference.md)
- [Performance Guide](./performance-guide.md)

## 🤝 **Contributing**

When adding new scripts:

1. Use the enhanced error handling
2. Add performance monitoring
3. Validate configurations
4. Follow the established patterns
5. Update this documentation

## 🆘 **Support**

- **Performance Issues**: Check script-runner.ts metrics
- **Error Problems**: Review error-handler.ts logs
- **Config Issues**: Use config-validator.ts schemas
- **General Help**: Review this README and related guides

---

**🚀 Welcome to the future of script automation!** Your scripts are now
enterprise-grade with built-in monitoring, error handling, and validation.
