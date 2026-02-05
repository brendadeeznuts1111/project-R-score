# [BUN.SHELL.COMPLETE.GUIDE.RG] Bun Shell Complete Guide

**Metadata**: `[[TECH][MODULE][INSTANCE][META:{blueprint=BP-BUN-SHELL-GUIDE@0.1.0;instance-id=BUN-SHELL-GUIDE-001;version=0.1.0}][PROPERTIES:{guide={value:"bun-shell-complete";@root:"ROOT-DEV";@chain:["BP-BUN-SHELL","BP-DOCUMENTATION"];@version:"0.1.0"}}][CLASS:BunShellGuide][#REF:v-0.1.0.BP.BUN.SHELL.GUIDE.1.0.A.1.1.DEV.1.1]]`

## 1. Overview

Complete guide to Bun Shell features, capabilities, and best practices.

**Code Reference**: `#REF:v-0.1.0.BP.BUN.SHELL.GUIDE.1.0.A.1.1.DEV.1.1`

---

## 2. [SHELL.FEATURES.RG] Features

### 2.1. [FEATURES.CROSS_PLATFORM.RG] Cross-Platform
- **Windows, Linux & macOS**: Works on all platforms
- **No Dependencies**: No need for `rimraf` or `cross-env`
- **Native Commands**: `ls`, `cd`, `rm`, `echo`, `pwd` implemented natively

### 2.2. [FEATURES.FAMILIAR.RG] Familiar Bash-Like Syntax
- **Redirection**: `<`, `>`, `>>`, `2>`, `&>`
- **Pipes**: `|` for command chaining
- **Environment Variables**: `$VAR` syntax
- **Command Substitution**: `$(command)` syntax

### 2.3. [FEATURES.GLOBS.RG] Glob Patterns
- **Wildcards**: `*`, `**` for recursive
- **Brace Expansion**: `{a,b,c}` expansion
- **Native Support**: Built into Bun Shell

### 2.4. [FEATURES.TEMPLATE_LITERALS.RG] Template Literals
- **Interpolation**: Easy variable interpolation
- **Expression Support**: JavaScript expressions
- **Safe Escaping**: Automatic string escaping

### 2.5. [FEATURES.SAFETY.RG] Safety
- **Automatic Escaping**: All strings escaped by default
- **Shell Injection Prevention**: Protected against attacks
- **Secure by Design**: No system shell invocation

### 2.6. [FEATURES.JS_INTEROP.RG] JavaScript Interop
- **Response**: Use `fetch()` Response as stdin
- **ArrayBuffer**: Use ArrayBuffer for binary data
- **Blob**: Use Blob objects
- **Bun.file()**: Use Bun file objects
- **Buffer**: Use Node.js Buffer objects

### 2.7. [FEATURES.SHELL_SCRIPTING.RG] Shell Scripting
- **.bun.sh Files**: Run shell scripts directly
- **Cross-Platform**: Scripts work on all platforms
- **No /bin/sh**: Native implementation

### 2.8. [FEATURES.CUSTOM_INTERPRETER.RG] Custom Interpreter
- **Written in Zig**: High performance
- **Lexer, Parser, Interpreter**: Complete language implementation
- **Small Language**: Bun Shell is a programming language

---

## 3. [SHELL.EXAMPLES.RG] Complete Examples

### 3.1. [EXAMPLES.BASIC.RG] Basic Commands
```typescript
import { $ } from "bun";

// Simple echo
await $`echo "Hello World!"`;

// Get output as text
const output = await $`echo "Hello"`.text();

// Quiet mode
await $`echo "Hello"`.quiet();
```

### 3.2. [EXAMPLES.REDIRECTION.RG] Redirection
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

// Redirect stderr
await $`command 2> errors.txt`;

// Redirect stderr to stdout
await $`command 2>&1`;
```

### 3.3. [EXAMPLES.PIPING.RG] Piping
```typescript
import { $ } from "bun";

// Pipe commands
const result = await $`echo "Hello World!" | wc -w`.text();

// Pipe with Response
const response = new Response("hello world");
const result = await $`cat < ${response} | wc -w`.text();
```

### 3.4. [EXAMPLES.GLOBS.RG] Glob Patterns
```typescript
import { $ } from "bun";

// Use globs in commands
await $`ls src/**/*.ts`;

// Brace expansion
const expanded = $.braces(`echo {1,2,3}`);
// => ["echo 1", "echo 2", "echo 3"]
```

### 3.5. [EXAMPLES.ENV.RG] Environment Variables
```typescript
import { $ } from "bun";

// Set environment variable
await $`FOO=bar bun -e 'console.log(process.env.FOO)'`;

// Use .env() method
await $`echo $FOO`.env({ FOO: "bar" });

// Global environment
$.env({ FOO: "bar" });
await $`echo $FOO`;
```

### 3.6. [EXAMPLES.ERROR_HANDLING.RG] Error Handling
```typescript
import { $ } from "bun";

// Default: throws on error
try {
  await $`command-that-fails`;
} catch (err: any) {
  console.log(`exitCode: ${err.exitCode}`);
  console.log(`stdout: ${err.stdout.toString()}`);
  console.log(`stderr: ${err.stderr.toString()}`);
}

// Disable throwing
const { exitCode, stdout, stderr } = await $`command`.nothrow().quiet();
if (exitCode !== 0) {
  console.log("Command failed");
}
```

### 3.7. [EXAMPLES.OUTPUT.RG] Reading Output
```typescript
import { $ } from "bun";

// As text
const text = await $`echo "Hello"`.text();

// As JSON
const json = await $`echo '{"foo":"bar"}'`.json();

// Line by line
for await (const line of $`echo -e "line1\nline2"`.lines()) {
  console.log(line);
}

// As Blob
const blob = await $`echo "Hello"`.blob();

// As Buffers (default)
const { stdout, stderr } = await $`echo "Hello!"`.quiet();
```

### 3.8. [EXAMPLES.BUILTINS.RG] Builtin Commands
```typescript
import { $ } from "bun";

// cd
await $`cd /tmp && pwd`;

// ls
await $`ls -la src/`;

// rm
await $`rm file.txt`;

// echo
await $`echo "Hello"`;

// pwd
const dir = await $`pwd`.text();

// cat
const content = await $`cat file.txt`.text();

// touch
await $`touch new-file.txt`;

// mkdir
await $`mkdir -p dir/subdir`;

// which
const bunPath = await $`which bun`.text();
```

### 3.9. [EXAMPLES.COMMAND_SUBSTITUTION.RG] Command Substitution
```typescript
import { $ } from "bun";

// Command substitution
await $`echo Hash: $(git rev-parse --short HEAD)`;

// In variable
await $`
  REV=$(git rev-parse --short HEAD)
  echo "Current revision: $REV"
`;
```

### 3.10. [EXAMPLES.SECURITY.RG] Security Features
```typescript
import { $ } from "bun";

// SAFE: User input is escaped
const userInput = "my-file.txt; rm -rf /";
await $`ls ${userInput}`;
// Tries to list file named "my-file.txt; rm -rf /"
// Does NOT execute rm -rf /

// Escape strings manually
const escaped = $.escape('$(foo) `bar` "baz"');

// Raw strings (no escaping) - use with caution
await $`echo ${{ raw: '$(echo hi)' }}`;
```

---

## 4. [SHELL.BUILTINS.RG] Builtin Commands

### 4.1. [BUILTINS.FULLY_IMPLEMENTED.RG] Fully Implemented
- `cd` - Change directory
- `ls` - List files
- `rm` - Remove files/directories
- `echo` - Print text
- `pwd` - Print working directory
- `bun` - Run bun in bun
- `cat` - Concatenate files
- `touch` - Create empty file
- `mkdir` - Create directory
- `which` - Find command path
- `mv` - Move files (partial: missing cross-device support)
- `exit` - Exit shell
- `true` - Always succeed
- `false` - Always fail
- `yes` - Repeat string
- `seq` - Generate sequence
- `dirname` - Get directory name
- `basename` - Get base name

---

## 5. [SHELL.UTILITIES.RG] Utilities

### 5.1. [UTILITIES.BRACE_EXPANSION.RG] Brace Expansion
```typescript
import { $ } from "bun";

const expanded = $.braces(`echo {1,2,3}`);
// => ["echo 1", "echo 2", "echo 3"]
```

### 5.2. [UTILITIES.ESCAPE.RG] Escape Strings
```typescript
import { $ } from "bun";

const escaped = $.escape('$(foo) `bar` "baz"');
// => \$(foo) \`bar\` \"baz\"
```

---

## 6. [SHELL.SCRIPTING.RG] Shell Scripting

### 6.1. [SCRIPTING.BUN_SH.RG] .bun.sh Files
Create `script.bun.sh`:
```bash
#!/usr/bin/env bun
echo "Hello World! pwd=$(pwd)"
```

Run:
```bash
bun ./script.bun.sh
```

### 6.2. [SCRIPTING.CROSS_PLATFORM.RG] Cross-Platform
- Works on Windows, Linux, macOS
- No need for `/bin/sh`
- Native Bun implementation

---

## 7. [SHELL.IMPLEMENTATION.RG] Implementation Notes

### 7.1. [IMPLEMENTATION.PERFORMANCE.RG] Performance
- **Written in Zig**: High performance
- **Concurrent Operations**: Runs operations concurrently
- **No System Shell**: Doesn't invoke `/bin/sh`

### 7.2. [IMPLEMENTATION.SECURITY.RG] Security
- **No System Shell**: Re-implementation in Bun process
- **Automatic Escaping**: All interpolated variables escaped
- **Command Injection Prevention**: Protected by design

---

## 8. Status

**Status**: ✅ Complete Bun Shell guide

**Last Updated**: 2025-01-XX  
**Version**: 0.1.0
