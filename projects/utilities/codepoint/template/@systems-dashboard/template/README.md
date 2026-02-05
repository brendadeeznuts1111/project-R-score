# 🖥️ Systems Dashboard

A React-based server monitoring dashboard showcasing Bun's `inspect.table()` capabilities with real-time data visualization.

## ✨ Features

- **📊 Real-time Server Monitoring** - Live CPU, memory, and connection tracking
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

### CLI Commands Reference

| Command      | Description              | Options                                 |
| ------------ | ------------------------ | --------------------------------------- |
| `dev`        | Start development server | `--port`, `--host`, `--open`, `--https` |
| `build`      | Build for production     | `--analyze`, `--watch`                  |
| `preview`    | Preview production build | `--port`, `--host`                      |
| `type-check` | Run TypeScript checks    | `--watch`                               |
| `lint`       | Run ESLint               | `--fix`                                 |
| `format`     | Format with Prettier     | `--check`                               |
| `clean`      | Clean build artifacts    | -                                       |
| `info`       | Show project info        | -                                       |

### Development Scripts

```bash
# Start development server
bun run dev

# Open http://localhost:3000 in your browser
```

### Build & Deploy

```bash
# Build for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run type-check
```

## 🎯 Usage Examples

### **Server Monitoring**

- View real-time server metrics
- Track CPU and memory usage
- Monitor connection counts
- Health status indicators

### **Table Export**

- Export server data as JSON
- Generate CSV reports
- Create HTML documentation
- Copy formatted tables

### **Code Generation**

- Generate Bun.inspect.table() code
- Copy table configurations
- Export data structures

## 🛠️ Technical Stack

- **React 18** - Modern UI framework
- **TypeScript** - Full type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Bun Runtime** - High-performance JavaScript runtime
- **Commander.js** - Professional CLI framework
- **Chalk** - Beautiful terminal colors
- **Ora** - Elegant terminal spinners

## 🎯 CLI Features

### **Professional Command Line Interface**

- **Rich Help System** - Detailed command documentation
- **Progress Indicators** - Visual feedback for long operations
- **Colored Output** - Beautiful terminal styling
- **Error Handling** - Graceful error reporting
- **Multiple Aliases** - `systems-dashboard` and `sysdash`

### **Development Tools**

- **Hot Reload** - Fast development server with HMR
- **Custom Ports** - Flexible port configuration
- **Network Access** - Expose dev server to network
- **HTTPS Support** - Secure development environment
- **Auto Browser** - Open browser automatically

### **Build & Deploy**

- **Production Builds** - Optimized bundle generation
- **Bundle Analysis** - Visual bundle size analysis
- **Preview Server** - Test production builds locally
- **Clean Scripts** - Remove build artifacts
- **Watch Modes** - Rebuild on file changes

### **Code Quality**

- **Type Checking** - TypeScript validation
- **Linting** - ESLint with auto-fix
- **Formatting** - Prettier code formatting
- **Watch Modes** - Continuous quality checks

## 📊 Data Structures

### **ServerMonitoringData Interface**

```typescript
interface ServerMonitoringData {
  id: string;
  name: string;
  region: string;
  cpu: number;
  memory: number;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  connections: number;
  lastUpdate: Date;
}
```

### **APIEndpointInfo Interface**

```typescript
interface APIEndpointInfo {
  method: "GET" | "POST" | "PUT" | "DELETE" | "WS";
  path: string;
  component: string;
  latency: number;
  auth: "none" | "required" | "optional";
  description: string;
  status: "active" | "deprecated" | "experimental";
}
```

### **SystemPerformanceMetric Interface**

```typescript
interface SystemPerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  threshold: number;
  status: "healthy" | "warning" | "critical";
  lastUpdate: Date;
}
```

## 🎨 Features Demonstration

### **1. Live Dashboard**

- Real-time server metrics
- Auto-refreshing data
- Interactive controls

### **2. Table Visualization**

- Sortable columns
- Status indicators
- Performance metrics

### **3. Export Functionality**

- Multiple format support
- One-click downloads
- Code generation

## 🔧 Configuration

### **Vite Configuration**

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ using [Bun](https://bun.sh) and React**
