# Bun.spawn() stdout/stderr Reading Guide

**Date:** 2025-01-07  
**Purpose:** Guide for reading stdout/stderr from Bun.spawn() processes

---

## 🎯 Native API: Direct `.text()` Method

**Bun provides native `.text()` method on stdout/stderr streams!**

```typescript
const proc = Bun.spawn(["bun", "--version"]);
const text = await proc.stdout.text();
console.log(text); // => "1.3.3\n"
```

**✅ Use This (Native):**
```typescript
// Bun provides native .text() method - works at runtime!
const proc = Bun.spawn(["bun", "--version"]);
const text = await proc.stdout.text();
console.log(text); // => "1.3.3\n"

// For TypeScript, use type assertion if needed:
const stdout = await (proc.stdout as any).text();
const stderr = await (proc.stderr as any).text();
```

**❌ Don't Use This (Unnecessary Wrapper):**
```typescript
const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
```

---

## 📋 Output Stream Types

**Official Documentation:** https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn

Configure the output stream by passing one of the following values to stdout/stderr:

| Value | Description | Default |
|-------|-------------|---------|
| `"pipe"` | **Default for stdout.** Pipe the output to a ReadableStream on the returned Subprocess object | **stdout** |
| `"inherit"` | **Default for stderr.** Inherit from the parent process | **stderr** |
| `"ignore"` | Discard the output | - |
| `Bun.file()` | Write to the specified file | - |
| `number` | Write to the file with the given file descriptor | - |

**Key Points:**
- By default, `stdout` and `stderr` are instances of `ReadableStream`
- Default for `stdout`: `"pipe"` (ReadableStream)
- Default for `stderr`: `"inherit"` (inherit from parent)
- When using `"pipe"`, you can call `.text()`, `.json()`, `.arrayBuffer()`, `.blob()`, `.lines()` directly

---

## 🎯 Reading Methods

### 1. `.text()` - Read as String (Native)

**Official Example:**
```typescript
const proc = Bun.spawn(["bun", "--version"]);
const text = await proc.stdout.text();
console.log(text); // => "1.3.3\n"
```

**With explicit pipe:**
```typescript
const proc = Bun.spawn(["echo", "Hello World"], {
  stdout: "pipe", // Explicit (default for stdout)
});

const text = await proc.stdout.text();
console.log(text); // "Hello World\n"
```

**Note:** `stdout` defaults to `"pipe"`, so you can omit it:
```typescript
const proc = Bun.spawn(["bun", "--version"]);
const text = await proc.stdout.text(); // Works without explicit stdout: "pipe"
```

**Why Native is Better:**
- ✅ Simpler API
- ✅ No wrapper needed
- ✅ Direct stream reading
- ✅ Better performance (no Response overhead)

### 2. `.json()` - Parse as JSON

```typescript
const proc = Bun.spawn(["echo", '{"foo": "bar"}'], {
  stdout: "pipe",
});

const json = await proc.stdout.json();
console.log(json); // { foo: "bar" }
```

### 3. `.arrayBuffer()` - Read as ArrayBuffer

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "pipe",
});

const buffer = await proc.stdout.arrayBuffer();
console.log(new Uint8Array(buffer)); // Uint8Array([72, 101, 108, 108, 111])
```

### 4. `.blob()` - Read as Blob

```typescript
const proc = Bun.spawn(["echo", "Hello"], {
  stdout: "pipe",
});

const blob = await proc.stdout.blob();
console.log(blob.size); // 6 (including newline)
```

### 5. `.lines()` - Read Line by Line

```typescript
const proc = Bun.spawn(["echo", "-e", "line1\nline2\nline3"], {
  stdout: "pipe",
});

for await (const line of proc.stdout.lines()) {
  console.log(line); // "line1", "line2", "line3"
}
```

---

## 🔧 Current Codebase Usage

### ❌ Old Pattern (Unnecessary)

**Found in:**
- `src/api/routes.ts` (lines 5247, 5403)
- `src/utils/bun.ts` (line 1139)
- `src/security/secure-deployer.ts` (multiple)
- `test/harness.ts` (line 197)

```typescript
// ❌ OLD PATTERN - Unnecessary wrapper
const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
```

### ✅ New Pattern (Native)

```typescript
// ✅ NATIVE PATTERN - Direct method
const stdout = await proc.stdout.text();
const stderr = await proc.stderr.text();
```

---

## 🔄 Migration Guide

### Before (Old Pattern)

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
});

const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
```

### After (Native Pattern)

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
});

const stdout = await proc.stdout.text();
const stderr = await proc.stderr.text();
```

---

## 📝 Complete Examples

### Basic Reading

**Official Example (defaults work):**
```typescript
const proc = Bun.spawn(["bun", "--version"]);
const text = await proc.stdout.text();
console.log(text); // => "1.3.3\n"
```

**With explicit pipe:**
```typescript
const proc = Bun.spawn(["bun", "--version"], {
  stdout: "pipe", // Explicit (default for stdout)
});

const version = await proc.stdout.text();
console.log(version.trim()); // "1.3.3"
```

### Reading Both Streams

```typescript
const proc = Bun.spawn(["sh", "-c", "echo 'stdout'; echo 'stderr' >&2"], {
  stdout: "pipe",
  stderr: "pipe",
});

const [stdout, stderr] = await Promise.all([
  proc.stdout.text(),
  proc.stderr.text(),
]);

console.log("Stdout:", stdout.trim());
console.log("Stderr:", stderr.trim());
```

### With Error Handling

```typescript
const proc = Bun.spawn(["command"], {
  stdout: "pipe",
  stderr: "pipe",
});

try {
  const [stdout, stderr, exitCode] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text(),
    proc.exited,
  ]);
  
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${stderr}`);
  }
  
  return stdout;
} catch (error) {
  // Handle error
  throw error;
}
```

### Reading JSON Output

```typescript
const proc = Bun.spawn(["echo", '{"status": "ok"}'], {
  stdout: "pipe",
});

const data = await proc.stdout.json();
console.log(data.status); // "ok"
```

### Reading Line by Line

```typescript
const proc = Bun.spawn(["cat", "large-file.txt"], {
  stdout: "pipe",
});

for await (const line of proc.stdout.lines()) {
  processLine(line);
}
```

---

## 🎯 Why Native `.text()` is Better

### Performance

**Native:**
```typescript
const text = await proc.stdout.text(); // Direct stream reading
```

**Wrapper:**
```typescript
const text = await new Response(proc.stdout).text(); // Extra Response object overhead
```

### Simplicity

**Native:** One method call  
**Wrapper:** Two objects (Response + stream)

### Type Safety

**Native:** Direct stream type  
**Wrapper:** Response type wrapper

---

## 📋 Files to Update

### High Priority

1. **`src/api/routes.ts`** (lines 5247, 5403)
   ```typescript
   // Change from:
   const stdout = await new Response(result.stdout).text();
   // To:
   const stdout = await result.stdout.text();
   ```

2. **`src/utils/bun.ts`** (line 1139)
   ```typescript
   // Change from:
   proc.stdout ? new Response(proc.stdout).text() : Promise.resolve(""),
   // To:
   proc.stdout ? proc.stdout.text() : Promise.resolve(""),
   ```

3. **`test/harness.ts`** (line 197)
   ```typescript
   // Change from:
   new Response(proc.stdout).text(),
   // To:
   proc.stdout.text(),
   ```

### Medium Priority

4. **`src/security/secure-deployer.ts`** (multiple lines)
5. **`scripts/shell-utils.ts`** (line 93)

---

## 🔍 Type Information

### ReadableStream from Bun.spawn()

```typescript
// When stdout: "pipe"
proc.stdout: ReadableStream<Uint8Array> | number | undefined

// ReadableStream has these methods:
interface ReadableStream {
  text(): Promise<string>;
  json(): Promise<any>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  lines(): AsyncIterableIterator<string>;
}
```

### Why Response Wrapper Was Used

**Historical Reason:** Older Bun versions or TypeScript types might have required Response wrapper.  
**Current Status:** Native `.text()` works directly on ReadableStream.

---

## ✅ Verification

Test that native `.text()` works:

```typescript
const proc = Bun.spawn(["echo", "test"], {
  stdout: "pipe",
});

// ✅ This works natively
const text = await proc.stdout.text();
console.log(text); // "test\n"

// ❌ This is unnecessary
const text2 = await new Response(proc.stdout).text();
console.log(text2); // Same result, but with extra overhead
```

---

## 📚 References

- **Official Docs:** https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn
- **Current Usage:** See files listed above
- **Migration:** Update all `new Response(proc.stdout).text()` to `proc.stdout.text()`

---

## 🎯 Action Items

1. ✅ Update `src/api/routes.ts` - Remove Response wrappers
2. ✅ Update `src/utils/bun.ts` - Use native `.text()`
3. ✅ Update `test/harness.ts` - Use native `.text()`
4. ✅ Update `src/security/secure-deployer.ts` - Use native `.text()`
5. ✅ Update `scripts/shell-utils.ts` - Use native `.text()`
6. ✅ Update documentation examples

---

**Last Updated:** 2025-01-07  
**Note:** Bun provides native `.text()` method - no Response wrapper needed!
