# Enterprise Scanner Deployment

Build and deploy the enterprise scanner as a standalone, zero-dependency executable.

## Quick Start

```bash
# Build scanner
bun deploy-scanner.ts

# Build and install globally
bun deploy-scanner.ts --install

# Build with custom options
bun deploy-scanner.ts --outdir ./build --name my-scanner
```

## Build Options

### Basic Build
```bash
bun deploy-scanner.ts
```
- Creates standalone executable in `./dist/scanner/`
- Embeds `.scannerrc` and baseline if present
- Minifies and compiles to single binary

### Global Installation
```bash
bun deploy-scanner.ts --install
```
- Builds scanner
- Installs to `/usr/local/bin/bun-enterprise-scan` (Unix)
- Or `%LOCALAPPDATA%\bin\bun-enterprise-scan.exe` (Windows)

### Custom Configuration
```bash
# Disable minification
bun deploy-scanner.ts --no-minify

# Don't embed config files
bun deploy-scanner.ts --no-embed-config

# Custom output directory
bun deploy-scanner.ts --outdir ./build

# Custom binary name
bun deploy-scanner.ts --name scanner
```

## Embedded Files

The build process can embed configuration files:

- **`.scannerrc`** - Scanner configuration (if exists, otherwise uses defaults)
- **`scanner-baseline.json`** - Baseline issues (if exists, otherwise empty)

These are written to the output directory alongside the binary.

## Output Structure

```
dist/
├── scanner/
│   ├── enterprise-scanner          # Standalone executable
│   ├── .scannerrc                   # Embedded config
│   ├── scanner-baseline.json        # Embedded baseline
│   ├── build-metadata.json         # Build information
│   └── bundle-analysis.json        # Bundle size analysis
└── packages/
    ├── linux-x64/
    │   ├── bun-enterprise-scan
    │   └── README.md
    └── darwin-arm64/
        ├── bun-enterprise-scan
        └── README.md
```

## Platform-Specific Packages

The deployment script creates platform-specific packages:

```bash
# After build
./dist/packages/linux-x64/bun-enterprise-scan
./dist/packages/darwin-arm64/bun-enterprise-scan
./dist/packages/win32-x64/bun-enterprise-scan.exe
```

## Installation

### Unix/Linux/macOS
```bash
# Automatic (requires sudo)
bun deploy-scanner.ts --install

# Manual
sudo cp ./dist/scanner/enterprise-scanner /usr/local/bin/bun-enterprise-scan
sudo chmod +x /usr/local/bin/bun-enterprise-scan
```

### Windows
```bash
# Copy to local bin directory
copy dist\scanner\enterprise-scanner.exe %LOCALAPPDATA%\bin\bun-enterprise-scan.exe

# Add to PATH
setx PATH "%PATH%;%LOCALAPPDATA%\bin"
```

## Usage After Installation

```bash
# Scan current directory
bun-enterprise-scan .

# Generate baseline
bun-enterprise-scan --generate-baseline

# Audit mode
bun-enterprise-scan --mode=audit

# With metrics
bun-enterprise-scan --metrics-port=9090
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Build Scanner
  run: |
    bun deploy-scanner.ts --outdir ./build
    tar -czf scanner-linux-x64.tar.gz -C ./build .
  
- name: Upload Artifact
  uses: actions/upload-artifact@v3
  with:
    name: scanner-binary
    path: scanner-linux-x64.tar.gz
```

### Docker
```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app
COPY . .
RUN bun deploy-scanner.ts --outdir /app/dist

FROM oven/bun:alpine
COPY --from=builder /app/dist/scanner/enterprise-scanner /usr/local/bin/bun-enterprise-scan
RUN chmod +x /usr/local/bin/bun-enterprise-scan
ENTRYPOINT ["bun-enterprise-scan"]
```

## Build Metadata

The build process generates `build-metadata.json`:

```json
{
  "version": "1.0.0",
  "buildDate": "2026-01-23T12:00:00.000Z",
  "platform": "darwin",
  "arch": "arm64",
  "embeddedFiles": [".scannerrc", "scanner-baseline.json"],
  "bundleSize": 5242880
}
```

## Bundle Analysis

For CI/CD, the build generates `bundle-analysis.json` with detailed bundle information:

```json
{
  "inputs": { ... },
  "outputs": { ... }
}
```

Use this to track bundle size over time and identify optimization opportunities.

## Zero-Dependency Binary

The compiled binary is completely standalone:
- ✅ No external dependencies
- ✅ Embedded configuration
- ✅ Single executable file
- ✅ Works without Bun runtime (after compilation)

## Troubleshooting

### Permission Denied
```bash
# Make executable
chmod +x ./dist/scanner/enterprise-scanner

# Or install with sudo
sudo bun deploy-scanner.ts --install
```

### Binary Not Found in PATH
```bash
# Check installation
which bun-enterprise-scan

# Add to PATH manually
export PATH="$PATH:/usr/local/bin"
```

### Build Fails
```bash
# Check Bun version
bun --version  # Should be 1.0+

# Clean build
rm -rf ./dist
bun deploy-scanner.ts
```

## Advanced Usage

### Custom Build Constants
```typescript
// Set version
SCANNER_VERSION=2.0.0 bun deploy-scanner.ts

// Custom build date
SCANNER_BUILD_DATE=2026-01-01 bun deploy-scanner.ts
```

### Multi-Platform Build
```bash
# Build for current platform
bun deploy-scanner.ts

# Cross-compile (requires setup)
# Note: Bun doesn't support cross-compilation directly
# Use CI/CD for multi-platform builds
```

## Distribution

### Create Release Package
```bash
# Build
bun deploy-scanner.ts

# Create tarball
cd dist/packages/linux-x64
tar -czf ../../bun-enterprise-scan-linux-x64.tar.gz .

# Create checksum
sha256sum ../../bun-enterprise-scan-linux-x64.tar.gz > ../../checksums.txt
```

### Publish to Registry
```bash
# Package as npm package
npm pack ./dist/scanner

# Or publish to custom registry
npm publish --registry https://your-registry.com
```
