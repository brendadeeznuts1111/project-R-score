import { mock, spyOn, test, expect } from "bun:test";

test("mock(Date, 'now') does NOT replace Date.now", () => {
  const before = Date.now();
  const m = mock(Date, "now");
  m.mockReturnValue(9999);

  // Does Date.now() return 9999?
  const result = Date.now();
  console.log("  mock(Date, 'now') + mockReturnValue(9999)");
  console.log("  Date.now() returned:", result);
  console.log("  Is 9999?", result === 9999);

  // mock() wraps the second arg as a function label, it does NOT spy on the method
  // Date.now() is unchanged
  expect(result).not.toBe(9999);
  expect(result).toBeGreaterThan(before - 1);
});

test("spyOn(Date, 'now') DOES replace Date.now", () => {
  using s = spyOn(Date, "now").mockReturnValue(9999);

  const result = Date.now();
  console.log("  spyOn(Date, 'now') + mockReturnValue(9999)");
  console.log("  Date.now() returned:", result);
  console.log("  Is 9999?", result === 9999);

  expect(result).toBe(9999);
});

test("Bun.spawn({ cmd: [...], shell: true }) ignores shell flag", async () => {
  const proc = Bun.spawn({ cmd: ["echo", "hello $HOME"], shell: true } as any);
  const text = await new Response(proc.stdout).text();
  console.log("  shell: true output:", JSON.stringify(text.trim()));

  // $HOME NOT expanded — shell: true is silently ignored
  expect(text.trim()).toBe("hello $HOME");
});
