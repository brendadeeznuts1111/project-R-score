# Development Quick Reference

Quick reference guide for Bun-based development workflow.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run tests
bun test

# Run linter
bun run lint
```

## ⌨️ Keyboard Shortcuts

### VS Code/Cursor

#### Editor Shortcuts
- **Format Document**: `Shift+Alt+F` (or `Cmd+Shift+P` → "Format Document")
- **Organize Imports**: `Shift+Alt+O`
- **Run Task**: `Ctrl+Shift+P` → "Tasks: Run Task"
- **Debug**: `F5` (uses launch.json configurations)

#### Custom Task Shortcuts
- **`Cmd+Shift+D`** - Start dev server (depth=7) → `dev:start-server`
- **`Cmd+Shift+Alt+D`** - Deep debug mode (depth=10) → `dev:deep-debug`
- **`Cmd+Shift+T`** - Run tests (watch mode, depth=7) → `test:watch-mode`
- **`Cmd+Shift+Alt+T`** - Verbose tests (depth=10) → `test:verbose`
- **`Cmd+Shift+L`** - Lint and fix → `lint:fix`
- **`Cmd+Shift+F`** - Format code → `format:fix`
- **`Cmd+Shift+V`** - Validate all → `validate:all`
- **`Cmd+Shift+C`** - Start Bun console (depth=7) → `console:start`

### Tmux (with config/.tmux.conf)

**Prefix**: `Ctrl+Space` (instead of default `Ctrl+B`)

#### Window Management
- `Ctrl+Space + c` - New window
- `Ctrl+Space + |` - Split window horizontally
- `Ctrl+Space + -` - Split window vertically
- `Ctrl+Space + x` - Kill pane
- `Ctrl+Space + X` - Kill window
- `Ctrl+Space + q` - Kill session

#### Pane Navigation (Vim style)
- `Ctrl+Space + h` - Left pane
- `Ctrl+Space + j` - Down pane
- `Ctrl+Space + k` - Up pane
- `Ctrl+Space + l` - Right pane

#### Bun Development Shortcuts
- `Ctrl+Space + b` - Start Bun dev server
- `Ctrl+Space + t` - Run Bun tests (watch mode)
- `Ctrl+Space + C` - Open Bun console
- `Ctrl+Space + T` - Run typecheck
- `Ctrl+Space + l` - Run linter
- `Ctrl+Space + B` - Build project
- `Ctrl+Space + i` - Install dependencies
- `Ctrl+Space + v` - Show Bun version
- `Ctrl+Space + p` - Performance profiling dashboard
- `Ctrl+Space + d` - SQLite database viewer

#### MLGS Specific
- `Ctrl+Space + C-s` - Core session
- `Ctrl+Space + C-a` - Analytics session
- `Ctrl+Space + C-d` - Research session
- `Ctrl+Space + C-m` - Monitoring session
- `Ctrl+Space + S` - Secrets management
- `Ctrl+Space + L` - View logs
- `Ctrl+Space + E` - View errors
- `Ctrl+Space + W` - View warnings

## 📝 Code Snippets

VS Code snippets are available for common Bun patterns. Type the prefix and press `Tab`:

- `bun-server` - Create Bun HTTP server
- `bun-test` - Create Bun test
- `bun-test-async` - Create async Bun test
- `bun-read` - Read file with Bun
- `bun-write` - Write file with Bun
- `bun-sqlite` - SQLite database connection
- `bun-query` - Execute SQLite query
- `bun-fetch` - HTTP request
- `bun-stream` - ReadableStream
- `bun-worker` - Worker thread
- `bun-env` - Environment variable
- `bun-cli` - CLI script template
- `bun-describe` - Test suite
- `bun-hooks` - Test lifecycle hooks

## 🛠️ Common Commands

> 💡 **Tip**: Run `bun run commands` to see all available commands interactively

### Quick Start
```bash
bun run dev                   # Start development server
bun test                      # Run tests
bun run lint                  # Check code quality
bun run typecheck            # Type check
```

### Development Workflow
```bash
# Start dev server with hot reload
bun run dev

# In another terminal: Run tests in watch mode
bun test --watch

# Format and lint before committing
bunx @biomejs/biome format --write src/
bunx @biomejs/biome check --write src/
```

### Testing
```bash
bun test                      # Run all tests
bun test --watch             # Watch mode
bun run test:verbose         # Verbose output (depth=10)
bun run test:telegram        # Telegram tests
bun run bench                # Benchmarks
```

### Validation & Quality
```bash
# Quick checks
bun run typecheck            # TypeScript
bun run lint                 # Linting
bun run validate:settings    # VS Code settings

# Full validation
bun run validate:settings && \
bun run validate:docs && \
bun run typecheck && \
bun run lint

# Pre-commit (fast)
bun run audit:validate && bun test

# Pre-push (comprehensive)
bun run audit:all
```

### Formatting
```bash
bunx @biomejs/biome format --write src/    # Format code
bunx @biomejs/biome format src/            # Check only
bunx @biomejs/biome check --write src/     # Lint and fix
```

### Build & Deploy
```bash
bun run build                # Build project
bun run deploy:staging       # Deploy to staging
rm -rf dist build coverage .bun  # Clean artifacts
```

### Console & Debugging
```bash
bun run console              # Interactive console (depth=7)
bun --inspect run src/index.ts  # Debug with inspector
bun run cpu-prof:test       # CPU profiling
bun run cpu-prof:compare    # Compare profiles

# Console Depth Debugging (see docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md)
bun run dev                  # Development (depth=7) - balanced visibility
bun --console-depth=10 run src/index.ts  # Deep debugging (depth=10)
bun run debug:graph          # Graph debugging (depth=15) - maximum visibility
bun run debug:anomaly        # Anomaly debugging (depth=15)
bun run test:verbose         # Verbose tests (depth=10)
```

**Console Depth Guide**:
- **depth=5**: Production (balanced performance)
- **depth=7**: Development (default, comprehensive visibility)
- **depth=10**: Deep debugging (complex structures)
- **depth=15**: Extreme debugging (graph/anomaly analysis)

## 📁 Project Structure

```text
trader-analyzer/
├── src/              # Source code
├── test/             # Integration tests
├── scripts/          # Utility scripts
├── config/           # Configuration files
│   ├── .tmux.conf    # Tmux configuration
│   └── bunfig.toml   # Bun configuration
├── .vscode/          # VS Code settings
│   ├── settings.json # Editor settings
│   ├── launch.json   # Debug configurations
│   ├── tasks.json    # Task definitions
│   ├── keybindings.json  # Keyboard shortcuts
│   └── snippets/     # Code snippets
├── docs/             # Documentation
├── biome.json        # Biome linter/formatter config
└── .editorconfig     # Editor configuration
```

## 🔧 Configuration Files

- **`.editorconfig`** - Consistent coding styles across editors
- **`biome.json`** - Linting and formatting rules
- **`config/bunfig.toml`** - Bun runtime configuration
- **`.vscode/settings.json`** - VS Code/Cursor settings
- **`config/.tmux.conf`** - Tmux session configuration

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test src/api/workers-client.test.ts

# Run tests matching pattern
bun test -t "timeout"

# Run tests in specific directory
bun test src/api/

# Watch mode
bun test --watch

# Coverage
bun test --coverage

# Update snapshots
bun test -u
```

### Fake Timers (Bun v1.3.4+)

Bun's test runner supports fake timers for testing time-dependent code without waiting for real time to pass. This is essential for testing `setTimeout`, `setInterval`, DST transitions, and timezone conversions.

```typescript
import { test, expect, jest } from "bun:test";

test("fake timers example", () => {
  jest.useFakeTimers();

  let called = false;
  setTimeout(() => {
    called = true;
  }, 1000);

  expect(called).toBe(false);

  // Advance time by 1 second
  jest.advanceTimersByTime(1000);

  expect(called).toBe(true);

  jest.useRealTimers();
});
```

**Available Methods:**
- `jest.useFakeTimers(options?)` - Enable fake timers (optionally set `{ now: number | Date }`)
- `jest.useRealTimers()` - Restore real timers
- `jest.advanceTimersByTime(ms)` - Advance all timers by milliseconds
- `jest.advanceTimersToNextTimer()` - Advance to next scheduled timer
- `jest.runAllTimers()` - Run all pending timers
- `jest.runOnlyPendingTimers()` - Run only currently pending timers
- `jest.getTimerCount()` - Get number of pending timers
- `jest.clearAllTimers()` - Clear all pending timers
- `jest.isFakeTimers()` - Check if fake timers are active

**Example Test:** See `test/core/timezone-fake-timers.test.ts` for comprehensive examples including DST transitions, timezone conversions, and timer management.

**See:** [Bun v1.3.4 Fake Timers](https://bun.com/blog/bun-v1.3.4#fake-timers-for-bun-test)

## 📚 Useful Links

- [Bun Documentation](https://bun.sh/docs)
- [Biome Documentation](https://biomejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tmux Manual](https://man.openbsd.org/tmux)
- [Console Depth Debugging](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md) - Deep object inspection guide

## 💡 Tips

1. **Use `bun run commands`**: See all available commands organized by category
2. **VS Code Tasks**: Press `Cmd+Shift+P` → "Tasks: Run Task" for quick access (labels use kebab-case: `dev:start-server`, `test:watch-mode`)
3. **Keyboard Shortcuts**: Use `Cmd+Shift+D` for dev server, `Cmd+Shift+T` for tests
4. **Console Depth**: Adjust `--console-depth` for different debugging needs (see [Console Depth Guide](./7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md))
5. **Tmux Sessions**: Use MLGS-specific sessions for organized workflows (`bun run tmux:start`)
6. **Code Snippets**: Type snippet prefix + `Tab` for faster development
7. **Hot Reload**: Development server automatically reloads on file changes
8. **Watch Mode**: Tests run in watch mode for instant feedback
9. **Format on Save**: Code is automatically formatted on save (configured in VS Code)
10. **Command Reference**: See [COMMANDS.md](./COMMANDS.md) for complete command list
11. **Naming Conventions**: All task labels, debug configs, and file names follow kebab-case (see [Naming Conventions](./guides/NAMING-CONVENTIONS.md))
