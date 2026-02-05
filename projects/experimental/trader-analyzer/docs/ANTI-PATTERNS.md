# Anti-Patterns Guide

**Last Updated**: 2025-01-16  
**Purpose**: Common anti-patterns to avoid and how to fix them

> **Status**: ✅ Actively maintained - All examples follow these patterns  
> **See Also**: [Naming Conventions](./NAMING-CONVENTIONS.md) for code style guidelines

---

## 🚫 Error Handling Anti-Patterns

### ❌ Anti-Pattern: `catch (error: any)`

**Problem**: Loses type safety and makes error handling unpredictable.

```typescript
// ❌ Bad
try {
	await someAsyncOperation();
} catch (error: any) {
	console.error(`Error: ${error.message}`);
}
```

**✅ Solution**: Use proper Error types

```typescript
// ✅ Good
try {
	await someAsyncOperation();
} catch (error: unknown) {
	if (error instanceof Error) {
		console.error(`Error: ${error.message}`);
	} else {
		console.error(`Unknown error: ${String(error)}`);
	}
}

// ✅ Better - Use error utilities
import { handleError } from "../utils/error-handler";

try {
	await someAsyncOperation();
} catch (error: unknown) {
	handleError(error, { context: "someAsyncOperation" });
}
```

---

## 🚫 Type Safety Anti-Patterns

### ❌ Anti-Pattern: Using `any` type

**Problem**: Defeats TypeScript's type checking.

```typescript
// ❌ Bad
function processData(data: any): any {
	return data.map((item: any) => item.value);
}
```

**✅ Solution**: Use proper types or `unknown`

```typescript
// ✅ Good
interface DataItem {
	value: string;
	id: number;
}

function processData(data: DataItem[]): string[] {
	return data.map((item) => item.value);
}

// ✅ Good - When type is truly unknown
function processUnknown(data: unknown): string {
	if (typeof data === "string") {
		return data;
	}
	throw new Error("Expected string");
}
```

### ❌ Anti-Pattern: `@ts-ignore` or `@ts-expect-error`

**Problem**: Suppresses type errors without fixing root cause.

```typescript
// ❌ Bad
// @ts-ignore
const result = someFunction();

// @ts-expect-error - Bun API not typed yet
const output = await proc.stdout.text();
```

**✅ Solution**: Fix types or use proper type assertions

```typescript
// ✅ Good - Proper type assertion
const result = someFunction() as ExpectedType;

// ✅ Good - Type guard
if (isExpectedType(result)) {
	// TypeScript knows result is ExpectedType here
}

// ✅ Good - Extend types properly
interface BunSpawnStdout {
	text(): Promise<string>;
}

const output = await (proc.stdout as BunSpawnStdout).text();
```

---

## 🚫 Logging Anti-Patterns

### ❌ Anti-Pattern: Direct `console.log` everywhere

**Problem**: No log levels, no structured logging, hard to filter.

```typescript
// ❌ Bad
console.log("Processing...");
console.log(`Result: ${result}`);
console.error("Error occurred");
```

**✅ Solution**: Use structured logging utilities

```typescript
// ✅ Good - Structured logging
import { logger } from "../utils/logger";

logger.info("Processing started", { operation: "dataProcessing" });
logger.debug("Result received", { result, timestamp: Date.now() });
logger.error("Error occurred", { error, context: "dataProcessing" });

// ✅ Good - Conditional logging
if (process.env.DEBUG === "1") {
	logger.debug("Detailed debug info", { data });
}
```

---

## 🚫 Magic Numbers/Strings Anti-Patterns

### ❌ Anti-Pattern: Hardcoded values

**Problem**: Hard to maintain, no single source of truth.

```typescript
// ❌ Bad
setTimeout(() => {
	process.exit(0);
}, 100);

if (status === "healthy") {
	// ...
}
```

**✅ Solution**: Use named constants

```typescript
// ✅ Good - Constants
const EXIT_DELAY_MS = 100;
const STATUS_HEALTHY = "healthy" as const;

setTimeout(() => {
	process.exit(0);
}, EXIT_DELAY_MS);

if (status === STATUS_HEALTHY) {
	// ...
}

// ✅ Better - Enums or const objects
enum Status {
	Healthy = "healthy",
	Degraded = "degraded",
	Offline = "offline",
}

const TIMEOUTS = {
	EXIT_DELAY_MS: 100,
	RETRY_DELAY_MS: 1000,
	CONNECTION_TIMEOUT_MS: 5000,
} as const;
```

---

## 🚫 Async/Await Anti-Patterns

### ❌ Anti-Pattern: Unhandled promise rejections

**Problem**: Crashes application silently.

```typescript
// ❌ Bad
async function main() {
	await someAsyncOperation();
}

main(); // No error handling
```

**✅ Solution**: Always handle errors

```typescript
// ✅ Good
async function main() {
	try {
		await someAsyncOperation();
	} catch (error: unknown) {
		logger.error("Main function failed", { error });
		process.exit(1);
	}
}

main().catch((error: unknown) => {
	logger.error("Unhandled error in main", { error });
	process.exit(1);
});

// ✅ Better - Use error handler wrapper
import { withErrorHandling } from "../utils/error-handler";

const main = withErrorHandling(async () => {
	await someAsyncOperation();
}, { exitOnError: true });

main();
```

### ❌ Anti-Pattern: Sequential awaits when parallel is possible

**Problem**: Unnecessary delays.

```typescript
// ❌ Bad
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();
```

**✅ Solution**: Use `Promise.all` for parallel operations

```typescript
// ✅ Good
const [user, posts, comments] = await Promise.all([
	fetchUser(),
	fetchPosts(),
	fetchComments(),
]);
```

---

## 🚫 Code Organization Anti-Patterns

### ❌ Anti-Pattern: Large functions doing multiple things

**Problem**: Hard to test, maintain, and understand.

```typescript
// ❌ Bad
async function setupMonorepo() {
	// 100+ lines doing multiple things
	for (const pkg of packages) {
		// register packages
	}
	for (const app of apps) {
		// link packages
	}
	// validate setup
	// create config files
	// etc.
}
```

**✅ Solution**: Break into smaller, focused functions

```typescript
// ✅ Good
async function setupMonorepo() {
	await registerPackages();
	await linkPackagesToApps();
	await validateSetup();
	await createConfigFiles();
}

async function registerPackages() {
	for (const pkg of PACKAGES) {
		await registerPackage(pkg);
	}
}

async function registerPackage(pkg: Package) {
	// Focused, testable function
}
```

---

## 🚫 String Concatenation Anti-Patterns

### ❌ Anti-Pattern: String concatenation for paths

**Problem**: Platform-specific issues, hard to read.

```typescript
// ❌ Bad
const pkgPath = MONOREPO_ROOT + "/packages/" + pkg.name;
const filePath = dir + "/" + filename;
```

**✅ Solution**: Use proper path utilities

```typescript
// ✅ Good
import { join } from "path";

const pkgPath = join(MONOREPO_ROOT, "packages", pkg.name);
const filePath = join(dir, filename);

// ✅ Better - Use Bun's path utilities
import { join } from "bun";

const pkgPath = join([MONOREPO_ROOT, "packages", pkg.name]);
```

---

## 🚫 Resource Management Anti-Patterns

### ❌ Anti-Pattern: Not cleaning up resources

**Problem**: Memory leaks, file handle leaks.

```typescript
// ❌ Bad
setInterval(() => {
	// Do something
}, 1000);

// Never cleared!
```

**✅ Solution**: Always clean up resources

```typescript
// ✅ Good
const intervalId = setInterval(() => {
	// Do something
}, 1000);

// Clean up on exit
process.on("SIGINT", () => {
	clearInterval(intervalId);
	process.exit(0);
});

// ✅ Better - Use AbortController for modern APIs
const controller = new AbortController();

setInterval(() => {
	if (controller.signal.aborted) return;
	// Do something
}, 1000);

process.on("SIGINT", () => {
	controller.abort();
	process.exit(0);
});
```

---

## 🚫 Validation Anti-Patterns

### ❌ Anti-Pattern: No input validation

**Problem**: Runtime errors, security issues.

```typescript
// ❌ Bad
function processEmail(email: string) {
	return email.split("@")[0];
}
```

**✅ Solution**: Validate inputs

```typescript
// ✅ Good
function processEmail(email: string): string {
	if (!email || typeof email !== "string") {
		throw new Error("Email must be a non-empty string");
	}
	
	const parts = email.split("@");
	if (parts.length !== 2) {
		throw new Error("Invalid email format");
	}
	
	return parts[0];
}

// ✅ Better - Use validation library
import { z } from "zod";

const EmailSchema = z.string().email();

function processEmail(email: unknown): string {
	const validated = EmailSchema.parse(email);
	return validated.split("@")[0];
}
```

---

### ❌ Anti-Pattern: Buffering large response bodies

**Problem**: Loads entire response into memory, causing high memory usage and slow time-to-first-byte.

```typescript
// ❌ Bad: Buffers entire 100MB+ response
const response = await fetch("https://api.example.com/large-dataset");
const data = await response.json(); // 100MB+ in memory
```

**✅ Solution**: Stream response bodies for large data

```typescript
// ✅ Good: Stream and process chunks as they arrive
const response = await fetch("https://api.example.com/large-dataset");

if (!response.body) {
  throw new Error("Response body is not streamable");
}

const decoder = new TextDecoder();
for await (const chunk of response.body) {
  const text = decoder.decode(chunk, { stream: true });
  // Process chunk immediately - constant memory usage
  processChunk(text);
}
```

**When to use streaming**:
- Responses >1MB
- Real-time data feeds
- File downloads
- Large JSON arrays or datasets

**When NOT to use streaming**:
- Small responses (<100KB)
- Responses that need full data before processing
- Simple API calls where `.json()` is sufficient

**See Also**: [Bun Fetch Streaming Responses](./BUN-FETCH-STREAMING-RESPONSES.md)

---

### ❌ Anti-Pattern: Not using timeouts for fetch requests

**Problem**: Requests can hang indefinitely, causing resource leaks, UI freezing, and unpredictable behavior.

```typescript
// ❌ Bad: No timeout - request can hang forever
const response = await fetch("https://api.example.com/data");
const data = await response.json();
```

**✅ Solution**: Always use timeouts for fetch requests

```typescript
// ✅ Good: Timeout prevents hanging requests
const response = await fetch("https://api.example.com/data", {
  signal: AbortSignal.timeout(5000), // 5 second timeout
});

const data = await response.json();
```

**When to use timeouts**:
- **All external API calls** (third-party services)
- **User-facing requests** (prevent UI freezing)
- **Batch operations** (prevent one slow request blocking others)
- **Production environments** (prevent resource exhaustion)
- **Streaming responses** (prevent indefinite waits)

**Recommended timeout values**:
- Health checks: 1-2 seconds
- User API calls: 5-10 seconds
- File uploads: 30-60 seconds
- Background jobs: 60-300 seconds

**See Also**: [Bun Fetch Timeouts](./BUN-FETCH-TIMEOUTS.md)

---

### ❌ Anti-Pattern: Hardcoding sensitive headers

**Problem**: Exposes API keys, tokens, and credentials in source code, creating security vulnerabilities.

```typescript
// ❌ Bad: Hardcoded API key in source code
const response = await fetch("https://api.example.com/data", {
  headers: {
    "X-API-Key": "sk_live_1234567890abcdef", // Exposed in git!
  },
});
```

**✅ Solution**: Use secure storage for sensitive headers

```typescript
// ✅ Good: Load from secure storage
const apiKey = await Bun.secrets.get({
  service: "com.example.api",
  name: "api-key",
});

const response = await fetch("https://api.example.com/data", {
  headers: {
    "X-API-Key": apiKey,
  },
});
```

**When to use secure storage**:
- **API keys and tokens** (always)
- **Authentication credentials** (always)
- **Private keys** (always)
- **Sensitive configuration** (always)

**See Also**: [Bun Fetch Custom Headers](./BUN-FETCH-CUSTOM-HEADERS.md) - Security best practices

---

## ✅ Quick Reference: Do's and Don'ts

| Anti-Pattern | ✅ Solution |
|--------------|-------------|
| `catch (error: any)` | `catch (error: unknown)` + type guard |
| `any` type | Proper types or `unknown` |
| `@ts-ignore` | Fix types or proper assertions |
| `console.log` everywhere | Structured logger |
| Magic numbers | Named constants |
| Unhandled promises | `.catch()` or try/catch |
| Sequential awaits | `Promise.all()` |
| Large functions | Small, focused functions |
| String path concat | `join()` utility |
| No cleanup | Cleanup handlers |
| No validation | Input validation |
| Buffering large responses | Stream response bodies |
| No timeout on fetch | `AbortSignal.timeout()` |
| Hardcoded API keys/tokens | `Bun.secrets` or environment variables |

---

## 📚 Related Documentation

- [Naming Conventions](./NAMING-CONVENTIONS.md)
- [Bun Fetch Streaming Responses](./BUN-FETCH-STREAMING-RESPONSES.md) - Stream large responses efficiently
- [Bun Fetch Timeouts](./BUN-FETCH-TIMEOUTS.md) - Always use timeouts for fetch requests
- [Bun Fetch Custom Headers](./BUN-FETCH-CUSTOM-HEADERS.md) - Proper header handling and security
- [Error Handling Guide](./ERROR-HANDLING.md) (if exists)
- [TypeScript Guidelines](./TYPESCRIPT-GUIDELINES.md) (if exists)

---

**Status**: ✅ Complete  
**Last Updated**: 2025-01-16
