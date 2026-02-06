# Bun 1.3 Test Framework & Compatibility Improvements

## Overview

Bun 1.3 introduces significant improvements to the test framework and Node.js compatibility, including:
- **require.extensions** API support for custom file loaders
- **Enhanced snapshot testing** with automatic indentation and better diffs
- **Improved test utilities** (mock.clearAllMocks(), coverage filtering, variable substitution)
- **Stricter CI mode** for better test reliability
- **Compact AI output** for coding assistants
- **FormData boundary** changes to match Node.js behavior

---

## 🔌 require.extensions Support

### Overview

Bun now supports Node.js's `require.extensions` API, allowing packages that rely on custom file loaders to work in Bun.

### Basic Usage

```typescript
// Register a custom file loader for .txt files
require.extensions[".txt"] = (module, filename) => {
  const content = require("fs").readFileSync(filename, "utf8");
  module.exports = content;
};

// Now you can require .txt files directly
const text = require("./file.txt");
console.log(text); // File contents as string
```

### Example: Loading JSON as Text

```typescript
// Custom loader for .json files that returns raw text
require.extensions[".json"] = (module, filename) => {
  const content = require("fs").readFileSync(filename, "utf8");
  module.exports = content; // Return as string, not parsed JSON
};

const rawJson = require("./config.json");
console.log(typeof rawJson); // "string"
```

### Example: Loading YAML Files

```typescript
// Custom loader for .yaml files
require.extensions[".yaml"] = (module, filename) => {
  const content = require("fs").readFileSync(filename, "utf8");
  // Parse YAML (you'd need a YAML parser library)
  const parsed = parseYAML(content);
  module.exports = parsed;
};

const config = require("./config.yaml");
console.log(config); // Parsed YAML object
```

### Example: Loading Markdown Files

```typescript
// Custom loader for .md files
require.extensions[".md"] = (module, filename) => {
  const content = require("fs").readFileSync(filename, "utf8");
  module.exports = {
    content,
    filename,
    wordCount: content.split(/\s+/).length,
  };
};

const doc = require("./README.md");
console.log(doc.wordCount); // Word count
console.log(doc.content); // Markdown content
```

### Module Object

The `module` parameter provides:
- `module.exports` - Set the exported value
- `module.filename` - Full path to the file
- `module.id` - Module identifier

### Use Cases

✅ **Use require.extensions when**:
- Migrating Node.js packages that rely on custom loaders
- Loading non-JavaScript files (YAML, TOML, etc.)
- Custom file format processing
- Legacy package compatibility

❌ **Consider alternatives when**:
- You can use ES modules (`import`)
- You need type safety (TypeScript)
- You want better IDE support

---

## 📸 Enhanced Snapshot Testing

### Automatic Indentation

Snapshot content is **automatically indented** to align with your test code, making snapshots more readable and easier to maintain.

**Before** (manual indentation):
```typescript
expect(data).toMatchInlineSnapshot(`
{
  "key": "value"
}
`);
```

**After** (automatic indentation):
```typescript
test("example", () => {
  const data = { key: "value" };
  expect(data).toMatchInlineSnapshot(`
    {
      "key": "value"
    }
  `);
});
```

The snapshot automatically aligns with your code indentation level!

### Better Diffs

Improved visualization with **whitespace highlighting** makes it easier to spot differences:

```typescript
test("snapshot diff", () => {
  const data = { name: "Bun", version: "1.3" };
  expect(data).toMatchInlineSnapshot(`
    {
      "name": "Bun",
      "version": "1.3"
    }
  `);
});
```

When snapshots differ, Bun highlights:
- Added lines (green)
- Removed lines (red)
- Changed lines (yellow)
- Whitespace differences

### Snapshot Best Practices

```typescript
// ✅ Good: Use inline snapshots for small values
test("small object", () => {
  expect({ id: 1, name: "test" }).toMatchInlineSnapshot(`
    {
      "id": 1,
      "name": "test"
    }
  `);
});

// ✅ Good: Use file snapshots for large/complex data
test("large dataset", () => {
  const largeData = generateLargeDataset();
  expect(largeData).toMatchSnapshot();
});

// ✅ Good: Use error snapshots
test("error message", () => {
  expect(() => {
    throw new Error("Something went wrong");
  }).toThrowErrorMatchingInlineSnapshot(`"Something went wrong"`);
});
```

---

## 🧪 Test Framework Improvements

### mock.clearAllMocks()

Clear all mocks at once - useful for test cleanup:

```typescript
import { mock, test, beforeEach } from "bun:test";

beforeEach(() => {
  mock.clearAllMocks(); // Clear all mocks before each test
});

test("test 1", () => {
  const fn = mock(() => 42);
  fn();
  expect(fn).toHaveBeenCalledTimes(1);
});

test("test 2", () => {
  // Mock is already cleared from beforeEach
  const fn = mock(() => 100);
  fn();
  expect(fn).toHaveBeenCalledTimes(1);
});
```

### Coverage Filtering

Use `test.coveragePathIgnorePatterns` to exclude paths from coverage:

**In `bunfig.toml`**:
```toml
[test]
coveragePathIgnorePatterns = [
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/node_modules/**",
  "**/dist/**",
  "**/coverage/**",
]
```

**Programmatically**:
```typescript
// Exclude test files and node_modules from coverage
Bun.test.coveragePathIgnorePatterns = [
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/node_modules/**",
];
```

### Variable Substitution in test.each Titles

Use `$variable` and `$object.property` in `test.each` titles:

```typescript
test.each([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
])("User $name is $age years old", ({ name, age }) => {
  expect(name).toBeDefined();
  expect(age).toBeGreaterThan(0);
});

// Output:
// ✓ User Alice is 30 years old
// ✓ User Bob is 25 years old
```

**Nested property access**:
```typescript
test.each([
  { user: { name: "Alice", profile: { role: "admin" } } },
  { user: { name: "Bob", profile: { role: "user" } } },
])("User $user.name has role $user.profile.role", ({ user }) => {
  expect(user.name).toBeDefined();
  expect(user.profile.role).toBeDefined();
});
```

### Improved Diffs

Better visualization with **whitespace highlighting**:

```typescript
test("string diff", () => {
  expect("Hello   World").toBe("Hello World");
  // Highlights whitespace differences
});

test("object diff", () => {
  expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 3 });
  // Shows: b: 2 → b: 3
});
```

---

## 🚨 Stricter CI Mode

### Overview

Stricter CI mode helps catch common mistakes and ensures test reliability:

- **Errors on `test.only()`** - Prevents accidentally committing focused tests
- **Errors on new snapshots** without `--update-snapshots` - Prevents accidental snapshot creation

### Enabling CI Mode

**Environment variable**:
```bash
CI=true bun test
```

**In `bunfig.toml`**:
```toml
[test]
ci = true  # Enable strict CI mode
```

### CI Mode Behavior

```typescript
// ❌ Error in CI mode: test.only() is not allowed
test.only("focused test", () => {
  expect(true).toBe(true);
});

// ❌ Error in CI mode: New snapshot without --update-snapshots
test("new snapshot", () => {
  expect({ new: "data" }).toMatchSnapshot();
  // Error: New snapshot detected. Run with --update-snapshots to create it.
});
```

### CI Mode Best Practices

```bash
# ✅ CI/CD pipeline
CI=true bun test

# ✅ Local development (allows test.only and new snapshots)
bun test

# ✅ Update snapshots explicitly
bun test --update-snapshots
```

---

## 🤖 Compact AI Output

### Overview

Compact AI output provides **condensed output** optimized for AI coding assistants, making it easier to parse test results programmatically.

### Enabling Compact Mode

```bash
# Enable compact output
bun test --compact

# Or via environment variable
BUN_TEST_COMPACT=1 bun test
```

### Compact Output Format

Compact mode provides:
- **Minimal output** - Only essential information
- **Structured format** - Easy to parse programmatically
- **Summary statistics** - Pass/fail counts, duration

**Example output**:
```text
✓ 42 tests passed (1.2s)
✗ 2 tests failed
  - test/api.test.ts:15
  - test/utils.test.ts:8
```

### Use Cases

✅ **Use compact mode when**:
- Running tests in CI/CD pipelines
- Parsing test results programmatically
- Integrating with AI coding assistants
- Generating test reports

---

## 📦 FormData Boundary Changes

### Overview

FormData boundary in `fetch` `Content-Type` header **no longer includes quotes**, matching Node.js behavior.

### Before (with quotes)

```typescript
const formData = new FormData();
formData.append("name", "Bun");

const response = await fetch("https://api.example.com", {
  method: "POST",
  body: formData,
});

// Content-Type: multipart/form-data; boundary="----WebKitFormBoundary..."
```

### After (no quotes, matches Node.js)

```typescript
const formData = new FormData();
formData.append("name", "Bun");

const response = await fetch("https://api.example.com", {
  method: "POST",
  body: formData,
});

// Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

### Impact

This change ensures **compatibility with Node.js** and most HTTP servers that expect unquoted boundaries.

**No code changes needed** - Bun handles this automatically!

---

## 📋 Complete Example

### Example: Using All New Features

```typescript
import { test, describe, beforeEach, mock, expect } from "bun:test";

// Register custom file loader
require.extensions[".txt"] = (module, filename) => {
  const content = require("fs").readFileSync(filename, "utf8");
  module.exports = content;
};

describe("Test Suite", () => {
  beforeEach(() => {
    mock.clearAllMocks(); // Clear all mocks
  });

  test.each([
    { input: "hello", expected: "HELLO" },
    { input: "world", expected: "WORLD" },
  ])("Uppercase $input should be $expected", ({ input, expected }) => {
    expect(input.toUpperCase()).toBe(expected);
  });

  test("snapshot with auto-indentation", () => {
    const data = {
      name: "Bun",
      version: "1.3",
      features: ["fast", "native"],
    };
    expect(data).toMatchInlineSnapshot(`
      {
        "name": "Bun",
        "version": "1.3",
        "features": [
          "fast",
          "native"
        ]
      }
    `);
  });

  test("custom file loader", () => {
    const text = require("./fixtures/example.txt");
    expect(text).toContain("example");
  });
});
```

---

## 🔗 Related Documentation

- [Bun Test Documentation](https://bun.com/docs/test) - Official test framework docs
- [Bun 1.3.3 Summary](./BUN-1.3.3-SUMMARY.md) - Bun 1.3.3 features
- [Test Organization](../TEST_ORGANIZATION.md) - Test structure and organization
- [bunfig.toml](../config/bunfig.toml) - Test configuration

---

## ✅ Summary

**Bun 1.3 Test & Compatibility Improvements**:

1. ✅ **require.extensions** - Custom file loaders for Node.js compatibility
2. ✅ **Automatic snapshot indentation** - Better readability and maintenance
3. ✅ **Improved diffs** - Whitespace highlighting for easier debugging
4. ✅ **mock.clearAllMocks()** - Clear all mocks at once
5. ✅ **Coverage filtering** - Exclude paths from coverage reports
6. ✅ **Variable substitution** - `$variable` and `$object.property` in test titles
7. ✅ **Stricter CI mode** - Errors on `test.only()` and new snapshots
8. ✅ **Compact AI output** - Condensed output for coding assistants
9. ✅ **FormData boundary** - No quotes (matches Node.js)

**Key Takeaway**: Bun 1.3 significantly improves test framework capabilities and Node.js compatibility, making it easier to migrate Node.js packages and write better tests!

---

**Last Updated**: 2025-01-XX  
**Bun Version**: 1.3+