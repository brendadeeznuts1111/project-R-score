import { arch, platform, release } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** @see https://bun.com/docs/pm/cli/install (--cpu / --os) */
export const PLATFORM_DOCS = "https://bun.com/docs/pm/cli/install";

export const CPU_VALUES = ["arm64", "x64", "ia32", "ppc64", "s390x"] as const;
export const OS_VALUES = [
  "linux",
  "darwin",
  "win32",
  "freebsd",
  "openbsd",
  "sunos",
  "aix",
] as const;

export type CpuArch = (typeof CPU_VALUES)[number];
export type OsTarget = (typeof OS_VALUES)[number];

export type PlatformTarget = {
  cpu: CpuArch;
  os: OsTarget;
};

export type HostPlatform = PlatformTarget & {
  rawArch: string;
  rawPlatform: string;
  release: string;
  bunVersion: string;
};

export type PlatformComparison = {
  host: HostPlatform;
  target: PlatformTarget;
  match: boolean;
  crossTarget: boolean;
  installArgs: string[];
};

export type InstallProfileSpec = {
  name: string;
  description?: string;
  args: string[];
  target?: PlatformTarget;
};

type InstallProfilesDoc = {
  profiles?: Record<string, { description?: string; args?: string[] }>;
  env?: { cpu?: string; os?: string };
};

export class PlatformMatcher {
  static normalizeCpu(raw: string): CpuArch | null {
    const v = raw.toLowerCase();
    if (v === "aarch64" || v === "arm64") return "arm64";
    if (v === "x86_64" || v === "amd64" || v === "x64") return "x64";
    if (v === "i386" || v === "i686" || v === "ia32") return "ia32";
    if (v === "ppc64" || v === "ppc64le") return "ppc64";
    if (v === "s390x") return "s390x";
    return CPU_VALUES.includes(v as CpuArch) ? (v as CpuArch) : null;
  }

  static normalizeOs(raw: string): OsTarget | null {
    const v = raw.toLowerCase();
    if (v === "macos" || v === "osx") return "darwin";
    if (v === "windows" || v === "win") return "win32";
    return OS_VALUES.includes(v as OsTarget) ? (v as OsTarget) : null;
  }

  static isValidCpu(cpu: string): cpu is CpuArch {
    return CPU_VALUES.includes(cpu as CpuArch);
  }

  static isValidOs(osName: string): osName is OsTarget {
    return OS_VALUES.includes(osName as OsTarget);
  }

  static isValidTarget(target: PlatformTarget): boolean {
    return PlatformMatcher.isValidCpu(target.cpu) && PlatformMatcher.isValidOs(target.os);
  }

  static detectHost(): HostPlatform {
    const rawArch = arch();
    const rawPlatform = platform();
    const cpu = PlatformMatcher.normalizeCpu(rawArch) ?? "arm64";
    const osName = PlatformMatcher.normalizeOs(rawPlatform) ?? "linux";
    return {
      cpu,
      os: osName,
      rawArch,
      rawPlatform,
      release: release(),
      bunVersion: typeof Bun !== "undefined" ? Bun.version : "unknown",
    };
  }

  static fromEnv(env: Record<string, string | undefined> = process.env): PlatformTarget | null {
    const cpu = env.BUN_INSTALL_CPU ?? env.npm_config_cpu;
    const osName = env.BUN_INSTALL_OS ?? env.npm_config_os;
    if (!cpu && !osName) return null;
    const normalized: PlatformTarget = {
      cpu: PlatformMatcher.normalizeCpu(cpu ?? PlatformMatcher.detectHost().cpu) ?? "arm64",
      os: PlatformMatcher.normalizeOs(osName ?? PlatformMatcher.detectHost().os) ?? "linux",
    };
    return PlatformMatcher.isValidTarget(normalized) ? normalized : null;
  }

  static parseInstallArgs(args: string[]): PlatformTarget | null {
    let cpu: string | undefined;
    let osName: string | undefined;
    for (const arg of args) {
      if (arg.startsWith("--cpu=")) cpu = arg.slice("--cpu=".length);
      if (arg.startsWith("--os=")) osName = arg.slice("--os=".length);
    }
    if (!cpu && !osName) return null;
    const target: PlatformTarget = {
      cpu: PlatformMatcher.normalizeCpu(cpu ?? "") ?? "x64",
      os: PlatformMatcher.normalizeOs(osName ?? "") ?? "linux",
    };
    return PlatformMatcher.isValidTarget(target) ? target : null;
  }

  static compare(host: HostPlatform, target: PlatformTarget): PlatformComparison {
    const match = host.cpu === target.cpu && host.os === target.os;
    return {
      host,
      target,
      match,
      crossTarget: !match,
      installArgs: [`--cpu=${target.cpu}`, `--os=${target.os}`],
    };
  }

  static installArgs(target: PlatformTarget): string[] {
    return [`--cpu=${target.cpu}`, `--os=${target.os}`];
  }
}

export async function loadInstallProfiles(skillRoot: string): Promise<InstallProfileSpec[]> {
  const path = join(skillRoot, "bun-install-profiles.json");
  const doc = JSON.parse(await readFile(path, "utf8")) as InstallProfilesDoc;
  return Object.entries(doc.profiles ?? {}).map(([name, spec]) => {
    const args = spec.args ?? [];
    return {
      name,
      description: spec.description,
      args,
      target: PlatformMatcher.parseInstallArgs(args) ?? undefined,
    };
  });
}

export async function resolveInstallProfile(
  skillRoot: string,
  profileName: string,
): Promise<InstallProfileSpec | null> {
  const rows = await loadInstallProfiles(skillRoot);
  return rows.find((r) => r.name === profileName) ?? null;
}

export function resolveScanPlatform(options: {
  profileTarget?: PlatformTarget;
  installProfile?: InstallProfileSpec | null;
  envTarget?: PlatformTarget | null;
  cliTarget?: PlatformTarget | null;
}): {
  host: HostPlatform;
  target: PlatformTarget;
  installProfile?: string;
  installArgs: string[];
  crossTarget: boolean;
} {
  const host = PlatformMatcher.detectHost();
  const target = options.cliTarget
    ?? options.profileTarget
    ?? options.installProfile?.target
    ?? options.envTarget
    ?? { cpu: host.cpu, os: host.os };
  const comparison = PlatformMatcher.compare(host, target);
  return {
    host,
    target,
    installProfile: options.installProfile?.name,
    installArgs: comparison.installArgs,
    crossTarget: comparison.crossTarget,
  };
}