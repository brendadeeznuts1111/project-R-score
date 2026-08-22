#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/fetch — fetch
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Toggle `include*` here. All flags default true except enableAI (use --ai).
 *
 * bun tools/harvest.ts --ai https://example.com/blog ./report 0
 * bun tools/harvest.ts https://example.com/blog ./report 0
 */
import type { HarvestMapConfig } from '../lib/docs/blog-codeblocks.ts';

export const CONFIG: HarvestMapConfig = {
  includeToc: true,
  includeStats: true,
  includeImages: true,
  includeLinks: true,
  includeInlineCode: true,
  includeCodeBlocks: true,
  includeTables: true,
  includeFootnotes: true,
  includeRawJson: true,

  enableAI: false,
  aiProvider: 'ollama',
  aiEndpoint: 'http://localhost:11434/api/generate',
  aiModel: 'llama2',
  aiApiKey: '',
  aiPrompt:
    'Summarize the following text in one concise sentence (max 20 words) and extract 2-3 topic keywords. Format: SUMMARY: <your summary> | TOPICS: <comma-separated keywords>\n\nTEXT: {TEXT}',
  aiTemperature: 0.3,
  aiMaxTokens: 100,
  aiHeaders: {},
  aiRequestTemplate: {
    model: '{model}',
    prompt: '{PROMPT}',
    stream: false,
    temperature: '{temperature}',
    max_tokens: '{max_tokens}',
  },
  aiResponsePath: 'response',
  aiExtraBody: {},
};

if (import.meta.main) {
  const { runHarvestUniversal } = await import('../lib/docs/harvest-universal.ts');
  process.exitCode = await runHarvestUniversal(Bun.argv.slice(2), CONFIG);
}
