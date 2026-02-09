// Symbol.dispose — nested scopes
// Feature #6 — PR #26692 — New in Bun 1.3.9
//
// Inner `using` restores first, outer restores after — standard block scoping.
//
// Run: bun test ./examples/symbol-dispose-nested.ts

import { spyOn, expect, test } from "bun:test";

test("nested using scopes restore in correct order", () => {
  const obj = { foo: () => "real-foo", bar: () => "real-bar" };

  {
    using fooSpy = spyOn(obj, "foo").mockReturnValue("foo-mocked");
    expect(obj.foo()).toBe("foo-mocked");

    {
      using barSpy = spyOn(obj, "bar").mockReturnValue("bar-mocked");
      expect(obj.foo()).toBe("foo-mocked");
      expect(obj.bar()).toBe("bar-mocked");
    }
    // bar restored, foo still mocked
    expect(obj.bar()).toBe("real-bar");
    expect(obj.foo()).toBe("foo-mocked");
  }
  // both restored
  expect(obj.foo()).toBe("real-foo");
  expect(obj.bar()).toBe("real-bar");
});
