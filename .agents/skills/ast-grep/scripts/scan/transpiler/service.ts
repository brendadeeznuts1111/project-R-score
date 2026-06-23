import { resolve } from "node:path";
import { Registry, type PackageViolation } from "./registry.ts";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import { matchDependencies, loadThreatFeed } from "./semver-matcher.ts";
import type { ScanResult, Severity } from "./types.ts";
import { meetsSeverity, normalizeSeverity } from "./rule-engine.ts";
import { runBundleScan } from "./bundle-scanner.ts";
import type { BundleScanReport } from "./types.ts";
import { suggestUpgrade, applyPackageFix, type RemediationHint } from "./remediation.ts";

export type ServiceOptions = {
  skillRoot: string;
  repo: string;
  targetId?: string;
  targetPath?: string;
  minSeverity?: Severity;
  threatFeed?: boolean;
  profileName?: string;
  fix?: boolean;
  dryRunFix?: boolean;
};

function violationToScanResult(v: PackageViolation, remediation?: RemediationHint): ScanResult {
  const type = v.kind === "threat" ? "threat" as const : "semver" as const;
  return {
    type,
    file: v.package,
    line: 0,
    column: 0,
    ruleId: v.ruleId,
    severity: normalizeSeverity(v.severity),
    message: v.kind === "threat" && v.cve
      ? `${v.message} (${v.cve})`
      : `${v.package}@${v.version} — ${v.message}`,
    layer: "deps",
    detail: v.vulnRange ? `range ${v.vulnRange}` : undefined,
    cve: v.cve,
    remediation: remediation
      ? {
          safeRange: remediation.safeRange,
          suggestedVersion: remediation.suggestedVersion,
          latestInLockfile: remediation.latestInLockfile,
          command: remediation.command,
        }
      : undefined,
  };
}

export class Service {
  readonly registry: Registry;

  constructor(private readonly options: ServiceOptions) {
    this.registry = new Registry(options.skillRoot);
  }

  private targetPath(): string {
    return this.options.targetPath ?? ".";
  }

  async extractDependencies(): Promise<{
    packages: Record<string, string>;
    packageJson: string | null;
  }> {
    const { dependencies, packageJson } = await resolveTargetDependencies({
      repo: this.options.repo,
      targetPath: this.targetPath(),
      includeDev: false,
    });
    const packages: Record<string, string> = {};
    for (const d of dependencies) packages[d.name] = d.version;
    return { packages, packageJson };
  }

  async scanPackages(): Promise<{
    findings: ScanResult[];
    remediations: RemediationHint[];
    fixesApplied: string[];
  }> {
    const { packages, packageJson } = await this.extractDependencies();
    const violations = await this.registry.checkAllViolations(packages, {
      threatFeed: this.options.threatFeed ?? true,
    });
    const min = this.options.minSeverity ?? "warn";
    const filtered = violations.filter((v) => meetsSeverity(v.severity, min));

    const remediations: RemediationHint[] = [];
    const findings: ScanResult[] = [];
    const fixesApplied: string[] = [];

    for (const v of filtered) {
      const hint = await suggestUpgrade({
        repo: this.options.repo,
        package: v.package,
        currentVersion: v.version,
        safeRange: v.safeRange,
        vulnRange: v.vulnRange,
      });
      if (hint) remediations.push(hint);
      findings.push(violationToScanResult(v, hint ?? undefined));

      if (this.options.fix && hint?.suggestedVersion && packageJson) {
        const result = await applyPackageFix({
          packageJsonPath: packageJson,
          package: v.package,
          version: hint.suggestedVersion,
          dryRun: this.options.dryRunFix,
        });
        if (result.ok) fixesApplied.push(result.command);
      }
    }

    return { findings, remediations, fixesApplied };
  }

  async scanBundles(): Promise<ScanResult[]> {
    const { findings } = await this.scanPackages();
    const report = await runBundleScan({
      skillRoot: this.options.skillRoot,
      repo: this.options.repo,
      profileName: this.options.profileName ?? "supply-chain-ci",
      scanPath: this.targetPath(),
      threatFeed: this.options.threatFeed ?? true,
      format: "json",
    });
    const bundleFindings = report.targets.flatMap((t) => t.findings);
    return [...findings, ...bundleFindings];
  }

  async scanBundlesReport(): Promise<BundleScanReport> {
    return runBundleScan({
      skillRoot: this.options.skillRoot,
      repo: this.options.repo,
      profileName: this.options.profileName ?? "supply-chain-ci",
      scanPath: this.targetPath(),
      threatFeed: this.options.threatFeed ?? true,
    });
  }
}

export async function scanPackagesForTarget(opts: ServiceOptions): Promise<{
  targetId: string;
  targetPath: string;
  packageJson: string | null;
  findings: ScanResult[];
  remediations: RemediationHint[];
  fixesApplied: string[];
  threatFeed: boolean;
}> {
  const registry = new Registry(opts.skillRoot);
  const targets = await registry.loadTargets();
  let targetPath = opts.targetPath ?? ".";
  let targetId = opts.targetId ?? "root";

  if (opts.targetId) {
    const t = registry.getTarget(targets, opts.targetId);
    if (t?.path) {
      targetPath = t.path;
      targetId = t.id ?? opts.targetId;
    }
  }

  const service = new Service({ ...opts, targetPath, targetId });
  const { packages, packageJson } = await service.extractDependencies();
  const { findings, remediations, fixesApplied } = await service.scanPackages();

  return {
    targetId,
    targetPath: resolve(opts.repo, targetPath),
    packageJson,
    findings,
    remediations,
    fixesApplied,
    threatFeed: opts.threatFeed !== false,
  };
}