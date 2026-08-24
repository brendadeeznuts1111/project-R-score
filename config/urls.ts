// config/urls.ts - Bun-native URL configuration
// Prefer CANONICAL_SOURCES parts — do not hand-assemble bun.sh/bun.com hosts.
import { CANONICAL_SOURCES, hrefFromInit } from '../lib/docs/bun-site-url.ts';

const DOCS_BASE = hrefFromInit(CANONICAL_SOURCES.docs).replace(/\/$/, '');

// Define constants following Bun's documentation pattern
export const BUN_DOCS = {
  // Base URL (canonical bun.com/docs — not bun.sh)
  BASE: DOCS_BASE,

  // API endpoints following the /docs/{category}/{section} pattern
  API: {
    FETCH: '/api/fetch',
    HTTP: '/api/http',
    WEBSOCKET: '/api/websocket',
    SERVE: '/api/serve',
  },

  // Runtime documentation following /docs/runtime/{category}
  RUNTIME: {
    BINARY_DATA: '/runtime/binary-data',
    FILESYSTEM: '/runtime/filesystem',
    PROCESS: '/runtime/process',
    NETWORKING: '/runtime/networking',
  },

  // Guides following /docs/guides/{topic}
  GUIDES: {
    READ_FILE: '/guides/read-file',
    WRITE_FILE: '/guides/write-file',
    STREAMS: '/guides/streams',
  },
} as const;

// Typed array specific URLs (our focus)
export const TYPED_ARRAY_URLS = {
  BASE: `${BUN_DOCS.RUNTIME.BINARY_DATA}#typedarray`,
  METHODS: `${BUN_DOCS.RUNTIME.BINARY_DATA}#methods`,
  CONVERSION: `${BUN_DOCS.RUNTIME.BINARY_DATA}#conversion`,
  EXAMPLES: `${BUN_DOCS.RUNTIME.BINARY_DATA}#examples`,
} as const;

// RSS feed URLs (corroboration plane — never the HTML blog index)
export const RSS_URLS = {
  /** Bun.com release / changelog RSS 2.0 (`CANONICAL_SOURCES.rss`). */
  BUN_RSS: hrefFromInit(CANONICAL_SOURCES.rss),
  BUN_UPDATES: 'https://bun.com/updates/feed.xml',
  OUR_FEED: '/feed/rss', // Our own generated feed
} as const;
