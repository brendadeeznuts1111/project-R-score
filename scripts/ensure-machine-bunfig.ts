#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Ensure ~/.bunfig.toml exists from config/machine.bunfig.toml.template.
 *
 *   bun run machine:bunfig:ensure
 *   bun run machine:bunfig:ensure --overwrite        # replace a regular host file
 *   bun run machine:bunfig:ensure --overwrite-link   # replace a symlink (explicit)
 *   bun run machine:bunfig:ensure --check            # exit 1 if missing / drift / XDG shadow
 *
 * CI: setup-factory-bun writes a regular file so portal:doctor + bake:doctor:check are portable.
 * Local: no-op if ~/.bunfig.toml already present. --overwrite will not flatten a symlink.
 *
 * Policy table SSOT: lib/install/machine-bunfig-policy.ts
 * @see docs/UNIFIED.md
 */
import {
  CACHE_DIR_PLACEHOLDER,
  cacheDirUsesUnexpandedTilde,
  MACHINE_BUNFIG_TEMPLATE_REL,
  machineBunfigMissingSnippets,
  xdgShadowBunfigPath,
} from '../lib/install/machine-bunfig-policy.ts';
// eslint-disable-next-line no-restricted-imports -- Bun.file has no lstat; node:fs is the documented fallback
import { lstatSync } from 'node:fs';
import { joinPath } from './lib/fs-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('machine:bunfig:ensure', Bun.argv.slice(2))
  : Bun.argv.slice(2);
// Re-export SSOT for existing importers (tests / CLI).
export {
  CACHE_DIR_PLACEHOLDER,
  MACHINE_BUNFIG_REQUIRED_SNIPPETS,
  MACHINE_BUNFIG_TEMPLATE_REL,
  xdgShadowBunfigPath,
} from '../lib/install/machine-bunfig-policy.ts';

export type EnsureMachineBunfigOpts = {
  cwd?: string;
  home?: string;
  overwrite?: boolean;
  /** Replace a symlink at ~/.bunfig.toml (including a dangling one). */
  overwriteLink?: boolean;
  checkOnly?: boolean;
  env?: Record<string, string | undefined>;
};

export type EnsureMachineBunfigResult = {
  ok: boolean;
  action: 'wrote' | 'exists' | 'missing' | 'would-write' | 'check-ok' | 'check-fail' | 'refused';
  path: string;
  cacheDir: string;
  reason?: string;
};

/** True when path exists as a symlink (does not follow the target). */
export function bunfigPathIsSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/** True when path is a directory (does not follow a symlink). */
export function bunfigPathIsDirectory(path: string): boolean {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

function resolveHome(env: Record<string, string | undefined>, explicit?: string): string | null {
  if (explicit) return explicit;
  return env.HOME ?? env.USERPROFILE ?? null;
}

export function renderMachineBunfigTemplate(template: string, cacheDir: string): string {
  if (!template.includes(CACHE_DIR_PLACEHOLDER)) {
    throw new Error(`template missing ${CACHE_DIR_PLACEHOLDER}`);
  }
  return template.split(CACHE_DIR_PLACEHOLDER).join(cacheDir);
}

/** @deprecated prefer machineBunfigMissingSnippets from lib/install/machine-bunfig-policy */
export function machineBunfigHasRequiredSnippets(text: string): string[] {
  return machineBunfigMissingSnippets(text);
}

export async function ensureMachineBunfig(
  opts: EnsureMachineBunfigOpts = {}
): Promise<EnsureMachineBunfigResult> {
  const env = opts.env ?? (Bun.env as Record<string, string | undefined>);
  const cwd = opts.cwd ?? process.cwd();
  const home = resolveHome(env, opts.home);
  if (!home) {
    return {
      ok: false,
      action: 'missing',
      path: '',
      cacheDir: '',
      reason: 'HOME / USERPROFILE unset',
    };
  }
  const path = joinPath(home, '.bunfig.toml');
  const cacheDir = joinPath(home, '.bun', 'install', 'cache');
  const templatePath = joinPath(cwd, MACHINE_BUNFIG_TEMPLATE_REL);
  const templateFile = Bun.file(templatePath);
  if (!(await templateFile.exists())) {
    return {
      ok: false,
      action: 'missing',
      path,
      cacheDir,
      reason: `missing template ${MACHINE_BUNFIG_TEMPLATE_REL}`,
    };
  }
  const template = await templateFile.text();
  const rendered = renderMachineBunfigTemplate(template, cacheDir);
  const existing = Bun.file(path);
  const linked = bunfigPathIsSymlink(path);
  const isDir = bunfigPathIsDirectory(path);
  const targetExists = await existing.exists();
  const xdgShadow = xdgShadowBunfigPath(env);

  if (opts.checkOnly) {
    if (xdgShadow && (await Bun.file(xdgShadow).exists())) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: `$XDG_CONFIG_HOME/.bunfig.toml shadows ~/.bunfig.toml (${xdgShadow})`,
      };
    }
    if (isDir) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: '~/.bunfig.toml is a directory',
      };
    }
    if (linked && !targetExists) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: 'dangling symlink ~/.bunfig.toml',
      };
    }
    if (!targetExists) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: 'missing ~/.bunfig.toml — run: bun run machine:bunfig:ensure',
      };
    }
    const text = await existing.text();
    const missing = machineBunfigMissingSnippets(text);
    if (missing.length) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: `machine bunfig missing SSOT snippets: ${missing.join(', ')}`,
      };
    }
    // cache.dir should be absolute (not bare ~) — SSOT: cacheDirUsesUnexpandedTilde
    if (cacheDirUsesUnexpandedTilde(text)) {
      return {
        ok: false,
        action: 'check-fail',
        path,
        cacheDir,
        reason: 'cache.dir uses unexpanded ~ — use absolute path',
      };
    }
    return { ok: true, action: 'check-ok', path, cacheDir };
  }

  if (isDir) {
    return {
      ok: false,
      action: 'refused',
      path,
      cacheDir,
      reason: '~/.bunfig.toml is a directory',
    };
  }

  if (linked && !opts.overwriteLink) {
    if (!targetExists) {
      return {
        ok: false,
        action: 'refused',
        path,
        cacheDir,
        reason: 'dangling symlink ~/.bunfig.toml — restore the target or pass --overwrite-link',
      };
    }
    if (!opts.overwrite) {
      return { ok: true, action: 'exists', path, cacheDir };
    }
    return {
      ok: false,
      action: 'refused',
      path,
      cacheDir,
      reason: 'refusing to replace symlink ~/.bunfig.toml; pass --overwrite-link',
    };
  }

  if (targetExists && !linked && !opts.overwrite && !opts.overwriteLink) {
    return { ok: true, action: 'exists', path, cacheDir };
  }

  if (linked) {
    // Unlinks the symlink inode; does not delete the target (proven vs Bun.file).
    // https://bun.com/docs/runtime/file-io#deleting-files-file-delete
    await Bun.file(path).delete();
  }

  await Bun.write(path, rendered.endsWith('\n') ? rendered : `${rendered}\n`);
  return {
    ok: true,
    action: 'wrote',
    path,
    cacheDir,
  };
}

if (import.meta.main) {
  const overwrite = argv.includes('--overwrite');
  const overwriteLink = argv.includes('--overwrite-link');
  const checkOnly = argv.includes('--check');
  const result = await ensureMachineBunfig({ overwrite, overwriteLink, checkOnly });
  if (!result.ok) {
    console.error(
      [
        'machine-bunfig: result=fail',
        `action=${result.action}`,
        result.path ? `path=${result.path}` : null,
        result.reason ? `reason=${result.reason}` : null,
      ]
        .filter(Boolean)
        .join('  ')
    );
    process.exit(1);
  }
  console.log(
    [
      'machine-bunfig: result=ok',
      `action=${result.action}`,
      `path=${result.path}`,
      `cache_dir=${result.cacheDir}`,
    ].join('  ')
  );
  process.exit(0);
}
