/**
 * System metrics helpers: CPU, memory, processes, queue badges.
 */

import * as os from "node:os";
import { spawn } from "bun";
import type {
  CpuMetrics,
  EnhancedMemoryMetrics,
  MemoryMetrics,
  ProcessInfo,
  QueueStats,
} from "../../types";
import { c, getThermalColor } from "./tui";

let prevCpuTimes: { idle: number; total: number } | null = null;

export function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }

  if (prevCpuTimes) {
    const idleDiff = idle - prevCpuTimes.idle;
    const totalDiff = total - prevCpuTimes.total;
    const usage = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
    prevCpuTimes = { idle, total };
    return Math.max(0, Math.min(100, usage));
  }

  prevCpuTimes = { idle, total };
  return 0;
}

export function getCpuMetrics(): CpuMetrics {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  return {
    usage: getCpuUsage(),
    cores: cpus.length,
    model: cpus[0]?.model || "Unknown",
    speed: cpus[0]?.speed || 0,
    loadAvg: loadAvg.map((l) => Math.round(l * 100) / 100),
  };
}

export function getMemoryMetrics(): MemoryMetrics {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const procMem = process.memoryUsage();

  return {
    total: totalMem,
    used: usedMem,
    free: freeMem,
    heapUsed: procMem.heapUsed,
    heapTotal: procMem.heapTotal,
    rss: procMem.rss,
    usagePercent: Math.round((usedMem / totalMem) * 100),
  };
}

export function getEnhancedMemoryMetrics(): EnhancedMemoryMetrics {
  const mem = process.memoryUsage();
  const rss = mem.rss;
  const heapUsed = mem.heapUsed;
  const heapTotal = mem.heapTotal;
  const external = mem.external || 0;
  const arrayBuffers = mem.arrayBuffers || 0;

  const efficiency = rss > 0 ? Math.round((heapUsed / rss) * 100) : 0;
  const overhead = rss - heapUsed;

  const heapUtilization = heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;
  let pressure: "low" | "medium" | "high" | "critical" = "low";
  if (heapUtilization > 90) pressure = "critical";
  else if (heapUtilization > 75) pressure = "high";
  else if (heapUtilization > 50) pressure = "medium";

  return {
    rss,
    heapUsed,
    heapTotal,
    external,
    arrayBuffers,
    efficiency,
    overhead,
    pressure,
  };
}

export function createQueueBadge(stats: QueueStats): string {
  const icon = stats.isThrottled ? "🔴" : stats.utilizationPercent > 50 ? "🟡" : "🟢";
  const thermalColor = getThermalColor(stats.utilizationPercent);
  const activeBar = "█".repeat(Math.min(8, stats.active));
  const emptyBar = "░".repeat(Math.max(0, 8 - stats.active));
  return `${icon} ${c.dim}Workers:${c.reset} ${thermalColor}[${activeBar}${c.dim}${emptyBar}${thermalColor}]${c.reset} ${stats.active}/${stats.maxConcurrent} ${stats.pending > 0 ? `${c.warn}+${stats.pending} queued${c.reset}` : ""}`;
}

export async function getTopProcesses(
  limit: number = 8,
  debug?: (label: string, data?: unknown) => void
): Promise<ProcessInfo[]> {
  try {
    const isMac = os.platform() === "darwin";

    const args = isMac
      ? ["ps", "-A", "-r", "-o", "pid=,pcpu=,rss=,comm="]
      : ["ps", "ax", "-o", "pid=,pcpu=,rss=,comm=", "--sort=-pcpu"];

    const proc = spawn(args, {
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0 || !output.trim()) {
      const fallback = spawn(["ps", "-eo", "pid,pcpu,rss,comm"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const fallbackOutput = await new Response(fallback.stdout).text();
      await fallback.exited;

      if (!fallbackOutput.trim()) {
        debug?.("getTopProcesses: fallback also empty");
        return [];
      }

      return parseProcessOutput(fallbackOutput, limit);
    }

    return parseProcessOutput(output, limit);
  } catch (err) {
    debug?.("getTopProcesses error", { error: String(err) });
    return [];
  }
}

export function parseProcessOutput(output: string, limit: number): ProcessInfo[] {
  const lines = output.trim().split("\n");
  const processes: ProcessInfo[] = [];

  for (const line of lines) {
    if (processes.length >= limit) break;

    if (line.includes("PID") || line.includes("CPU") || !line.trim()) continue;

    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
      const pid = parseInt(parts[0], 10);
      if (isNaN(pid)) continue;

      const cpu = parseFloat(parts[1]) || 0;
      const memory = (parseInt(parts[2], 10) || 0) * 1024;
      const name = parts.slice(3).join(" ");

      if (!name || name === "-" || name.length < 2) continue;

      processes.push({
        pid,
        name: name.length > 24 ? name.slice(0, 21) + "..." : name,
        cpu: Math.round(cpu * 10) / 10,
        memory,
        uptime: 0,
        status: "running",
      });
    }
  }

  return processes;
}
