import { expect, test } from "bun:test";

test("demo snapshot", () => {
  const result = { user: "Alice", balance: 100 };
  expect(result).toMatchSnapshot();
});
