# Contributing to Bun v1.3.9 Examples

Thank you for your interest in contributing!

## 📝 Adding New Examples

1. Create a new `.ts` file in the appropriate directory
2. Add a header comment explaining the feature
3. Include runnable code with `if (import.meta.main)` check
4. Export functions for reuse
5. Update this README with the new example

## 🎯 Example Structure

```typescript
#!/usr/bin/env bun
/**
 * Feature Name - Brief Description
 *
 * Detailed explanation of what this example demonstrates
 */

// Imports
import { something } from 'bun';

// Main demo function
async function demo() {
  console.log('Feature demo');
}

// Additional helper functions
function helper() {
  // Implementation
}

// Run if executed directly
if (import.meta.main) {
  demo();
}

// Export for testing/importing
export { demo, helper };
```

## 🧪 Testing Examples

```bash
# Run the example
bun run your-example.ts

# Test with debugging
bun --inspect run your-example.ts

# Profile performance
bun --cpu-prof run your-example.ts
```

## 📚 Documentation

- Keep comments clear and concise
- Include expected output where helpful
- Link to relevant Bun documentation
- Add real-world use cases

## 🏷️ Naming Conventions

- Use kebab-case for filenames: `my-feature-demo.ts`
- Use descriptive names: `regex-jit-demo.ts` not `regex.ts`
- Test files end with `.test.ts`
- Benchmark files go in `benchmarks/` directory
