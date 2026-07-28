// @see https://bun.com/docs/runtime/index#general-execution-options — curated runtime flags SSOT
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file catalog load
/**
 * portal-cli doctor — Catalog SSOT checks (runtime-flags.json).
 *
 * Granular checks (group: catalog):
 *   catalog-json-schema       fatal — file loads + required fields
 *   catalog-shortcode-conflict fatal — duplicate shortcodes / token collisions
 *   catalog-help-coverage     warn  — curated flags appear in generated BUN_FLAGS_HELP
 *   catalog-deprecated-flags  info  — deprecated rows present (dev awareness)
 *
 * Fix commands are real monorepo paths/scripts only (no invented portal:gen:*).
 */

import {
  RUNTIME_FLAGS_CATALOG_PATH,
  assessRuntimeFlagsCatalog,
  tryLoadRuntimeFlagsCatalog,
  type RuntimeFlagsCatalogHealth,
} from './portal-cli-bun-flags.ts';
import type { PortalDoctorCheck } from './portal-cli-doctor.ts';

const RUNTIME_DOCS = 'https://bun.com/docs/runtime/index#general-execution-options';

function withMeta(
  base: PortalDoctorCheck,
  meta: Partial<Omit<PortalDoctorCheck, 'id' | 'level' | 'ok' | 'message' | 'group'>>
): PortalDoctorCheck {
  return { ...base, ...meta };
}

export type CatalogChecksResult = {
  checks: PortalDoctorCheck[];
  health: RuntimeFlagsCatalogHealth;
  loadOk: boolean;
  loadError?: string;
};

/**
 * Run pure catalog SSOT checks against config/runtime-flags.json.
 */
export async function runCatalogChecks(cwd?: string): Promise<CatalogChecksResult> {
  const loaded = await tryLoadRuntimeFlagsCatalog(cwd);
  const health = assessRuntimeFlagsCatalog(loaded.catalog);
  const checks: PortalDoctorCheck[] = [];

  // 1) Schema / load
  const schemaOk = loaded.ok && health.schemaIssues.length === 0 && health.total > 0;
  const schemaParts: string[] = [];
  if (!loaded.ok) schemaParts.push(loaded.error);
  if (health.schemaIssues.length) {
    schemaParts.push(...health.schemaIssues.slice(0, 4));
  }
  checks.push(
    withMeta(
      {
        id: 'catalog-json-schema',
        level: 'fatal',
        group: 'catalog',
        ok: schemaOk,
        message: schemaOk
          ? `${RUNTIME_FLAGS_CATALOG_PATH} valid · ${health.total} flags · required fields present`
          : schemaParts.join('; ') || 'catalog schema invalid',
        source: RUNTIME_DOCS,
      },
      {
        fixCommand: schemaOk
          ? undefined
          : `Edit ${RUNTIME_FLAGS_CATALOG_PATH} (flag, category, description, url) · bun test tests/portal-cli-bun-flags.test.ts`,
        impact: 'Blocks flag harvest sets, portal-cli flags, and generated --help runtime section',
        autoFixable: false,
        timeToFix: schemaOk ? undefined : '5–15 min',
        envScope: 'all',
      }
    )
  );

  // 2) Shortcode / token collisions
  const shortOk = health.shortcodeConflicts.length === 0;
  checks.push(
    withMeta(
      {
        id: 'catalog-shortcode-conflict',
        level: 'fatal',
        group: 'catalog',
        ok: shortOk,
        message: shortOk
          ? `${health.withShortcode} shortcodes unique (no token collisions)`
          : health.shortcodeConflicts.slice(0, 3).join('; '),
        source: RUNTIME_DOCS,
      },
      {
        fixCommand: shortOk
          ? undefined
          : `Edit ${RUNTIME_FLAGS_CATALOG_PATH} — resolve duplicate shortcodes · bun run portal:flags --all`,
        impact: 'CLI parsing ambiguity when harvesting Bun runtime flags for child spawns',
        autoFixable: false,
        timeToFix: shortOk ? undefined : '2–10 min',
        envScope: 'all',
      }
    )
  );

  // 3) Help coverage (curated → generated BUN_FLAGS_HELP)
  const helpOk = health.helpCoverageMisses.length === 0 && health.curated > 0;
  checks.push(
    withMeta(
      {
        id: 'catalog-help-coverage',
        level: 'warn',
        group: 'catalog',
        ok: helpOk,
        message: helpOk
          ? `${health.curated} curated flags present in generated BUN_FLAGS_HELP`
          : health.curated === 0
            ? 'no curated flags in catalog'
            : `help missing: ${health.helpCoverageMisses.join(', ')}`,
        source: RUNTIME_DOCS,
      },
      {
        // Help is generated from catalog — coverage miss is a generator/catalog bug; re-run tests.
        fixCommand: helpOk
          ? undefined
          : `Ensure curated rows have flag+description · bun test tests/portal-cli-bun-flags.test.ts · bun run portal:flags`,
        impact: 'portal-cli --help runtime section drifts from catalog SSOT',
        autoFixable: true,
        timeToFix: helpOk ? undefined : '1–5 min',
        envScope: 'all',
      }
    )
  );

  // 4) Deprecated awareness (info · dev)
  const depFlags = health.deprecatedFlags;
  checks.push(
    withMeta(
      {
        id: 'catalog-deprecated-flags',
        level: 'info',
        group: 'catalog',
        ok: true, // advisory — never fails the gate
        message:
          depFlags.length === 0
            ? 'no deprecated flags in catalog'
            : `${depFlags.length} deprecated: ${depFlags.slice(0, 6).join(', ')}${depFlags.length > 6 ? '…' : ''}`,
        source: RUNTIME_DOCS,
      },
      {
        fixCommand:
          depFlags.length === 0
            ? undefined
            : `Review ${RUNTIME_FLAGS_CATALOG_PATH} deprecated rows · bun run portal:flags --all --verbose`,
        impact: 'Planned removal awareness for harvest set and portal operators',
        autoFixable: false,
        timeToFix: depFlags.length === 0 ? undefined : '5–30 min',
        envScope: 'dev',
      }
    )
  );

  return {
    checks,
    health,
    loadOk: loaded.ok,
    loadError: loaded.ok ? undefined : loaded.error,
  };
}
