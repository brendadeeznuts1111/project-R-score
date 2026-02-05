# [BUN.SHELL.INTEGRATION.RG] Bun Shell Integration

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-SHELL@0.1.0;instance-id=BUN-SHELL-001;version=0.1.0}][PROPERTIES:{shell={value:"bun-shell-integration";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-CROSS-PLATFORM"];@version:"0.1.0"}}][CLASS:BunShellIntegration][#REF:v-0.1.0.BP.BUN.SHELL.1.0.A.1.1.DEV.1.1]]`

## 1. Overview

Integration of Bun Shell (`$`) for cross-platform shell scripting and improved tool capabilities.

**Code Reference**: `#REF:v-0.1.0.BP.BUN.SHELL.1.0.A.1.1.DEV.1.1`

---

## 2. [SHELL.FEATURES.RG] Bun Shell Features

### 2.1. [FEATURES.CROSS_PLATFORM.RG] Cross-Platform
- Works on Windows, Linux & macOS
- No need for `rimraf` or `cross-env`
- Native implementation of common commands

### 2.2. [FEATURES.SAFETY.RG] Safety
- Escapes all strings by default
- Prevents shell injection attacks
- Secure by design

### 2.3. [FEATURES.JS_INTEROP.RG] JavaScript Interop
- Use `Response`, `Buffer`, `Blob` as stdin/stdout
- Use `Bun.file()` for file redirection
- Seamless JavaScript integration

### 2.4. [FEATURES.BUILTINS.RG] Builtin Commands
- `cd`, `ls`, `rm`, `echo`, `pwd`
- `cat`, `touch`, `mkdir`, `which`, `mv`
- `bun`, `exit`, `true`, `false`, `yes`, `seq`

---

## 3. [INTEGRATION.TOOLS.RG] Tool Integration

### 3.1. [TOOLS.EVOLVE.RG] Pattern Evolution (`evolve.ts`)
**Updated**: Now uses Bun Shell for git commands

```typescript
import { $ } from "bun";

// Get git log
const log = await $`git log --all --oneline --pretty=format:"%h %ad %s" --date=short`.text();

// Get commit content
const content = await $`git show ${hash} --stat`.nothrow().text();
```

**Benefits**:
- Cross-platform git operations
- Safe string interpolation
- Error handling with `.nothrow()`

### 3.2. [TOOLS.DEPLOY.RG] Production Deployment (`deploy-prod.ts`)
**New**: TypeScript deployment script using Bun Shell

```typescript
import { $ } from "bun";

// Pre-flight checks
const bunVersion = await $`bun --version`.text();
await $`bun run typecheck`.quiet();
await $`bun test`.quiet();

// Health check
const result = await $`curl -sf ${url}`.nothrow().quiet();
```

**Benefits**:
- Cross-platform deployment
- Better error handling
- TypeScript support

### 3.3. [TOOLS.SHELL_UTILS.RG] Shell Utilities (`shell-utils.ts`)
**New**: Utility functions using Bun Shell

```typescript
import { ShellUtils } from "./shell-utils";

// Git operations
const branch = await ShellUtils.getCurrentBranch();
const hash = await ShellUtils.getCommitHash(true);

// File operations
const count = await ShellUtils.countFiles("*.ts", "./src");

// Run with timeout
const result = await ShellUtils.runWithTimeout("long-running-command", 5000);
```

---

## 4. [SHELL.EXAMPLES.RG] Usage Examples

### 4.1. [EXAMPLES.BASIC.RG] Basic Commands
```typescript
import { $ } from "bun";

// Simple command
await $`echo "Hello World!"`;

// Get output as text
const output = await $`echo "Hello"`.text();

// Quiet mode
await $`echo "Hello"`.quiet();
```

### 4.2. [EXAMPLES.REDIRECTION.RG] Redirection
```typescript
import { $ } from "bun";

// Redirect to file
await $`echo "Hello" > greeting.txt`;

// Redirect from Response
const response = await fetch("https://example.com");
await $`cat < ${response} | wc -c`;

// Redirect to Buffer
const buffer = Buffer.alloc(100);
await $`echo "Hello" > ${buffer}`;
```

### 4.3. [EXAMPLES.PIPING.RG] Piping
```typescript
import { $ } from "bun";

// Pipe commands
const result = await $`echo "Hello World!" | wc -w`.text();

// Pipe with JavaScript objects
const response = new Response("hello world");
const result = await $`cat < ${response} | wc -w`.text();
```

### 4.4. [EXAMPLES.ENV.RG] Environment Variables
```typescript
import { $ } from "bun";

// Set environment variable
await $`FOO=bar bun -e 'console.log(process.env.FOO)'`;

// Use .env() method
await $`echo $FOO`.env({ FOO: "bar" });

// Global environment
$.env({ FOO: "bar" });
await $`echo $FOO`; // bar
```

### 4.5. [EXAMPLES.ERROR_HANDLING.RG] Error Handling
```typescript
import { $ } from "bun";

// Default: throws on non-zero exit
try {
  await $`command-that-fails`;
} catch (err) {
  console.log(`Failed with code ${err.exitCode}`);
}

// Disable throwing
const { exitCode, stdout, stderr } = await $`command`.nothrow().quiet();
if (exitCode !== 0) {
  console.log("Command failed");
}
```

---

## 5. [SHELL.SECURITY.RG] Security Features

### 5.1. [SECURITY.INJECTION.RG] Command Injection Prevention
```typescript
import { $ } from "bun";

const userInput = "my-file.txt; rm -rf /";

// SAFE: userInput is treated as single quoted string
await $`ls ${userInput}`;
// Tries to list file named "my-file.txt; rm -rf /"
// Does NOT execute rm -rf /
```

### 5.2. [SECURITY.ESCAPING.RG] Automatic Escaping
- All interpolated variables are escaped
- Prevents shell injection attacks
- Safe by default

### 5.3. [SECURITY.CONSIDERATIONS.RG] Security Considerations
- Don't use `bash -c` with user input
- Validate arguments before passing to external commands
- Be aware of argument injection risks

---

## 6. [INTEGRATION.STATUS.RG] Integration Status

### 6.1. [STATUS.COMPLETED.RG] Completed
- ✅ `evolve.ts` - Uses Bun Shell for git commands
- ✅ `deploy-prod.ts` - New TypeScript deployment script
- ✅ `shell-utils.ts` - Utility functions

### 6.2. [STATUS.POTENTIAL.RG] Potential Improvements
- Update `deploy-prod.sh` to use Bun Shell
- Add Bun Shell to other scripts that use shell commands
- Create more utility functions

---

## 7. Status

**Status**: ✅ Bun Shell integrated

**Components**:
- ✅ Pattern evolution uses Bun Shell
- ✅ Production deployment script (TypeScript)
- ✅ Shell utilities module

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
