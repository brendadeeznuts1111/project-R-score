// [TOOL][META][INDEX][STORAGE][META-01][v1.0][ACTIVE]
// Bun-native: use Bun.file() and Bun.write() instead of fs

import type { HashAlgorithm } from './hash';

// Helper function for ensuring directories exist
async function ensureDirectory(dirPath: string): Promise<void> {
  const exists = await Bun.file(dirPath).exists();
  if (!exists) {
    await Bun.$`mkdir -p ${dirPath}`.quiet();
  }
}

export interface IndexEntry {
  originalUrl: string;        // Original source map URL
  originalFilename: string;   // Original filename (e.g., app.bundle.js.map)
  hash: string;              // Content hash
  algorithm: HashAlgorithm;  // Hash algorithm used
  storedPath: string;        // Path where file is stored (e.g., sha256_abc123.map)
  size: number;              // File size in bytes
  canonicalSize: number;     // Canonicalized size
  downloadedAt: number;      // Unix timestamp
  lastVerified: number;      // Last integrity check timestamp
  checksumVerified: boolean; // Whether checksum was verified on download
}

export interface IndexFile {
  version: number;           // Index format version
  createdAt: number;         // When index was created
  lastUpdated: number;       // When index was last updated
  entries: Record<string, IndexEntry>; // Keyed by original URL
}

// [FUNCTION][IMPLEMENTATION][META][LOAD-01][v1.0][ACTIVE]
// Load index file from disk

export async function loadIndex(indexPath: string): Promise<IndexFile> {
  const file = Bun.file(indexPath);
  if (!(await file.exists())) {
    return createEmptyIndex();
  }

  try {
    const content = await file.text();
    const index: IndexFile = JSON.parse(content);

    // Validate index format
    if (!index.version || !index.entries) {
      console.warn(`⚠️  Invalid index format in ${indexPath}, creating new index`);
      return createEmptyIndex();
    }

    // Migrate if needed (future versions)
    if (index.version < 1) {
      console.warn(`⚠️  Migrating index from version ${index.version} to 1`);
      index.version = 1;
      index.lastUpdated = Date.now();
    }

    return index;
  } catch (error) {
    console.warn(`⚠️  Failed to load index ${indexPath}: ${error.message}`);
    return createEmptyIndex();
  }
}

// [FUNCTION][IMPLEMENTATION][META][SAVE-01][v1.0][ACTIVE]
// Save index file to disk

export async function saveIndex(indexPath: string, index: IndexFile): Promise<void> {
  try {
    index.lastUpdated = Date.now();

    // Ensure directory exists
    const dir = dirname(indexPath);
    await ensureDirectory(dir);

    const content = JSON.stringify(index, null, 2);
    await Bun.write(indexPath, content);
  } catch (error) {
    console.error(`❌ Failed to save index ${indexPath}: ${error.message}`);
  }
}

// [FUNCTION][IMPLEMENTATION][META][CREATE-EMPTY-01][v1.0][ACTIVE]
// Create empty index

function createEmptyIndex(): IndexFile {
  return {
    version: 1,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    entries: {}
  };
}

// [FUNCTION][IMPLEMENTATION][META][FIND-01][v1.0][ACTIVE]
// Find entry by original URL

export function findEntry(index: IndexFile, originalUrl: string): IndexEntry | null {
  return index.entries[originalUrl] || null;
}

// [FUNCTION][IMPLEMENTATION][META][FIND-BY-HASH-01][v1.0][ACTIVE]
// Find entries by hash (for deduplication)

export function findEntriesByHash(index: IndexFile, hash: string): IndexEntry[] {
  return Object.values(index.entries).filter(entry => entry.hash === hash);
}

// [FUNCTION][IMPLEMENTATION][META][ADD-ENTRY-01][v1.0][ACTIVE]
// Add or update entry in index

export function addEntry(index: IndexFile, entry: IndexEntry): void {
  index.entries[entry.originalUrl] = entry;
  index.lastUpdated = Date.now();
}

// [FUNCTION][IMPLEMENTATION][META][REMOVE-ENTRY-01][v1.0][ACTIVE]
// Remove entry from index

export function removeEntry(index: IndexFile, originalUrl: string): boolean {
  if (index.entries[originalUrl]) {
    delete index.entries[originalUrl];
    index.lastUpdated = Date.now();
    return true;
  }
  return false;
}

// [FUNCTION][IMPLEMENTATION][META][GET-INDEX-PATH-01][v1.0][ACTIVE]
// Get standard index file path for a maps directory

export function getIndexPath(mapsDir: string): string {
  return `${mapsDir}/.smd-index.json`;
}

// [FUNCTION][IMPLEMENTATION][META][CLEANUP-01][v1.0][ACTIVE]
// Remove orphaned entries (files that no longer exist on disk)

export async function cleanupOrphanedEntries(index: IndexFile, mapsDir: string): Promise<number> {
  const entries = Object.values(index.entries);
  let removedCount = 0;

  for (const entry of entries) {
    if (!(await Bun.file(entry.storedPath).exists())) {
      console.log(`🧹 Removing orphaned entry: ${entry.originalFilename} (${entry.hash})`);
      removeEntry(index, entry.originalUrl);
      removedCount++;
    }
  }

  return removedCount;
}

// [FUNCTION][IMPLEMENTATION][META][STATS-01][v1.0][ACTIVE]
// Get index statistics

export function getIndexStats(index: IndexFile): {
  totalEntries: number;
  totalSize: number;
  uniqueHashes: number;
  algorithms: Record<string, number>;
} {
  const entries = Object.values(index.entries);
  const hashes = new Set(entries.map(e => e.hash));
  const algorithms: Record<string, number> = {};

  let totalSize = 0;

  for (const entry of entries) {
    totalSize += entry.size;
    algorithms[entry.algorithm] = (algorithms[entry.algorithm] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    totalSize,
    uniqueHashes: hashes.size,
    algorithms
  };
}
