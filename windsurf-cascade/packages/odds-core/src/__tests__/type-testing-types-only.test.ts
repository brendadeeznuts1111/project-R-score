// packages/odds-core/src/__tests__/type-testing-types-only.test.ts
// Type-only tests for TypeScript compiler verification (no runtime test execution)

// This file contains only expectTypeOf assertions for TypeScript compiler verification
// Run with: bunx tsc --noEmit packages/odds-core/src/__tests__/type-testing-types-only.test.ts

// Import types for testing (no runtime imports)
import type { expectTypeOf } from "expect-type-of";

// Basic type equality tests
const basicTypeEquality = () => {
  expectTypeOf<string>().toEqualTypeOf<string>();
  expectTypeOf<number>().toEqualTypeOf<number>();
  expectTypeOf<boolean>().toEqualTypeOf<boolean>();
};

// Object property testing
const objectPropertyTesting = () => {
  expectTypeOf({ foo: 1 }).toHaveProperty("foo");
  expectTypeOf({ foo: 1, bar: "hello" }).toHaveProperty("foo");
  expectTypeOf({ foo: 1 }).not.toHaveProperty("bar");
};

// Promise resolution testing
const promiseResolutionTesting = () => {
  expectTypeOf<Promise<number>>().resolves.toBeNumber();
  expectTypeOf<Promise<string>>().resolves.toBeString();
  expectTypeOf<Promise<{ id: number }>>().resolves.toEqualTypeOf<{ id: number }>();
  expectTypeOf<Promise<{ id: number }>>().resolves.toHaveProperty("id");
};

// Array type testing
const arrayTypeTesting = () => {
  expectTypeOf<number[]>().toBeArray();
  expectTypeOf<string[]>().toBeArray();
  expectTypeOf<number[]>().toEqualTypeOf<Array<number>>();
};

// Function signature testing
const functionSignatureTesting = () => {
  expectTypeOf<() => void>().toBeFunction();
  expectTypeOf<(x: number) => string>().toBeFunction();
  expectTypeOf<(x: number) => string>().toEqualTypeOf<(x: number) => string>();
};

// Union type testing
const unionTypeTesting = () => {
  type StringOrNumber = string | number;
  expectTypeOf<StringOrNumber>().toEqualTypeOf<string | number>();
  expectTypeOf<string>().toMatchTypeOf<StringOrNumber>();
  expectTypeOf<number>().toMatchTypeOf<StringOrNumber>();
};

// Intersection type testing
const intersectionTypeTesting = () => {
  type WithName = { name: string };
  type WithAge = { age: number };
  type Person = WithName & WithAge;
  
  expectTypeOf<Person>().toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf<Person>().toHaveProperty("name");
  expectTypeOf<Person>().toHaveProperty("age");
};

// Generic type testing
const genericTypeTesting = () => {
  interface Box<T> {
    value: T;
  }
  
  expectTypeOf<Box<string>>().toEqualTypeOf<{ value: string }>();
  expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
  expectTypeOf<Box<string>>().toHaveProperty("value");
};

// Conditional type testing
const conditionalTypeTesting = () => {
  type IsString<T> = T extends string ? true : false;
  
  expectTypeOf<IsString<string>>().toEqualTypeOf<true>();
  expectTypeOf<IsString<number>>().toEqualTypeOf<false>();
};

// Mapped type testing
const mappedTypeTesting = () => {
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
};

// Utility type testing
const utilityTypeTesting = () => {
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
};

// Special types testing
const specialTypesTesting = () => {
  expectTypeOf<never>().toBeNever();
  expectTypeOf<unknown>().toBeUnknown();
  expectTypeOf<any>().toBeAny();
  expectTypeOf<void>().toBeVoid();
  expectTypeOf<undefined>().toEqualTypeOf<undefined>();
  expectTypeOf<null>().toEqualTypeOf<null>();
};

// Branded type testing (relevant to our project)
const brandedTypeTesting = () => {
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
};

// Complex nested type testing
const complexNestedTypeTesting = () => {
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
};

// Async function type testing
const asyncFunctionTypeTesting = () => {
  type FetchDataFunction = (id: number) => Promise<{ id: number; name: string }>;
  
  expectTypeOf<FetchDataFunction>().toBeFunction();
  expectTypeOf<FetchDataFunction>().toEqualTypeOf<(id: number) => Promise<{ id: number; name: string }>>();
  expectTypeOf<ReturnType<FetchDataFunction>>().resolves.toEqualTypeOf<{ id: number; name: string }>();
};

// Class type testing
const classTypeTesting = () => {
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
};

// Tuple type testing
const tupleTypeTesting = () => {
  type StringNumberTuple = [string, number];
  
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<[string, number]>();
  expectTypeOf<StringNumberTuple>().not.toEqualTypeOf<[number, string]>();
  expectTypeOf<StringNumberTuple>().toEqualTypeOf<Array<string | number> & { 0: string; 1: number }>();
};

// Enum type testing
const enumTypeTesting = () => {
  enum Status {
    Pending = "pending",
    Approved = "approved",
    Rejected = "rejected"
  }
  
  expectTypeOf<Status>().toEqualTypeOf<"pending" | "approved" | "rejected">();
  expectTypeOf<Status.Pending>().toEqualTypeOf<"pending">();
  expectTypeOf<Status.Approved>().toEqualTypeOf<"approved">();
  expectTypeOf<Status.Rejected>().toEqualTypeOf<"rejected">();
};

// Type guard testing
const typeGuardTesting = () => {
  type IsStringFunction = (value: unknown) => value is string;
  
  expectTypeOf<IsStringFunction>().toEqualTypeOf<(value: unknown) => value is string>();
  expectTypeOf<ReturnType<IsStringFunction>>().toEqualTypeOf<boolean>();
};

// Function overload testing
const functionOverloadTesting = () => {
  type ProcessValueFunction = {
    (value: string): string;
    (value: number): number;
  };
  
  expectTypeOf<ProcessValueFunction>().toEqualTypeOf<{
    (value: string): string;
    (value: number): number;
  }>();
};

// Recursive type testing
const recursiveTypeTesting = () => {
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
};

// Template literal type testing
const templateLiteralTypeTesting = () => {
  type EventName<T extends string> = `on${Capitalize<T>}`;
  
  expectTypeOf<EventName<"click">>().toEqualTypeOf<"onClick">();
  expectTypeOf<EventName<"hover">>().toEqualTypeOf<"onHover">();
  expectTypeOf<EventName<"click" | "hover">>().toEqualTypeOf<"onClick" | "onHover">();
};

// Index access type testing
const indexAccessTypeTesting = () => {
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
};

// Project-specific type testing (using our actual types)
const projectSpecificTypeTesting = () => {
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
};

// Type inference testing
const typeInferenceTesting = () => {
  // Test that inferred types match expected types
  type CreateUserFunction = (name: string, age: number) => { name: string; age: number };
  
  expectTypeOf<ReturnType<CreateUserFunction>>().toEqualTypeOf<{ name: string; age: number }>();
  expectTypeOf<Parameters<CreateUserFunction>>().toEqualTypeOf<[string, number]>();
  
  // Test generic function inference
  type IdentityFunction = <T>(value: T) => T;
  
  expectTypeOf<IdentityFunction>().toEqualTypeOf<<T>(value: T) => T>();
  expectTypeOf<ReturnType<IdentityFunction<string>>>().toEqualTypeOf<string>();
  expectTypeOf<ReturnType<IdentityFunction<number>>>().toEqualTypeOf<number>();
};

// Export all test functions to prevent "unused variable" errors
export {
  basicTypeEquality,
  objectPropertyTesting,
  promiseResolutionTesting,
  arrayTypeTesting,
  functionSignatureTesting,
  unionTypeTesting,
  intersectionTypeTesting,
  genericTypeTesting,
  conditionalTypeTesting,
  mappedTypeTesting,
  utilityTypeTesting,
  specialTypesTesting,
  brandedTypeTesting,
  complexNestedTypeTesting,
  asyncFunctionTypeTesting,
  classTypeTesting,
  tupleTypeTesting,
  enumTypeTesting,
  typeGuardTesting,
  functionOverloadTesting,
  recursiveTypeTesting,
  templateLiteralTypeTesting,
  indexAccessTypeTesting,
  projectSpecificTypeTesting,
  typeInferenceTesting
};
