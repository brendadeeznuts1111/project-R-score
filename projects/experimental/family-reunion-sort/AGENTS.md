# AGENTS.md

This document provides guidelines for AI agents working in this repository.

## Build, Lint, and Test Commands

### Core Commands (Bun)
```bash
# Development with hot reloading
bun --hot src/index.ts

# Production build
bun build ./src/index.html --outdir=dist --sourcemap --target=browser --minify

# Run production server
NODE_ENV=production bun src/index.ts

# Run tests
bun test

# Run single test file
bun test src/inspection/dual-mode-output.test.ts

# Run tests matching pattern
bun test -- "ansi stripping"

# Install dependencies
bun install

# Run npm script from package.json
bun run <script-name>
```

### Testing Framework
- Uses `bun:test` (built into Bun)
- Test files: `*.test.ts` or `*.test.tsx` patterns
- Import from `"bun:test"` for `test`, `expect`, `describe`, `beforeEach`, `afterAll`

### Type Checking
- TypeScript strict mode is enabled
- Run `bun tsc --noEmit` for type checking (if installed separately)

## Code Style Guidelines

### Language and Runtime
- **Use Bun APIs exclusively**: `Bun.serve()`, `Bun.file()`, `Bun.color()`, `Bun.stripANSI()`
- **Use bun:sqlite** for SQLite (not `better-sqlite3`)
- **Use Bun.redis** for Redis (not `ioredis`)
- **Use Bun.sql** for Postgres (not `pg` or `postgres.js`)
- **Use built-in WebSocket** (not `ws`)
- **Use Bun.$ for shell commands** (not `execa` or `child_process`)
- **Bun loads .env automatically** - don't use `dotenv`

### TypeScript Configuration
- Target: `ESNext`
- Module: `Preserve` with `bundler` resolution
- `strict: true` enabled
- Path alias: `@/*` maps to `./src/*`
- JSX: `react-jsx`

### Imports and Modules
- Use ES modules (not CommonJS)
- Use TypeScript import syntax: `import { foo } from "./foo"`
- Group imports: React/std libs, then local components, then styles
- Avoid default exports for components (prefer named exports)
- CSS files can be imported directly: `import "./index.css"`

### Naming Conventions
- **Files**: kebab-case for non-components (`my-file.ts`), PascalCase for components (`MyComponent.tsx`)
- **Variables/functions**: camelCase (`fetchData`, `isLoading`)
- **Constants**: SCREAMING_SNAKE_CASE for values, camelCase for configs
- **Classes/Types**: PascalCase (`PerfMetric`, `FormattedPerfMetric`)
- **Interfaces**: no `I` prefix (`interface SessionEnv`, not `ISessionEnv`)

### Component Patterns (React)
- Use `.tsx` extension for files with JSX
- Props interface should be exported: `export interface Props { ... }`
- Use function components with hooks
- Event handlers: `handleEvent` prefix (`handleSubmit`, `onClick`)
- Custom hooks: `use` prefix + camelCase (`useMetrics`, `useDebounce`)

### Error Handling
- Use `try/catch` with typed error variables
- Return `Response.json({ error: "..." })` for API errors
- Log errors with context: `console.error("Failed to fetch metrics:", error)`
- Avoid silent failures - always handle or propagate errors

### Formatting
- No comments unless explaining complex logic (per CLAUDE.md)
- Use Prettier defaults if formatting (2 spaces, single quotes, trailing commas)
- Keep lines under 120 characters where possible
- No emoji in code comments

### Performance
- Use Bun's native `Bun.color()` for color operations
- Use `Bun.stripANSI()` for ANSI stripping (faster than regex)
- Use `bun:sqlite` for database operations (faster than pure JS)
- Avoid blocking operations in API routes

### API Routes (Bun.serve)
```ts
"/api/endpoint": {
  async GET(req) { return Response.json({ data }); },
  async POST(req) { 
    const body = await req.json();
    return Response.json({ success: true }); 
  },
},
"/api/endpoint/:id": async req => {
  return Response.json({ id: req.params.id });
}
```

### File Structure
```text
src/
  components/     # React components
  inspection/     # Performance/monitoring utilities
  constants/      # Shared constants (colors, config)
  App.tsx         # Root component
  frontend.tsx    # React entry with HMR
  index.ts        # Bun.serve server
  index.html      # HTML shell
  index.css       # Global styles
```

### Color Constants
Use shared constants from `src/constants/colors.ts`:
- `CATEGORY_COLORS`: Security, R2, Isolation, Zstd, Demo
- `STATUS_COLORS`: success, warning, error, info
- `PERFORMANCE_THRESHOLDS`: latency/error rate limits

### Browser Console Integration
Development mode supports HMR and browser console echo:
```ts
development: {
  hmr: true,
  console: true,
}
```
