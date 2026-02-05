# Bun MCP Server Debugging Guide

This guide provides comprehensive debugging setup for the Bun Model Context Protocol (MCP) server in VS Code, leveraging Bun's advanced runtime features.

## 🚀 Quick Start

### Prerequisites
- **Bun** v1.3.0+ installed
- **VS Code** with Bun extension
- **Node.js** for MCP SDK compatibility

### Installation
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.com/install | bash

# Install dependencies
cd mcp-server
bun install

# Install VS Code Bun extension
code --install-extension oven.bun
```

## 🐛 Enhanced Debugging Configurations

### MCP Server Debugging with Bun Runtime Features

#### Development Mode
- **Configuration**: "Debug MCP Server (Development)"
- **Bun Features**:
  - `--inspect`: Activate Bun's debugger
  - `--hot`: Enable auto reload in the Bun runtime
  - `--console-depth 5`: Deeper object inspection in console output
- **Environment**: Development with debug logging
- **Use Case**: Active development with hot reload and detailed debugging

#### Production Mode
- **Configuration**: "Debug MCP Server (Production)"
- **Bun Features**:
  - `--inspect`: Production debugging
  - `--smol`: Use less memory, run garbage collection more often
- **Environment**: Production settings with memory optimization
- **Use Case**: Production debugging with memory constraints

#### Test Mode with Breakpoints
- **Configuration**: "Debug MCP Server with Test Input"
- **Bun Features**:
  - `--inspect-brk`: Set breakpoint on first line and wait
  - `--hot`: Enable auto reload for test development
  - `--console-depth 10`: Maximum object inspection depth
  - `--define process.env.MCP_TEST_MODE:'true'`: Compile-time constant
- **Environment**: Test mode with full debugging capabilities
- **Use Case**: Comprehensive testing with breakpoint debugging

#### Memory Optimized Mode
- **Configuration**: "Debug MCP Server (Memory Optimized)"
- **Bun Features**:
  - `--inspect`: Debugging with memory optimization
  - `--smol`: Memory-constrained environment optimization
  - `--expose-gc`: Expose gc() on the global object for manual garbage collection
- **Environment**: Production with memory monitoring
- **Use Case**: Memory profiling and optimization debugging

#### Watch Mode Development
- **Configuration**: "Debug MCP Server (Watch Mode)"
- **Bun Features**:
  - `--inspect`: Full debugging capabilities
  - `--watch`: Automatically restart on file change
  - `--hot`: Enable auto reload with hot module replacement
  - `--no-clear-screen`: Preserve terminal output on reload
- **Environment**: Development with file watching
- **Use Case**: Continuous development with automatic restart

### Automation Script Debugging

#### Script Execution with Enhanced Console
- **Configuration**: "Debug Bun Script Execution"
- **Bun Features**:
  - `--inspect`: Script debugging
  - `--console-depth 5`: Enhanced object inspection
- **Input**: Prompt for script path
- **Use Cases**: 
  - Debug individual automation scripts
  - Test script parameters with detailed output
  - Performance profiling with object inspection

#### Automation Scripts with Hot Reload
- **Configuration**: "Debug Automation Scripts"
- **Bun Features**:
  - `--inspect`: Full debugging for automation
  - `--hot`: Auto reload for rapid development
  - `--console-depth 3`: Balanced object inspection
- **Input**: Dropdown selection of available scripts
- **Available Scripts**:
  - `automated-setup.ts` - Project scaffolding
  - `continuous-testing.ts` - Test pipeline
  - `incremental-verification.ts` - Health checks
  - `monitoring-dashboard.ts` - Real-time monitoring

## 🔧 Advanced Bun Runtime Features

### Memory Management
```bash
# Memory-constrained debugging
bun --smol --inspect run index.ts

# Manual garbage collection debugging
bun --expose-gc --inspect run index.ts
# In debugger: gc() to force garbage collection
```

### Console Output Control
```bash
# Deep object inspection
bun --console-depth 10 --inspect run index.ts

# Minimal console output
bun --console-depth 1 --inspect run index.ts
```

### Hot Reload Development
```bash
# File watching with hot reload
bun --watch --hot --inspect run index.ts

# Preserve terminal output
bun --watch --hot --no-clear-screen --inspect run index.ts
```

### Compile-time Constants
```bash
# Define environment variables at compile time
bun --define process.env.NODE_ENV:'development' --inspect run index.ts

# Define feature flags
bun --define process.env.DEBUG:'true' --inspect run index.ts
```

## 📊 Debugging Scenarios with Bun Features

### 1. MCP Tool Debugging with Enhanced Console
```typescript
// Set breakpoint in tool implementation
server.tool(
  "search-bun-docs",
  "Search Bun documentation",
  { query: z.string() },
  async ({ query }) => {
    // Enhanced console output with --console-depth 5
    console.log("Search parameters:", { query, timestamp: Date.now() });
    
    const results = await searchBunDocumentation(query);
    
    // Deep object inspection in debugging
    console.log("Search results:", results);
    
    return { content: [{ type: "text", text: results }] };
  }
);
```

### 2. Memory Profiling with --smol and --expose-gc
```typescript
// Debug memory usage patterns
async function processLargeData(data: any[]) {
  // Use gc() for manual garbage collection debugging
  if (global.gc) {
    console.log("Forcing garbage collection...");
    global.gc();
  }
  
  const processed = data.map(item => {
    // Memory-intensive processing
    return transformData(item);
  });
  
  // Monitor memory usage
  if (global.gc) {
    global.gc();
    console.log("Memory after processing:", process.memoryUsage());
  }
  
  return processed;
}
```

### 3. Hot Reload Development with --watch and --hot
```typescript
// File: mcp-server/index.ts
// Changes to this file will trigger automatic reload with --watch --hot

// Hot module replacement friendly exports
export const server = new McpServer({
  name: "odds-protocol-mcp",
  version: "1.0.0",
});

// Development-time debugging helpers
if (process.env.NODE_ENV === "development") {
  console.log("🚀 MCP Server starting in development mode");
  console.log("🔍 Debug features: --inspect --hot --console-depth 5");
}
```

### 4. Compile-time Constants with --define
```typescript
// Use compile-time constants for conditional debugging
const DEBUG_MODE = process.env.MCP_TEST_MODE === "true";

server.tool(
  "debug-tool",
  "Debug tool with conditional features",
  { input: z.string() },
  async ({ input }) => {
    if (DEBUG_MODE) {
      console.log("🐛 Debug mode active - detailed logging enabled");
      console.log("Input details:", { input, length: input.length, type: typeof input });
    }
    
    // Simplified logging for production
    console.log("Processing input:", input);
    
    return { content: [{ type: "text", text: `Processed: ${input}` }] };
  }
);
```

## 🔍 Common Issues and Bun-specific Solutions

### 1. Module Resolution with Bun
```bash
# Error: Cannot find module
# Solution: Use Bun's fast package manager
bun install --force

# Clear Bun's cache
bun pm cache rm
```

### 2. TypeScript Compilation with Bun
```bash
# Error: TypeScript compilation failed
# Solution: Use Bun's built-in TypeScript support
bun --tsconfig-override ./tsconfig.debug.json run index.ts

# Check types with Bun
bun run typecheck
```

### 3. Memory Issues with Large Datasets
```bash
# Solution: Use --smol flag for memory-constrained environments
bun --smol --inspect run index.ts

# Monitor memory usage
bun --expose-gc --inspect run index.ts
# In debugger: console.log(process.memoryUsage())
```

### 4. Hot Reload Not Working
```bash
# Ensure proper flag order (Bun flags first)
bun --watch --hot run index.ts

# Clear screen on reload (default)
bun --watch --hot run index.ts

# Preserve terminal output
bun --watch --hot --no-clear-screen run index.ts
```

## 📝 Debugging Checklist with Bun Features

### Before Debugging
- [ ] Install dependencies with `bun install`
- [ ] Build with `bun run build`
- [ ] Check TypeScript with `bun run typecheck`
- [ ] Choose appropriate Bun runtime flags

### During Debugging
- [ ] Set breakpoints in VS Code
- [ ] Configure console depth with `--console-depth`
- [ ] Enable hot reload with `--hot` for development
- [ ] Use `--smol` for memory-constrained debugging
- [ ] Monitor console output with enhanced object inspection

### Performance Debugging
- [ ] Use `--smol` for memory profiling
- [ ] Enable `--expose-gc` for manual garbage collection
- [ ] Monitor with `process.memoryUsage()`
- [ ] Use `--define` for compile-time constants

### After Debugging
- [ ] Remove debug flags for production
- [ ] Test without `--inspect` and `--hot`
- [ ] Verify memory usage is acceptable
- [ ] Update documentation with debugging insights

## 🎯 Best Practices for Bun Debugging

### 1. Flag Order and Placement
```bash
# ✅ Correct: Bun flags first
bun --inspect --hot --console-depth 5 run index.ts

# ❌ Incorrect: Flags after script name
bun run index.ts --inspect --hot
```

### 2. Environment-Specific Configurations
```bash
# Development: Full debugging features
bun --inspect --hot --console-depth 10 run index.ts

# Production: Minimal debugging with optimization
bun --inspect --smol run index.ts

# Testing: Breakpoint debugging with constants
bun --inspect-brk --define process.env.TEST:'true' run index.ts
```

### 3. Memory Management
```bash
# Memory-constrained environments
bun --smol --expose-gc run index.ts

# Large dataset processing
bun --expose-gc --console-depth 3 run index.ts
```

### 4. Hot Reload Development
```bash
# Fast development cycle
bun --watch --hot --no-clear-screen run index.ts

# File watching with debugging
bun --watch --inspect run index.ts
```

## 🔗 Additional Resources

### Bun Documentation
- [Bun Runtime Guide](https://bun.com/docs/runtime/bun-run)
- [Bun Debugging](https://bun.com/docs/guides/runtime/debugging)
- [Bun CLI Reference](https://bun.com/docs/cli/run)
- [Bun VS Code Extension](https://bun.com/docs/guides/runtime/vscode)

### Advanced Features
- [Memory Management with --smol](https://bun.com/docs/cli/run#--smol)
- [Hot Reload with --hot](https://bun.com/docs/cli/run#--hot)
- [Console Output Control](https://bun.com/docs/cli/run#--console-depth)
- [Compile-time Constants](https://bun.com/docs/cli/run#--define)

### Tools and Community
- [Chrome DevTools Integration](https://bun.com/docs/guides/runtime/debugging)
- [Bun Discord Community](https://discord.bun.com)
- [VS Code Marketplace](https://marketplace.visualstudio.com/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)

---

This enhanced debugging guide leverages Bun's advanced runtime features to provide comprehensive debugging capabilities for the MCP server. Use these configurations and techniques to efficiently debug issues, optimize performance, and streamline development workflows.
