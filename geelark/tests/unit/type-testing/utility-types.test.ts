#!/usr/bin/env bun

/**
 * Utility Type Tests
 * Comprehensive type checking for utility types, helpers, and common patterns
 *
 * IMPORTANT: This file only works with TypeScript compiler, not bun test runner
 * Run with: bunx tsc --noEmit tests/unit/type-testing/utility-types.test.ts
 *
 * DO NOT run with: bun test tests/unit/type-testing/utility-types.test.ts (will fail at runtime)
 */

// @ts-ignore - Bun types are available at runtime
import { expectTypeOf } from "bun:test";

// ===== BASIC UTILITY TYPES =====

// Partial - All properties optional
type PartialUser = {
  id: number;
  name: string;
  email: string;
  age?: number;
};

type PartialUserInfo = Partial<PartialUser>;

expectTypeOf<PartialUserInfo>().toMatchObjectType<{
  id?: number;
  name?: string;
  email?: string;
  age?: number;
}>();

// Required - All properties required
type RequiredUser = Required<PartialUser>;

expectTypeOf<RequiredUser>().toMatchObjectType<{
  id: number;
  name: string;
  email: string;
  age: number;
}>();

// Readonly - All properties readonly
type ReadonlyPropertiesUser = Readonly<PartialUser>;

expectTypeOf<ReadonlyPropertiesUser['id']>().toEqualTypeOf<number>();
// Note: TypeScript doesn't have a direct way to test readonly property at runtime level

// Record - Create object type with specific keys and value type
type StringRecord = Record<string, string>;
type NumberRecord = Record<number, boolean>;

expectTypeOf<StringRecord>().toEqualTypeOf<Record<string, string>>();
expectTypeOf<NumberRecord>().toEqualTypeOf<Record<number, boolean>>();

// Pick - Select specific properties
type UserBasicInfo = Pick<PartialUser, 'id' | 'name'>;

expectTypeOf<UserBasicInfo>().toMatchObjectType<{
  id: number;
  name: string;
}>();

// Omit - Remove specific properties
type UserWithoutEmail = Omit<PartialUser, 'email'>;

expectTypeOf<UserWithoutEmail>().toMatchObjectType<{
  id: number;
  name: string;
  age?: number;
}>();

// ===== ADVANCED UTILITY TYPES =====

// DeepPartial - Recursively make all properties optional
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface NestedObject {
  user: {
    id: number;
    profile: {
      name: string;
      settings: {
        theme: string;
        notifications: boolean;
      };
    };
  };
}

type PartialNested = DeepPartial<NestedObject>;

expectTypeOf<PartialNested>().toMatchObjectType<{
  user?: {
    id?: number;
    profile?: {
      name?: string;
      settings?: {
        theme?: string;
        notifications?: boolean;
      };
    };
  };
}>();

// DeepRequired - Recursively make all properties required
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

type RequiredNested = DeepRequired<PartialNested>;

expectTypeOf<RequiredNested>().toEqualTypeOf<NestedObject>();

// DeepReadonly - Recursively make all properties readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type ReadonlyNested = DeepReadonly<NestedObject>;

// ===== CONDITIONAL TYPES =====

// NonNullable - Remove null and undefined
type NullableString = string | null | undefined;
type NonNullableString = NonNullable<NullableString>;

expectTypeOf<NonNullableString>().toEqualTypeOf<string>();

// Extract - Extract types that extend a condition
type StringOrNumber = string | number | boolean;
type OnlyStrings = Extract<StringOrNumber, string>;

expectTypeOf<OnlyStrings>().toEqualTypeOf<string>();

// Exclude - Exclude types that extend a condition
type NotStrings = Exclude<StringOrNumber, string>;

expectTypeOf<NotStrings>().toEqualTypeOf<number | boolean>();

// ===== TEMPLATE LITERAL TYPES =====

// Uppercase
type LowercaseString = 'hello';
type UppercaseString = Uppercase<LowercaseString>;

expectTypeOf<UppercaseString>().toEqualTypeOf<'HELLO'>();

// Lowercase
type UppercaseString2 = 'WORLD';
type LowercaseString2 = Lowercase<UppercaseString2>;

expectTypeOf<LowercaseString2>().toEqualTypeOf<'world'>();

// Capitalize
type LowercaseString3 = 'hello world';
type CapitalizeString = Capitalize<LowercaseString3>;

expectTypeOf<CapitalizeString>().toEqualTypeOf<'Hello world'>();

// Uncapitalize
type CapitalizeString2 = 'Hello World';
type UncapitalizeString = Uncapitalize<CapitalizeString2>;

expectTypeOf<UncapitalizeString>().toEqualTypeOf<'hello World'>();

// Template literal types
type Greeting<T extends string> = `Hello, ${T}!`;

expectTypeOf<Greeting<'World'>>().toEqualTypeOf<'Hello, World!'>();
expectTypeOf<Greeting<'TypeScript'>>().toEqualTypeOf<'Hello, TypeScript!'>();

// ===== FUNCTION TYPES =====

// Parameters - Extract parameter types
function createUser(name: string, age: number, email?: string): { id: number; name: string } {
  return { id: 1, name };
}

type CreateUserParams = Parameters<typeof createUser>;

expectTypeOf<CreateUserParams>().toEqualTypeOf<[string, number, string?]>();

// ReturnType - Extract return type
type CreateUserReturn = ReturnType<typeof createUser>;

expectTypeOf<CreateUserReturn>().toMatchObjectType<{
  id: number;
  name: string;
}>();

// ConstructorParameters - Extract constructor parameter types
class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>;

expectTypeOf<UserConstructorParams>().toEqualTypeOf<[string, number]>();

// InstanceType - Extract instance type
type UserInstance = InstanceType<typeof User>;

expectTypeOf<UserInstance>().toMatchObjectType<{
  name: string;
  age: number;
}>();

// ===== MAPPED TYPES =====

// Make all properties optional
type OptionalProperties<T> = {
  [K in keyof T]?: T[K];
};

type OptionalUser = OptionalProperties<PartialUser>;

expectTypeOf<OptionalUser>().toMatchObjectType<{
  id?: number;
  name?: string;
  email?: string;
  age?: number;
}>();

// Make all properties required
type RequiredProperties<T> = {
  [K in keyof T]-?: T[K];
};

type AllRequiredUser = RequiredProperties<PartialUser>;

expectTypeOf<AllRequiredUser>().toMatchObjectType<{
  id: number;
  name: string;
  email: string;
  age: number;
}>();

// Make all properties readonly
type ReadonlyProperties<T> = {
  readonly [K in keyof T]: T[K];
};

type ReadonlyMappedUser = ReadonlyProperties<PartialUser>;

// Remove readonly from properties
type MutableProperties<T> = {
  -readonly [K in keyof T]: T[K];
};

type MutableReadonlyUser = MutableProperties<ReadonlyPropertiesUser>;

// ===== KEY MANIPULATION TYPES =====

// Keys of type
type UserKeys = keyof PartialUser;

expectTypeOf<UserKeys>().toEqualTypeOf<'id' | 'name' | 'email' | 'age'>();

// Values of type
type UserValues = PartialUser[UserKeys];

expectTypeOf<UserValues>().toEqualTypeOf<number | string | undefined>();

// Pick by value type
type StringProperties<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type UserStringProperties = StringProperties<PartialUser>;

expectTypeOf<UserStringProperties>().toMatchObjectType<{
  name: string;
  email: string;
}>();

// Number properties
type NumberProperties<T> = {
  [K in keyof T as T[K] extends number ? K : never]: T[K];
};

type UserNumberProperties = NumberProperties<PartialUser>;

expectTypeOf<UserNumberProperties>().toMatchObjectType<{
  id: number;
}>();

// ===== UNION AND INTERSECTION TYPES =====

// Union to intersection
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type StringOrNumberUnion = string | number;
type StringAndNumberIntersection = UnionToIntersection<StringOrNumberUnion>;

expectTypeOf<StringAndNumberIntersection>().toEqualTypeOf<never>(); // string | number doesn't intersect

// Function union to intersection
type Func1 = (x: string) => void;
type Func2 = (x: number) => void;
type FuncIntersection = UnionToIntersection<Func1 | Func2>;

expectTypeOf<FuncIntersection>().toEqualTypeOf<((x: string) => void) & ((x: number) => void)>();

// ===== BRANDED TYPES =====

// Branded type for IDs
type Brand<T, B> = T & { readonly __brand: B };

type UserId = Brand<number, 'UserId'>;
type EmailAddress = Brand<string, 'EmailAddress'>;

// Brand creators
function createUserId(id: number): UserId {
  return id as UserId;
}

function createEmailAddress(email: string): EmailAddress {
  return email as EmailAddress;
}

expectTypeOf<UserId>().toBeNumber();
expectTypeOf<EmailAddress>().toBeString();

expectTypeOf<typeof createUserId>().toBeFunction();
expectTypeOf<typeof createUserId>().returns.toBeNumber;

// ===== DISCRIMINATED UNIONS =====

// Shape types
type Circle = {
  type: 'circle';
  radius: number;
};

type Square = {
  type: 'square';
  side: number;
};

type Triangle = {
  type: 'triangle';
  base: number;
  height: number;
};

type Shape = Circle | Square | Triangle;

// Type guards
function isCircle(shape: Shape): shape is Circle {
  return shape.type === 'circle';
}

function isSquare(shape: Shape): shape is Square {
  return shape.type === 'square';
}

function isTriangle(shape: Shape): shape is Triangle {
  return shape.type === 'triangle';
}

expectTypeOf<Shape>().toEqualTypeOf<Circle | Square | Triangle>();
expectTypeOf<typeof isCircle>().toBeFunction();
expectTypeOf<typeof isCircle>().returns.toBeBoolean;

// ===== RECURSIVE TYPES =====

// Recursive tree structure
interface TreeNode<T> {
  value: T;
  children?: TreeNode<T>[];
}

// Recursive function type
type RecursiveFunction = (n: number) => RecursiveFunction | number;

// Promise chaining
type PromiseChain<T> = Promise<T> | Promise<PromiseChain<T>>;

expectTypeOf<TreeNode<string>>().toMatchObjectType<{
  value: string;
  children?: TreeNode<string>[];
}>();

// ===== UTILITY FUNCTION TYPES =====

// Async function wrapper
type AsyncFunction<T extends any[] = any[], R = any> = (...args: T) => Promise<R>;

// Sync function wrapper
type SyncFunction<T extends any[] = any[], R = any> = (...args: T) => R;

// Event handler
type EventHandler<T = any> = (event: T) => void;

// Predicate function
type Predicate<T> = (value: T) => boolean;

// Mapper function
type Mapper<T, U> = (value: T) => U;

// Reducer function
type Reducer<T, U> = (accumulator: U, value: T) => U;

expectTypeOf<AsyncFunction<[string, number], boolean>>().toBeFunction();
expectTypeOf<SyncFunction<[string], number>>().toBeFunction();
expectTypeOf<EventHandler<string>>().toBeFunction();
expectTypeOf<Predicate<string>>().toBeFunction();
expectTypeOf<Mapper<string, number>>().toBeFunction();
expectTypeOf<Reducer<string, number[]>>().toBeFunction();

// ===== COLLECTION TYPES =====

// Array utilities
type ArrayElement<T> = T extends (infer U)[] ? U : never;
type ArrayLength<T> = T extends readonly any[] ? T['length'] : never;

type StringArray = string[];
type StringElement = ArrayElement<StringArray>;
type StringArrayLength = ArrayLength<StringArray>;

expectTypeOf<StringElement>().toEqualTypeOf<string>();
expectTypeOf<StringArrayLength>().toEqualTypeOf<number>();

// Set utilities
type SetElement<T> = T extends Set<infer U> ? U : never;

type StringSet = Set<string>;
type StringSetElement = SetElement<StringSet>;

expectTypeOf<StringSetElement>().toEqualTypeOf<string>();

// Map utilities
type MapKey<T> = T extends Map<infer K, any> ? K : never;
type MapValue<T> = T extends Map<any, infer V> ? V : never;

type StringNumberMap = Map<string, number>;
type MapKeyString = MapKey<StringNumberMap>;
type MapValueNumber = MapValue<StringNumberMap>;

expectTypeOf<MapKeyString>().toEqualTypeOf<string>();
expectTypeOf<MapValueNumber>().toEqualTypeOf<number>();

// ===== CONDITIONAL UTILITY TYPES =====

// If-Then-Else
type If<C extends boolean, T, F> = C extends true ? T : F;

type TestTrue = If<true, string, number>;
type TestFalse = If<false, string, number>;

expectTypeOf<TestTrue>().toEqualTypeOf<string>();
expectTypeOf<TestFalse>().toEqualTypeOf<number>();

// Not
type Not<T extends boolean> = T extends true ? false : true;

type NotTrue = Not<true>;
type NotFalse = Not<false>;

expectTypeOf<NotTrue>().toEqualTypeOf<false>();
expectTypeOf<NotFalse>().toEqualTypeOf<true>();

// And
type And<A extends boolean, B extends boolean> = A extends true ? B : false;

type TrueAndTrue = And<true, true>;
type TrueAndFalse = And<true, false>;
type FalseAndTrue = And<false, true>;
type FalseAndFalse = And<false, false>;

expectTypeOf<TrueAndTrue>().toEqualTypeOf<true>();
expectTypeOf<TrueAndFalse>().toEqualTypeOf<false>();
expectTypeOf<FalseAndTrue>().toEqualTypeOf<false>();
expectTypeOf<FalseAndFalse>().toEqualTypeOf<false>();

// Or
type Or<A extends boolean, B extends boolean> = A extends true ? true : B;

type TrueOrTrue = Or<true, true>;
type TrueOrFalse = Or<true, false>;
type FalseOrTrue = Or<false, true>;
type FalseOrFalse = Or<false, false>;

expectTypeOf<TrueOrTrue>().toEqualTypeOf<true>();
expectTypeOf<TrueOrFalse>().toEqualTypeOf<true>();
expectTypeOf<FalseOrTrue>().toEqualTypeOf<true>();
expectTypeOf<FalseOrFalse>().toEqualTypeOf<false>();

// ===== PERFORMANCE UTILITY TYPES =====

// Memoized function
type MemoizedFunction<T extends any[] = any[], R = any> = {
  (...args: T): R;
  cache: Map<string, R>;
  clear(): void;
};

// Debounced function
type DebouncedFunction<T extends any[] = any[]> = {
  (...args: T): void;
  cancel(): void;
  flush(): void;
};

// Throttled function
type ThrottledFunction<T extends any[] = any[]> = {
  (...args: T): void;
  cancel(): void;
};

expectTypeOf<MemoizedFunction<[string], number>>().toEqualTypeOf<{
  (...args: [string]): number;
  cache: Map<string, number>;
  clear(): void;
}>();

expectTypeOf<DebouncedFunction<[string]>>().toEqualTypeOf<{
  (...args: [string]): void;
  cancel(): void;
  flush(): void;
}>();

expectTypeOf<ThrottledFunction<[string]>>().toEqualTypeOf<{
  (...args: [string]): void;
  cancel(): void;
}>();
