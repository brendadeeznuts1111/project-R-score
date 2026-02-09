// Symbol.dispose support for mock()
// Feature #6 — PR #26692 — New in Bun 1.3.9
//
// Symbol.dispose is aliased to mockRestore, so it works with both.
//
// Run: bun test ./examples/symbol-dispose-mock.ts

import { mock, expect, test } from "bun:test";

test("mock()[Symbol.dispose]() restores call count", () => {
  const fn = mock(() => "original");
  fn();
  expect(fn).toHaveBeenCalledTimes(1);

  fn[Symbol.dispose](); // same as fn.mockRestore()
  expect(fn).toHaveBeenCalledTimes(0);
});
