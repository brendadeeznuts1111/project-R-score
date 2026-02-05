import { themeManager } from "../utils/theme-manager";

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r};${g};${b}`;
}

function highlightCode(code: string): string {
  const theme = themeManager.getCurrentTheme();
  return code
    .replace(
      /Bun\.hash\.crc32\(/g,
      (_, p1) => `\x1b[38;2;${hexToRgb(theme.colors.primary)}m${p1}\x1b[0m`,
    )
    .replace(
      /hardwareAcceleration|simd|pclmulqdq/gi,
      (_, p1) => `\x1b[38;2;${hexToRgb(theme.colors.success)}m${p1}\x1b[0m`,
    )
    .replace(
      /throughput|MB\/s|latency/gi,
      (_, p1) => `\x1b[38;2;${hexToRgb(theme.colors.warning)}m${p1}\x1b[0m`,
    )
    .replace(
      /auditTrail|crc32_audit|batchId/gi,
      (_, p1) => `\x1b[38;2;${hexToRgb(theme.colors.secondary)}m${p1}\x1b[0m`,
    )
    .replace(
      /CRC32Error/gi,
      (_, p1) => `\x1b[38;2;${hexToRgb(theme.colors.error)}m${p1}\x1b[0m`,
    )
    .replace(
      /const|let|var|function|async|await|export|import/gi,
      (_, p1) =>
        `\x1b[38;2;${hexToRgb(theme.colors.syntax.keyword)}m${p1}\x1b[0m`,
    )
    .replace(
      /".*"|'.*'|`.*`/g,
      (_, p1) =>
        `\x1b[38;2;${hexToRgb(theme.colors.syntax.string)}m${p1}\x1b[0m`,
    )
    .replace(
      /\b\d+\.?\d*\b/g,
      (_, p1) =>
        `\x1b[38;2;${hexToRgb(theme.colors.syntax.number)}m${p1}\x1b[0m`,
    )
    .replace(
      /\/\/.*/g,
      (_, p1) =>
        `\x1b[38;2;${hexToRgb(theme.colors.syntax.comment)}m${p1}\x1b[0m`,
    );
}

const styledConsole = {
  primary: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    console.log(`\x1b[38;2;${hexToRgb(theme.colors.primary)}m${text}\x1b[0m`);
  },
  success: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    console.log(`\x1b[38;2;${hexToRgb(theme.colors.success)}m${text}\x1b[0m`);
  },
  warning: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    console.log(`\x1b[38;2;${hexToRgb(theme.colors.warning)}m${text}\x1b[0m`);
  },
  error: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    console.log(`\x1b[38;2;${hexToRgb(theme.colors.error)}m${text}\x1b[0m`);
  },
  info: (text: string) => {
    const theme = themeManager.getCurrentTheme();
    console.log(`\x1b[38;2;${hexToRgb(theme.colors.secondary)}m${text}\x1b[0m`);
  },
};

export async function runInteractiveThemeDemo(): Promise<void> {
  console.log("\n🎨 CRC32 Interactive Theme Demo");
  console.log("═══════════════════════════════════════════════════════════\n");

  styledConsole.info("Available Themes:");
  const themes = themeManager.getAllThemes();
  themes.forEach((theme, index) => {
    const icon =
      theme.type === "dark" ? "🌙" : theme.type === "light" ? "☀️" : "⚡";
    styledConsole.primary(
      `  ${index + 1}. ${icon} ${theme.name} (${theme.type})`,
    );
  });

  styledConsole.info("\n🌈 Syntax Highlighting Examples:");

  const sampleCode = `
// 🔵 CRC32 Hardware Acceleration
const result = Bun.hash.crc32(largeDataset);
const throughput = 4247.71;

// 🟢 Hardware Features
const features = { simd: true, pclmulqdq: available };

// 🟡 Performance Metrics
const metrics = { throughput: 4247.71, latency: 0.235 };

// 🟣 Audit Trail
const audit = { batchId: crypto.randomUUID(), auditTrail: true };

// 🔴 Error Handling
if (!result.success) {
  throw new CRC32Error("Hardware failed");
}
`;

  console.log("\nHighlighted Code:");
  console.log(highlightCode(sampleCode));

  styledConsole.info("\n🎯 Theme Colors in Action:");
  styledConsole.success("✅ Hardware acceleration active");
  styledConsole.primary("⚡ Processing at 4,247 MB/s");
  styledConsole.warning("⚠️ Performance threshold reached");
  styledConsole.error("❌ Hardware acceleration unavailable");
  styledConsole.info("ℹ️ Audit trail created");

  styledConsole.info("\n🔄 Interactive Theme Switching:");
  styledConsole.primary("Switching to light theme...");
  themeManager.setTheme("crc32-light");
  styledConsole.success("Light theme activated");

  styledConsole.primary("Switching to high contrast...");
  themeManager.setTheme("crc32-high-contrast");
  styledConsole.warning("High contrast mode activated");

  styledConsole.primary("Switching back to dark theme...");
  themeManager.setTheme("crc32-dark");
  styledConsole.success("Dark theme restored");

  styledConsole.info("\n📊 Performance Visualization:");
  const perfData = [
    { label: "Hardware CRC32", value: 4247.71 },
    { label: "Software CRC32", value: 156.23 },
    { label: "Speedup Factor", value: 27.2 },
    { label: "Efficiency", value: 98.7 },
  ];

  perfData.forEach(({ label, value }) => {
    const barLen = 25;
    const filled = Math.floor((value / 5000) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    const theme = themeManager.getCurrentTheme();
    const rgb =
      value > 4000
        ? hexToRgb(theme.colors.success)
        : hexToRgb(theme.colors.primary);
    console.log(
      `${label.padEnd(18)} \x1b[38;2;${rgb}m[${bar}]\x1b[0m ${value}`,
    );
  });

  console.log("\n✅ Theme demo complete!");
}

if (import.meta.main) {
  runInteractiveThemeDemo();
}
