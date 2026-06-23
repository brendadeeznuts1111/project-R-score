#!/usr/bin/env bun
/**
 * Network surface + API endpoint catalog + health probes + audit loop.
 *
 *   bun scripts/network-cli.ts --path dist --health-url http://localhost:3000 --loop --watch
 *   bun scripts/network-cli.ts --path dist --health-url-secret sports-terminal/health/prod --loop --json
 *   bun scripts/network-cli.ts --path dist --domain sports-terminal-os --dry-run --verbose
 *   bun scripts/network-cli.ts --path dist --dry-run --output json
 *   bun scripts/network-cli.ts --path dist --domain sports-terminal-os --seed
 *   bun scripts/network-cli.ts --path dist --loop --watch --seed
 *   bun scripts/network-cli.ts --help
 *   bun scripts/network-cli.ts --pointers --json
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runBundleScan } from "./scan/transpiler/bundle-scanner.ts";
import { NetworkMatcher } from "./scan/transpiler/network-matcher.ts";
import {
  loadOpenApiCatalog,
  mergeEndpointSections,
  type HealthReport,
} from "./scan/transpiler/endpoint-catalog.ts";
import {
  formatSecretChannelLog,
  resolveHealthUrlSecret,
} from "./scan/transpiler/health-secrets.ts";
import {
  formatNetworkHerdrTab,
  formatNetworkLoopJson,
} from "./scan/transpiler/herdr-tab.ts";
import { formatColoredLoopStatus } from "./scan/transpiler/loop-color.ts";
import {
  writeNetworkBaseline,
  type NetworkBaseline,
} from "./scan/transpiler/network-baseline.ts";
import {
  formatSeedStatus,
  mergeSnapshotNetworkSection,
  seedNetworkBaseline,
  shouldSeedNetworkBaseline,
} from "./scan/transpiler/network-seed.ts";
import {
  defaultSnapshotPath,
  loadDomainBaseline,
} from "./scan/transpiler/snapshot-network.ts";
import {
  collectEndpointDetails,
  emitAuditResult,
  resolveAuditOutputFormat,
} from "./scan/transpiler/network-audit-result.ts";
import {
  formatGroundTruthValidationJson,
  formatGroundTruthValidationTable,
  groundTruthIdForDomain,
  validateNetworkGroundTruth,
} from "./scan/transpiler/network-ground-truth-validator.ts";
import {
  formatNetworkPointersJson,
  formatNetworkPointersText,
} from "./scan/transpiler/network-pointers.ts";
import {
  runNetworkAuditLoop,
  runNetworkAuditOnce,
  type NetworkLoopTick,
} from "./scan/transpiler/network-loop.ts";
import {
  renderMarkdownDocument,
  type ReportRenderFormat,
} from "./scan/transpiler/markdown-reporter.ts";
import type { BundleScanReport } from "./scan/transpiler/types.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean | number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }
  const out: Record<string, string | boolean | number> = {
    format: "markdown",
    profile: "supply-chain-network-dist",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pointers") out.pointers = true;
    else if (a === "--stdin") out.stdin = true;
    else if (a === "--json") out.json = true;
    else if (a === "--loop") out.loop = true;
    else if (a === "--watch") out.watch = true;
    else if (a === "--dry-run" || a === "-n") out["dry-run"] = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--quiet" || a === "-q") out.quiet = true;
    else if (a === "--herdr-tab") out["herdr-tab"] = true;
    else if (a === "--no-color") out["no-color"] = true;
    else if (a === "--fail-on-health") out["fail-on-health"] = true;
    else if (a === "--fail-on-drift") out["fail-on-drift"] = true;
    else if (a === "--baseline-write") out["baseline-write"] = true;
    else if (a === "--snapshot-write") out["snapshot-write"] = true;
    else if (a === "--seed") out.seed = true;
    else if (a === "--no-seed") out["no-seed"] = true;
    else if (a === "--validate-ground-truth" || a === "--check-standards") {
      out["validate-ground-truth"] = true;
    }
    else if (a.startsWith("--format=")) out.format = a.slice("--format=".length);
    else if (a === "--format" && argv[i + 1]) out.format = argv[++i];
    else if (a.startsWith("--output=")) out.output = a.slice("--output=".length);
    else if (a === "--output" && argv[i + 1]) out.output = argv[++i];
    else if (a.startsWith("--profile=")) out.profile = a.slice("--profile=".length);
    else if (a === "--profile" && argv[i + 1]) out.profile = argv[++i];
    else if (a.startsWith("--path=")) out.path = a.slice("--path=".length);
    else if (a === "--path" && argv[i + 1]) out.path = argv[++i];
    else if (a.startsWith("--repo=")) out.repo = a.slice("--repo=".length);
    else if (a === "--repo" && argv[i + 1]) out.repo = argv[++i];
    else if (a.startsWith("--domain=")) out.domain = a.slice("--domain=".length);
    else if (a === "--domain" && argv[i + 1]) out.domain = argv[++i];
    else if (a.startsWith("--baseline=")) out.baseline = a.slice("--baseline=".length);
    else if (a === "--baseline" && argv[i + 1]) out.baseline = argv[++i];
    else if (a.startsWith("--snapshot=")) out.snapshot = a.slice("--snapshot=".length);
    else if (a === "--snapshot" && argv[i + 1]) out.snapshot = argv[++i];
    else if (a.startsWith("--openapi=")) out.openapi = a.slice("--openapi=".length);
    else if (a === "--openapi" && argv[i + 1]) out.openapi = argv[++i];
    else if (a.startsWith("--health-url=")) out["health-url"] = a.slice("--health-url=".length);
    else if (a === "--health-url" && argv[i + 1]) out["health-url"] = argv[++i];
    else if (a.startsWith("--health-url-secret=")) {
      out["health-url-secret"] = a.slice("--health-url-secret=".length);
    } else if (a === "--health-url-secret" && argv[i + 1]) out["health-url-secret"] = argv[++i];
    else if (a.startsWith("--watch-interval=")) out["watch-interval"] = Number(a.slice("--watch-interval=".length));
    else if (a === "--watch-interval" && argv[i + 1]) out["watch-interval"] = Number(argv[++i]);
    else if (a.startsWith("--probe-interval=")) out["probe-interval"] = Number(a.slice("--probe-interval=".length));
    else if (a === "--probe-interval" && argv[i + 1]) out["probe-interval"] = Number(argv[++i]);
    else if (!a.startsWith("-") && !out.input) out.input = a;
  }
  return out;
}

async function readInput(opts: Record<string, string | boolean | number>): Promise<string> {
  if (opts.stdin === true || (!opts.path && !opts.input)) return Bun.stdin.text();
  if (opts.input) return readFile(String(opts.input), "utf8");
  return "";
}

async function resolveHealthUrl(
  opts: Record<string, string | boolean | number>,
): Promise<{ url?: string; secretChannel?: string }> {
  if (typeof opts["health-url"] === "string") {
    return { url: String(opts["health-url"]) };
  }
  if (typeof opts["health-url-secret"] === "string") {
    const resolved = await resolveHealthUrlSecret(String(opts["health-url-secret"]));
    process.stderr.write(
      `[secret] resolved health URL via ${formatSecretChannelLog(resolved.ref)}\n`,
    );
    return { url: resolved.url, secretChannel: resolved.ref.channel };
  }
  return {};
}

function resolveDomain(opts: Record<string, string | boolean | number>): string {
  if (typeof opts.domain === "string") return opts.domain;
  const path = String(opts.path ?? "");
  const m = path.match(/projects\/(?:active|experimental)\/([^/]+)/);
  if (m) return m[1];
  return String(opts.profile ?? "default");
}

function resolveSnapshotPath(
  opts: Record<string, string | boolean | number>,
  domain: string,
): string {
  if (typeof opts.snapshot === "string") {
    return resolve(String(opts.repo ?? process.cwd()), String(opts.snapshot));
  }
  return defaultSnapshotPath(SKILL_ROOT, domain);
}

async function scanPath(
  opts: Record<string, string | boolean | number>,
  healthUrl?: string,
): Promise<BundleScanReport> {
  const repo = resolve(String(opts.repo ?? process.cwd()));
  return runBundleScan({
    skillRoot: SKILL_ROOT,
    repo,
    profileName: String(opts.profile ?? "supply-chain-network-dist"),
    scanPath: String(opts.path),
    format: "json",
    openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
    healthUrl,
  });
}

async function buildNetworkMarkdown(
  report: BundleScanReport,
  opts: Record<string, string | boolean | number>,
): Promise<string> {
  const findings = report.targets?.flatMap((t) => t.findings) ?? [];
  const summary = NetworkMatcher.summarize(findings, true);
  let md = NetworkMatcher.buildNetworkMarkdown(summary);
  if (report.endpoints) {
    const catalog = await loadOpenApiCatalog(report.endpoints.source);
    md = mergeEndpointSections(md, catalog, report.health ? stripHealthBody(report.health) : undefined);
  } else if (typeof opts.openapi === "string") {
    const catalog = await loadOpenApiCatalog(String(opts.openapi));
    md = mergeEndpointSections(md, catalog);
  }
  return md;
}

function stripHealthBody(health: NonNullable<BundleScanReport["health"]>): HealthReport {
  return {
    probed: health.probed,
    base_url: health.base_url,
    overall: health.overall,
    probes: health.probes.map((p) => ({ ...p, body: undefined })),
  };
}

function tickExitCode(tick: NetworkLoopTick, opts: Record<string, string | boolean | number>): number {
  if (opts["fail-on-health"] === true && tick.health && tick.health.overall !== "healthy") return 1;
  if (opts["fail-on-drift"] === true && tick.delta?.drift) return 1;
  return 0;
}

function isQuiet(opts: Record<string, string | boolean | number>): boolean {
  return opts.quiet === true;
}

function writeLoopStatus(
  tick: NetworkLoopTick,
  opts: Record<string, string | boolean | number>,
  secretChannel?: string,
): void {
  if (isQuiet(opts)) return;
  const colored = opts["no-color"] !== true;
  const line = formatColoredLoopStatus({
    reason: tick.reason,
    detail: tick.detail,
    networkUnique: tick.report?.network?.unique_total,
    networkRaw: tick.report?.network?.total,
    endpoints: tick.report?.endpoints?.total,
    healthRoutes: tick.report?.endpoints?.health_count,
    health: tick.health,
    delta: tick.delta,
    secretChannel,
    opts: { enabled: colored },
  });
  process.stderr.write(`${line}\n`);
}

async function emitVerboseDetails(tick: NetworkLoopTick): Promise<void> {
  if (!tick.report) return;
  const details = await collectEndpointDetails(tick.report);
  if (details.routes.length) {
    process.stderr.write(`[verbose] routes=${details.routes.length}\n`);
    for (const route of details.routes.slice(0, 10)) {
      process.stderr.write(`  ${route}\n`);
    }
    if (details.routes.length > 10) {
      process.stderr.write(`  … +${details.routes.length - 10} more\n`);
    }
  }
}

async function emitTick(
  tick: NetworkLoopTick,
  opts: Record<string, string | boolean | number>,
  secretChannel?: string,
): Promise<void> {
  writeLoopStatus(tick, opts, secretChannel);
  if (tick.reason !== "probe" && opts.verbose === true && !isQuiet(opts)) {
    await emitVerboseDetails(tick);
  }

  if (isQuiet(opts)) return;

  if (opts.json === true) {
    process.stdout.write(`${formatNetworkLoopJson(tick, tick.delta)}\n`);
    return;
  }

  if (opts["herdr-tab"] === true) {
    for (const line of formatNetworkHerdrTab(tick, tick.delta)) {
      process.stdout.write(`${line}\n`);
    }
    return;
  }

  if (tick.reason !== "probe" && tick.report) {
    await emitOnce(opts, tick.report);
  }
}

async function emitOnce(
  opts: Record<string, string | boolean | number>,
  report: BundleScanReport,
): Promise<void> {
  if (opts.json === true && opts.loop !== true) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const md = await buildNetworkMarkdown(report, opts);
  const format = String(opts.format ?? "markdown") as ReportRenderFormat;
  process.stdout.write(renderMarkdownDocument(md, format));
}

async function maybeSeedBeforeLoop(
  opts: Record<string, string | boolean | number>,
  repo: string,
  domain: string,
  snapshotPath: string,
  baseline: NetworkBaseline | undefined,
  healthUrl?: string,
): Promise<{ baseline?: NetworkBaseline; seeded: boolean }> {
  if (opts["no-seed"] === true) return { baseline, seeded: false };
  const force = opts.seed === true;
  if (!shouldSeedNetworkBaseline(baseline, { force })) return { baseline, seeded: false };

  const seed = await seedNetworkBaseline({
    skillRoot: SKILL_ROOT,
    repo,
    scanPath: String(opts.path),
    profileName: String(opts.profile ?? "supply-chain-network-dist"),
    domain,
    snapshotPath,
    openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
    healthUrl,
    force,
  });
  if (!isQuiet(opts)) {
    process.stderr.write(`${formatSeedStatus(seed)}\n`);
  }
  return { baseline: seed.baseline, seeded: true };
}

async function runDryRun(
  opts: Record<string, string | boolean | number>,
  healthUrl?: string,
  secretChannel?: string,
): Promise<void> {
  if (!opts.path) {
    console.error("network dry-run requires --path");
    process.exit(1);
  }
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const domain = resolveDomain(opts);
  const snapshotPath = resolveSnapshotPath(opts, domain);
  const loaded = await loadDomainBaseline({
    skillRoot: SKILL_ROOT,
    domain,
    snapshotPath,
    baselinePath: typeof opts.baseline === "string"
      ? resolve(repo, String(opts.baseline))
      : undefined,
  });
  if (!isQuiet(opts)) {
    if (loaded.source) {
      process.stderr.write(`[snapshot] loaded drift source ${loaded.source}\n`);
    } else {
      process.stderr.write(`[snapshot] no baseline/snapshot for ${domain} (diffs disabled)\n`);
    }
    if (secretChannel) {
      process.stderr.write(`[secret] channel ${secretChannel}\n`);
    }
    process.stderr.write(
      `[dry-run] network audit path=${opts.path} domain=${domain}`
      + ` health=${healthUrl ? "probe-in-scan" : "off"}\n`,
    );
  }

  const result = await runNetworkAuditOnce({
    skillRoot: SKILL_ROOT,
    repo,
    scanPath: String(opts.path),
    profileName: String(opts.profile ?? "supply-chain-network-dist"),
    domain,
    openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
    healthUrl,
    baseline: loaded.baseline,
    verbose: opts.verbose === true,
  });

  if (!isQuiet(opts)) {
    emitAuditResult(result, resolveAuditOutputFormat(opts));
  }

  if (opts["validate-ground-truth"] === true) {
    const gtId = groundTruthIdForDomain(domain);
    const validation = await validateNetworkGroundTruth({
      skillRoot: SKILL_ROOT,
      repo,
      liveAudit: gtId ? result : undefined,
      liveGroundTruthId: gtId,
    });
    if (!isQuiet(opts)) {
      const fmt = resolveAuditOutputFormat(opts);
      if (fmt === "json") {
        process.stdout.write(formatGroundTruthValidationJson(validation));
      } else {
        process.stderr.write(formatGroundTruthValidationTable(validation));
      }
    }
    if (!validation.ok) process.exitCode = 1;
  }
}

async function runValidateGroundTruth(
  opts: Record<string, string | boolean | number>,
): Promise<void> {
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const domain = typeof opts.domain === "string" ? opts.domain : "sports-terminal-os";
  const gtId = groundTruthIdForDomain(domain);
  let liveAudit;
  if (opts.path && gtId) {
    liveAudit = await runNetworkAuditOnce({
      skillRoot: SKILL_ROOT,
      repo,
      scanPath: String(opts.path),
      profileName: String(opts.profile ?? "supply-chain-network-dist"),
      domain,
      openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
      verbose: false,
    });
  }
  const validation = await validateNetworkGroundTruth({
    skillRoot: SKILL_ROOT,
    repo,
    liveAudit,
    liveGroundTruthId: gtId,
  });
  if (opts.json === true) {
    process.stdout.write(formatGroundTruthValidationJson(validation));
  } else if (!isQuiet(opts)) {
    process.stderr.write(formatGroundTruthValidationTable(validation));
  }
  if (!validation.ok) process.exitCode = 1;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help === true) {
    console.log(formatNetworkPointersText());
    return;
  }
  if (opts.pointers === true) {
    if (opts.json === true) {
      process.stdout.write(`${formatNetworkPointersJson()}\n`);
    } else {
      console.log(formatNetworkPointersText());
    }
    return;
  }

  const { url: healthUrl, secretChannel } = await resolveHealthUrl(opts);

  if (opts["validate-ground-truth"] === true && opts["dry-run"] !== true && opts.loop !== true) {
    if (!opts.path && !opts.domain) {
      opts.path = "projects/active/sports-terminal-os/dist/frontend";
      opts.domain = "sports-terminal-os";
    }
    await runValidateGroundTruth(opts);
    return;
  }

  if (opts["dry-run"] === true) {
    await runDryRun(opts, healthUrl, secretChannel);
    return;
  }

  if (opts.seed === true && opts.loop !== true) {
    if (!opts.path) {
      console.error("network seed requires --path");
      process.exit(1);
    }
    const repo = resolve(String(opts.repo ?? process.cwd()));
    const domain = resolveDomain(opts);
    const snapshotPath = resolveSnapshotPath(opts, domain);
    const seed = await seedNetworkBaseline({
      skillRoot: SKILL_ROOT,
      repo,
      scanPath: String(opts.path),
      profileName: String(opts.profile ?? "supply-chain-network-dist"),
      domain,
      snapshotPath,
      openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
      healthUrl,
      force: true,
    });
    if (!isQuiet(opts)) process.stderr.write(`${formatSeedStatus(seed)}\n`);
    return;
  }

  if (opts.loop === true) {
    if (!opts.path) {
      console.error("network loop requires --path");
      process.exit(1);
    }
    const repo = resolve(String(opts.repo ?? process.cwd()));
    const domain = resolveDomain(opts);
    const snapshotPath = resolveSnapshotPath(opts, domain);
    const loaded = await loadDomainBaseline({
      skillRoot: SKILL_ROOT,
      domain,
      snapshotPath,
      baselinePath: typeof opts.baseline === "string"
        ? resolve(repo, String(opts.baseline))
        : undefined,
    });
    let baseline = loaded.baseline;
    let seededBeforeLoop = false;
    if (!isQuiet(opts)) {
      if (loaded.source) {
        process.stderr.write(`[snapshot] loaded drift source ${loaded.source}\n`);
      } else if (opts["no-seed"] === true) {
        process.stderr.write(`[snapshot] no baseline/snapshot for ${domain} (diffs disabled)\n`);
      }
    }

    const seedPrep = await maybeSeedBeforeLoop(
      opts,
      repo,
      domain,
      snapshotPath,
      baseline,
      healthUrl,
    );
    if (seedPrep.seeded) {
      baseline = seedPrep.baseline;
      seededBeforeLoop = true;
      if (!isQuiet(opts)) {
        process.stderr.write(`[snapshot] seeded baseline for ${domain} — drift detection enabled\n`);
      }
    } else if (!baseline && !isQuiet(opts) && opts["no-seed"] === true) {
      process.stderr.write(`[snapshot] no baseline/snapshot for ${domain} (diffs disabled)\n`);
    }

    const watchInterval = typeof opts["watch-interval"] === "number" ? opts["watch-interval"] : 750;
    const probeInterval = typeof opts["probe-interval"] === "number" ? opts["probe-interval"] : 8000;
    if (!isQuiet(opts)) {
      process.stderr.write(
        `[loop] network audit path=${opts.path} domain=${domain}`
        + ` watch=${opts.watch === true ? "on" : "off"}`
        + ` probe=${healthUrl ? `${probeInterval}ms` : "off"}`
        + ` snapshot=${snapshotPath}\n`,
      );
    }

    const ac = new AbortController();
    process.on("SIGINT", () => ac.abort());
    let wroteSnapshot = false;

    await runNetworkAuditLoop({
      skillRoot: SKILL_ROOT,
      repo,
      scanPath: String(opts.path),
      profileName: String(opts.profile ?? "supply-chain-network-dist"),
      domain,
      openapiPath: typeof opts.openapi === "string" ? opts.openapi : undefined,
      healthUrl,
      watch: opts.watch === true,
      watchIntervalMs: watchInterval,
      probeIntervalMs: probeInterval,
      baseline,
      verbose: opts.verbose === true,
      signal: ac.signal,
      onTick: async (tick) => {
        if (
          !wroteSnapshot
          && !seededBeforeLoop
          && (opts["snapshot-write"] === true || opts["baseline-write"] === true)
          && tick.baseline
          && tick.reason === "initial"
        ) {
          if (opts["snapshot-write"] === true) {
            await mergeSnapshotNetworkSection({
              skillRoot: SKILL_ROOT,
              snapshotPath,
              tick,
              repo,
              scanPath: String(opts.path),
            });
            if (!isQuiet(opts)) process.stderr.write(`[snapshot] wrote network section → ${snapshotPath}\n`);
            wroteSnapshot = true;
          }
          if (opts["baseline-write"] === true) {
            const legacyPath = resolve(SKILL_ROOT, "baselines", domain, "network-baseline.json5");
            await writeNetworkBaseline(legacyPath, tick.baseline);
            if (!isQuiet(opts)) process.stderr.write(`[baseline] wrote legacy ${legacyPath}\n`);
          }
          baseline = tick.baseline;
        }
        await emitTick(tick, opts, secretChannel);
        const code = tickExitCode(tick, opts);
        if (code) process.exitCode = code;
      },
    });
    return;
  }

  if (opts.path) {
    const report = await scanPath(opts, healthUrl);
    await emitOnce(opts, report);
    return;
  }

  const raw = (await readInput(opts)).trim();
  if (!raw) return;
  const report = JSON.parse(raw) as BundleScanReport;
  await emitOnce(opts, report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});