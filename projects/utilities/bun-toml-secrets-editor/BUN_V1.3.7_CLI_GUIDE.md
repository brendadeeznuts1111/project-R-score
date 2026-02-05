# Bun v1.3.7 Performance CLI - Complete Guide

## 🚀 Quick Start

The Bun v1.3.7 Performance CLI is ready to use! This comprehensive tool tests and benchmarks all the new performance features in Bun v1.3.7.

### Installation & Usage

```bash
# Use the CLI directly (current setup)
bun run cli:v1.3.7 --help

# Or extract and install globally
cd dist
tar -xzf bun-v1.3.7-performance-cli.tar.gz
cd bun-v1.3.7-cli
bun install
# Then use: bun bin/bun-v1.3.7-cli.ts --help
```

## 📋 Available Commands

### 1. **System Check**
```bash
bun run cli:v1.3.7 check              # Basic compatibility check
bun run cli:v1.3.7 check --verbose     # Detailed system info
```

### 2. **Performance Demos**
```bash
bun run cli:v1.3.7 demo                # Run all demos
bun run cli:v1.3.7 demo --buffer       # Buffer/array demos only
bun run cli:v1.3.7 demo --string       # String performance demos
bun run cli:v1.3.7 demo --json         # JSON5/JSONL demos
bun run cli:v1.3.7 demo --profiling    # Profiling demos
```

### 3. **Interactive Demo**
```bash
bun run cli:v1.3.7 interactive          # Interactive menu system
```

### 4. **Comprehensive Benchmarks**
```bash
bun run cli:v1.3.7 bench                # Run all benchmarks
bun run cli:v1.3.7 bench --feature buffer  # Benchmark specific feature
bun run cli:v1.3.7 bench --profile      # Enable CPU profiling
bun run cli:v1.3.7 bench --output results.txt  # Save results
```

### 5. **One-Liners**
```bash
bun run cli:v1.3.7 oneliners            # Show copy-paste commands
bun run cli:v1.3.7 oneliners --copy     # Copy to clipboard
```

### 6. **Profiling**
```bash
bun run cli:v1.3.7 profile script.ts    # Profile with default settings
bun run cli:v1.3.7 profile script.ts --cpu --heap  # Both CPU and heap
bun run cli:v1.3.7 profile script.ts --interval 500  # Custom interval
```

### 7. **Testing**
```bash
bun run cli:v1.3.7 test                 # Run all tests
bun run cli:v1.3.7 test --unit          # Unit tests only
bun run cli:v1.3.7 test --coverage      # With coverage report
```

### 8. **Packaging Preparation**
```bash
bun run cli:v1.3.7 prepare              # Prepare for distribution
bun run cli:v1.3.7 prepare --dry-run    # Show what would be done
```

## 🎯 Performance Features Covered

### ⚡ **Buffer/Array Speed Demons**
- **50% faster** `Buffer.from(array)` on ARM64
- **3x faster** `array.flat()` and `Array.from(arguments)`

### 📏 **String Performance**  
- **90% faster** `padStart/padEnd` operations
- **5.2-5.4x faster** `String.isWellFormed/toWellFormed`

### 🔄 **Async/Await Streaming**
- **35% faster** async/await streaming operations
- Optimized JSONL streaming parsing

### 🎨 **CLI Magic**
- **88x faster** `Bun.wrapAnsi()` vs wrap-ansi npm package
- Native ANSI-aware text wrapping

### 📄 **JSON Processing**
- Native `Bun.JSON5` parsing (comments, trailing commas)
- Streaming `Bun.JSONL` parsing for large datasets

### 🔄 **Buffer Operations**
- **1.8x faster** `Buffer.swap16()`
- **3.6x faster** `Buffer.swap64()`

### 📊 **Profiling & Telemetry**
- Markdown CPU profiles (`--cpu-prof-md`)
- Heap profiling with Markdown output
- Enhanced inspector API support

### 🌐 **HTTP/WebSocket**
- Header case preservation in `fetch()`
- WebSocket URL credentials support

## 📦 Distribution Package

The CLI has been packaged for distribution:

```bash
# Location
dist/bun-v1.3.7-performance-cli.tar.gz

# Contents
├── bin/
│   └── bun-v1.3.7-cli.ts          # Main CLI executable
├── examples/
│   ├── bun-v1.3.7-oneliners.ts    # Performance demos
│   ├── benchmarks/
│   │   └── bun-v1.3.7-performance-bench.ts
│   ├── bun-v1.3.7-interactive-demo.ts
│   └── bun-v1.3.7-quick-oneliners.sh
├── package.json                    # Standalone package config
└── README.md                       # Usage documentation
```

## 🔧 Quick One-Liner Reference

### Buffer Performance
```bash
bunx -e "console.time();for(let i=0;i<1e6;i++)Buffer.from([i%256]);console.timeEnd()"
```

### String Padding
```bash
bunx -e "console.time();for(let i=0;i<1e6;i++)'2026'.padStart(20,'0');console.timeEnd()"
```

### JSON5 Parsing
```bash
bunx -e "console.log(Bun.JSON5.parse('{foo:1,//comment\nbar:2,}'))"
```

### JSONL Streaming
```bash
echo '{"a":1}\n{"b":2}' | bunx -e "for await(const obj of Bun.JSONL.parse(Bun.stdin()))console.log(obj)"
```

### ANSI Wrapping
```bash
bunx -e "console.log(Bun.wrapAnsi('\x1b[32m🚀 Bun v1.3.7\x1b[0m',{width:40}))"
```

### Profiling
```bash
bun --cpu-prof-md --cpu-prof-interval 1000 server.ts
```

## 🎯 Next Steps

1. **Test the CLI**: Run `bun run cli:v1.3.7 interactive` for the full experience
2. **Benchmark your system**: Use `bun run cli:v1.3.7 bench` to see performance gains
3. **Profile your apps**: Use `bun run cli:v1.3.7 profile your-script.ts`
4. **Share the package**: Distribute `dist/bun-v1.3.7-performance-cli.tar.gz`

## 📊 System Requirements

- **Bun**: v1.3.7 or higher (for full feature support)
- **Platform**: macOS, Linux, Windows
- **Architecture**: ARM64 or x64 (ARM64 sees biggest gains)

## 🚀 Production Ready

This CLI tool is production-ready and includes:
- ✅ Comprehensive error handling
- ✅ System compatibility checking
- ✅ Performance benchmarking
- ✅ Interactive demo mode
- ✅ Packaging for global distribution
- ✅ Full TypeScript support
- ✅ Cross-platform compatibility

**Ready to test Bun v1.3.7 performance improvements! 🎉**
