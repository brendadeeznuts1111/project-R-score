import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolveTargetDependencies } from "../dependency-resolver.ts";
import { meetsSeverity } from "../rule-engine.ts";
import { applyPackageFix } from "../remediation.ts";
import { SemverMatcher } from "../semver-matcher.ts";
import type { Severity } from "../types.ts";
import type {
  WorkflowDrift,
  WorkflowEffectDeps,
  WorkflowScannerResult,
} from "../workflow-loop.ts";
import {
  fetchWithTls,
  formatBunRuntimeLine,
  type BunDriftInfo,
  type BunRuntimeInfo,
  type WorkflowTlsOptions,
} from "./runtime.ts";

export function formatWorkflowHerdr(
  domainId: string,
  results: WorkflowScannerResult[],
  drift: WorkflowDrift | null,
  opts?: { bun?: BunRuntimeInfo; bunDrift?: BunDriftInfo | null; includeBunVersion?: boolean },
): string {
  const lines = [`# workflow: ${domainId}`, ""];
  if (opts?.includeBunVersion !== false && opts?.bun) {
    lines.push("## runtime");
    lines.push(`- ${formatBunRuntimeLine(opts.bun)}`);
    if (opts.bunDrift?.drift) {
      lines.push(`- **bun drift:** ${opts.bunDrift.versionDelta ?? "version changed"}`);
    }
    lines.push("");
  }
  for (const r of results) {
    lines.push(`## ${r.scannerId} (${r.status}) — ${r.elapsedMs}ms`);
    if (!r.issues.length) {
      lines.push("- no issues");
    } else {
      for (const issue of r.issues.slice(0, 32)) {
        lines.push(`- **${issue.severity}** ${issue.message}`);
      }
      if (r.issues.length > 32) {
        lines.push(`- … +${r.issues.length - 32} more`);
      }
    }
    lines.push("");
  }
  if (drift?.network) {
    lines.push("## network drift");
    lines.push(`- endpoints +${drift.network.endpoints_added}/-${drift.network.endpoints_removed}`);
    lines.push(`- routes +${drift.network.routes_added}/-${drift.network.routes_removed}`);
    lines.push(`- health=${drift.network.health_status}`);
    lines.push("");
  }
  if (drift?.bun?.drift) {
    lines.push("## bun drift");
    lines.push(`- ${drift.bun.versionDelta ?? `${drift.bun.seed?.bunVersion} → ${drift.bun.current.version}`}`);
    lines.push("");
  }
  if (drift) {
    lines.push(`**hasDrift:** ${drift.hasDrift}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export type WorkflowAlertPayload = {
  domain: string;
  timestamp: string;
  bun?: BunRuntimeInfo;
  bunDrift?: Pick<BunDriftInfo, "drift" | "versionDelta">;
  results: Array<{ scanner: string; status: string; issues: number }>;
  drift: WorkflowDrift | null;
};

export async function sendWorkflowAlert(
  domainId: string,
  results: WorkflowScannerResult[],
  drift: WorkflowDrift | null,
  webhookUrl: string,
  deps: WorkflowEffectDeps = {},
  opts?: {
    tls?: WorkflowTlsOptions;
    bun?: BunRuntimeInfo;
    bunDrift?: BunDriftInfo | null;
    includeBunVersion?: boolean;
  },
): Promise<{ ok: boolean; status?: number }> {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const payload: WorkflowAlertPayload = {
    domain: domainId,
    timestamp: new Date().toISOString(),
    results: results.map((r) => ({
      scanner: r.scannerId,
      status: r.status,
      issues: r.issues.length,
    })),
    drift,
  };
  if (opts?.includeBunVersion !== false && opts?.bun) {
    payload.bun = opts.bun;
    if (opts.bunDrift?.drift) {
      payload.bunDrift = {
        drift: true,
        versionDelta: opts.bunDrift.versionDelta,
      };
    }
  }
  const tls = opts?.tls ?? deps.tls;
  const resp = await fetchWithTls(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, tls, fetchFn);
  return { ok: resp.ok, status: resp.status };
}

export async function findSafePackageVersion(
  pkg: string,
  repo: string,
  deps: WorkflowEffectDeps = {},
): Promise<string | null> {
  if (deps.findSafeVersion) return deps.findSafeVersion(pkg, repo);
  try {
    const resp = await (deps.fetch ?? globalThis.fetch)(`https://registry.npmjs.org/${pkg}`);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { versions?: Record<string, unknown> };
    const versions = Object.keys(data.versions ?? {});
    return versions.sort(SemverMatcher.order).pop() ?? null;
  } catch {
    return null;
  }
}

export async function applyWorkflowFixes(
  domainId: string,
  results: WorkflowScannerResult[],
  opts: {
    repo: string;
    dryRun?: boolean;
    minSeverity?: Severity;
    deps?: WorkflowEffectDeps;
  },
): Promise<string[]> {
  const applied: string[] = [];
  const deps = opts.deps ?? {};
  const min = opts.minSeverity ?? "high";
  let packageJson: string | null = null;

  if (opts.dryRun) {
    console.error(`[${domainId}] fix: dry-run — no packages will be modified`);
  }

  for (const result of results) {
    if (result.scannerId !== "semver" && result.scannerId !== "packages") continue;
    for (const issue of result.issues) {
      if (!meetsSeverity(issue.severity, min)) continue;
      const pkg = issue.package ?? issue.remediation?.command?.match(/bun add (\S+)@/)?.[1];
      if (!pkg) {
        const match = issue.message.match(/([@\w./-]+)@([^\s]+)/);
        if (!match) continue;
        const [, name, version] = match;
        const safe = await findSafePackageVersion(name, opts.repo, deps);
        if (!safe || safe === version) continue;
        const cmd = `bun add ${name}@${safe}`;
        if (opts.dryRun) {
          applied.push(cmd);
          continue;
        }
        if (deps.spawn) {
          const proc = deps.spawn(["bun", "add", `${name}@${safe}`], { cwd: opts.repo });
          await proc.exited;
        } else {
          if (!packageJson) {
            const resolved = await resolveTargetDependencies({
              repo: opts.repo,
              targetPath: ".",
              includeDev: true,
            });
            packageJson = resolved.packageJson;
          }
          if (packageJson) {
            await applyPackageFix({ packageJsonPath: packageJson, package: name, version: safe });
          }
        }
        applied.push(cmd);
        continue;
      }

      const target = issue.remediation?.suggestedVersion
        ?? await findSafePackageVersion(pkg, opts.repo, deps);
      if (!target) continue;
      const cmd = issue.remediation?.command ?? `bun add ${pkg}@${target}`;
      if (opts.dryRun) {
        applied.push(cmd);
        continue;
      }
      if (deps.spawn) {
        const proc = deps.spawn(["bun", "add", `${pkg}@${target}`], { cwd: opts.repo });
        await proc.exited;
      } else if (issue.remediation?.suggestedVersion) {
        if (!packageJson) {
          const resolved = await resolveTargetDependencies({
            repo: opts.repo,
            targetPath: ".",
            includeDev: true,
          });
          packageJson = resolved.packageJson;
        }
        if (packageJson) {
          await applyPackageFix({
            packageJsonPath: packageJson,
            package: pkg,
            version: issue.remediation.suggestedVersion,
          });
        }
      }
      applied.push(cmd);
      console.error(`[${domainId}] fix: ${cmd}`);
    }
  }
  return applied;
}

export async function generateWorkflowReport(
  domainId: string,
  results: WorkflowScannerResult[],
  drift: WorkflowDrift | null,
  path: string,
  deps: WorkflowEffectDeps = {},
  opts?: {
    bun?: BunRuntimeInfo;
    bunDrift?: BunDriftInfo | null;
    includeBunVersion?: boolean;
  },
): Promise<string> {
  const body = formatWorkflowHerdr(domainId, results, drift, opts);
  const writeFn = deps.write ?? (async (p, data) => {
    await mkdir(dirname(resolve(p)), { recursive: true });
    await Bun.write(resolve(p), data);
  });
  await writeFn(path, body);
  return path;
}