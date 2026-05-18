import { HEADERS, validateProxyHeader } from "../proxy/validator";
import { dnsCache } from "../proxy/dns";

// ============================================
// TERMINAL COLORS
// ============================================

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  dim: "\x1b[2m",
};

// ============================================
// DASHBOARD RENDERER
// ============================================

export class ProxyDashboard {
  private lastValidation: any[] = [];
  private dnsStats: any = {};
  private updateInterval: any = null;
  
  start(updateMs = 1000) {
    this.updateInterval = setInterval(() => this.render(), updateMs);
    this.render();
  }
  
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  async render() {
    // Clear screen
    process.stdout.write("\x1b[2J\x1b[H");
    
    // Header
    this.printHeader();
    
    // Validation panel
    await this.renderValidationPanel();
    
    // DNS cache panel
    this.renderDNSPanel();
    
    // Status panel
    this.renderStatusPanel();
    
    // Footer
    this.printFooter();
  }
  
  private printHeader() {
    const title = "🚀 BUN PROXY VALIDATION DASHBOARD";
    const line = "═".repeat(60);
    
    console.info(`${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
    console.info(`${COLORS.blue}${line}${COLORS.reset}`);
    console.info();
  }
  
  private async renderValidationPanel() {
    console.info(`${COLORS.bright}📋 Header Validation${COLORS.reset}`);
    console.info(`${COLORS.blue}─`.repeat(40) + COLORS.reset);
    
    // Test headers
    const testHeaders = [
      [HEADERS.CONFIG_VERSION, "1"],
      [HEADERS.REGISTRY_HASH, "0xa1b2c3d4"],
      [HEADERS.FEATURE_FLAGS, "0x00000007"],
      [HEADERS.TERMINAL_MODE, "2"],
      [HEADERS.TERMINAL_ROWS, "24"],
      [HEADERS.TERMINAL_COLS, "80"],
      [HEADERS.PROXY_TOKEN, "eyJhbGci...fake"],
      [HEADERS.DOMAIN, "@domain1"],
      [HEADERS.DOMAIN_HASH, "0xb1c3d4c5"],
    ];
    
    this.lastValidation = [];
    
    for (const [name, value] of testHeaders) {
      const result = validateProxyHeader(name, value);
      this.lastValidation.push({ name, value, result });
      
      const icon = result.valid ? "✅" : "❌";
      const color = result.valid ? COLORS.green : COLORS.red;
      const duration = `${result.duration}ns`;
      
      console.info(`  ${icon} ${color}${name.padEnd(25)}${COLORS.reset}`);
      console.info(`    ${value.padEnd(30)} ${duration}`);
      
      if (!result.valid) {
        console.info(`    ${COLORS.yellow}${(result as any).error.message}${COLORS.reset}`);
      }
    }
    
    console.info();
  }
  
  private renderDNSPanel() {
    const stats = dnsCache.getStats();
    this.dnsStats = stats;
    
    console.info(`${COLORS.bright}🌐 DNS Cache${COLORS.reset}`);
    console.info(`${COLORS.blue}─`.repeat(40) + COLORS.reset);
    
    const hitRate = (stats.hitRate * 100).toFixed(1);
    const hitColor = stats.hitRate > 0.8 ? COLORS.green : COLORS.yellow;
    
    console.info(`  Hits: ${COLORS.green}${stats.hits}${COLORS.reset}`);
    console.info(`  Misses: ${COLORS.yellow}${stats.misses}${COLORS.reset}`);
    console.info(`  Hit Rate: ${hitColor}${hitRate}%${COLORS.reset}`);
    console.info(`  Avg Hit Time: ${COLORS.cyan}${stats.averageHitTime.toFixed(0)}ns${COLORS.reset}`);
    console.info(`  Avg Miss Time: ${COLORS.magenta}${stats.averageMissTime.toFixed(0)}ns${COLORS.reset}`);
    console.info();
  }
  
  private renderStatusPanel() {
    const validCount = this.lastValidation.filter(v => v.result.valid).length;
    const totalCount = this.lastValidation.length;
    const health = validCount === totalCount ? "🟢 Healthy" : "🟡 Degraded";
    const healthColor = validCount === totalCount ? COLORS.green : COLORS.yellow;
    
    console.info(`${COLORS.bright}📊 System Status${COLORS.reset}`);
    console.info(`${COLORS.blue}─`.repeat(40) + COLORS.reset);
    
    console.info(`  Validation: ${healthColor}${validCount}/${totalCount} valid${COLORS.reset}`);
    console.info(`  DNS Cache: ${this.dnsStats.hitRate > 0.8 ? "🟢 Optimal" : "🟡 Acceptable"}`);
    console.info(`  Memory: ${COLORS.cyan}${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB${COLORS.reset}`);
    console.info(`  Uptime: ${COLORS.magenta}${process.uptime().toFixed(0)}s${COLORS.reset}`);
    console.info();
  }
  
  private printFooter() {
    const line = "─".repeat(60);
    console.info(`${COLORS.dim}${line}${COLORS.reset}`);
    console.info(`${COLORS.dim}Press Ctrl+C to exit • Auto-refresh every second${COLORS.reset}`);
    console.info();
  }
}

// ============================================
// INTERACTIVE TESTER
// ============================================

export async function interactiveTester() {
  const dashboard = new ProxyDashboard();
  dashboard.start();
  
  // Handle keyboard input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  
  process.stdin.on("data", async (key) => {
    // Ctrl+C to exit
    if (key === "\u0003") {
      dashboard.stop();
      process.stdout.write("\x1b[2J\x1b[H");
      console.info("👋 Goodbye!");
      process.exit(0);
    }
    
    // Space to force DNS refresh
    if (key === " ") {
      console.info("\n🔄 Forcing DNS cache refresh...");
      await dnsCache.clear();
      await dnsCache.warmup();
    }
    
    // R to reload dashboard
    if (key.toLowerCase() === "r") {
      await dashboard.render();
    }
  });
}
