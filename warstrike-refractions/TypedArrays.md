# Typed Arrays in Bun

## Core Documentation
- **Overview**: ${BUN_DOCS.typedArray}
- **Methods**: ${BUN_DOCS.methods}
- **Performance**: ${BUN_DOCS.performance}

## Common Patterns

### File Reading
```javascript
// ${BUN_DOCS.fileArrayBuffer}
const arrayBuffer = await file.arrayBuffer()
// ${BUN_DOCS.fileUint8Array}
const uint8Array = await file.bytes()
```

### Streaming
```javascript
// ${BUN_DOCS.streamsBinary}
const stream = response.body?.getReader()

// ${BUN_DOCS.websocketBinary}
websocket.send(new Uint8Array(buffer))
```

## Multi-Domain
Same on .com: ${BUN_DOCS.com(BUN_DOCS.typedArray)}
