// packages/odds-core/src/__tests__/type-testing-workflow.test.ts
// Complete workflow demonstrating expectTypeOf with TypeScript compiler verification

import { expectTypeOf, test, describe } from "bun:test";

// Basic type equality tests
test("basic type equality", () => {
  expectTypeOf<string>().toEqualTypeOf<string>();
  expectTypeOf<number>().toEqualTypeOf<number>();
  expectTypeOf<boolean>().toEqualTypeOf<boolean>();
});

// Object property testing
test("object property testing", () => {
  expectTypeOf({ foo: 1 }).toHaveProperty("foo");
  expectTypeOf({ foo: 1, bar: "hello" }).toHaveProperty("foo");
  expectTypeOf({ foo: 1 }).not.toHaveProperty("bar");
});

// Promise resolution testing
test("Promise resolution testing", () => {
  expectTypeOf<Promise<number>>().resolves.toBeNumber();
  expectTypeOf<Promise<string>>().resolves.toBeString();
  expectTypeOf<Promise<{ id: number }>>().resolves.toEqualTypeOf<{ id: number }>();
  expectTypeOf<Promise<{ id: number }>>().resolves.toHaveProperty("id");
});

// Array type testing
test("array type testing", () => {
  expectTypeOf<number[]>().toBeArray();
  expectTypeOf<string[]>().toBeArray();
  expectTypeOf<number[]>().toEqualTypeOf<Array<number>>();
});

// Function signature testing
test("function signature testing", () => {
  expectTypeOf<() => void>().toBeFunction();
  expectTypeOf<(x: number) => string>().toBeFunction();
  expectTypeOf<(x: number) => string>().toEqualTypeOf<(x: number) => string>();
});

// Union type testing
test("union type testing", () => {
  type StringOrNumber = string | number;
  expectTypeOf<StringOrNumber>().toEqualTypeOf<string | number>();
  expectTypeOf<string>().toMatchTypeOf<StringOrNumber>();
  expectTypeOf<number>().toMatchTypeOf<StringOrNumber>();
});

// Intersection type testing
test("intersection type testing", () => {
  type WithName = { name: string };
  type WithAge = { age: number };
  type Person = WithName & WithAge;
  
  expectTypeOf<Person>().toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf<Person>().toHaveProperty("name");
  expectTypeOf<Person>().toHaveProperty("age");
});

// Generic type testing
test("generic type testing", () => {
  interface Box<T> {
    value: T;
  }
  
  expectTypeOf<Box<string>>().toEqualTypeOf<{ value: string }>();
  expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
  expectTypeOf<Box<string>>().toHaveProperty("value");
});

// Conditional type testing
test("conditional type testing", () => {
  type IsString<T> = T extends string ? true : false;
  
  expectTypeOf<IsString<string>>().toEqualTypeOf<true>();
  expectTypeOf<IsString<number>>().toEqualTypeOf<false>();
});

// Mapped type testing
test("mapped type testing", () => {
  type Optional<T> = {
    [K in keyof T]?: T[K];
  };
  
  type User = {
    id: number;
    name: string;
  };
  
  expectTypeOf<Optional<User>>().toEqualTypeOf<{
    id?: number;
    name?: string;
  }>();
  
  expectTypeOf<Optional<User>>().toHaveProperty("id");
  expectTypeOf<Optional<User>>().toHaveProperty("name");
});

// Utility type testing
test("utility type testing", () => {
  interface User {
    id: number;
    name: string;
    email: string;
    age: number;
  }
  
  // Partial
  expectTypeOf<Partial<User>>().toEqualTypeOf<{
    id?: number;
    name?: string;
    email?: string;
    age?: number;
  }>();
  
  // Pick
  expectTypeOf<Pick<User, "id" | "name">>().toEqualTypeOf<{
    id: number;
    name: string;
  }>();
  
  // Omit
  expectTypeOf<Omit<User, "age">>().toEqualTypeOf<{
    id: number;
    name: string;
    email: string;
  }>();
  
  // Record
  expectTypeOf<Record<string, number>>().toEqualTypeOf<{ [key: string]: number }>();
});

// Special types testing
test("special types testing", () => {
  expectTypeOf<never>().toBeNever();
  expectTypeOf<unknown>().toBeUnknown();
  expectTypeOf<any>().toBeAny();
  expectTypeOf<void>().toBeVoid();
  expectTypeOf<undefined>().toEqualTypeOf<undefined>();
  expectTypeOf<null>().toEqualTypeOf<null>();
});

// Branded type testing (relevant to our project)
test("branded type testing", () => {
  // Simulate branded types from our lightweight.ts
  type TopicId = string & { readonly __brand: "TopicId" };
  type MetadataId = string & { readonly __brand: "MetadataId" };
  type SymbolId = string & { readonly __brand: "SymbolId" };
  
  // Branded types are still strings at runtime but have different types
  expectTypeOf<TopicId>().toBeString();
  expectTypeOf<MetadataId>().toBeString();
  expectTypeOf<SymbolId>().toBeString();
  
  // But they're not equal to each other or to plain string
  expectTypeOf<TopicId>().not.toEqualTypeOf<MetadataId>();
  expectTypeOf<TopicId>().not.toEqualTypeOf<SymbolId>();
  expectTypeOf<MetadataId>().not.toEqualTypeOf<SymbolId>();
  expectTypeOf<TopicId>().not.toEqualTypeOf<string>();
  expectTypeOf<MetadataId>().not.toEqualTypeOf<string>();
  expectTypeOf<SymbolId>().not.toEqualTypeOf<string>();
});

// Complex nested type testing
test("complex nested type testing", () => {
  type ApiResponse<T> = {
    data: T;
    status: number;
    message: string;
    timestamp: number;
  };
  
  type User = {
    id: number;
    name: string;
    email: string;
  };
  
  type UserResponse = ApiResponse<User[]>;
  
  expectTypeOf<UserResponse>().toHaveProperty("data");
  expectTypeOf<UserResponse>().toHaveProperty("status");
  expectTypeOf<UserResponse>().toHaveProperty("message");
  expectTypeOf<UserResponse>().toHaveProperty("timestamp");
  
  expectTypeOf<UserResponse>().toEqualTypeOf<{
    data: User[];
    status: number;
    message: string;
    timestamp: number;
  }>();
});

// Async function type testing
test("async function type testing", () => {
  const fetchData = async (id: number): Promise<{ id: number; name: string }> => {
    return { id, name: `User ${id}` };
  };
  
  expectTypeOf<typeof fetchData>().toBeFunction();
  expectTypeOf<typeof fetchData>().toEqualTypeOf<(id: number) => Promise<{ id: number; name: string }>>();
  expectTypeOf<typeof fetchData>().returns.resolves.toEqualTypeOf<{ id: number; name: string }>();
});

// Class type testing
test("class type testing", () => {
  class Calculator {
    constructor(private value: number = 0) {}
    
    add(num: number): this {
      this.value += num;
      return this;
    }
    
    getValue(): number {
      return this.value;
    }
  }
  
  expectTypeOf<Calculator>().toEqualTypeOf<Calculator>();
  expectTypeOf<Calculator>().toHaveProperty("add");
  expectTypeOf<Calculator>().toHaveProperty("getValue");
  
  // Test constructor type directly
  expectTypeOf<typeof Calculator>().toEqualTypeOf<new (value?: number) => Calculator>();
});

// Tuple type testing
test("tuple type testing", () => {
  type StringNumberTuple = [string, number];
  
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<[string, number]>();
  expectTypeOf<StringNumberTuple>().not.toEqualTypeOf<[number, string]>();
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<Array<string | number> & { 0: string; 1: number }>();
});

// Enum type testing
test("enum type testing", () => {
  enum Status {
    Pending = "pending",
    Approved = "approved",
    Rejected = "rejected"
  }
  
  expectTypeOf<Status>().toEqualTypeOf<"pending" | "approved" | "rejected">();
  expectTypeOf<Status.Pending>().toEqualTypeOf<"pending">();
  expectTypeOf<Status.Approved>().toEqualTypeOf<"approved">();
  expectTypeOf<Status.Rejected>().toEqualTypeOf<"rejected">();
});

// Type guard testing
test("type guard testing", () => {
  const isString = (value: unknown): value is string => {
    return typeof value === "string";
  };
  
  expectTypeOf<typeof isString>().toEqualTypeOf<(value: unknown) => value is string>();
  expectTypeOf<typeof isString>().returns.toEqualTypeOf<boolean>();
});

// Function overload testing
test("function overload testing", () => {
  function processValue(value: string): string;
  function processValue(value: number): number;
  function processValue(value: string | number): string | number {
    return value;
  }
  
  expectTypeOf<typeof processValue>().toEqualTypeOf<{
    (value: string): string;
    (value: number): number;
  }>();
});

// Recursive type testing
test("recursive type testing", () => {
  type TreeNode<T> = {
    value: T;
    left?: TreeNode<T>;
    right?: TreeNode<T>;
  };
  
  expectTypeOf<TreeNode<number>>().toEqualTypeOf<{
    value: number;
    left?: TreeNode<number>;
    right?: TreeNode<number>;
  }>();
  
  expectTypeOf<TreeNode<string>>().toHaveProperty("value");
  expectTypeOf<TreeNode<string>>().toHaveProperty("left");
  expectTypeOf<TreeNode<string>>().toHaveProperty("right");
});

// Template literal type testing
test("template literal type testing", () => {
  type EventName<T extends string> = `on${Capitalize<T>}`;
  
  expectTypeOf<EventName<"click">>().toEqualTypeOf<"onClick">();
  expectTypeOf<EventName<"hover">>().toEqualTypeOf<"onHover">();
  expectTypeOf<EventName<"click" | "hover">>().toEqualTypeOf<"onClick" | "onHover">();
});

// Index access type testing
test("index access type testing", () => {
  interface Config {
    api: {
      url: string;
      timeout: number;
    };
    ui: {
      theme: "light" | "dark";
      language: string;
    };
  }
  
  expectTypeOf<Config["api"]>().toEqualTypeOf<{ url: string; timeout: number }>();
  expectTypeOf<Config["ui"]>().toEqualTypeOf<{ theme: "light" | "dark"; language: string }>();
  expectTypeOf<Config["api"]["url"]>().toEqualTypeOf<string>();
  expectTypeOf<Config["ui"]["theme"]>().toEqualTypeOf<"light" | "dark">();
});

// Project-specific type testing (using our actual types)
test("project-specific type testing", () => {
  // Test our MarketTopic enum behavior
  type MarketTopicValue = "sports.basketball" | "sports.football" | "crypto.spot" | "crypto.derivatives";
  
  expectTypeOf<MarketTopicValue>().toEqualTypeOf<"sports.basketball" | "sports.football" | "crypto.spot" | "crypto.derivatives">();
  
  // Test DataCategory behavior
  type DataCategoryValue = "market_data" | "signals" | "arbitrage" | "risk";
  
  expectTypeOf<DataCategoryValue>().toEqualTypeOf<"market_data" | "signals" | "arbitrage" | "risk">();
  
  // Test our lightweight metadata structure
  type LightweightMetadata = {
    id: string & { readonly __brand: "MetadataId" };
    timestamp: number;
    topic: MarketTopicValue;
    category: DataCategoryValue;
    source: string;
    quality: number;
  };
  
  expectTypeOf<LightweightMetadata>().toHaveProperty("id");
  expectTypeOf<LightweightMetadata>().toHaveProperty("timestamp");
  expectTypeOf<LightweightMetadata>().toHaveProperty("topic");
  expectTypeOf<LightweightMetadata>().toHaveProperty("category");
  expectTypeOf<LightweightMetadata>().toHaveProperty("source");
  expectTypeOf<LightweightMetadata>().toHaveProperty("quality");
  
  expectTypeOf<LightweightMetadata>().toEqualTypeOf<{
    id: string & { readonly __brand: "MetadataId" };
    timestamp: number;
    topic: MarketTopicValue;
    category: DataCategoryValue;
    source: string;
    quality: number;
  }>();
});

// Type inference testing
test("type inference testing", () => {
  // Test that inferred types match expected types
  const createUser = (name: string, age: number) => ({ name, age });
  
  expectTypeOf<ReturnType<typeof createUser>>().toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf<Parameters<typeof createUser>>().toEqualTypeOf<[string, number]>();
  
  // Test generic function inference
  const identity = <T>(value: T) => value;
  
  expectTypeOf<typeof identity>().toEqualTypeOf<<T>(value: T) => T>();
  expectTypeOf<ReturnType<typeof identity<string>>>().toEqualTypeOf<string>();
  expectTypeOf<ReturnType<typeof identity<number>>>().toEqualTypeOf<number>();
});
