// config/urls.ts - Bun-native URL configuration
import { file } from 'bun';

// Define constants following Bun's documentation pattern
export const BUN_DOCS = {
  // Base URLs (aligned with bun.sh/docs pattern)
  BASE: 'https://bun.sh/docs',
  
  // API endpoints following the bun.sh/docs/{category}/{section} pattern
  API: {
    FETCH: '/api/fetch',
    HTTP: '/api/http',
    WEBSOCKET: '/api/websocket',
    SERVE: '/api/serve',
  },
  
  // Runtime documentation following bun.sh/docs/runtime/{category}
  RUNTIME: {
    BINARY_DATA: '/runtime/binary-data',
    FILESYSTEM: '/runtime/filesystem',
    PROCESS: '/runtime/process',
    NETWORKING: '/runtime/networking',
  },
  
  // Guides following bun.sh/docs/guides/{topic}
  GUIDES: {
    READ_FILE: '/guides/read-file',
    WRITE_FILE: '/guides/write-file',
    STREAMS: '/guides/streams',
  }
} as const;

// Typed array specific URLs (our focus)
export const TYPED_ARRAY_URLS = {
  BASE: `${BUN_DOCS.RUNTIME.BINARY_DATA}#typedarray`,
  METHODS: `${BUN_DOCS.RUNTIME.BINARY_DATA}#methods`,
  CONVERSION: `${BUN_DOCS.RUNTIME.BINARY_DATA}#conversion`,
  EXAMPLES: `${BUN_DOCS.RUNTIME.BINARY_DATA}#examples`,
} as const;

// RSS feed URLs
export const RSS_URLS = {
  BUN_BLOG: 'https://bun.sh/rss.xml',
  BUN_UPDATES: 'https://bun.sh/updates/feed.xml',
  OUR_FEED: '/feed/rss', // Our own generated feed
} as const;
