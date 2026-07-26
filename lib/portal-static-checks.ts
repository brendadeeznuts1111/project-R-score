// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Shared portal static anti-patterns — SSOT for verify-portal and public-discovery.
 *
 * @see docs/portal-foundation.md
 * @see tools/verify-portal.ts
 * @see lib/public-discovery.ts
 */
import { joinPath, resolvePath } from './path-bun.ts';

const REPO = resolvePath(import.meta.dir, '..');

export const PORTAL_ROOT_REL = 'public/portal';

/** Pages allowed to fetch /api/health directly (diagnostic SSOT). */
export const INLINE_HEALTH_ALLOW = new Set([
  `${PORTAL_ROOT_REL}/data.js`,
  `${PORTAL_ROOT_REL}/health/index.html`,
  `${PORTAL_ROOT_REL}/health-page.js`,
]);

/** HTML shells excluded from script-include checks. */
export const PORTAL_HTML_SKIP = new Set([`${PORTAL_ROOT_REL}/_page-template.html`]);

/** Browser `.js` must not contain TS type annotations (Pages serves raw modules). */
const TS_LEAK_RE = /:\s*(?:Array<|[A-Z][A-Za-z0-9_<>,\s|&]*\s*(?:=>|\)))/;

export type PortalStaticRule =
  | 'inline-health'
  | 'process-env'
  | 'chrome-missing'
  | 'typescript-leak';

export type PortalStaticViolation = {
  rule: PortalStaticRule;
  file: string;
  line?: number;
  excerpt?: string;
  message: string;
};

function lineNumber(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

export async function walkPublicPortalFiles(): Promise<string[]> {
  const out: string[] = [];
  const glob = new Bun.Glob('**/*.{html,js}');
  for await (const rel of glob.scan({
    cwd: joinPath(REPO, PORTAL_ROOT_REL),
    onlyFiles: true,
  })) {
    out.push(`${PORTAL_ROOT_REL}/${rel}`);
  }
  return out.sort();
}

export async function collectPortalStaticViolations(): Promise<PortalStaticViolation[]> {
  const violations: PortalStaticViolation[] = [];
  const files = await walkPublicPortalFiles();

  for (const rel of files) {
    const text = await Bun.file(joinPath(REPO, rel)).text();

    if ((rel.endsWith('.html') || rel.endsWith('.js')) && !INLINE_HEALTH_ALLOW.has(rel)) {
      if (/fetch\s*\(\s*['"`]\/api\/health/.test(text)) {
        violations.push({
          rule: 'inline-health',
          file: rel,
          message: 'Forbidden inline fetch(/api/health) — use data.js / portal:data',
        });
      }
    }

    if (rel.endsWith('.js') && /\bprocess\.env\b/.test(text)) {
      violations.push({
        rule: 'process-env',
        file: rel,
        message: 'process.env in portal client — use GET /api/env',
      });
    }

    if (rel.endsWith('.html') && !PORTAL_HTML_SKIP.has(rel)) {
      const missing: string[] = [];
      if (!text.includes('src="/portal/data.js"')) missing.push('data.js');
      if (!text.includes('src="/portal/topbar.js"')) missing.push('topbar.js');
      if (missing.length > 0) {
        violations.push({
          rule: 'chrome-missing',
          file: rel,
          excerpt: missing.join(' · '),
          message: `Portal shell missing shared chrome: ${missing.join(', ')}`,
        });
      }
    }

    if (rel.endsWith('.js')) {
      const m = TS_LEAK_RE.exec(text);
      if (m) {
        violations.push({
          rule: 'typescript-leak',
          file: rel,
          line: lineNumber(text, m.index!),
          excerpt: m[0].slice(0, 60),
          message: 'TypeScript annotation in browser-served .js module',
        });
      }
    }
  }

  return violations;
}

export function assertPortalStaticClean(violations: PortalStaticViolation[]): void {
  if (violations.length === 0) return;
  const first = violations[0]!;
  throw new Error(`${first.file}: ${first.message}`);
}
