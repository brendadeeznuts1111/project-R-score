import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  FileReadError,
  SpawnError,
  readJsonEffect,
  readTextEffect,
  spawnEffect,
  writeTextEffect,
} from "./boundary.ts";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = `${Bun.env.TMPDIR ?? "/tmp"}/plannator-effect-${Bun.randomUUIDv7()}`;
  await Bun.spawn({ cmd: ["mkdir", "-p", dir] }).exited;
  try {
    return await fn(dir);
  } finally {
    await Bun.spawn({ cmd: ["rm", "-rf", dir] }).exited;
  }
}

describe("effect boundary wrappers", () => {
  test("readTextEffect succeeds for existing file", async () => {
    await withTempDir(async (dir) => {
      await Bun.write(`${dir}/x.txt`, "hello");
      const text = await Effect.runPromise(readTextEffect(`${dir}/x.txt`));
      expect(text).toBe("hello");
    });
  });

  test("readTextEffect fails with FileReadError for missing file", async () => {
    await withTempDir(async (dir) => {
      const result = await Effect.runPromise(
        readTextEffect(`${dir}/missing.txt`).pipe(
          Effect.match({
            onFailure: (e) => e,
            onSuccess: () => null,
          })
        )
      );
      expect(result).toBeInstanceOf(FileReadError);
      expect(result?.path).toEndWith("missing.txt");
    });
  });

  test("readJsonEffect parses JSON", async () => {
    await withTempDir(async (dir) => {
      await Bun.write(`${dir}/x.json`, JSON.stringify({ ok: true }));
      const data = await Effect.runPromise(
        readJsonEffect<{ ok: boolean }>(`${dir}/x.json`)
      );
      expect(data.ok).toBe(true);
    });
  });

  test("writeTextEffect roundtrips", async () => {
    await withTempDir(async (dir) => {
      const bytes = await Effect.runPromise(
        writeTextEffect(`${dir}/x.txt`, "effect")
      );
      expect(bytes).toBeGreaterThan(0);
      const text = await Bun.file(`${dir}/x.txt`).text();
      expect(text).toBe("effect");
    });
  });

  test("spawnEffect captures stdout", async () => {
    const result = await Effect.runPromise(spawnEffect(["echo", "hi"]));
    expect(result.stdout.trim()).toBe("hi");
    expect(result.code).toBe(0);
  });

  test("spawnError is tagged on nonzero exit", async () => {
    const result = await Effect.runPromise(
      spawnEffect(["false"]).pipe(
        Effect.match({
          onFailure: (e) => e,
          onSuccess: () => null,
        })
      )
    );
    expect(result).toBeInstanceOf(SpawnError);
    expect(result?.code).toBe(1);
  });
});
