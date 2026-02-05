# Type Testing with expectTypeOf() - Complete Workflow Guide

This guide demonstrates the complete workflow for testing TypeScript types alongside unit tests using `expectTypeOf()`.

## 🎯 Overview

`expectTypeOf()` allows you to test TypeScript types at compile time, providing type safety guarantees alongside your runtime tests.

## 📋 Two-Part Workflow

### Part 1: Runtime Tests with Bun
```bash
bun test packages/odds-core/src/__tests__/type-testing-workflow.test.ts
```

### Part 2: TypeScript Compiler Verification
```bash
bunx tsc --noEmit packages/odds-core/src/__tests__/type-testing-verification.ts
```

## 🚀 Quick Start Example

```typescript
import { expectTypeOf, test } from "bun:test";

test("types are correct", () => {
  expectTypeOf<string>().toEqualTypeOf<string>();
  expectTypeOf({ foo: 1 }).toHaveProperty("foo");
  expectTypeOf<Promise<number>>().resolves.toBeNumber();
});
```

## 📊 Available Assertions

### Basic Type Operations
```typescript
// Equality
expectTypeOf<string>().toEqualTypeOf<string>();
expectTypeOf<string>().not.toEqualTypeOf<number>();

// Matching (subtype checking)
expectTypeOf<string>().toMatchTypeOf<string | number>();
expectTypeOf<number>().toMatchTypeOf<string | number>();
```

### Object Property Testing
```typescript
// Property existence
expectTypeOf({ foo: 1 }).toHaveProperty("foo");
expectTypeOf({ foo: 1 }).not.toHaveProperty("bar");

// Property types
expectTypeOf({ foo: 1 }).toEqualTypeOf<{ foo: number }>();
```

### Promise Type Testing
```typescript
// Resolution types
expectTypeOf<Promise<number>>().resolves.toBeNumber();
expectTypeOf<Promise<string>>().resolves.toBeString();
expectTypeOf<Promise<{ id: number }>>().resolves.toHaveProperty("id");
```

### Array Type Testing
```typescript
// Array checking
expectTypeOf<number[]>().toBeArray();
expectTypeOf<string[]>().toBeArray();

// Array element types
expectTypeOf<number[]>().toEqualTypeOf<Array<number>>();
```

### Function Type Testing
```typescript
// Function checking
expectTypeOf<() => void>().toBeFunction();
expectTypeOf<(x: number) => string>().toBeFunction();

// Function signatures
expectTypeOf<(x: number) => string>().toEqualTypeOf<(x: number) => string>();
```

## 🏗️ Advanced Type Testing

### Union Types
```typescript
type StringOrNumber = string | number;
expectTypeOf<StringOrNumber>().toEqualTypeOf<string | number>();
expectTypeOf<string>().toMatchTypeOf<StringOrNumber>();
```

### Generic Types
```typescript
interface Box<T> {
  value: T;
}

expectTypeOf<Box<string>>().toEqualTypeOf<{ value: string }>();
expectTypeOf<Box<number>>().toEqualTypeOf<{ value: number }>();
```

### Utility Types
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Partial
expectTypeOf<Partial<User>>().toEqualTypeOf<{
  id?: number;
  name?: string;
  email?: string;
}>();

// Pick
expectTypeOf<Pick<User, "id" | "name">>().toEqualTypeOf<{
  id: number;
  name: string;
}>();

// Omit
expectTypeOf<Omit<User, "email">>().toEqualTypeOf<{
  id: number;
  name: string;
}>();
```

### Branded Types
```typescript
type TopicId = string & { readonly __brand: "TopicId" };
type MetadataId = string & { readonly __brand: "MetadataId" };

// Branded types are still strings
expectTypeOf<TopicId>().toBeString();
expectTypeOf<MetadataId>().toBeString();

// But they're not equal to each other
expectTypeOf<TopicId>().not.toEqualTypeOf<MetadataId>();
expectTypeOf<TopicId>().not.toEqualTypeOf<string>();
```

## 🔧 Project-Specific Examples

### Testing Our Odds Protocol Types
```typescript
test("project-specific type testing", () => {
  // MarketTopic enum behavior
  type MarketTopicValue = "sports.basketball" | "crypto.spot";
  expectTypeOf<MarketTopicValue>().toEqualTypeOf<"sports.basketball" | "crypto.spot">();
  
  // Lightweight metadata structure
  type LightweightMetadata = {
    id: string & { readonly __brand: "MetadataId" };
    timestamp: number;
    topic: MarketTopicValue;
    category: "market_data" | "signals";
    source: string;
    quality: number;
  };
  
  expectTypeOf<LightweightMetadata>().toHaveProperty("id");
  expectTypeOf<LightweightMetadata>().toHaveProperty("timestamp");
  expectTypeOf<LightweightMetadata>().toHaveProperty("topic");
});
```

## 🛡️ TypeScript Compiler Verification

For additional safety, you can create type-only files that TypeScript can verify:

```typescript
// type-testing-verification.ts
type BasicTypeEquality = 
  string extends string ? true : false;

// This will cause a TypeScript error if false
const assertBasicTypeEquality: BasicTypeEquality = true;
```

Run verification with:
```bash
bunx tsc --noEmit packages/odds-core/src/__tests__/type-testing-verification.ts
```

## 📈 Benefits

1. **🛡️ Compile-Time Safety**: Catch type errors before runtime
2. **📚 Documentation**: Serves as living type documentation
3. **🔄 Refactoring Safety**: Prevents accidental type changes
4. **🧪 Type-Only Tests**: No runtime overhead for pure type validation
5. **🎯 Precise Validation**: Exact type matching vs. subtype matching

## 🎯 Best Practices

1. **Use `toEqualTypeOf`** for exact type matching
2. **Use `toMatchTypeOf`** for subtype checking
3. **Test branded types** to ensure they maintain uniqueness
4. **Test utility types** to verify complex transformations
5. **Combine with runtime tests** for comprehensive coverage
6. **Use TypeScript verification** for additional safety

## 🚀 Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run type tests
  run: bun test packages/odds-core/src/__tests__/type-testing-workflow.test.ts

- name: Verify types with TypeScript
  run: bunx tsc --noEmit packages/odds-core/src/__tests__/type-testing-verification.ts
```

## 📝 Example Output

### Runtime Tests
```
✓ basic type equality [0.01ms]
✓ object property testing [0.02ms]
✓ Promise resolution testing
✓ array type testing
✓ function signature testing
25 pass, 0 fail
```

### TypeScript Verification
```
# No output means success!
# Any type errors would be displayed here
```

## 🎉 Complete Workflow

1. **Write runtime tests** with `expectTypeOf()`
2. **Run Bun tests** for execution verification
3. **Create type verification file** for additional safety
4. **Run TypeScript compiler** for compile-time verification
5. **Add to CI/CD** for automated type safety

This comprehensive approach ensures both runtime correctness and compile-time type safety! 🚀
