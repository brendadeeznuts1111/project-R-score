/**
 * BunProactiveHygieneWatcher (Ticket 13.1.1.1.1)
 * Uses Bun's native fs.watch to monitor directories for corruption artifacts
 */

import { watch, $ } from "bun";
import { join } from "path";

class BunProactiveHygieneWatcher {
  private static readonly watchDelay = 60000;
  private static readonly autoDeletePatterns = [".!*", "*.swp", ".DS_Store"];
  private static readonly targetDirs = ["utils", "modules"];
  private pendingHeals = new Map<string, Timer>();

  constructor() {
    console.log("🛡️  BunProactiveHygieneWatcher Initialized (v3.7)");
    console.log(`📡 Monitoring: ${BunProactiveHygieneWatcher.targetDirs.join(", ")}`);
  }

  public async start() {
    for (const dir of BunProactiveHygieneWatcher.targetDirs) {
      try {
        watch(dir, { recursive: false }, (event, filename) => {
          if (filename && this.shouldTriggerHeal(filename)) {
            this.scheduleHeal(dir, filename);
          }
        });
      } catch (err) {
        console.warn(`⚠️  Could not watch ${dir}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  }

  private shouldTriggerHeal(filename: string): boolean {
    return BunProactiveHygieneWatcher.autoDeletePatterns.some(pattern => {
      if (pattern.includes("*")) {
        const regex = new RegExp(`^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
        return regex.test(filename);
      }
      return filename === pattern;
    });
  }

  private scheduleHeal(dir: string, filename: string) {
    const filePath = join(dir, filename);
    if (this.pendingHeals.has(filePath)) return;

    console.log(`🔍 artifact detected: '${filePath}'. Scheduling heal in ${BunProactiveHygieneWatcher.watchDelay / 1000}s...`);

    const timer = setTimeout(async () => {
      console.log(`🧹 Triggering proactive self-heal for '${filePath}'...`);
      try {
        await $`bun run scripts/self-heal.ts`.quiet();
        this.pendingHeals.delete(filePath);
      } catch (err) {
        console.error(`❌ Self-heal failed for ${filePath}`);
      }
    }, BunProactiveHygieneWatcher.watchDelay);

    this.pendingHeals.set(filePath, timer);
  }
}

if (import.meta.main) {
  const watcher = new BunProactiveHygieneWatcher();
  watcher.start().catch(console.error);
}

export default BunProactiveHygieneWatcher;