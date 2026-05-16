# CPU Profile

| Duration | Samples | Interval | Functions |
|----------|---------|----------|----------|
| 40.8ms | 33 | 1.0ms | 41 |

**Top 10:** `fetch` 33.6%, `toLocaleDateString` 27.4%, `parseModule` 8.6%, `moduleDeclarationInstantiation` 6.0%, `generateMarkdownWiki` 3.6%, `async generateWikiWithR2` 3.5%, `resolve` 3.1%, `generateTOC` 3.0%, `(anonymous)` 2.9%, `(anonymous)` 2.8%

## Hot Functions (Self Time)

| Self% | Self | Total% | Total | Function | Location |
|------:|-----:|-------:|------:|----------|----------|
| 33.6% | 13.7ms | 33.6% | 13.7ms | `fetch` | `[native code]` |
| 27.4% | 11.2ms | 27.4% | 11.2ms | `toLocaleDateString` | `[native code]` |
| 8.6% | 3.5ms | 11.1% | 4.5ms | `parseModule` | `[native code]` |
| 6.0% | 2.4ms | 6.0% | 2.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 3.6% | 1.4ms | 3.6% | 1.4ms | `generateMarkdownWiki` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 3.5% | 1.4ms | 3.5% | 1.4ms | `async generateWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 3.1% | 1.2ms | 3.1% | 1.2ms | `resolve` | `[native code]` |
| 3.0% | 1.2ms | 3.0% | 1.2ms | `generateTOC` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 2.9% | 1.2ms | 2.9% | 1.2ms | `(anonymous)` | `/Users/nolarose/Projects/lib/core/error-handling.ts` |
| 2.8% | 1.1ms | 2.8% | 1.1ms | `(anonymous)` | `/Users/nolarose/Projects/lib/docs/constants/enums.ts:233` |
| 2.6% | 1.0ms | 2.6% | 1.0ms | `keys` | `[native code]` |
| 2.5% | 1.0ms | 5.0% | 2.0ms | `anonymous` | `[native code]` |

## Call Tree (Total Time)

| Total% | Total | Self% | Self | Function | Location |
|-------:|------:|------:|-----:|----------|----------|
| 81.5% | 33.2ms | 0.0% | 0us | `async (anonymous)` | `[native code]` |
| 34.0% | 13.9ms | 0.0% | 0us | `generateMarkdownWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1457` |
| 34.0% | 13.9ms | 0.0% | 0us | `async createWikiFilesWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1398` |
| 34.0% | 13.9ms | 0.0% | 0us | `async generateWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1386` |
| 34.0% | 13.9ms | 0.0% | 0us | `async createWikiFilesWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1411` |
| 33.6% | 13.7ms | 0.0% | 0us | `(anonymous)` | `[native code]` |
| 33.6% | 13.7ms | 33.6% | 13.7ms | `fetch` | `[native code]` |
| 33.6% | 13.7ms | 0.0% | 0us | `requestInstantiate` | `[native code]` |
| 33.6% | 13.7ms | 0.0% | 0us | `requestSatisfyUtil` | `[native code]` |
| 33.6% | 13.7ms | 0.0% | 0us | `requestFetch` | `[native code]` |
| 27.4% | 11.2ms | 27.4% | 11.2ms | `toLocaleDateString` | `[native code]` |
| 27.4% | 11.2ms | 0.0% | 0us | `generateMarkdownWiki` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:516` |
| 24.0% | 9.8ms | 0.0% | 0us | `link` | `[native code]` |
| 17.4% | 7.1ms | 0.0% | 0us | `moduleEvaluation` | `[native code]` |
| 12.0% | 4.9ms | 0.0% | 0us | `evaluate` | `[native code]` |
| 12.0% | 4.9ms | 0.0% | 0us | `async asyncModuleEvaluation` | `[native code]` |
| 11.1% | 4.5ms | 8.6% | 3.5ms | `parseModule` | `[native code]` |
| 6.2% | 2.5ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1962` |
| 6.2% | 2.5ms | 0.0% | 0us | `async main` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1896` |
| 6.2% | 2.5ms | 0.0% | 0us | `async main` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1839` |
| 6.0% | 2.4ms | 0.0% | 0us | `linkAndEvaluateModule` | `[native code]` |
| 6.0% | 2.4ms | 0.0% | 0us | `async loadAndEvaluateModule` | `[native code]` |
| 6.0% | 2.4ms | 6.0% | 2.4ms | `moduleDeclarationInstantiation` | `[native code]` |
| 5.0% | 2.0ms | 2.5% | 1.0ms | `anonymous` | `[native code]` |
| 3.6% | 1.4ms | 3.6% | 1.4ms | `generateMarkdownWiki` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 3.5% | 1.4ms | 3.5% | 1.4ms | `async generateWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 3.1% | 1.2ms | 3.1% | 1.2ms | `resolve` | `[native code]` |
| 3.0% | 1.2ms | 3.0% | 1.2ms | `generateTOC` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 3.0% | 1.2ms | 0.0% | 0us | `generateMarkdownWiki` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:523` |
| 2.9% | 1.2ms | 2.9% | 1.2ms | `(anonymous)` | `/Users/nolarose/Projects/lib/core/error-handling.ts` |
| 2.9% | 1.2ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/lib/core/error-handling.ts:69` |
| 2.8% | 1.1ms | 0.0% | 0us | `(module)` | `/Users/nolarose/Projects/lib/docs/constants/enums.ts:268` |
| 2.8% | 1.1ms | 2.8% | 1.1ms | `(anonymous)` | `/Users/nolarose/Projects/lib/docs/constants/enums.ts:233` |
| 2.6% | 1.0ms | 0.0% | 0us | `validateFragment` | `/Users/nolarose/Projects/lib/docs/builders/validator.ts:349` |
| 2.6% | 1.0ms | 0.0% | 0us | `validateDocumentationURL` | `/Users/nolarose/Projects/lib/docs/builders/validator.ts:110` |
| 2.6% | 1.0ms | 0.0% | 0us | `async generateWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1375` |
| 2.6% | 1.0ms | 0.0% | 0us | `generateWikiURLs` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:436` |
| 2.6% | 1.0ms | 0.0% | 0us | `async generateWikiWithR2` | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1370` |
| 2.6% | 1.0ms | 2.6% | 1.0ms | `keys` | `[native code]` |
| 2.5% | 1.0ms | 0.0% | 0us | `internal:validators` | `internal:validators:2` |
| 2.5% | 1.0ms | 0.0% | 0us | `node:url` | `node:url:2` |

## Function Details

### `fetch`
`[native code]` | Self: 33.6% (13.7ms) | Total: 33.6% (13.7ms) | Samples: 11

**Called by:**
- `requestFetch` (11)

### `toLocaleDateString`
`[native code]` | Self: 27.4% (11.2ms) | Total: 27.4% (11.2ms) | Samples: 9

**Called by:**
- `generateMarkdownWiki` (9)

### `parseModule`
`[native code]` | Self: 8.6% (3.5ms) | Total: 11.1% (4.5ms) | Samples: 3

**Called by:**
- `async (anonymous)` (4)

**Calls:**
- `node:url` (1)

### `moduleDeclarationInstantiation`
`[native code]` | Self: 6.0% (2.4ms) | Total: 6.0% (2.4ms) | Samples: 2

**Called by:**
- `link` (2)

### `generateMarkdownWiki`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` | Self: 3.6% (1.4ms) | Total: 3.6% (1.4ms) | Samples: 1

**Called by:**
- `generateMarkdownWikiWithR2` (1)

### `async generateWikiWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` | Self: 3.5% (1.4ms) | Total: 3.5% (1.4ms) | Samples: 1

**Called by:**
- `async main` (1)

### `resolve`
`[native code]` | Self: 3.1% (1.2ms) | Total: 3.1% (1.2ms) | Samples: 1

**Called by:**
- `async (anonymous)` (1)

### `generateTOC`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` | Self: 3.0% (1.2ms) | Total: 3.0% (1.2ms) | Samples: 1

**Called by:**
- `generateMarkdownWiki` (1)

### `(anonymous)`
`/Users/nolarose/Projects/lib/core/error-handling.ts` | Self: 2.9% (1.2ms) | Total: 2.9% (1.2ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `(anonymous)`
`/Users/nolarose/Projects/lib/docs/constants/enums.ts:233` | Self: 2.8% (1.1ms) | Total: 2.8% (1.1ms) | Samples: 1

**Called by:**
- `(module)` (1)

### `keys`
`[native code]` | Self: 2.6% (1.0ms) | Total: 2.6% (1.0ms) | Samples: 1

**Called by:**
- `validateFragment` (1)

### `anonymous`
`[native code]` | Self: 2.5% (1.0ms) | Total: 5.0% (2.0ms) | Samples: 1

**Called by:**
- `internal:validators` (1)
- `node:url` (1)

**Calls:**
- `internal:validators` (1)

### `async generateWikiWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1386` | Self: 0.0% (0us) | Total: 34.0% (13.9ms) | Samples: 0

**Calls:**
- `async createWikiFilesWithR2` (11)

### `(module)`
`/Users/nolarose/Projects/lib/docs/constants/enums.ts:268` | Self: 0.0% (0us) | Total: 2.8% (1.1ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `generateMarkdownWikiWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1457` | Self: 0.0% (0us) | Total: 34.0% (13.9ms) | Samples: 0

**Called by:**
- `async createWikiFilesWithR2` (11)

**Calls:**
- `generateMarkdownWiki` (9)
- `generateMarkdownWiki` (1)
- `generateMarkdownWiki` (1)

### `linkAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 6.0% (2.4ms) | Samples: 0

**Called by:**
- `async loadAndEvaluateModule` (2)

**Calls:**
- `link` (2)

### `async createWikiFilesWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1411` | Self: 0.0% (0us) | Total: 34.0% (13.9ms) | Samples: 0

**Called by:**
- `async createWikiFilesWithR2` (11)

**Calls:**
- `generateMarkdownWikiWithR2` (11)

### `async generateWikiWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1370` | Self: 0.0% (0us) | Total: 2.6% (1.0ms) | Samples: 0

**Called by:**
- `async main` (1)

**Calls:**
- `async generateWikiWithR2` (1)

### `node:url`
`node:url:2` | Self: 0.0% (0us) | Total: 2.5% (1.0ms) | Samples: 0

**Called by:**
- `parseModule` (1)

**Calls:**
- `anonymous` (1)

### `requestFetch`
`[native code]` | Self: 0.0% (0us) | Total: 33.6% (13.7ms) | Samples: 0

**Called by:**
- `async (anonymous)` (11)

**Calls:**
- `fetch` (11)

### `link`
`[native code]` | Self: 0.0% (0us) | Total: 24.0% (9.8ms) | Samples: 0

**Called by:**
- `link` (6)
- `linkAndEvaluateModule` (2)

**Calls:**
- `link` (6)
- `moduleDeclarationInstantiation` (2)

### `async generateWikiWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1375` | Self: 0.0% (0us) | Total: 2.6% (1.0ms) | Samples: 0

**Called by:**
- `async generateWikiWithR2` (1)

**Calls:**
- `generateWikiURLs` (1)

### `requestSatisfyUtil`
`[native code]` | Self: 0.0% (0us) | Total: 33.6% (13.7ms) | Samples: 0

**Called by:**
- `(anonymous)` (11)

**Calls:**
- `requestInstantiate` (11)

### `validateDocumentationURL`
`/Users/nolarose/Projects/lib/docs/builders/validator.ts:110` | Self: 0.0% (0us) | Total: 2.6% (1.0ms) | Samples: 0

**Called by:**
- `generateWikiURLs` (1)

**Calls:**
- `validateFragment` (1)

### `generateWikiURLs`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:436` | Self: 0.0% (0us) | Total: 2.6% (1.0ms) | Samples: 0

**Called by:**
- `async generateWikiWithR2` (1)

**Calls:**
- `validateDocumentationURL` (1)

### `async asyncModuleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 12.0% (4.9ms) | Samples: 0

**Calls:**
- `moduleEvaluation` (2)
- `evaluate` (2)

### `requestInstantiate`
`[native code]` | Self: 0.0% (0us) | Total: 33.6% (13.7ms) | Samples: 0

**Called by:**
- `requestSatisfyUtil` (11)

**Calls:**
- `async (anonymous)` (11)

### `moduleEvaluation`
`[native code]` | Self: 0.0% (0us) | Total: 17.4% (7.1ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (4)
- `async asyncModuleEvaluation` (2)

**Calls:**
- `moduleEvaluation` (4)
- `evaluate` (2)

### `async main`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1839` | Self: 0.0% (0us) | Total: 6.2% (2.5ms) | Samples: 0

**Called by:**
- `(module)` (2)

**Calls:**
- `async main` (2)

### `(anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 33.6% (13.7ms) | Samples: 0

**Calls:**
- `requestSatisfyUtil` (11)

### `validateFragment`
`/Users/nolarose/Projects/lib/docs/builders/validator.ts:349` | Self: 0.0% (0us) | Total: 2.6% (1.0ms) | Samples: 0

**Called by:**
- `validateDocumentationURL` (1)

**Calls:**
- `keys` (1)

### `generateMarkdownWiki`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:516` | Self: 0.0% (0us) | Total: 27.4% (11.2ms) | Samples: 0

**Called by:**
- `generateMarkdownWikiWithR2` (9)

**Calls:**
- `toLocaleDateString` (9)

### `async createWikiFilesWithR2`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1398` | Self: 0.0% (0us) | Total: 34.0% (13.9ms) | Samples: 0

**Called by:**
- `async generateWikiWithR2` (11)

**Calls:**
- `async createWikiFilesWithR2` (11)

### `generateMarkdownWiki`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:523` | Self: 0.0% (0us) | Total: 3.0% (1.2ms) | Samples: 0

**Called by:**
- `generateMarkdownWikiWithR2` (1)

**Calls:**
- `generateTOC` (1)

### `evaluate`
`[native code]` | Self: 0.0% (0us) | Total: 12.0% (4.9ms) | Samples: 0

**Called by:**
- `moduleEvaluation` (2)
- `async asyncModuleEvaluation` (2)

**Calls:**
- `(module)` (2)
- `(module)` (1)
- `(module)` (1)

### `async loadAndEvaluateModule`
`[native code]` | Self: 0.0% (0us) | Total: 6.0% (2.4ms) | Samples: 0

**Calls:**
- `linkAndEvaluateModule` (2)

### `async (anonymous)`
`[native code]` | Self: 0.0% (0us) | Total: 81.5% (33.2ms) | Samples: 0

**Called by:**
- `async (anonymous)` (11)
- `requestInstantiate` (11)

**Calls:**
- `requestFetch` (11)
- `async (anonymous)` (11)
- `parseModule` (4)
- `resolve` (1)

### `(module)`
`/Users/nolarose/Projects/lib/core/error-handling.ts:69` | Self: 0.0% (0us) | Total: 2.9% (1.2ms) | Samples: 0

**Called by:**
- `evaluate` (1)

**Calls:**
- `(anonymous)` (1)

### `internal:validators`
`internal:validators:2` | Self: 0.0% (0us) | Total: 2.5% (1.0ms) | Samples: 0

**Called by:**
- `anonymous` (1)

**Calls:**
- `anonymous` (1)

### `async main`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1896` | Self: 0.0% (0us) | Total: 6.2% (2.5ms) | Samples: 0

**Called by:**
- `async main` (2)

**Calls:**
- `async generateWikiWithR2` (1)
- `async generateWikiWithR2` (1)

### `(module)`
`/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts:1962` | Self: 0.0% (0us) | Total: 6.2% (2.5ms) | Samples: 0

**Called by:**
- `evaluate` (2)

**Calls:**
- `async main` (2)

## Files

| Self% | Self | File |
|------:|-----:|------|
| 84.0% | 34.2ms | `[native code]` |
| 10.1% | 4.1ms | `/Users/nolarose/Projects/lib/wiki/wiki-generator-cli.ts` |
| 2.9% | 1.2ms | `/Users/nolarose/Projects/lib/core/error-handling.ts` |
| 2.8% | 1.1ms | `/Users/nolarose/Projects/lib/docs/constants/enums.ts` |
