# 🔗 Mermaid Live Editor URL Generation Guide

Generate shareable Mermaid diagram URLs with CRC32 checksums for integrity verification.

## Overview

This feature provides utilities to:
- Generate shareable Mermaid Live Editor URLs
- Calculate CRC32 checksums using hardware acceleration (20x faster)
- Verify diagram integrity
- Encode diagrams as URL-safe base64

## Quick Start

```javascript
import { generateMermaidLiveUrl, verifyMermaidIntegrity } from './src/database-utilities.js';

const diagram = `graph TB
    A["Component A"]
    B["Component B"]
    A --> B`;

// Generate shareable URL
const result = generateMermaidLiveUrl(diagram, { theme: 'dark' });
console.log(result.url);  // https://mermaid.live/edit#pako:...&crc=...

// Verify integrity
const isValid = verifyMermaidIntegrity(diagram, result.hash);
console.log(isValid);  // true
```

## API Reference

### `generateMermaidLiveUrl(mermaidDot, options)`

Generates a shareable Mermaid Live Editor URL with CRC32 checksum.

**Parameters:**
- `mermaidDot` (string) - Mermaid diagram syntax
- `options` (object) - Configuration:
  - `theme` (string) - 'dark', 'light', or 'default' (default: 'dark')
  - `autoSync` (boolean) - Enable auto-sync (default: true)

**Returns:**
```javascript
{
  success: true,
  url: "https://mermaid.live/edit#pako:...&crc=...",
  hash: "bd011e71",
  theme: "dark",
  autoSync: true,
  message: "Mermaid Live Editor URL generated successfully"
}
```

### `verifyMermaidIntegrity(mermaidDot, expectedHash)`

Verifies diagram integrity using CRC32.

**Parameters:**
- `mermaidDot` (string) - Mermaid diagram syntax
- `expectedHash` (string) - Expected CRC32 hash (hex string)

**Returns:** boolean - True if hash matches

## Performance

Uses Bun's hardware-accelerated CRC32:
- **1MB buffer**: ~0.3ms (3,000+ MB/s)
- **20x faster** than software-only implementation
- Leverages zlib's hardware acceleration

## Usage Examples

### In Quantum Hyper Engine

```javascript
const engine = new QuantumHyperEngine();
const graph = engine.buildGraph();
const mermaid = engine.generateMermaidDiagram(graph);

// Generate shareable link
const result = engine.generateMermaidLiveLink(mermaid, { theme: 'dark' });
console.log(result.url);
```

### In Deployment Scripts

```bash
# Generate Mermaid URL from diagram file
bun -e "
import { generateMermaidLiveUrl } from './src/database-utilities.js';
const diagram = await Bun.file('./token-graph.mmd').text();
const result = generateMermaidLiveUrl(diagram);
console.log(result.url);
"
```

## URL Structure

The generated URL follows this format:

```text
https://mermaid.live/edit#pako:{base64}&crc={hash}
```

- `pako` - Indicates pako compression format
- `{base64}` - URL-safe base64 encoded state JSON
- `{hash}` - CRC32 checksum (hex) for integrity verification

## State JSON Format

The base64 encodes this JSON structure:

```json
{
  "code": "graph TB\n    A[\"Component A\"]\n    B[\"Component B\"]\n    A --> B",
  "mermaid": {
    "theme": "dark"
  },
  "autoSync": true
}
```

## Integration Points

1. **Quantum Hyper Engine** - `generateMermaidLiveLink()` method
2. **Database Utilities** - Core functions
3. **Deployment Scripts** - Generate URLs for token graphs
4. **CLI Tools** - Share diagrams via URLs

## Testing

Run the example:

```bash
bun examples/mermaid-live-url-example.js
```

## See Also

- [CRC32 Hashing Guide](./BUN-NEW-FEATURES-GUIDE.md#crc32-20x-faster)
- [Quantum Hyper Engine](../api/quantum-hyper-engine.md)
- [Mermaid Live Editor](https://mermaid.live)

