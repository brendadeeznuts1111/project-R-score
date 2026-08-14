// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import {
  listProtonProjects,
  PROTON_INJECT_PROJECTS,
  resolveProtonProject,
} from '../lib/security/proton-projects.ts';

const ROOT = joinPath(import.meta.dir, '..');

describe('proton-projects map', () => {
  test('lists primary projects without kalshi alias', () => {
    const list = listProtonProjects();
    expect(list).toContain('factorywager');
    expect(list).toContain('bet-ticker');
    expect(list).not.toContain('kalshi');
  });

  test('resolveProtonProject joins paths under repo root', () => {
    const r = resolveProtonProject('factorywager', ROOT);
    expect(r.template.endsWith('env.template')).toBe(true);
    expect(r.out.endsWith('.env')).toBe(true);
    expect(r.agent).toBe('factorywager');
    expect(r.reasonix).toBe(true);
    expect(r.agentCfg.patEnv).toBe('PROTON_PASS_FACTORYWAGER_TOKEN');
  });

  test('kalshi alias maps to kalshi-bot agent', () => {
    const r = resolveProtonProject('kalshi', ROOT);
    expect(r.agent).toBe('kalshi-bot');
    expect(r.template).toContain('Kalshi-bot');
  });

  test('unknown project throws', () => {
    expect(() => resolveProtonProject('nope', ROOT)).toThrow(/Unknown project/);
  });

  test('every listed project has templateRel + agent', () => {
    for (const name of listProtonProjects()) {
      const s = PROTON_INJECT_PROJECTS[name]!;
      expect(s.templateRel.length).toBeGreaterThan(0);
      expect(s.outRel.length).toBeGreaterThan(0);
      expect(s.agent.length).toBeGreaterThan(0);
    }
  });
});
