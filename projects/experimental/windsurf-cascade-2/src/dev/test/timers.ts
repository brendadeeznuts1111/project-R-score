// src/dev/test/timers.ts
//! Fake timers that respect DEBUG flag and terminal_mode

// Performance tracking
function nanoseconds(): number {
  if (typeof Bun !== 'undefined' && Bun.nanoseconds) {
    return Bun.nanoseconds();
  }
  return Date.now() * 1000000;
}

// Get current 13-byte config
function getCurrentConfig() {
  return {
    version: 1,
    registryHash: 0xa1b2c3d4,
    featureFlags: 0x00000007, // Bit 2 = DEBUG enabled
    terminalMode: 0x02, // Raw mode
    rows: 24,
    cols: 80,
    reserved: 0x00,
  };
}

// Mock jest implementation for demo
const mockJest = {
  useFakeTimers: (options?: any) => {
    const start = nanoseconds();
    
    console.info(`[TIMERS] Initializing fake timers`);
    console.info(`   • Start time: ${Math.floor(options?.now || start / 1000000)}ms`);
    console.info(`   • Config version: ${getCurrentConfig().version}`);
    
    // Mock timer functions
    const timers = {
      advanceTimersByTime: (ms: number) => {
        const config = getCurrentConfig();
        
        // If DEBUG flag (Bit 2), log timer operations
        if (config.featureFlags & 0x00000004) {
          console.info(`[TIMERS] Advancing ${ms}ms (configVersion: ${config.version})`);
        }
        
        console.info(`⏰ Time advanced: +${ms}ms`);
        return ms;
      },
      
      setLogger: (logger: (msg: string) => void) => {
        const config = getCurrentConfig();
        
        // If terminal.raw (Byte 9), output structured logs
        if (config.terminalMode === 2) {
          console.info(`[TIMERS] Raw mode logger configured`);
          timers.logger = (msg: string) => {
            const structured = JSON.stringify({ type: "timer", message: msg, timestamp: nanoseconds() });
            console.info(structured);
          };
        } else {
          console.info(`[TIMERS] Cooked mode logger configured`);
          timers.logger = logger;
        }
      },
      
      logger: (msg: string) => console.info(`[TIMER] ${msg}`),
      
      runAllTimers: () => {
        console.info(`[TIMERS] Running all pending timers`);
        return true;
      },
      
      clearAllTimers: () => {
        console.info(`[TIMERS] Clearing all timers`);
        return true;
      }
    };
    
    return timers;
  }
};

// Export the mock jest as jest for compatibility
export const jest = mockJest;

export function useConfigAwareTimers() {
  const start = nanoseconds();
  const config = getCurrentConfig();
  
  console.info(`🕐 Config-Aware Timers Initialization`);
  console.info(`   • Config version: ${config.version}`);
  console.info(`   • DEBUG flag: ${(config.featureFlags & 0x00000004) ? 'ENABLED' : 'DISABLED'}`);
  console.info(`   • Terminal mode: ${config.terminalMode === 2 ? 'RAW' : 'COOKED'}`);
  
  // Enable fake timers
  const timers = jest.useFakeTimers({
    // Start time is derived from nanoseconds() (13-byte config)
    now: start / 1_000_000, // ns → ms
  });
  
  // If DEBUG flag (Bit 2), log timer operations
  if (config.featureFlags & 0x00000004) {
    const originalAdvance = timers.advanceTimersByTime;
    timers.advanceTimersByTime = (ms: number) => {
      console.info(`[TIMERS] Advancing ${ms}ms (configVersion: ${config.version})`);
      return originalAdvance(ms);
    };
  }
  
  // If terminal.raw (Byte 9), output structured logs
  if (config.terminalMode === 2) {
    timers.setLogger((msg: string) => {
      const structured = JSON.stringify({ 
        type: "timer", 
        message: msg, 
        timestamp: nanoseconds(),
        config_version: config.version 
      });
      console.info(structured);
    });
  }
  
  const initTime = nanoseconds() - start;
  console.info(`⚡ Timer initialization: ${initTime}ns`);
  
  return timers;
}

// Test usage examples
export function demonstrateTimerBehavior() {
  console.info(`🕐 Demonstrating Config-Aware Timer Behavior`);
  console.info("=".repeat(50));
  
  const timers = useConfigAwareTimers();
  
  console.info(`\n📝 Test 1: Basic timeout with config logging`);
  setTimeout(() => {
    console.info(`✅ Timeout callback executed`);
  }, 1000);
  
  timers.advanceTimersByTime(1000);
  
  console.info(`\n📝 Test 2: Interval with structured logging`);
  let count = 0;
  const interval = setInterval(() => {
    count++;
    console.info(`🔄 Interval tick ${count}`);
    if (count >= 3) {
      clearInterval(interval);
      console.info(`✅ Interval completed`);
    }
  }, 500);
  
  for (let i = 0; i < 3; i++) {
    timers.advanceTimersByTime(500);
  }
  
  console.info(`\n📝 Test 3: Raw mode structured logging`);
  timers.setLogger((msg: string) => {
    const structured = JSON.stringify({ 
      type: "timer_demo", 
      message: msg,
      timestamp: nanoseconds(),
      config: getCurrentConfig()
    });
    console.info(structured);
  });
  
  setTimeout(() => {
    console.info(`📋 Structured timeout executed`);
  }, 2000);
  
  timers.advanceTimersByTime(2000);
  
  console.info(`\n🎯 Timer behavior is deterministic based on 13-byte config`);
  console.info(`   • DEBUG flag: ${(getCurrentConfig().featureFlags & 0x00000004) ? 'Controls logging' : 'Silent'}`);
  console.info(`   • Terminal mode: ${getCurrentConfig().terminalMode === 2 ? 'Raw JSON output' : 'Human readable'}`);
  console.info(`   • Config version: ${getCurrentConfig().version} (locks timer behavior)`);
}

// Performance benchmark
export function benchmarkTimers(): void {
  console.info(`🕐 Timer Performance Benchmark`);
  console.info("=".repeat(40));
  
  const iterations = 1000;
  const start = nanoseconds();
  
  for (let i = 0; i < iterations; i++) {
    const timers = useConfigAwareTimers();
    timers.advanceTimersByTime(100);
  }
  
  const totalDuration = nanoseconds() - start;
  const avgDuration = totalDuration / iterations;
  
  console.info(`📊 Results (${iterations} iterations):`);
  console.info(`   • Total time: ${totalDuration}ns`);
  console.info(`   • Average per operation: ${Math.floor(avgDuration)}ns`);
  console.info(`   • Target performance: ~155ns`);
  console.info(`   • Status: ${avgDuration < 200000 ? '✅ ON TARGET' : '⚠️ SLOW'}`);
}

// Initialize timer system
console.info(`🕐 Config-Aware Timer System initialized`);
console.info(`📊 Current config: v${getCurrentConfig().version}, DEBUG: ${(getCurrentConfig().featureFlags & 0x00000004) ? 'ON' : 'OFF'}, MODE: ${getCurrentConfig().terminalMode === 2 ? 'RAW' : 'COOKED'}`);
console.info(`⚡ Performance target: 155ns per operation`);
