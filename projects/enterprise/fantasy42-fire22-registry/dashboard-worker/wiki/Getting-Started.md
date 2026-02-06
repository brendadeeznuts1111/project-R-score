# Getting Started with Fire22 Dashboard Worker

Welcome to Fire22 Dashboard Worker! This guide will help you get up and running
quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Bun** >= 1.2.20 ([Download](https://bun.sh/))
- **Git** for version control
- **Cloudflare account** (for deployment)
- **PostgreSQL** (for local development)

### Optional but Recommended

- **VS Code** with recommended extensions
- **Docker** for containerized development
- **wrangler** CLI for Cloudflare Workers

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/brendadeeznuts1111/fire22-dashboard-worker.git
cd fire22-dashboard-worker

```

### 2. Install Dependencies

```bash
bun install --frozen-lockfile
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Database Setup

```bash
# Run database setup script
bun run setup-db

```

### 5. Start Development Server

```bash
# Start in development mode
bun run dev

```

Your dashboard should now be available at: `http://localhost:8080`

## Development Workflow

### Daily Development Commands

```bash
# Start development server
bun run dev

# Run tests
bun test

# Run linting
bun run lint

# Type checking
tsc --noEmit

# Build for production
bun run build:production

```

### Workspace Commands

```bash
# Check workspace status
fire22-workspace status

# Run benchmarks
fire22-workspace benchmark

# Split workspaces
fire22-workspace split --dry-run

```

## Project Structure

```text
fire22-dashboard-worker/
├── src/                    # Source code
│   ├── api/               # API endpoints
│   ├── patterns/          # Pattern weaver system
│   └── ...
├── workspaces/            # Individual workspace modules
│   ├── @fire22-core-dashboard/
│   ├── @fire22-pattern-system/
│   └── ...
├── scripts/               # Build and utility scripts
├── docs/                  # Documentation
├── bench/                 # Benchmarking tools
└── .github/              # GitHub workflows and templates
```

## Core Concepts

### 1. Multi-Workspace Architecture

The project is organized into 6 specialized workspaces:

- **Core Dashboard**: Main UI and functionality
- **Pattern System**: Advanced pattern weaver
- **API Client**: Fire22 API integration
- **Sports Betting**: Betting management
- **Telegram Integration**: Bot and P2P systems
- **Build System**: Build tools and automation

### 2. Pattern Weaver System

A unified pattern system that provides:

- 13 unified patterns (LOADER, STYLER, TABULAR, etc.)
- Auto-connection between related patterns
- Advanced stream processing
- Security scanning integration

### 3. Bun-Native Performance

- Direct TypeScript execution
- Native SQLite integration
- Optimized build pipeline
- Nanosecond precision timing

## Essential Commands

### Testing

```bash
bun test                    # All tests
bun test --watch           # Watch mode
bun test --coverage        # With coverage
bun run test:quick         # Quick validation
bun run test:checklist     # Comprehensive tests
```

### Building

```bash
bun run build             # Standard build
bun run build:production  # Optimized production
bun run build:quick       # Fast development
bun run build:executable  # Cross-platform binaries

```

### Development Tools

```bash
bun run dev-flow find "pattern"  # Search codebase
bun run flow api                 # Find API endpoints
bun run health:comprehensive     # Health check
bun run env:validate            # Environment validation

```

### Deployment

```bash
bun run deploy:staging     # Deploy to staging
bun run deploy:production  # Deploy to production
wrangler tail              # Live logs
```

## Configuration

### Environment Variables

Key environment variables to configure:

```bash
# Core Configuration
NODE_ENV=development
PORT=8080

# Cloudflare
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Database
DATABASE_URL=postgresql://localhost:5432/fire22_dashboard

# Fire22 API
FIRE22_API_KEY=your_api_key
FIRE22_BASE_URL=https://api.fire22.com

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
```

### Workspace Configuration

Each workspace has its own configuration in `workspace-config.json`:

- Bundle size limits
- Cloudflare Workers settings
- Dependency management
- Build targets

## Next Steps

Once you have the basics running, explore these areas:

1. **[[Architecture Overview]]** - Understand the system design
2. **[[Development Workflow]]** - Learn the development process
3. **[[API Reference]]** - Explore available APIs
4. **[[Testing Guide]]** - Write effective tests
5. **[[Deployment Guide]]** - Deploy to production

## Getting Help

If you run into issues:

1. **Check the [[FAQ]]** for common problems
2. **Search
   [Issues](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/issues)**
3. **Create a new issue** if you can't find a solution
4. **Join
   [Discussions](https://github.com/brendadeeznuts1111/fire22-dashboard-worker/discussions)**
   for questions

## Common Issues

### Bun Installation Problems

```bash
# Install Bun (Linux/macOS)
curl -fsSL https://bun.sh/install | bash

# Install Bun (Windows - use WSL or PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Build Failures

```bash
# Clean dependencies and rebuild
rm -rf node_modules bun.lockb
bun install
bun run build

```

### Port Already in Use

```bash
# Check what's using port 8080
lsof -i :8080

# Kill process or change port in .env
PORT=8081 bun run dev
```

### Database Connection Issues

```bash
# Ensure PostgreSQL is running
pg_ctl status

# Check connection string in .env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## Performance Tips

1. **Use Bun's native features** instead of Node.js equivalents
2. **Enable caching** for faster builds
3. **Use workspace protocol** for local dependencies
4. **Monitor bundle sizes** with build analyzer
5. **Profile performance** with built-in benchmarks

Happy coding! 🚀
