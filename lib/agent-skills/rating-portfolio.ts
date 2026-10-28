import {
  AGENT_SKILLS_PATHS,
  resolveAgentSkillsPath,
  resolveAgentSkillsRoot,
} from '../agent-skills-paths.ts';
import { basenamePath, resolvePath } from '../path-bun.ts';
import { applyDynamicEvidence, collectDynamicEvidence, sha256 } from './rating-evidence.ts';
import { parseDynamicEvidenceModel } from './rating-model.ts';
import { rateSkillContent } from './rating-static.ts';
import type { SkillRating, SkillsRatingResult } from './rating-types.ts';

const TEXT_EXTENSIONS = new Set([
  '.bash',
  '.js',
  '.json',
  '.jsonc',
  '.jsx',
  '.md',
  '.mjs',
  '.sh',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

async function skillPackageText(
  skillRoot: string
): Promise<{ content: string; files: number; skillLines: number; hasMetadata: boolean }> {
  const chunks: string[] = [];
  let files = 0;
  let skillLines = 0;
  let hasMetadata = false;
  for await (const relativeFile of new Bun.Glob('**/*').scan({
    cwd: skillRoot,
    dot: true,
    onlyFiles: true,
  })) {
    const extension = relativeFile.includes('.')
      ? `.${relativeFile.split('.').pop()!.toLowerCase()}`
      : '';
    if (!TEXT_EXTENSIONS.has(extension) && basenamePath(relativeFile) !== 'SKILL.md') continue;
    const file = Bun.file(resolvePath(skillRoot, relativeFile));
    if (file.size > 512 * 1024) continue;
    const text = await file.text();
    if (relativeFile === AGENT_SKILLS_PATHS.skillFile) skillLines = text.split(/\r?\n/).length;
    if (relativeFile === AGENT_SKILLS_PATHS.metadataFile) hasMetadata = true;
    chunks.push(`\n/* ${relativeFile} */\n${text}`);
    files++;
  }
  return { content: chunks.join('\n'), files, skillLines, hasMetadata };
}

export async function rateAgentSkills(
  repoRoot: string,
  options: { dynamic?: boolean } = {}
): Promise<SkillsRatingResult> {
  const governance = await Bun.file(
    resolveAgentSkillsPath(repoRoot, AGENT_SKILLS_PATHS.governanceManifest)
  ).json();
  const activeNames = Object.entries(governance.packages as Record<string, { lifecycle: string }>)
    .filter(([, entry]) => entry.lifecycle === 'active')
    .map(([name]) => name)
    .sort();
  const ratings: SkillRating[] = [];
  const skillsRoot = resolveAgentSkillsRoot(repoRoot);
  for (const name of activeNames) {
    const packageText = await skillPackageText(resolvePath(skillsRoot, name));
    ratings.push(
      rateSkillContent(name, packageText.content, packageText.files, {
        skillLines: packageText.skillLines,
        hasMetadata: packageText.hasMetadata,
      })
    );
  }
  ratings.sort(
    (left, right) =>
      right.complianceScore - left.complianceScore || left.name.localeCompare(right.name)
  );
  const modelFile = Bun.file(resolvePath(repoRoot, 'config/skill-rating-evidence.json'));
  const modelText = options.dynamic ? await modelFile.text() : null;
  const model = modelText ? parseDynamicEvidenceModel(JSON.parse(modelText), activeNames) : null;
  const checks = model ? await collectDynamicEvidence(model, repoRoot) : null;
  const dynamicRatings = checks && model ? applyDynamicEvidence(ratings, checks, model) : null;
  return {
    ok:
      ratings.every(rating => rating.complianceScore >= 70) &&
      (dynamicRatings === null ||
        (checks!.every(check => check.ok) &&
          dynamicRatings
            .filter(rating => rating.overallScore !== null)
            .every(rating => rating.overallScore! >= model!.minimumOverallScore))),
    runtime: { version: Bun.version, revision: Bun.revision },
    ratings,
    dynamic:
      checks === null || dynamicRatings === null
        ? null
        : {
            model: 'finite-evidence-v2',
            complete: dynamicRatings.every(rating => rating.status === 'proven'),
            generatedAt: new Date().toISOString(),
            configSha256: sha256(modelText!),
            ratings: dynamicRatings,
            checks,
          },
  };
}
