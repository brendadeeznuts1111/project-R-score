/**
 * Transpiler scan worker — one file per job (Layer 4.5 parallel pool).
 */

import { analyzeFile } from "../scan/transpiler/analyzer.ts";
import type { IntegrityManifest } from "../scan/transpiler/integrity.ts";
import type { ScanProfile } from "../scan/transpiler/types.ts";
import type { RuleSet } from "../scan/transpiler/types.ts";

export type TranspilerFileJob = {
  fullPath: string;
  repo: string;
  profile: ScanProfile;
  rules: RuleSet;
  manifest: IntegrityManifest | null;
};

declare const self: Worker;

self.onmessage = async (event: MessageEvent<TranspilerFileJob>) => {
  const { fullPath, repo, profile, rules, manifest } = event.data;
  try {
    const result = await analyzeFile({ fullPath, repo, rules, profile, manifest });
    self.postMessage(result);
  } catch (e) {
    self.postMessage({
      file: fullPath,
      skipped: true,
      skip_reason: String(e),
      findings: [],
    });
  }
};