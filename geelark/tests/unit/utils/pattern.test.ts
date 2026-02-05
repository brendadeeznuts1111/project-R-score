// @ts-ignore - Bun types are available at runtime
import { expect, test } from "bun:test";

// @ts-ignore - Bun global is available at runtime
test("bun flags + cli flags", async () => {
  // @ts-ignore - Bun.spawn is available at runtime
  const proc = Bun.spawn([
    "bun", "--smol", "bin/dev-hq-cli.ts", "insights", "--table"
  ]);

  await proc.exited;

  const output = await new Response(proc.stdout).text();

  expect(output).toContain("┌─");  // Table border
  expect(output).toContain("Statistics");
  expect(output).toContain("Total Files");
  expect(proc.exitCode).toBe(0);
});
