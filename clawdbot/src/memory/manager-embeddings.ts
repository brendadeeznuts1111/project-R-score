/**
 * Embedding batch operations for MemoryIndexManager.
 * Handles batching, caching, and retry logic for embeddings.
 */

import type { DatabaseSync } from "node:sqlite";
import type {
  EmbeddingProvider,
  GeminiEmbeddingClient,
  OpenAiEmbeddingClient,
} from "./embeddings.js";
import {
  OPENAI_BATCH_ENDPOINT,
  type OpenAiBatchRequest,
  runOpenAiEmbeddingBatches,
} from "./batch-openai.js";
import { runGeminiEmbeddingBatches, type GeminiBatchRequest } from "./batch-gemini.js";
import { hashText, type MemoryChunk, parseEmbedding } from "./internal.js";
import type { SessionFileEntry } from "./manager-sessions.js";
import type { MemoryFileEntry } from "./internal.js";

const EMBEDDING_BATCH_MAX_TOKENS = 8000;
const EMBEDDING_APPROX_CHARS_PER_TOKEN = 1;
const EMBEDDING_RETRY_MAX_ATTEMPTS = 3;
const EMBEDDING_RETRY_BASE_DELAY_MS = 500;
const EMBEDDING_RETRY_MAX_DELAY_MS = 8000;

export type MemorySource = "memory" | "sessions";

export type BatchConfig = {
  enabled: boolean;
  wait: boolean;
  concurrency: number;
  pollIntervalMs: number;
  timeoutMs: number;
};

export type EmbeddingCacheConfig = {
  enabled: boolean;
  maxEntries?: number;
};

export type EmbeddingContext = {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  cache: EmbeddingCacheConfig;
  batch: BatchConfig;
  openAi?: OpenAiEmbeddingClient;
  gemini?: GeminiEmbeddingClient;
  agentId: string;
  cacheTable: string;
  log: {
    warn: (message: string) => void;
    debug: (message: string, data?: Record<string, unknown>) => void;
  };
};

/**
 * Estimate token count for embedding request.
 */
export function estimateEmbeddingTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / EMBEDDING_APPROX_CHARS_PER_TOKEN);
}

/**
 * Build batches of chunks for embedding requests.
 */
export function buildEmbeddingBatches(chunks: MemoryChunk[]): MemoryChunk[][] {
  const batches: MemoryChunk[][] = [];
  let current: MemoryChunk[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    const estimate = estimateEmbeddingTokens(chunk.text);
    const wouldExceed = current.length > 0 && currentTokens + estimate > EMBEDDING_BATCH_MAX_TOKENS;
    if (wouldExceed) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }
    if (current.length === 0 && estimate > EMBEDDING_BATCH_MAX_TOKENS) {
      batches.push([chunk]);
      continue;
    }
    current.push(chunk);
    currentTokens += estimate;
  }

  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

/**
 * Load embeddings from cache.
 */
export function loadEmbeddingCache(ctx: EmbeddingContext, hashes: string[]): Map<string, number[]> {
  if (!ctx.cache.enabled) return new Map();
  if (hashes.length === 0) return new Map();
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const hash of hashes) {
    if (!hash) continue;
    if (seen.has(hash)) continue;
    seen.add(hash);
    unique.push(hash);
  }
  if (unique.length === 0) return new Map();

  const out = new Map<string, number[]>();
  const baseParams = [ctx.provider.id, ctx.provider.model, ctx.providerKey];
  const batchSize = 400;
  for (let start = 0; start < unique.length; start += batchSize) {
    const batch = unique.slice(start, start + batchSize);
    const placeholders = batch.map(() => "?").join(", ");
    const rows = ctx.db
      .prepare(
        `SELECT hash, embedding FROM ${ctx.cacheTable}\n` +
          ` WHERE provider = ? AND model = ? AND provider_key = ? AND hash IN (${placeholders})`,
      )
      .all(...baseParams, ...batch) as Array<{ hash: string; embedding: string }>;
    for (const row of rows) {
      out.set(row.hash, parseEmbedding(row.embedding));
    }
  }
  return out;
}

/**
 * Upsert embeddings into cache.
 */
export function upsertEmbeddingCache(
  ctx: EmbeddingContext,
  entries: Array<{ hash: string; embedding: number[] }>,
): void {
  if (!ctx.cache.enabled) return;
  if (entries.length === 0) return;
  const now = Date.now();
  const stmt = ctx.db.prepare(
    `INSERT INTO ${ctx.cacheTable} (provider, model, provider_key, hash, embedding, dims, updated_at)\n` +
      ` VALUES (?, ?, ?, ?, ?, ?, ?)\n` +
      ` ON CONFLICT(provider, model, provider_key, hash) DO UPDATE SET\n` +
      `   embedding=excluded.embedding,\n` +
      `   dims=excluded.dims,\n` +
      `   updated_at=excluded.updated_at`,
  );
  for (const entry of entries) {
    const embedding = entry.embedding ?? [];
    stmt.run(
      ctx.provider.id,
      ctx.provider.model,
      ctx.providerKey,
      entry.hash,
      JSON.stringify(embedding),
      embedding.length,
      now,
    );
  }
}

/**
 * Prune embedding cache if it exceeds max entries.
 */
export function pruneEmbeddingCacheIfNeeded(ctx: EmbeddingContext): void {
  if (!ctx.cache.enabled) return;
  const max = ctx.cache.maxEntries;
  if (!max || max <= 0) return;
  const row = ctx.db.prepare(`SELECT COUNT(*) as c FROM ${ctx.cacheTable}`).get() as
    | { c: number }
    | undefined;
  const count = row?.c ?? 0;
  if (count <= max) return;
  const excess = count - max;
  ctx.db
    .prepare(
      `DELETE FROM ${ctx.cacheTable}\n` +
        ` WHERE rowid IN (\n` +
        `   SELECT rowid FROM ${ctx.cacheTable}\n` +
        `   ORDER BY updated_at ASC\n` +
        `   LIMIT ?\n` +
        ` )`,
    )
    .run(excess);
}

/**
 * Check if an error is retryable.
 */
export function isRetryableEmbeddingError(message: string): boolean {
  return /(rate[_ ]limit|too many requests|429|resource has been exhausted|5\d\d|cloudflare)/i.test(
    message,
  );
}

/**
 * Embed a batch of texts with retry logic.
 */
export async function embedBatchWithRetry(
  ctx: EmbeddingContext,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];
  let attempt = 0;
  let delayMs = EMBEDDING_RETRY_BASE_DELAY_MS;
  while (true) {
    try {
      return await ctx.provider.embedBatch(texts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isRetryableEmbeddingError(message) || attempt >= EMBEDDING_RETRY_MAX_ATTEMPTS) {
        throw err;
      }
      const waitMs = Math.min(
        EMBEDDING_RETRY_MAX_DELAY_MS,
        Math.round(delayMs * (1 + Math.random() * 0.2)),
      );
      ctx.log.warn(`memory embeddings rate limited; retrying in ${waitMs}ms`);
      await Bun.sleep(waitMs);
      delayMs *= 2;
      attempt += 1;
    }
  }
}

/**
 * Embed chunks using standard batching (non-API batch).
 */
export async function embedChunksInBatches(
  ctx: EmbeddingContext,
  chunks: MemoryChunk[],
): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const cached = loadEmbeddingCache(
    ctx,
    chunks.map((chunk) => chunk.hash),
  );
  const embeddings: number[][] = Array.from({ length: chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const hit = chunk?.hash ? cached.get(chunk.hash) : undefined;
    if (hit && hit.length > 0) {
      embeddings[i] = hit;
    } else if (chunk) {
      missing.push({ index: i, chunk });
    }
  }

  if (missing.length === 0) return embeddings;

  const missingChunks = missing.map((m) => m.chunk);
  const batches = buildEmbeddingBatches(missingChunks);
  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  let cursor = 0;
  for (const batch of batches) {
    const batchEmbeddings = await embedBatchWithRetry(
      ctx,
      batch.map((chunk) => chunk.text),
    );
    for (let i = 0; i < batch.length; i += 1) {
      const item = missing[cursor + i];
      const embedding = batchEmbeddings[i] ?? [];
      if (item) {
        embeddings[item.index] = embedding;
        toCache.push({ hash: item.chunk.hash, embedding });
      }
    }
    cursor += batch.length;
  }
  upsertEmbeddingCache(ctx, toCache);
  return embeddings;
}

/**
 * Embed chunks using OpenAI batch API.
 */
export async function embedChunksWithOpenAiBatch(
  ctx: EmbeddingContext,
  chunks: MemoryChunk[],
  entry: MemoryFileEntry | SessionFileEntry,
  source: MemorySource,
): Promise<number[][]> {
  if (!ctx.openAi) {
    return embedChunksInBatches(ctx, chunks);
  }
  if (chunks.length === 0) return [];
  const cached = loadEmbeddingCache(
    ctx,
    chunks.map((chunk) => chunk.hash),
  );
  const embeddings: number[][] = Array.from({ length: chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const hit = chunk?.hash ? cached.get(chunk.hash) : undefined;
    if (hit && hit.length > 0) {
      embeddings[i] = hit;
    } else if (chunk) {
      missing.push({ index: i, chunk });
    }
  }

  if (missing.length === 0) return embeddings;

  const requests: OpenAiBatchRequest[] = [];
  const mapping = new Map<string, { index: number; hash: string }>();
  for (const item of missing) {
    const chunk = item.chunk;
    const customId = hashText(
      `${source}:${entry.path}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: chunk.hash });
    requests.push({
      custom_id: customId,
      method: "POST",
      url: OPENAI_BATCH_ENDPOINT,
      body: {
        model: ctx.openAi?.model ?? ctx.provider.model,
        input: chunk.text,
      },
    });
  }
  const byCustomId = await runOpenAiEmbeddingBatches({
    openAi: ctx.openAi,
    agentId: ctx.agentId,
    requests,
    wait: ctx.batch.wait,
    concurrency: ctx.batch.concurrency,
    pollIntervalMs: ctx.batch.pollIntervalMs,
    timeoutMs: ctx.batch.timeoutMs,
    debug: (message, data) => ctx.log.debug(message, { ...data, source, chunks: chunks.length }),
  });

  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  for (const [customId, embedding] of byCustomId.entries()) {
    const mapped = mapping.get(customId);
    if (!mapped) continue;
    embeddings[mapped.index] = embedding;
    toCache.push({ hash: mapped.hash, embedding });
  }
  upsertEmbeddingCache(ctx, toCache);
  return embeddings;
}

/**
 * Embed chunks using Gemini batch API.
 */
export async function embedChunksWithGeminiBatch(
  ctx: EmbeddingContext,
  chunks: MemoryChunk[],
  entry: MemoryFileEntry | SessionFileEntry,
  source: MemorySource,
): Promise<number[][]> {
  if (!ctx.gemini) {
    return embedChunksInBatches(ctx, chunks);
  }
  if (chunks.length === 0) return [];
  const cached = loadEmbeddingCache(
    ctx,
    chunks.map((chunk) => chunk.hash),
  );
  const embeddings: number[][] = Array.from({ length: chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const hit = chunk?.hash ? cached.get(chunk.hash) : undefined;
    if (hit && hit.length > 0) {
      embeddings[i] = hit;
    } else if (chunk) {
      missing.push({ index: i, chunk });
    }
  }

  if (missing.length === 0) return embeddings;

  const requests: GeminiBatchRequest[] = [];
  const mapping = new Map<string, { index: number; hash: string }>();
  for (const item of missing) {
    const chunk = item.chunk;
    const customId = hashText(
      `${source}:${entry.path}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: chunk.hash });
    requests.push({
      custom_id: customId,
      content: { parts: [{ text: chunk.text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    });
  }

  const byCustomId = await runGeminiEmbeddingBatches({
    gemini: ctx.gemini,
    agentId: ctx.agentId,
    requests,
    wait: ctx.batch.wait,
    concurrency: ctx.batch.concurrency,
    pollIntervalMs: ctx.batch.pollIntervalMs,
    timeoutMs: ctx.batch.timeoutMs,
    debug: (message, data) => ctx.log.debug(message, { ...data, source, chunks: chunks.length }),
  });

  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  for (const [customId, embedding] of byCustomId.entries()) {
    const mapped = mapping.get(customId);
    if (!mapped) continue;
    embeddings[mapped.index] = embedding;
    toCache.push({ hash: mapped.hash, embedding });
  }
  upsertEmbeddingCache(ctx, toCache);
  return embeddings;
}

/**
 * Embed chunks using the appropriate batch method.
 */
export async function embedChunksWithBatch(
  ctx: EmbeddingContext,
  chunks: MemoryChunk[],
  entry: MemoryFileEntry | SessionFileEntry,
  source: MemorySource,
): Promise<number[][]> {
  if (ctx.provider.id === "openai" && ctx.openAi) {
    return embedChunksWithOpenAiBatch(ctx, chunks, entry, source);
  }
  if (ctx.provider.id === "gemini" && ctx.gemini) {
    return embedChunksWithGeminiBatch(ctx, chunks, entry, source);
  }
  return embedChunksInBatches(ctx, chunks);
}
