# `bun run -` - Execute Code from Stdin

## Overview

`bun run -` lets you read JavaScript, TypeScript, TSX, or JSX from stdin and execute it without writing to a temporary file. All code is automatically treated as TypeScript with JSX support.

## Basic Usage

### Simple Echo

```bash
echo "console.log('Hello from stdin!')" | bun run -
# Output: Hello from stdin!
```

### Heredoc Syntax

```bash
bun run - << 'EOF'
const data = { message: "Hello from heredoc!" };
console.log(JSON.stringify(data, null, 2));
EOF
```

**Output**:
```json
{
  "message": "Hello from heredoc!"
}
```

### TypeScript with Types

```bash
echo "const msg: string = 'This is TypeScript!'; console.log(msg);" | bun run -
# Output: This is TypeScript!
```

### Run .js File as TypeScript

```bash
# Create a .js file with TypeScript syntax
echo "console.log!('This is TypeScript!' as any)" > secretly-typescript.js

# Execute it as TypeScript
bun run - < secretly-typescript.js
# Output: This is TypeScript!
```

## Advanced Examples

### Import Modules

```bash
bun run - << 'EOF'
import { Database } from "bun:sqlite";

const db = new Database(":memory:");
const result = db.query("SELECT 1 + 1 as sum").get();
console.log("Result:", result.sum);
EOF
```

### Feature Flags

**Note**: Feature flags via CLI may not work with stdin execution. The feature check happens at parse time, before runtime flags are applied.

```bash
# This may not work as expected
echo "console.log('test')" | bun --feature=FEAT_CLOUD_UPLOAD run -
```

**Workaround**: Use inline conditionals or environment variables:

```bash
bun run - << 'EOF'
const UPLOAD_ENABLED = process.env.UPLOAD_ENABLED === 'true';
if (UPLOAD_ENABLED) {
  console.log('✅ Uploads enabled');
} else {
  console.log('❌ Uploads disabled');
}
EOF
```

### File Operations

```bash
bun run - << 'EOF'
const content = "Hello from Bun!";
await Bun.write("output.txt", content);
console.log("File written successfully");

const read = await Bun.file("output.txt").text();
console.log("File contents:", read);
EOF
```

### HTTP Requests

```bash
bun run - << 'EOF'
const response = await fetch("https://httpbin.org/json");
const data = await response.json();
console.log("Slideshow title:", data.slideshow.title);
EOF
```

### Server Example

```bash
bun run - << 'EOF'
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from stdin server!");
  }
});

console.log("Server running on http://localhost:3000");

// Keep process alive
await new Promise(() => {});
EOF
```

## Use Cases

### 1. Quick Testing

Test code snippets without creating files:

```bash
echo "console.log(Bun.version)" | bun run -
```

### 2. Pipeline Processing

Process data from other commands:

```bash
cat data.json | bun run - << 'EOF'
const data = await Bun.stdin.text();
const parsed = JSON.parse(data);
console.log("Items:", parsed.length);
EOF
```

### 3. One-Liner Scripts

Execute simple scripts directly:

```bash
bun run - <<< "console.log(Math.random())"
```

### 4. Remote Code Execution

Execute code fetched from remote sources:

```bash
curl -s https://example.com/script.ts | bun run -
```

### 5. Configuration Validation

Validate JSON/TOML config files:

```bash
bun run - < config.json << 'EOF'
const content = await Bun.stdin.text();
try {
  JSON.parse(content);
  console.log("✅ Valid JSON");
} catch (e) {
  console.log("❌ Invalid JSON:", e.message);
}
EOF
```

## Limitations

### 1. CLI Flags with Features

Feature flags via `--feature=` may not work correctly because:

- Feature checks happen at parse/compile time
- stdin content is read after CLI flags are processed
- Dead-code elimination occurs before the code is fully parsed

**Workaround**: Use environment variables or inline configuration

### 2. Debugging

Debugging stdin code can be tricky:

```bash
# Works, but limited
bun --inspect run - <<< "console.log('test')"
```

**Better approach**: Save to a file for debugging

### 3. Type Checking

Type checking is performed at runtime, not compile-time:

```bash
# This will run (with potential runtime error)
echo "const x: number = 'string'; console.log(x);" | bun run -
```

### 4. Large Code Blocks

For large scripts, creating a file is more maintainable

## Best Practices

### ✅ DO Use For:

- Quick code snippets and experiments
- Testing API endpoints
- Data transformation pipelines
- One-off scripts
- Learning and exploration

### ❌ DON'T Use For:

- Complex applications
- Long-term maintenance
- Scripts requiring debugging
- Code with external dependencies (import maps work, but can be tricky)
- Production deployments

## Comparison: `bun run -` vs `bun -e`

### `bun run -` (stdin)

```bash
echo "console.log('test')" | bun run -
```

**Pros**:
- Reads from stdin (pipeable)
- Supports heredoc syntax
- Can read from files: `bun run - < script.ts`

**Cons**:
- CLI flags may have timing issues with certain features

### `bun -e` (eval)

```bash
bun -e "console.log('test')"
```

**Pros**:
- Inline code string
- Works reliably with CLI flags

**Cons**:
- Requires string escaping
- Less readable for multi-line code

### Example Comparison

**Using `bun run -`**:
```bash
bun run - << 'EOF'
const data = { x: 1, y: 2 };
console.log(JSON.stringify(data));
EOF
```

**Using `bun -e`**:
```bash
bun -e "
const data = { x: 1, y: 2 };
console.log(JSON.stringify(data));
"
```

## Real-World Examples

### Database Migration Script

```bash
bun run - << 'EOF'
import { Database } from "bun:sqlite";

const db = new Database("mydb.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT
  )
`);

db.prepare("INSERT INTO users (name, email) VALUES (?, ?)")
  .run("Alice", "alice@example.com");

console.log("✅ Migration complete");
EOF
```

### File Upload Test

```bash
bun run - << 'EOF'
const file = Bun.file("package.json");
const form = new FormData();
form.append("file", file);
form.append("filename", "package.json");

const response = await fetch("http://localhost:3000/api/upload/initiate", {
  method: "POST",
  body: form
});

console.log("Upload status:", response.status);
EOF
```

### Environment Configuration

```bash
bun run - << 'EOF'
const config = {
  database: process.env.DATABASE_URL || "sqlite:db.sqlite",
  port: parseInt(process.env.PORT || "3000"),
  environment: process.env.NODE_ENV || "development"
};

console.log("Configuration:", JSON.stringify(config, null, 2));
EOF
```

### JSON Data Processing

```bash
cat users.json | bun run - << 'EOF'
import { Database } from "bun:sqlite";

const data = JSON.parse(await Bun.stdin.text());
const db = new Database("users.db");

const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");

for (const user of data) {
  insert.run(user.name, user.email);
}

console.log(`✅ Imported ${data.length} users`);
EOF
```

## Tips and Tricks

### 1. Auto-Indent JSON Output

```bash
bun run - << 'EOF'
const data = { x: 1, y: { z: 2 } };
console.log(JSON.stringify(data, null, 2));
EOF
```

### 2. Measure Execution Time

```bash
time bun run - << 'EOF'
// Your code here
const sum = Array.from({ length: 1000000 }, (_, i) => i)
  .reduce((a, b) => a + b, 0);
console.log("Sum:", sum);
EOF
```

### 3. Catch Errors Gracefully

```bash
bun run - << 'EOF'
try {
  const data = JSON.parse(await Bun.stdin.text());
  console.log("✅ Valid JSON");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
EOF
```

### 4. Use with `--smol` for Memory-Constrained Environments

```bash
bun --smol run - << 'EOF'
// Process large dataset with limited memory
const lines = (await Bun.file("large.txt").text()).split("\n");
console.log("Lines:", lines.length);
EOF
```

### 5. Combine with `--watch` for Development

```bash
echo "console.log('Watching for changes...')" | bun --watch run -
```

## Performance

Bun's stdin execution is extremely fast:

```bash
# Benchmark: Startup time
time echo "console.log('test')" | bun run -
# ~5-6ms

time node -e "console.log('test')"
# ~25-30ms
```

**Bun is ~4-5x faster than Node.js** for startup and execution.

## Troubleshooting

### Issue: "Unexpected token" Error

**Cause**: Syntax error in code

**Solution**: Test code in a file first:

```bash
# Test in file
cat > test.ts << 'EOF'
your code here
EOF

bun run test.ts
```

### Issue: Feature Flags Not Working

**Cause**: CLI flag timing with stdin

**Solution**: Use environment variables:

```bash
UPLOAD_ENABLED=true bun run - << 'EOF'
console.log('Uploads enabled?', process.env.UPLOAD_ENABLED === 'true');
EOF
```

### Issue: Module Not Found

**Cause**: Import path issues

**Solution**: Use absolute paths or install dependencies:

```bash
bun run - << 'EOF'
// Use absolute imports
import { Database } from "bun:sqlite";
console.log("✅ Imported");
EOF
```

## Summary

| Aspect | Details |
|--------|---------|
| **Syntax** | `bun run -` or `bun run - < file` |
| **Languages** | JavaScript, TypeScript, JSX, TSX |
| **Type Checking** | Automatic (TypeScript with JSX) |
| **Performance** | ~4-5x faster than Node.js |
| **Use Case** | Quick scripts, testing, pipelines |
| **Limitation** | CLI feature flags may not work |

---

**Documentation**: [Bun Runtime Docs](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin)
