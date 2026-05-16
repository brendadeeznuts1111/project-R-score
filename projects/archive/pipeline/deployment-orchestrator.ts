#!/usr/bin/env bun

type DeployPhase = "stable" | "validation" | "beta";

type CommandResult = {
  phase: DeployPhase;
  command: string[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number;
  ok: boolean;
  stdout: string;
  stderr: string;
};

type DeployAllResult = {
  stable: CommandResult;
  validation: CommandResult;
  beta: CommandResult;
  metrics: {
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    phases: Array<{
      phase: DeployPhase;
      ok: boolean;
      exitCode: number;
      durationMs: number;
    }>;
    overallOk: boolean;
  };
};

type OrchestratorOptions = {
  cwd?: string;
  env?: Record<string, string>;
};

export class DeploymentOrchestrator {
  private readonly cwd: string;
  private readonly env: Record<string, string>;

  constructor(options: OrchestratorOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.env = {
      ...Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v ?? ""])),
      ...(options.env ?? {}),
    };
  }

  async deployAll(): Promise<DeployAllResult> {
    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    // Phase 1: Deploy stable components.
    const stableResults = await this.deployStableComponents();

    // Phase 2: Validate deployment.
    const validationResults = await this.runValidationSuite();

    // Phase 3: Deploy beta components to staging.
    const betaResults = await this.deployBetaToStaging();

    // Phase 4: Monitor and collect metrics.
    const metrics = this.collectDeploymentMetrics(startedAt, t0, [
      stableResults,
      validationResults,
      betaResults,
    ]);

    return {
      stable: stableResults,
      validation: validationResults,
      beta: betaResults,
      metrics,
    };
  }

  private async deployStableComponents(): Promise<CommandResult> {
    // Deploy in dependency order using --filter.
    return this.run(
      "stable",
      ["bun", "--filter=*", "run", "deploy:production"],
    );
  }

  private async runValidationSuite(): Promise<CommandResult> {
    // Run validation in parallel.
    return this.run(
      "validation",
      [
        "bun",
        "run",
        "--parallel",
        "validate:performance",
        "validate:security",
        "validate:integration",
        "validate:smoke",
      ],
    );
  }

  private async deployBetaToStaging(): Promise<CommandResult> {
    // Deploy beta components with canary strategy.
    return this.run(
      "beta",
      [
        "bun",
        "run",
        "--sequential",
        "deploy:beta:canary",
        "monitor:beta:canary",
        "deploy:beta:full",
      ],
    );
  }

  private collectDeploymentMetrics(
    startedAt: string,
    t0: number,
    results: CommandResult[],
  ): DeployAllResult["metrics"] {
    const finishedAt = new Date().toISOString();
    return {
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      phases: results.map((r) => ({
        phase: r.phase,
        ok: r.ok,
        exitCode: r.exitCode,
        durationMs: r.durationMs,
      })),
      overallOk: results.every((r) => r.ok),
    };
  }

  private async run(phase: DeployPhase, command: string[]): Promise<CommandResult> {
    const startedAt = new Date().toISOString();
    const t0 = performance.now();

    const proc = Bun.spawn({
      cmd: command,
      cwd: this.cwd,
      env: this.env,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdoutBuf, stderrBuf] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).arrayBuffer(),
      new Response(proc.stderr).arrayBuffer(),
    ]);

    const finishedAt = new Date().toISOString();
    const result: CommandResult = {
      phase,
      command,
      startedAt,
      finishedAt,
      durationMs: Math.round(performance.now() - t0),
      exitCode,
      ok: exitCode === 0,
      stdout: Buffer.from(stdoutBuf).toString("utf8"),
      stderr: Buffer.from(stderrBuf).toString("utf8"),
    };

    if (!result.ok) {
      throw new Error(
        `[deployment-orchestrator] ${phase} failed (exit=${result.exitCode})\n${result.stderr || result.stdout}`,
      );
    }

    return result;
  }
}

if (import.meta.main) {
  const orchestrator = new DeploymentOrchestrator();
  const result = await orchestrator.deployAll();
  console.log(JSON.stringify(result, null, 2));
}
