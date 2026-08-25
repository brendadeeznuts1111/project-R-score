#!/usr/bin/env bun
/** Root operator entry for the Bun release example knowledge artifact. */
import { runKnowledgeCli } from '../packages/bun-release-contracts/src/knowledge-cli.ts';
import { BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG } from '../lib/docs/flags/release.ts';

export { BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG, runKnowledgeCli };

if (import.meta.main) {
  try {
    await runKnowledgeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
