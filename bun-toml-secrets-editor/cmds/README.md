# Publishing Commands

Convenient command wrappers for publishing the package to npm registry.

## Commands

### `publish-dry-run.ts` - Test Publish

Test the publish process without actually publishing:

```bash
# Dry run (builds and tests publish)
bun cmds/publish-dry-run.ts

# With additional flags
bun cmds/publish-dry-run.ts --tag beta
```

**Features:**
- ✅ Builds all platform binaries
- ✅ Tests publish process without publishing
- ✅ Shows what would be published
- ✅ Safe to run multiple times

### `publish.ts` - Standard Publish

Standard publishing with automatic cross-platform build:

```bash
# Standard publish (builds all platforms automatically)
bun cmds/publish.ts

# Dry run to test
bun cmds/publish.ts --dry-run

# Publish with tag
bun cmds/publish.ts --tag beta

# Publish with access level
bun cmds/publish.ts --access public

# Skip build (if binaries already built)
bun cmds/publish.ts --no-build

# Publish with 2FA OTP
bun cmds/publish.ts --otp 123456

# Publish to custom registry
bun cmds/publish.ts --registry https://registry.example.com
```

**All `bun publish` flags are supported:**
- `--dry-run` - Test without publishing
- `--tag <tag>` - Set package tag (default: latest)
- `--access <public|restricted>` - Access level
- `--otp <code>` - One-time password for 2FA
- `--auth-type <web|legacy>` - 2FA authentication method
- `--registry <url>` - Custom registry URL
- `--gzip-level <0-9>` - Compression level
- `--tolerate-republish` - Don't fail if version exists
- `--no-build` / `--skip-build` - Skip building binaries

### `publish-ci.ts` - CI/CD Publish

Optimized for automated publishing in CI/CD pipelines:

```bash
# CI/CD publish (uses NPM_CONFIG_TOKEN)
NPM_CONFIG_TOKEN=your-token bun cmds/publish-ci.ts

# With tag
NPM_CONFIG_TOKEN=your-token bun cmds/publish-ci.ts --tag beta

# With custom registry
NPM_CONFIG_TOKEN=your-token bun cmds/publish-ci.ts --registry https://registry.example.com
```

**Features:**
- ✅ Automatically uses `--tolerate-republish` (can be overridden)
- ✅ Supports `NPM_CONFIG_TOKEN` environment variable
- ✅ Builds all platforms before publishing
- ✅ Graceful handling of republish scenarios

**GitHub Actions Example:**

```yaml
- name: Publish to npm
  env:
    NPM_CONFIG_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: bun cmds/publish-ci.ts
```

**GitLab CI Example:**

```yaml
publish:
  script:
    - NPM_CONFIG_TOKEN=$NPM_TOKEN bun cmds/publish-ci.ts
  only:
    - main
```

### `publish-with-bucket.ts` - Publish + Upload to Bucket

Publish to npm and automatically upload binaries to storage bucket:

```bash
# Publish and upload to S3
BUCKET_TYPE=s3 BUCKET_NAME=my-bucket bun cmds/publish-with-bucket.ts

# With tag
BUCKET_TYPE=s3 BUCKET_NAME=my-bucket bun cmds/publish-with-bucket.ts --tag beta

# Dry run (builds and tests, but doesn't publish or upload)
BUCKET_TYPE=s3 BUCKET_NAME=my-bucket bun cmds/publish-with-bucket.ts --dry-run
```

**Environment Variables:**
- `BUCKET_TYPE` - Storage provider: `s3`, `gcs`, or `azure`
- `BUCKET_NAME` - Name of your bucket
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For S3
- `GCS_PROJECT_ID` / `GCS_KEY_FILE` - For Google Cloud Storage
- `AZURE_STORAGE_ACCOUNT_NAME` / `AZURE_STORAGE_ACCOUNT_KEY` - For Azure

**Features:**
- ✅ Builds all platform binaries
- ✅ Publishes to npm
- ✅ Uploads binaries to storage bucket
- ✅ Organizes uploads by version (v1.0.0/binary-name)
- ✅ Supports S3, GCS, and Azure

### `registry-binary-manager.ts` - bunx --package Compatible

Advanced registry manager with bunx --package workflow support:

```bash
# Build the registry manager (one-time setup)
bun run build:registry-manager

# Upload all platforms to registry
bun run upload:registry
# or
./dist/bun-toml-secrets-editor-registry upload

# Show version with embedded metadata
./dist/bun-toml-secrets-editor-registry version

# Run binary from registry (auto-detects OS)
./dist/bun-toml-secrets-editor-registry run [args...]
```

**bunx --package Workflow:**

```bash
# After uploading, binaries are available via bunx
bunx --package bun-toml-secrets-editor-linux-x64 edit secrets.toml
bunx --package bun-toml-secrets-editor-darwin-arm64 validate config/*.toml
```

**Features:**
- ✅ Build-time embedded metadata (BUILD_VERSION, BUILD_TIME, GIT_COMMIT)
- ✅ Dynamic OS/target detection (no rebuilds!)
- ✅ Single command uploads all platforms
- ✅ bunx --package compatible workflow
- ✅ Auto-downloads and executes from registry

### `registry-binary-manager-typed.ts` - Fully Typed with Type Tests

Advanced typed registry manager with full TypeScript type safety:

```bash
# Run type tests
bun run typecheck

# Build typed manager (with type checking)
bun run build:registry-manager:typed

# Upload all platforms (type-checked)
bun run upload:registry:typed

# Full release workflow (type-check → build → upload)
bun run release:typed
```

**Type Safety Features:**
- ✅ Full TypeScript type definitions
- ✅ Type tests using `expectTypeOf()` from bun:test
- ✅ Typed interfaces (BinaryMetadata, S3ClientConfig, etc.)
- ✅ Type-safe platform detection
- ✅ Generic promise types
- ✅ Union and literal types

**Type Tests:**
```bash
# Run type tests
bun test scripts/__tests__/registry-binary-manager.types.test.ts

# Type check only
bun test --type-check scripts/__tests__/registry-binary-manager.types.test.ts
```

### `registry-manager-v8.ts` - The Definitive Registry Manager

**v8.0 - Recursive Type-Safe Build + Deep Validation:**

```bash
# Run v8 type tests
bun run typecheck:v8

# Build v8 manager (with type checking)
bun run build:registry-manager:v8

# Upload all platforms (recursive build)
bun run upload:registry:v8

# Full release workflow
bun run release:v8
```

**v8.0 Enhanced Features:**
- ✅ **Recursive Platform Builds**: Iterates through all `SUPPORTED_PLATFORMS`
- ✅ **Type-Safe Template Literals**: `${OS}-${Arch}` ensures valid platforms
- ✅ **Performance Tracking**: Uses `performance.now()` for build speed metrics
- ✅ **Memory Efficient**: Uses `Response.body` for S3 streams
- ✅ **Deep Validation**: Type tests verify all platform combinations
- ✅ **Baked Metadata**: `--define` constants replace env lookups
- ✅ **Security**: Immediate cleanup with `chmod +x` and `rm`

**Type System:**
- Template literal types: `PlatformTag = \`${OS}-${Arch}\``
- Const assertions: `readonly PlatformTag[]`
- Type-safe S3 keys: `` `v${string}/${string}-${PlatformTag}${string}` ``
- Deep validation of all platform combinations

**Usage:**
```bash
# Build manager
bun run build:registry-manager:v8

# Publish all platforms
./dist/bun-toml-secrets-editor-registry-v8 publish bun-toml-secrets-editor

# Run from registry (auto-detects OS)
./dist/bun-toml-secrets-editor-registry-v8 run bun-toml-secrets-editor edit secrets.toml

# Show version
./dist/bun-toml-secrets-editor-registry-v8 version bun-toml-secrets-editor
```

**Verified Types:**
- `BinaryPlatform` - Union of all supported platforms
- `BucketAction` - Union of all actions
- `BinaryMetadata` - Complete metadata interface
- `S3ClientConfig` - Typed configuration
- Build-time constants (BUILD_VERSION, BUILD_TIME, GIT_COMMIT)

### `registry-manager-v8-enhanced.ts` - V8 Type Checking + Bun Native S3

**v8.1 - Enhanced with V8 C++ API Type Checking + Bun Native S3:**

```bash
# Run V8 type checking tests
bun run test:v8-types

# Run S3 content disposition tests
bun run test:s3-disposition

# Build enhanced manager (with V8 type checking)
bun run build:registry-manager:v8-enhanced

# Publish all platforms
./dist/bun-toml-secrets-editor-registry-v8-enhanced publish bun-toml-secrets-editor
```

**V8 Type Checking APIs:**
- ✅ **v8::Value::IsMap()** - Validates Map structures (build statistics)
- ✅ **v8::Value::IsArray()** - Validates array structures (platforms, args)
- ✅ **v8::Value::IsInt32()** - Validates 32-bit integers (build times, counts)
- ✅ **v8::Value::IsBigInt()** - Validates BigInt values (large file sizes)

**Native Module Compatibility:**
These APIs improve compatibility with native Node.js modules that use V8 C++ type checking. Our TypeScript implementations match the C++ API behavior for consistency.

**Benefits:**
- ✅ Better compatibility with native addons
- ✅ Faster type checks (C++ level performance)
- ✅ Memory safety (prevents crashes from wrong types)
- ✅ Future-proof native module support

**Bun Native S3 API:**
- ✅ Uses `import { s3 } from "bun"` for native S3 operations
- ✅ Content-Disposition support (`inline` or `attachment`)
- ✅ Better performance than fetch-based S3 client
- ✅ Native integration with Bun's runtime

**Content Disposition Examples:**
```typescript
// Force download with custom filename (registry binaries)
await s3.write(key, binaryData, {
  contentDisposition: `attachment; filename="${packageName}-${platform}"`,
});

// Display inline in browser (images, PDFs)
await s3.write("preview.png", imageData, {
  contentDisposition: "inline",
});

// Simple attachment (download with original filename)
await s3.write("data.csv", csvData, {
  contentDisposition: "attachment",
});
```

**Test Results:**
```bash
# V8 Type Checking: 20 pass, 0 fail
bun run test:v8-types

# S3 Content Disposition: 6 pass, 0 fail
bun run test:s3-disposition
```

**How Browsers Interpret Content Disposition:**
- `inline` - For images → displayed in browser, PDFs → opened in browser tab/viewer
- `attachment` - Shows "Save as" dialog
- `attachment; filename="..."` - Downloads with specified name regardless of S3 key name

## Package.json Scripts

You can also add these to `package.json` scripts:

```json
{
  "scripts": {
    "publish:cmd": "bun cmds/publish.ts",
    "publish:ci": "bun cmds/publish-ci.ts"
  }
}
```

Then use:
```bash
bun run publish:cmd --dry-run
bun run publish:ci
```

## Direct bun publish

You can still use `bun publish` directly:

```bash
# Build first
bun run build:all

# Then publish
bun publish --dry-run
bun publish
```
