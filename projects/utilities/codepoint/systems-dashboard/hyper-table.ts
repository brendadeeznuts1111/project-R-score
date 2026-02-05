#!/usr/bin/env bun
// hyper-table.ts - Ultimate Bun table formatter

class HyperTable {
  static #borders = {
    s: { t: "┌┬┐", m: "├┼┤", b: "└┴┘", h: "─", v: "│" },
    d: { t: "╔╦╗", m: "╠╬╣", b: "╚╩╝", h: "═", v: "║" },
    r: { t: "╭┬╮", m: "├┼┤", b: "╰┴╯", h: "─", v: "│" },
  };

  static #ansi = {
    r: "\x1b[31m",
    g: "\x1b[32m",
    y: "\x1b[33m",
    b: "\x1b[34m",
    m: "\x1b[35m",
    c: "\x1b[36m",
    w: "\x1b[37m",
    x: "\x1b[0m",
    B: "\x1b[1m",
    D: "\x1b[2m",
    I: "\x1b[3m",
    U: "\x1b[4m",
  };

  static table(data: any[], opts = {}) {
    const {
      style = "s",
      color = "w",
      header = "Bc",
      align = "l",
      compact = false,
      title = "",
      maxWidth = process.stdout.columns || 80,
    } = { ...opts };

    const b = this.#borders[style] || this.#borders.s;
    const [c, v, h] = [b.t[0], b.v, b.h];
    const [m, x] = [b.m[0], b.b[0]];

    // Extract columns and rows
    const cols = Array.from(new Set(data.flatMap((r) => Object.keys(r || {}))));
    const rows = data.map((r) => cols.map((c) => String(r[c] ?? "")));

    // Calculate widths
    const widths = cols.map((col, i) =>
      Math.max(
        Bun.stringWidth(col),
        ...rows.map((r) => Bun.stringWidth(r[i])),
        3
      )
    );

    // Adjust for max width
    const total = widths.reduce((a, w) => a + w + 3, 1);
    if (total > maxWidth) {
      const scale =
        (maxWidth - cols.length * 3 - 1) / (total - cols.length * 3 - 1);
      widths.forEach((w, i) => (widths[i] = Math.floor(w * scale)));
    }

    // Build table
    let out = "";

    // Title
    if (title)
      out += `${this.#ansi[header[0]]}${this.#ansi[header[1]]}${title}${this.#ansi.x}\n`;

    // Top border
    out += `${this.#ansi[color]}${c}${widths.map((w) => h.repeat(w + 2)).join(b.t[1])}${b.t[2]}${this.#ansi.x}\n`;

    // Header
    out += `${this.#ansi[color]}${v}${this.#ansi.x} `;
    cols.forEach((col, i) => {
      const pad = widths[i] - Bun.stringWidth(col);
      const left = align === "c" ? Math.floor(pad / 2) : 0;
      const right = pad - left;
      out += `${this.#ansi[header[0]]}${this.#ansi[header[1]]}`;
      out += `${" ".repeat(left)}${col}${" ".repeat(right)}`;
      out += `${this.#ansi.x} ${this.#ansi[color]}${v}${this.#ansi.x} `;
    });
    out = out.trimEnd() + "\n";

    // Separator
    out += `${this.#ansi[color]}${m}${widths.map((w) => h.repeat(w + 2)).join(b.m[1])}${b.m[2]}${this.#ansi.x}\n`;

    // Rows
    rows.forEach((row, ri) => {
      const rowColor = opts.rowColors?.[ri % opts.rowColors.length] || "";
      out += `${this.#ansi[color]}${v}${this.#ansi.x} `;
      row.forEach((cell, ci) => {
        const pad = widths[ci] - Bun.stringWidth(cell);
        const left =
          align === "r" ? pad : align === "c" ? Math.floor(pad / 2) : 0;
        const right = pad - left;
        out += `${rowColor}${" ".repeat(left)}${cell}${" ".repeat(right)}`;
        out += `${this.#ansi.x} ${this.#ansi[color]}${v}${this.#ansi.x} `;
      });
      out = out.trimEnd() + "\n";
    });

    // Bottom border
    out += `${this.#ansi[color]}${x}${widths.map((w) => h.repeat(w + 2)).join(b.b[1])}${b.b[2]}${this.#ansi.x}\n`;

    return out;
  }

  static matrix(data: any[], metrics: string[]) {
    return this.table(
      data.map((d) => ({
        ...d,
        ...Object.fromEntries(
          metrics.map((m) => [m, this.#formatMetric(d[m])])
        ),
      })),
      { style: "r", header: "Bg", align: "c" }
    );
  }

  static tree(data: any[], depth = 0) {
    const indent = "  ".repeat(depth);
    return data
      .map(
        (d, i) => `${indent}${i === data.length - 1 ? "└─" : "├─"} ${d.name}`
      )
      .join("\n");
  }

  static #formatMetric(val: any) {
    if (typeof val === "number") {
      if (val < 1000) return `${val}ms`;
      if (val < 1e6) return `${(val / 1e3).toFixed(1)}s`;
      return `${(val / 1e6).toFixed(1)}M`;
    }
    return String(val);
  }

  static inspect(obj: any, depth = 2) {
    return Bun.inspect(obj, {
      colors: true,
      depth,
      sorted: true,
      getters: true,
      compact: false,
    });
  }
}

// Usage examples
const sample = [
  { name: "Bun", speed: 1.8, memory: 45, rating: "🚀" },
  { name: "Node", speed: 1.0, memory: 85, rating: "⚡" },
  { name: "Deno", speed: 1.2, memory: 65, rating: "🔥" },
];

console.log("🎯 Hyper-Optimized Bun.inspect.table() Enhancement Demo");
console.log("=====================================================");

console.log("\n📊 Enhanced Table with Double Borders:");
console.log(
  HyperTable.table(sample, {
    style: "d",
    color: "m",
    header: "Bc",
    title: "🌟 Runtime Comparison",
    rowColors: ["\x1b[32m", "\x1b[36m", "\x1b[35m"],
  })
);

console.log("\n📈 Matrix Format with Metrics:");
console.log(HyperTable.matrix(sample, ["speed", "memory"]));

console.log("\n🌳 Tree Structure:");
const treeData = [
  { name: "src" },
  { name: "components" },
  { name: "utils" },
  { name: "styles" },
];
console.log(HyperTable.tree(treeData));

console.log("\n🔍 Enhanced Bun.inspect:");
console.log(HyperTable.inspect(sample, 3));

// Custom Bun.inspect integration
Object.defineProperty(Object.prototype, "toTable", {
  value: function (opts = {}) {
    return HyperTable.table(Array.isArray(this) ? this : [this], opts);
  },
  enumerable: false,
  configurable: true,
});

console.log("\n🎨 Custom toTable() Method:");
console.log(sample.toTable({ style: "r", header: "By" }));

// Export for module use
export { HyperTable };
