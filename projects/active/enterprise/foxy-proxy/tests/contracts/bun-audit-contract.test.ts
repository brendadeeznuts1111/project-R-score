import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "../..");
const readProjectFile = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("production and complete audits remain explicit", () => {
  const manifest = readProjectFile("package.json");

  expect(manifest).toContain('"security:audit": "bun audit --prod --audit-level=high"');
  expect(manifest).toContain('"security:audit:all": "bun audit --audit-level=high"');
  expect(manifest).not.toContain("bun audit fix");
});

test("unsupported automatic remediation is not advertised", () => {
  for (const policyFile of [
    "package.json",
    "docs/OPERATIONS.md",
    "docs/QUICK_REFERENCE.md",
    ".github/workflows/ci.yml",
    ".github/workflows/enhanced-ci.yml"
  ]) {
    expect(readProjectFile(policyFile)).not.toContain("bun audit fix");
  }
});

test("CI delegates audit policy to the package script", () => {
  for (const workflow of [".github/workflows/ci.yml", ".github/workflows/enhanced-ci.yml"]) {
    expect(readProjectFile(workflow)).toContain("run: bun run security:audit");
  }
});

test("the patched picomatch resolution cannot regress", () => {
  const lockfile = readProjectFile("bun.lock");

  expect(lockfile).toContain('"picomatch": ["picomatch@4.0.5"');
  expect(lockfile).not.toContain("picomatch@4.0.3");
});
