import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const readProjectFile = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

test("npmjs reads remain explicit without Factory credentials", () => {
  const manifest = JSON.parse(readProjectFile("package.json"));
  const bunfigSource = readProjectFile("bunfig.toml");
  const bunfig = Bun.TOML.parse(bunfigSource) as {
    install?: { registry?: string; scopes?: Record<string, unknown> };
    publish?: unknown;
  };

  expect(manifest.private).toBe(true);
  expect(manifest.publishConfig).toBeUndefined();
  expect(manifest.scripts.publish).toBeUndefined();
  expect(existsSync(join(projectRoot, ".npmrc"))).toBe(false);
  expect(bunfig.install?.registry).toBe("https://registry.npmjs.org");
  expect(bunfig.install?.scopes?.["@factorywager"]).toBeUndefined();
  expect(bunfig.install?.scopes?.["@duoplus"]).toBeUndefined();
  expect(bunfig.publish).toBeUndefined();
  expect(bunfigSource).not.toMatch(/FW_REGISTRY_TOKEN|factory-wager\.com/);
});

test("DNS warmup targets only the exercised npmjs install route", () => {
  const dnsPrefetch = readProjectFile("dns-prefetch.ts");

  expect(dnsPrefetch).toContain('dns.prefetch("registry.npmjs.org", 443)');
  expect(dnsPrefetch).not.toContain("registry.factory-wager.com");
});
