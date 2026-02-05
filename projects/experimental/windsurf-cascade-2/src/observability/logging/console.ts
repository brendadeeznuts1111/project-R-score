// src/observability/logging/console.ts
//! Override console.log to respect terminal capabilities

// Store original methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;
const originalDebug = console.debug;

// Get current 13-byte config
function getCurrentConfig() {
  return {
    version: 2,
    registryHash: 0x12345678,
    featureFlags: 0x00000007,
    terminal: { 
      mode: "cooked", // Can be "raw", "cooked", or "disabled"
      rows: 48, 
      cols: 80,
      capabilities: {
        ansi: true, // Terminal supports ANSI colors
        unicode: true,
        utf8: true
      }
    },
    features: { PRIVATE_REGISTRY: true, PREMIUM_TYPES: true, DEBUG: true }
  };
}

// Performance tracking
function nanoseconds(): number {
  if (typeof Bun !== 'undefined' && Bun.nanoseconds) {
    return Bun.nanoseconds();
  }
  return Date.now() * 1000000;
}

// Override with 13-byte aware formatting
console.log = function(...args: any[]) {
  const start = nanoseconds();
  const config = getCurrentConfig();
  
  // If terminal.raw, output structured JSON (machine-readable)
  if (config.terminal.mode === "raw") {
    const obj = args.length === 1 ? args[0] : args;
    
    // Use %j for JSON (new in v1.3.5)
    let jsonString: string;
    if (typeof obj === 'string' && obj.includes('%j')) {
      // Handle %j format specifier
      const formatted = obj.replace(/%j/g, (match) => {
        const argIndex = args.indexOf(match) + 1;
        return JSON.stringify(args[argIndex], null, 2);
      });
      jsonString = formatted;
    } else {
      jsonString = JSON.stringify(obj, null, 2);
    }
    
    // Terminal width aware: wraps at cols from 13-byte config
    const lines = jsonString.split("\n");
    const wrapped = lines.map(line => {
      if (line.length > config.terminal.cols) {
        return line.slice(0, config.terminal.cols - 3) + "...";
      }
      return line;
    });
    
    originalLog.apply(console, wrapped);
    
    // Also pipe to logger for R2 (if DEBUG flag)
    if (config.features?.DEBUG) {
      logToStorage("@domain1", "console.log", { args, duration_ns: nanoseconds() - start });
    }
  } 
  // If ANSI capable, syntax highlight
  else if (config.terminal.capabilities.ansi) {
    // Use Bun's built-in syntax highlighting (450ns)
    try {
      if (typeof Bun !== 'undefined' && Bun.inspect) {
        const highlighted = Bun.inspect(args, { colors: true, depth: 5 });
        originalLog(highlighted);
      } else {
        // Fallback to colored output
        const colored = args.map(arg => {
          if (typeof arg === 'object') {
            return `\x1b[36m${JSON.stringify(arg, null, 2)}\x1b[0m`; // Cyan
          }
          return `\x1b[32m${arg}\x1b[0m`; // Green
        });
        originalLog.apply(console, colored);
      }
    } catch (error) {
      originalLog.apply(console, args);
    }
  } 
  // Plain text fallback
  else {
    originalLog.apply(console, args);
  }
  
  // Debug mode: log the log
  if (config.features?.DEBUG) {
    const duration = nanoseconds() - start;
    originalDebug(`[console.log] ${duration}ns`);
  }
};

// Override other console methods
console.error = function(...args: any[]) {
  const config = getCurrentConfig();
  
  if (config.terminal.mode === "raw") {
    const obj = args.length === 1 ? args[0] : args;
    const errorObj = { error: obj, timestamp: new Date().toISOString(), level: "error" };
    originalLog(JSON.stringify(errorObj, null, 2));
  } else if (config.terminal.capabilities.ansi) {
    originalError(`\x1b[31m${args.join(' ')}\x1b[0m`); // Red
  } else {
    originalError.apply(console, args);
  }
};

console.warn = function(...args: any[]) {
  const config = getCurrentConfig();
  
  if (config.terminal.mode === "raw") {
    const obj = args.length === 1 ? args[0] : args;
    const warnObj = { warning: obj, timestamp: new Date().toISOString(), level: "warn" };
    originalLog(JSON.stringify(warnObj, null, 2));
  } else if (config.terminal.capabilities.ansi) {
    originalWarn(`\x1b[33m${args.join(' ')}\x1b[0m`); // Yellow
  } else {
    originalWarn.apply(console, args);
  }
};

console.info = function(...args: any[]) {
  const config = getCurrentConfig();
  
  if (config.terminal.mode === "raw") {
    const obj = args.length === 1 ? args[0] : args;
    const infoObj = { info: obj, timestamp: new Date().toISOString(), level: "info" };
    originalLog(JSON.stringify(infoObj, null, 2));
  } else if (config.terminal.capabilities.ansi) {
    originalInfo(`\x1b[34m${args.join(' ')}\x1b[0m`); // Blue
  } else {
    originalInfo.apply(console, args);
  }
};

console.debug = function(...args: any[]) {
  const config = getCurrentConfig();
  
  if (config.features?.DEBUG) {
    if (config.terminal.mode === "raw") {
      const obj = args.length === 1 ? args[0] : args;
      const debugObj = { debug: obj, timestamp: new Date().toISOString(), level: "debug" };
      originalLog(JSON.stringify(debugObj, null, 2));
    } else if (config.terminal.capabilities.ansi) {
      originalDebug(`\x1b[35m${args.join(' ')}\x1b[0m`); // Magenta
    } else {
      originalDebug.apply(console, args);
    }
  }
};

// Mock storage logger (would integrate with R2 in production)
function logToStorage(domain: string, event: string, data: any) {
  // In production, this would log to SQLite/R2
  if (getCurrentConfig().features?.DEBUG) {
    console.log(`[STORAGE] ${domain}: ${event}`, data);
  }
}

// Export utilities
export function setTerminalMode(mode: "raw" | "cooked" | "disabled") {
  // This would update the 13-byte config in a real implementation
  console.log(`[TERMINAL] Mode set to: ${mode}`);
}

export function getTerminalInfo() {
  const config = getCurrentConfig();
  return {
    mode: config.terminal.mode,
    rows: config.terminal.rows,
    cols: config.terminal.cols,
    capabilities: config.terminal.capabilities,
    ansi: config.terminal.capabilities.ansi,
    width: config.terminal.cols
  };
}

// Usage examples
export function demonstrateConsoleFeatures() {
  console.log("🔧 Demonstrating 13-byte aware console features");
  
  // Example 1: %j format with JSON
  console.log("%j", { 
    action: "publish", 
    package: "@mycompany/pkg", 
    version: "2.0.0",
    config: getTerminalInfo()
  });
  
  // Example 2: Colored output in ANSI mode
  console.info("ℹ️  This is an info message");
  console.warn("⚠️  This is a warning");
  console.error("❌ This is an error");
  
  // Example 3: Debug output (only shown if DEBUG flag is enabled)
  console.debug("🐛 Debug information", { 
    timestamp: nanoseconds(),
    memory: process.memoryUsage(),
    config: getCurrentConfig()
  });
  
  // Example 4: Terminal width awareness
  const longString = "This is a very long string that should be wrapped according to the terminal width specified in the 13-byte config";
  console.log("Long string test:", longString);
}

// Initialize on import
console.log("🖥️  Terminal-aware console initialized with 13-byte config");
console.log("📊 Terminal info:", getTerminalInfo());
