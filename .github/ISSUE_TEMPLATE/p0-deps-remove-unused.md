---
name: "[P0][DEPS] Remove unused dependencies"
about: Remove unused dependencies to reduce attack surface
title: "[P0][DEPS] Remove unused dependencies (express, axios, chalk)"
labels: tech-debt, p0, dependencies
assignees: dev-team
---

## 📦 Description
Unused dependencies adding 50+ transitive deps to bundle:
- `express` (not used, we use Bun.serve)
- `axios` (use native `fetch`)
- `chalk` (use Bun's color utilities)

## 📋 Acceptance Criteria
- [ ] Remove from package.json
- [ ] Replace any remaining imports with Bun-native alternatives
- [ ] Verify bundle size reduction in CI
- [ ] Update import statements in affected files
- [ ] Run `bun install` to update lockfile

## 🔍 Affected Files
Search for imports:
```bash
grep -r "from ['\"]express['\"]" .
grep -r "from ['\"]axios['\"]" .
grep -r "from ['\"]chalk['\"]" .
```

## 🔄 Replacement Guide

### express → Bun.serve
```typescript
// Before
import express from 'express';
const app = express();

// After
import { serve } from 'bun';
const server = serve({ ... });
```

### axios → fetch
```typescript
// Before
import axios from 'axios';
const res = await axios.get(url);

// After
const res = await fetch(url);
```

### chalk → Bun color utilities
```typescript
// Before
import chalk from 'chalk';
console.log(chalk.red('Error'));

// After
console.log('\x1b[31mError\x1b[0m');
// Or use Bun's built-in color support
```

## 📊 Expected Impact
- Bundle size reduction: ~2MB
- Transitive dependencies: -50
- Attack surface: Reduced

## 🔗 Related
- Part of: Security audit cleanup
- Blocks: Bundle size optimization work
