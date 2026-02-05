# Development Notes

## 📝 Important Development Practices

### **🚀 Use bunx instead of bun for package execution**

When running globally installed packages or npx-like commands, use `bunx` instead of `bun`:

```bash
# ✅ CORRECT - Use bunx for packages
bunx wrangler deploy
bunx wrangler login
bunx wrangler whoami

# ❌ AVOID - Don't use bun for packages
bun wrangler deploy
bun wrangler login
bun wrangler whoami
```

**Why use bunx?**

- `bunx` is Bun's equivalent of `npx` - it executes packages
- `bun` is for running local scripts and files
- **Package Executables:** When packages have a `bin` field in package.json, `bunx` executes those declared binaries
- Prevents conflicts with local package.json scripts
- Ensures you're using the globally installed version

**How Package Executables Work:**

Packages declare executables in their `package.json` `bin` field:

```json
{
  "name": "my-cli",
  "bin": {
    "my-cli": "dist/index.js"
  }
}
```

These executables typically have a shebang line:

```javascript
#!/usr/bin/env node
console.log("Hello world!");
```

When you run `bunx my-cli`, Bun executes the package binary declared in the `bin` field.

### **🔧 Shebang Handling in Bun**

By default, Bun respects shebangs. If an executable is marked with `#!/usr/bin/env node`, Bun will spin up a Node.js process to execute the file.

However, you can force Bun to use its own runtime instead:

```bash
# Use Bun's runtime instead of the shebang interpreter
bunx --bun my-cli

# The --bun flag must come BEFORE the executable name
bunx --bun my-cli        # ✅ Correct - forces Bun runtime
bunx my-cli --bun        # ❌ Wrong - passes --bun to my-cli
```

**When to use `--bun`:**

- When you want Bun's performance benefits
- When the package works with Bun's runtime
- When you want to avoid spinning up Node.js process

### **📋 Complete bunx Syntax**

```bash
bunx [flags] <package>[@version] [flags and arguments for the package]
```

**Syntax Breakdown:**

- `bunx` - The command to execute packages
- `[flags]` - Bun-specific flags (like `--bun`, `-p`)
- `<package>` - Package name to execute
- `[@version]` - Optional version specifier
- `[flags and arguments]` - Passed to the package itself

**Special Flags:**

- `--bun` - Force Bun runtime instead of shebang interpreter
- `-p <package>` - Specify package when binary name differs from package name

### **Examples**

```bash
# Basic usage
bunx cowsay "Hello!"

# With Bun runtime flag
bunx --bun npm --version

# Specific version
bunx npm@10 --version

# Package with its own flags
bunx wrangler deploy --env production

# Combined: Bun runtime + specific version + package flags
bunx --bun npm@10 install --save
```

### **🔧 Real-World Examples**

```bash
# Run Prisma migrations
bunx prisma migrate

# Format a file with Prettier
bunx prettier foo.js

# Run a specific version of a package
bunx uglify-js@3.14.0 app.js

# Use --package when binary name differs from package name
bunx -p @angular/cli ng new my-app

# Force running with Bun instead of Node.js, even if the executable contains a Node shebang
bunx --bun vite dev foo.js
```

### **📋 When to use each:**

| Command | Use Case | Example |
|---------|----------|---------|
| `bun run` | Local scripts from package.json | `bun run cli`, `bun run start` |
| `bun` | Local TypeScript/JavaScript files | `bun src/main.js`, `bun script.ts` |
| `bunx` | Package executables (bin field) | `bunx wrangler`, `bunx vite`, `bunx cowsay` |
| `bunx --bun` | Force Bun runtime for packages | `bunx --bun my-cli`, `bunx --bun wrangler` |

### **🔧 Common bunx commands in this project:**

```bash
bunx wrangler deploy          # Deploy to Cloudflare Workers
bunx wrangler login           # Login to Cloudflare
bunx wrangler whoami          # Check Cloudflare auth status
bunx wrangler dev             # Local development server
```

### **📦 Package Management with bun (not bunx)**

### **Note:**

`bun update` is for managing local dependencies, not executing packages.

```bash
# Interactive dependency updates
bun update --interactive      # Show interactive list of outdated packages
bun update -i                 # Short form for interactive

# Recursive updates (for monorepos/workspaces)
bun update --interactive --recursive  # Interactive updates across all workspaces
bun update -i -r                      # Short form for recursive interactive

# Update all dependencies
bun update                    # Update within version ranges
bun update --latest           # Update to latest versions

# Update specific packages
bun update zod jquery@3       # Update specific packages

# Update specific package to exact version
bun update npm@9              # Update npm to version 9.x
bun update commander@10       # Update commander to version 10.x
bun update package@1.2.3      # Update to exact version
```

### **Key Difference:**

- `bunx` = Execute packages (like `npx`)
- `bun update` = Manage local dependencies (like `npm update`)

### **🔄 Recursive Updates (-r)**

**Use Case:** Monorepos with multiple packages/workspaces

```bash
# Update across all workspaces interactively
bun update -i -r

# What it does:
# - Scans all workspace packages
# - Shows outdated dependencies across entire monorepo
# - Allows selective updates per workspace
```

### **Real Example Result:**

- ✅ **Updated**: `nodemailer@7.0.12` across all workspaces
- ✅ **Interactive Control**: Selected specific packages
- ✅ **Workspace Aware**: Updates applied to relevant packages only

### **🚀 Package Publishing**

```bash
# Basic publishing
bun publish                    # Publish to latest tag

# Publish with specific tag
bun publish --tag alpha        # Alpha releases
bun publish --tag beta         # Beta releases
bun publish --tag latest       # Stable releases

# Access control
bun publish --access public    # Public package
bun publish --access restricted # Private scoped package

# Dry run (test without publishing)
bun publish --dry-run

# Authentication required for publishing
bunx npm login                 # Login to npm registry
bunx wrangler login            # Login to Cloudflare
```

**Advanced Publishing Options:**

```bash
# Compression and performance
bun publish --gzip-level 6     # Custom compression (0-9)
bun publish --tolerate-republish # Don't fail on version exists

# Two-factor authentication
bun publish --otp 123456       # Provide OTP directly
bun publish --auth-type legacy # Use legacy auth

# Custom registry
bun publish --registry https://private-registry.com

# Private scoped registry (R2 bucket hosted)
bun publish --registry https://bucket.company.com
bun publish --access restricted    # For scoped packages

# Script control
bun publish --ignore-scripts   # Skip lifecycle scripts
bun publish --production       # Exclude devDependencies
```

### **Publishing Workflow:**

1. **Package Preparation**: Files packed and hashed
2. **Tag Application**: Release tag specified
3. **Authentication**: Login required for registry access
4. **Registry Upload**: Package published to npm/Cloudflare or R2 bucket

### **🪣 R2 Bucket Private Registry**

**Configuration (bunfig.toml):**

```toml
[install]
registry = "https://bucket.company.com"

[install.scopes]
"@yourorg" = { url = "https://bucket.company.com/", token = "${BUCKET_TOKEN}" }
```

### **Publishing to R2 Registry:**

```bash
# Publish to private R2-hosted registry
bun publish --registry https://bucket.company.com
bun publish --access restricted    # Scoped packages only

# Installation from private registry
bun install @yourorg/package-name
bunx @yourorg/cli-tool
```

### **Benefits:**

- **Private Storage**: Packages stored in your R2 bucket
- **Token Authentication**: Secure access control
- **Scoped Packages**: Isolated from public npm
- **Fast Access**: Cloudflare edge distribution

### **Publish Output Example:**

```text
packed 340B package.json
packed 117B index.js
Total files: 2
Shasum: 6c3083341fce6979797a5445793b47e40a548298
Integrity: sha512-RCJNWcDO4dbZ5[...]OSKgVzBd1OvVQ==
Unpacked size: 457B
Packed size: 402B
Tag: alpha
```

---
*Last updated: January 13, 2026*
