# [BUN.SHELL.ERROR.HANDLING.RG] Bun Shell Error Handling Guide

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-SHELL-ERRORS@0.1.0;instance-id=BUN-SHELL-ERRORS-001;version=0.1.0}][PROPERTIES:{error-handling={value:"bun-shell-errors";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-ERROR-HANDLING"];@version:"0.1.0"}}][CLASS:BunShellErrorHandling][#REF:v-0.1.0.BP.BUN.SHELL.ERRORS.1.0.A.1.1.DEV.1.1]]`

## 1. Overview

Guide for error handling in Bun Shell following official documentation best practices.

**Code Reference**: `#REF:v-0.1.0.BP.BUN.SHELL.ERRORS.1.0.A.1.1.DEV.1.1`

---

## 2. [ERRORS.DEFAULT.RG] Default Behavior

### 2.1. [DEFAULT.THROWS.RG] Throws on Non-Zero Exit
By default, Bun Shell throws a `ShellError` on non-zero exit codes.

```typescript
import { $ } from "bun";

try {
  const output = await $`command-that-may-fail`.text();
  console.log(output);
} catch (err: any) {
  console.log(`Failed with code ${err.exitCode}`);
  console.log(err.stdout.toString());
  console.log(err.stderr.toString());
}
```

**ShellError Properties**:
- `exitCode`: Exit code of the command
- `stdout`: Buffer containing stdout
- `stderr`: Buffer containing stderr
- `message`: Error message

---

## 3. [ERRORS.NOTHROW.RG] Disable Throwing

### 3.1. [NOTHROW.METHOD.RG] Using .nothrow()
Disable throwing for a single command and check `exitCode` manually.

```typescript
import { $ } from "bun";

const { stdout, stderr, exitCode } = await $`command-that-may-fail`.nothrow().quiet();

if (exitCode !== 0) {
  console.log(`Non-zero exit code ${exitCode}`);
  console.log(stderr.toString());
}

console.log(stdout.toString());
```

### 3.2. [NOTHROW.GLOBAL.RG] Global Configuration
Disable throwing globally for all commands.

```typescript
import { $ } from "bun";

// Disable throwing globally
$.throws(false); // or $.nothrow()

// Now commands won't throw
await $`command-that-fails`; // No exception thrown

// Re-enable throwing
$.throws(true);

// Commands will throw again
try {
  await $`command-that-fails`;
} catch (err) {
  // Handle error
}
```

---

## 4. [ERRORS.EXAMPLES.RG] Error Handling Examples

### 4.1. [EXAMPLES.TRY_CATCH.RG] Try/Catch Pattern
```typescript
import { $ } from "bun";

try {
  await $`bun run typecheck`.quiet();
  console.log("✅ TypeScript compilation passed");
} catch (err: any) {
  console.error(`❌ TypeScript errors: exitCode=${err.exitCode}`);
  console.error(err.stderr?.toString() || err.stdout?.toString() || err.message);
  process.exit(1);
}
```

### 4.2. [EXAMPLES.MANUAL_CHECK.RG] Manual Exit Code Check
```typescript
import { $ } from "bun";

const result = await $`curl -sf ${url}`.nothrow().quiet();

if (result.exitCode === 0) {
  console.log("✅ Service healthy");
} else {
  console.log(`❌ Health check failed: exitCode=${result.exitCode}`);
  console.log(result.stderr.toString());
}
```

### 4.3. [EXAMPLES.HEALTH_CHECK.RG] Health Check Pattern
```typescript
import { $ } from "bun";

async function checkHealth(url: string, maxAttempts: number = 30): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await $`curl -sf ${url}`.nothrow().quiet();
    if (result.exitCode === 0) {
      return true;
    }
    await Bun.sleep(1000);
  }
  return false;
}
```

---

## 5. [ERRORS.BEST_PRACTICES.RG] Best Practices

### 5.1. [PRACTICES.USE_TRY_CATCH.RG] Use Try/Catch for Critical Commands
- Use try/catch when failure should stop execution
- Log exitCode, stdout, and stderr for debugging
- Provide meaningful error messages

### 5.2. [PRACTICES.USE_NOTHROW.RG] Use .nothrow() for Optional Commands
- Use `.nothrow()` when failure is acceptable
- Always check `exitCode` manually
- Handle both stdout and stderr

### 5.3. [PRACTICES.ERROR_INFO.RG] Include Error Information
```typescript
catch (err: any) {
  console.error(`Command failed: exitCode=${err.exitCode}`);
  if (err.stdout.length > 0) {
    console.error(`stdout: ${err.stdout.toString()}`);
  }
  if (err.stderr.length > 0) {
    console.error(`stderr: ${err.stderr.toString()}`);
  }
}
```

---

## 6. [ERRORS.INTEGRATION.RG] Integration in Tools

### 6.1. [INTEGRATION.DEPLOY.RG] Deployment Script
Updated `deploy-prod.ts` to use proper error handling:

```typescript
try {
  await $`bun run typecheck`.quiet();
  console.log("✅ TypeScript compilation passed");
} catch (err: any) {
  console.error(`❌ TypeScript errors: exitCode=${err.exitCode}`);
  console.error(err.stderr?.toString() || err.stdout?.toString() || err.message);
  process.exit(1);
}
```

### 6.2. [INTEGRATION.EVOLVE.RG] Pattern Evolution
Uses `.nothrow()` for git commands that may fail:

```typescript
const content = await $`git show ${hash} --stat`.nothrow().text();
if (!content) {
  return ""; // Handle gracefully
}
```

---

## 7. Status

**Status**: ✅ Error handling implemented following documentation

**Components**:
- ✅ Try/catch for critical commands
- ✅ .nothrow() for optional commands
- ✅ Proper error information logging
- ✅ Health check patterns

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
