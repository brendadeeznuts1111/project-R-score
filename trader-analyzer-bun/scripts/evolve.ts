/**
 * @fileoverview Pattern Evolution Tracker
 * @description Track patterns across git history using Bun Shell
 * @module scripts/evolve
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EVOLVE@0.1.0;instance-id=EVOLVE-001;version=0.1.0}]
 * [PROPERTIES:{evolve={value:"pattern-evolution";@root:"ROOT-DEV";@chain:["BP-GIT","BP-PATTERNS","BP-BUN-SHELL"];@version:"0.1.0"}}]
 * [CLASS:PatternEvolver][#REF:v-0.1.0.BP.EVOLVE.1.0.A.1.1.DEV.1.1]]
 */

import { $ } from "bun";

interface EvolveOptions {
  gitHistory?: boolean;
  frequency?: boolean;
  predictNext?: boolean;
  hotspots?: boolean;
  visualize?: boolean;
  export?: string;
}

interface PatternEvolution {
  pattern: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  trend: "increasing" | "decreasing" | "stable";
  hotspots: string[];
}

/**
 * Pattern evolution tracker
 */
export class PatternEvolver {
  private patterns = new Map<string, PatternEvolution>();

  constructor(private options: EvolveOptions) {}

  /**
   * Analyze git history for patterns
   */
  async analyze(pattern: string): Promise<PatternEvolution> {
    if (!this.options.gitHistory) {
      return this.analyzeCurrent(pattern);
    }

    // Get git log using Bun Shell
    const log = await $`git log --all --oneline --pretty=format:"%h %ad %s" --date=short`.text();
    const commits = log.split("\n").filter((l) => l.trim());

    let frequency = 0;
    let firstSeen = "";
    let lastSeen = "";
    const hotspots: string[] = [];

    for (const commit of commits) {
      const [hash, date, ...messageParts] = commit.split(" ");
      const message = messageParts.join(" ");

      // Check if pattern appears in commit
      const commitContent = await this.getCommitContent(hash);
      if (commitContent.includes(pattern)) {
        frequency++;
        if (!firstSeen) firstSeen = date;
        lastSeen = date;

        // Track hotspots
        const files = await this.getCommitFiles(hash);
        hotspots.push(...files);
      }
    }

    const trend = this.calculateTrend(frequency, commits.length);

    return {
      pattern,
      frequency,
      firstSeen,
      lastSeen,
      trend,
      hotspots: [...new Set(hotspots)],
    };
  }

  /**
   * Analyze current codebase using Bun Shell
   */
  private async analyzeCurrent(pattern: string): Promise<PatternEvolution> {
    const files = await $`find src -name "*.ts" -o -name "*.js"`.text();
    const fileList = files.split("\n").filter((f) => f.trim());

    let frequency = 0;
    const hotspots: string[] = [];

    for (const file of fileList) {
      try {
        const content = await Bun.file(file.trim()).text();
        if (content.includes(pattern)) {
          frequency++;
          hotspots.push(file.trim());
        }
      } catch (e) {
        // Skip files that don't exist
      }
    }

    return {
      pattern,
      frequency,
      firstSeen: "unknown",
      lastSeen: "now",
      trend: "stable",
      hotspots,
    };
  }

  /**
   * Get commit content using Bun Shell
   */
  private async getCommitContent(hash: string): Promise<string> {
    try {
      return await $`git show ${hash} --stat`.nothrow().text();
    } catch {
      return "";
    }
  }

  /**
   * Get commit files using Bun Shell
   */
  private async getCommitFiles(hash: string): Promise<string[]> {
    try {
      const files = await $`git show --name-only --pretty=format: ${hash}`.nothrow().text();
      return files.split("\n").filter((f) => f.trim());
    } catch {
      return [];
    }
  }

  /**
   * Calculate trend
   */
  private calculateTrend(
    frequency: number,
    totalCommits: number,
  ): "increasing" | "decreasing" | "stable" {
    const ratio = frequency / totalCommits;
    if (ratio > 0.1) return "increasing";
    if (ratio < 0.05) return "decreasing";
    return "stable";
  }

  /**
   * Predict next occurrence
   */
  predictNext(evolution: PatternEvolution): string {
    // Simple prediction based on trend
    if (evolution.trend === "increasing") {
      return "Pattern likely to appear in next commits";
    }
    if (evolution.trend === "decreasing") {
      return "Pattern usage decreasing";
    }
    return "Pattern usage stable";
  }

  /**
   * Export evolution data
   */
  async export(outputPath: string, evolution: PatternEvolution): Promise<void> {
    const data = {
      pattern: evolution.pattern,
      evolution,
      prediction: this.predictNext(evolution),
      timestamp: new Date().toISOString(),
    };

    await Bun.write(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported to ${outputPath}`);
  }

  /**
   * Visualize hotspots
   */
  visualizeHotspots(evolution: PatternEvolution): void {
    console.log(`\n🔥 Hotspots for pattern "${evolution.pattern}":\n`);
    for (const hotspot of evolution.hotspots.slice(0, 10)) {
      console.log(`  ${hotspot}`);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: EvolveOptions = {
    gitHistory: args.includes("--git-history"),
    frequency: args.includes("--frequency"),
    predictNext: args.includes("--predict-next"),
    hotspots: args.includes("--hotspots"),
    visualize: args.includes("--visualize"),
    export: args.find((a) => a.startsWith("--export="))?.split("=")[1],
  };

  const pattern = args.find((a) => !a.startsWith("--")) || "Bun.serve";

  const evolver = new PatternEvolver(options);
  const evolution = await evolver.analyze(pattern);

  console.log(`\n📊 Pattern Evolution: "${pattern}"\n`);
  console.log(`   Frequency: ${evolution.frequency}`);
  console.log(`   First Seen: ${evolution.firstSeen}`);
  console.log(`   Last Seen: ${evolution.lastSeen}`);
  console.log(`   Trend: ${evolution.trend}`);

  if (options.predictNext) {
    console.log(`\n🔮 Prediction: ${evolver.predictNext(evolution)}`);
  }

  if (options.hotspots) {
    evolver.visualizeHotspots(evolution);
  }

  if (options.export) {
    await evolver.export(options.export, evolution);
  }
}
