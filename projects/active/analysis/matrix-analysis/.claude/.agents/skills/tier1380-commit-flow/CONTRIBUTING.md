# Contributing to Tier-1380 OMEGA Commit Flow

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd tier1380-commit-flow

# Install dependencies
bun install

# Run tests
bun test

# Run setup
bun setup.ts
```

## Project Structure

```
├── cli.ts                 # Main CLI entry point
├── setup.ts               # First-time setup
├── lib/                   # Shared utilities
│   ├── utils.ts          # Bun-native helpers
│   └── config.ts         # Configuration
├── scripts/              # Command scripts
│   ├── install-hooks.ts
│   ├── pre-commit-hook.ts
│   └── ...
├── __tests__/            # Test files
└── references/           # Documentation
```

## Adding a New Command

1. Create a new script in `scripts/`
2. Add the command to `cli.ts` COMMANDS object
3. Add a shortcut alias if appropriate
4. Write tests in `__tests__/`
5. Update SKILL.md documentation

Example:

```typescript
// scripts/my-command.ts
#!/usr/bin/env bun
export async function myCommand(): Promise<void> {
  // Implementation
}

if (import.meta.main) {
  await myCommand();
}
```

```typescript
// cli.ts
const COMMANDS = {
  // ...existing commands
  "my-command": {
    description: "My new command",
    script: "my-command.ts",
    args: "[options]",
  },
};

// Add shortcut
const shortcuts = {
  // ...existing shortcuts
  mc: "my-command",
};
```

## Writing Tests

```typescript
// __tests__/my-command.test.ts
import { describe, it, expect } from "bun:test";
import { myCommand } from "../scripts/my-command";

describe("My command", () => {
  it("should work correctly", async () => {
    const result = await myCommand();
    expect(result).toBeDefined();
  });
});
```

## Code Style

- Use Biome for formatting/linting
- Follow existing naming conventions
- Use Bun-native APIs when available
- Keep functions under 89 lines (Col-89)

## Commit Message Format

All commits must follow Tier-1380 format:

```
[DOMAIN][COMPONENT:NAME][TIER:1380] Brief description
```

Example:
```
[PLATFORM][COMPONENT:FLOW][TIER:1380] Add new validation command
```

## Pull Request Process

1. Create a feature branch: `feature/TIER-1380-my-feature`
2. Make your changes
3. Run tests: `bun test`
4. Run pre-commit checks: `bun scripts/pre-commit-hook.ts`
5. Push and create PR
6. Ensure CI passes

## Questions?

Open an issue or check SKILL.md for detailed documentation.
