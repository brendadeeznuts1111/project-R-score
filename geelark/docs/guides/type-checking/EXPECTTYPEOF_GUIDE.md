# 🧪 expectTypeOf Complete Guide

**Reference:** [https://bun.com/reference/bun/test/expectTypeOf](https://bun.com/reference/bun/test/expectTypeOf)

`expectTypeOf` is Bun's compile-time type testing utility. It validates TypeScript types during the test compilation phase, catching type errors before runtime.

## 📚 Table of Contents

- [Basic Usage](#basic-usage)
- [Type Matchers](#type-matchers)
- [Object Matchers](#object-matchers)
- [Function Matchers](#function-matchers)
- [Advanced Patterns](#advanced-patterns)
- [Common Patterns](#common-patterns)
- [Pro Tips](#pro-tips)
- [Pro Tips Guide](./expectTypeOf-pro-tips.md)

## 🚀 Basic Usage

```typescript
import { test, expectTypeOf } from "bun:test";

test("basic type checks", () => {
  // Primitive types
  expectTypeOf("hello").toBeString();
  expectTypeOf(42).toBeNumber();
  expectTypeOf(true).toBeBoolean();
  expectTypeOf(BigInt(42)).toBeBigInt();
  expectTypeOf(Symbol()).toBeSymbol();
  expectTypeOf(null).toBeNull();
  expectTypeOf(undefined).toBeUndefined();

  // Any/unknown
  expectTypeOf(undefined as any).toBeAny();
  expectTypeOf(undefined as unknown).toBeUnknown();
});
```

## 🎯 Type Matchers

### Primitive Matchers

| Matcher | Description |
|---------|-------------|
| `.toBeString()` | Value must be `string` |
| `.toBeNumber()` | Value must be `number` |
| `.toBeBoolean()` | Value must be `boolean` |
| `.toBeBigInt()` | Value must be `bigint` |
| `.toBeSymbol()` | Value must be `symbol` |
| `.toBeNull()` | Value must be `null` |
| `.toBeUndefined()` | Value must be `undefined` |
| `.toBeAny()` | Value must be `any` |
| `.toBeUnknown()` | Value must be `unknown` |
| `.toBeNever()` | Value must be `never` |
| `.toBeObject()` | Value must be `object` (not null) |
| `.toBeFunction()` | Value must be `function` |
| `.toBeArray()` | Value must be `array` |

### Example

```typescript
test("primitive matchers", () => {
  expectTypeOf("hello").toBeString();
  expectTypeOf(42).toBeNumber();
  expectTypeOf(true).toBeBoolean();
  expectTypeOf(() => {}).toBeFunction();
  expectTypeOf([1, 2, 3]).toBeArray();
  expectTypeOf({ a: 1 }).toBeObject();
});
```

## 🏗️ Object Matchers

### Exact Type Matching

```typescript
test("exact type matching", () => {
  // Using toEqualTypeOf for exact match
  expectTypeOf({ a: 1, b: 2 }).toEqualTypeOf<{ a: number; b: number }>();

  // This fails - extra property
  expectTypeOf({ a: 1, b: 2, c: 3 }).not.toEqualTypeOf<{ a: number; b: number }>();
});
```

### Partial Type Matching

```typescript
test("partial type matching", () => {
  // toMatchTypeOf checks if the type matches (allows extra props)
  expectTypeOf({ a: 1, b: 2, c: 3 }).toMatchTypeOf<{ a: number }>();

  // This works - subset matches
  interface User {
    id: number;
    name: string;
    email: string;
  }

  const user = {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    extra: "ignored", // Extra props are OK with toMatchTypeOf
  };

  expectTypeOf(user).toMatchTypeOf<User>();
});
```

### Object Shape Matching

```typescript
test("object shape matching", () => {
  interface Response {
    status: number;
    data: unknown;
  }

  const res = { status: 200, data: { users: [] }, timestamp: Date.now() };

  //toMatchObjectType checks if object has required properties
  expectTypeOf(res).toMatchObjectType<{ status: number; data: unknown }>();
});
```

## ⚡ Function Matchers

```typescript
test("function type checks", () => {
  // Function signature
  type Add = (a: number, b: number) => number;
  const add: Add = (a, b) => a + b;
  expectTypeOf(add).toEqualTypeOf<Add>();

  // Parameter types
  expectTypeOf(add).parameters.toEqualTypeOf<[number, number]>();

  // Return type
  expectTypeOf(add).returns.toEqualTypeOf<number>();

  // Constructor
  class User {
    constructor(public name: string) {}
  }
  expectTypeOf(User).toBeConstructor();
  expectTypeOf(User).constructParameters.toEqualTypeOf<[string]>();
  expectTypeOf(User).instanceType.toEqualTypeOf<User>();
  expectTypeOf(User).new().toMatchTypeOf<User>();
});
```

## 🔄 Advanced Patterns

### Generic Types

```typescript
test("generic types", () => {
  function identity<T>(value: T): T {
    return value;
  }

  // Generic function type
  expectTypeOf(identity).toBeFunction();
  expectTypeOf(identity(42)).toBeNumber();
  expectTypeOf(identity("hello")).toBeString();
});
```

### Union Types

```typescript
test("union types", () => {
  type StringOrNumber = string | number;

  expectTypeOf("hello").toMatchTypeOf<StringOrNumber>();
  expectTypeOf(42).toMatchTypeOf<StringOrNumber>();
  expectTypeOf(true).not.toMatchTypeOf<StringOrNumber>();
});
```

### Optional Properties

```typescript
test("optional properties", () => {
  interface User {
    id: number;
    name: string;
    age?: number; // optional
  }

  const user: User = { id: 1, name: "Alice" };
  expectTypeOf(user).toMatchTypeOf<User>();

  const userWithAge: User = { id: 2, name: "Bob", age: 30 };
  expectTypeOf(userWithAge).toMatchTypeOf<User>();
});
```

### Array Element Types

```typescript
test("array element types", () => {
  const numbers = [1, 2, 3];
  expectTypeOf(numbers).toBeArray();
  expectTypeOf(numbers[0]).toBeNumber();

  // Readonly arrays
  const readonlyNumbers: readonly number[] = [1, 2, 3];
  expectTypeOf(readonlyNumbers).toEqualTypeOf<readonly number[]>();

  // Tuple types
  const tuple: [string, number] = ["hello", 42];
  expectTypeOf(tuple).toEqualTypeOf<[string, number]>();
});
```

### Promise Types

```typescript
test("promise types", () => {
  async function fetchData() {
    return { data: "hello" };
  }

  expectTypeOf(fetchData).returns.toBePromise();
  expectTypeOf(fetchData()).toBePromise();
  expectTypeOf(fetchData()).resolves.toMatchTypeOf<{ data: string }>();
});
```

### Conditional Types

```typescript
test("conditional types", () => {
  type NonNullable<T> = T extends null | undefined ? never : T;

  expectTypeOf<NonNullable<string>>().toEqualTypeOf<string>();
  expectTypeOf<NonNullable<string | null>>().toEqualTypeOf<string>();
  expectTypeOf<NonNullable<null>>().toEqualTypeOf<never>();
});
```

## 📋 Common Patterns

### API Response Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface User {
  id: number;
  name: string;
}

test("API response types", () => {
  async function fetchUser(id: number): Promise<ApiResponse<User>> {
    return {
      success: true,
      data: { id, name: "User" }
    };
  }

  expectTypeOf(fetchUser).returns.toEqualTypeOf<Promise<ApiResponse<User>>>();
  expectTypeOf(fetchUser).returns.resolves.toMatchTypeOf<ApiResponse<User>>();
});
```

### Class Instance vs Constructor

```typescript
test("class vs instance", () => {
  class UserService {
    constructor(private db: Database) {}

    async getUser(id: number) {
      return this.db.query(id);
    }
  }

  class Database {
    query(id: number) {
      return { id, name: "User" };
    }
  }

  // Constructor type
  expectTypeOf(UserService).toBeConstructor();

  // Instance type
  const service = new UserService(new Database());
  expectTypeOf(service).toMatchTypeOf<UserService>();

  // Using .instanceType
  expectTypeOf(UserService).instanceType.toMatchTypeOf<UserService>();
});
```

### Event Handler Types

```typescript
test("event handler types", () => {
  type EventHandler<T = unknown> = (event: T) => void;

  const handleClick: EventHandler<MouseEvent> = (e) => {
    console.log(e.clientX);
  };

  expectTypeOf(handleClick).parameters.toEqualTypeOf<[MouseEvent]>();
  expectTypeOf(handleClick).returns.toEqualTypeOf<void>();
});
```

### Configuration Object Types

```typescript
interface ServerConfig {
  port: number;
  host?: string;
  ssl?: boolean;
  cors?: {
    origin: string | string[];
    methods?: string[];
  };
}

test("configuration types", () => {
  const config: ServerConfig = {
    port: 3000,
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  };

  expectTypeOf(config).toMatchTypeOf<ServerConfig>();
  expectTypeOf(config.cors).toMatchTypeOf<ServerConfig["cors"]>();
});
```

## 💡 Pro Tips

### 1. Use `.not.` for Negative Assertions

```typescript
test("negative assertions", () => {
  expectTypeOf("hello").not.toBeNumber();
  expectTypeOf({ a: 1 }).not.toEqualTypeOf<{ a: string }>();
  expectTypeOf([1, 2]).not.toEqualTypeOf<string[]>();
});
```

### 2. Check Function Overloads

```typescript
function process(value: string): number;
function process(value: number): string;
function process(value: string | number): string | number {
  return value;
}

test("function overloads", () => {
  expectTypeOf(process).toBeFunction();
  // Both overloads are valid
  expectTypeOf(process("hello")).toBeNumber();
  expectTypeOf(process(42)).toBeString();
});
```

### 3. Test Generic Constraints

```typescript
interface Entity {
  id: number;
}

function findById<T extends Entity>(id: number, entities: T[]): T | undefined {
  return entities.find(e => e.id === id);
}

test("generic constraints", () => {
  type User = Entity & { name: string };
  const users: User[] = [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
  ];

  expectTypeOf(findById(1, users)).toMatchTypeOf<User | undefined>();
});
```

### 4. Assert Literal Types

```typescript
test("literal types", () => {
  type Role = "admin" | "user" | "guest";

  const role: Role = "admin";
  expectTypeOf(role).toEqualTypeOf<Role>();

  // String literal
  expectTypeOf("admin").toEqualTypeOf<"admin">();

  // Number literal
  expectTypeOf(42).toEqualTypeOf<42>();
});
```

### 5. Check Async Function Return Types

```typescript
test("async return types", () => {
  async function fetchData(): Promise<{ data: string }> {
    return { data: "hello" };
  }

  expectTypeOf(fetchData).returns.toBePromise();
  expectTypeOf(fetchData).returns.resolves.toMatchTypeOf<{ data: string }>();
  expectTypeOf(fetchData).returns.resolves.data.toBeString();
});
```

### 6. Test Map/Set Types

```typescript
test("collection types", () => {
  const map = new Map<string, number>();
  expectTypeOf(map).toEqualTypeOf<Map<string, number>>();

  const set = new Set<number>();
  expectTypeOf(set).toEqualTypeOf<Set<number>>();

  // Generic collection
  function getCollection<T>(): Map<string, T> {
    return new Map();
  }

  expectTypeOf(getCollection<number>()).toEqualTypeOf<Map<string, number>>();
});
```

### 7. Assert This Types

```typescript
class Chainable {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  multiply(n: number): this {
    this.value *= n;
    return this;
  }
}

test("this types", () => {
  const chain = new Chainable();
  expectTypeOf(chain.add(1)).toEqualTypeOf<Chainable>();
  expectTypeOf(chain.multiply(2)).toEqualTypeOf<Chainable>();
});
```

### 8. Type Guards

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

test("type guard assertions", () => {
  const value: unknown = "hello";

  if (isString(value)) {
    expectTypeOf(value).toBeString();
  }

  if (isNumber(value)) {
    expectTypeOf(value).toBeNumber();
  }
});
```

## 📁 File Locations

### Implementation in geelark

```
tests/unit/type-testing/
├── advanced-expectTypeOf.test.ts    # Comprehensive examples
├── basic-expectTypeOf.test.ts        # Basic usage patterns
└── expectTypeOf-patterns.test.ts     # Common patterns

docs/
├── expectTypeOf-pro-tips.md          # Advanced tips
├── expectTypeOf-implementation.md    # Implementation details
└── expectTypeOf-runtime-complete.md # Runtime testing guide
```

### Running expectTypeOf Tests

```bash
# Run all expectTypeOf tests
bun test tests/unit/type-testing/

# Run specific test file
bun test tests/unit/type-testing/advanced-expectTypeOf.test.ts

# Run with verbose output
bun test --verbose tests/unit/type-testing/
```

## 🔗 Related Documentation

- [Bun Test Reference](https://bun.com/reference/bun/test)
- [Bun Test expect](https://bun.com/reference/bun/test/expect)
- [Testing Alignment](./testing/TESTING_ALIGNMENT.md)
- [BUN_RUNTIME_FEATURES](../runtime/BUN_RUNTIME_FEATURES.md)
