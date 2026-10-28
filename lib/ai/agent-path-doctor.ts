import { resolvePath } from '../path-bun.ts';
import { discoverAgentPath } from './agent-discovery.ts';
import { readFrictionRegistry } from './agent-path-contract.ts';

export async function doctorAgentPath(repoRoot: string): Promise<{
  schemaVersion: 1;
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
}> {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  for (const path of [
    'AGENTS.md',
    'docs/AGENTS.md',
    'package.json',
    '.agents/skills/references/skill-governance.json',
    'config/ai-friction.json',
    'config/schemas/ai-friction.schema.json',
  ]) {
    const ok = await Bun.file(resolvePath(repoRoot, path)).exists();
    checks.push({ id: `source:${path}`, ok, detail: ok ? 'present' : 'missing' });
  }
  try {
    const probe = await discoverAgentPath(repoRoot, {
      query: 'markdown links',
      paths: ['docs/AGENTS.md'],
      limit: 8,
    });
    const ok = probe.hits.some(hit => hit.kind === 'command' && hit.id === 'docs:links:check');
    checks.push({
      id: 'probe:markdown-links',
      ok,
      detail: ok ? 'docs:links:check discovered' : 'expected command not ranked',
    });
  } catch (error) {
    checks.push({
      id: 'probe:markdown-links',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    const registry = await readFrictionRegistry(repoRoot);
    checks.push({
      id: 'contract:friction-registry',
      ok: true,
      detail: `${registry.issues.length} known issues · promote at ${registry.promotionThreshold} · window ${registry.observationWindowDays}d · retain ${registry.retentionDays}d`,
    });
  } catch (error) {
    checks.push({
      id: 'contract:friction-registry',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return { schemaVersion: 1, ok: checks.every(check => check.ok), checks };
}
