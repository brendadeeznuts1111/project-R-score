#!/usr/bin/env bun
// nano-table.ts - 30-line table formatter

const table = (d, o = {}) => {
  const b = { s: "┌─┬┐├─┼┤└─┴┘│", d: "╔═╦╗╠═╬╣╚═╩╝║", r: "╭─┬╮├─┼┤╰─┴╯│" }[
    o.s || "s"
  ];
  const w = Object.keys(d[0] || {}).map(
    (k) => Math.max(k.length, ...d.map((r) => String(r[k] || "").length)) + 2
  );
  const top = b[0] + w.map((w) => b[1].repeat(w)).join(b[2]) + b[3];
  const sep = b[4] + w.map((w) => b[1].repeat(w)).join(b[5]) + b[6];
  const bot = b[7] + w.map((w) => b[1].repeat(w)).join(b[8]) + b[9];
  const hdr = Object.keys(d[0] || {})
    .map((k, i) => k.padEnd(w[i] - 2))
    .join(b[10]);
  const rows = d.map((r) =>
    Object.values(r)
      .map((v, i) => String(v).padEnd(w[i] - 2))
      .join(b[10])
  );
  return [top, hdr, sep, ...rows, bot].join("\n");
};

// Usage examples
console.log("🎯 30-Line Nano Table Formatter");
console.log("===============================");

const sample = [
  { name: "Alice", score: 95, role: "Developer" },
  { name: "Bob", score: 87, role: "Designer" },
  { name: "Charlie", score: 92, role: "Manager" },
];

console.log("\n📊 Single Border Style:");
console.log(table(sample, { s: "s" }));

console.log("\n📈 Double Border Style:");
console.log(table(sample, { s: "d" }));

console.log("\n🎨 Rounded Border Style:");
console.log(table(sample, { s: "r" }));
