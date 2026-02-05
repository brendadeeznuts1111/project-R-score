# 🖥️ Systems Dashboard - Bun CLI Configuration Manager

A comprehensive interactive dashboard for configuring and managing Bun runtime command-line interface features with real-time code generation, visual feedback, and advanced monitoring capabilities.

## ✨ Features

### 🎛️ Interactive Bun CLI Configuration

- **Console Settings**: Depth, max string length, colors, and formatting options
- **Optimization Controls**: Smol mode, minification, bundle size, and performance tuning
- **Networking Configuration**: Port, HTTP header size, DNS order, and security settings
- **Stdin/Stdout Management**: TypeScript support, JSX processing, and stream handling
- **Installation Options**: Auto-install modes, package preferences, and dependency management
- **Development Flags**: Hot reload, watch mode, and runtime options

### 📡 Advanced Bun Features

- **File Redirection**: `bun run - < file.js` examples with TypeScript conversion
- **BunFile Streams**: stdin/stdout/stderr as BunFile instances
- **Header Size Management**: Real-time validation and optimization
- **Global Configuration**: Environment files, working directory, and config files
- **Resolution Order**: Package.json scripts, source files, binaries, system commands

### 📊 Server Monitoring (Original Features)

- **Real-time Server Monitoring** - Live CPU, memory, and connection tracking
- **🎨 Beautiful Tables** - Advanced formatting with Bun's inspect API
- **📤 Multiple Export Formats** - JSON, CSV, HTML, and text exports
- **🔄 Live Updates** - Simulated real-time data streaming
- **📱 Responsive Design** - Mobile-friendly interface with Tailwind CSS

## 🚀 Quick Start

### Prerequisites

- Bun runtime installed
- Node.js 18+ (for Vite dev server)

### Installation

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/bun-table-demo.git
cd bun-table-demo/systems-dashboard

# Install dependencies
bun install
```

### CLI Usage

The systems-dashboard includes a powerful CLI tool for development and deployment:

```bash
# Show help and available commands
systems-dashboard --help
# or
sysdash --help

# Start development server with options
systems-dashboard dev --open --port 3000
systems-dashboard dev --host --https

# Build for production
systems-dashboard build
systems-dashboard build --analyze

# Preview production build
systems-dashboard preview --port 4173
systems-dashboard preview --host

# Type checking and linting
systems-dashboard type-check --watch
systems-dashboard lint --fix

# Code formatting
systems-dashboard format
systems-dashboard format --check

# Project information
systems-dashboard info
```

### Development Scripts

```bash
# Start development server
bun run dev

# Open http://localhost:5173 in your browser
```

## 📖 Bun CLI Configuration Guide

### Interactive Configuration Panel

#### 🔧 Console Settings

- **Depth**: Control object inspection depth (Default: 2)
- **Max String Length**: Set maximum string display length (1k-50k)
- **Colors**: Enable/disable colored console output
- **Show Hidden**: Show hidden object properties
- **Compact**: Compact output format

#### ⚡ Optimization Controls

- **Smol Mode**: Use less memory, but run garbage collection more often
- **Minify**: Code minification for production
- **Compress**: Enable compression
- **Bundle Size**: Choose between smol, tiny, minified, or default
- **Target**: Target platform (bun, node, browser, deno)
- **Platform**: Target OS (linux, macos, windows, neutral)

#### 🌐 Networking Configuration

- **Port**: Set server port (Default: 3000)
- **Header Size**: Configure HTTP header size limit (Default: 16KiB)
- **DNS Order**: Choose verbatim (default), IPv4 first, or IPv6 first
- **CA Store**: System, OpenSSL, or bundled certificates
- **Database Preconnect**: Redis and PostgreSQL preconnection
- **User Agent**: Custom HTTP User-Agent header

#### 📡 Stdin Configuration

- **TypeScript**: Auto-treat stdin as TypeScript
- **JSX Support**: Enable JSX syntax in stdin
- **Transform**: Enable data transformation
- **File Redirect**: Support for file redirection
- **Direct Execution**: No temporary files

#### 📦 Installation Options

- **Auto Install**: Auto, fallback, or force modes
- **Prefer Offline**: Use offline packages when possible
- **Prefer Latest**: Always use latest package versions
- **Preserve Symlinks**: Maintain symbolic links

#### 🚩 Development Flags

- **Hot Reload**: Hot module replacement
- **Watch Mode**: File watching
- **Bun Runtime**: Enable Bun-specific features

### Quick Actions

#### 🔄 Reset to Defaults

Restores all settings to their default configuration:

```typescript
{
  stdin: { enabled: true, treatAsTypeScript: true, jsxSupport: true },
  console: { depth: 2, colors: true, maxStringLength: 10000 },
  optimization: { smol: false, minify: false, compress: true },
  networking: { port: 3000, maxHttpHeaderSize: 16384, dnsResultOrder: 'verbatim' },
  flags: { hot: false, watch: false, bun: true }
}
```

#### ⚡ Performance Mode

Optimizes for maximum performance:

```typescript
{
  optimization: { smol: true, minify: true, compress: true, treeShaking: true },
  networking: { maxHttpHeaderSize: 32768, dnsResultOrder: 'ipv4first' },
  flags: { hot: true, watch: true }
}
```

#### 🛠️ Development Mode

Enhanced debugging and development features:

```typescript
{
  console: { depth: 15, colors: true, maxStringLength: 50000 },
  flags: { hot: true, watch: true },
  stdin: { treatAsTypeScript: true, jsxSupport: true }
}
```

## 🚀 Advanced Bun Features

### Stdin Pipe Examples

#### Basic Execution

```bash
echo "console.log('Hello')" | bun run -
```

#### TypeScript in Stdin

```bash
echo "const x: number = 42; console.log(x);" | bun run -
```

#### JSX Components

```bash
echo "const jsx = <div>Hello JSX</div>;" | bun run -
```

#### File Redirection

```bash
# Create .js file with TypeScript code
echo "console.log!('This is TypeScript!' as any)" > secretly-typescript.js

# Run as TypeScript
bun run - < secretly-typescript.js
```

### BunFile Stream Management

#### Using Bun.stdin

```javascript
const stdin = Bun.stdin;
console.log("Type:", stdin.constructor.name);
console.log("Size:", await stdin.size());

for await (const chunk of stdin) {
  const data = decoder.decode(chunk);
  await Bun.stdout.write("Processed: " + data);
}
```

#### Header Size Validation

```javascript
const validateHeaderSize = (headers) => {
  const maxSize = 16384; // 16KB default
  const headerString = JSON.stringify(headers);
  const headerSize = new Blob([headerString]).size;

  return {
    valid: headerSize <= maxSize,
    size: headerSize,
    maxSize: maxSize,
    percentage: ((headerSize / maxSize) * 100).toFixed(1) + "%"
  };
};
```

### Global Configuration

#### Environment Files

```bash
# Load custom environment
bun --env-file .env.production run server.js

# Multiple environment files
bun --env-file .env --env-file .env.local run server.js
```

#### Working Directory

```bash
# Custom working directory
bun --cwd ./src run server.js

# Absolute path
bun --cwd /home/user/project run server.js
```

#### Config Files

```bash
# Custom config file
bun --config ./custom-bunfig.toml run server.js

# Using alias
bun -c ./custom-bunfig.toml run server.js
```

## 🔧 Configuration Reference

### Console Options

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `depth` | `number` | `2` | `--console-depth` | Object inspection depth |
| `maxStringLength` | `number` | `10000` | N/A | Maximum string display length |
| `colors` | `boolean` | `true` | N/A | Enable colored output |
| `showHidden` | `boolean` | `false` | N/A | Show hidden properties |
| `compact` | `boolean` | `false` | N/A | Compact output format |

### Optimization Options

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `smol` | `boolean` | `false` | `--smol` | Memory optimization (more GC) |
| `minify` | `boolean` | `false` | N/A | Code minification |
| `compress` | `boolean` | `true` | N/A | Enable compression |
| `bundleSize` | `string` | `"default"` | N/A | Bundle size preset |
| `target` | `string` | `"bun"` | N/A | Target platform |
| `platform` | `string` | `"neutral"` | N/A | Target OS platform |

### Networking Options

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `port` | `number` | `3000` | `--port` | Default port for `Bun.serve` |
| `protocol` | `string` | `"http"` | N/A | Server protocol (http/https/http2) |
| `maxHttpHeaderSize` | `number` | `16384` | `--max-http-header-size` | HTTP header limit (16KiB) |
| `dnsResultOrder` | `string` | `"verbatim"` | `--dns-result-order` | DNS lookup result priority |
| `useSystemCa` | `boolean` | `false` | `--use-system-ca` | Use system trusted CAs |
| `redisPreconnect` | `boolean` | `false` | `--redis-preconnect` | Preconnect to Redis at startup |
| `sqlPreconnect` | `boolean` | `false` | `--sql-preconnect` | Preconnect to Postgres at startup |

### Security & Installation

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `minimumReleaseAge` | `number` | `0` | `--minimum-release-age` | Min age for packages in seconds |
| `minimumReleaseAgeExcludes` | `string[]` | `[]` | N/A | Trusted packages to exclude |

#### Security & Supply Chain Examples

```bash
# Only install package versions published at least 3 days ago (259200 seconds)
bun add <package> --minimum-release-age 259200

# Configure globally in bunfig.toml
# [install]
# minimumReleaseAge = 259200
# minimumReleaseAgeExcludes = ["@types/node", "typescript"]
```

### Project Initialization (`bun init`)

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `yes` | `boolean` | `false` | `-y` | Accept all defaults |
| `npm` | `boolean` | `false` | `-m` | Minimal (type defs only) |
| `react` | `string` | `N/A` | `--react` | Scaffold a React app |
| `react=tailwind` | `string` | `N/A` | `--react=tailwind` | React app + Tailwind CSS |
| `react=shadcn` | `string` | `N/A` | `--react=shadcn` | React app + @shadcn/ui + Tailwind |

### Project Creation (`bun create`)

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `template` | `string` | N/A | `<template>` | Template name, GitHub repo, or local path |
| `destination` | `string` | `"."` | `[<destination>]` | Directory to create project in |
| `force` | `boolean` | `false` | `--force` | Overwrite existing files |
| `noInstall` | `boolean` | `false` | `--no-install` | Disable auto install |
| `noGit` | `boolean` | `false` | `--no-git` | Disable git initialization |
| `open` | `boolean` | `false` | `--open` | Open in default editor |

> 💡 **Pro Tip**: Use the `/suggest` command in the dashboard's integrated terminal to get AI-powered configuration recommendations tailored to your specific project!

#### `bun create` Local Templates

Bun’s templater can be extended to support custom templates defined on your local file system. These templates should live in one of the following directories:

- **Global**: `$HOME/.bun-create/<name>`
- **Project**: `<project root>/.bun-create/<name>`

You can customize the global template path by setting the `BUN_CREATE_DIR` environment variable.

To create a local template, navigate to `$HOME/.bun-create` and create a new directory with the desired name of your template:

```bash
cd $HOME/.bun-create
mkdir foo
cd foo
```

#### `bun-create` Setup Logic

Templates can define custom setup logic in their `package.json` using the `"bun-create"` field. This allows for powerful automation during project scaffolding:

```json
{
  "name": "@bun-examples/simplereact",
  "version": "0.0.1",
  "main": "index.js",
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2"
  },
  "bun-create": {
    "preinstall": "echo 'Scaffolding starting...'",
    "postinstall": [
      "echo 'Dependencies installed!'",
      "bun run build"
    ],
    "start": "bun run echo 'Hello world! Ready to code.'"
  }
}
```

- **`preinstall`**: A single command or array of commands to run **before** `bun install`.
- **`postinstall`**: A single command or array of commands to run **after** `bun install`.
- **`start`**: The command to run when the user executes the template.

#### `bun create` Execution Steps

When you run `bun create`, the following steps are performed:

1. **Download the template**: Fetches the specified template or repository.
2. **Copy files**: Moves all template files into the destination folder.
3. **Install dependencies**: Runs `bun install` automatically (unless `--no-install` is used).
4. **Initialize Git**: Sets up a fresh Git repo (unless `--no-git` is used).
5. **Run start script**: Executes the template's configured start script, if defined.

*Note: By default, Bun will not overwrite any existing files. **Use the `--force` flag to overwrite existing files.***

#### `bun create` Examples

```bash
# Create from a template
bun create <template> [<destination>]

# Create from GitHub repository
bun create <user>/<repo> [<destination>]
bun create github.com/<user>/<repo> [<destination>]

# Force overwrite existing directory
bun create --force <template> [<destination>]

# Create without installing dependencies
bun create --no-install <template> my-app

# Create without git repository
bun create --no-git <template> my-app
```

#### `bun init` Examples

```bash
# Accept all defaults
bun init -y

# Scaffold a React app
bun init --react

# React with Tailwind CSS
bun init --react=tailwind

# React with shadcn/ui
bun init --react=shadcn

# Use npm for dependencies
bun init -y -m
```

### Advanced Reference Options

| Option | Type | Default | CLI Flag | Description |
| :--- | :--- | :--- | :--- | :--- |
| `port` | `number` | `3000` | `--port` | Default port for `Bun.serve` |
| `protocol` | `string` | `"http"` | N/A | Server protocol (http/https/http2) |
| `maxHttpHeaderSize` | `number` | `16384` | `--max-http-header-size` | HTTP header limit (16KiB) |
| `dnsResultOrder` | `string` | `"verbatim"` | `--dns-result-order` | DNS lookup result priority |
| `useSystemCa` | `boolean` | `false` | `--use-system-ca` | Use system trusted CAs |
| `redisPreconnect` | `boolean` | `false` | `--redis-preconnect` | Preconnect to Redis at startup |
| `sqlPreconnect` | `boolean` | `false` | `--sql-preconnect` | Preconnect to Postgres at startup |

## 🎯 Use Cases

### Development

- Configure hot reload and watch mode
- Set up TypeScript and JSX support
- Optimize console output for debugging
- Configure development server settings

### Production

- Enable smol mode for maximum optimization
- Configure HTTP headers and security
- Set up production networking
- Optimize bundle size and performance

### Testing

- Configure test environment settings
- Set up mock data streams
- Configure header limits for API testing
- Test different resolution orders

## 🛠️ Technical Stack

- **React 18** - Modern UI framework
- **TypeScript** - Full type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Bun Runtime** - High-performance JavaScript runtime
- **Commander.js** - Professional CLI framework
- **Chalk** - Beautiful terminal colors
- **Ora** - Elegant terminal spinners

## 📊 Data Structures

### **BunCommandLine Interface**

```typescript
interface BunCommandLine {
  stdin?: {
    enabled: boolean;
    pipeFrom?: string;
    encoding?: "utf8" | "buffer" | "json";
    transform?: boolean;
    filter?: string;
    treatAsTypeScript?: boolean;
    jsxSupport?: boolean;
    fileRedirect?: boolean;
    temporaryFile?: boolean;
    directExecution?: boolean;
  };
  stdout?: {
    encoding?: "utf8" | "buffer" | "json";
    pipeTo?: string;
    append?: boolean;
  };
  stderr?: {
    encoding?: "utf8" | "buffer" | "json";
    pipeTo?: string;
    append?: boolean;
  };
  console?: {
    depth?: number;
    maxStringLength?: number;
    showHidden?: boolean;
    colors?: boolean;
    compact?: boolean;
    breakLength?: number;
    getters?: boolean;
    proxy?: boolean;
    iterableLimit?: number;
    maxArrayLength?: number;
    maxBufferLength?: number;
  };
  optimization?: {
    smol?: boolean;
    minify?: boolean;
    compress?: boolean;
    treeShaking?: boolean;
    deadCodeElimination?: boolean;
    inlineFunctions?: boolean;
    constantFolding?: boolean;
    bundleSize?: "smol" | "tiny" | "minified" | "default";
    target?: "bun" | "node" | "browser" | "deno";
    platform?: "linux" | "macos" | "windows" | "neutral";
  };
  networking?: {
    port?: number;
    fetchPreconnect?: string[];
    maxHttpHeaderSize?: number;
    dnsResultOrder?: "verbatim" | "ipv4first" | "ipv6first";
    useSystemCa?: boolean;
    useOpensslCa?: boolean;
    useBundledCa?: boolean;
    redisPreconnect?: boolean;
    sqlPreconnect?: boolean;
    userAgent?: string;
  };
  flags?: {
    hot?: boolean;
    watch?: boolean;
    smol?: boolean;
    bun?: boolean;
    version?: boolean;
    help?: boolean;
    eval?: string;
    print?: string;
    preload?: string[];
    import?: string[];
    external?: string[];
    define?: Record<string, string>;
    cwd?: string;
    env?: Record<string, string>;
  };
  execution?: {
    entryPoint?: string;
    arguments?: string[];
    workingDirectory?: string;
    nodeOptions?: string[];
    maxHeap?: string;
    heapLimit?: string;
  };
}
```

## 🎨 Features Demonstration

### **Bun Environment Diagnostics (v1.3.5)**

The Systems Dashboard is optimized for Bun **1.3.5** (`1e86cebd`). Below is the current API availability status within the dashboard's environment:

| Feature | Status | API Location |
| :--- | :--- | :--- |
| **Table API** | ✅ Supported | `Bun.inspect.table` |
| **S3 API** | ✅ Supported | `Bun.s3` |
| **Password Hashing** | ✅ Supported | `Bun.password` |
| **File System** | ✅ Supported | `Bun.file` / `Bun.write` |
| **HTTP Server** | ✅ Supported | `Bun.serve` |
| **SQLite** | ✅ Supported | `import { Database } from "bun:sqlite"` |
| **FFI** | ✅ Supported | `import { dlopen } from "bun:ffi"` |
| **Feature Flags** | ⚠️ Limited | Internal runtime only |

#### **1. Interactive CLI Configuration**

- Real-time parameter adjustment
- Visual feedback for all settings
- Dynamic code generation

### **2. Advanced Features**

- File redirection examples
- BunFile stream management
- Header size validation

### **3. Server Monitoring** (Original)

- Real-time server metrics
- Auto-refreshing data
- Interactive controls

## 🔧 Configuration

### **Vite Configuration**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
```

### **TypeScript Configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

## 📈 Performance

- **⚡ Fast Development** - Vite HMR with Bun
- **🚀 Quick Builds** - Optimized production bundles
- **💾 Lightweight** - Minimal dependencies
- **🔄 Real-time Updates** - Efficient data streaming
- **🎛️ Interactive Controls** - Instant configuration updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## **Built with ❤️ for the Bun community**
