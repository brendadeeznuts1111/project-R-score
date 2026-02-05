# Code Standards & Formatting Guide

## Overview

This document outlines the coding standards and formatting conventions for the
Fantasy42 Dashboard Worker project.

## General Principles

- **Consistency**: Code should be consistent across the entire codebase
- **Readability**: Code should be easy to read and understand
- **Maintainability**: Code should be easy to maintain and modify
- **Performance**: Code should be efficient and avoid wasteful operations

## TypeScript/JavaScript Standards

### File Organization

- One class/interface per file (except utilities)
- Related functions grouped in logical modules
- Clear separation of concerns
- Consistent import/export patterns

### Naming Conventions

- **Files**: kebab-case (e.g., `fantasy42-integration.ts`)
- **Classes**: PascalCase (e.g., `Fantasy42Integration`)
- **Functions/Methods**: camelCase (e.g., `getCustomerInfo`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINT`)
- **Variables**: camelCase (e.g., `customerData`)

### Code Style

- **Indentation**: 2 spaces (not tabs)
- **Line Length**: Maximum 120 characters
- **Braces**: Same line for functions, new line for classes
- **Quotes**: Single quotes for strings, double for JSX
- **Semicolons**: Always use semicolons

### Error Handling

- Use try-catch for async operations
- Provide meaningful error messages
- Log errors appropriately (not excessive console.log)
- Handle edge cases gracefully

### Performance Guidelines

- Avoid unnecessary loops and computations
- Use efficient data structures
- Minimize API calls and database queries
- Cache frequently used data
- Remove debug code before production

## Documentation Standards

### Code Comments

- Use JSDoc for public APIs
- Explain complex logic, not obvious code
- Keep comments up-to-date with code changes
- Use TODO/FIXME sparingly and with action items

### File Headers

```typescript
/**
 * Brief description of the file's purpose
 * Additional context and usage information
 */
```

## Import/Export Standards

### Import Order

1. Node.js built-ins
2. External libraries
3. Internal modules (utilities, types, etc.)
4. Relative imports

### Import Style

```typescript
// Good
import { User } from '../types/user';
import { formatDate } from '../utils/date';

// Avoid
import * as Utils from '../utils';
```

## Anti-Patterns to Avoid

### Excessive Logging

```typescript
// ❌ Bad - Excessive debug logging
console.log('Starting function...');
console.log('Processing data...');
console.log('Data processed:', data);
console.log('Function completed');

// ✅ Good - Minimal essential logging
if (process.env.NODE_ENV === 'development') {
  console.log('Processing customer data');
}
```

### Large Files

- Break down files over 1000 lines into smaller modules
- Separate concerns into different files
- Use index files for clean exports

### Redundant Code

- Extract common functionality into utilities
- Use inheritance/composition appropriately
- Avoid duplicate implementations

## Code Quality Checklist

### Before Commit

- [ ] No console.log statements (except essential errors)
- [ ] Consistent formatting (2-space indentation)
- [ ] No TODO comments without action items
- [ ] Proper error handling
- [ ] JSDoc for public APIs
- [ ] TypeScript types properly defined
- [ ] No unused imports/variables
- [ ] Tests pass (if applicable)

### Performance Review

- [ ] No unnecessary computations
- [ ] Efficient algorithms used
- [ ] Memory leaks prevented
- [ ] API calls optimized
- [ ] Caching implemented where beneficial

## Tools & Automation

### Recommended Extensions

- Prettier (code formatting)
- ESLint (code linting)
- TypeScript Importer (auto-imports)

### Scripts

```bash
# Format code
bun run format

# Lint code
bun run lint

# Type check
bun run type-check
```
