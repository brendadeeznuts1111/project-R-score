#!/usr/bin/env bun
/**
 * @fileoverview Simple demo of Bun.inspect.custom behavior
 * @description Demonstrates custom inspection symbols for objects using Bun.inspect.custom. Shows basic usage, advanced options with depth, and color support.
 * @module examples/demos/demo-bun-inspect-custom
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.2.2.0.0.0.0;instance-id=EXAMPLE-BUN-INSPECT-CUSTOM-001;version=6.2.2.0.0.0.0}]
 * [PROPERTIES:{example={value:"Bun.inspect.custom Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.2.2.0.0.0.0"}}]
 * [CLASS:BunInspectCustomDemo][#REF:v-6.2.2.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.2.2.0.0.0.0
 * Ripgrep Pattern: 6\.2\.2\.0\.0\.0\.0|EXAMPLE-BUN-INSPECT-CUSTOM-001|BP-EXAMPLE@6\.2\.2\.0\.0\.0\.0
 * 
 * @example 6.2.2.0.0.0.0.1: Basic Custom Inspection
 * // Test Formula:
 * // 1. Create class with Bun.inspect.custom symbol method
 * // 2. Return custom string representation
 * // 3. Use Bun.inspect() or console.log() to display
 * // Expected Result: Custom inspection output displayed
 * //
 * // Snippet:
 * ```typescript
 * class Foo {
 *   [Bun.inspect.custom]() {
 *     return "custom representation";
 *   }
 * }
 * console.log(new Foo()); // "custom representation"
 * ```
 * 
 * @see {@link https://bun.com/docs/api/utilities Bun.inspect() Documentation}
 * 
 * // Ripgrep: 6.2.2.0.0.0.0
 * // Ripgrep: EXAMPLE-BUN-INSPECT-CUSTOM-001
 * // Ripgrep: BP-EXAMPLE@6.2.2.0.0.0.0
 */

// Basic example from Bun docs
class Foo {
  [Bun.inspect.custom]() {
    return "foo";
  }
}

const foo = new Foo();
console.log("Basic example:");
console.log(foo); // => "foo"
console.log();

// Advanced: Custom inspection with options
class Bar {
  constructor(private value: number) {}
  
  [Bun.inspect.custom](depth: number, options: any) {
    if (depth < 0) {
      return "[Bar]";
    }
    return {
      type: "Bar",
      value: this.value,
      doubled: this.value * 2,
      formatted: `Bar(${this.value})`,
    };
  }
}

const bar = new Bar(42);
console.log("Advanced example:");
console.log(bar);
console.log();

// With colors
class Baz {
  [Bun.inspect.custom](depth: number, options: any) {
    const colors = options.colors !== false;
    const prefix = colors ? "\x1b[36m[Baz]\x1b[0m" : "[Baz]";
    return `${prefix} Custom inspection`;
  }
}

const baz = new Baz();
console.log("With colors:");
console.log(baz);
console.log();

// Nested inspection
class Qux {
  constructor(private nested: Bar) {}
  
  [Bun.inspect.custom](depth: number, options: any) {
    if (depth < 0) {
      return "[Qux]";
    }
    return {
      type: "Qux",
      nested: Bun.inspect(this.nested, { ...options, depth: depth - 1 }),
    };
  }
}

const qux = new Qux(new Bar(100));
console.log("Nested inspection:");
console.log(qux);
console.log();

console.log("✅ All examples demonstrate Bun.inspect.custom behavior");
