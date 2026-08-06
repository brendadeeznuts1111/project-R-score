// @see https://bun.com/docs/runtime/index#general-execution-options — curated runtime flags SSOT
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file catalog load
// @see https://bun.com/docs/runtime/auto-install — runtime -i ≡ --install=fallback
// @see https://bun.com/docs/pm/cli/update — update -i = --interactive (out of this catalog)
/**
 * portal-cli doctor — Catalog SSOT checks (runtime-flags.json).
 *
 * Granular checks (group: catalog):
 *   catalog-json-schema         fatal — file loads + required fields
 *   catalog-shortcode-conflict  fatal — duplicate shortcodes / token collisions (per context)
 *   catalog-bun-help-parity     fatal — runtime tokens appear in live `bun run --help`
 *   catalog-help-coverage       warn  — curated flags appear in generated BUN_FLAGS_HELP
 *   catalog-deprecated-flags    info  — deprecated rows present (dev awareness)
 *
 * Fix commands are real monorepo paths/scripts only.
 */

import {
  RUNTIME_FLAGS_CATALOG_PATH,
  assessRuntimeFlagsCatalog,
  fetchBunRuntimeHelpText,
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

export type RunCatalogChecksOpts = {
  cwd?: string;
  /** Inject `bun run --help` text (tests). When omitted, spawns `bun run --help`. */
  bunHelpText?: string;
  /** Skip live bun run --help spawn (offline pure tests). */
  skipBunHelpParity?: boolean;
};

/**
 * Run catalog SSOT checks against config/runtime-flags.json.
 */
export async function runCatalogChecks(
  cwdOrOpts?: string | RunCatalogChecksOpts
): Promise<CatalogChecksResult> {
  const opts: RunCatalogChecksOpts =
    typeof cwdOrOpts === 'string' || cwdOrOpts === undefined ? { cwd: cwdOrOpts } : cwdOrOpts;
  const cwd = opts.cwd;

  const loaded = await tryLoadRuntimeFlagsCatalog(cwd);
  let bunHelpText = opts.bunHelpText;
  if (!opts.skipBunHelpParity && bunHelpText == null) {
    try {
      bunHelpText = await fetchBunRuntimeHelpText();
    } catch {
      bunHelpText = undefined;
    }
  }

  const health = assessRuntimeFlagsCatalog(loaded.catalog, {
    bunHelpText: opts.skipBunHelpParity ? undefined : bunHelpText,
  });
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
          : `bun run portal:flags:check  # then edit ${RUNTIME_FLAGS_CATALOG_PATH} (flag, category, description, url)`,
        impact: 'Blocks flag harvest sets, portal-cli flags, and generated --help runtime section',
        autoFixable: false,
        timeToFix: schemaOk ? undefined : '5–15 min',
        envScope: 'all',
      }
    )
  );

  // 2) Shortcode / token collisions (per context)
  const shortOk = health.shortcodeConflicts.length === 0;
  checks.push(
    withMeta(
      {
        id: 'catalog-shortcode-conflict',
        level: 'fatal',
        group: 'catalog',
        ok: shortOk,
        message: shortOk
          ? `${health.withShortcode} shortcodes unique per context (no token collisions)`
          : health.shortcodeConflicts.slice(0, 3).join('; '),
        source: RUNTIME_DOCS,
      },
      {
        fixCommand: shortOk
          ? undefined
          : `bun run portal:flags:check  # then dedupe shortcodes in ${RUNTIME_FLAGS_CATALOG_PATH} (scoped by context)`,
        impact: 'CLI parsing ambiguity; shortcodes are context-scoped (runtime -i ≠ bun update -i)',
        autoFixable: false,
        timeToFix: shortOk ? undefined : '2–10 min',
        envScope: 'all',
      }
    )
  );

  // 3) Live bun run --help parity (runtime context)
  const paritySkipped = opts.skipBunHelpParity || bunHelpText == null;
  const parityOk = paritySkipped || (health.bunHelpMisses.length === 0 && loaded.ok);
  checks.push(
    withMeta(
      {
        id: 'catalog-bun-help-parity',
        level: 'fatal',
        group: 'catalog',
        ok: parityOk,
        message: paritySkipped
          ? 'bun run --help parity skipped'
          : health.bunHelpMisses.length === 0
            ? `all runtime catalog tokens present in bun run --help`
            : `missing from bun run --help: ${health.bunHelpMisses.slice(0, 6).join(', ')}${health.bunHelpMisses.length > 6 ? '…' : ''}`,
        source: RUNTIME_DOCS,
      },
      {
        fixCommand: parityOk
          ? undefined
          : `bun run portal:flags:check  # align ${RUNTIME_FLAGS_CATALOG_PATH} with bun run --help (this Bun)`,
        impact: 'Catalog claims flags Bun no longer advertises — harvest/help mislead operators',
        autoFixable: false,
        timeToFix: parityOk ? undefined : '5–15 min',
        envScope: 'all',
      }
    )
  );

  // 4) Help coverage (curated → generated BUN_FLAGS_HELP)
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
        fixCommand: helpOk
          ? undefined
          : 'bun run portal:flags:check  # curated rows must have flag+description; help is catalog-generated',
        impact: 'portal-cli --help runtime section drifts from catalog SSOT',
        autoFixable: false,
        timeToFix: helpOk ? undefined : '1–5 min',
        envScope: 'all',
      }
    )
  );

  // 5) Deprecated awareness (info · dev)
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
            : 'bun run portal:flags:migrate  # list deprecated harvest rows for removal plan',
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
