# Contributing

## Optional Local Pre-commit Hook

This repository includes an optional local pre-commit hook at:

- `/Users/nolarose/Projects/.githooks/pre-commit`

Enable it in your local clone:

```bash
git config core.hooksPath .githooks
```

What it runs:

1. `bun run imports:verify`
2. `bun test tests/docs-urls-regression.test.ts`
3. `bun test packages/docs-tools/src/documentation-validator.test.ts`

You can run the same checks manually with:

```bash
bun run precommit:check
```
