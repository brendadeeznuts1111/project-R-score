#!/usr/bin/env bun
/** Rate active repository skills for Bun-first portability and finite live evidence. */

import { resolvePath } from '../lib/path-bun.ts';
import { rateAgentSkills as ratePortfolio } from '../lib/agent-skills/rating-portfolio.ts';

export * from '../lib/agent-skills/rating-types.ts';
export { rateSkillContent } from '../lib/agent-skills/rating-static.ts';
export { parseDynamicEvidenceModel } from '../lib/agent-skills/rating-model.ts';
export {
  applyDynamicEvidence,
  collectDynamicEvidence,
} from '../lib/agent-skills/rating-evidence.ts';

const DEFAULT_ROOT = resolvePath(import.meta.dir, '..');

export function rateAgentSkills(repoRoot = DEFAULT_ROOT, options: { dynamic?: boolean } = {}) {
  return ratePortfolio(repoRoot, options);
}

if (import.meta.main) {
  const dynamic = Bun.argv.includes('--dynamic');
  const result = await rateAgentSkills(DEFAULT_ROOT, { dynamic });
  if (Bun.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `Static Bun compliance (not a quality score) · ${result.runtime.version} · ${result.ratings.length} active skills`
    );
    for (const rating of result.ratings) {
      console.log(
        `  ${rating.name.padEnd(32)} compliance ${String(rating.complianceScore).padStart(3)} ${rating.complianceGrade}`
      );
      for (const finding of rating.findings) {
        console.log(
          `    ${finding.delta >= 0 ? '+' : ''}${finding.delta} ${finding.rule}: ${finding.message}`
        );
      }
    }
    if (result.dynamic) {
      console.log('\nDynamic finite-evidence rating (explicit skill attribution)');
      for (const [index, rating] of result.dynamic.ratings.entries()) {
        console.log(
          rating.status === 'proven'
            ? `${String(index + 1).padStart(2)}. ${rating.name.padEnd(32)} overall ${String(rating.overallScore).padStart(3)} · evidence ${String(rating.evidenceScore).padStart(3)} · confidence ${String(rating.confidence).padStart(3)}% · ${rating.checksPassed}/${rating.checksTotal} owned checks`
            : `${String(index + 1).padStart(2)}. ${rating.name.padEnd(32)} unproven · compliance ${rating.complianceScore} · no owned runtime/contract evidence`
        );
      }
      if (!result.dynamic.complete) console.log('Portfolio evidence is incomplete.');
    } else {
      console.log('\nNo live evidence collected. Run `bun run skills:rate -- --dynamic`.');
    }
  }
  process.exitCode = result.ok ? 0 : 1;
}
