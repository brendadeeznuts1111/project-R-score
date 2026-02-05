/**
 * ProactiveArtifactSweeper (Ticket 20.1.1.1.1)
 * Real-time ghost artifact purging using Bun native Glob
 */

import { Glob, $, watch } from "bun";

export class ProactiveArtifactSweeper {
  private static readonly GLOB_PATTERN = "**/.*!*";
  private static readonly sweeper = new Glob(this.GLOB_PATTERN);

  static async purge() {
    console.log("🧹 Sovereign Sweeper: Scanning for ghost artifacts...");
    let purgedCount = 0;
    
    for await (const file of this.sweeper.scan(".")) {
      console.log(`👻 Purging: ${file}`);
      await $`rm -f ${file}`;
      purgedCount++;
    }
    
    if (purgedCount > 0) {
      console.log(`✅ Cleaned ${purgedCount} artifacts.`);
    }
  }

  static startWatching() {
    console.log("👀 Sovereign Watcher: Monitoring for real-time hygiene...");
    
    // Use fs.watch for efficient filesystem event monitoring
    watch(".", { recursive: true }, async (event, filename) => {
      if (filename && (filename.includes(".!") || filename.includes(".swp"))) {
        await this.purge();
      }
    });
  }
}

if (import.meta.main) {
  ProactiveArtifactSweeper.purge().then(() => {
    ProactiveArtifactSweeper.startWatching();
  });
}