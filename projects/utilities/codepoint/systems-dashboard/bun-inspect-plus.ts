#!/usr/bin/env bun
// bun-inspect-plus.ts - Enhanced Bun.inspect with table support

// Monkey-patch Bun.inspect for table enhancement
const originalInspect = Bun.inspect;
const originalTable = Bun.inspect.table;

Bun.inspect = function (obj: any, options: any = {}) {
  // Enhanced table mode
  if (options.table && Array.isArray(obj)) {
    return enhancedTable(obj, options);
  }

  // Enhanced colors
  if (options.colors) {
    const result = originalInspect(obj, { ...options, colors: true });
    return colorize(result, options.colorTheme || "vscode");
  }

  return originalInspect(obj, options);
};

Bun.inspect.table = function (data: any[], options: any = {}) {
  return enhancedTable(data, options);
};

// Enhanced table implementation
function enhancedTable(data: any[], options: any = {}) {
  const defaults = {
    borderStyle: "rounded",
    headerColor: "cyan",
    borderColor: "gray",
    rowColors: [],
    compact: false,
    maxWidth: process.stdout.columns || 80,
  };

  const opts = { ...defaults, ...options };

  // Use Bun's native table as base
  const base = originalTable(data, {
    columns: opts.columns,
    headerColor: opts.headerColor,
    borderColor: opts.borderColor,
    padding: opts.compact ? 1 : 2,
  });

  // Parse and enhance
  return transformTable(base.toString(), opts);
}

function transformTable(tableStr: string, options: any) {
  const lines = tableStr.split("\n");

  // Skip if no borders
  if (lines.length < 3) return tableStr;

  // Get border characters based on style
  const borders = getBorderChars(options.borderStyle);

  // Replace borders
  lines[0] = replaceBorder(lines[0], borders.top);
  lines[lines.length - 1] = replaceBorder(
    lines[lines.length - 1],
    borders.bottom
  );

  // Find and replace separators
  for (let i = 1; i < lines.length - 1; i++) {
    if (lines[i].match(/^[┌├└╭╰╔╠╚][─━═][┬┼┴╦╬╩]/)) {
      lines[i] = replaceBorder(lines[i], borders.middle);
    }
  }

  // Apply row colors if specified
  if (options.rowColors?.length) {
    let rowIndex = 0;
    for (let i = 2; i < lines.length - 1; i++) {
      if (!lines[i].match(/^[│║]/)) continue;
      const color = options.rowColors[rowIndex % options.rowColors.length];
      if (color) {
        lines[i] = applyColor(lines[i], color);
      }
      rowIndex++;
    }
  }

  return lines.join("\n");
}

function getBorderChars(style: string) {
  const styles: any = {
    single: { top: "┌┬┐", middle: "├┼┤", bottom: "└┴┘" },
    double: { top: "╔╦╗", middle: "╠╬╣", bottom: "╚╩╝" },
    rounded: { top: "╭┬╮", middle: "├┼┤", bottom: "╰┴╯" },
    bold: { top: "┏┳┓", middle: "┣╋┫", bottom: "┗┻┛" },
  };
  return styles[style] || styles.rounded;
}

function replaceBorder(line: string, chars: string) {
  return line
    .replace(/┌/g, chars[0])
    .replace(/┬/g, chars[1])
    .replace(/┐/g, chars[2])
    .replace(/├/g, chars[0])
    .replace(/┼/g, chars[1])
    .replace(/┤/g, chars[2])
    .replace(/└/g, chars[0])
    .replace(/┴/g, chars[1])
    .replace(/┘/g, chars[2]);
}

function applyColor(line: string, color: string) {
  const ansi: any = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  };
  return `${ansi[color] || ""}${line}\x1b[0m`;
}

function colorize(str: string, theme: string) {
  const themes: any = {
    vscode: str
      .replace(/true/g, "\x1b[32mtrue\x1b[0m")
      .replace(/false/g, "\x1b[31mfalse\x1b[0m")
      .replace(/null/g, "\x1b[90mnull\x1b[0m")
      .replace(/\d+/g, (m: string) => `\x1b[33m${m}\x1b[0m`),
    dracula: str
      .replace(/true/g, "\x1b[38;2;80;250;123mtrue\x1b[0m")
      .replace(/false/g, "\x1b[38;2;255;85;85mfalse\x1b[0m")
      .replace(/null/g, "\x1b[38;2;139;233;253mnull\x1b[0m"),
  };
  return themes[theme] || str;
}

// Demo
console.info("🎯 Enhanced Bun.inspect with Table Support");
console.info("==========================================");

const sample = [
  { name: "Bun", speed: 1.8, memory: 45, rating: "🚀" },
  { name: "Node", speed: 1.0, memory: 85, rating: "⚡" },
  { name: "Deno", speed: 1.2, memory: 65, rating: "🔥" },
];

console.info("\n📊 Enhanced Bun.inspect.table with Custom Borders:");
console.info(
  Bun.inspect.table(sample, {
    table: true,
    borderStyle: "double",
    headerColor: "magenta",
    rowColors: ["green", "blue", "yellow"],
  })
);

console.info("\n🎨 Enhanced Colors in Regular Inspect:");
const testObj = {
  name: "Test",
  active: true,
  count: 42,
  value: null,
  items: [1, 2, 3],
};

console.info(
  Bun.inspect(testObj, {
    colors: true,
    colorTheme: "vscode",
  })
);

export { enhancedTable };
