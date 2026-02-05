/**
 * 🛡️ FACTORYWAGER SYSTEM PROBE v4.3.1 - Bulletproof TypeScript + Runtime Capability Detection
 * Zero-TypeScript-error guarantee with runtime fallbacks
 */

declare global {
  // Extend Bun types for missing APIs
  interface Bun {
    hash?: {
      crc32?: (input: string | ArrayBufferView | Blob) => number;
      sha256?: (input: string | ArrayBufferView | Blob) => Promise<Uint8Array>;
      wyhash?: (input: string | ArrayBufferView) => bigint;
    };
    stringWidth?: (str: string) => number;
    color?: (input: string) => {
      ansi16m: () => string;
      hex: () => string;
      rgba: () => { r: number; g: number; b: number; a: number };
    };
  }
}

interface SystemProfile {
  runtime: {
    bun: string;
    v8: string;
    pid: number;
  };
  platform: {
    os: NodeJS.Platform;
    arch: string;
    cpus: number;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    systemFree?: number;
  };
  capabilities: {
    color: boolean;
    crypto: boolean;
    sha256: boolean;
    crc32: boolean;
    stringWidth: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// SAFE CAPABILITY DETECTION - NO TYPE ERRORS
// ═══════════════════════════════════════════════════════════════
function detectCapabilities() {
  return {
    color: typeof (Bun as any).color === 'function',
    crypto: typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined',
    sha256: typeof (Bun as any).hash?.sha256 === 'function',
    crc32: typeof (Bun as any).hash?.crc32 === 'function',
    stringWidth: typeof (Bun as any).stringWidth === 'function',
  } as const;
}

// ═══════════════════════════════════════════════════════════════
// CPU COUNT VIA SYSCTL (DARWIN) OR FALLBACK
// ═══════════════════════════════════════════════════════════════
async function getCpuCount(): Promise<number> {
  if (process.platform !== 'darwin') {
    // Fallback for non-Darwin platforms
    return (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  }
  
  try {
    const proc = Bun.spawn(["sysctl", "-n", "hw.ncpu"], {
      stdout: "pipe",
    });
    
    const output = await new Response(proc.stdout).text();
    const count = parseInt(output.trim(), 10);
    return isNaN(count) ? 8 : count;
  } catch {
    return 8; // Conservative fallback
  }
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM MEMORY STATS (DARWIN VM)
// ═══════════════════════════════════════════════════════════════
async function getVmStats(): Promise<{ free: number; active: number; wired: number }> {
  if (process.platform !== 'darwin') {
    return { free: 0, active: 0, wired: 0 };
  }
  
  try {
    const proc = Bun.spawn(["vm_stat"], { stdout: "pipe" });
    const output = await new Response(proc.stdout).text();
    
    const pageSize = 4096; // Darwin default
    const stats: Record<string, number> = {};
    
    output.split('\n').forEach(line => {
      const match = line.match(/(.+):\s+(\d+)/);
      if (match) {
        stats[match[1].trim()] = parseInt(match[2], 10) * pageSize;
      }
    });
    
    return {
      free: stats["Pages free"] || 0,
      active: stats["Pages active"] || 0,
      wired: stats["Pages wired down"] || 0,
    };
  } catch {
    return { free: 0, active: 0, wired: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN DIAGNOSTIC COLLECTOR
// ═══════════════════════════════════════════════════════════════
export async function getSystemProfile(): Promise<SystemProfile> {
  const [cpuCount, vmStats, caps] = await Promise.all([
    getCpuCount(),
    getVmStats(),
    Promise.resolve(detectCapabilities()), // Sync but async for Promise.all
  ]);

  const mem = process.memoryUsage();

  return {
    runtime: {
      bun: Bun.version,
      v8: process.versions.v8 || 'unknown',
      pid: process.pid,
    },
    platform: {
      os: process.platform,
      arch: process.arch,
      cpus: cpuCount,
    },
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      systemFree: vmStats.free,
    },
    capabilities: caps,
  };
}

// ═══════════════════════════════════════════════════════════════
// QUICK SYNC PROBE FOR CLI ONE-LINERS
// ═══════════════════════════════════════════════════════════════
export function quickProbe(): Record<string, any> {
  const caps = detectCapabilities();
  const mem = process.memoryUsage();
  
  return {
    bun: Bun.version,
    arch: process.arch,
    platform: process.platform,
    cpus: caps.crc32 ? 'hw-accel' : 'baseline', // CRC32 indicates crypto extensions
    memoryMB: Math.round(mem.rss / 1024 / 1024),
    heapKB: Math.round(mem.heapUsed / 1024),
    ...caps,
    optimal: process.arch === 'arm64' && Bun.version.startsWith('1.3') && caps.crc32,
  };
}

// ═══════════════════════════════════════════════════════════════
// CHROMATIC STATUS RENDERER (USES BUN.COLOR IF AVAILABLE)
// ═══════════════════════════════════════════════════════════════
export function renderStatus(profile: SystemProfile): void {
  const gray = (Bun as any).color ? (Bun as any).color("hsl(0, 0%, 40%)", "ansi-16m") : "\x1b[90m";
  const green = (Bun as any).color ? (Bun as any).color("hsl(145, 80%, 45%)", "ansi-16m") : "\x1b[32m";
  const gold = (Bun as any).color ? (Bun as any).color("hsl(48, 100%, 60%)", "ansi-16m") : "\x1b[33m";
  const reset = "\x1b[0m";

  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`${gold}  FactoryWager System Probe v4.3.1${reset}`);
  console.log(`${gray}  ${profile.platform.os} ${profile.platform.arch} • ${profile.platform.cpus} cores${reset}`);
  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
  
  console.log(`  Bun: ${green}${profile.runtime.bun}${reset} | PID: ${profile.runtime.pid}`);
  console.log(`  Memory: ${Math.round(profile.memory.rss / 1024 / 1024)}MB RSS | ${Math.round(profile.memory.heapUsed / 1024)}KB heap`);
  
  console.log(`${gray}  Capabilities:${reset}`);
  Object.entries(profile.capabilities).forEach(([key, val]) => {
    const icon = val ? `${green}✓${reset}` : `${gray}○${reset}`;
    console.log(`    ${icon} ${key}`);
  });
  
  const status = profile.capabilities.crc32 && profile.capabilities.color 
    ? `${green}OPTIMAL${reset}` 
    : `${gray}DEGRADED${reset}`;
  console.log(`\n  Status: ${status}`);
  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE BENCHMARK SUITE
// ═══════════════════════════════════════════════════════════════
export async function runPerformanceBenchmark() {
  console.log('🚀 FactoryWager v4.3.1 Performance Benchmark');
  console.log('=' .repeat(50));

  const caps = detectCapabilities();

  // Bun.color HSL→ANSI benchmark
  let colorTime = 0;
  if (caps.color) {
    const colorStart = Bun.nanoseconds();
    for (let i = 0; i < 10000; i++) {
      (Bun as any).color("hsl(145, 80%, 45%)", "ansi-16m");
      (Bun as any).color("hsl(48, 100%, 60%)", "ansi-16m");
      (Bun as any).color("hsl(180, 60%, 55%)", "ansi-16m");
    }
    colorTime = (Bun.nanoseconds() - colorStart) / 1_000_000;
  }

  // Unicode padding benchmark
  let unicodeTime = 0;
  if (caps.stringWidth) {
    const unicodeStart = Bun.nanoseconds();
    const testStrings = ["中文测试", "🚀rocket", "👨‍💻developer", "한국어", "العربية"];
    for (let i = 0; i < 10000; i++) {
      testStrings.forEach(str => {
        (Bun as any).stringWidth?.(str) ?? str.length;
      });
    }
    unicodeTime = (Bun.nanoseconds() - unicodeStart) / 1_000_000;
  }

  // CRC32 benchmark (ARM64 hardware acceleration)
  let crcTime = 0;
  if (caps.crc32) {
    const crcStart = Bun.nanoseconds();
    for (let i = 0; i < 10000; i++) {
      (Bun as any).hash?.crc32("author-name-" + i);
      (Bun as any).hash?.crc32("test-key-" + i);
    }
    crcTime = (Bun.nanoseconds() - crcStart) / 1_000_000;
  }

  if (colorTime > 0) console.log(`🎨 Bun.color HSL→ANSI: ${colorTime.toFixed(2)}ms (30k ops)`);
  if (unicodeTime > 0) console.log(`🌐 Unicode padding: ${unicodeTime.toFixed(2)}ms (50k ops)`);
  if (crcTime > 0) console.log(`🔐 CRC32 hashing: ${crcTime.toFixed(2)}ms (20k ops)`);
  
  return {
    color: { total: colorTime, avg: colorTime / 30000 },
    unicode: { total: unicodeTime, avg: unicodeTime / 50000 },
    crc32: { total: crcTime, avg: crcTime / 20000 }
  };
}

// ═══════════════════════════════════════════════════════════════
// CLI EXECUTION
// ═══════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    console.table(quickProbe());
    return;
  }
  
  if (args.includes('--benchmark')) {
    await runPerformanceBenchmark();
    return;
  }
  
  const profile = await getSystemProfile();
  renderStatus(profile);
  
  if (args.includes('--benchmark-full')) {
    console.log();
    await runPerformanceBenchmark();
  }
}

// Execute if run directly
if (import.meta.main) {
  main().catch(console.error);
}

export { main as runDiagnostic };
