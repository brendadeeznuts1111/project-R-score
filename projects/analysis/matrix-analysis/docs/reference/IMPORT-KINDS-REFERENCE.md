# 📦 Bun.Transpiler Import Kinds Reference

## Import Types Detection

Bun.Transpiler can detect 6 different import kinds:

### 1. `import-statement`

**Syntax:** `import React from 'react'`

```typescript
// Default import
import React from 'react';

// Named import
import { useState } from 'react';

// Namespace import
import * as utils from './utils';

// Type-only import
import type { User } from './types';
```

**Characteristics:**

- ✅ Tree-shakable
- ✅ Static analysis friendly
- ✅ Best for bundlers
- ✅ TypeScript support

### 2. `require-call`

**Syntax:** `const val = require('./cjs.js')`

```typescript
// Simple require
const fs = require('fs');

// Destructured require
const { readFile } = require('fs');

// Dynamic require
const module = require('./' + moduleName + '.js');
```

**Characteristics:**

- ❌ Not tree-shakable
- ⚠️ Runtime evaluation
- ✅ CommonJS compatible
- ⚠️ Limited TypeScript support

### 3. `require-resolve`

**Syntax:** `require.resolve('./cjs.js')`

```typescript
// Get absolute path
const modulePath = require.resolve('./module');

// Find module in node_modules
const packagePath = require.resolve('lodash');
```

**Characteristics:**

- ✅ Runtime path resolution
- ✅ Returns absolute path
- ✅ Module location detection
- ❌ No code execution

### 4. `dynamic-import`

**Syntax:** `import('./loader')`

```typescript
// Basic dynamic import
const module = await import('./module');

// Template literal path
const admin = await import(`./admin/${role}.js`);

// Conditional import
if (process.env.NODE_ENV === 'development') {
  const devTools = await import('./dev-tools');
}
```

**Characteristics:**

- ✅ Code splitting
- ✅ Lazy loading
- ✅ Conditional loading
- ✅ Promise-based

### 5. `import-rule`

**Syntax:** `@import 'foo.css'`

```css
/* CSS imports */
@import 'bootstrap/dist/css/bootstrap.min.css';
@import url('https://fonts.googleapis.com/css2?family=Inter');
@import './styles/main.css';
```

**Characteristics:**

- ✅ CSS preprocessing
- ✅ Font loading
- ✅ Style bundling
- ⚠️ Network requests for external URLs

### 6. `url-token`

**Syntax:** `url('./foo.png')`

```css
/* Asset references */
background: url('./images/background.jpg');
background-image: url('../assets/logo.svg');
cursor: url('./cursors/pointer.cur'), auto;
```

**Characteristics:**

- ✅ Asset optimization
- ✅ Hash generation
- ✅ CDN support
- ✅ Cache busting

## Detection Example

```typescript
const transpiler = new Bun.Transpiler({ loader: 'ts' });
const imports = transpiler.scanImports(code);

imports.forEach(imp => {
  console.log(`${imp.kind}: ${imp.path}`);
});
```

## Transformation Strategies

### For Modern Bundlers

1. Convert `require-call` → `import-statement`
2. Keep `dynamic-import` for code splitting
3. Process `import-rule` with CSS loaders
4. Optimize `url-token` assets

### For Node.js Compatibility

1. Keep `require-call` for built-in modules
2. Use `require-resolve` for path resolution
3. Transform ES6 imports to CommonJS if needed

### For Browser Targets

1. Polyfill `require` for browser
2. Bundle `dynamic-import` chunks
3. Inline small `url-token` assets
4. Minify CSS `import-rule`

## Best Practices

```typescript
// ✅ Preferred: ES6 imports
import React from 'react';
import { useState } from 'react';

// ✅ Use for code splitting
const LazyComponent = lazy(() => import('./LazyComponent'));

// ⚠️ Use sparingly: CommonJS
const fs = require('fs'); // Only for Node.js built-ins

// ✅ Use for path resolution
const configPath = require.resolve('./config.json');

// ✅ Use for assets
import logoUrl from './assets/logo.png';
import './styles/main.css';
```

## Quick Decision Tree

```text
Need static dependency?
  ├─ Yes → Use import-statement
  └─ No
      Need code splitting?
        ├─ Yes → Use dynamic-import
        └─ No
            Need CSS/Asset?
              ├─ Yes → Use import-rule / url-token
              └─ No
                  Need path only?
                    ├─ Yes → Use require-resolve
                    └─ No → Use require-call (legacy)
```

Understanding import kinds helps optimize your bundling strategy! 🚀
