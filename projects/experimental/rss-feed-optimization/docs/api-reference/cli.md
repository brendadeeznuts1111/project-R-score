# CLI Interface

This document provides comprehensive documentation for the command-line interface (CLI) of the RSS Feed Optimization project.

## Overview

The RSS Feed Optimization project includes a powerful CLI for managing the application, performing administrative tasks, and running various operations from the command line.

## Installation

The CLI is included with the main package and can be used directly:

```bash
# Run CLI commands
bun cli.js [command] [options]

# Or make it executable
chmod +x cli.js
./cli.js [command] [options]
```

## Command Structure

```
cli.js <command> [options]

Commands:
  start          Start the application server
  dev            Start development server
  build          Build the application for production
  test           Run tests
  lint           Run linter
  sync           Sync local posts to R2 storage
  benchmark      Run performance benchmarks
  help [command] Display help for a command
```

## Commands

### start

Start the application server in production mode.

**Usage:**
```bash
bun cli.js start [options]
```

**Options:**
- `--port, -p <port>`: Port to listen on (default: 3000)
- `--env, -e <env>`: Environment (default: production)
- `--daemon, -d`: Run as daemon
- `--help, -h`: Show help

**Examples:**
```bash
# Start on default port
bun cli.js start

# Start on custom port
bun cli.js start --port 8080

# Start in daemon mode
bun cli.js start --daemon

# Start with custom environment
bun cli.js start --env staging
```

### dev

Start the development server with hot reloading and debugging enabled.

**Usage:**
```bash
bun cli.js dev [options]
```

**Options:**
- `--port, -p <port>`: Port to listen on (default: 3000)
- `--watch, -w`: Enable file watching (default: true)
- `--debug, -d`: Enable debug mode
- `--help, -h`: Show help

**Examples:**
```bash
# Start development server
bun cli.js dev

# Start on custom port
bun cli.js dev --port 3001

# Start without file watching
bun cli.js dev --no-watch

# Start with debug mode
bun cli.js dev --debug
```

### build

Build the application for production deployment.

**Usage:**
```bash
bun cli.js build [options]
```

**Options:**
- `--output, -o <dir>`: Output directory (default: dist)
- `--minify`: Minify output
- `--sourcemap`: Generate source maps
- `--help, -h`: Show help

**Examples:**
```bash
# Build for production
bun cli.js build

# Build with minification
bun cli.js build --minify

# Build with source maps
bun cli.js build --sourcemap

# Build to custom directory
bun cli.js build --output ./build
```

### test

Run the test suite.

**Usage:**
```bash
bun cli.js test [options]
```

**Options:**
- `--watch, -w`: Run tests in watch mode
- `--coverage, -c`: Generate coverage report
- `--grep, -g <pattern>`: Filter tests by pattern
- `--reporter, -r <type>`: Test reporter type
- `--help, -h`: Show help

**Examples:**
```bash
# Run all tests
bun cli.js test

# Run tests in watch mode
bun cli.js test --watch

# Run tests with coverage
bun cli.js test --coverage

# Run specific test pattern
bun cli.js test --grep "RSS"

# Use specific reporter
bun cli.js test --reporter json
```

### lint

Run the linter to check code quality.

**Usage:**
```bash
bun cli.js lint [options]
```

**Options:**
- `--fix`: Automatically fix issues
- `--format, -f <format>`: Output format
- `--help, -h`: Show help

**Examples:**
```bash
# Run linter
bun cli.js lint

# Fix issues automatically
bun cli.js lint --fix

# Use specific format
bun cli.js lint --format json
```

### sync

Sync local posts to R2 storage.

**Usage:**
```bash
bun cli.js sync [options]
```

**Options:**
- `--force, -f`: Force sync (overwrite existing)
- `--dry-run`: Show what would be synced
- `--help, -h`: Show help

**Examples:**
```bash
# Sync posts to R2
bun cli.js sync

# Force sync
bun cli.js sync --force

# Dry run (preview)
bun cli.js sync --dry-run
```

### benchmark

Run performance benchmarks.

**Usage:**
```bash
bun cli.js benchmark [options]
```

**Options:**
- `--type, -t <type>`: Benchmark type (rss, dns, buffer)
- `--iterations, -i <count>`: Number of iterations
- `--help, -h`: Show help

**Examples:**
```bash
# Run all benchmarks
bun cli.js benchmark

# Run RSS generation benchmark
bun cli.js benchmark --type rss

# Run DNS prefetching benchmark
bun cli.js benchmark --type dns

# Run with custom iterations
bun cli.js benchmark --iterations 1000
```

## Configuration

### Environment Variables

The CLI uses environment variables for configuration:

```bash
# Application settings
NODE_ENV=production
PORT=3000
BLOG_TITLE="My Blog"
BLOG_URL=https://myblog.com

# R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name

# Performance
ENABLE_CACHE=true
CACHE_TTL=600
ENABLE_DNS_PREFETCH=true
ENABLE_PRECONNECT=true

# Security
ADMIN_TOKEN=your-admin-token
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
```

### Configuration File

Create a `.env` file for local development:

```bash
# .env
NODE_ENV=development
PORT=3000
BLOG_TITLE="Development Blog"
BLOG_URL=http://localhost:3000
ADMIN_TOKEN=dev-token

# R2 Storage (use test bucket)
R2_ACCOUNT_ID=test-account
R2_ACCESS_KEY_ID=test-key
R2_SECRET_ACCESS_KEY=test-secret
R2_BUCKET_NAME=dev-blog-bucket

# Performance
ENABLE_CACHE=false
CACHE_TTL=300
ENABLE_DNS_PREFETCH=false
ENABLE_PRECONNECT=false

# Security
ENABLE_CSP=false
ENABLE_HSTS=false
ENABLE_RATE_LIMITING=false
```

## Advanced Usage

### Custom Scripts

Create custom scripts in the `scripts/` directory:

```javascript
// scripts/custom-script.js
import { RSSGenerator } from '../src/rss-generator.js';
import { R2BlogStorage } from '../src/r2-client.js';

export async function run() {
  console.log('Running custom script...');
  
  // Your custom logic here
  const storage = new R2BlogStorage();
  const posts = await storage.listPosts();
  
  console.log(`Found ${posts.length} posts`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(console.error);
}
```

Run custom scripts:
```bash
bun scripts/custom-script.js
```

### Batch Operations

Perform batch operations using the CLI:

```bash
# Sync multiple operations
bun cli.js sync --force
bun cli.js benchmark --type rss --iterations 1000
bun cli.js test --coverage
```

### Docker Integration

Use the CLI with Docker:

```dockerfile
# Dockerfile
FROM oven/bun:1.3.7

WORKDIR /app
COPY . .
RUN bun install

# Use CLI commands
CMD ["bun", "cli.js", "start"]
```

### PM2 Integration

Use with PM2 for production deployment:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start cli.js --name rss-feed-optimization

# View logs
pm2 logs rss-feed-optimization

# Monitor
pm2 monit
```

## Error Handling

### Common Errors

#### Missing Environment Variables
```bash
Error: Missing required environment variable: BLOG_TITLE
```

**Solution:**
```bash
# Check .env file
cat .env

# Set missing variables
export BLOG_TITLE="Your Blog Title"
```

#### R2 Connection Failed
```bash
Error: R2 connection failed: Invalid credentials
```

**Solution:**
```bash
# Verify R2 credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Test connection
bun -e "
import { s3 } from 'bun';
const client = s3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: 'https://your-account.r2.cloudflarestorage.com',
  region: 'auto'
});
console.log('Testing R2 connection...');
"
```

#### Port Already in Use
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Check what's using the port
lsof -i :3000

# Kill process
sudo kill -9 $(lsof -t -i:3000)

# Use different port
bun cli.js start --port 3001
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Enable debug logging
export DEBUG=true
bun cli.js start

# Enable verbose output
bun cli.js start --verbose

# Check environment
bun cli.js start --env development
```

## Examples

### Development Workflow

```bash
# 1. Start development server
bun cli.js dev

# 2. Run tests in watch mode
bun cli.js test --watch

# 3. Run linter
bun cli.js lint

# 4. Sync to R2
bun cli.js sync
```

### Production Deployment

```bash
# 1. Build for production
bun cli.js build --minify

# 2. Run tests with coverage
bun cli.js test --coverage

# 3. Run benchmarks
bun cli.js benchmark

# 4. Start production server
bun cli.js start --daemon
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun cli.js test
      
      - name: Run linter
        run: bun cli.js lint
      
      - name: Build application
        run: bun cli.js build --minify
      
      - name: Deploy
        run: |
          # Your deployment script here
          bun cli.js start --daemon
```

## Help and Support

### Getting Help

```bash
# Show general help
bun cli.js help

# Show command help
bun cli.js help start
bun cli.js help sync
bun cli.js help benchmark

# Show all options
bun cli.js --help
```

### Documentation

- [Main Documentation](../README.md)
- [API Documentation](./server-api.md)
- [Development Guide](../development/)

### Community Support

- [GitHub Issues](https://github.com/your-username/rss-feed-optimization/issues)
- [Discussions](https://github.com/your-username/rss-feed-optimization/discussions)
- [Documentation](../README.md)

This CLI interface provides powerful command-line tools for managing and operating the RSS Feed Optimization project efficiently.