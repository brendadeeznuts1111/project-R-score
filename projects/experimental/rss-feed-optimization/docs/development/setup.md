# Development Setup Guide

This guide will help you set up a development environment for the RSS Feed Optimization project.

## Prerequisites

### Required Software

- **Bun.js**: Version 1.3.7 or later
- **Git**: For version control
- **Node.js**: Optional, for fallback compatibility
- **Text Editor**: VS Code, Vim, or your preferred editor

### Optional Software

- **Docker**: For containerized development
- **PostgreSQL**: For database development
- **Redis**: For caching development

## Installation

### 1. Install Bun.js

#### Option 1: Official Installer (Recommended)

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.bun/bin:$PATH"
```

#### Option 2: Using npm

```bash
npm install -g bun
```

#### Option 3: Using Homebrew (macOS)

```bash
brew install bun
```

### 2. Verify Installation

```bash
# Check Bun version
bun --version

# Check Bun help
bun --help
```

### 3. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/rss-feed-optimization.git

# Navigate to project directory
cd rss-feed-optimization
```

### 4. Install Dependencies

```bash
# Install dependencies
bun install

# Verify installation
bun run dev
```

## Project Structure

### Understanding the Codebase

```
rss-feed-optimization/
├── src/                    # Source code
│   ├── server.js          # Main server file
│   ├── rss-generator.js   # RSS generation logic
│   ├── r2-client.js       # R2 storage client
│   ├── webSub.js          # WebSub implementation
│   ├── config/            # Configuration files
│   ├── middleware/        # Express-style middleware
│   ├── services/          # Business logic services
│   └── utils/             # Utility functions
├── tests/                 # Test files
│   ├── *.test.js          # Unit tests
│   └── benchmark.js       # Performance benchmarks
├── content/               # Blog content
│   └── posts/             # Markdown posts
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
└── bunfig.toml           # Bun configuration
```

### Key Files and Directories

#### Configuration Files

- **`bunfig.toml`**: Bun-specific configuration
- **`package.json`**: Project dependencies and scripts
- **`.env.example`**: Environment variable template
- **`tsconfig.json`**: TypeScript configuration (if using)

#### Source Code

- **`src/server.js`**: Main application server
- **`src/config/`**: Configuration management
- **`src/utils/`**: Utility functions and helpers
- **`src/services/`**: Business logic services

#### Tests

- **`tests/`**: Unit and integration tests
- **`tests/benchmark.js`**: Performance benchmarks

## Development Environment Setup

### 1. Environment Variables

#### Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

#### Required Environment Variables

```bash
# Application settings
BLOG_TITLE="RSS Feed Optimization (Dev)"
BLOG_URL="http://localhost:3000"
ADMIN_TOKEN="dev-token"

# R2 storage (optional for development)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="your-dev-bucket"

# Performance settings
ENABLE_CACHE=true
CACHE_TTL=300
MAX_CACHE_SIZE=100

# Security settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
```

### 2. IDE Configuration

#### VS Code Setup

1. **Install Extensions**:
   - Bun.js extension
   - ESLint
   - Prettier
   - GitLens

2. **Create `.vscode/settings.json`**:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "bun.enable": true,
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

3. **Create `.vscode/launch.json`**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeExecutable": "bun",
      "console": "integratedTerminal"
    }
  ]
}
```

### 3. Development Tools

#### Linting and Formatting

```bash
# Install linting tools
bun add --dev eslint prettier

# Run linting
bun run lint

# Format code
bun run format
```

#### Testing

```bash
# Run all tests
bun test

# Run specific test
bun test tests/rss-generator.test.js

# Run tests with coverage
bun test --coverage
```

#### Performance Monitoring

```bash
# Run performance benchmarks
bun run benchmark

# Start development server with profiling
bun run dev:profile
```

## Development Workflow

### 1. Starting Development

#### Start Development Server

```bash
# Start development server
bun run dev

# Server will start on http://localhost:3000
# Hot reload is enabled by default
```

#### Development Server Features

- **Hot Reload**: Automatic restart on file changes
- **Debug Mode**: Enhanced error messages
- **Performance Monitoring**: Built-in metrics
- **Logging**: Detailed development logs

### 2. Code Style and Standards

#### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};
```

#### Prettier Configuration

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

### 3. Testing Strategy

#### Unit Tests

```javascript
// tests/example.test.js
import { test, expect } from 'bun:test';

test('basic functionality', () => {
  expect(2 + 2).toBe(4);
});

test('async functionality', async () => {
  const result = await someAsyncFunction();
  expect(result).toBeDefined();
});
```

#### Integration Tests

```javascript
// tests/integration.test.js
import { test, expect } from 'bun:test';
import { serve } from 'bun';

test('server integration', async () => {
  const server = serve({
    port: 0,
    fetch() {
      return new Response('Hello World');
    }
  });

  const response = await fetch(`http://localhost:${server.port}`);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('Hello World');

  server.stop();
});
```

#### Performance Tests

```javascript
// tests/performance.test.js
import { test, expect } from 'bun:test';
import { PerformanceTracker } from '../src/utils/performance-tracker.js';

test('performance requirements', async () => {
  const tracker = new PerformanceTracker();
  
  const result = await tracker.track('operation', async () => {
    return await expensiveOperation();
  });

  expect(result.duration).toBeLessThan(1000); // Under 1 second
  expect(result.memory).toBeLessThan(50 * 1024 * 1024); // Under 50MB
});
```

### 4. Debugging

#### Using Bun Debugger

```javascript
// Enable debugging
Bun.env.DEBUG = true;

// Use console.log for debugging
console.log('Debug info:', variable);

// Use Bun's inspect
import { inspect } from 'bun';
console.log(inspect(data, { colors: true }));
```

#### Browser Debugging

```javascript
// Add debug breakpoints
debugger;

// Use browser dev tools
// Open http://localhost:3000 in browser
// Open Dev Tools (F12)
// Set breakpoints in source code
```

#### Performance Profiling

```javascript
// Enable profiling
Bun.env.PROFILE = true;

// Use performance tracking
import { PerformanceTracker } from '../src/utils/performance-tracker.js';

const tracker = new PerformanceTracker();
const result = await tracker.track('operation', async () => {
  return await operation();
});

console.log('Duration:', result.duration);
console.log('Memory:', result.memory);
```

## Development Best Practices

### 1. Code Organization

#### File Naming

- Use kebab-case for files: `rss-generator.js`
- Use PascalCase for classes: `RSSGenerator`
- Use camelCase for functions: `generateRSSFeed()`

#### Directory Structure

```
src/
├── components/     # Reusable components
├── services/       # Business logic
├── utils/          # Utility functions
├── middleware/     # Express-style middleware
├── config/         # Configuration
└── tests/          # Test files
```

### 2. Error Handling

#### Custom Error Classes

```javascript
// src/utils/errors.js
export class BlogError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'BlogError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends BlogError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}
```

#### Error Handling Middleware

```javascript
// src/middleware/error-handler.js
export function errorHandler(error, req, res, next) {
  console.error('Error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      statusCode
    }
  });
}
```

### 3. Performance Optimization

#### Caching Strategy

```javascript
// src/utils/cache.js
export class Cache {
  constructor(maxSize = 100, ttl = 600) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl * 1000; // Convert to milliseconds
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }
}
```

#### Memory Management

```javascript
// src/utils/memory.js
export class MemoryMonitor {
  constructor(warningThreshold = 400 * 1024 * 1024) {
    this.warningThreshold = warningThreshold;
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;

    if (heapUsed > this.warningThreshold) {
      console.warn(`Memory usage warning: ${Math.round(heapUsed / 1024 / 1024)}MB`);
    }

    return usage;
  }
}
```

### 4. Testing Guidelines

#### Test Structure

```javascript
// tests/service.test.js
import { test, expect } from 'bun:test';
import { RSSService } from '../src/services/rss-service.js';

test.describe('RSS Service', () => {
  let service;

  test.beforeEach(() => {
    service = new RSSService();
  });

  test('generates valid RSS feed', async () => {
    const posts = [{ title: 'Test Post' }];
    const rss = await service.generateRSS(posts);
    
    expect(rss).toContain('<rss');
    expect(rss).toContain('Test Post');
  });

  test('handles empty posts', async () => {
    const rss = await service.generateRSS([]);
    expect(rss).toContain('<channel>');
  });
});
```

#### Mocking and Stubbing

```javascript
// tests/mock-example.test.js
import { test, expect, mock } from 'bun:test';

test('mocks external dependencies', async () => {
  const mockFetch = mock(async (url) => {
    return new Response('mock data');
  });

  // Replace global fetch
  global.fetch = mockFetch;

  const result = await someFunctionThatUsesFetch();
  
  expect(mockFetch).toHaveBeenCalled();
  expect(result).toBe('mock data');
});
```

## Development Tools and Scripts

### 1. Package.json Scripts

```json
{
  "scripts": {
    "dev": "bun run src/server.js",
    "start": "bun run src/server.js",
    "build": "bun install",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "lint": "eslint src/ tests/",
    "format": "prettier --write src/ tests/",
    "profile": "bun run profile",
    "benchmark": "bun run benchmark",
    "sync": "bun run scripts/sync-posts.js",
    "status": "bun run cli.js status"
  }
}
```

### 2. Development Scripts

#### Sync Posts Script

```javascript
// scripts/sync-posts.js
import { R2BlogStorage } from '../src/r2-client.js';

async function syncPosts() {
  const storage = new R2BlogStorage();
  const result = await storage.syncLocalPosts('./content/posts');
  
  console.log(`Synced ${result.synced} posts`);
  if (result.errors > 0) {
    console.error(`Errors: ${result.errors}`);
  }
}

syncPosts().catch(console.error);
```

#### Performance Profile Script

```javascript
// scripts/profile.js
import { PerformanceTracker } from '../src/utils/performance-tracker.js';

async function profileApplication() {
  const tracker = new PerformanceTracker();
  
  // Profile RSS generation
  const rssResult = await tracker.track('rss_generation', async () => {
    // RSS generation logic
  });

  // Profile R2 operations
  const r2Result = await tracker.track('r2_operations', async () => {
    // R2 operations
  });

  console.log('RSS Generation:', rssResult);
  console.log('R2 Operations:', r2Result);
  
  const report = tracker.generateReport();
  console.log('Performance Report:', report);
}

profileApplication().catch(console.error);
```

### 3. Development Utilities

#### Development Server

```javascript
// src/dev-server.js
import { serve } from 'bun';

const server = serve({
  port: 3000,
  fetch(req) {
    console.log(`Request: ${req.method} ${req.url}`);
    
    return new Response('Development Server', {
      headers: { 'Content-Type': 'text/plain' }
    });
  },
  error(error) {
    console.error('Server error:', error);
    return new Response('Server Error', { status: 500 });
  }
});

console.log(`Development server running on http://localhost:${server.port}`);
```

#### Hot Reload Configuration

```toml
# bunfig.toml
[dev]
watch = true
hot = true
reload = true

[env]
NODE_ENV = "development"

[server]
port = 3000
host = "0.0.0.0"
```

## Troubleshooting Development Issues

### Common Development Problems

#### 1. Bun Installation Issues

**Problem**: Bun commands not found.

**Solution**:
```bash
# Check if Bun is installed
which bun

# Reinstall Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH
export PATH="$HOME/.bun/bin:$PATH"
```

#### 2. Dependency Issues

**Problem**: Dependencies not installing correctly.

**Solution**:
```bash
# Clear Bun cache
bun install --force

# Reinstall dependencies
bun install

# Check bun.lock file
ls -la bun.lock
```

#### 3. Port Already in Use

**Problem**: Port 3000 already in use.

**Solution**:
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Or kill process using port
lsof -ti:3000 | xargs kill -9
```

#### 4. Environment Variables Not Loading

**Problem**: Environment variables not being read.

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Check file permissions
chmod 600 .env

# Restart development server
bun run dev
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Enable debug mode
DEBUG=true bun run dev

# Enable verbose logging
VERBOSE=true bun run dev

# Enable profiling
PROFILE=true bun run dev
```

### Performance Issues

**Problem**: Development server is slow.

**Solution**:
```bash
# Check memory usage
bun run profile

# Enable caching
ENABLE_CACHE=true

# Reduce cache TTL for development
CACHE_TTL=60
```

## Next Steps

After setting up your development environment:

1. **Explore the codebase**: Understand the project structure
2. **Run the tests**: Ensure everything works correctly
3. **Start the development server**: Test the application
4. **Make changes**: Implement your features or fixes
5. **Run tests**: Ensure your changes don't break anything
6. **Commit changes**: Use proper commit messages

## Getting Help

If you encounter issues:

1. **Check the documentation**: This guide and project docs
2. **Search existing issues**: [GitHub Issues](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
3. **Create a new issue**: Include detailed information about your problem
4. **Join discussions**: [GitHub Discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)

This development setup guide provides everything you need to start contributing to the RSS Feed Optimization project. Happy coding!