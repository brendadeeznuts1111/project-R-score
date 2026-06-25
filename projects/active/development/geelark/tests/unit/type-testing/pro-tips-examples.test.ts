import { describe, expectTypeOf, test } from "bun:test";

describe("BUN TEST: expectTypeOf() PRO-TIPS Examples", () => {
  test("TYPE ASSERTION PATTERNS", () => {
    // Test both value AND type simultaneously
    expectTypeOf({ name: "John", age: 30 }).toEqualTypeOf<{ name: string; age: number }>();

    // Catch mismatched optional properties
    expectTypeOf({ name: "Alice" }).not.toEqualTypeOf<{ name: string; age: number }>();
  });

  test("QUICK TYPE CHECKS", () => {
    // Check primitive types
    expectTypeOf("hello").toBeString();
    expectTypeOf(42).toBeNumber();
    expectTypeOf(true).toBeBoolean();
    expectTypeOf(null).toBeNull();
    expectTypeOf(undefined).toBeUndefined();

    // Check object shapes - Note: Bun's expectTypeOf might have limitations on chainable toHaveProperty
    expectTypeOf({ x: 1, y: 2 }).toBeObject();
  });

  test("FUNCTION SIGNATURE VALIDATION", () => {
    const add = (a: number, b: number): number => a + b;

    expectTypeOf(add).toBeFunction();
    // Bun's expectTypeOf doesn't support .parameter() or .returns directly yet,
    // so we use toEqualTypeOf for the whole signature
    expectTypeOf(add).toEqualTypeOf<(a: number, b: number) => number>();
  });

  test("GENERIC TYPE TESTING", () => {
    function identity<T>(value: T): T { return value; }

    expectTypeOf(identity).toBeFunction();
    expectTypeOf(identity<string>).toEqualTypeOf<(value: string) => string>();
    expectTypeOf(identity<number>).toEqualTypeOf<(value: number) => number>();
  });

  test("UNION & INTERSECTION TYPES", () => {
    type Status = "pending" | "active" | "completed";
    expectTypeOf<Status>().toEqualTypeOf<"pending" | "active" | "completed">();

    expectTypeOf<"pending">().toExtend<Status>();
  });

  test("TYPE GUARD TESTING", () => {
    function isString(value: unknown): value is string {
      return typeof value === "string";
    }

    expectTypeOf(isString).toEqualTypeOf<(value: unknown) => value is string>();
  });

  test("REAL-WORLD EXAMPLES", () => {
    interface ApiResponse<T> {
      data: T;
      status: number;
      timestamp: Date;
    }

    expectTypeOf<ApiResponse<string>>().toMatchTypeOf<{
      data: string;
      status: number;
      timestamp: Date;
    }>();
  });

  test("UTILITY TYPE TESTING", () => {
    type PartialUser = Partial<{ name: string; age: number }>;
    expectTypeOf<PartialUser>().toEqualTypeOf<{
      name?: string;
      age?: number;
    }>();

    type ReadonlyUser = Readonly<{ name: string }>;
    expectTypeOf<ReadonlyUser>().toMatchTypeOf<{ readonly name: string }>();
  });
});
