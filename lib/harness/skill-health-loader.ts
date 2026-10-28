import { parseSkillHealthManifest, type SkillHealthManifest } from './skill-health-manifest.ts';

export async function loadSkillHealthManifest(
  file: string,
  root: string
): Promise<SkillHealthManifest> {
  return parseSkillHealthManifest(await Bun.file(file).json(), root);
}
