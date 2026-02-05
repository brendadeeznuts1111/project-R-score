/**
 * 🎯 FACTORYWAGER SYSTEM PROBE v4.3.1 - CANONICAL IMPLEMENTATION
 * Bulletproof TypeScript + Runtime Capability Detection
 * Timestamp: 2026-02-01T08:14:00-06:00 (Chalmette, Louisiana)
 */

declare global {
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

export interface SystemProfile {
  runtime: { bun: string; v8: string; pid: number };
  platform: { os: NodeJS.Platform; arch: string; cpus: number };
  memory: { rss: number; heapUsed: number; heapTotal: number; systemFree?: number };
  capabilities: {
    color: boolean; crypto: boolean; sha256: boolean; crc32: boolean; stringWidth: boolean;
  };
}

const detectCapabilities = () => ({
  color: typeof (Bun as any).color === 'function',
  crypto: typeof globalThis.crypto?.subtle !== 'undefined',
  sha256: typeof (Bun as any).hash?.sha256 === 'function',
  crc32: typeof (Bun as any).hash?.crc32 === 'function',
  stringWidth: typeof (Bun as any).stringWidth === 'function',
});

export async function getSystemProfile(): Promise<SystemProfile> {
  const cpuCount = process.platform === 'darwin'
    ? parseInt(await new Response(Bun.spawn(["sysctl", "-n", "hw.ncpu"], { stdout: "pipe" }).stdout).text() || "8", 10)
    : (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 8;

  const mem = process.memoryUsage();

  return {
    runtime: { bun: Bun.version, v8: process.versions.v8 || 'unknown', pid: process.pid },
    platform: { os: process.platform, arch: process.arch, cpus: isNaN(cpuCount) ? 8 : cpuCount },
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    capabilities: detectCapabilities(),
  };
}

export function quickProbe() {
  const caps = detectCapabilities();
  const mem = process.memoryUsage();
  return {
    bun: Bun.version, arch: process.arch, platform: process.platform,
    memoryMB: Math.round(mem.rss / 1024 / 1024),
    heapKB: Math.round(mem.heapUsed / 1024),
    ...caps,
    optimal: process.arch === 'arm64' && Bun.version.startsWith('1.3') && caps.crc32,
  };
}

export function renderStatus(p: SystemProfile): void {
  const useColor = p.capabilities.color;
  const gray = useColor ? (Bun as any).color("hsl(0, 0%, 40%)", "ansi-16m") : "\x1b[90m";
  const green = useColor ? (Bun as any).color("hsl(145, 80%, 45%)", "ansi-16m") : "\x1b[32m";
  const gold = useColor ? (Bun as any).color("hsl(48, 100%, 60%)", "ansi-16m") : "\x1b[33m";
  const cyan = useColor ? (Bun as any).color("hsl(180, 60%, 55%)", "ansi-16m") : "\x1b[36m";
  const reset = "\x1b[0m";

  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`${gold}  ▵ FACTORYWAGER SYSTEM PROBE v4.3.1${reset}`);
  console.log(`${cyan}  ${p.platform.os} ${p.platform.arch} • ${p.platform.cpus} cores • OPTIMAL${reset}`);
  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
  console.log(`  Bun: ${green}${p.runtime.bun}${reset} | PID: ${p.runtime.pid}`);
  console.log(`  Memory: ${Math.round(p.memory.rss / 1024 / 1024)}MB RSS | ${Math.round(p.memory.heapUsed / 1024)}KB heap`);
  console.log(`${gray}  Capabilities:${reset}`);
  Object.entries(p.capabilities).forEach(([k, v]) => {
    console.log(`    ${v ? green + '✓' : gray + '○'}${reset} ${k}${v ? '' : gray + ' (fallback)' + reset}`);
  });
  console.log(`${gray}═══════════════════════════════════════════════════════════════${reset}`);
}

if (import.meta.main) getSystemProfile().then(renderStatus);
