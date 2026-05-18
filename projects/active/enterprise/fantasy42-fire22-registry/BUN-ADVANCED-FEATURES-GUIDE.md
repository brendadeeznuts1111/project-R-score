# 🚀 Bun Advanced Features Guide - User-Agent & Compilation

This comprehensive guide covers the latest advanced features in Bun, including
User-Agent customization, executable compilation, and embedded runtime
arguments.

## 📋 Table of Contents

- [🎯 User-Agent Customization](#-user-agent-customization)
- [🔨 Executable Compilation](#-executable-compilation)
- [📦 Embedded Runtime Arguments](#-embedded-runtime-arguments)
- [🏷️ Windows Executable Metadata](#️-windows-executable-metadata)
- [🍎 macOS Bundle Configuration](#-macos-bundle-configuration)
- [🐧 Linux Build Options](#-linux-build-options)
- [⚙️ Configuration Integration](#️-configuration-integration)
- [🚀 Usage Examples](#-usage-examples)
- [📊 Build Scripts](#-build-scripts)

---

## 🎯 User-Agent Customization

### Command Line Usage

Customize the User-Agent header for all HTTP requests made with `fetch()`:

```bash
# Set custom User-Agent for a single run
bun --user-agent "MyCustomApp/1.0" agent.js

# Use with your application
bun --user-agent "CrystalClearArchitecture/2.0.0" app.js
```

### JavaScript Example

```javascript
// agent.js
const response = await fetch('https://httpbin.org/user-agent');
const data = await response.json();
console.log(data['user-agent']); // Your custom User-Agent

// All fetch requests will use the custom User-Agent
const apiResponse = await fetch('https://api.example.com/data');
```

### Bunfig.toml Configuration

```toml
[user-agent]
# Custom User-Agent string for all HTTP requests
custom_agent = "CrystalClearArchitecture/2.0.0"
# Enable User-Agent override for fetch requests
override_default = true
# User-Agent rotation (for anti-detection)
rotation_enabled = false
# User-Agent pool for rotation
agent_pool = [
  "CrystalClearArchitecture/2.0.0",
  "Mozilla/5.0 (compatible; CrystalClear/2.0)",
  "CrystalClear-Bot/2.0.0 (+https://github.com/brendadeeznuts1111/crystal-clear-architecture)"
]
# Rotation interval in minutes
rotation_interval_minutes = 60
```

---

## 🔨 Executable Compilation

### Basic Compilation

Create standalone executables that don't require Bun to be installed:

```bash
# Compile for current platform
bun build ./app.js --compile --outfile my-app

# Cross-compile for different platforms
bun build ./app.js --compile --target bun-linux-x64 --outfile my-app-linux
bun build ./app.js --compile --target bun-windows-x64 --outfile my-app.exe
bun build ./app.js --compile --target bun-macos-arm64 --outfile my-app-macos
```

### Advanced Compilation with Bun.build()

```javascript
// Cross-compile an executable for Linux x64 with musl
await Bun.build({
  entrypoints: ['./cli.ts'],
  // target can be a shorthand string where it uses entrypoint name as executable name
  compile: 'bun-linux-x64-musl',
});

// Or use an object for more configuration, like setting a custom filename and Windows icon
await Bun.build({
  entrypoints: ['./cli.ts'],
  compile: {
    target: 'bun-windows-x64',
    outfile: './my-app-windows',
    windows: {
      // set the icon for the .exe
      icon: './icon.ico',
    },
  },
});
```

### Supported Targets

- `bun-linux-x64` - Linux x64 with glibc
- `bun-linux-x64-musl` - Linux x64 with musl (more portable)
- `bun-linux-arm64` - Linux ARM64
- `bun-windows-x64` - Windows x64
- `bun-macos-x64` - macOS x64 (Intel)
- `bun-macos-arm64` - macOS ARM64 (Apple Silicon)

---

## 📦 Embedded Runtime Arguments

### Command Line Usage

Embed runtime arguments directly into compiled executables:

```bash
bun build ./index.ts --compile --outfile=my-app \
  --compile-exec-argv="--smol --user-agent=MyApp/1.0"
```

### JavaScript Example

```javascript
// index.ts
console.log(`Bun was launched with: ${process.execArgv.join(' ')}`);

// This --user-agent flag is actually processed by Bun's runtime.
// All fetch requests will use this user-agent.
const res = await fetch('https://api.bunjstest.com/agent');
console.log(`User-Agent header sent: ${await res.text()}`);
```

### Bunfig.toml Configuration

```toml
[build.compile.exec_argv]
# Embed runtime flags into executables
enabled = true
# Embedded arguments (applied at runtime)
embedded_args = [
  "--smol",
  "--user-agent=CrystalClearArchitecture/2.0.0"
]
# Make embedded args inspectable via process.execArgv
expose_exec_argv = true
```

---

## 🏷️ Windows Executable Metadata

### Command Line Usage

Set Windows executable metadata during compilation:

```bash
bun build ./app.js --compile --outfile app.exe \
  --windows-title "My Cool App" \
  --windows-publisher "My Company" \
  --windows-version "1.2.3.4" \
  --windows-description "This is a really cool application." \
  --windows-copyright "© 2024 My Company"
```

### Bun.build() API

```javascript
await Bun.build({
  entrypoints: ['./app.js'],
  outfile: './app.exe',
  compile: {
    windows: {
      title: 'My Cool App',
      publisher: 'My Company',
      version: '1.2.3.4',
      description: 'This is a really cool application.',
      copyright: '© 2024 My Company',
    },
  },
});
```

### Bunfig.toml Configuration

```toml
[build.compile.windows]
# Enable Windows-specific settings
windows_enabled = true
# Application metadata
title = "Crystal Clear Architecture"
publisher = "Fire22 Enterprise"
version = "2.0.0.0"
description = "Enterprise-grade interactive hub with advanced analytics and automation"
copyright = "© 2024 Fire22 Enterprise. All rights reserved."
# Icon configuration
icon_path = "./assets/crystal-clear-icon.ico"
# Digital signature
sign_executable = false
certificate_path = "~/.bun/certificates/code-signing.pfx"
certificate_password = "$WINDOWS_CERT_PASSWORD"
```

---

## 🍎 macOS Bundle Configuration

### Bunfig.toml Configuration

```toml
[build.compile.macos]
# Enable macOS-specific settings
macos_enabled = true
# Bundle identifier
bundle_id = "com.fire22.crystalclear"
# Category
category = "public.app-category.business"
# Minimum macOS version
minimum_version = "12.0"
# Enable sandbox
sandbox_enabled = false
# Code signing
codesign_enabled = false
codesign_identity = "Developer ID Application"
```

### Bun.build() API

```javascript
await Bun.build({
  entrypoints: ['./app.js'],
  outfile: './app-macos',
  compile: {
    target: 'bun-macos-arm64',
    macos: {
      bundle_id: 'com.fire22.crystalclear',
      category: 'public.app-category.business',
      minimum_version: '12.0',
    },
  },
});
```

---

## 🐧 Linux Build Options

### Bunfig.toml Configuration

```toml
[build.compile.linux]
# Enable Linux-specific settings
linux_enabled = true
# Use musl instead of glibc (more portable)
use_musl = true
# Static linking
static_linking = true
# Include debug symbols
debug_symbols = false
```

### Cross-Compilation Examples

```bash
# Build for Linux with glibc
bun build ./app.js --compile --target bun-linux-x64 --outfile app-linux

# Build for Linux with musl (more portable)
bun build ./app.js --compile --target bun-linux-x64-musl --outfile app-linux-musl

# Build for Linux ARM64
bun build ./app.js --compile --target bun-linux-arm64 --outfile app-linux-arm64
```

---

## ⚙️ Configuration Integration

### Complete Build Configuration

```toml
[build]
# Enable advanced build features
advanced_build = true

# Executable Compilation Settings
[build.compile]
enabled = true
default_target = "bun-linux-x64"
cross_compile_targets = [
  "bun-linux-x64",
  "bun-linux-x64-musl",
  "bun-linux-arm64",
  "bun-windows-x64",
  "bun-macos-x64",
  "bun-macos-arm64"
]
optimize_size = true
optimize_speed = true
dead_code_elimination = true

# Embedded Runtime Arguments
[build.compile.exec_argv]
enabled = true
embedded_args = [
  "--smol",
  "--user-agent=CrystalClearArchitecture/2.0.0"
]
expose_exec_argv = true

# Platform-specific settings
[build.compile.windows]
windows_enabled = true
title = "Crystal Clear Architecture"
publisher = "Fire22 Enterprise"

[build.compile.macos]
macos_enabled = true
bundle_id = "com.fire22.crystalclear"

[build.compile.linux]
linux_enabled = true
use_musl = true
```

---

## 🚀 Usage Examples

### 1. User-Agent Demo

```bash
# Run with custom User-Agent
bun --user-agent "CrystalClearArchitecture/2.0.0" run scripts/user-agent-demo.ts

# Or use the npm script
npm run user-agent:custom
```

### 2. Build Executables

```bash
# Build for current platform
bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/my-app

# Build with embedded arguments
npm run build:with-args

# Build for Windows with metadata
npm run build:windows

# Build all platforms
npm run build:all-platforms
```

### 3. Cross-Platform Builds

```bash
# Linux builds
npm run build:linux
npm run build:linux-musl

# macOS build
npm run build:macos

# Windows build
npm run build:windows
```

### 4. Advanced Compilation

```javascript
// Advanced build with all features
await Bun.build({
  entrypoints: ['./app.js'],
  outfile: './dist/advanced-app',
  compile: {
    target: 'bun-linux-x64',
    exec_argv: ['--smol', '--user-agent=CrystalClearArchitecture/2.0.0'],
    windows: {
      title: 'Crystal Clear Architecture',
      publisher: 'Fire22 Enterprise',
      version: '2.0.0.0',
    },
  },
  minify: {
    whitespace: true,
    identifiers: true,
    syntax: true,
  },
  sourcemap: 'linked',
});
```

---

## 📊 Build Scripts

### User-Agent Demo Script

```bash
#!/usr/bin/env bun

async function main() {
  console.log('🚀 User-Agent Demo');

  // Test User-Agent functionality
  const response = await fetch('https://httpbin.org/user-agent');
  const data = await response.json();

  console.log('📊 Current User-Agent:', data['user-agent']);
  console.log('📋 Embedded args:', process.execArgv);
}
```

### Build Executable Script

```javascript
// build-executable-demo.ts
async function main() {
  console.log('🔨 Building executables for all platforms...');

  const platforms = [
    { name: 'Linux x64', target: 'bun-linux-x64' },
    { name: 'Windows x64', target: 'bun-windows-x64' },
    { name: 'macOS ARM64', target: 'bun-macos-arm64' },
  ];

  for (const platform of platforms) {
    await Bun.build({
      entrypoints: ['./scripts/user-agent-demo.ts'],
      outfile: `./dist/app-${platform.target}`,
      compile: {
        target: platform.target,
        exec_argv: ['--user-agent=CrystalClearArchitecture/2.0.0'],
      },
    });

    console.log(`✅ Built for ${platform.name}`);
  }
}
```

---

## 📋 Available NPM Scripts

```json
{
  "scripts": {
    "user-agent:demo": "bun run scripts/user-agent-demo.ts",
    "user-agent:custom": "bun --user-agent \"CrystalClearArchitecture/2.0.0\" run scripts/user-agent-demo.ts",
    "build:executables": "bun run scripts/build-executable-demo.ts",
    "build:linux": "bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/crystal-clear-linux --target bun-linux-x64",
    "build:linux-musl": "bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/crystal-clear-linux-musl --target bun-linux-x64-musl",
    "build:windows": "bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/crystal-clear-windows.exe --target bun-windows-x64 --windows-title \"Crystal Clear Architecture\" --windows-publisher \"Fire22 Enterprise\"",
    "build:macos": "bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/crystal-clear-macos --target bun-macos-arm64",
    "build:with-args": "bun build ./scripts/user-agent-demo.ts --compile --outfile ./dist/crystal-clear-with-args --compile-exec-argv \"--smol --user-agent=CrystalClearArchitecture/2.0.0\"",
    "build:all-platforms": "bun run scripts/build-executable-demo.ts"
  }
}
```

---

## 🎯 Key Benefits

### User-Agent Customization

- **API Integration**: Identify your application to external services
- **Anti-Detection**: Rotate User-Agents for web scraping
- **Compliance**: Meet API requirements for specific User-Agents
- **Debugging**: Easily identify requests from your application

### Executable Compilation

- **No Dependencies**: Run without Bun installed
- **Cross-Platform**: Build for any supported platform
- **Performance**: Optimized native executables
- **Distribution**: Easy deployment and sharing

### Embedded Arguments

- **Configuration**: Pre-configure runtime behavior
- **Security**: Embed sensitive flags securely
- **Consistency**: Ensure all instances run with same settings
- **Deployment**: Simplified deployment configuration

### Platform-Specific Features

- **Windows**: Rich metadata and digital signatures
- **macOS**: Proper bundle configuration and code signing
- **Linux**: Choice between glibc and musl for portability

---

## 🚀 Getting Started

1. **Test User-Agent Feature**:

   ```bash
   npm run user-agent:demo
   ```

2. **Build Your First Executable**:

   ```bash
   npm run build:linux
   ```

3. **Create Cross-Platform Builds**:

   ```bash
   npm run build:all-platforms
   ```

4. **Experiment with Embedded Args**:
   ```bash
   npm run build:with-args
   ./dist/crystal-clear-with-args
   ```

---

**🎉 Your Bun configuration now supports the latest advanced features for
User-Agent customization, executable compilation, and cross-platform builds!**
