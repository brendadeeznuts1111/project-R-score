#!/usr/bin/env bun
/**
 * UUIDv7 + Deep ANSI Colors for Arb Tracking
 * Run: bun run examples/uuid-arb-demo.ts
 */

import { BRIGHT, GREENS, REDS, YELLOWS, GRAYS, RESET, fgRGB } from "../src/colors/bright-ansi";
import { edgeGradient } from "../src/colors/gradients";
import { formatEdge, formatMoney, EDGE, BOOK } from "../src/colors/arb-colors";

console.log("\n" + "═".repeat(55));
console.log(BRIGHT.CYAN.ansi + "  UUIDv7 + DEEP ANSI COLORS FOR ARB TRACKING" + RESET);
console.log("═".repeat(55) + "\n");

// ════════════════════════════════════════════════════════════
// 1. UUIDv7 FORMATS
// ════════════════════════════════════════════════════════════
console.log(BRIGHT.WHITE.ansi + "1. UUIDv7 FORMATS" + RESET);
console.log("─".repeat(40));

// String format (36 chars) - monotonic, sortable
const arbId = Bun.randomUUIDv7();
console.log(`   String:    ${BRIGHT.CYAN.ansi}${arbId}${RESET}`);

// Buffer format (16 bytes) - zero-copy for binary protocol
const arbBuffer = Bun.randomUUIDv7("buffer");
const hexBytes = Array.from(arbBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
console.log(`   Buffer:    ${GRAYS.GRAY_12.ansi}${hexBytes}${RESET} (${arbBuffer.length} bytes)`);

// Base64url (22 chars) - shorter for logs/URLs
const arbShort = Bun.randomUUIDv7("base64url");
console.log(`   Base64url: ${YELLOWS.GOLD.ansi}${arbShort}${RESET} (22 chars)`);

// Extract timestamp from UUIDv7
const timestampHex = arbId.slice(0, 8) + arbId.slice(9, 13);
const timestamp = parseInt(timestampHex, 16);
console.log(`   Timestamp: ${GRAYS.GRAY_14.ansi}${new Date(timestamp).toISOString()}${RESET}`);

// ════════════════════════════════════════════════════════════
// 2. JSON LOG FORMAT (%j)
// ════════════════════════════════════════════════════════════
console.log("\n" + BRIGHT.WHITE.ansi + "2. JSON LOG FORMAT (%j)" + RESET);
console.log("─".repeat(40));
console.log('%j', { arbId: Bun.randomUUIDv7(), edge: 0.0234, ts: Date.now() });

// ════════════════════════════════════════════════════════════
// 3. COLORED ARB DETECTION
// ════════════════════════════════════════════════════════════
console.log("\n" + BRIGHT.WHITE.ansi + "3. COLORED ARB DETECTION" + RESET);
console.log("─".repeat(40));

// Simulate arb detections
const arbs = [
  { edge: 0.0312, market: "LAL@GSW", bookA: "PIN", bookB: "DK", odds: [1.95, 2.08], profit: 847, steam: true, live: true },
  { edge: 0.0187, market: "BOS@MIA", bookA: "BF", bookB: "FD", odds: [2.10, 2.15], profit: 423, steam: false, live: true },
  { edge: 0.0098, market: "NYK@CHI", bookA: "PIN", bookB: "B365", odds: [1.88, 1.92], profit: 156, steam: false, live: false },
];

for (const arb of arbs) {
  const id = Bun.randomUUIDv7();
  const idShort = id.slice(0, 8);
  const edgeColor = edgeGradient(arb.edge);

  const line = [
    GRAYS.GRAY_10.ansi + "ARB" + RESET,
    BRIGHT.CYAN.ansi + idShort + RESET,
    edgeColor.ansi + "+" + (arb.edge * 100).toFixed(2) + "%" + RESET,
    BRIGHT.WHITE.ansi + arb.market + RESET,
    BOOK.SHARP.PRIMARY.ansi + arb.bookA + RESET + " " + arb.odds[0],
    GRAYS.GRAY_8.ansi + "→" + RESET,
    BOOK.SQUARE.PRIMARY.ansi + arb.bookB + RESET + " " + arb.odds[1],
    formatMoney(arb.profit),
    arb.steam ? EDGE.STEAM.ansi + "🔥" + RESET : "",
    arb.live ? BRIGHT.RED.ansi + "●" + RESET : GRAYS.GRAY_6.ansi + "○" + RESET,
  ].filter(Boolean).join(" ");

  console.log("   " + line);
}

// ════════════════════════════════════════════════════════════
// 4. BINARY PROTOCOL WITH UUIDv7
// ════════════════════════════════════════════════════════════
console.log("\n" + BRIGHT.WHITE.ansi + "4. BINARY PROTOCOL WITH UUIDv7" + RESET);
console.log("─".repeat(40));

// 48-byte arb record
// Offset 0-15:  UUIDv7 (16 bytes)
// Offset 16-19: Edge (float32)
// Offset 20-23: Profit (float32)
// Offset 24-27: RGB + Flags (4 bytes)
// Offset 28-47: Reserved

const arbRecord = new ArrayBuffer(48);
const view = new DataView(arbRecord);
const bytes = new Uint8Array(arbRecord);

// Pack UUIDv7
const uuid = Bun.randomUUIDv7("buffer");
bytes.set(uuid, 0);

// Pack edge and profit
const edge = 0.0234;
view.setFloat32(16, edge, true);
view.setFloat32(20, 847.32, true);

// Pack color from edge gradient
const color = edgeGradient(edge);
view.setUint8(24, color.rgb[0]); // R
view.setUint8(25, color.rgb[1]); // G
view.setUint8(26, color.rgb[2]); // B
view.setUint8(27, 0b00000111);   // Flags: profit + steam + live

console.log(`   Record size: ${arbRecord.byteLength} bytes`);
console.log(`   UUID bytes:  ${Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
console.log(`   Edge:        ${view.getFloat32(16, true).toFixed(4)}`);
console.log(`   Profit:      $${view.getFloat32(20, true).toFixed(2)}`);
console.log(`   Color RGB:   (${view.getUint8(24)}, ${view.getUint8(25)}, ${view.getUint8(26)})`);
console.log(`   Color:       ${fgRGB(view.getUint8(24), view.getUint8(25), view.getUint8(26))}████${RESET}`);

// ════════════════════════════════════════════════════════════
// 5. BATCH GENERATION (25K)
// ════════════════════════════════════════════════════════════
console.log("\n" + BRIGHT.WHITE.ansi + "5. BATCH UUID GENERATION" + RESET);
console.log("─".repeat(40));

const count = 25_000;
const start = Bun.nanoseconds();
const uuids: string[] = [];
for (let i = 0; i < count; i++) {
  uuids.push(Bun.randomUUIDv7());
}
const elapsed = (Bun.nanoseconds() - start) / 1e6;

console.log(`   Generated: ${BRIGHT.GREEN.ansi}${count.toLocaleString()}${RESET} UUIDs`);
console.log(`   Time:      ${YELLOWS.GOLD.ansi}${elapsed.toFixed(2)}ms${RESET}`);
console.log(`   Rate:      ${BRIGHT.CYAN.ansi}${((count / elapsed) * 1000).toFixed(0)}${RESET} UUIDs/sec`);
console.log(`   First:     ${GRAYS.GRAY_12.ansi}${uuids[0]}${RESET}`);
console.log(`   Last:      ${GRAYS.GRAY_12.ansi}${uuids[count - 1]}${RESET}`);

// Verify monotonic ordering
const sorted = [...uuids].sort();
const isMonotonic = uuids.every((u, i) => u === sorted[i]);
console.log(`   Monotonic: ${isMonotonic ? GREENS.BRIGHT.ansi + "✓ YES" : REDS.BRIGHT.ansi + "✗ NO"}${RESET}`);

console.log("\n" + "═".repeat(55));
console.log(GRAYS.GRAY_12.ansi + "  UUIDv7: Monotonic • Sortable • 16 bytes • Zero-copy" + RESET);
console.log("═".repeat(55) + "\n");
