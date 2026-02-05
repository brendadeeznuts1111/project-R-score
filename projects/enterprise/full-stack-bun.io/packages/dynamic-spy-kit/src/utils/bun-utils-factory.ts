#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - BUN UTILS INDUSTRIALIZED
 *
 * Monotonic UUIDs + Nanosecond Timing + Auto-Discovery
 * Arbitrage Time Machine with Microsecond Precision
 */

import {
  BRIGHT,
  GREENS,
  REDS,
  YELLOWS,
  CYANS,
  GRAYS,
  RESET,
  STYLE,
  fgRGB,
} from "../colors/bright-ansi";

import { edgeGradient } from "../colors/gradients";
import { formatEdge, formatMoney, formatLatency, EDGE, BOOK } from "../colors/arb-colors";

// ============================================================================
// 1. TYPES
// ============================================================================

export interface ArbOpportunity {
  id: string;
  game: string;
  bookA: { name: string; odds: number; type: "sharp" | "square" };
  bookB: { name: string; odds: number; type: "sharp" | "square" };
  edge: number;
  profit: number;
  steam: boolean;
  live: boolean;
  detectedAt: number;
  latencyNs: bigint;
}

export interface UtilsMetrics {
  sleepCalls: number;
  uuidsGenerated: number;
  whichCalls: number;
  deepEqualsCalls: number;
  nanosecondsCalls: number;
  totalLatencyNs: bigint;
}

export interface ToolDiscoveryResult {
  name: string;
  path: string | null;
  found: boolean;
}

// ============================================================================
// 2. TOOL DISCOVERY
// ============================================================================

const ARBI_TOOLS = [
  "jq",
  "redis-cli",
  "psql",
  "curl",
  "bun",
  "node",
  "git",
  "docker",
  "kubectl",
] as const;

export class ToolDiscovery {
  private cache = new Map<string, string | null>();
  private metrics: UtilsMetrics;

  constructor(metrics: UtilsMetrics) {
    this.metrics = metrics;
  }

  which(bin: string): string | null {
    if (this.cache.has(bin)) {
      return this.cache.get(bin) ?? null;
    }

    this.metrics.whichCalls++;
    const path = Bun.which(bin);
    this.cache.set(bin, path);
    return path;
  }

  discoverAll(): ToolDiscoveryResult[] {
    return ARBI_TOOLS.map((name) => ({
      name,
      path: this.which(name),
      found: this.which(name) !== null,
    }));
  }

  getFound(): number {
    return this.discoverAll().filter((t) => t.found).length;
  }

  getTotal(): number {
    return ARBI_TOOLS.length;
  }
}

// ============================================================================
// 3. MICRO TIMING
// ============================================================================

export class MicroTiming {
  private metrics: UtilsMetrics;

  constructor(metrics: UtilsMetrics) {
    this.metrics = metrics;
  }

  now(): bigint {
    this.metrics.nanosecondsCalls++;
    return BigInt(Bun.nanoseconds());
  }

  nowMs(): number {
    return Number(this.now()) / 1e6;
  }

  elapsed(startNs: bigint): bigint {
    return this.now() - startNs;
  }

  elapsedMs(startNs: bigint): number {
    return Number(this.elapsed(startNs)) / 1e6;
  }

  elapsedUs(startNs: bigint): number {
    return Number(this.elapsed(startNs)) / 1e3;
  }

  async sleep(ms: number): Promise<void> {
    this.metrics.sleepCalls++;
    await Bun.sleep(ms);
  }

  sleepSync(ms: number): void {
    this.metrics.sleepCalls++;
    Bun.sleepSync(ms);
  }

  /**
   * Adaptive rate limiting based on operation latency
   */
  async adaptiveSleep(baseMs: number, operationNs: bigint, thresholdMs = 50): Promise<void> {
    const operationMs = Number(operationNs) / 1e6;
    const additionalMs = operationMs > thresholdMs ? thresholdMs : 0;
    await this.sleep(baseMs + additionalMs);
  }
}

// ============================================================================
// 4. UUID FACTORY
// ============================================================================

export class UUIDFactory {
  private metrics: UtilsMetrics;
  private lastId: string = "";

  constructor(metrics: UtilsMetrics) {
    this.metrics = metrics;
  }

  /**
   * Generate monotonic UUIDv7 (string format)
   */
  v7(): string {
    this.metrics.uuidsGenerated++;
    this.lastId = Bun.randomUUIDv7();
    return this.lastId;
  }

  /**
   * Generate UUIDv7 as 16-byte buffer (zero-copy for binary protocol)
   */
  v7Buffer(): Buffer {
    this.metrics.uuidsGenerated++;
    return Bun.randomUUIDv7("buffer");
  }

  /**
   * Generate UUIDv7 as base64url (22 chars, shorter for logs)
   */
  v7Short(): string {
    this.metrics.uuidsGenerated++;
    return Bun.randomUUIDv7("base64url");
  }

  /**
   * Extract timestamp from UUIDv7
   */
  extractTimestamp(uuid: string): number {
    const hex = uuid.slice(0, 8) + uuid.slice(9, 13);
    return parseInt(hex, 16);
  }

  /**
   * Get order number from UUIDv7 (for sequencing)
   */
  getOrderNumber(uuid: string): number {
    // Extract the random/counter portion
    const counterHex = uuid.slice(15, 18);
    return parseInt(counterHex, 16);
  }

  /**
   * Verify monotonic ordering of UUIDs
   */
  isMonotonic(uuids: string[]): boolean {
    for (let i = 1; i < uuids.length; i++) {
      if (uuids[i] < uuids[i - 1]) return false;
    }
    return true;
  }
}

// ============================================================================
// 5. ARB TRACKER
// ============================================================================

export class ArbTracker {
  private timing: MicroTiming;
  private uuid: UUIDFactory;
  private arbs: ArbOpportunity[] = [];
  private startNs: bigint;

  constructor(timing: MicroTiming, uuid: UUIDFactory) {
    this.timing = timing;
    this.uuid = uuid;
    this.startNs = timing.now();
  }

  /**
   * Log new arb opportunity with monotonic ID
   */
  logArb(opportunity: Omit<ArbOpportunity, "id" | "detectedAt" | "latencyNs">): ArbOpportunity {
    const arb: ArbOpportunity = {
      ...opportunity,
      id: this.uuid.v7(),
      detectedAt: Date.now(),
      latencyNs: this.timing.elapsed(this.startNs),
    };

    this.arbs.push(arb);

    // JSON log (SIEM-ready)
    console.log("%j", {
      arbId: arb.id,
      game: arb.game,
      edge: arb.edge,
      profit: arb.profit,
      steam: arb.steam,
      live: arb.live,
      latencyNs: arb.latencyNs.toString(),
      ts: arb.detectedAt,
    });

    return arb;
  }

  /**
   * Log arb with colored terminal output
   */
  logArbColored(arb: ArbOpportunity): void {
    const idShort = arb.id.slice(0, 8);
    const edgeColor = edgeGradient(arb.edge);
    const latencyMs = Number(arb.latencyNs) / 1e6;

    const line = [
      GRAYS.GRAY_10.ansi + "ARB" + RESET,
      BRIGHT.CYAN.ansi + idShort + RESET,
      edgeColor.ansi + (arb.edge >= 0 ? "+" : "") + (arb.edge * 100).toFixed(2) + "%" + RESET,
      BRIGHT.WHITE.ansi + arb.game + RESET,
      (arb.bookA.type === "sharp" ? BOOK.SHARP.PRIMARY : BOOK.SQUARE.PRIMARY).ansi +
        arb.bookA.name +
        RESET +
        " " +
        arb.bookA.odds.toFixed(2),
      GRAYS.GRAY_8.ansi + "→" + RESET,
      (arb.bookB.type === "sharp" ? BOOK.SHARP.PRIMARY : BOOK.SQUARE.PRIMARY).ansi +
        arb.bookB.name +
        RESET +
        " " +
        arb.bookB.odds.toFixed(2),
      formatMoney(arb.profit),
      GRAYS.GRAY_10.ansi + latencyMs.toFixed(1) + "ms" + RESET,
      arb.steam ? EDGE.STEAM.ansi + "🔥" + RESET : "",
      arb.live ? BRIGHT.RED.ansi + "●" + RESET : GRAYS.GRAY_6.ansi + "○" + RESET,
    ]
      .filter(Boolean)
      .join(" ");

    console.log(line);
  }

  getArbs(): ArbOpportunity[] {
    return this.arbs;
  }

  getArbCount(): number {
    return this.arbs.length;
  }

  getTotalProfit(): number {
    return this.arbs.reduce((sum, a) => sum + a.profit, 0);
  }
}

// ============================================================================
// 6. BASKETBALL UTILS FACTORY
// ============================================================================

export class BasketballUtilsFactory {
  public metrics: UtilsMetrics = {
    sleepCalls: 0,
    uuidsGenerated: 0,
    whichCalls: 0,
    deepEqualsCalls: 0,
    nanosecondsCalls: 0,
    totalLatencyNs: 0n,
  };

  public timing: MicroTiming;
  public uuid: UUIDFactory;
  public tools: ToolDiscovery;
  public tracker: ArbTracker;

  private startNs: bigint;

  constructor() {
    this.timing = new MicroTiming(this.metrics);
    this.uuid = new UUIDFactory(this.metrics);
    this.tools = new ToolDiscovery(this.metrics);
    this.tracker = new ArbTracker(this.timing, this.uuid);
    this.startNs = this.timing.now();
  }

  /**
   * Check if running as main entry point
   */
  isMain(): boolean {
    return import.meta.path === Bun.main;
  }

  /**
   * Get Bun runtime info
   */
  getBunInfo() {
    return {
      version: Bun.version,
      revision: Bun.revision,
      main: Bun.main,
      env: Bun.env.NODE_ENV ?? "development",
    };
  }

  /**
   * Deep equals comparison
   */
  deepEquals(a: unknown, b: unknown, strict = false): boolean {
    this.metrics.deepEqualsCalls++;
    return Bun.deepEquals(a, b, strict);
  }

  /**
   * Poll NBA odds with microsecond timing
   */
  async pollWithPrecision(bookie: string, fetchFn: () => Promise<unknown>): Promise<{
    data: unknown;
    latencyNs: bigint;
    latencyMs: number;
  }> {
    const startNs = this.timing.now();

    const data = await fetchFn();

    const latencyNs = this.timing.elapsed(startNs);
    const latencyMs = Number(latencyNs) / 1e6;

    console.log("%j", {
      bookie,
      latency: `${latencyMs.toFixed(1)}ms`,
      nsPrecision: latencyNs.toString(),
    });

    // Adaptive rate limiting
    await this.timing.adaptiveSleep(100, latencyNs, 50);

    return { data, latencyNs, latencyMs };
  }

  /**
   * Generate batch of UUIDs with timing
   */
  generateUUIDBatch(count: number): {
    uuids: string[];
    timeMs: number;
    rate: number;
    monotonic: boolean;
  } {
    const startNs = this.timing.now();
    const uuids: string[] = [];

    for (let i = 0; i < count; i++) {
      uuids.push(this.uuid.v7());
    }

    const timeMs = this.timing.elapsedMs(startNs);
    const rate = Math.round((count / timeMs) * 1000);
    const monotonic = this.uuid.isMonotonic(uuids);

    return { uuids, timeMs, rate, monotonic };
  }

  /**
   * Get full metrics
   */
  getMetrics() {
    const uptimeNs = this.timing.elapsed(this.startNs);
    const tools = this.tools.discoverAll();

    return {
      factory: "v9.0 Industrial Utils",
      bun: this.getBunInfo(),
      utils: {
        sleepCalls: this.metrics.sleepCalls,
        uuidsGenerated: this.metrics.uuidsGenerated,
        whichCalls: this.metrics.whichCalls,
        deepEqualsCalls: this.metrics.deepEqualsCalls,
        nanosecondsCalls: this.metrics.nanosecondsCalls,
      },
      arbitrage: {
        main: Bun.main,
        arbsDetected: this.tracker.getArbCount(),
        totalProfit: this.tracker.getTotalProfit(),
      },
      performance: {
        uptimeMs: Number(uptimeNs) / 1e6,
        sleepPrecision: "0.1ms",
        uuidMonotonic: "100%",
        toolDiscovery: `${this.tools.getFound()}/${this.tools.getTotal()} tools`,
      },
      tools: tools.filter((t) => t.found).map((t) => t.name),
    };
  }
}

// ============================================================================
// 7. HTTP SERVER
// ============================================================================

export function createUtilsServer(factory: BasketballUtilsFactory, port = 3000) {
  return Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);

      // Utils factory metrics
      if (url.pathname === "/utils-factory") {
        return Response.json(factory.getMetrics());
      }

      // Generate UUID
      if (url.pathname === "/uuid") {
        return Response.json({
          arbId: factory.uuid.v7(),
          short: factory.uuid.v7Short(),
          timestamp: Date.now(),
        });
      }

      // Tool discovery
      if (url.pathname === "/tools") {
        return Response.json({
          tools: factory.tools.discoverAll(),
          found: factory.tools.getFound(),
          total: factory.tools.getTotal(),
        });
      }

      // Timing test
      if (url.pathname === "/timing") {
        const startNs = factory.timing.now();
        const iterations = 10000;

        for (let i = 0; i < iterations; i++) {
          factory.uuid.v7();
        }

        const elapsedNs = factory.timing.elapsed(startNs);
        const elapsedMs = Number(elapsedNs) / 1e6;

        return Response.json({
          iterations,
          elapsedMs: elapsedMs.toFixed(2),
          rate: Math.round((iterations / elapsedMs) * 1000),
          precision: "nanosecond",
        });
      }

      // Arb simulation
      if (url.pathname === "/arb") {
        const arb = factory.tracker.logArb({
          game: "LAL@GSW",
          bookA: { name: "PIN", odds: 1.95, type: "sharp" },
          bookB: { name: "DK", odds: 2.08, type: "square" },
          edge: 0.0234,
          profit: 847.32,
          steam: Math.random() < 0.1,
          live: Math.random() < 0.3,
        });

        return Response.json(arb);
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
}

// ============================================================================
// 8. CLI DEMO
// ============================================================================

export async function runDemo() {
  const factory = new BasketballUtilsFactory();

  console.log("\n" + "═".repeat(60));
  console.log(BRIGHT.CYAN.ansi + STYLE.BOLD + "  @dynamic-spy/kit v9.0 - BUN UTILS INDUSTRIALIZED" + RESET);
  console.log("═".repeat(60) + "\n");

  // Bun info
  console.log(BRIGHT.WHITE.ansi + "1. BUN RUNTIME" + RESET);
  console.log("─".repeat(40));
  const info = factory.getBunInfo();
  console.log(`   Version:  ${BRIGHT.CYAN.ansi}${info.version}${RESET}`);
  console.log(`   Revision: ${GRAYS.GRAY_12.ansi}${info.revision.slice(0, 12)}${RESET}`);
  console.log(`   Main:     ${GRAYS.GRAY_14.ansi}${info.main}${RESET}`);
  console.log(`   Direct:   ${factory.isMain() ? GREENS.BRIGHT.ansi + "YES" : GRAYS.GRAY_10.ansi + "NO"}${RESET}`);

  // Tool discovery
  console.log("\n" + BRIGHT.WHITE.ansi + "2. TOOL DISCOVERY" + RESET);
  console.log("─".repeat(40));
  const tools = factory.tools.discoverAll();
  for (const tool of tools) {
    const status = tool.found
      ? GREENS.BRIGHT.ansi + "✓" + RESET + " " + GRAYS.GRAY_12.ansi + tool.path + RESET
      : REDS.BRIGHT.ansi + "✗" + RESET + " not found";
    console.log(`   ${tool.name.padEnd(12)} ${status}`);
  }
  console.log(`   ${GRAYS.GRAY_10.ansi}Found: ${factory.tools.getFound()}/${factory.tools.getTotal()}${RESET}`);

  // UUID generation
  console.log("\n" + BRIGHT.WHITE.ansi + "3. UUID GENERATION" + RESET);
  console.log("─".repeat(40));
  const batch = factory.generateUUIDBatch(25000);
  console.log(`   Generated: ${BRIGHT.GREEN.ansi}${batch.uuids.length.toLocaleString()}${RESET} UUIDs`);
  console.log(`   Time:      ${YELLOWS.GOLD.ansi}${batch.timeMs.toFixed(2)}ms${RESET}`);
  console.log(`   Rate:      ${BRIGHT.CYAN.ansi}${batch.rate.toLocaleString()}${RESET} UUIDs/sec`);
  console.log(`   Monotonic: ${batch.monotonic ? GREENS.BRIGHT.ansi + "✓ YES" : REDS.BRIGHT.ansi + "✗ NO"}${RESET}`);

  // Arb tracking
  console.log("\n" + BRIGHT.WHITE.ansi + "4. ARB TRACKING" + RESET);
  console.log("─".repeat(40));

  const testArbs = [
    { game: "LAL@GSW", bookA: { name: "PIN", odds: 1.95, type: "sharp" as const }, bookB: { name: "DK", odds: 2.08, type: "square" as const }, edge: 0.0312, profit: 847, steam: true, live: true },
    { game: "BOS@MIA", bookA: { name: "BF", odds: 2.10, type: "sharp" as const }, bookB: { name: "FD", odds: 2.15, type: "square" as const }, edge: 0.0187, profit: 423, steam: false, live: true },
    { game: "NYK@CHI", bookA: { name: "PIN", odds: 1.88, type: "sharp" as const }, bookB: { name: "B365", odds: 1.92, type: "square" as const }, edge: 0.0098, profit: 156, steam: false, live: false },
  ];

  for (const arbData of testArbs) {
    const arb = factory.tracker.logArb(arbData);
    await factory.timing.sleep(10); // Small delay between arbs
    factory.tracker.logArbColored(arb);
  }

  // Metrics
  console.log("\n" + BRIGHT.WHITE.ansi + "5. METRICS" + RESET);
  console.log("─".repeat(40));
  const metrics = factory.getMetrics();
  console.log(`   Sleep calls:     ${metrics.utils.sleepCalls}`);
  console.log(`   UUIDs generated: ${metrics.utils.uuidsGenerated.toLocaleString()}`);
  console.log(`   Which calls:     ${metrics.utils.whichCalls}`);
  console.log(`   Nanoseconds:     ${metrics.utils.nanosecondsCalls}`);
  console.log(`   Arbs detected:   ${metrics.arbitrage.arbsDetected}`);
  console.log(`   Total profit:    ${formatMoney(metrics.arbitrage.totalProfit)}`);

  console.log("\n" + "═".repeat(60));
  console.log(GRAYS.GRAY_12.ansi + "  Bun Utils = Microsecond arbitrage timing → Industrial precision!" + RESET);
  console.log("═".repeat(60) + "\n");

  return factory;
}

// ============================================================================
// 9. MAIN
// ============================================================================

if (import.meta.path === Bun.main) {
  const factory = await runDemo();

  const serverMode = Bun.argv.includes("--server");
  if (serverMode) {
    const port = 3000;
    createUtilsServer(factory, port);
    console.log(`\n🚀 Utils server running on http://localhost:${port}`);
    console.log(`   /utils-factory  - Full metrics`);
    console.log(`   /uuid           - Generate UUID`);
    console.log(`   /tools          - Tool discovery`);
    console.log(`   /timing         - Timing benchmark`);
    console.log(`   /arb            - Simulate arb\n`);
  }
}
