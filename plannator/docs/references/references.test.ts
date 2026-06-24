import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

async function readText(path: string): Promise<string> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.text();
}

async function readJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`Missing file: ${path}`);
  }
  return file.json() as Promise<T>;
}

describe("references grounding", () => {
  test("canonical-references.json is valid and lists Bun and Effect", async () => {
    const manifest = await readJson<{
      schemaVersion: number;
      ecosystem: Array<{ id: string; name: string; docs: string; minVersion?: string }>;
      localDocs: Array<{ id: string; repoPath: string; purpose: string }>;
    }>(join(REPO_ROOT, "docs", "references", "canonical-references.json"));

    expect(manifest.schemaVersion).toBe(1);

    const ids = manifest.ecosystem.map((e) => e.id);
    expect(ids).toContain("bun");
    expect(ids).toContain("effect");

    const bun = manifest.ecosystem.find((e) => e.id === "bun");
    expect(bun?.docs).toMatch(/^https:\/\//);
    expect(bun?.minVersion).toBeDefined();

    const effect = manifest.ecosystem.find((e) => e.id === "effect");
    expect(effect?.docs).toMatch(/^https:\/\//);

    expect(manifest.localDocs.length).toBeGreaterThanOrEqual(2);
    const localIds = manifest.localDocs.map((d) => d.id);
    expect(localIds).toContain("bun-api-reference");
    expect(localIds).toContain("effect-reference");
  });

  test("Bun API reference card exists and covers core APIs", async () => {
    const text = await readText(join(REPO_ROOT, "docs", "references", "bun-api-reference.md"));

    expect(text).toContain("# Bun API Reference");
    expect(text).toContain("Bun.file");
    expect(text).toContain("Bun.write");
    expect(text).toContain("Bun.spawn");
    expect(text).toContain("Bun.env");
    expect(text).toContain("Bun.Glob");
    expect(text).toContain("Bun.nanoseconds");
    expect(text).toContain("Bun.Archive");
    expect(text).toContain("archive.files");
    expect(text).toContain("Bun.inspect.table");
    expect(text).toContain("bun.com/reference/bun");
  });

  test("Effect reference card exists and covers core patterns", async () => {
    const text = await readText(join(REPO_ROOT, "docs", "references", "effect-reference.md"));

    expect(text).toContain("# Effect Reference");
    expect(text).toContain("Effect.runPromise");
    expect(text).toContain("Data.TaggedError");
    expect(text).toContain("Effect.gen");
    expect(text).toContain("Effect.all");
    expect(text).toContain("effect.website/docs");
  });

  test("ground-references script is present and executable", async () => {
    const path = join(REPO_ROOT, "scripts", "ground-references.ts");
    const file = Bun.file(path);
    expect(await file.exists()).toBe(true);

    const text = await file.text();
    expect(text).toContain("#!/usr/bin/env bun");
    expect(text).toContain("canonical-references.json");
  });
});
