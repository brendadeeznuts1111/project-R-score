// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Intervention command validity for spine maintenance runbooks.
 *
 * Catalog `intervention` is the primary repair command (also linked to
 * proof.freshRerun). Markdown ## Intervention may list additional steps —
 * each backtick command is statically validated (no shell, no --fix exec).
 *
 * @see ./maintenance.ts
 * @see ../../docs/harness/spine-tenants.md
 */
import { argvFromCommand, MAINTENANCE_RUNBOOKS } from './maintenance';

/** Heads allowed as intervention executables (resolved via Bun.which). */
const ALLOWED_HEADS = new Set(['bun', 'git']);

/** Reject these as intervention heads even if present on PATH. */
const DENIED_HEADS = new Set(['rm', 'dd', 'mkfs', 'sudo', 'chmod', 'chown', 'curl', 'wget', 'ssh']);

const SHELL_META_RE = /[|><;`]|\$\(|&&|\|\|/;

export type ExtractedInterventionCommand = {
  tenant: string; // brand-ok — opaque spine tenant catalog key
  source: 'catalog' | 'markdown';
  cmd: string;
};

/** Pull fenced-inline commands from a ## Intervention section. */
export function extractInterventionCommandsFromMarkdown(md: string): string[] {
  const section = md.match(/##\s+Intervention\b[\s\S]*?(?=\n##\s|\n?$)/i);
  if (!section) return [];
  const body = section[0]!;
  const cmds: string[] = [];
  for (const m of body.matchAll(/`([^`\n]+)`/g)) {
    const inner = m[1]!.trim();
    if (!inner) continue;
    // Skip pure paths / flags / prose fragments
    if (!/^(bun|git)\b/.test(inner)) continue;
    if (SHELL_META_RE.test(inner)) continue;
    cmds.push(inner);
  }
  return [...new Set(cmds)];
}

export function collectInterventionCommands(
  mdByTenant: ReadonlyMap<string, string>
): ExtractedInterventionCommand[] {
  const out: ExtractedInterventionCommand[] = [];
  for (const r of MAINTENANCE_RUNBOOKS) {
    out.push({ tenant: r.tenant, source: 'catalog', cmd: r.intervention.trim() });
    const md = mdByTenant.get(r.tenant);
    if (!md) continue;
    for (const cmd of extractInterventionCommandsFromMarkdown(md)) {
      out.push({ tenant: r.tenant, source: 'markdown', cmd });
    }
  }
  return out;
}

async function packageScripts(root: string): Promise<Set<string>> {
  const pkg = (await Bun.file(`${root}/package.json`).json()) as {
    scripts?: Record<string, string>;
  };
  return new Set(Object.keys(pkg.scripts ?? {}));
}

async function validateCommand(root: string, cmd: string, scripts: Set<string>): Promise<string[]> {
  const failures: string[] = [];
  if (!cmd.trim()) {
    failures.push('empty command');
    return failures;
  }
  if (SHELL_META_RE.test(cmd)) {
    failures.push(`shell metacharacters not allowed (no pipes/redirects): \`${cmd}\``);
    return failures;
  }

  const argv = argvFromCommand(cmd);
  if (argv.length === 0) {
    failures.push('empty argv');
    return failures;
  }

  const head = argv[0]!;
  if (DENIED_HEADS.has(head)) {
    failures.push(`denied executable \`${head}\``);
    return failures;
  }
  if (!ALLOWED_HEADS.has(head)) {
    failures.push(`executable \`${head}\` not in allowlist (${[...ALLOWED_HEADS].join(', ')})`);
    return failures;
  }
  if (!Bun.which(head)) {
    failures.push(`executable \`${head}\` not found on PATH`);
    return failures;
  }

  if (head === 'bun') {
    const sub = argv[1];
    if (!sub) {
      failures.push('`bun` requires a subcommand or script path');
      return failures;
    }
    if (sub === 'run') {
      const script = argv[2];
      if (!script) {
        failures.push('`bun run` requires a script name');
        return failures;
      }
      if (!scripts.has(script)) {
        failures.push(`package.json scripts missing \`${script}\``);
      }
      return failures;
    }
    if (sub === 'test') {
      // bun test [files…] — optional paths must exist when they look like files
      for (const arg of argv.slice(2)) {
        if (arg.startsWith('-')) continue;
        if (!arg.includes('/') && !/\.(ts|js|tsx|jsx)$/.test(arg)) continue;
        if (!(await Bun.file(`${root}/${arg}`).exists())) {
          failures.push(`bun test path missing: ${arg}`);
        }
      }
      return failures;
    }
    // bun <file.ts> …
    if (sub.includes('/') || /\.(ts|js|tsx|jsx)$/.test(sub)) {
      if (!(await Bun.file(`${root}/${sub}`).exists())) {
        failures.push(`script path missing: ${sub}`);
      }
      return failures;
    }
    failures.push(`unsupported bun invocation (expected bun run|test|<path>): \`${cmd}\``);
  }

  return failures;
}

/**
 * Fail closed: catalog + markdown intervention commands are syntactically
 * valid, use allowlisted executables, and resolve to real scripts/paths.
 */
export async function assertInterventionCommandsValid(root: string): Promise<string[]> {
  const scripts = await packageScripts(root);
  const mdByTenant = new Map<string, string>();
  const failures: string[] = [];

  for (const r of MAINTENANCE_RUNBOOKS) {
    const abs = `${root}/${r.docPath}`;
    if (!(await Bun.file(abs).exists())) {
      failures.push(`${r.tenant}: missing doc ${r.docPath}`);
      continue;
    }
    const md = await Bun.file(abs).text();
    mdByTenant.set(r.tenant, md);
    if (!md.includes(r.intervention)) {
      failures.push(
        `${r.tenant}: markdown must include catalog intervention \`${r.intervention}\``
      );
    }
  }

  const cmds = collectInterventionCommands(mdByTenant);
  const seen = new Set<string>();
  for (const { tenant, source, cmd } of cmds) {
    const key = `${tenant}\0${cmd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const errs = await validateCommand(root, cmd, scripts);
    for (const e of errs) {
      failures.push(`${tenant}.${source} · \`${cmd}\` · ${e}`);
    }
  }

  return failures;
}
