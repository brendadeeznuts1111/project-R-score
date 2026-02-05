# 🔥 Fire22 Enhanced Executable Builder - Complete Documentation

## 📋 Table of Contents

- [Build Constants & Variables](#build-constants--variables)
- [User-Agent Configurations](#user-agent-configurations)
- [Platform-Specific Settings](#platform-specific-settings)
- [Runtime Flags & Arguments](#runtime-flags--arguments)
- [Environment Variables](#environment-variables)
- [Windows Metadata](#windows-metadata)
- [SIMD & Performance Features](#simd--performance-features)
- [Build Configuration](#build-configuration)

## 🔧 Build Constants & Variables

### Global Build-Time Constants

These constants are injected at compile time using Bun's `--define` feature:

```typescript
// Core Environment Constants
'process.env.NODE_ENV': '"production"'
'ENVIRONMENT': '"production"'
'VERSION': '"3.0.9"'
'BUILD_TIME': '"2025-08-27T08:31:55.636Z"' // Dynamic timestamp

// Platform-Specific Constants
'TARGET_PLATFORM': '"windows"' | '"linux"' | '"darwin"' | '"docker"'
'USER_AGENT': '"Fire22-Dashboard/3.0.9 (Windows)"' // Platform-specific

// SIMD & Performance Constants
'ENABLE_SIMD_ANSI': 'true'
'USE_FAST_LOGGING': 'true'
'PLATFORM_OPTIMIZED': 'true'

// Runtime Configuration
'BUN_RUNTIME_FLAGS': '"--smol --max-http-requests=256"' // Platform-specific
'FIRE22_API_CLIENT': 'true'
```

### Runtime Global Variables

These variables are available at runtime via `globalThis`:

```typescript
declare global {
  var ENABLE_SIMD_ANSI: boolean; // SIMD acceleration flag
  var USE_FAST_LOGGING: boolean; // Fast logging mode
  var USER_AGENT: string; // HTTP User-Agent string
  var TARGET_PLATFORM: string; // Target platform identifier
  var BUILD_TIME: string; // Build timestamp
  var BUN_RUNTIME_FLAGS: string; // Embedded runtime arguments
  var PLATFORM_OPTIMIZED: boolean; // Platform optimization flag
}
```

## 🌐 User-Agent Configurations

### Platform-Specific User-Agents

Each platform gets a unique User-Agent string for API identification:

```typescript
// Windows User-Agent
'Fire22-Dashboard/3.0.9 (Windows)';

// Linux User-Agent
'Fire22-Dashboard/3.0.9 (Linux)';

// macOS User-Agent
'Fire22-Dashboard/3.0.9 (macOS)';

// Docker User-Agent
'Fire22-Dashboard/3.0.9 (Docker)';
```

### HTTP Headers Configuration

Custom headers sent with every Fire22 API request:

```typescript
headers: {
  'User-Agent': globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9',
  'X-Fire22-Platform': globalThis.TARGET_PLATFORM || process.platform,
  'X-Fire22-Version': '3.0.9',
  'Authorization': `Bearer ${this.config.token}`,
  'Content-Type': 'application/json'
}
```

## 🖥️ Platform-Specific Settings

### Windows Configuration

```typescript
{
  name: 'windows',
  platform: 'windows',
  arch: 'x64',
  execArgv: ['--smol', '--max-http-requests=256'],
  userAgent: 'Fire22-Dashboard/3.0.9 (Windows)',
  windows: {
    title: 'Fire22 API Client',
    publisher: 'Fire22 Development Team',
    version: '3.0.9.0',
    description: 'Fire22 API integration and management client',
    copyright: '© 2024 Fire22 Development Team. All rights reserved.',
    fileDescription: 'Fire22 API Client Executable',
    productName: 'Fire22 Dashboard System',
    companyName: 'Fire22 Development Team'
  }
}
```

### Linux Configuration

```typescript
{
  name: 'linux',
  platform: 'linux',
  arch: 'x64',
  variant: 'musl', // Static linking for compatibility
  execArgv: ['--smol', '--max-http-requests=512'],
  userAgent: 'Fire22-Dashboard/3.0.9 (Linux)'
}
```

### macOS Configuration

```typescript
{
  name: 'macos',
  platform: 'darwin',
  arch: 'arm64', // Apple Silicon native
  execArgv: ['--smol', '--max-http-requests=256'],
  userAgent: 'Fire22-Dashboard/3.0.9 (macOS)'
}
```

### Docker Configuration

```typescript
{
  name: 'docker',
  platform: 'linux',
  arch: 'x64',
  variant: 'musl',
  execArgv: ['--smol', '--max-http-requests=1024', '--inspect=0.0.0.0:9229'],
  userAgent: 'Fire22-Dashboard/3.0.9 (Docker)'
}
```

## ⚡ Runtime Flags & Arguments

### Platform-Specific Runtime Arguments

#### Windows Runtime Flags

```bash
--smol --max-http-requests=256
```

- `--smol`: Memory-optimized mode for Windows
- `--max-http-requests=256`: Conservative HTTP limit for Windows systems

#### Linux Runtime Flags

```bash
--smol --max-http-requests=512
```

- `--smol`: Memory-optimized mode
- `--max-http-requests=512`: Higher limit for server environments

#### macOS Runtime Flags

```bash
--smol --max-http-requests=256
```

- `--smol`: Memory-optimized mode for desktop
- `--max-http-requests=256`: Desktop-appropriate limit

#### Docker Runtime Flags

```bash
--smol --max-http-requests=1024 --inspect=0.0.0.0:9229
```

- `--smol`: Memory-optimized for containers
- `--max-http-requests=1024`: High limit for containerized services
- `--inspect=0.0.0.0:9229`: Debug port for development

### Runtime Flag Embedding

Runtime flags are embedded into executables at build time:

```typescript
// Build configuration
compile: {
  target: targetString,
  outfile,
  execArgv: target.execArgv || [] // Embedded into executable
}
```

## 🌍 Environment Variables

### Required Environment Variables

```bash
# Authentication
JWT_SECRET=your_jwt_secret_here
ADMIN_PASSWORD=your_admin_password

# Payment Integration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Communication Services
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_twilio_token

# System Configuration
CRON_SECRET=your_cron_secret
```

### Optional Environment Variables

```bash
# Database Configuration
DATABASE_NAME=fire22-dashboard
DATABASE_ID=35756984-dfe1-4914-b92e-511bdc8a194f

# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
CASHIER_BOT_TOKEN=your_cashier_bot_token

# Fire22 API Integration
FIRE22_API_URL=https://api.fire22.com
FIRE22_TOKEN=your_fire22_token
FIRE22_WEBHOOK_SECRET=your_webhook_secret

# Runtime Environment
NODE_ENV=production
BUN_CONFIG_VERBOSE_FETCH=false
BUN_CONFIG_MAX_HTTP_REQUESTS=512
```

### Environment Variable Utilities

```typescript
// Type-safe environment variable access
export function getEnvVar(name: string): string;
export function getEnvVarOptional(
  name: string,
  defaultValue?: string
): string | undefined;
export function getEnvVarNumber(name: string, defaultValue?: number): number;
export function getEnvVarBoolean(name: string, defaultValue?: boolean): boolean;
export function validateRequiredEnvVars(vars: string[]): void;
```

## 🪟 Windows Metadata

### PE Header Metadata

Windows executables include embedded metadata in the PE header:

```typescript
windows: {
  title: 'Fire22 API Client',                    // Window title
  publisher: 'Fire22 Development Team',          // Company/Publisher
  version: '3.0.9.0',                           // File version (4-part)
  description: 'Fire22 API integration client',  // File description
  copyright: '© 2024 Fire22 Development Team',   // Copyright notice
  fileDescription: 'Fire22 API Client Executable', // Detailed description
  productName: 'Fire22 Dashboard System',        // Product name
  companyName: 'Fire22 Development Team'         // Company name
}
```

### Windows File Properties

When viewing executable properties in Windows Explorer:

- **Description**: Fire22 API integration client
- **Product name**: Fire22 Dashboard System
- **Product version**: 3.0.9
- **File version**: 3.0.9.0
- **Copyright**: © 2024 Fire22 Development Team
- **Company**: Fire22 Development Team

## ⚡ SIMD & Performance Features

### SIMD Logger Configuration

```typescript
class SIMDLogger {
  private maxBufferSize = 1000; // Buffer size for batch processing

  // SIMD-accelerated ANSI stripping
  private stripANSI(text: string): string {
    if (globalThis.ENABLE_SIMD_ANSI && Bun.stripANSI) {
      return Bun.stripANSI(text); // Native SIMD acceleration
    }
    return text.replace(/\u001b\[[0-9;]*m/g, ''); // Fallback regex
  }
}
```

### Performance Logging Variables

```typescript
interface LogEntry {
  timestamp: number; // High-resolution timestamp
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string; // ANSI-stripped message
  platform: string; // Target platform identifier
  userAgent: string; // HTTP User-Agent string
}
```

### HTTP Performance Tracking

```typescript
// HTTP request performance metrics
logHttpRequest(method: string, url: string, status: number, duration: number): void {
  const userAgent = globalThis.USER_AGENT || 'Fire22-Dashboard/3.0.9';

  this.log('info', `🌐 HTTP ${method} ${url} - ${status} (${duration}ms)`, {
    userAgent,
    platform: globalThis.TARGET_PLATFORM
  });
}
```

## 🔧 Build Configuration

### Bun.build() Configuration

```typescript
const buildConfig = {
  entrypoints: [entrypointPath],
  outdir,
  target: 'bun',
  format: 'esm',
  minify: true, // Minification enabled
  sourcemap: false, // No source maps for production
  splitting: false, // Disabled for executables
  treeShaking: true, // Dead code elimination
  external: [
    // External dependencies
    'sqlite3',
    'better-sqlite3',
    'redis',
    'ioredis',
  ],
  define: {
    // All build-time constants injected here
    'process.env.NODE_ENV': '"production"',
    ENABLE_SIMD_ANSI: 'true',
    USER_AGENT: '"Fire22-Dashboard/3.0.9 (Linux)"',
    // ... more constants
  },
};
```

### Package.json sideEffects Configuration

```json
{
  "sideEffects": [
    "src/simd-logger.ts", // Logger has side effects (console output)
    "src/index.ts", // Main entry point has side effects
    "**/*.css", // CSS files have side effects
    "**/*.scss", // SCSS files have side effects
    "**/*.html" // HTML files have side effects
  ]
}
```

### Workspace Configuration

```json
{
  "fire22": {
    "workspace": "api-client",
    "isolation": {
      "standalone": true, // Can build independently
      "linked": true, // Can use workspace references
      "separateTests": true, // Isolated test environment
      "independentDeploy": true // Can deploy independently
    },
    "bunIsolated": true // Use Bun isolated installs
  }
}
```

## 📂 File Structure & Output

### Build Output Structure

```
dist/executables/
├── api-client/
│   ├── windows/
│   │   ├── fire22-api-client.exe     # Windows executable with metadata
│   │   └── index.js                  # Source bundle
│   ├── linux/
│   │   ├── fire22-api-client         # Linux static binary (musl)
│   │   └── index.js                  # Source bundle
│   ├── macos/
│   │   ├── fire22-api-client         # macOS ARM64 binary
│   │   └── index.js                  # Source bundle
│   └── docker/
│       ├── fire22-api-client         # Docker-optimized binary
│       └── index.js                  # Source bundle
├── fire22-dashboard.bat              # Windows launcher
├── fire22-dashboard.sh               # Unix launcher
├── docker-compose.yml                # Docker Compose configuration
├── Dockerfile                        # Docker container definition
└── README.md                         # Distribution documentation
```

### Launcher Scripts

#### Windows Launcher (`fire22-dashboard.bat`)

```batch
@echo off
title Fire22 Dashboard Worker
echo =====================================
echo Fire22 Dashboard Worker v3.0.9
echo =====================================
echo.
echo Starting Fire22 Dashboard...
"%~dp0\\api-client\\windows\\fire22-api-client.exe" %*
```

#### Unix Launcher (`fire22-dashboard.sh`)

```bash
#!/bin/bash
VERSION="3.0.9"
echo "====================================="
echo "Fire22 Dashboard Worker v$VERSION"
echo "====================================="

# Auto-detect platform
if [[ "$OSTYPE" == "darwin"* ]]; then
  PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  PLATFORM="linux"
fi

# Launch appropriate binary
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINARY="$SCRIPT_DIR/api-client/$PLATFORM/fire22-api-client"
exec "$BINARY" "$@"
```

## 🔍 Variable Reference Quick Guide

### Most Important Variables

```typescript
// Build-time constants (available via globalThis)
globalThis.VERSION; // "3.0.9"
globalThis.TARGET_PLATFORM; // "windows" | "linux" | "darwin" | "docker"
globalThis.USER_AGENT; // "Fire22-Dashboard/3.0.9 (Platform)"
globalThis.BUILD_TIME; // "2025-08-27T08:31:55.636Z"
globalThis.ENABLE_SIMD_ANSI; // true | false
globalThis.BUN_RUNTIME_FLAGS; // "--smol --max-http-requests=256"

// Environment variables (process.env / Bun.env)
NODE_ENV; // "production"
FIRE22_API_URL; // "https://api.fire22.com"
JWT_SECRET; // Authentication secret
DATABASE_URL; // Database connection string
```

### HTTP Configuration

```typescript
// Headers sent with every API request
'User-Agent': 'Fire22-Dashboard/3.0.9 (Linux)'
'X-Fire22-Platform': 'linux'
'X-Fire22-Version': '3.0.9'
'Authorization': 'Bearer your_token_here'
'Content-Type': 'application/json'
```

This documentation covers all variables, configurations, and build settings used
in the Fire22 Enhanced Executable Builder system. Each platform gets optimized
settings for maximum performance and proper identification.
