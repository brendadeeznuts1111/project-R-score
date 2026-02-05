// lib/docs/urls.ts - Clean, production-ready
export const BUN_DOCS = {
  // Primary documentation portals
  reference: 'https://bun.sh/reference',
  api: 'https://bun.sh/reference/api',
  cli: 'https://bun.sh/reference/cli',
  guides: 'https://bun.sh/guides',
  
  // TypedArray & binary data (core patterns)
  typedArray: {
    base: 'https://bun.sh/docs/runtime/binary-data#typedarray',
    methods: 'https://bun.sh/docs/runtime/binary-data#methods',
    conversion: 'https://bun.sh/docs/runtime/binary-data#conversion',
    performance: 'https://bun.sh/docs/runtime/binary-data#performance',
  },
  
  // File operations (pattern neighbors)
  file: {
    arrayBuffer: 'https://bun.sh/docs/guides/read-file#arraybuffer',
    uint8Array: 'https://bun.sh/docs/guides/read-file#uint8array',
    dataView: 'https://bun.sh/docs/guides/read-file#dataview',
  },
  
  // Streaming patterns
  streams: {
    binary: 'https://bun.sh/docs/api/streams#binary',
    websocket: 'https://bun.sh/docs/api/websocket#binary',
  },
  
  // Utilities
  toCom: (url: string) => url.replace('bun.sh', 'bun.com'),
  
  // GitHub resources
  github: {
    repo: 'https://github.com/oven-sh/bun',
    bunTypes: (commit = 'af76296637931381e9509c204c5f1af9cc174534') =>
      `https://github.com/oven-sh/bun/tree/${commit}/packages/bun-types`,
    npm: 'https://www.npmjs.com/package/bun-types',
  },
  
  // RSS feeds
  rss: {
    main: 'https://bun.sh/rss.xml',
    blog: 'https://bun.sh/blog/rss.xml',
  },
} as const
