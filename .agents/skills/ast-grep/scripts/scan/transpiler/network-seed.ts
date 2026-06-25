import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { resolveTargetDependencies } from "./dependency-resolver.ts";
import type { NetworkLoopTick } from "./network-loop.ts";
import { runNetworkAuditOnce } from "./network-loop.ts";
import {
  defaultBaselinePath,
  writeNetworkBaseline,
  type NetworkBaseline,
} from "./network-baseline.ts";
import {
  baselineToSnapshotNetwork,
  defaultSnapshotPath,
} from "./snapshot-network.ts";
import { captureSnapshot, type DoctorSnapshotV2 } from "./snapshot.ts";

export type NetworkSeedOptions = {
  skillRoot: string;
  repo: string;
  scanPath: string;
  profileName: string;
  domain: string;
  snapshotPath?: string;
  openapiPath?: string;
  healthUrl?: string;
  /** Re-capture even when a baseline already exists. */
  force?: boolean;
  writeLegacyBaseline?: boolean;
};

export type NetworkSeedResult = {
  baseline: NetworkBaseline;
  tick: NetworkLoopTick;
  snapshotPath: string;
  legacyBaselinePath: string;
  wroteSnapshot: boolean;
  wroteLegacy: boolean;
};

export function shouldSeedNetworkBaseline(
  baseline: NetworkBaseline | undefined,
  opts: { force?: boolean },
): boolean {
  return opts.force === true || !baseline;
}

export async function mergeSnapshotNetworkSection(options: {
  skillRoot: string;
  snapshotPath: string;
  tick: NetworkLoopTick;
  repo: string;
  scanPath: string;
}): Promise<void> {
  if (!options.tick.baseline) return;
  const network = baselineToSnapshotNetwork(options.tick.baseline);
  let snapshot: DoctorSnapshotV2;
  try {
    snapshot = JSON.parse(await readFile(resolve(options.snapshotPath), "utf8")) as DoctorSnapshotV2;
  } catch {
    const { dependencies } = await resolveTargetDependencies({
      repo: options.repo,
      targetPath: options.scanPath,
      includeDev: false,
    });
    const packages: Record<string, string> = {};
    for (const d of dependencies) packages[d.name] = d.version;
    snapshot = await captureSnapshot({
      skillRoot: options.skillRoot,
      packages,
      network,
    });
  }
  const sections = new Set(snapshot.sections ?? []);
  sections.add("network");
  snapshot.sections = [...sections];
  snapshot.network = network;
  snapshot.generatedAt = new Date().toISOString();
  await mkdir(dirname(options.snapshotPath), { recursive: true });
  await writeFile(options.snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

/** Capture live network state and persist snapshot + optional legacy baseline before loop. */
export async function seedNetworkBaseline(
  opts: NetworkSeedOptions,
): Promise<NetworkSeedResult> {
  const snapshotPath = resolve(
    opts.snapshotPath ?? defaultSnapshotPath(opts.skillRoot, opts.domain),
  );
  const legacyBaselinePath = defaultBaselinePath(opts.skillRoot, opts.domain);

  const audit = await runNetworkAuditOnce({
    skillRoot: opts.skillRoot,
    repo: opts.repo,
    scanPath: opts.scanPath,
    profileName: opts.profileName,
    domain: opts.domain,
    openapiPath: opts.openapiPath,
    healthUrl: opts.healthUrl,
    verbose: false,
  });
  const tick = audit.tick;
  if (!tick.baseline) {
    throw new Error(`seed failed: no baseline captured for ${opts.domain}`);
  }

  await mergeSnapshotNetworkSection({
    skillRoot: opts.skillRoot,
    snapshotPath,
    tick,
    repo: opts.repo,
    scanPath: opts.scanPath,
  });

  let wroteLegacy = false;
  if (opts.writeLegacyBaseline !== false) {
    await writeNetworkBaseline(legacyBaselinePath, tick.baseline);
    wroteLegacy = true;
  }

  return {
    baseline: tick.baseline,
    tick,
    snapshotPath,
    legacyBaselinePath,
    wroteSnapshot: true,
    wroteLegacy,
  };
}

export function formatSeedStatus(result: NetworkSeedResult): string {
  return `[seed] domain=${result.baseline.domain}`
    + ` endpoints=${result.baseline.endpoints.total}`
    + ` routes=${result.baseline.endpoints.fingerprints.length}`
    + ` snapshot=${result.snapshotPath}`
    + (result.wroteLegacy ? ` legacy=${result.legacyBaselinePath}` : "");
}