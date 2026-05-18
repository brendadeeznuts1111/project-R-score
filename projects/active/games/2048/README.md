# CRC32 SQL Toolkit

CRC32 SQL integration toolkit with audit trail and batch processing.

## Project Structure

```text
2048/
├── src/                    # Core source files
├── utils/                  # Utility functions
├── workers/                # Web workers for parallel processing
├── test/                   # Test files
├── demos/                  # Demo scripts (38 files)
├── benchmarks/             # Benchmark scripts (4 files)
├── scripts/                # CLI tools and scripts (11 files)
├── docs/                   # Documentation (9 files)
├── data/                   # Database files
├── benchmark-data/         # Benchmark artifacts
├── web/                    # HTML/CSS files
├── tools/                  # Export tools
├── analytics/              # ML analytics
├── dashboard/              # Dashboard components
├── config/                 # Configuration files
├── examples/               # Example files
├── migrations/             # Database migrations
├── queries/                # SQL queries
├── routes/                 # Route handlers
├── system/                 # System utilities
├── types/                  # TypeScript types
├── profiles/               # Performance profiles
├── performance-results/   # Benchmark results
└── dist/                  # Built output
```

## Quick Start

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run dashboard
bun run dashboard

# Run demos
bun run demo:enhanced
bun run demo:simple
bun run demo:dashboard
```

## Available Commands

| Command | Description |
|---------|-------------|
| `bun run dashboard` | Start real-time audit dashboard |
| `bun run demo:enhanced` | Run enhanced features demo |
| `bun run demo:simple` | Run simple demo |
| `bun run test:enhanced` | Run enhanced feature tests |
| `bun run build` | Build web assets |
| `bun run dev` | Start development server |
| `bun run serve` | Start production server |

## Documentation

See the `docs/` folder for detailed documentation:
- `DEPLOYMENT-GUIDE.md` - Deployment instructions
- `IMPLEMENTATION-SUMMARY.md` - Implementation details
- `PERFORMANCE_ANALYSIS_README.md` - Performance analysis
- `PERFORMANCE_TOOLKIT_README.md` - Performance toolkit guide
- `README-ENHANCED-FEATURES.md` - Enhanced features guide
- `README-PUBLISHING.md` - Publishing instructions

## License

MIT
