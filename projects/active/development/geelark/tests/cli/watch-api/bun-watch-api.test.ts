#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/node/fs/watch — node:fs watch
// @see https://bun.com/docs/test/index#run-tests — bun:test

import { afterEach, describe, expect, test } from "bun:test";
import { watch } from "node:fs";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "geelark-watch-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("timed out waiting for file-system event");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))
  );
});

describe("node:fs watch compatibility in Bun", () => {
  test("observes writes in a watched directory", async () => {
    const directory = await temporaryDirectory();
    const events: Array<{ eventType: string; filename: string }> = [];
    const watcher = watch(directory, (eventType, filename) => {
      events.push({ eventType, filename: filename?.toString() ?? "" });
    });

    try {
      await Bun.write(join(directory, "watched.txt"), "initial");
      await waitFor(() => events.some(event => event.filename === "watched.txt"));

      expect(events.some(event => event.filename === "watched.txt")).toBe(true);
      expect(events.every(event => ["change", "rename"].includes(event.eventType))).toBe(true);
    } finally {
      watcher.close();
    }
  });

  test("observes create, update, and removal operations", async () => {
    const directory = await temporaryDirectory();
    const target = join(directory, "lifecycle.txt");
    const events: string[] = [];
    const watcher = watch(directory, (eventType, filename) => {
      if (filename?.toString() === "lifecycle.txt") events.push(eventType);
    });

    try {
      await Bun.write(target, "created");
      await waitFor(() => events.length > 0);
      const afterCreate = events.length;

      await Bun.write(target, "updated");
      await waitFor(() => events.length > afterCreate);
      const afterUpdate = events.length;

      await unlink(target);
      await waitFor(() => events.length > afterUpdate);

      expect(events.length).toBeGreaterThanOrEqual(3);
    } finally {
      watcher.close();
    }
  });
});
