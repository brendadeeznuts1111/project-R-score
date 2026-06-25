#!/usr/bin/env bun

import { describe, expectTypeOf, test } from "bun:test";

describe("🧪 expectTypeOf() PRO-TIPS - Working Patterns", () => {
  test("🔍 Basic Type Assertion Patterns", () => {
    // Test both value AND type simultaneously
    const user = { name: "John", age: 30 };
    expectTypeOf(user).toEqualTypeOf<{ name: string; age: number }>();

    // Catch mismatched optional properties
    const partialUser = { name: "Alice" };
    expectTypeOf(partialUser).not.toEqualTypeOf<{
      name: string;
      age: number;
    }>();
  });

  test("🚀 Quick Type Checks", () => {
    // Check primitive types
    expectTypeOf("hello").toBeString();
    expectTypeOf(42).toBeNumber();
    expectTypeOf(true).toBeBoolean();
    expectTypeOf(null).toBeNull();
    expectTypeOf(undefined).toBeUndefined();

    // Check object types
    expectTypeOf({ x: 1, y: 2 }).toBeObject();
    expectTypeOf([1, 2, 3]).toBeArray();
    expectTypeOf(() => {}).toBeFunction();
  });

  test("🎯 Function Signature Validation", () => {
    // Test function parameters and return type
    const add = (a: number, b: number): number => a + b;

    expectTypeOf(add).toBeFunction();
    expectTypeOf(add).toEqualTypeOf<(a: number, b: number) => number>();
  });

  test("📦 Generic Type Testing", () => {
    // Test generic functions
    function identity<T>(value: T): T {
      return value;
    }

    expectTypeOf(identity).toBeFunction();
    expectTypeOf(identity<string>).toEqualTypeOf<(value: string) => string>();
    expectTypeOf(identity<number>).toEqualTypeOf<(value: number) => number>();
  });

  test("⚡ Union & Intersection Types", () => {
    // Union type checks
    type Status = "pending" | "active" | "completed";
    expectTypeOf<Status>().toEqualTypeOf<"pending" | "active" | "completed">();

    // Check exact union members
    expectTypeOf<"pending">().toExtend<"pending">();
    expectTypeOf<"pending">().not.toExtend<"invalid">();
  });

  test("🛡️ Type Guard Testing", () => {
    // Test type guard functions
    function isString(value: unknown): value is string {
      return typeof value === "string";
    }

    expectTypeOf(isString).toEqualTypeOf<(value: unknown) => boolean>();
  });

  test("📝 Real-World API Response Types", () => {
    // API Response types
    interface ApiResponse<T> {
      data: T;
      status: number;
      timestamp: Date;
    }

    // Test the interface
    expectTypeOf<ApiResponse<string>>().toMatchTypeOf<{
      data: string;
      status: number;
      timestamp: Date;
    }>();
  });

  test("🧩 Utility Type Testing", () => {
    // Test TypeScript utility types
    type PartialUser = Partial<{ name: string; age: number }>;
    expectTypeOf<PartialUser>().toEqualTypeOf<{
      name?: string;
      age?: number;
    }>();

    type ReadonlyUser = Readonly<{ name: string }>;
    expectTypeOf<ReadonlyUser>().toEqualTypeOf<{ readonly name: string }>();

    // Test Pick and Omit
    type User = { id: string; name: string; age: number; email: string };
    type UserPick = Pick<User, "id" | "name">;
    type UserOmit = Omit<User, "email">;

    expectTypeOf<UserPick>().toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf<UserOmit>().toEqualTypeOf<{
      id: string;
      name: string;
      age: number;
    }>();
  });

  test("🔍 Advanced Patterns - Conditional Types", () => {
    // Conditional types
    type IsString<T> = T extends string ? true : false;
    expectTypeOf<IsString<"hello">>().toEqualTypeOf<true>();
    expectTypeOf<IsString<number>>().toEqualTypeOf<false>();

    // Mapped types
    type Keys = "id" | "name";
    type RecordType = Record<Keys, string>;
    expectTypeOf<RecordType>().toMatchTypeOf<{
      id: string;
      name: string;
    }>();
  });

  test("🧪 Testing Component Props Patterns", () => {
    // Component props interface
    interface ButtonProps {
      label: string;
      onClick: () => void;
      disabled?: boolean;
    }

    expectTypeOf<ButtonProps>().toMatchTypeOf<{
      label: string;
      onClick: () => void;
      disabled?: boolean;
    }>();
  });

  test("📊 Type Predicates", () => {
    // Test type predicate narrowing
    interface User {
      id: string;
      name: string;
    }
    interface AdminUser extends User {
      role: "admin";
      permissions: string[];
    }

    function isAdmin(user: User): user is AdminUser {
      return "role" in user && user.role === "admin";
    }

    expectTypeOf(isAdmin).toEqualTypeOf<(user: User) => boolean>();
  });

  test("🔗 Feature Flag Integration Simulation", () => {
    // Type-safe feature flag testing simulation
    const isPremium = true; // Simulate feature flag

    if (isPremium) {
      // Type should only exist when feature is enabled
      const premiumFeature = {
        advancedOptions: { analytics: true, export: false },
        premiumSupport: () => "24/7 support",
      };
      expectTypeOf(premiumFeature).toMatchTypeOf<{
        advancedOptions: { analytics: boolean; export: boolean };
        premiumSupport: () => string;
      }>();
    }

    if (!isPremium) {
      // In non-premium builds, test basic functionality
      const basicFeature = {
        coreFunctionality: () => "basic",
      };
      expectTypeOf(basicFeature).toMatchTypeOf<{
        coreFunctionality: () => string;
      }>();
    }
  });

  test("🎯 Practical Use Cases - API Contract Testing", () => {
    // 1. API contract testing
    const fetchUser = async (
      id: string
    ): Promise<{ id: string; name: string }> => ({
      id,
      name: `User ${id}`,
    });
    expectTypeOf(fetchUser).toEqualTypeOf<
      (id: string) => Promise<{ id: string; name: string }>
    >();

    // 2. Redux-style action types
    const loginSuccess = (user: { id: string; name: string }) => ({
      type: "LOGIN_SUCCESS" as const,
      payload: user,
    });
    expectTypeOf<ReturnType<typeof loginSuccess>>().toEqualTypeOf<{
      type: "LOGIN_SUCCESS";
      payload: { id: string; name: string };
    }>();

    // 3. Form validation
    const validateEmail = (email: string): boolean | string => {
      return email.includes("@") ? true : "Invalid email";
    };
    expectTypeOf(validateEmail).toEqualTypeOf<
      (email: string) => boolean | string
    >();

    // 4. Plugin system
    interface PluginInterface {
      initialize: () => Promise<void>;
      destroy: () => void;
    }
    expectTypeOf<PluginInterface>().toMatchTypeOf<{
      initialize: () => Promise<void>;
      destroy: () => void;
    }>();

    // 5. Configuration types
    interface AppConfig {
      apiUrl: string;
      timeout?: number;
      retries: number;
    }
    expectTypeOf<AppConfig>().toMatchTypeOf<{
      apiUrl: string;
      timeout?: number;
      retries: number;
    }>();
  });

  test("📈 Benefits Over JSDOC/TSC", () => {
    // Traditional TypeScript checking vs Bun test type checking
    const x: string = "hello"; // Valid assignment
    expectTypeOf<typeof x>().toBeString(); // ✅ Passes

    const y: number = 42;
    expectTypeOf(y).toBeNumber(); // ✅ Passes
    expectTypeOf(y).not.toBeString(); // ✅ Passes
  });

  test("🚀 Quick Wins - Function Signatures", () => {
    // Test complex function signatures
    type AsyncCallback<T> = (data: T) => Promise<void>;
    type DataProcessor<T> = (
      input: T,
      callback: AsyncCallback<T>
    ) => Promise<T>;

    const processUsers: DataProcessor<{ id: string; name: string }> = async (
      input,
      callback
    ) => {
      await callback(input);
      return input;
    };

    expectTypeOf(processUsers).toEqualTypeOf<
      (
        input: { id: string; name: string },
        callback: AsyncCallback<{ id: string; name: string }>
      ) => Promise<{ id: string; name: string }>
    >();
  });

  test("🚀 Quick Wins - Generic Instantiations", () => {
    // Test generic classes and interfaces
    interface Repository<T> {
      findById(id: string): Promise<T | null>;
      save(entity: T): Promise<T>;
      delete(id: string): Promise<boolean>;
    }

    type User = { id: string; name: string; email: string };

    expectTypeOf<Repository<User>>().toMatchTypeOf<{
      findById: (id: string) => Promise<User | null>;
      save: (entity: User) => Promise<User>;
      delete: (id: string) => Promise<boolean>;
    }>();
  });

  test("🚀 Quick Wins - Conditional Types", () => {
    // Test complex conditional types
    type NonNullable<T> = T extends null | undefined ? never : T;
    type Flatten<T> = T extends Array<infer U> ? U : T;

    expectTypeOf<NonNullable<string>>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<string | null>>().toEqualTypeOf<string>();
    expectTypeOf<NonNullable<string | undefined>>().toEqualTypeOf<string>();
    expectTypeOf<
      NonNullable<string | null | undefined>
    >().toEqualTypeOf<string>();

    expectTypeOf<Flatten<string[]>>().toEqualTypeOf<string>();
    expectTypeOf<Flatten<number[]>>().toEqualTypeOf<number>();
    expectTypeOf<Flatten<string>>().toEqualTypeOf<string>();
  });

  test("🚀 Quick Wins - Mapped Types", () => {
    // Test mapped type generation
    type Optional<T> = {
      [K in keyof T]?: T[K];
    };

    type Required<T> = {
      [K in keyof T]-?: T[K];
    };

    type User = { id: string; name: string; age: number };

    expectTypeOf<Optional<User>>().toEqualTypeOf<{
      id?: string;
      name?: string;
      age?: number;
    }>();

    expectTypeOf<Required<Optional<User>>>().toEqualTypeOf<User>();
  });

  test("🚀 Quick Wins - Component Props", () => {
    // Component props with complex types
    interface DataTableProps<T> {
      data: T[];
      columns: Array<{
        key: keyof T;
        label: string;
        sortable?: boolean;
        render?: (value: T[keyof T]) => string;
      }>;
      onRowClick?: (row: T) => void;
      loading?: boolean;
    }

    type User = { id: string; name: string; email: string };

    expectTypeOf<DataTableProps<User>>().toMatchTypeOf<{
      data: User[];
      columns: Array<{
        key: keyof User;
        label: string;
        sortable?: boolean;
        render?: (value: User[keyof User]) => string;
      }>;
      onRowClick?: (row: User) => void;
      loading?: boolean;
    }>();
  });

  test("🚀 Quick Wins - Type Guards", () => {
    // Complex type guard functions
    function isObject(value: unknown): value is Record<string, unknown> {
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    }

    function hasProperty<K extends string>(
      obj: unknown,
      key: K
    ): obj is Record<K, unknown> {
      return isObject(obj) && key in obj;
    }

    function isUser(obj: unknown): obj is { id: string; name: string } {
      return (
        hasProperty(obj, "id") &&
        hasProperty(obj, "name") &&
        typeof obj.id === "string" &&
        typeof obj.name === "string"
      );
    }

    expectTypeOf(isObject).toEqualTypeOf<(value: unknown) => boolean>();
    expectTypeOf(hasProperty).toEqualTypeOf<
      (obj: unknown, key: string) => boolean
    >();
    expectTypeOf(isUser).toEqualTypeOf<(obj: unknown) => boolean>();
  });

  test("🚀 Quick Wins - Configuration Schemas", () => {
    // Test complex configuration validation
    interface DatabaseConfig {
      host: string;
      port: number;
      ssl: boolean;
      timeout?: number;
      retries: number;
      pool: {
        min: number;
        max: number;
        idleTimeoutMillis?: number;
      };
    }

    interface AppConfig {
      server: {
        port: number;
        host: string;
        cors: boolean;
      };
      database: DatabaseConfig;
      auth: {
        jwtSecret: string;
        expiresIn: string;
        refreshExpiresIn?: string;
      };
      features: {
        analytics: boolean;
        monitoring: boolean;
        debug: boolean;
      };
    }

    expectTypeOf<AppConfig>().toMatchTypeOf<{
      server: { port: number; host: string; cors: boolean };
      database: DatabaseConfig;
      auth: { jwtSecret: string; expiresIn: string; refreshExpiresIn?: string };
      features: { analytics: boolean; monitoring: boolean; debug: boolean };
    }>();
  });
});

describe("🧪 expectTypeOf() Advanced Edge Cases", () => {
  test("Deeply nested type inference", () => {
    type DeepNested = {
      level1: {
        level2: {
          level3: {
            data: Array<{
              id: string;
              items: {
                name: string;
                value: number;
              }[];
            }>;
          };
        };
      };
    };

    const mockData: DeepNested = {
      level1: {
        level2: {
          level3: {
            data: [
              {
                id: "test",
                items: [{ name: "test", value: 42 }],
              },
            ],
          },
        },
      },
    };

    expectTypeOf(mockData.level1.level2.level3.data).toBeArray();
    expectTypeOf(mockData.level1.level2.level3.data[0]).toMatchTypeOf<{
      id: string;
      items: Array<{ name: string; value: number }>;
    }>();
    expectTypeOf(mockData.level1.level2.level3.data[0].items).toBeArray();
    expectTypeOf(
      mockData.level1.level2.level3.data[0].items[0].name
    ).toBeString();
    expectTypeOf(
      mockData.level1.level2.level3.data[0].items[0].value
    ).toBeNumber();
  });

  test("Recursive type validation", () => {
    interface TreeNode {
      value: string;
      children: TreeNode[];
    }

    const tree: TreeNode = {
      value: "root",
      children: [
        {
          value: "child1",
          children: [],
        },
        {
          value: "child2",
          children: [
            {
              value: "grandchild",
              children: [],
            },
          ],
        },
      ],
    };

    expectTypeOf(tree).toMatchTypeOf<TreeNode>();
    expectTypeOf(tree.value).toBeString();
    expectTypeOf(tree.children).toBeArray();
    expectTypeOf(tree.children[0]).toMatchTypeOf<TreeNode>();
    expectTypeOf(tree.children[0].value).toBeString();
  });

  test("Template literal types", () => {
    type EventName<T extends string> = `on${Capitalize<T>}`;
    type EventHandler<T extends string> = (data: T) => void;
    type EventMap<T extends string> = {
      [K in EventName<T>]: EventHandler<T>;
    };

    type UserEvents = "login" | "logout" | "register";
    type UserEventMap = EventMap<UserEvents>;

    expectTypeOf<UserEventMap>().toMatchTypeOf<{
      onLogin: (data: "login") => void;
      onLogout: (data: "logout") => void;
      onRegister: (data: "register") => void;
    }>();
  });

  test("Branded types", () => {
    type Brand<T, B> = T & { __brand: B };

    type UserId = Brand<string, "UserId">;
    type Email = Brand<string, "Email">;
    type ProductId = Brand<string, "ProductId">;

    const createUserId = (id: string): UserId => id as UserId;
    const createEmail = (email: string): Email => email as Email;

    expectTypeOf(createUserId).toEqualTypeOf<(id: string) => UserId>();
    expectTypeOf(createEmail).toEqualTypeOf<(email: string) => Email>();
    expectTypeOf<UserId>().not.toEqualTypeOf<Email>();
  });

  test("Function overloading", () => {
    function process(value: string): string;
    function process(value: number): number;
    function process(value: boolean): boolean;
    function process(
      value: string | number | boolean
    ): string | number | boolean {
      return value;
    }

    expectTypeOf(process).toBeFunction();
    expectTypeOf(process).toEqualTypeOf<
      (value: string | number | boolean) => string | number | boolean
    >();
  });

  test("Error handling types", () => {
    type Result<T, E = Error> =
      | { success: true; data: T }
      | { success: false; error: E };

    type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

    const success = <T>(data: T): Result<T> => ({ success: true, data });
    const failure = <E extends Error>(error: E): Result<never, E> => ({
      success: false,
      error,
    });

    expectTypeOf(success).toEqualTypeOf<<T>(data: T) => Result<T>>();
    expectTypeOf(failure).toEqualTypeOf<
      <E extends Error>(error: E) => Result<never, E>
    >();

    expectTypeOf<Result<string>>().toEqualTypeOf<
      { success: true; data: string } | { success: false; error: Error }
    >();

    expectTypeOf<AsyncResult<string>>().toEqualTypeOf<
      Promise<
        { success: true; data: string } | { success: false; error: Error }
      >
    >();
  });
});
