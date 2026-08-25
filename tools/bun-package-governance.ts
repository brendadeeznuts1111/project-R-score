// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @updated Bun.spawn · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.spawn · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.spawn · fixed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.spawn · fixed v0.6.6 · 2023-05-31 · https://bun.com/blog/bun-v0.6.6
// @updated Bun.spawn · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.spawn · fixed v1.0.8 · 2023-11-02 · https://bun.com/blog/bun-v1.0.8
// @updated Bun.spawn · fixed v1.0.9 · 2023-11-05 · https://bun.com/blog/bun-v1.0.9
// @updated Bun.spawn · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.spawn · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.spawn · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.spawn · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.spawn · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.spawn · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.spawn · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.spawn · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.spawn · fixed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.spawn · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · fixed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.spawn · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.spawn · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.spawn · changed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.spawn · changed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.spawn · fixed v1.2.16 · 2025-06-11 · https://bun.com/blog/bun-v1.2.16
// @updated Bun.spawn · fixed v1.2.17 · 2025-06-21 · https://bun.com/blog/bun-v1.2.17
// @updated Bun.spawn · changed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · fixed v1.2.18 · 2025-07-03 · https://bun.com/blog/bun-v1.2.18
// @updated Bun.spawn · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.spawn · fixed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated Bun.spawn · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.spawn · changed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.spawn · changed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.spawn · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.spawn · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.spawn · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/child-process
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/blog/bun-v1.4#bun-pm-licenses — Bun 1.4 license inventory
// @see https://bun.com/blog/bun-v1.4#bun-dedupe — Bun 1.4 lockfile deduplication

export const LICENSE_REVIEW_MARKERS = /^(unknown|unlicensed|see license in\b)/i;

export type LicenseGroup = {
  license: string;
  packages: number;
  versions: number;
};

export type LicenseSummary = {
  schemaVersion: 1;
  bunVersion: string;
  scope: 'production';
  licenses: LicenseGroup[];
  totals: {
    licenses: number;
    packages: number;
    uniquePackages: number;
    versions: number;
  };
  reviewRequired: Array<{ license: string; packages: string[] }>;
};

function parseObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseLicenseInventory(raw: unknown, bunVersion = Bun.version): LicenseSummary {
  const inventory = parseObject(raw);
  if (!inventory) throw new Error('bun pm licenses: expected a JSON object');

  const names = new Set<string>();
  const groups: LicenseGroup[] = [];
  const reviewRequired: LicenseSummary['reviewRequired'] = [];

  for (const license of Object.keys(inventory).sort((a, b) => a.localeCompare(b))) {
    const rows = inventory[license];
    if (!license.trim() || !Array.isArray(rows) || rows.length === 0) {
      throw new Error(`bun pm licenses: invalid or empty group ${JSON.stringify(license)}`);
    }
    let versions = 0;
    const reviewPackages: string[] = [];
    for (const [index, value] of rows.entries()) {
      const row = parseObject(value);
      if (!row || typeof row.name !== 'string' || !row.name.trim()) {
        throw new Error(`bun pm licenses: ${license}[${index}] is missing a package name`);
      }
      if (!Array.isArray(row.versions) || row.versions.length === 0) {
        throw new Error(`bun pm licenses: ${license}/${row.name} has no versions`);
      }
      if (row.versions.some(version => typeof version !== 'string' || !version.trim())) {
        throw new Error(`bun pm licenses: ${license}/${row.name} has an invalid version`);
      }
      if (row.license !== license) {
        throw new Error(`bun pm licenses: ${license}/${row.name} reports ${String(row.license)}`);
      }
      names.add(row.name);
      versions += row.versions.length;
      if (LICENSE_REVIEW_MARKERS.test(license)) reviewPackages.push(row.name);
    }
    groups.push({ license, packages: rows.length, versions });
    if (reviewPackages.length) {
      reviewRequired.push({ license, packages: reviewPackages.sort((a, b) => a.localeCompare(b)) });
    }
  }

  return {
    schemaVersion: 1,
    bunVersion,
    scope: 'production',
    licenses: groups,
    totals: {
      licenses: groups.length,
      packages: groups.reduce((total, group) => total + group.packages, 0),
      uniquePackages: names.size,
      versions: groups.reduce((total, group) => total + group.versions, 0),
    },
    reviewRequired,
  };
}

export type CommandResult = { exitCode: number; stdout: string; stderr: string };

export async function runBunPackageCommand(args: string[]): Promise<CommandResult> {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

export async function collectProductionLicenses(): Promise<LicenseSummary> {
  const result = await runBunPackageCommand(['pm', 'licenses', '--prod', '--json']);
  if (result.exitCode !== 0) {
    throw new Error(`bun pm licenses failed (${result.exitCode}): ${result.stderr.trim()}`);
  }
  try {
    return parseLicenseInventory(JSON.parse(result.stdout));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('bun pm licenses returned invalid JSON');
    throw error;
  }
}

export async function assertDedupeClean(): Promise<void> {
  const dedupe = await runBunPackageCommand(['dedupe', '--check']);
  if (dedupe.exitCode !== 0) {
    throw new Error(`bun dedupe --check failed:\n${(dedupe.stderr || dedupe.stdout).trim()}`);
  }
}
