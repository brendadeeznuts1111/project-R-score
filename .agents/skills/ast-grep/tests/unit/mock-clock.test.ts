import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  setSystemTime,
  test,
} from "bun:test";
import { resolve } from "node:path";
import { captureSnapshot } from "../../scripts/scan/transpiler/snapshot.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const FIXED = new Date("2026-06-23T12:00:00.000Z");
const FIXED_MS = FIXED.getTime();

describe("Bun test dates and times", () => {
  afterEach(() => {
    setSystemTime();
    delete process.env.TZ;
  });

  test("setSystemTime pins Date.now and new Date()", () => {
    setSystemTime(FIXED);
    expect(Date.now()).toBe(FIXED_MS);
    expect(new Date().getFullYear()).toBe(2026);
    expect(new Date().toISOString()).toBe("2026-06-23T12:00:00.000Z");
  });

  test("setSystemTime() resets to real time", () => {
    setSystemTime(FIXED);
    expect(new Date().getFullYear()).toBe(2026);
    setSystemTime();
    expect(new Date().getFullYear()).toBeGreaterThanOrEqual(2026);
    expect(Date.now()).not.toBe(FIXED_MS);
  });

  test("jest.useFakeTimers + jest.now() reads mocked timestamp", () => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED);
    expect(Date.now()).toBe(FIXED_MS);
    expect(jest.now()).toBe(FIXED_MS);
    jest.useRealTimers();
  });

  test("useFakeTimers does not replace Date constructor in Bun", () => {
    const OriginalDate = Date;
    jest.useFakeTimers();
    expect(Date).toBe(OriginalDate);
    expect(Date.now).toBe(OriginalDate.now);
    jest.useRealTimers();
  });

  test("bun test runner pins Intl timezone to UTC by default", () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("UTC");
  });

  test("TZ at process launch affects Intl (TZ=... bun test / profile env)", async () => {
    const proc = Bun.spawn([
      "bun",
      "-e",
      'process.env.TZ="America/New_York"; console.log(new Intl.DateTimeFormat().resolvedOptions().timeZone)',
    ], { stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(proc.stdout).text()).trim();
    expect(await proc.exited).toBe(0);
    expect(out).toBe("America/New_York");
  });
});

describe("mocked capturedAt", () => {
  beforeEach(() => setSystemTime(FIXED));
  afterEach(() => setSystemTime());

  test("captureSnapshot stamps semver and generatedAt from setSystemTime", async () => {
    const snap = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages: { lodash: "4.17.21" },
    });
    expect(snap.generatedAt).toBe("2026-06-23T12:00:00.000Z");
    expect(snap.semver.capturedAt).toBe("2026-06-23T12:00:00.000Z");
  });
});