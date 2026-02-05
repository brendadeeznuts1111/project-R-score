// factory-wager/nexus/render-dashboard.ts
import type { InfrastructureReport } from "./infrastructure-monitor";

export function renderInfrastructureDashboard(report: InfrastructureReport): void {
  const useColor = report.system.capabilities.color;
  const c = (hsl: string) => useColor ? (Bun as any).color(hsl, "ansi-16m") : "";
  const reset = "\x1b[0m";

  // HSL Palette
  const header = c("hsl(220, 60%, 70%)");
  const border = c("hsl(220, 20%, 30%)");
  const green = c("hsl(145, 80%, 45%)");
  const red = c("hsl(10, 90%, 55%)");
  const gold = c("hsl(48, 100%, 60%)");
  const cyan = c("hsl(180, 60%, 55%)");
  const magenta = c("hsl(280, 70%, 65%)");
  const dim = c("hsl(0, 0%, 40%)");

  const width = 100;
  const line = (char: string) => console.log(border + char.repeat(width) + reset);

  // Header
  line("═");
  console.log(`${gold}  ▵ FACTORYWAGER INFRASTRUCTURE NEXUS v5.0${reset}`);
  console.log(`${dim}  ${report.timestamp}${reset}`);
  line("═");

  // System Summary
  console.log(`${header}  SYSTEM${reset}`);
  console.log(`  Platform: ${cyan}${report.system.platform.os} ${report.system.platform.arch}${reset} | ` +
              `Cores: ${gold}${report.system.platform.cpus}${reset} | ` +
              `Memory: ${report.system.memory.rss / 1024 / 1024 | 0}MB`);

  // Domain Section
  console.log(`\n${header}  DOMAIN: ${report.domain.name}${reset}`);
  report.domain.endpoints.forEach((ep: any) => {
    const statusColor = ep.healthy ? green : red;
    const statusIcon = ep.healthy ? "✓" : "✗";
    console.log(`  ${statusColor}${statusIcon}${reset} ${ep.endpoint.padEnd(40)} ` +
                `${ep.latency}ms ${dim}(CRC32: ${ep.crc32 || "none"})${reset}`);
  });

  // Registry Section
  console.log(`\n${header}  REGISTRY${reset}`);
  if (report.registry.reachable) {
    console.log(`  ${green}●${reset} ${report.registry.url} ${dim}(${report.registry.latency})${reset}`);
    console.log(`  ${dim}Packages: ${report.registry.totalPackages} | Sampling integrity...${reset}`);

    // Tabular package list (v4.3 format)
    const cols = [
      { name: "Package", w: 20, align: "left" as const },
      { name: "Version", w: 12, align: "center" as const },
      { name: "Author", w: 12, align: "left" as const },
      { name: "Hash", w: 10, align: "left" as const },
      { name: "CRC32", w: 10, align: "center" as const },
    ];

    // Header row
    const headerRow = cols.map(col =>
      col.name.padEnd(col.w).slice(0, col.w)
    ).join(" │ ");
    console.log(`  ${dim}${headerRow}${reset}`);
    console.log(`  ${dim}${cols.map(c => "─".repeat(c.w)).join("─┼─")}${reset}`);

    // Data rows
    report.registry.packages.forEach((pkg: any) => {
      const crcColor = pkg.crcValid ? green : red;
      const crcIcon = pkg.crcValid ? "✓" : "✗";
      const row = [
        pkg.name.padEnd(cols[0].w).slice(0, cols[0].w),
        pkg.version.padEnd(cols[1].w).slice(0, cols[1].w),
        pkg.author.padEnd(cols[2].w).slice(0, cols[2].w),
        pkg.authorHash.padEnd(cols[3].w).slice(0, cols[3].w),
        `${crcColor}${crcIcon}${reset}`.padEnd(cols[4].w),
      ].join(` ${dim}│${reset} `);
      console.log(`  ${row}`);
    });
  } else {
    console.log(`  ${red}✗${reset} ${report.registry.url} ${red}(${report.registry.error})${reset}`);
  }

  // R2 Section
  console.log(`\n${header}  R2 BUCKETS${reset}`);
  if (!report.r2.error) {
    console.log(`  ${green}●${reset} ${report.r2.bucket} ${dim}(${report.r2.region})${reset}`);
    console.log(`  Objects: ${gold}${report.r2.objects}${reset} | ` +
                `Size: ${cyan}${report.r2.totalSizeMB} MB${reset} | ` +
                `Avg: ${report.r2.avgSizeKB} KB`);
    console.log(`  Latest: ${magenta}${report.r2.sampleObject}${reset} ` +
                `${report.r2.integrity.checked ?
                  (report.r2.integrity.valid ? green + "✓ Integrity" : red + "✗ Corrupt")
                  : dim + "○ No CRC"}`);
  } else {
    console.log(`  ${red}✗${reset} ${report.r2.bucket} ${red}(${report.r2.error})${reset}`);
  }

  // Overall Status
  line("─");
  const overallStatus = report.overall
    ? `${green}OPERATIONAL${reset}`
    : `${red}DEGRADED${reset}`;
  console.log(`\n  STATUS: ${overallStatus} ${dim}| Probe v4.3.1 | CRC32 Hardware: ${report.system.capabilities.crc32 ? "YES" : "NO"}${reset}`);
  line("═");
}
