# Linting & Code Quality Guidelines

This guide covers linting standards, code quality checks, and pre-commit setup for the Foxy Proxy project.

## Overview

The project uses a strict linting and formatting setup to maintain code quality:

- **ESLint**: TypeScript/React code analysis
- **Prettier**: Automatic code formatting
- **TypeScript**: Full strict type checking
- **Bun**: Built-in package manager and test runner

## Quick Start

### Installation

```bash
# Install ESLint and related packages
bun install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Install Prettier
bun install --save-dev prettier

# Install React plugins
bun install --save-dev eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y

# Install import plugin
bun install --save-dev eslint-plugin-import
```

### Local Setup

```bash
# Lint the project
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Check code formatting
bun run format:check

# Apply formatting
bun run format
```

## Configuration Files

### .eslintrc.json

Located at project root, enforces:

- Strict TypeScript checking
- React best practices
- Proper import ordering
- Consistent code style

Key rules:

```json
{
  "@typescript-eslint/no-unused-vars": "error",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-floating-promises": "error",
  "react-hooks/rules-of-hooks": "error",
  "quote": ["error", "double"]
}
```

### .prettierrc.json

Enforces consistent formatting:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "none"
}
```

### .eslintignore & .prettierignore

Excludes files from linting/formatting:

- node_modules/
- dist/
- .wrangler/
- Problematic files being fixed

## Code Standards

### TypeScript

**Strict Mode**: Always enabled

```typescript
// ✅ GOOD: Explicit types
function fetchData(id: number): Promise<Data> {
  return fetch(`/api/${id}`).then((r) => r.json());
}

// ❌ BAD: Missing types
function fetchData(id) {
  return fetch(`/api/${id}`).then((r) => r.json());
}
```

**Union Types**: Express intent clearly

```typescript
// ✅ GOOD
type Status = "pending" | "complete" | "error";

// ❌ BAD
type Status = string;
```

**Avoid `any`**: Use specific types

```typescript
// ✅ GOOD
const data: Record<string, unknown> = {};

// ❌ BAD
const data: any = {};
```

### React Components

**Functional with Hooks**:

```typescript
// ✅ GOOD
interface Props {
  title: string;
  onClick: () => void;
}

export function Button({ title, onClick }: Props): JSX.Element {
  return <button onClick={onClick}>{title}</button>;
}

// ❌ BAD
export const Button = ({ title, onClick }: any) => {
  return <button onClick={onClick}>{title}</button>;
};
```

**Hook Dependencies**:

```typescript
// ✅ GOOD
useEffect(() => {
  // Effect code
}, [dependency1, dependency2]);

// ❌ BAD
useEffect(() => {
  // Effect code
}, []); // Missing dependencies
```

## Linting Rules

### Errors (Must Fix)

| Rule                                      | Description                |
| ----------------------------------------- | -------------------------- |
| `no-debugger`                             | Remove debugger statements |
| `@typescript-eslint/no-floating-promises` | Handle all promises        |
| `@typescript-eslint/no-unused-vars`       | Remove unused variables    |
| `react-hooks/rules-of-hooks`              | Follow Hook rules          |
| `eqeqeq`                                  | Use === instead of ==      |

### Warnings (Should Fix)

| Rule                                 | Description                               |
| ------------------------------------ | ----------------------------------------- |
| `no-console`                         | Minimize console logs (except warn/error) |
| `@typescript-eslint/no-explicit-any` | Avoid `any` type                          |
| `react-hooks/exhaustive-deps`        | Include all dependencies                  |

## Pre-Commit Setup

### Using Husky (Recommended)

```bash
# Install husky
bun install --save-dev husky

# Initialize husky
bunx husky install

# Add pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint staged files
bun run lint || exit 1

# Type check
bun run typecheck || exit 1

# Format check
bun run format:check || exit 1

echo "✅ Pre-commit checks passed"
EOF

chmod +x .husky/pre-commit
```

### Manual Pre-Commit Check

Before committing, run:

```bash
bun run lint && bun run typecheck && bun run format:check
```

## CI/CD Integration

### GitHub Actions

Workflows run on:

- **Push to** main, staging, develop
- **Pull Requests** to main, staging, develop

See `.github/workflows/lint.yml` for configuration.

**Workflow includes**:

1. ESLint check
2. TypeScript type check
3. Prettier format verification
4. Build verification

### Local CI Simulation

Test locally before pushing:

```bash
# Run full CI pipeline
bun run lint && bun run typecheck && bun run format:check && bun run build
```

## Common Issues & Fixes

### ESLint Errors

**Problem**: "Missing return type"

```typescript
// ❌ ERROR
function getData() {
  return fetch("/api").then((r) => r.json());
}

// ✅ FIX
function getData(): Promise<unknown> {
  return fetch("/api").then((r) => r.json());
}
```

**Problem**: "Unused variable"

```typescript
// ❌ ERROR
const unused = 42;
const result = calculate();

// ✅ FIX - Either use it or prefix with _
const _unused = 42;
const result = calculate();
```

**Problem**: "Unhandled promise"

```typescript
// ❌ ERROR
fetch("/api").then((r) => r.json());

// ✅ FIX
await fetch("/api").then((r) => r.json());
// OR
void fetch("/api").then((r) => r.json());
```

### Prettier Conflicts

**Problem**: ESLint and Prettier disagree about formatting

**Solution**: Run auto-fix in order

```bash
# 1. Auto-fix ESLint
bun run lint:fix

# 2. Format with Prettier
bun run format
```

### Type Errors

**Problem**: "Type 'X' is not assignable to type 'Y'"

**Solution**: Be explicit with types

```typescript
// ❌ ERROR: Type mismatch
const value: number = "42";

// ✅ FIX: Correct type
const value: number = 42;
// OR explicit conversion
const value: number = parseInt("42", 10);
```

## Best Practices

### 1. **Commit Early, Commit Often**

- Fix linting issues immediately
- Don't accumulate debt

### 2. **Use IDE Integration**

- Install ESLint extension (VS Code)
- Install Prettier extension
- Enable format-on-save

### 3. **Type Everything**

- No implicit `any`
- Use specific types over `object`
- Export types from modules

### 4. **Follow Naming Conventions**

```typescript
// ✅ GOOD
interface ComponentProps {}
type Status = "pending" | "complete";
const MAX_RETRIES = 3;
function calculateTotal(): number {}

// ❌ BAD
interface Props {}
type status = string;
const max_retries = 3;
function calculate_total() {}
```

### 5. **Organize Imports**

```typescript
// ✅ GOOD order: React → External → Internal
import React from "react";
import type { ReactNode } from "react";

import axios from "axios";
import type { AxiosResponse } from "axios";

import { Button } from "@/components";
import type { ButtonProps } from "@/types";
```

## Ignoring Rules

### Use Sparingly

```typescript
// ✅ Acceptable: Documented exception
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = JSON.parse(configString);

// ❌ Bad: No explanation
// eslint-disable-next-line
const result: any = getValue();
```

### File-Level Ignores

In `.eslintignore`:

```
# Temporary files being refactored
packages/dashboard/deploy-to-r2.ts
```

## Running Linting

### Local Development

```bash
# Check for issues (non-destructive)
bun run lint

# Auto-fix what you can
bun run lint:fix

# Then format
bun run format

# Type check
bun run typecheck
```

### Before Pushing

```bash
# Run full check suite
bun run lint && \
bun run typecheck && \
bun run format:check && \
bun run build
```

### In CI/CD

Automated via GitHub Actions (see `.github/workflows/lint.yml`)

## Troubleshooting

### Linter Won't Install

```bash
# Clear bun cache
bun install --frozen-lockfile

# Reinstall
bun install --save-dev eslint
```

### TypeScript Errors After Lint

```bash
# Rebuild everything
bun clean
bun install
bun run build
```

### Format Conflicts

```bash
# Fix conflicts in order
bun run lint:fix
bun run format
bun run typecheck
```

## Additional Resources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Bun Documentation](https://bun.sh/docs)

## IDE Setup

### VS Code Extensions

Install recommended extensions:

- ESLint (dbaeumer.vscode-eslint)
- Prettier - Code formatter (esbenp.prettier-vscode)
- TypeScript Vue Plugin (Vue 3) (Vue.vscode-typescript-vue-plugin)

### Settings (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

**Questions?**

- Check [Troubleshooting](./TROUBLESHOOTING.md)
- Report issues on [GitHub](https://github.com/brendadeeznuts1111/foxy-duo-proxy/issues)
