import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..");
const unsupportedAuditRemediation = ["bun", "audit", "fix"].join(" ");
const excludedSegments = [
  "/node_modules/",
  "/coverage/",
  "/reports/",
  "/snapshots/",
  "/docs/releases/",
];

test("active projects do not advertise unavailable audit remediation", async () => {
  const findings: string[] = [];

  // @see https://bun.com/docs/runtime/glob#quickstart
  const activeSources = new Bun.Glob(
    "projects/active/**/*.{json,md,ts,tsx,yml,yaml}",
  );

  for await (const relativePath of activeSources.scan({
    cwd: repositoryRoot,
    dot: true,
    followSymlinks: false,
    onlyFiles: true,
  })) {
    const normalizedPath = `/${relativePath.replaceAll("\\", "/")}`;
    if (excludedSegments.some((segment) => normalizedPath.includes(segment))) {
      continue;
    }

    if (
      readFileSync(join(repositoryRoot, relativePath), "utf8").includes(
        unsupportedAuditRemediation,
      )
    ) {
      findings.push(relativePath);
    }
  }

  expect(findings.sort()).toEqual([]);
});
