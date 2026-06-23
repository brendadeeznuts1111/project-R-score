import { resolve } from "node:path";
import { Registry, type SemverViolation } from "./registry.ts";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import { loadThreatFeed, matchDependencies } from "./semver-matcher.ts";
import type { ScanResult, Severity } from "./types.ts";
import { meetsSeverity, normalizeSeverity } from "./rule-engine.ts";
import { runBundleScan } from "./bundle-scanner.ts";
import type { BundleScanReport } from "./types.ts";

export type ServiceOptions = {
  skillRoot: string;
  repo: string;
  targetId?: string;
  targetPath?: string;
  minSeverity?: Severity;
  threatFeed?: boolean;
  profileName?: string;
};

function violationsToScanResults(rows: SemverViolation[]): ScanResult[] {
  return rows.map((v) => ({
    type: "semver" as const,
    file: "package.json",
    line: 0,
    column: 0,
    ruleId: v.rule.id,
    severity: normalizeSeverity(v.rule.severity),
    message: `${v.package}@${v.version} violates policy: ${v.rule.description}`,
    layer: "deps" as const,
    detail: `range ${v.rule.range}`,
  }));
}

export class Service {
  readonly registry: Registry;

  constructor(private readonly options: ServiceOptions) {
    this.registry = new Registry(options.skillRoot);
  }

  private targetPath(): string {
    return this.options.targetPath ?? ".";
  }

  async extractDependencies(): Promise<Record<string, string>> {
    const { dependencies } = await resolveTargetDependencies({
      repo: this.options.repo,
      targetPath: this.targetPath(),
      includeDev: false,
    });
    const out: Record<string, string> = {};
    for (const d of dependencies) out[d.name] = d.version;
    return out;
  }

  async scanPackages(): Promise<ScanResult[]> {
    const deps = await this.extractDependencies();
    const violations = await this.registry.checkPackageVersions(deps);
    const min = this.options.minSeverity ?? "warn";
    return violationsToScanResults(violations).filter((f) =>
      meetsSeverity(f.severity, min),
    );
  }

  async scanBundles(): Promise<ScanResult[]> {
    const packageFindings = await this.scanPackages();
    const report = await runBundleScan({
      skillRoot: this.options.skillRoot,
      repo: this.options.repo,
      profileName: this.options.profileName ?? "supply-chain-ci",
      scanPath: this.targetPath(),
      threatFeed: this.options.threatFeed ?? true,
      format: "json",
    });
    const bundleFindings = report.targets.flatMap((t) => t.findings);

    if (this.options.threatFeed !== false) {
      const feed = await loadThreatFeed(this.options.skillRoot);
      const { dependencies } = await resolveTargetDependencies({
        repo: this.options.repo,
        targetPath: this.targetPath(),
      });
      const feedFindings = matchDependencies(
        dependencies,
        feed,
        this.options.minSeverity ?? "warn",
      );
      return [...packageFindings, ...bundleFindings, ...feedFindings];
    }

    return [...packageFindings, ...bundleFindings];
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
  findings: ScanResult[];
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
  const findings = await service.scanPackages();
  return { targetId, targetPath: resolve(opts.repo, targetPath), findings };
}