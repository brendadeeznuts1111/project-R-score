import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  expectAssembledCommand,
  expectDiscoveryIndex,
} from "../../scripts/scan/transpiler/expect-shapes.ts";
import {
  assembleTestCommand,
  buildTestIndex,
  resolveTestEnv,
} from "../../scripts/scan/transpiler/test-runner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("Bun object matchers — keys", () => {
  test("toContainAllKeys — exact key set, order-independent", () => {
    expect({ a: "hello", b: "world" }).toContainAllKeys(["a", "b"]);
    expect({ a: "hello", b: "world" }).toContainAllKeys(["b", "a"]);
    // object keys coerce to strings — use "1" not 1 for exact-set match
    expect({ 1: "hello", b: "world" }).toContainAllKeys(["1", "b"]);
    expect({ a: "hello", b: "world" }).not.toContainAllKeys(["c"]);
    expect({ a: "hello", b: "world" }).not.toContainAllKeys(["a"]);
  });

  test("toContainKeys vs toContainAllKeys", () => {
    expect({ a: "foo", b: "bar", c: "baz" }).toContainKeys(["a", "b"]);
    expect({ a: "foo", b: "bar", c: "baz" }).toContainKeys(["a", "b", "c"]);
    expect({ a: "foo", b: "bar", c: "baz" }).not.toContainKeys(["a", "b", "e"]);
  });

  test("toContainKey / toContainAnyKeys", () => {
    expect({ a: "foo", b: "bar", c: "baz" }).toContainKey("a");
    expect({ a: "foo", b: "bar", c: "baz" }).not.toContainKey("d");
    expect({ a: "hello", b: "world" }).toContainAnyKeys(["a"]);
    expect({ a: "hello", b: "world" }).toContainAnyKeys(["b", "c"]);
    expect({ a: "hello", b: "world" }).not.toContainAnyKeys(["c"]);
  });
});

describe("Bun object matchers — values", () => {
  const o = { a: "foo", b: "bar", c: "baz" };

  test("toContainAllValues / toContainValues", () => {
    expect(o).toContainAllValues(["foo", "bar", "baz"]);
    expect(o).toContainAllValues(["baz", "bar", "foo"]);
    expect(o).not.toContainAllValues(["bar", "foo"]);
    expect(o).toContainValues(["foo"]);
    expect(o).toContainValues(["baz", "bar"]);
    expect(o).not.toContainValues(["qux", "foo"]);
  });

  test("toContainAnyValues", () => {
    expect(o).toContainAnyValues(["qux", "foo"]);
    expect(o).toContainAnyValues(["qux", "bar"]);
    expect(o).not.toContainAnyValues(["qux"]);
  });

  test("toContainValue — deep object lookup", () => {
    const shallow = { hello: "world" };
    const deep = { message: shallow };
    const deepArray = { message: [shallow] };
    const mixed = { a: "foo", b: [1, "hello", true], c: "baz" };

    expect(shallow).toContainValue("world");
    expect({ foo: false }).toContainValue(false);
    expect(deep).toContainValue({ hello: "world" });
    expect(deepArray).toContainValue([{ hello: "world" }]);
    expect(mixed).toContainValue([1, "hello", true]);
    expect(mixed).not.toContainValue("qux");
    expect(shallow).not.toContainValue("foo");
  });
});

describe("Bun matchers — arrays and strings", () => {
  test("toContainEqual — deep array equality", () => {
    expect([{ a: 1 }]).toContainEqual({ a: 1 });
    expect([{ a: 1 }]).not.toContainEqual({ a: 2 });
  });

  test("toEqual / toEndWith", () => {
    expect({ value: 1 }).toEqual({ value: 1 });
    expect("ast-grep").toEndWith("grep");
    expect(".agents/skills/ast-grep").toEndWith("ast-grep");
  });
});

describe("object matchers on test-runner shapes", () => {
  test("assembleTestCommand result keys via expectAssembledCommand", () => {
    const assembled = assembleTestCommand(
      {
        ci: {
          args: ["--parallel", "--isolate"],
          cwd: ".agents/skills/ast-grep",
          env: { TZ: "Etc/UTC" },
        },
      },
      { skillRoot: SKILL_ROOT, repoRoot: REPO_ROOT, profile: "ci" },
    );
    expectAssembledCommand(assembled);
    expect(assembled.command).toContainEqual("--parallel");
    expect(assembled.cwd).toEndWith("ast-grep");
  });

  test("buildTestIndex via expectDiscoveryIndex", async () => {
    const index = await buildTestIndex(SKILL_ROOT);
    expectDiscoveryIndex(index as unknown as Record<string, unknown>);
    expect(index.discovery).toContainKey("filePatterns");
    expect(index.shapes.some((s) => s.id === "bundle-scan-report")).toBe(true);
  });

  test("resolveTestEnv env object", () => {
    const env = resolveTestEnv({ env: { TZ: "Etc/UTC" } });
    expect(env).toContainAllKeys(["TZ"]);
    expect(env).toContainValue("Etc/UTC");
  });
});