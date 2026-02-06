# 🔫 Signal Handling Guide - Bun Test Process Integration

## 📋 Signal Types and Behaviors

### 🔫 SIGKILL (Signal 9) - **Cannot be Handled**
```bash
kill -SIGKILL <pid>
# or
kill -9 <pid>
```

**Characteristics:**
- ❌ **Cannot be caught** by the target process
- ⚡ **Immediate termination** - no cleanup possible
- 🔥 **Force kill** for unresponsive processes
- 📊 **Exit code**: Typically -1 or null

**Use Cases:**
- Process is completely unresponsive
- Graceful shutdown methods failed
- Emergency termination required
- System shutdown procedures

### 🛑 SIGTERM (Signal 15) - **Can Be Handled**
```bash
kill -SIGTERM <pid>
# or
kill -15 <pid>
# or
kill <pid> (default)
```

**Characteristics:**
- ✅ **Can be caught** and handled gracefully
- 🧹 **Graceful shutdown** with cleanup
- 📊 **Exit code**: 143 (128 + 15)

**Implementation:**
```typescript
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - cleaning up...');
  // Cleanup resources
  setTimeout(() => {
    process.exit(143);
  }, 1000);
});
```

### ⚡ SIGINT (Signal 2) - **Can Be Handled**
```bash
kill -SIGINT <pid>
# or
kill -2 <pid>
# or
Ctrl+C (in terminal)
```

**Characteristics:**
- ✅ **Can be caught** (Ctrl+C simulation)
- 🛑 **Interrupt handling** possible
- 📊 **Exit code**: 130 (128 + 2)

**Implementation:**
```typescript
process.on('SIGINT', () => {
  console.log('⚡ SIGINT received - interrupting...');
  // Handle interrupt
  setTimeout(() => {
    process.exit(130);
  }, 500);
});
```

## 🚀 Test Process Integration v2.8

### Signal Handling Implementation
The test integration framework properly handles:

```typescript
class TestProcessIntegration {
  setupSignalHandling(): void {
    // Graceful shutdown on SIGTERM
    const sigtermHandler = () => {
      console.log('🛑 SIGTERM received - gracefully stopping tests...');
      this.cleanup();
      process.exit(143);
    };

    // Immediate shutdown on SIGINT
    const sigintHandler = () => {
      console.log('⚡ SIGINT received - stopping test execution...');
      this.cleanup();
      process.exit(130);
    };

    process.on('SIGTERM', sigtermHandler);
    process.on('SIGINT', sigintHandler);
  }

  private cleanup(): void {
    console.log('🧹 Cleaning up test resources...');
    // Clear signal handlers
    // Force garbage collection
    // Close file handles
    // Network connections cleanup
  }
}
```

### Exit Code Analysis
The framework analyzes exit codes:

| Exit Code | Meaning | Cause |
|-----------|---------|-------|
| 0 | Success | All tests passed |
| 1 | Test Failures | Some tests failed |
| >1 | Unhandled Errors | Critical errors occurred |
| 130 | SIGINT | User interrupt (Ctrl+C) |
| 143 | SIGTERM | Graceful shutdown |
| -1/null | SIGKILL | Immediate termination |

## 🎯 Practical Examples

### Test the Signal Demo
```bash
# Start the signal demo
bun run utils/signal-demo-simple.ts

# In another terminal, try different signals:
kill -SIGTERM <pid>    # Graceful shutdown
kill -SIGINT <pid>     # Interrupt
kill -SIGUSR1 <pid>    # Custom signal
kill -SIGKILL <pid>    # Immediate termination
```

### Integration with Test Suite
```bash
# Run tests with signal handling
bun run utils/test-integration.ts --memory-optimized

# Send SIGTERM for graceful shutdown
kill -SIGTERM <test-pid>

# Send SIGKILL for immediate termination
kill -SIGKILL <test-pid>
```

## 💡 Best Practices

### ✅ Recommended Practices
1. **Always handle SIGTERM** for graceful shutdown
2. **Handle SIGINT** for user interrupts
3. **Use proper exit codes** (128 + signal number)
4. **Implement cleanup** in signal handlers
5. **Test signal handling** in your applications

### ❌ Avoid These
1. **Don't try to catch SIGKILL** (impossible by design)
2. **Don't ignore signals** without proper handling
3. **Don't use long-running operations** in signal handlers
4. **Don't forget to cleanup** resources
5. **Don't use wrong exit codes**

## 📊 Signal Handling in CI/CD

### GitHub Actions Integration
```typescript
// Automatic GitHub Actions annotations
if (process.env.GITHUB_ACTIONS) {
  process.stdout.write(`::notice::Signal received: ${signal}\n`);
  process.stdout.write(`::warning::Graceful shutdown initiated\n`);
}
```

### CI Environment Optimizations
```typescript
if (process.env.CI) {
  // Enable memory optimizations
  process.env.BUN_TEST_SMOL = 'true';
  
  // Disable animations
  process.env.NO_COLOR = '1';
  
  // Optimize for parallel execution
  process.env.BUN_TEST_POOL_SIZE = '4';
}
```

## 🔧 Advanced Signal Handling

### Custom Signal Handlers
```typescript
// Handle multiple signals
const signals = ['SIGTERM', 'SIGINT', 'SIGUSR1', 'SIGUSR2'];

signals.forEach(signal => {
  process.on(signal, () => {
    console.log(`📡 ${signal} received`);
    handleSignal(signal);
  });
});

function handleSignal(signal: string): void {
  switch (signal) {
    case 'SIGTERM':
      gracefulShutdown();
      break;
    case 'SIGINT':
      interruptHandler();
      break;
    case 'SIGUSR1':
      customHandler();
      break;
    default:
      console.log(`Unknown signal: ${signal}`);
  }
}
```

### Signal-Specific Cleanup
```typescript
class ResourceManager {
  private resources: Array<() => void> = [];

  addCleanup(cleanupFn: () => void): void {
    this.resources.push(cleanupFn);
  }

  async cleanup(signal: string): Promise<void> {
    console.log(`🧹 Cleaning up due to ${signal}...`);
    
    // Run cleanup in reverse order
    for (const cleanup of this.resources.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    console.log('✅ Cleanup complete');
  }
}
```

## 🚨 Error Handling

### Signal Handler Errors
```typescript
process.on('SIGTERM', async () => {
  try {
    await gracefulShutdown();
  } catch (error) {
    console.error('Shutdown error:', error);
    process.exit(1); // Exit with error code
  }
});
```

### Timeout Protection
```typescript
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - starting shutdown...');
  
  const timeout = setTimeout(() => {
    console.log('⏰ Shutdown timeout - forcing exit');
    process.exit(1);
  }, 5000); // 5 second timeout
  
  gracefulShutdown().then(() => {
    clearTimeout(timeout);
    process.exit(143);
  });
});
```

## 📈 Monitoring and Debugging

### Signal Logging
```typescript
function logSignal(signal: string, pid: number): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Signal ${signal} sent to PID ${pid}`);
  
  // Log to file for debugging
  Bun.appendFile('signals.log', 
    `${timestamp} ${signal} ${pid}\n`
  );
}
```

### Process State Monitoring
```typescript
function monitorProcess(): void {
  const memory = process.memoryUsage();
  const uptime = process.uptime();
  
  console.log(`📊 Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`⏱️  Uptime: ${uptime.toFixed(2)}s`);
  console.log(`🔄 PID: ${process.pid}`);
}
```

---

## 🎯 Summary

- **SIGKILL**: Cannot be handled, immediate termination
- **SIGTERM**: Graceful shutdown, can be handled
- **SIGINT**: User interrupt, can be handled
- **Test Integration**: Proper signal handling with cleanup
- **Best Practices**: Handle signals, use proper exit codes, cleanup resources

The Test Process Integration v2.8 framework provides comprehensive signal handling for reliable test execution! 🚀
