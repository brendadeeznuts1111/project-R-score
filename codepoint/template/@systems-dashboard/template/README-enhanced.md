# Enhanced Systems Dashboard Template

🖥️ **Professional Systems Dashboard with comprehensive Bun CLI integration, stdin processing, and file I/O utilities**

## 🚀 Quick Start

```bash
# Create project from template
bun create @systems-dashboard/template my-dashboard

# Navigate to project
cd my-dashboard

# Run setup with CLI options
bun run setup --dev --hot --watch

# Start development server
bun run dev
```

## ⚙️ Available Scripts

### Development
```bash
bun run dev              # Start development server with hot reload
bun run dev:port         # Start on custom port
bun run dev:host         # Start with custom host
bun run dev:inspect      # Start with debugging enabled
bun run dev:smol         # Start in memory-optimized mode
```

### Building & Production
```bash
bun run build            # Build for production
bun run build:analyze    # Build with bundle analysis
bun run build:prod       # Optimized production build
bun run build:smol       # Memory-optimized build
bun run start            # Run production build
bun run start:prod       # Run with production flags
```

### Testing
```bash
bun test                 # Run tests with watch
bun run test:ci          # Run tests with coverage
bun run test:debug       # Run tests with debugging
bun run test:smol        # Run tests in smol mode
```

### Code Quality
```bash
bun run lint             # Check code quality
bun run lint:fix         # Fix linting issues
bun run format           # Format code
bun run format:check     # Check formatting
bun run type-check       # TypeScript type checking
```

### 📡 Stdin Processing
```bash
bun run stdin:eval       # Echo test via stdin
bun run stdin:ts         # TypeScript via stdin
bun run stdin:config     # Process config via stdin
bun run stdin:watch      # Stream logs via stdin
bun run stdin:file       # Analyze file via stdin
bun run stdin:json       # Process JSON via stdin
```

### 📁 File I/O Operations
```bash
bun run file:read        # Read files with Bun.file()
bun run file:write       # Write files with Bun.write()
bun run file:copy        # Copy files efficiently
bun run file:analyze     # Analyze file structure
bun run file:stream      # Stream file content
```

### 🐳 Docker & Deployment
```bash
bun run docker:build     # Build Docker image
bun run docker:run      # Run in Docker container
bun run docker:dev       # Development Docker setup
```

### 🗄️ Database & Cache
```bash
bun run db:migrate       # Database migrations
bun run db:seed          # Seed database
bun run db:test          # Test database connection
bun run redis:connect    # Connect to Redis
bun run redis:flush      # Flush Redis cache
```

### 🔧 Performance & Analysis
```bash
bun run analyze          # Memory analysis
bun run benchmark        # Performance benchmarks
bun run profile          # Profiling with GC
bun run optimize         # Run optimization script
bun run audit            # Security audit
```

### 🌍 Environment Management
```bash
bun run env:dev          # Development environment
bun run env:prod         # Production environment
bun run env:test         # Test environment
```

### 🛠️ Setup & Maintenance
```bash
bun run setup            # Interactive setup
bun run setup:ci         # CI/CD setup
bun run setup:dev        # Development setup
bun run clean            # Clean build artifacts
bun run clean:all        # Full cleanup
bun run reset            # Reset and reinstall
```

## 🔧 Bun CLI Options Reference

### Core Execution Options
```bash
# Basic execution
bun run src/index.ts                    # Run TypeScript file
bun run --hot src/index.ts              # With hot reload
bun run --watch src/index.ts            # With file watching
bun run --inspect src/index.ts          # With debugging
bun run --smol src/index.ts             # Memory optimized

# Port and host configuration
bun run --port=8080 src/index.ts        # Custom port
bun run --host=0.0.0.0 src/index.ts     # Custom host
bun run --random-port src/index.ts      # Random port
```

### 📡 Stdin Processing
```bash
# Basic stdin
echo "Hello" | bun run -                 # Process stdin
echo '{"key": "value"}' | bun run -      # JSON stdin
echo 'console.log!("TS" as any)' | bun run -  # TypeScript stdin

# Advanced stdin
cat config.json | bun run src/processor.ts    # File to stdin
tail -f log.txt | bun run src/logger.ts       # Stream to stdin
curl api.data.com | bun run src/api-processor.ts  # API to stdin

# Stdin with options
echo "data" | bun run --smol -           # Memory-optimized stdin
echo "data" | bun run --console-depth=5 -  # Deep console inspection
```

### 📁 File I/O Operations
```bash
# Using Bun.file()
const file = Bun.file("data.txt");
await file.text();                       # Read as text
await file.json();                       # Parse as JSON
await file.stream();                     # Get stream
await file.arrayBuffer();                # Get ArrayBuffer
await file.bytes();                      # Get Uint8Array

# Using Bun.write()
await Bun.write("output.txt", "content");           # Write string
await Bun.write("data.bin", uint8Array);            # Write binary
await Bun.write("copy.txt", sourceFile);            # Copy file
await Bun.write("response.html", fetchResponse);    # Write from fetch

# File operations with CLI
bun run --define=DATA_FILE:config.json src/index.ts
bun run --env-file=.env.production src/index.ts
```

### 🔍 Debugging & Development
```bash
# Debugging options
bun run --inspect src/index.ts           # Start debugger
bun run --inspect-wait src/index.ts      # Wait for debugger
bun run --inspect-brk src/index.ts       # Break on start
bun run --break-on-start src/index.ts    # Break on start

# Console inspection
bun run --console-depth=2 src/index.ts   # Default depth
bun run --console-depth=5 src/index.ts   # Deep inspection
bun run --console-depth=10 src/index.ts  # Very deep inspection

# Editor integration
bun run --editor=vscode src/index.ts     # VS Code integration
bun run --editor=webstorm src/index.ts   # WebStorm integration
```

### ⚡ Performance Optimization
```bash
# Memory optimization
bun run --smol src/index.ts              # Reduced memory usage
bun run --expose-gc src/index.ts         # Expose garbage collector
bun run --zero-fill-buffers src/index.ts # Zero-fill buffers

# Performance profiling
bun run --title="My App" src/index.ts    # Custom process title
bun run --smol --expose-gc src/index.ts  # Combined optimization
```

### 🌐 Network & Security
```bash
# Network configuration
bun run --use-system-ca src/index.ts     # Use system CA certificates
bun run --max-header-size=32768 src/index.ts  # Max header size
bun run --dns-timeout=10s src/index.ts   # DNS timeout

# Database connections
bun run --sql-preconnect src/index.ts    # Pre-connect to SQL database
bun run --redis-preconnect src/index.ts  # Pre-connect to Redis
```

### 🔧 Build & Transpilation
```bash
# Build options
bun run --target=bun src/index.ts         # Target platform
bun run --target=node src/index.ts        # Node.js target
bun run --target=browser src/index.ts     # Browser target

# Output configuration
bun run --outdir=dist src/index.ts       # Output directory
bun run --minify src/index.ts            # Minify output
bun run --splitting src/index.ts         # Code splitting
bun run --sourcemap=linked src/index.ts   # Source maps

# Module handling
bun run --external=react,react-dom src/index.ts  # External dependencies
bun run --packages=@company/* src/index.ts       # Package bundling
bun run --format=esm src/index.ts               # Module format
```

### 📝 Environment & Configuration
```bash
# Environment variables
bun run --define=NODE_ENV:production src/index.ts
bun run --define=API_KEY:secret src/index.ts
bun run --define=DEBUG:true src/index.ts

# Configuration files
bun run --env-file=.env.dev src/index.ts
bun run --env-file=.env.prod src/index.ts
bun run --config=custom.bunfig.toml src/index.ts

# Working directory
bun run --cwd=/app src/index.ts           # Custom working directory
```

### 🧪 Testing & Coverage
```bash
# Test execution
bun test --watch                          # Watch mode
bun test --coverage                       # With coverage
bun test --coverage-threshold=80          # Coverage threshold
bun test --coverage-dir=reports           # Coverage directory

# Test configuration
bun test --timeout=30s                    # Test timeout
bun test --verbose                        # Verbose output
bun test --smol                           # Memory-optimized testing
```

### 🔄 Advanced Features
```bash
# JSX configuration
bun run --jsx-runtime=automatic src/index.ts
bun run --jsx-import-source=preact src/index.ts
bun run --jsx-factory=h src/index.ts
bun run --jsx-development src/index.ts

# Macros and experimental features
bun run --macro src/index.ts              # Enable macros
bun run --experimental src/index.ts       # Experimental features

# Preloading
bun run --preload=setup.ts src/index.ts   # Preload module
bun run --preload=database.ts src/index.ts
```

## 📁 Project Structure

```
my-dashboard/
├── src/
│   ├── index.ts              # Main application with CLI integration
│   ├── utils/
│   │   ├── stdin-processor.ts    # Stdin processing utilities
│   │   ├── log-processor.ts      # Log streaming utilities
│   │   ├── file-reader.ts        # File reading with Bun.file()
│   │   ├── file-writer.ts        # File writing with Bun.write()
│   │   ├── file-copy.ts          # File copying utilities
│   │   └── file-analyzer.ts      # File analysis utilities
│   └── dashboard.tsx          # React dashboard component
├── test/
│   └── file-io-stdin.test.ts  # Comprehensive test suite
├── scripts/
│   └── optimize.ts            # Performance optimization script
├── bunfig.toml               # Enhanced Bun configuration
├── package.json              # Dependencies and scripts
├── setup.ts                  # Intelligent setup script
├── README.md                 # This file
└── .env.example              # Environment template
```

## 🚀 Usage Examples

### Basic Development
```bash
# Start development server
bun run dev

# Start with custom port and debugging
bun run dev:port --port=8080 --inspect

# Start in memory-optimized mode
bun run dev:smol --smol --expose-gc
```

### Stdin Processing Examples
```bash
# Process JSON configuration
echo '{"port": 8080, "debug": true}' | bun run stdin:json

# Stream logs to processor
tail -f /var/log/app.log | bun run stdin:watch

# Analyze package.json via stdin
cat package.json | bun run stdin:file

# TypeScript evaluation
echo 'console.log!(2 + 2 as number)' | bun run stdin:ts
```

### File I/O Examples
```bash
# Read and analyze file
bun run file:read package.json
bun run file:analyze bunfig.toml

# Write and copy files
bun run file:write output.txt "Hello, Bun!"
bun run file:copy src.txt dest.txt

# Stream large files
bun run file:stream large-data.json
```

### Performance Optimization
```bash
# Run full optimization
bun run optimize --all --verbose

# Benchmark specific operations
bun run optimize --benchmark --io

# Profile memory usage
bun run optimize --profile --memory

# Analyze project structure
bun run optimize --analyze
```

### Docker Deployment
```bash
# Build and run Docker container
bun run docker:build
bun run docker:run

# Development with Docker
bun run docker:dev --port=8080
```

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://localhost:5432/myapp
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
CONSOLE_DEPTH=4
SMOL_MODE=false
EXPOSE_GC=false
```

### Bun Configuration
Edit `bunfig.toml`:
```toml
[install]
auto = true
cache = true
frozenLockfile = true

[dev]
port = 3000
hot = true
watch = true

[build]
target = "bun"
minify = true
sourcemap = "linked"

[test]
coverage = true
timeout = "30s"

[runtime]
consoleDepth = 4
smol = false
exposeGc = false
```

### Package.json Scripts
The template includes comprehensive scripts for all operations. Key scripts:

- **Development**: `dev`, `dev:port`, `dev:inspect`, `dev:smol`
- **Building**: `build`, `build:prod`, `build:smol`
- **Testing**: `test`, `test:ci`, `test:debug`
- **Stdin**: `stdin:eval`, `stdin:ts`, `stdin:config`
- **File I/O**: `file:read`, `file:write`, `file:analyze`
- **Performance**: `optimize`, `benchmark`, `profile`

## 🧪 Testing

The template includes a comprehensive test suite covering:

- **File I/O Operations**: Bun.file(), Bun.write(), streaming
- **Stdin Processing**: Text, JSON, TypeScript, streaming
- **CLI Integration**: Argument parsing, option handling
- **Performance**: Memory usage, execution speed
- **Integration**: End-to-end workflows

```bash
# Run all tests
bun test

# Run with coverage
bun run test:ci

# Run specific test file
bun test test/file-io-stdin.test.ts

# Run tests in smol mode
bun run test:smol
```

## 📊 Performance Features

### Memory Optimization
```bash
# Enable smol mode for reduced memory usage
bun run --smol src/index.ts

# Expose garbage collector for manual control
bun run --expose-gc src/index.ts
# Then call: global.gc()

# Zero-fill buffers for security
bun run --zero-fill-buffers src/index.ts
```

### File I/O Performance
- Uses Bun.file() for efficient file operations
- Supports streaming for large files
- Optimized for both small and large files
- Built-in caching and buffering

### Stdin Processing
- Efficient streaming processing
- Support for various data formats
- Real-time log processing
- JSON and TypeScript parsing

## 🔍 Debugging

### Chrome DevTools Integration
```bash
# Start with debugging
bun run --inspect src/index.ts

# Wait for debugger attachment
bun run --inspect-wait src/index.ts

# Break on first line
bun run --inspect-brk src/index.ts
```

Then open Chrome DevTools and navigate to `chrome://inspect`.

### Console Inspection
```bash
# Deep object inspection
bun run --console-depth=5 src/index.ts

# Limit console output
bun run --console-depth=2 src/index.ts
```

### Memory Profiling
```bash
# Profile memory usage
bun run --expose-gc --console-depth=5 src/index.ts

# Run memory analysis
bun run analyze --memory --profile
```

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment
bun run env:prod

# With custom configuration
bun run --define=NODE_ENV:production --port=80 src/index.ts
```

### Docker Deployment
```bash
# Build production image
bun run docker:build

# Run with environment variables
docker run -p 8080:3000 -e NODE_ENV=production my-dashboard
```

### Performance Optimization
```bash
# Production build with optimizations
bun run build:prod

# Run performance audit
bun run audit --production

# Optimize for production
bun run optimize --all --production
```

## 🛠️ Advanced Usage

### Custom CLI Arguments
The template supports extensive CLI argument parsing. Add custom arguments in `src/index.ts`:

```typescript
const cliArgs = {
  customArg: argv.find(arg => arg.startsWith("--custom="))?.split("=")[1],
  // ... other arguments
};
```

### File I/O Extensions
Extend file utilities in `src/utils/`:

```typescript
// Custom file processor
class CustomFileProcessor {
  static async process(filePath: string) {
    const file = Bun.file(filePath);
    // Custom processing logic
  }
}
```

### Stdin Processors
Create custom stdin processors:

```typescript
// Custom stdin handler
class CustomStdinProcessor {
  static async process() {
    const stdin = Bun.stdin;
    // Custom processing logic
  }
}
```

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Runtime API](https://bun.sh/docs/runtime)
- [Bun File I/O](https://bun.sh/docs/runtime/file-io)
- [Bun CLI Reference](https://bun.sh/docs/cli)
- [Elysia Framework](https://elysiajs.com)
- [React Documentation](https://react.dev)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**: Use `--port=8080` or kill existing process
2. **Memory issues**: Use `--smol` flag and `--expose-gc`
3. **File permissions**: Ensure write permissions for output directory
4. **TypeScript errors**: Check tsconfig.json and dependencies
5. **Stdin not working**: Ensure proper pipe syntax: `echo "data" | bun run -`

### Getting Help
```bash
# Show all CLI options
bun run --help

# Show Bun version
bun --version

# Check configuration
bun --config

# Run diagnostics
bun run optimize --analyze --verbose
```

---

**Built with ❤️ using Bun and enhanced with comprehensive CLI integration**
