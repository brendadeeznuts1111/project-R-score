import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const readProjectFile = (relativePath: string) =>
  readFileSync(join(projectRoot, relativePath), "utf8");

const manifest = JSON.parse(readProjectFile("package.json"));
const bunfigSource = readProjectFile("bunfig.toml");
const bunfig = Bun.TOML.parse(bunfigSource) as Record<string, unknown>;
const dependencyNames = Object.keys({
  ...(manifest.dependencies ?? {}),
  ...(manifest.devDependencies ?? {}),
  ...(manifest.peerDependencies ?? {}),
  ...(manifest.optionalDependencies ?? {}),
});

assert.equal(
  dependencyNames.some((name) => /^@(factorywager|factory-wager|duoplus)\//.test(name)),
  false,
  "Factory or Duoplus registry routing requires an owned scoped dependency",
);
assert.equal(manifest.private, true, "the application root must stay private");
assert.equal(manifest.publishConfig, undefined, "the application root must not select a registry");
assert.equal(existsSync(join(projectRoot, ".npmrc")), false, "copied npm auth must stay absent");
assert.doesNotMatch(
  bunfigSource,
  /factory-wager\.com|@factorywager|@duoplus|FW_REGISTRY_TOKEN/,
  "copied Factory registry config must stay absent",
);
assert.equal(bunfig.publish, undefined, "no package-manager publish route is owned");

const r2Template = readProjectFile("env.r2.template");
assert.match(
  r2Template,
  /^REGISTRY_URL=https:\/\/registry\.yourdomain\.com$/m,
  "the unexercised generic registry placeholder remains isolated to the R2 template",
);
assert.doesNotMatch(readProjectFile("package.json"), /REGISTRY_URL/);
assert.doesNotMatch(bunfigSource, /REGISTRY_URL/);

console.log("registry config check passed: no copied routes or publication target");
