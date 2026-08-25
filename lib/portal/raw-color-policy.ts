// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Raw-color policy for portal consumers.
 *
 * `theme.jsonc` is the only palette source. Generated token CSS is its output.
 * Reusable components and the Bun 1.4 board must consume named tokens instead
 * of reintroducing hex, rgb(), hsl(), or rgba() values.
 *
 * `public/portal/style.css` and `venues.css` are subject to the same
 * zero-literal policy as reusable components and the Bun 1.4 board.
 */
import { joinPath, resolvePath } from '../path-bun.ts';

export const RAW_COLOR_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/g;

/** Shared stylesheet consumers are fully tokenized. */
export const PORTAL_STYLE_RAW_COLOR_MAX = 0;

const ROOT = resolvePath(import.meta.dir, '..', '..');

export type RawColorViolation = {
  file: string;
  line: number;
  literal: string;
};

export async function findPortalConsumerRawColors(): Promise<RawColorViolation[]> {
  const scopes = [
    { directory: 'public/portal/components', pattern: '*.js' },
    { directory: 'public/portal/bun-1.4', pattern: '*.{css,js}' },
    { directory: 'public/portal', pattern: 'venues.css' },
  ] as const;
  const violations: RawColorViolation[] = [];

  for (const scope of scopes) {
    const cwd = joinPath(ROOT, scope.directory);
    for await (const name of new Bun.Glob(scope.pattern).scan({ cwd })) {
      const relativeFile = `${scope.directory}/${name}`;
      const text = await Bun.file(joinPath(cwd, name)).text();
      for (const match of text.matchAll(RAW_COLOR_LITERAL_RE)) {
        const offset = match.index ?? 0;
        violations.push({
          file: relativeFile,
          line: text.slice(0, offset).split('\n').length,
          literal: match[0],
        });
      }
    }
  }

  return violations;
}

export async function countPortalStyleRawColors(): Promise<number> {
  const stylesheet = await Bun.file(joinPath(ROOT, 'public/portal/style.css')).text();
  return [...stylesheet.matchAll(RAW_COLOR_LITERAL_RE)].length;
}
