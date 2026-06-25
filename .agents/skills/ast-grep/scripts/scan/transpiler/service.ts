import { resolve } from "node:path";
import { Registry } from "./registry.ts";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import type { ScanResult, Severity } from "./types.ts";
import { meetsSeverity } from "./rule-engine.ts";
import { runBundleScan } from "./bundle-scanner.ts";
import type { BundleScanReport } from "./types.ts";
import { suggestRemediation, type RemediationHint } from "./remediation.ts";
import { violationToFinding } from "./dep-scan.ts";
import {
  buildRemediationPlan,
  applyRemediationPlan,
  remediationFromHint,
} from "./remediation-plan.ts";
import { loadPackageProfile } from "./profile-loader.ts";

export type ServiceOptions = {
  skillRoot: string;
  repo: string;
  targetId?: string;
  targetPath?: string;
  minSeverity?: Severity;
  threatFeed?: boolean;
  profileName?: string;
  packageProfileName?: string;
  fix?: boolean;
  dryRunFix?: boolean;
  includeDevDependencies?: boolean;
};

export class Service {
  readonly registry: Registry;

  constructor(private readonly options: ServiceOptions) {
    this.registry = new Registry(options.skillRoot);
  }

  private targetPath(): string {
    return this.options.targetPath ?? ".";
  }

  private async resolvePackageProfile() {
    return loadPackageProfile(
      this.options.skillRoot,
      this.options.packageProfileName ?? "default",
    );
  }

  async extractDependencies(): Promise<{
    packages: Record<string, string>;
    packageJson: string | null;
  }> {
    const pkgProfile = await this.resolvePackageProfile();
    const { dependencies, packageJson } = await resolveTargetDependencies({
      repo: this.options.repo,
      targetPath: this.targetPath(),
      includeDev: this.options.includeDevDependencies ?? pkgProfile.include_dev_dependencies ?? false,
    });
    const packages: Record<string, string> = {};
    for (const d of dependencies) packages[d.name] = d.version;
    return { packages, packageJson };
  }

  async scanPackages(): Promise<{
    findings: ScanResult[];
    remediations: RemediationHint[];
    fixesApplied: string[];
    plan: Awaited<ReturnType<typeof buildRemediationPlan>>;
  }> {
    const pkgProfile = await this.resolvePackageProfile();
    const { packages, packageJson } = await this.extractDependencies();
    const threatFeed = this.options.threatFeed ?? pkgProfile.threat_feed ?? true;
    const violations = await this.registry.checkAllViolations(packages, { threatFeed });
    const min = this.options.minSeverity ?? pkgProfile.min_severity ?? "warn";
    const filtered = violations.filter((v) => meetsSeverity(v.severity, min));

    const remediations: RemediationHint[] = [];
    const findings: ScanResult[] = [];

    for (const v of filtered) {
      const hint = await suggestRemediation({
        repo: this.options.repo,
        package: v.package,
        currentVersion: v.version,
        kinds: v.kinds ?? [v.kind],
        safeRange: v.safeRange,
        vulnRange: v.vulnRange,
      });
      if (hint) remediations.push(hint);
      findings.push(violationToFinding(v, remediationFromHint(hint)));
    }

    const remediationEnabled = pkgProfile.remediation !== false;
    const plan = remediationEnabled
      ? await buildRemediationPlan({ repo: this.options.repo, findings })
      : { actionable: 0, upgrades: 0, removals: 0, commands: [], items: [], totalFindings: findings.length };
    let fixesApplied: string[] = [];
    if (this.options.fix && packageJson && plan.items.length && remediationEnabled) {
      const applied = await applyRemediationPlan({
        plan,
        packageJsonPath: packageJson,
        dryRun: this.options.dryRunFix,
      });
      fixesApplied = applied.applied;
    }

    return { findings, remediations, fixesApplied, plan };
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
  plan: Awaited<ReturnType<typeof buildRemediationPlan>>;
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
  const { findings, remediations, fixesApplied, plan } = await service.scanPackages();

  return {
    targetId,
    targetPath: resolve(opts.repo, targetPath),
    packageJson,
    findings,
    remediations,
    fixesApplied,
    plan,
    threatFeed: opts.threatFeed !== false,
  };
}