import { describe, expect, test } from "bun:test";
import {
  archiveFiles,
  extractArchive,
  fileExists,
  globFiles,
  hashSha256,
  inspectTable,
  listArchiveFiles,
  readArchiveFileText,
  readJson,
  readText,
  writeText,
} from "./bun-native.ts";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = `${Bun.env.TMPDIR ?? "/tmp"}/plannator-bun-native-${Bun.randomUUIDv7()}`;
  await Bun.spawn({ cmd: ["mkdir", "-p", dir] }).exited;
  try {
    return await fn(dir);
  } finally {
    await Bun.spawn({ cmd: ["rm", "-rf", dir] }).exited;
  }
}

describe("bun-native helpers", () => {
  test("readText and writeText roundtrip", async () => {
    await withTempDir(async (dir) => {
      await writeText(`${dir}/x.txt`, "hello");
      const text = await readText(`${dir}/x.txt`);
      expect(text).toBe("hello");
    });
  });

  test("readJson parses JSON", async () => {
    await withTempDir(async (dir) => {
      await writeText(`${dir}/x.json`, JSON.stringify({ ok: true }));
      const data = await readJson<{ ok: boolean }>(`${dir}/x.json`);
      expect(data.ok).toBe(true);
    });
  });

  test("hashSha256 returns hex", () => {
    const hash = hashSha256("hello");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashSha256("hello"));
    expect(hash).not.toBe(hashSha256("world"));
  });

  test("fileExists reflects reality", async () => {
    await withTempDir(async (dir) => {
      await writeText(`${dir}/exists.txt`, "x");
      expect(await fileExists(`${dir}/exists.txt`)).toBe(true);
      expect(await fileExists(`${dir}/missing.txt`)).toBe(false);
    });
  });

  test("globFiles lists matches", async () => {
    await withTempDir(async (dir) => {
      await writeText(`${dir}/a.md`, "a");
      await writeText(`${dir}/b.txt`, "b");

      const files: string[] = [];
      for await (const file of globFiles(dir, "*.md")) {
        files.push(file);
      }

      expect(files.length).toBe(1);
      expect(files[0]).toEndWith("a.md");
    });
  });

  const archiveAvailable = !!(Bun as typeof Bun & { Archive?: unknown }).Archive;
  test.skipIf(!archiveAvailable)("archiveFiles and extractArchive roundtrip", async () => {
    await withTempDir(async (dir) => {
      const bytes = await archiveFiles({ "hello.txt": "world" });
      expect(bytes).toBeInstanceOf(Uint8Array);

      const count = await extractArchive(bytes, dir);
      expect(count).toBeGreaterThanOrEqual(1);
      const text = await readText(`${dir}/hello.txt`);
      expect(text).toBe("world");
    });
  });

  test.skipIf(!archiveAvailable)("listArchiveFiles and readArchiveFileText inspect in memory", async () => {
    const bytes = await archiveFiles({ "manifest.json": '{"v":1}', "other.txt": "x" });
    const files = await listArchiveFiles(bytes, ["*.json"]);

    expect(files.has("manifest.json")).toBe(true);
    expect(files.has("other.txt")).toBe(false);

    const text = await readArchiveFileText(bytes, "manifest.json");
    expect(text).toContain('"v":1');

    const missing = await readArchiveFileText(bytes, "nope.json");
    expect(missing).toBeUndefined();
  });

  test("inspectTable formats rows", () => {
    const table = inspectTable([
      { file: "a.ts", status: "modify" },
      { file: "b.ts", status: "add" },
    ]);
    expect(table).toContain("a.ts");
    expect(table).toContain("modify");
    expect(table).toContain("b.ts");
  });
});
