# Bottleneck Analysis Report

Generated: 2026-02-05T15:31:18.900Z

## Summary

| Metric | Value |
|--------|-------|
| Total Projects | 3 |
| Projects with Profiles | 3 |
| Total Heap Size | 36.68 MB |
| Total Function Objects | 1,353 |
| Total Large Objects (>=10KB) | 2067 |
| Total GC Roots | 3,081 |

## Top Projects by Function Object Count

| Rank | Project | Function Count | Retained Size (MB) |
|------|---------|----------------|---------------------|
| 1 | clawdbot | 1 | N/A |
| 2 | warstrike-refractions | 760 | 0.17 |
| 3 | lib | 592 | 0.12 |

## Largest Objects (>=10KB)

| Rank | Project | Size (bytes) | Size (KB) | Preview |
|------|---------|--------------|-----------|---------|
| 1 | clawdbot | 37,932,591 | 37043.55 | `\| 0 \| `<root>` \| 0 \| 37932591 \|  \|  \|...` |
| 2 | clawdbot | 3,590,927 | 3506.76 | `\| 141425 \| `ModuleRecord` \| 3590927 \| 3590927 ...` |
| 3 | clawdbot | 1,995,020 | 1948.26 | `\| 131955 \| `JSLexicalEnvironment` \| 160 \| 1995...` |
| 4 | clawdbot | 1,992,851 | 1946.14 | `\| 132622 \| `Object` \| 249 \| 1992851 \|  \|  \|...` |
| 5 | clawdbot | 1,568,952 | 1532.18 | `\| 822 \| `GlobalObject` \| 10143 \| 1568952 \| gc...` |
| 6 | clawdbot | 1,192,427 | 1164.48 | `\| 6972 \| `InternalModuleRegistry` \| 1216 \| 119...` |
| 7 | clawdbot | 797,057 | 778.38 | `\| 168125 \| `Object` \| 49 \| 797057 \|  \|  \|...` |
| 8 | clawdbot | 787,672 | 769.21 | `\| 168129 \| `Array` \| 16 \| 787672 \|  \|  \|...` |
| 9 | clawdbot | 786,768 | 768.33 | `\| 168413 \| `Object` \| 32 \| 786768 \|  \|  \|...` |
| 10 | clawdbot | 786,736 | 768.30 | `\| 168414 \| `Array` \| 16 \| 786736 \|  \|  \|...` |
| 11 | clawdbot | 786,640 | 768.20 | `\| 168417 \| `Object` \| 48 \| 786640 \|  \|  \|...` |
| 12 | clawdbot | 786,592 | 768.16 | `\| 168418 \| `Function` \| 32 \| 786592 \|  \| on:...` |
| 13 | clawdbot | 786,560 | 768.13 | `\| 168420 \| `JSLexicalEnvironment` \| 48 \| 78656...` |
| 14 | clawdbot | 786,512 | 768.08 | `\| 168427 \| `Set` \| 32 \| 786512 \|  \|  \|...` |
| 15 | clawdbot | 786,480 | 768.05 | `\| 168636 \| `Cell Butterfly` \| 786480 \| 786480 ...` |
| 16 | clawdbot | 644,353 | 629.25 | `\| 161160 \| `ModuleRecord` \| 644353 \| 644353 \|...` |
| 17 | clawdbot | 577,396 | 563.86 | `\| 119704 \| `ModuleRecord` \| 577396 \| 577396 \|...` |
| 18 | clawdbot | 380,709 | 371.79 | `\| 182677 \| `JSLexicalEnvironment` \| 80 \| 38070...` |
| 19 | clawdbot | 376,969 | 368.13 | `\| 182890 \| `JSLexicalEnvironment` \| 160 \| 3769...` |
| 20 | clawdbot | 357,408 | 349.03 | `\| 135690 \| `JSLexicalEnvironment` \| 64 \| 35740...` |
| 21 | lib | 334,668 | 326.82 | `\| 0 \| `<root>` \| 0 \| 334668 \|  \|  \|...` |
| 22 | clawdbot | 328,769 | 321.06 | `\| 56874 \| `UnlinkedProgramCodeBlock` \| 282 \| 3...` |
| 23 | clawdbot | 328,487 | 320.79 | `\| 67664 \| `UnlinkedFunctionExecutable` \| 96 \| ...` |
| 24 | clawdbot | 328,391 | 320.69 | `\| 67608 \| `UnlinkedFunctionCodeBlock` \| 164847 ...` |
| 25 | clawdbot | 305,983 | 298.81 | `\| 123749 \| `ModuleRecord` \| 305983 \| 305983 \|...` |
| 26 | warstrike-refractions | 278,081 | 271.56 | `\| 0 \| `<root>` \| 0 \| 278081 \|  \|  \|...` |
| 27 | clawdbot | 262,224 | 256.08 | `\| 10165 \| `Map` \| 32 \| 262224 \|  \|  \|...` |
| 28 | clawdbot | 262,192 | 256.05 | `\| 10288 \| `Cell Butterfly` \| 262192 \| 262192 \...` |
| 29 | clawdbot | 228,536 | 223.18 | `\| 54831 \| `FunctionCodeBlock` \| 228536 \| 22853...` |
| 30 | clawdbot | 222,265 | 217.06 | `\| 182331 \| `JSLexicalEnvironment` \| 608 \| 2222...` |

## Top Projects by GC Root Count

| Rank | Project | GC Root Count |
|------|---------|---------------|
| 1 | clawdbot | 1,361 |
| 2 | warstrike-refractions | 869 |
| 3 | lib | 851 |

## Detailed Project Breakdown

### warstrike-refractions

- **Path**: `/Users/nolarose/Projects/warstrike-refractions/profile.md`
- **Function Objects**: 760
- **Large Objects (>=10KB)**: 4
- **GC Roots**: 869

#### Large Objects:
- 271.56 KB: `| 0 | `<root>` | 0 | 278081 |  |  |...`
- 216.58 KB: `| 477 | `GlobalObject` | 10059 | 221773 | gcroot=1  |  |...`
- 24.78 KB: `| 1857 | `ModuleLoader` | 39 | 25370 |  |  |...`
- 17.36 KB: `| 2865 | `Uint8Array` | 129 | 17776 |  |  |...`

### clawdbot

- **Path**: `/Users/nolarose/Projects/clawdbot/profile.md`
- **Function Objects**: 1
- **Large Objects (>=10KB)**: 2042
- **GC Roots**: 1,361

#### Large Objects:
- 37043.55 KB: `| 0 | `<root>` | 0 | 37932591 |  |  |...`
- 256.08 KB: `| 10165 | `Map` | 32 | 262224 |  |  |...`
- 128.08 KB: `| 80843 | `Map` | 32 | 131152 |  |  |...`
- 50.22 KB: `| 188778 | `Process` | 213 | 51421 |  | url  |...`
- 12.17 KB: `| 170168 | `ModuleRecord` | 12465 | 12465 |  |  |...`
- 12.17 KB: `| 169711 | `ModuleRecord` | 12465 | 12465 |  |  |...`
- 1164.48 KB: `| 6972 | `InternalModuleRegistry` | 1216 | 1192427 |  |  |...`
- 12.08 KB: `| 33759 | `Set` | 32 | 12368 |  |  |...`
- 38.14 KB: `| 150209 | `Uint16Array` | 39058 | 39058 |  |  |...`
- 1532.18 KB: `| 822 | `GlobalObject` | 10143 | 1568952 | gcroot=1  |  |...`

### lib

- **Path**: `/Users/nolarose/Projects/lib/profile.md`
- **Function Objects**: 592
- **Large Objects (>=10KB)**: 21
- **GC Roots**: 851

#### Large Objects:
- 326.82 KB: `| 0 | `<root>` | 0 | 334668 |  |  |...`
- 67.13 KB: `| 376 | `PromiseCombinatorsGlobalContext` | 32 | 68743 | internal=1 |  |...`
- 114.03 KB: `| 1 | `GlobalObject` | 10051 | 116770 | gcroot=1  |  |...`
- 10.59 KB: `| 394 | `JSLexicalEnvironment` | 64 | 10848 |  |  |...`
- 9.95 KB: `| 583 | `Object` | 160 | 10190 |  |  |...`
- 9.87 KB: `| 572 | `Object` | 160 | 10105 |  |  |...`
- 13.43 KB: `| 514 | `Object` | 160 | 13753 |  |  |...`
- 83.21 KB: `| 275 | `InternalPromise` | 32 | 85208 | gcroot=1  |  |...`
- 82.83 KB: `| 336 | `InternalPromise` | 32 | 84815 |  |  |...`
- 10.23 KB: `| 398 | `InternalPromise` | 32 | 10480 |  |  |...`

## Recommendations

### Function Object Optimization

Projects with excessive Function objects (>500):
- **warstrike-refractions**: 760 functions
  - Review closures and function factories
  - Check for event listener cleanup
  - Consider function memoization

- **lib**: 592 functions
  - Review closures and function factories
  - Check for event listener cleanup
  - Consider function memoization

### Large Object Optimization

Projects with large objects (>=10KB):
- **clawdbot**: 109.10 MB total
  - Consider pagination or lazy loading
  - Use streaming for large data
  - Implement object pooling
  - Split large objects into smaller chunks

- **lib**: 1.02 MB total
  - Consider pagination or lazy loading
  - Use streaming for large data
  - Implement object pooling
  - Split large objects into smaller chunks

- **warstrike-refractions**: 0.52 MB total
  - Consider pagination or lazy loading
  - Use streaming for large data
  - Implement object pooling
  - Split large objects into smaller chunks

### GC Root Optimization

Projects with high GC root counts (>100):
- **clawdbot**: 1,361 GC roots
  - Check for memory leaks
  - Review circular references
  - Clean up global variable references
  - Use WeakMap/WeakSet where appropriate
  - Implement proper cleanup in event handlers

- **warstrike-refractions**: 869 GC roots
  - Check for memory leaks
  - Review circular references
  - Clean up global variable references
  - Use WeakMap/WeakSet where appropriate
  - Implement proper cleanup in event handlers

- **lib**: 851 GC roots
  - Check for memory leaks
  - Review circular references
  - Clean up global variable references
  - Use WeakMap/WeakSet where appropriate
  - Implement proper cleanup in event handlers
