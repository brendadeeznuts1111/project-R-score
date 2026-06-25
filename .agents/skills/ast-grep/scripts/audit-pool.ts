#!/usr/bin/env bun
/**
 * Parallel repo-map audit via Bun Workers — one ast-grep scan per target.
 *
 *   bun scripts/audit-pool.ts --repo /path/to/repo --binary /path/to/ast-grep
 *     --workers 4 --only sports-terminal --profile bun-hygiene
 *
 * Emits JSON: { repo, workers, elapsed_ms, targets: AuditScanResult[] }
 */

import { readFile } from "node:fs/promises";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import type { AuditScanJob, AuditScanResult } from "./workers/audit-target.worker.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

type RepoTarget = {
  id?: string;
  path?: string;
  zone?: string;
  name?: string;
  tags?: string[];
  globs?: string[];
};

function parseArgs(argv: string[]): Record<string, string | string[] | number | boolean> {
  const out: Record<string, string | string[] | number | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (key === "workers") {
      out.workers = Number(next);
      i++;
    } else if (key === "globs") {
      const list = (out.globs as string[] | undefined) ?? [];
      list.push(next);
      out.globs = list;
      i++;
    } else if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function filterTargets(targets: RepoTarget[], only: string, zone: string): RepoTarget[] {
  let rows = targets;
  if (zone) {
    const z = zone.toLowerCase();
    rows = rows.filter((t) => (t.zone ?? "").toLowerCase() === z);
  }
  if (only) {
    const q = only.toLowerCase();
    rows = rows.filter((t) => {
      const id = (t.id ?? "").toLowerCase();
      const name = (t.name ?? "").toLowerCase();
      const path = (t.path ?? "").toLowerCase();
      const zoneId = (t.zone ?? "").toLowerCase();
      const tags = (t.tags ?? []).join(" ").toLowerCase();
      return q === id || q === zoneId || q.includes(id) || id.includes(q)
        || name.includes(q) || path.includes(q) || tags.includes(q);
    });
  }
  return rows;
}

function buildSgBaseArgs(
  opts: Record<string, string | string[] | number | boolean>,
  profileRules: string[] | null,
): string[] {
  const args = ["scan", "--json=compact", "--include-metadata", "--color", "never"];
  if (typeof opts.rule === "string") {
    let rule = opts.rule;
    if (!rule.startsWith("/")) rule = join(SKILL_ROOT, "rules", rule);
    args.push("-r", rule);
  } else if (typeof opts.config === "string") {
    args.push("-c", opts.config);
  } else {
    args.push("-c", join(SKILL_ROOT, "sgconfig.yml"));
  }
  if (profileRules?.length) args.push("--filter", profileRules.join("|"));
  return args;
}

async function scanInWorker(worker: Worker, job: AuditScanJob): Promise<AuditScanResult> {
  return await new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent<AuditScanResult>) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      resolve(ev.data);
    };
    const onError = (ev: ErrorEvent) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      reject(ev.error ?? new Error(String(ev.message)));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage(job);
  });
}

async function runPool(
  jobs: AuditScanJob[],
  workers: number,
): Promise<AuditScanResult[]> {
  if (jobs.length === 0) return [];

  const workerUrl = import.meta.resolve("./workers/audit-target.worker.ts");
  const size = Math.max(1, Math.min(workers, jobs.length));
  const results: AuditScanResult[] = new Array(jobs.length);
  let cursor = 0;

  async function workerLoop(): Promise<void> {
    const worker = new Worker(workerUrl, { type: "module" });
    try {
      while (true) {
        const index = cursor++;
        if (index >= jobs.length) break;
        results[index] = await scanInWorker(worker, jobs[index]);
      }
    } finally {
      worker.terminate();
    }
  }

  await Promise.all(Array.from({ length: size }, () => workerLoop()));
  return results;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const binary = String(opts.binary ?? "");
  if (!binary) {
    console.error("audit-pool: --binary required");
    process.exit(1);
  }

  const mapPath = join(SKILL_ROOT, "repo-map.json");
  const map = JSON.parse(await readFile(mapPath, "utf8")) as { targets: RepoTarget[] };
  const only = typeof opts.only === "string" ? opts.only : "";
  const zone = typeof opts.zone === "string" ? opts.zone : "";
  const targets = filterTargets(map.targets ?? [], only, zone);
  const workers = typeof opts.workers === "number" && opts.workers > 0
    ? opts.workers
    : cpus().length || 4;
  const extraGlobs = Array.isArray(opts.globs) ? opts.globs : [];

  let profileRules: string[] | null = null;
  if (typeof opts.profile === "string") {
    const profilesPath = join(SKILL_ROOT, "scan-profiles.json");
    const raw = JSON.parse(await readFile(profilesPath, "utf8")) as {
      profiles: Record<string, { rules?: string[] | null }>;
    };
    profileRules = raw.profiles[opts.profile]?.rules ?? null;
  }

  const sgBaseArgs = buildSgBaseArgs(opts, profileRules);
  const jobs: AuditScanJob[] = targets.map((t) => {
    const rel = t.path ?? ".";
    const globs = [...(t.globs ?? []), ...extraGlobs];
    return {
      binary,
      id: t.id ?? rel,
      relPath: rel,
      fullPath: resolve(repo, rel),
      sgBaseArgs,
      globs,
    };
  });

  const started = performance.now();
  const scanResults = await runPool(jobs, workers);
  const payload = {
    repo,
    workers,
    profile: typeof opts.profile === "string" ? opts.profile : null,
    elapsed_ms: Math.round(performance.now() - started),
    targets: scanResults,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});