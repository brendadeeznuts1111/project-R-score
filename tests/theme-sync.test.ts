import { test, expect } from "bun:test";

test("theme-sync generates CSS", async () => {
  const proc = Bun.spawn(["bun", "tools/theme-sync.ts"], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  expect(proc.exitCode).toBe(0);
  expect(out).toContain("wrote");
});

test("theme-sync --check passes", async () => {
  const proc = Bun.spawn(["bun", "tools/theme-sync.ts", "--check"], { stdout: "pipe", stderr: "pipe" });
  await new Response(proc.stdout).text();
  await proc.exited;
  expect(proc.exitCode).toBe(0);
});