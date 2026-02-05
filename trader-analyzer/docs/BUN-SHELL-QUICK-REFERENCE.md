# Bun.Shell Quick Reference Card

**One-page reference for common Bun.Shell patterns**

## Import

```typescript
import { $ } from "bun";
```

## Basic Usage

```typescript
// Execute command
await $`command`;

// Get output as string
const text = await $`command`.text();

// Suppress output
await $`command`.quiet();

// Don't throw on error
const result = await $`command`.nothrow();
```

## Output Reading

```typescript
.text()      // String
.json()      // Parsed JSON
.lines()     // Async iterator
.blob()      // Blob object
.arrayBuffer() // ArrayBuffer
```

## Environment Variables

```typescript
// Inline
await $`VAR=value command`;

// Per command
await $`command`.env({ VAR: "value" });

// Merge with process.env
await $`command`.env({ ...process.env, VAR: "value" });

// Global
$.env({ VAR: "value" });
await $`command`; // Uses global
$.env(undefined); // Reset
```

## Working Directory

```typescript
// Per command
await $`command`.cwd("/path");

// Global
$.cwd("/path");
await $`command`; // Uses global
$.cwd(undefined); // Reset
```

## Redirection

```typescript
// To Buffer
const buffer = Buffer.alloc(100);
await $`echo "text" > ${buffer}`;

// From Response
const response = new Response("data");
await $`cat < ${response}`;

// To file
await $`echo "text" > file.txt`;

// From file
await $`cat < file.txt`;
```

## Piping

```typescript
// Basic
await $`cmd1 | cmd2`;

// With JavaScript objects
const response = new Response("data");
await $`cat < ${response} | wc -c`;
```

## Command Substitution

```typescript
// ✅ CORRECT: Use $(...)
await $`echo Hash: $(git rev-parse HEAD)`;

// ❌ WRONG: Backticks don't work
await $`echo \`git rev-parse HEAD\``; // Prints literal
```

## Common Patterns

### Git Operations

```typescript
// Commit hash
const hash = await $`git rev-parse HEAD`.text();

// Branch name
const branch = await $`git rev-parse --abbrev-ref HEAD`.text();

// Remote URL
const remote = await $`git config --get remote.origin.url`.text().catch(() => null);

// Check if clean
const isClean = (await $`git status --porcelain`.text()).trim() === "";
```

### File Operations

```typescript
// Count files
const count = await $`find ${dir} -name "*.ts" | wc -l`.text();

// File exists
const exists = (await $`test -f ${path}`.nothrow()).exitCode === 0;

// Read file
const content = await $`cat ${file}`.text();
```

### Process Management

```typescript
// Check if running
const running = (await $`pgrep -f ${name}`.nothrow()).exitCode === 0;

// Get process info
const info = await $`ps -p ${pid}`.text();
```

## Error Handling

```typescript
// Try-catch
try {
  await $`command`;
} catch (error) {
  // Handle error
}

// Nothrow
const { exitCode, stdout, stderr } = await $`command`.nothrow().quiet();
if (exitCode !== 0) {
  // Handle error
}
```

## Utilities

```typescript
// Brace expansion
const expanded = $.braces("echo {1,2,3}");
// => ["echo 1", "echo 2", "echo 3"]

// Escape strings
const escaped = $.escape('$(foo) `bar` "baz"');
```

## Security Notes

✅ **Safe:**
- Bun.Shell auto-escapes arguments
- Use `.env()` for environment variables
- Use `.cwd()` for working directory

❌ **Unsafe:**
- Don't spawn external shell (`bash -c`)
- Don't use malicious flags
- Don't bypass Bun's protections

---

**Full Documentation:** `src/runtime/bun-native-utils-complete.ts`  
**Examples:** `examples/demos/demo-bun-shell-env-redirect-pipe.ts`  
**Usage Guide:** `docs/BUN-SHELL-USAGE-GUIDE.md`
