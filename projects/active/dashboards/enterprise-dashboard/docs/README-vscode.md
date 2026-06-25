# VS Code Configuration for Enterprise Dashboard

This directory contains VS Code workspace settings optimized for Bun and TypeScript development.

## Features

### TypeScript Support
- Uses workspace TypeScript version
- Proper Bun type definitions via `@types/bun`
- Auto-imports and import organization
- Type checking enabled

### Debugging
- **Debug Bun Server**: Debug the main server with hot reload
- **Debug Bun Tests**: Debug test files
- **Debug KYC Failsafe CLI**: Debug KYC CLI commands
- **Attach to Bun**: Attach debugger to running Bun process

### Tasks
- `bun: dev` - Start development server (default build task)
- `bun: test` - Run tests
- `bun: typecheck` - Type check without emitting
- `bun: lint` - Run ESLint
- `bun: build` - Build project
- `bun: kyc-failsafe` - Run KYC failsafe CLI (prompts for user ID)

### Recommended Extensions
Install recommended extensions when prompted, or run:
```bash
code --install-extension oven.bun-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

## Usage

1. **Open workspace**: Open the `enterprise-dashboard` folder in VS Code
2. **Install extensions**: Accept the recommended extensions prompt
3. **Start debugging**: Press F5 or use Run > Start Debugging
4. **Run tasks**: Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux) and type "Tasks: Run Task"

## Bun Type Definitions

The project uses `@types/bun` which provides:
- `Bun` global object types
- `bun:*` module types (bun:sqlite, bun:ffi, etc.)
- Runtime API types

Type definitions are automatically loaded via:
- `tsconfig.json`: `"types": ["bun"]`
- `src/env.d.ts`: `/// <reference types="bun-types" />`

## Troubleshooting

### TypeScript errors for Bun APIs
1. Ensure `@types/bun` is installed: `bun add -d @types/bun`
2. Reload VS Code window: Cmd+Shift+P → "Developer: Reload Window"
3. Check `tsconfig.json` has `"types": ["bun"]`

### Debugging not working
1. Ensure Bun is in PATH: `which bun`
2. Check Bun version: `bun --version` (should be 1.3.4+)
3. Try attaching to running process instead of launching

### IntelliSense not working
1. Open a TypeScript file
2. Cmd+Shift+P → "TypeScript: Restart TS Server"
3. Check Output panel → TypeScript for errors
