/**
 * @fileoverview Code Smell Diffusion Analysis
 * @description Analyze code smell propagation with visualization
 * @module scripts/smell-diffuse
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SMELL-DIFFUSE@0.1.0;instance-id=SMELL-DIFFUSE-001;version=0.1.0}]
 * [PROPERTIES:{smell-diffuse={value:"code-smell-analysis";@root:"ROOT-DEV";@chain:["BP-ANALYSIS","BP-VISUALIZATION"];@version:"0.1.0"}}]
 * [CLASS:SmellDiffuser][#REF:v-0.1.0.BP.SMELL.DIFFUSE.1.0.A.1.1.DEV.1.1]]
 */

// Use Bun.Glob for file matching

interface Smell {
  type: string;
  file: string;
  line: number;
  severity: number;
}

interface Hotspot {
  file: string;
  smellCount: number;
  severity: number;
  radius: number;
  affectedFiles: string[];
}

/**
 * Code smell diffusion analyzer
 */
export class SmellDiffuser {
  private smells: Smell[] = [];
  private hotspots: Hotspot[] = [];

  constructor(
    private sourceDir: string = "src",
    private options: {
      source?: string;
      radius?: number;
      visualize?: boolean;
      hotspots?: boolean;
      export?: string;
    } = {},
  ) {
    if (options.source) {
      this.sourceDir = options.source;
    }
  }

  /**
   * Analyze code smells
   */
  async analyze(): Promise<Hotspot[]> {
    await this.detectSmells();
    await this.calculateDiffusion();
    return this.hotspots;
  }

  /**
   * Detect code smells
   */
  private async detectSmells(): Promise<void> {
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: this.sourceDir }))
      .map((f) => `${this.sourceDir}/${f}`);
    this.smells = [];

    // Common code smells
    const smellPatterns = [
      { type: "long-method", pattern: /function\s+\w+[^}]{100,}/g },
      { type: "large-class", pattern: /class\s+\w+[^}]{500,}/g },
      { type: "duplicate-code", pattern: /(.){50,}.*\1{50,}/g },
      { type: "magic-number", pattern: /\b\d{3,}\b/g },
      { type: "deep-nesting", pattern: /(\{[^}]*\{[^}]*\{[^}]*\{)/g },
    ];

    for (const file of files) {
      const content = await Bun.file(file).text();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        for (const smellPattern of smellPatterns) {
          if (smellPattern.pattern.test(lines[i])) {
            this.smells.push({
              type: smellPattern.type,
              file,
              line: i + 1,
              severity: this.calculateSeverity(smellPattern.type, lines[i]),
            });
          }
        }
      }
    }
  }

  /**
   * Calculate severity
   */
  private calculateSeverity(type: string, line: string): number {
    // Simple severity calculation
    const baseSeverity: Record<string, number> = {
      "long-method": 0.8,
      "large-class": 0.9,
      "duplicate-code": 0.7,
      "magic-number": 0.4,
      "deep-nesting": 0.6,
    };

    return baseSeverity[type] || 0.5;
  }

  /**
   * Calculate smell diffusion
   */
  private async calculateDiffusion(): Promise<void> {
    const radius = this.options.radius || 5;
    const smellByFile = new Map<string, Smell[]>();

    // Group smells by file
    for (const smell of this.smells) {
      if (!smellByFile.has(smell.file)) {
        smellByFile.set(smell.file, []);
      }
      smellByFile.get(smell.file)!.push(smell);
    }

    // Calculate hotspots
    for (const [file, smells] of smellByFile.entries()) {
      const smellCount = smells.length;
      const avgSeverity = smells.reduce((sum, s) => sum + s.severity, 0) / smellCount;
      const affectedFiles = await this.findAffectedFiles(file, radius);

      if (smellCount > 3 || avgSeverity > 0.7) {
        this.hotspots.push({
          file,
          smellCount,
          severity: avgSeverity,
          radius,
          affectedFiles,
        });
      }
    }

    // Sort by severity
    this.hotspots.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Find files affected by smell diffusion
   */
  private async findAffectedFiles(
    sourceFile: string,
    radius: number,
  ): Promise<string[]> {
    const affected: string[] = [];
    const glob = new Bun.Glob("**/*.{ts,js}");
    const files = Array.from(glob.scanSync({ cwd: this.sourceDir }))
      .map((f) => `${this.sourceDir}/${f}`);

    // Simple distance calculation (can be enhanced with import graph)
    const sourceDir = sourceFile.split("/").slice(0, -1).join("/");

    for (const file of files) {
      const fileDir = file.split("/").slice(0, -1).join("/");
      const distance = this.calculateDirectoryDistance(sourceDir, fileDir);

      if (distance <= radius) {
        affected.push(file);
      }
    }

    return affected;
  }

  /**
   * Calculate directory distance
   */
  private calculateDirectoryDistance(dir1: string, dir2: string): number {
    const parts1 = dir1.split("/");
    const parts2 = dir2.split("/");

    let common = 0;
    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] === parts2[i]) {
        common++;
      } else {
        break;
      }
    }

    return parts1.length + parts2.length - 2 * common;
  }

  /**
   * Export HTML visualization
   */
  async exportHTML(outputPath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Code Smell Hotspots</title>
  <style>
    body { font-family: monospace; margin: 20px; }
    .hotspot { border: 2px solid #f00; padding: 10px; margin: 10px 0; }
    .severity-high { background: #fee; }
    .severity-medium { background: #ffe; }
    .severity-low { background: #efe; }
  </style>
</head>
<body>
  <h1>Code Smell Hotspots</h1>
  <p>Found ${this.hotspots.length} hotspots</p>
  ${this.hotspots.map((h) => `
    <div class="hotspot severity-${h.severity > 0.7 ? 'high' : h.severity > 0.4 ? 'medium' : 'low'}">
      <h3>${h.file}</h3>
      <p>Smells: ${h.smellCount}, Severity: ${(h.severity * 100).toFixed(0)}%</p>
      <p>Affected Files: ${h.affectedFiles.length}</p>
      <ul>
        ${h.affectedFiles.slice(0, 10).map((f) => `<li>${f}</li>`).join("")}
      </ul>
    </div>
  `).join("")}
</body>
</html>`;

    await Bun.write(outputPath, html);
    console.log(`✅ Exported HTML visualization to ${outputPath}`);
  }

  /**
   * Visualize hotspots
   */
  visualizeHotspots(): void {
    console.log(`\n🔥 Found ${this.hotspots.length} code smell hotspots:\n`);
    for (const hotspot of this.hotspots.slice(0, 10)) {
      console.log(`📄 ${hotspot.file}`);
      console.log(`   Smells: ${hotspot.smellCount}`);
      console.log(`   Severity: ${(hotspot.severity * 100).toFixed(0)}%`);
      console.log(`   Affected Files: ${hotspot.affectedFiles.length}`);
      console.log();
    }
  }

  /**
   * Print report
   */
  printReport(): void {
    console.log(`\n📊 Code Smell Analysis Report:\n`);
    console.log(`Found ${this.smells.length} code smells`);
    console.log(`Found ${this.hotspots.length} hotspots\n`);
    
    if (this.hotspots.length > 0) {
      this.visualizeHotspots();
    }
  }

  /**
   * Export to JSON
   */
  async export(outputPath: string): Promise<void> {
    const data = {
      smells: this.smells,
      hotspots: this.hotspots,
    };
    await Bun.write(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported smell analysis to ${outputPath}`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options = {
    source: args.find((a) => a.startsWith("--source="))?.split("=")[1] || "src",
    radius: parseInt(args.find((a) => a.startsWith("--radius="))?.split("=")[1] || "3"),
    visualize: args.includes("--visualize"),
    hotspots: args.includes("--hotspots"),
    export: args.find((a) => a.startsWith("--export="))?.split("=")[1],
  };

  const diffuser = new SmellDiffuser(options.source, options);
  await diffuser.analyze();

  if (options.hotspots) {
    diffuser.visualizeHotspots();
  }

  if (options.visualize && options.export) {
    await diffuser.exportHTML(options.export);
  } else if (options.export) {
    await diffuser.export(options.export);
  } else {
    diffuser.printReport();
  }
}
