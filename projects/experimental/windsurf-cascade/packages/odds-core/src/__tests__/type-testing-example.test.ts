// packages/odds-core/src/__tests__/type-testing-example.test.ts
// Correct examples of Bun's expectTypeOf for type testing

import { expectTypeOf, test, describe } from "bun:test";

// Test basic type equality
test("basic type equality", () => {
  expectTypeOf<string>().toEqualTypeOf<string>();
  expectTypeOf<number>().toEqualTypeOf<number>();
  expectTypeOf<boolean>().toEqualTypeOf<boolean>();
  
  // Different types should not be equal
  // expectTypeOf<string>().toEqualTypeOf<number>(); // This would fail at compile time
});

// Test object types
test("object type testing", () => {
  expectTypeOf({ foo: 1 }).toHaveProperty("foo");
  expectTypeOf({ foo: 1, bar: "hello" }).toHaveProperty("foo");
  expectTypeOf({ foo: 1 }).not.toHaveProperty("bar");
  
  // Test property types by checking the object structure
  expectTypeOf({ foo: 1 }).toEqualTypeOf<{ foo: number }>();
  expectTypeOf({ bar: "hello" }).toEqualTypeOf<{ bar: string }>();
});

// Test Promise types
test("Promise type testing", () => {
  expectTypeOf<Promise<number>>().resolves.toBeNumber();
  expectTypeOf<Promise<string>>().resolves.toBeString();
  expectTypeOf<Promise<{ id: number }>>().resolves.toEqualTypeOf<{ id: number }>();
  expectTypeOf<Promise<{ id: number }>>().resolves.toHaveProperty("id");
});

// Test array types
test("array type testing", () => {
  expectTypeOf<number[]>().toBeArray();
  expectTypeOf<string[]>().toBeArray();
  expectTypeOf<number[]>().toEqualTypeOf<number[]>();
  expectTypeOf<string[]>().toEqualTypeOf<string[]>();
  
  // Test array items by checking the array type
  expectTypeOf<number[]>().toEqualTypeOf<Array<number>>();
  expectTypeOf<string[]>().toEqualTypeOf<Array<string>>();
});

// Test function types
test("function type testing", () => {
  expectTypeOf<() => void>().toBeFunction();
  expectTypeOf<(x: number) => string>().toBeFunction();
  expectTypeOf<(x: number) => string>().toEqualTypeOf<(x: number) => string>();
  
  // Function with multiple parameters
  const add = (a: number, b: number): number => a + b;
  expectTypeOf<typeof add>().toBeFunction();
  expectTypeOf<typeof add>().toEqualTypeOf<(a: number, b: number) => number>();
});

// Test union types
test("union type testing", () => {
  type StringOrNumber = string | number;
  expectTypeOf<StringOrNumber>().toEqualTypeOf<string | number>();
  
  // Test union members by checking if they extend the base types
  expectTypeOf<string>().toMatchTypeOf<StringOrNumber>();
  expectTypeOf<number>().toMatchTypeOf<StringOrNumber>();
});

// Test intersection types
test("intersection type testing", () => {
  type WithName = { name: string };
  type WithAge = { age: number };
  type Person = WithName & WithAge;
  
  expectTypeOf<Person>().toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf<Person>().toHaveProperty("name");
  expectTypeOf<Person>().toHaveProperty("age");
});

// Test generic types
test("generic type testing", () => {
  interface Box<T> {
    value: T;
  }
  
  expectTypeOf<Box<string>>().toEqualTypeOf<{ value: string }>();
  expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
  expectTypeOf<Box<string>>().toHaveProperty("value");
});

// Test conditional types
test("conditional type testing", () => {
  type IsString<T> = T extends string ? true : false;
  
  expectTypeOf<IsString<string>>().toEqualTypeOf<true>();
  expectTypeOf<IsString<number>>().toEqualTypeOf<false>();
});

// Test mapped types
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

// Test utility types
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

// Test never and unknown types
test("special types testing", () => {
  expectTypeOf<never>().toBeNever();
  expectTypeOf<unknown>().toBeUnknown();
  expectTypeOf<any>().toBeAny();
  expectTypeOf<void>().toBeVoid();
  expectTypeOf<undefined>().toEqualTypeOf<undefined>();
  expectTypeOf<null>().toEqualTypeOf<null>();
});

// Test branded types (from our project)
test("branded type testing", () => {
  // Simulate branded types from our lightweight.ts
  type TopicId = string & { readonly __brand: "TopicId" };
  type MetadataId = string & { readonly __brand: "MetadataId" };
  
  // Branded types are still strings at runtime but have different types
  expectTypeOf<TopicId>().toBeString();
  expectTypeOf<MetadataId>().toBeString();
  expectTypeOf<TopicId>().not.toEqualTypeOf<MetadataId>();
  expectTypeOf<TopicId>().not.toEqualTypeOf<string>();
});

// Test complex nested types
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

// Test async function types
test("async function type testing", () => {
  const fetchData = async (id: number): Promise<{ id: number; name: string }> => {
    return { id, name: `User ${id}` };
  };
  
  expectTypeOf<typeof fetchData>().toBeFunction();
  expectTypeOf<typeof fetchData>().toEqualTypeOf<(id: number) => Promise<{ id: number; name: string }>>();
  expectTypeOf<typeof fetchData>().returns.resolves.toEqualTypeOf<{ id: number; name: string }>();
});

// Test class types
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

// Test tuple types
test("tuple type testing", () => {
  type StringNumberTuple = [string, number];
  
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<[string, number]>();
  expectTypeOf<StringNumberTuple>().not.toEqualTypeOf<[number, string]>();
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<Array<string | number> & { 0: string; 1: number }>();
});

// Test enum types
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

// Test type guards and type predicates
test("type guard testing", () => {
  const isString = (value: unknown): value is string => {
    return typeof value === "string";
  };
  
  expectTypeOf<typeof isString>().toEqualTypeOf<(value: unknown) => value is string>();
  expectTypeOf<typeof isString>().returns.toEqualTypeOf<boolean>();
});

// Test function overloads
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

// Test recursive types
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

// Test template literal types
test("template literal type testing", () => {
  type EventName<T extends string> = `on${Capitalize<T>}`;
  
  expectTypeOf<EventName<"click">>().toEqualTypeOf<"onClick">();
  expectTypeOf<EventName<"hover">>().toEqualTypeOf<"onHover">();
  expectTypeOf<EventName<"click" | "hover">>().toEqualTypeOf<"onClick" | "onHover">();
});

// Test index access types
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
