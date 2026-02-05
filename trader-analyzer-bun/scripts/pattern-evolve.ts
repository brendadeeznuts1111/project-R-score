/**
 * @fileoverview Pattern Evolution Tracker
 * @description Track patterns across git history with frequency analysis and prediction
 * @module scripts/pattern-evolve
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-PATTERN-EVOLVE@0.1.0;instance-id=PATTERN-EVOLVE-001;version=0.1.0}]
 * [PROPERTIES:{pattern-evolve={value:"pattern-evolution-tracking";@root:"ROOT-DEV";@chain:["BP-GIT","BP-PATTERNS","BP-PREDICTION"];@version:"0.1.0"}}]
 * [CLASS:PatternEvolver][#REF:v-0.1.0.BP.PATTERN.EVOLVE.1.0.A.1.1.DEV.1.1]]
 */

import { $ } from "bun";

interface EvolveOptions {
  gitHistory?: boolean;
  frequencyAnalysis?: boolean;
  predictNext?: boolean;
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
  commits: Array<{ hash: string; date: string; message: string }>;
  predictedNext?: {
    probability: number;
    estimatedDate: string;
  };
}

/**
 * Pattern evolution tracker with git history analysis
 */
export class PatternEvolver {
  private patterns = new Map<string, PatternEvolution>();

  constructor(private options: EvolveOptions = {}) {}

  /**
   * Analyze pattern evolution from git history
   */
  async analyze(pattern: string): Promise<PatternEvolution> {
    if (!this.options.gitHistory) {
      return this.analyzeCurrent(pattern);
    }

    // Get git log using Bun Shell
    const log = await $`git log --all --oneline --pretty=format:"%h|%ad|%s" --date=short`.text();
    const commits = log.split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const [hash, date, ...messageParts] = line.split("|");
        return { hash: hash.trim(), date: date.trim(), message: messageParts.join("|") };
      });

    const patternMatches: Array<{ commit: string; date: string }> = [];

    // Search for pattern in each commit
    for (const commit of commits) {
      try {
        const content = await $`git show ${commit.hash}:.`.text().catch(() => "");
        if (content.includes(pattern)) {
          patternMatches.push({ commit: commit.hash, date: commit.date });
        }
      } catch {
        // Skip commits where pattern doesn't exist
      }
    }

    // Calculate frequency
    const frequency = patternMatches.length;
    const firstSeen = patternMatches[0]?.date || new Date().toISOString().split("T")[0];
    const lastSeen = patternMatches[patternMatches.length - 1]?.date || new Date().toISOString().split("T")[0];

    // Determine trend
    const recentCount = patternMatches.filter(m => {
      const matchDate = new Date(m.date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return matchDate > sixMonthsAgo;
    }).length;
    const olderCount = frequency - recentCount;
    
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (recentCount > olderCount * 1.2) trend = "increasing";
    else if (recentCount < olderCount * 0.8) trend = "decreasing";

    // Find hotspots (files with most occurrences)
    const fileCounts = new Map<string, number>();
    for (const match of patternMatches) {
      try {
        const files = await $`git show ${match.commit} --name-only --pretty=format:`.text().catch(() => "");
        for (const file of files.split("\n").filter(f => f.trim())) {
          fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
        }
      } catch {
        // Skip if can't get files
      }
    }
    const hotspots = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file]) => file);

    // Predict next occurrence if requested
    let predictedNext;
    if (this.options.predictNext && patternMatches.length > 2) {
      const dates = patternMatches.map(m => new Date(m.date).getTime()).sort((a, b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i] - dates[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const lastDate = dates[dates.length - 1];
      const nextDate = new Date(lastDate + avgInterval);
      
      // Calculate probability based on trend
      let probability = 0.5;
      if (trend === "increasing") probability = 0.8;
      else if (trend === "decreasing") probability = 0.3;

      predictedNext = {
        probability,
        estimatedDate: nextDate.toISOString().split("T")[0],
      };
    }

    const evolution: PatternEvolution = {
      pattern,
      frequency,
      firstSeen,
      lastSeen,
      trend,
      hotspots,
      commits: patternMatches.map(m => ({
        hash: m.commit,
        date: m.date,
        message: commits.find(c => c.hash === m.commit)?.message || "",
      })),
      predictedNext,
    };

    this.patterns.set(pattern, evolution);
    return evolution;
  }

  /**
   * Analyze current codebase only
   */
  private async analyzeCurrent(pattern: string): Promise<PatternEvolution> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: "src" }))
      .map((f) => `src/${f}`);
    
    const matches: string[] = [];
    for (const file of files) {
      const content = await Bun.file(file).text();
      if (content.includes(pattern)) {
        matches.push(file);
      }
    }

    return {
      pattern,
      frequency: matches.length,
      firstSeen: new Date().toISOString().split("T")[0],
      lastSeen: new Date().toISOString().split("T")[0],
      trend: "stable",
      hotspots: matches.slice(0, 5),
      commits: [],
    };
  }

  /**
   * Export evolution data
   */
  async export(outputPath: string): Promise<void> {
    const data = Array.from(this.patterns.values());
    await Bun.write(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported evolution data to ${outputPath}`);
  }

  /**
   * Print evolution report
   */
  printReport(): void {
    console.log(`\n📈 Pattern Evolution Report:\n`);
    for (const evolution of this.patterns.values()) {
      console.log(`Pattern: ${evolution.pattern}`);
      console.log(`  Frequency: ${evolution.frequency} occurrences`);
      console.log(`  First seen: ${evolution.firstSeen}`);
      console.log(`  Last seen: ${evolution.lastSeen}`);
      console.log(`  Trend: ${evolution.trend}`);
      console.log(`  Hotspots: ${evolution.hotspots.slice(0, 3).join(", ")}`);
      if (evolution.predictedNext) {
        console.log(`  Predicted next: ${evolution.predictedNext.estimatedDate} (${(evolution.predictedNext.probability * 100).toFixed(0)}% probability)`);
      }
      console.log();
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const pattern = args.find((a) => !a.startsWith("--")) || "";
  const options: EvolveOptions = {
    gitHistory: args.includes("--git-history"),
    frequencyAnalysis: args.includes("--frequency-analysis"),
    predictNext: args.includes("--predict-next"),
    visualize: args.includes("--visualize"),
    export: args.find((a) => a.startsWith("--export="))?.split("=")[1],
  };

  if (!pattern) {
    console.error("Usage: bun pattern-evolve <pattern> --git-history --frequency-analysis --predict-next");
    console.error("Example: bun pattern-evolve 'eval(' --git-history --predict-next");
    process.exit(1);
  }

  const evolver = new PatternEvolver(options);
  await evolver.analyze(pattern);

  if (options.export) {
    await evolver.export(options.export);
  } else {
    evolver.printReport();
  }
}
