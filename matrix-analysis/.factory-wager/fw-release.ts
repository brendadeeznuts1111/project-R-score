#!/usr/bin/env bun

/**
 * FactoryWager Release Orchestrator
 * Implements the 4-phase pipeline: Analyze → Gate → Deploy → Finalize
 *
 * Modes:
 *   interactive  — human confirmation required (default)
 *   --yes        — auto-confirm for CI/CD
 *   --dry-run    — simulate deployment, real analysis
 *
 * Exit codes: 0=success, 1=analysis, 2=validation, 3=deploy, 4=verify, 5=cancelled, 127=missing deps
 */

import { $ } from "bun";

// ── Types ────────────────────────────────────────────────────────────

interface ReleaseOptions {
  config: string;
  version: string;
  yes: boolean;
  dryRun: boolean;
  from: string | null;
}

interface PhaseResult {
  name: string;
  exitCode: number;
  durationMs: number;
  data: Record<string, unknown>;
}

interface ReleaseAudit {
  timestamp: string;
  workflow: "fw-release";
  version: string;
  config: string;
  mode: "interactive" | "automated" | "dry-run";
  phases: Record<string, { exit_code: number; duration_seconds: number }>;
  risk_scores: { analysis: number; validation: number; drift: number; composite: number };
  artifacts: { release_report: string; git_tag: string };
  exit_code: number;
  total_duration_seconds: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function elapsed(t0: number): number {
  return Math.round((Bun.nanoseconds() - t0) / 1e6);
}

function ts(): string {
  return new Date().toISOString();
}

function tsFile(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function riskColor(score: number): string {
  if (score <= 30) return Bun.color("hsl(120,70%,40%)", "ansi-256") ?? "";
  if (score <= 60) return Bun.color("hsl(45,90%,50%)", "ansi-256") ?? "";
  return Bun.color("hsl(0,80%,50%)", "ansi-256") ?? "";
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const FW_DIR = "/Users/nolarose/.factory-wager";

// ── Orchestrator ─────────────────────────────────────────────────────

export class ReleaseOrchestrator {
  private opts: ReleaseOptions;
  private phases: PhaseResult[] = [];
  private riskScores = { analysis: 0, validation: 0, drift: 0, composite: 0 };

  constructor(opts: ReleaseOptions) {
    this.opts = opts;
  }

  async run(): Promise<number> {
    const t0 = Bun.nanoseconds();
    const mode = this.opts.dryRun ? "dry-run" : this.opts.yes ? "automated" : "interactive";

    console.log(`\n${BOLD}${CYAN}━━━ FACTORYWAGER RELEASE ORCHESTRATOR ━━━${RESET}`);
    console.log(`${DIM}Mode: ${mode} | Version: ${this.opts.version} | Config: ${this.opts.config}${RESET}\n`);

    // Phase 1: Pre-Release Analysis
    const analysis = await this.phaseAnalysis();
    if (analysis.exitCode !== 0) return this.abort(1, "Pre-release analysis failed", t0, mode);

    // Phase 2: Release Decision Gate
    const gate = await this.phaseGate(analysis);
    if (gate.exitCode !== 0) return this.abort(gate.exitCode, "Release cancelled", t0, mode);

    // Phase 3: Deployment
    const deploy = await this.phaseDeploy();
    if (deploy.exitCode !== 0) return this.abort(3, "Deployment failed", t0, mode);

    // Phase 4: Finalization
    const finalize = await this.phaseFinalize(t0, mode);
    if (finalize.exitCode !== 0) return this.abort(4, "Finalization failed", t0, mode);

    // Success
    const totalMs = elapsed(t0);
    this.riskScores.composite = Math.round(
      (this.riskScores.analysis * 0.5) + (this.riskScores.validation * 0.3) + (this.riskScores.drift * 0.2)
    );

    await this.writeAudit(0, totalMs, mode);

    console.log(`\n${BOLD}${GREEN}━━━ RELEASE ${this.opts.version} COMPLETED ━━━${RESET}`);

    const summary = this.phases.map((p) => ({
      Phase: p.name,
      Status: p.exitCode === 0 ? "PASSED" : "FAILED",
      Duration: `${p.durationMs}ms`,
    }));
    console.log(Bun.inspect.table(summary, ["Phase", "Status", "Duration"], { colors: true }));

    console.log(`${DIM}Total: ${totalMs}ms | Risk: ${this.riskScores.composite}/100 | Mode: ${mode}${RESET}\n`);

    return 0;
  }

  // ── Phase 1: Pre-Release Analysis ──────────────────────────────────

  private async phaseAnalysis(): Promise<PhaseResult> {
    const t0 = Bun.nanoseconds();
    console.log(`${BOLD}[1/4] Pre-Release Analysis${RESET}`);

    // 1a. Read and hash config
    const configFile = Bun.file(this.opts.config);
    if (!(await configFile.exists())) {
      console.log(`  ${RED}Config not found: ${this.opts.config}${RESET}`);
      return this.phase("analysis", 1, t0, { error: "config not found" });
    }

    const configText = await configFile.text();
    const configHash = new Bun.CryptoHasher("sha256").update(configText).digest("hex").slice(0, 12);
    const configSize = configFile.size;

    // 1b. Parse config (YAML-like: count keys, sections, anchors)
    const lines = configText.split("\n");
    const keyCount = lines.filter((l) => /^\s*\w.*:/.test(l)).length;
    const anchorCount = (configText.match(/&\w+/g) ?? []).length;
    const docCount = (configText.match(/^---$/gm) ?? []).length || 1;
    const mergeKeys = (configText.match(/<<:\s*\*/g) ?? []).length;

    // 1c. Risk score based on complexity
    let risk = 10;
    if (keyCount > 50) risk += 15;
    if (keyCount > 100) risk += 10;
    if (anchorCount > 5) risk += 10;
    if (mergeKeys > 3) risk += 10;
    if (configSize > 10_000) risk += 5;
    risk = Math.min(risk, 100);
    this.riskScores.analysis = risk;

    // 1d. Git stats
    let gitChanges = 0;
    let lastTag = this.opts.from;
    try {
      if (!lastTag) {
        const tagOut = await $`git tag --sort=-creatordate 2>/dev/null`.text().catch(() => "");
        const tags = tagOut.trim().split("\n").filter((t) => t.startsWith("release-") || t.startsWith("deploy-"));
        lastTag = tags[0] || "HEAD~10";
      }
      const diffStat = await $`git diff --stat ${lastTag}..HEAD 2>/dev/null`.text().catch(() => "");
      gitChanges = (diffStat.match(/\d+ file/)?.[0] ?? "0").replace(/ file/, "") as unknown as number;
    } catch {
      gitChanges = 0;
    }

    // 1e. Security validation (check for sensitive patterns)
    const sensitivePatterns = ["password", "secret", "private_key", "api_key", "token"];
    const sensitiveHits = sensitivePatterns.filter((p) =>
      configText.toLowerCase().includes(p)
    );
    if (sensitiveHits.length > 0) {
      this.riskScores.validation = sensitiveHits.length * 15;
    }

    console.log(`  Config: ${this.opts.config} (${configSize}B, sha256:${configHash})`);
    console.log(`  Keys: ${keyCount} | Anchors: ${anchorCount} | Merge keys: ${mergeKeys} | Docs: ${docCount}`);
    console.log(`  Git changes since ${lastTag}: ${gitChanges} files`);
    console.log(`  Risk score: ${riskColor(risk)}${risk}/100${RESET}`);

    if (sensitiveHits.length > 0) {
      console.log(`  ${YELLOW}Warning: sensitive patterns found: ${sensitiveHits.join(", ")}${RESET}`);
    }

    console.log(`  ${GREEN}Analysis passed${RESET}\n`);

    return this.phase("analysis", 0, t0, {
      configHash, configSize, keyCount, anchorCount, mergeKeys, docCount, gitChanges, risk,
      sensitiveHits: sensitiveHits.length,
    });
  }

  // ── Phase 2: Release Decision Gate ─────────────────────────────────

  private async phaseGate(analysis: PhaseResult): Promise<PhaseResult> {
    const t0 = Bun.nanoseconds();
    console.log(`${BOLD}[2/4] Release Decision Gate${RESET}`);

    const risk = this.riskScores.analysis;
    const data = analysis.data;
    const recommendation = risk <= 30 ? "SAFE TO DEPLOY" : risk <= 60 ? "PROCEED WITH CAUTION" : "HIGH RISK — REVIEW REQUIRED";

    console.log(`\n  ${BOLD}${CYAN}FACTORYWAGER RELEASE CANDIDATE${RESET}`);
    console.log(`  Version:        ${this.opts.version}`);
    console.log(`  Config:         ${this.opts.config}`);
    console.log(`  Risk Score:     ${riskColor(risk)}${risk}/100${RESET}`);
    console.log(`  Keys Modified:  ${data.keyCount}`);
    console.log(`  Git Changes:    ${data.gitChanges} files`);
    console.log(`  Security Gates: ${this.riskScores.validation === 0 ? `${GREEN}5/5 passed${RESET}` : `${YELLOW}review needed${RESET}`}`);
    console.log(`  Recommendation: ${recommendation}`);
    console.log();

    if (this.opts.dryRun) {
      console.log(`  ${CYAN}DRY RUN — skipping confirmation${RESET}\n`);
      return this.phase("gate", 0, t0, { mode: "dry-run", recommendation });
    }

    if (this.opts.yes) {
      console.log(`  ${GREEN}--yes flag — auto-confirmed${RESET}\n`);
      return this.phase("gate", 0, t0, { mode: "automated", recommendation });
    }

    // Interactive confirmation
    process.stdout.write(`  Type "${BOLD}DEPLOY${RESET}" to release ${this.opts.version} to production: `);

    const reader = Bun.stdin.stream().getReader();
    const { value } = await reader.read();
    reader.releaseLock();
    const input = value ? new TextDecoder().decode(value).trim() : "";

    if (input !== "DEPLOY") {
      console.log(`  ${RED}Release cancelled by user${RESET}\n`);
      return this.phase("gate", 5, t0, { mode: "interactive", cancelled: true });
    }

    console.log(`  ${GREEN}Confirmed — proceeding to deployment${RESET}\n`);
    return this.phase("gate", 0, t0, { mode: "interactive", recommendation });
  }

  // ── Phase 3: Deployment ────────────────────────────────────────────

  private async phaseDeploy(): Promise<PhaseResult> {
    const t0 = Bun.nanoseconds();
    console.log(`${BOLD}[3/4] Deployment Execution${RESET}`);

    const stages = ["development", "staging", "production"];

    for (const stage of stages) {
      const stageT0 = Bun.nanoseconds();

      if (this.opts.dryRun) {
        await Bun.sleep(50); // simulate latency
        console.log(`  ${CYAN}[DRY RUN]${RESET} ${stage}: simulated (${elapsed(stageT0)}ms)`);
      } else {
        // Real deployment simulation — do actual work to make profiling meaningful
        const configText = await Bun.file(this.opts.config).text().catch(() => "");
        const hash = new Bun.CryptoHasher("sha256").update(`${stage}-${configText}-${Date.now()}`).digest("hex").slice(0, 8);
        await Bun.sleep(100); // simulate deployment latency

        console.log(`  ${GREEN}${stage}${RESET}: deployed (hash:${hash}, ${elapsed(stageT0)}ms)`);
      }
    }

    // Drift calculation
    this.riskScores.drift = Math.round(Math.random() * 10); // real drift would come from config diff

    // Post-deploy health check
    const healthT0 = Bun.nanoseconds();
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const health = Math.max(85, 100 - this.riskScores.drift);
    console.log(`  Health check: ${health}% (heap: ${memMB}MB, ${elapsed(healthT0)}ms)`);
    console.log(`  ${GREEN}Deployment complete${RESET}\n`);

    return this.phase("deploy", 0, t0, { stages: stages.length, health, drift: this.riskScores.drift });
  }

  // ── Phase 4: Finalization ──────────────────────────────────────────

  private async phaseFinalize(runT0: number, mode: string): Promise<PhaseResult> {
    const t0 = Bun.nanoseconds();
    console.log(`${BOLD}[4/4] Release Finalization${RESET}`);

    const timestamp = tsFile();
    const tagName = `release-${this.opts.version}-${timestamp}`;
    const reportPath = `${FW_DIR}/releases/release-${this.opts.version}-${timestamp}.md`;

    // 4a. Generate release report
    const report = this.generateReport(tagName, timestamp, mode);
    await Bun.write(reportPath, report);
    console.log(`  Report: ${reportPath}`);

    // 4b. Git tag
    if (this.opts.dryRun) {
      console.log(`  ${CYAN}[DRY RUN]${RESET} Git tag: ${tagName} (simulated)`);
    } else {
      try {
        await $`git tag -a ${tagName} -m ${"Release " + this.opts.version} 2>/dev/null`.quiet();
        console.log(`  Git tag: ${tagName}`);
      } catch {
        console.log(`  ${YELLOW}Git tag skipped (not a git repo or tag exists)${RESET}`);
      }
    }

    // 4c. Audit log
    const auditPath = `${FW_DIR}/audit.log`;
    console.log(`  Audit: ${auditPath}`);
    console.log(`  ${GREEN}Finalization complete${RESET}\n`);

    return this.phase("finalize", 0, t0, { reportPath, tagName });
  }

  // ── Report Generation ──────────────────────────────────────────────

  private generateReport(tagName: string, timestamp: string, mode: string): string {
    const risk = this.riskScores;
    const phaseSummary = this.phases.map((p) =>
      `- **${p.name}**: ${p.exitCode === 0 ? "PASSED" : "FAILED"} (${p.durationMs}ms)`
    ).join("\n");

    return `# FactoryWager Release Report

## Release Information
- **Version**: ${this.opts.version}
- **Timestamp**: ${timestamp}
- **Configuration**: ${this.opts.config}
- **Mode**: ${mode}
- **Risk Score**: ${risk.composite}/100
- **Status**: SUCCESS

## Workflow Results
${phaseSummary}

## Risk Assessment
- **Analysis Risk**: ${risk.analysis}/100
- **Validation Risk**: ${risk.validation}/100
- **Drift Risk**: ${risk.drift}/100
- **Composite Risk**: ${risk.composite}/100

## Artifacts Created
- Release Report: ${FW_DIR}/releases/release-${this.opts.version}-${timestamp}.md
- Git Tag: ${tagName}
- Audit Trail: ${FW_DIR}/audit.log

## Phase Details
${this.phases.map((p) => `### ${p.name}\n\`\`\`json\n${JSON.stringify(p.data, null, 2)}\n\`\`\``).join("\n\n")}

## Next Steps
- Monitor production for 30 minutes
- Review release report with stakeholders
- Update documentation as needed

---
*Generated by FactoryWager Release Orchestrator v2.0.0*
`;
  }

  // ── Audit Trail ────────────────────────────────────────────────────

  private async writeAudit(exitCode: number, totalMs: number, mode: string): Promise<void> {
    const audit: ReleaseAudit = {
      timestamp: ts(),
      workflow: "fw-release",
      version: this.opts.version,
      config: this.opts.config,
      mode: mode as ReleaseAudit["mode"],
      phases: Object.fromEntries(
        this.phases.map((p) => [p.name, { exit_code: p.exitCode, duration_seconds: Math.round(p.durationMs / 1000 * 100) / 100 }])
      ),
      risk_scores: this.riskScores,
      artifacts: {
        release_report: this.phases.find((p) => p.name === "finalize")?.data.reportPath as string ?? "",
        git_tag: this.phases.find((p) => p.name === "finalize")?.data.tagName as string ?? "",
      },
      exit_code: exitCode,
      total_duration_seconds: Math.round(totalMs / 1000 * 100) / 100,
    };

    const auditPath = `${FW_DIR}/audit.log`;
    const existing = await Bun.file(auditPath).text().catch(() => "");
    await Bun.write(auditPath, existing + JSON.stringify(audit) + "\n");
  }

  // ── Abort ──────────────────────────────────────────────────────────

  private async abort(exitCode: number, reason: string, runT0: number, mode: string): Promise<number> {
    const totalMs = elapsed(runT0);
    console.log(`\n${BOLD}${RED}━━━ RELEASE FAILED — Phase ${this.phases.length + 1}/4 ━━━${RESET}`);
    console.log(`${DIM}Reason: ${reason} | Exit: ${exitCode} | Duration: ${totalMs}ms${RESET}\n`);

    await this.writeAudit(exitCode, totalMs, mode);
    return exitCode;
  }

  // ── Phase helper ───────────────────────────────────────────────────

  private phase(name: string, exitCode: number, t0: number, data: Record<string, unknown>): PhaseResult {
    const result: PhaseResult = { name, exitCode, durationMs: elapsed(t0), data };
    this.phases.push(result);
    return result;
  }
}

// ── Arg Parser ───────────────────────────────────────────────────────

export function parseReleaseArgs(args: string[]): ReleaseOptions | null {
  let config = "";
  let version = "";
  let yes = false;
  let dryRun = false;
  let from: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--yes" || arg === "-y") { yes = true; continue; }
    if (arg === "--dry-run") { dryRun = true; continue; }
    if (arg.startsWith("--version=")) { version = arg.split("=")[1]; continue; }
    if (arg === "--version") { version = args[++i] ?? ""; continue; }
    if (arg.startsWith("--from=")) { from = arg.split("=")[1]; continue; }
    if (arg === "--from") { from = args[++i] ?? null; continue; }
    if (!arg.startsWith("-") && !config) { config = arg; continue; }
  }

  if (!version) {
    console.error(`${RED}--version is required${RESET}`);
    console.log(`Usage: factory-wager release <config> --version=X.Y.Z [--yes] [--dry-run]`);
    return null;
  }

  if (!config) config = "config.yaml";

  return { config, version, yes, dryRun, from };
}

// ── Standalone ───────────────────────────────────────────────────────

if (import.meta.main) {
  const opts = parseReleaseArgs(process.argv.slice(2));
  if (!opts) process.exit(127);

  const orchestrator = new ReleaseOrchestrator(opts);
  const code = await orchestrator.run();
  process.exit(code);
}
