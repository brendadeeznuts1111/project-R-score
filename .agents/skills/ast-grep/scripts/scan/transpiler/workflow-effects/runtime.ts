import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export type BunRuntimeInfo = {
  version: string;
  revision: string | null;
  isDebug: boolean;
  platform: string;
  arch: string;
};

export type WorkflowTlsOptions = {
  ca?: string | Buffer;
  cert?: string | Buffer;
  key?: string | Buffer;
  rejectUnauthorized?: boolean;
  minVersion?: number;
};

export type WorkflowTlsPaths = {
  ca?: string;
  cert?: string;
  key?: string;
  rejectUnauthorized?: boolean;
};

export type WorkflowRuntimeSeed = {
  schemaVersion: 1;
  bunVersion: string;
  bunRevision: string | null;
  platform: string;
  arch: string;
  capturedAt: string;
};

export type BunDriftInfo = {
  current: BunRuntimeInfo;
  seed: WorkflowRuntimeSeed | null;
  drift: boolean;
  versionDelta?: string;
};

export function captureBunRuntime(): BunRuntimeInfo {
  const bunGlobal = typeof Bun !== "undefined" ? Bun : undefined;
  return {
    version: bunGlobal?.version ?? process.version.replace(/^v/, ""),
    revision: bunGlobal && "revision" in bunGlobal ? String(bunGlobal.revision) : null,
    isDebug: process.env.NODE_ENV === "development"
      || (bunGlobal as { isDebug?: boolean } | undefined)?.isDebug === true,
    platform: process.platform,
    arch: process.arch,
  };
}

export function defaultWorkflowRuntimeSeedPath(skillRoot: string, domainId: string): string {
  return join(skillRoot, "baselines", domainId, "workflow-runtime.json");
}

export async function loadWorkflowRuntimeSeed(path: string): Promise<WorkflowRuntimeSeed | null> {
  try {
    const raw = JSON.parse(await readFile(resolve(path), "utf8")) as WorkflowRuntimeSeed;
    if (!raw?.bunVersion) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function writeWorkflowRuntimeSeed(
  path: string,
  bun: BunRuntimeInfo = captureBunRuntime(),
): Promise<string> {
  const abs = resolve(path);
  const seed: WorkflowRuntimeSeed = {
    schemaVersion: 1,
    bunVersion: bun.version,
    bunRevision: bun.revision,
    platform: bun.platform,
    arch: bun.arch,
    capturedAt: new Date().toISOString(),
  };
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  return abs;
}

export function detectBunDrift(
  current: BunRuntimeInfo,
  seed: WorkflowRuntimeSeed | null,
): BunDriftInfo {
  if (!seed) {
    return { current, seed: null, drift: false };
  }
  const drift = seed.bunVersion !== current.version
    || (seed.bunRevision != null && current.revision != null && seed.bunRevision !== current.revision);
  return {
    current,
    seed,
    drift,
    versionDelta: drift ? `${seed.bunVersion}→${current.version}` : undefined,
  };
}

export async function loadTlsOptions(paths: WorkflowTlsPaths): Promise<WorkflowTlsOptions | undefined> {
  const tls: WorkflowTlsOptions = {};
  if (paths.ca) tls.ca = await readFile(resolve(paths.ca));
  if (paths.cert) tls.cert = await readFile(resolve(paths.cert));
  if (paths.key) tls.key = await readFile(resolve(paths.key));
  if (paths.rejectUnauthorized !== undefined) {
    tls.rejectUnauthorized = paths.rejectUnauthorized;
  }
  if (!tls.ca && !tls.cert && !tls.key && tls.rejectUnauthorized === undefined) {
    return undefined;
  }
  return tls;
}

/** Bun.fetch accepts a `tls` field — types may lag behind runtime. */
export type BunFetchInit = RequestInit & { tls?: WorkflowTlsOptions };

export async function fetchWithTls(
  url: string,
  init: RequestInit,
  tls?: WorkflowTlsOptions,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<Response> {
  if (!tls) return fetchFn(url, init);
  const bunInit: BunFetchInit = { ...init, tls };
  return fetchFn(url, bunInit);
}

export function formatBunRuntimeLine(bun: BunRuntimeInfo): string {
  const rev = bun.revision ? ` (${bun.revision.slice(0, 8)})` : "";
  return `bun ${bun.version}${rev} ${bun.platform}/${bun.arch}${bun.isDebug ? " debug" : ""}`;
}