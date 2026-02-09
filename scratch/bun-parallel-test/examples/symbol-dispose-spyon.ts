// Symbol.dispose support for spyOn() — auto-restore with `using`
// Feature #6 — PR #26692 — New in Bun 1.3.9
//
// No more manual mockRestore() or afterEach cleanup.

import { spyOn, expect, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };

  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }

  // automatically restored when `spy` leaves scope
  expect(obj.method()).toBe("original");
});
