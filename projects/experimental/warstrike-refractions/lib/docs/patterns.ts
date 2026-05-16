// lib/docs/patterns.ts - Pattern helpers
import { BUN_DOCS } from './urls'

export const DOC_PATTERNS = {
  // Domain pattern matcher
  isBunUrl: (url: string): boolean => 
    /^https:\/\/bun\.(sh|com)\//.test(url),
  
  // Extract section from URL
  getSection: (url: string): string | null => {
    const match = url.match(/#([^?]+)/)
    return match ? match[1] : null
  },
  
  // Related patterns grouping
  getPatternNeighbors: (url: string): string[] => {
    if (url.includes('binary-data')) {
      return [
        BUN_DOCS.file.arrayBuffer,
        BUN_DOCS.streams.binary,
        BUN_DOCS.streams.websocket,
      ]
    }
    if (url.includes('read-file')) {
      return [
        BUN_DOCS.typedArray.base,
        BUN_DOCS.file.uint8Array,
        BUN_DOCS.file.dataView,
      ]
    }
    return []
  }
} as const
