// docs.ts - Minimal but complete
export const BUN_DOCS = {
  // Core TypedArray docs
  typedArray: 'https://bun.sh/docs/runtime/binary-data#typedarray',
  methods: 'https://bun.sh/docs/runtime/binary-data#methods',
  conversion: 'https://bun.sh/docs/runtime/binary-data#conversion',
  performance: 'https://bun.sh/docs/runtime/binary-data#performance',
  
  // Related patterns
  fileArrayBuffer: 'https://bun.sh/docs/guides/read-file#arraybuffer',
  fileUint8Array: 'https://bun.sh/docs/guides/read-file#uint8array',
  fileDataView: 'https://bun.sh/docs/guides/read-file#dataview',
  
  // Streaming
  streamsBinary: 'https://bun.sh/docs/api/streams#binary',
  websocketBinary: 'https://bun.sh/docs/api/websocket#binary',
  
  // Utils for .com domain
  com: (url: string) => url.replace('bun.sh', 'bun.com')
} as const
