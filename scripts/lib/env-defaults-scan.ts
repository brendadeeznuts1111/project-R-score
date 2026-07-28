// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Pure Bun.env hygiene scanner — shared by check-env-defaults CLI + tests.
 * Classifies optional config reads that lack fallbacks (not secrets / ambient).
 */
import { isBunSecretsServiceEnv } from './env-secret-policy.ts';

/** Process / host ambient — presence is optional by design. */
export const PROCESS_AMBIENT = new Set([
  'HOME',
  'PATH',
  'PWD',
  'USER',
  'SHELL',
  'TMPDIR',
  'TEMP',
  'TMP',
  'TERM',
  'TERM_PROGRAM',
  'COLORTERM',
  'LANG',
  'LC_ALL',
  'TZ',
  'CI',
  'GITHUB_ACTIONS',
  'GITHUB_WORKSPACE',
  'RUNNER_OS',
  'FORCE_COLOR',
  'NO_COLOR',
  'DEBUG',
  'NODE_ENV',
  'NODE_OPTIONS',
  'BUN_DEBUG',
  'BUN_CONFIG_VERBOSE_FETCH',
  'BUN_INSTALL',
  'BUN_INSTALL_CACHE_DIR',
  'EDITOR',
  'VISUAL',
  'SSH_AUTH_SOCK',
  'DISPLAY',
  'XPC_SERVICE_NAME',
  'LOGNAME',
  'HOSTNAME',
  'HOST',
  'PORT',
  'GITHUB_STEP_SUMMARY',
  'GITHUB_OUTPUT',
  'GITHUB_ENV',
  'GITHUB_PATH',
  'GITHUB_STATE',
  'RUNNER_TEMP',
  'RUNNER_TOOL_CACHE',
]);

/** Secrets/credentials — missing should fail loud or use vault inject. */
export const REQUIRED_SECRET_RE =
  /(TOKEN|SECRET|PASSWORD|PASSWD|_PASS$|PRIVATE_KEY|API_KEY|ACCESS_KEY|KEY_ID|CREDENTIAL|WEBHOOK|PAT\b|AUTH_KEY|SESSION_KEY|_KEY$|_KEYS$)/i;

export const ENV_RE = /\bBun\.env\.([A-Z_][A-Z0-9_]*)\b/g;

export type EnvIssue = {
  file: string;
  line: number;
  envVar: string;
  text: string;
};

export type EnvUsage = {
  file: string;
  line: number;
  envVar: string;
  kind: 'ambient' | 'secret' | 'config' | 'write' | 'meta';
  text: string;
};

export function isCommentOrDoc(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith('//') ||
    t.startsWith('*') ||
    t.startsWith('/*') ||
    t.startsWith('·') ||
    /^export\s+(type|interface)\b/.test(t)
  );
}

/** Meta / non-runtime mentions: string literals, includes checks, delete. */
export function isMetaOrWrite(line: string, envVar: string): boolean {
  // delete Bun.env.FOO
  if (new RegExp(String.raw`\bdelete\s+Bun\.env\.${envVar}\b`).test(line)) return true;
  // Assignment write
  if (new RegExp(String.raw`Bun\.env\.${envVar}\s*=`).test(line)) return true;
  // Quoted meta: 'Bun.env.FOO' or "Bun.env.FOO" or `Bun.env.FOO`
  if (new RegExp(String.raw`['"\`]Bun\\.env\\.${envVar}['"\`]`).test(line)) return true;
  // code.includes('Bun.env.FOO') style without quotes around full token already covered
  if (/\.includes\s*\(/.test(line) && line.includes(`Bun.env.${envVar}`)) return true;
  return false;
}

/** Same-line / nearby evidence that the read is optional or guarded. */
export function hasFallbackOrGuard(
  line: string,
  prev: string,
  following: string[],
  envVar?: string
): boolean {
  const window = `${prev}\n${line}\n${following.join('\n')}`;

  if (envVar && isMetaOrWrite(line, envVar)) return true;

  // Writes are not config reads
  if (/Bun\.env\.[A-Z0-9_]+\s*=/.test(line)) return true;
  // Snippet inside a template-string sample (ends with ` or `,)
  if (/`\s*,?\s*$/.test(line.trim()) || /`\s*;\s*$/.test(line.trim())) return true;

  // Non-null assertion → caller requires the var
  if (/Bun\.env\.[A-Z0-9_]+\s*!/.test(line)) return true;
  // Default parameter with type annotation: raw: string | undefined = Bun.env.FOO
  // (plain `const x = Bun.env.FOO` is NOT a fallback — still flagged)
  if (/:\s*[^=\n]+=\s*Bun\.env\.[A-Z0-9_]+/.test(line)) return true;
  // Object field pass-through: { registryPath: Bun.env.FOO }
  if (/:\s*Bun\.env\.[A-Z0-9_]+/.test(line)) return true;
  // typeof / ternary guards
  if (/typeof\s+Bun\.env\./.test(window)) return true;
  if (/\?\s*Bun\.env\./.test(window) && /:/.test(window)) return true;

  // Classic defaults
  if (/\|\|/.test(line) || /\?\?/.test(line)) return true;
  if (/Number\s*\(\s*Bun\.env\./.test(line) && /\|\|/.test(line)) return true;
  if (/parseInt\s*\(\s*Bun\.env\./.test(line)) return true;

  // Helpers with (env, fallback) or third-arg defaults (same line or call start on prev)
  const helperRe =
    /\b(parseBooleanEnv|parseBoolEnv|coerceNum|coerceNumber|envOr|readEnv|getEnv|parseEnv|boolEnv|numEnv|integerOption|isFeatureFlagActive)\s*\(/;
  if (helperRe.test(line) && /Bun\.env\./.test(line)) return true;
  if (helperRe.test(prev) && /Bun\.env\./.test(line)) return true;
  if (helperRe.test(window) && /Bun\.env\./.test(line) && /,\s*\d+/.test(window)) return true;
  // integerOption(opts, Bun.env.X, 2) — default is 3rd arg (possibly multi-line)
  if (
    /Bun\.env\.[A-Z0-9_]+\s*,\s*(\d+|true|false|null|['"`])/.test(line) ||
    /,\s*Bun\.env\.[A-Z0-9_]+\s*,\s*(\d+|true|false|null|['"`])/.test(line) ||
    (/Bun\.env\.[A-Z0-9_]+/.test(line) && /^\s*,\s*\d+/.test(following[0] ?? ''))
  ) {
    return true;
  }

  // Boolean / truthiness
  if (/if\s*\(.*Bun\.env\./.test(line)) return true;
  if (/Bun\.env\.[A-Z0-9_]+\s*(&&|\|\||\?)/.test(line)) return true;
  if (/Bun\.env\.[A-Z0-9_]+\s*(===|!==|==|!=)/.test(line)) return true;
  if (/!\s*Bun\.env\./.test(line)) return true;
  if (/\bBoolean\s*\(\s*Bun\.env\./.test(line)) return true;
  if (/Bun\.env\.[A-Z0-9_]+\?/.test(line)) return true;
  if (/\?\?/.test(window) && /Bun\.env\./.test(window)) return true;
  if (/\b(require|assert|must|ensure)[A-Z(]/.test(window)) return true;
  if (/\bthrow\b/.test(window) && /Bun\.env\./.test(window)) return true;
  if (/CLOUDFLARE_DEFAULTS|R2_CONFIG|DEFAULT_|envOr|readEnv|getEnv|parseEnv/.test(window))
    return true;

  // Array of optional envs then .filter(Boolean)
  if (/\[\s*Bun\.env\./.test(line) && /\.filter\s*\(\s*Boolean\s*\)/.test(window)) return true;

  // Number(Bun.env.X); if (!Number.isFinite(...)) return
  if (/Number\s*\(\s*Bun\.env\./.test(line)) {
    const rest = following.slice(0, 4).join('\n');
    if (/Number\.isFinite|Number\.isNaN|!.*\|\|/.test(rest)) return true;
  }

  // const x = Bun.env.FOO; … if (!x) return
  const constMatch = line.match(/\bconst\s+(\w+)\s*=\s*(?:\[)?Bun\.env\.[A-Z0-9_]+/);
  if (constMatch) {
    const name = constMatch[1]!;
    const rest = following.slice(0, 8).join('\n');
    if (new RegExp(String.raw`if\s*\([^)]*!\s*${name}\b`).test(rest)) return true;
    if (
      new RegExp(String.raw`if\s*\([^)]*\b${name}\b`).test(rest) &&
      /\b(return null|return;|return undefined|throw )\b/.test(rest)
    ) {
      return true;
    }
    if (new RegExp(String.raw`\.filter\s*\(\s*Boolean`).test(rest)) return true;
  }

  return false;
}

export function classifyEnvVar(envVar: string): 'ambient' | 'secret' | 'config' {
  if (envVar.startsWith('NODE_') || PROCESS_AMBIENT.has(envVar)) return 'ambient';
  // Bun.secrets *service id* envs look secret-shaped (…SECRETS_SERVICE) but are labels
  if (isBunSecretsServiceEnv(envVar)) return 'config';
  if (REQUIRED_SECRET_RE.test(envVar)) return 'secret';
  return 'config';
}

/**
 * Scan source text for optional config Bun.env reads lacking fallbacks.
 * @param file path label only (not opened)
 */
export function scanTextForIssues(file: string, text: string): EnvIssue[] {
  const lines = text.split('\n');
  const out: EnvIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (isCommentOrDoc(line)) continue;

    ENV_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seenOnLine = new Set<string>();
    while ((m = ENV_RE.exec(line)) !== null) {
      const envVar = m[1]!;
      if (seenOnLine.has(envVar)) continue;
      seenOnLine.add(envVar);

      if (classifyEnvVar(envVar) !== 'config') continue;

      const prev = lines[i - 1] ?? '';
      const following = lines.slice(i + 1, i + 9);
      if (hasFallbackOrGuard(line, prev, following, envVar)) continue;
      if (new RegExp(String.raw`if\s*\(\s*Bun\.env\.${envVar}\b`).test(prev)) continue;
      if (new RegExp(String.raw`if\s*\(\s*Bun\.env\.${envVar}\b`).test(line)) continue;

      out.push({
        file,
        line: i + 1,
        envVar,
        text: line.trim().slice(0, 120),
      });
    }
  }
  return out;
}

/** All Bun.env mentions with kind classification (for inventory). */
export function scanTextForUsages(file: string, text: string): EnvUsage[] {
  const lines = text.split('\n');
  const out: EnvUsage[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (isCommentOrDoc(line)) continue;

    ENV_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seenOnLine = new Set<string>();
    while ((m = ENV_RE.exec(line)) !== null) {
      const envVar = m[1]!;
      if (seenOnLine.has(envVar)) continue;
      seenOnLine.add(envVar);

      let kind: EnvUsage['kind'] = classifyEnvVar(envVar);
      if (isMetaOrWrite(line, envVar) || /Bun\.env\.[A-Z0-9_]+\s*=/.test(line)) {
        kind = /delete\s+Bun\.env\.|\.includes\s*\(/.test(line) ? 'meta' : 'write';
      }

      out.push({
        file,
        line: i + 1,
        envVar,
        kind,
        text: line.trim().slice(0, 120),
      });
    }
  }
  return out;
}

/** True when a template value is a usable local default (not vault/placeholder). */
export function isUsableTemplateDefault(val: string): boolean {
  const v = val.trim();
  if (!v) return false;
  if (/\{\{\s*pass:\/\//.test(v)) return false;
  if (/^pass:\/\//i.test(v)) return false;
  if (/^(changeme|replace|todo|xxx|your-|<.*>)$/i.test(v)) return false;
  if (/^(true|false|0|1)$/i.test(v)) return true;
  // Non-empty literals (urls, depths, paths) count as defaults
  return true;
}

/** Parse KEY= lines, pass:// refs, and usable literal defaults from an env.template body. */
export function parseEnvTemplate(text: string): {
  keys: string[];
  vaultRefs: { key: string; ref: string }[];
  /** KEY → literal default when not a vault/placeholder (never secret payloads from Pass). */
  defaults: Record<string, string>;
} {
  const keys: string[] = [];
  const vaultRefs: { key: string; ref: string }[] = [];
  const defaults: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (!t.includes('=')) continue;
    const eq = t.indexOf('=');
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    keys.push(key);
    const m = val.match(/\{\{\s*(pass:\/\/[^}]+)\s*\}\}/);
    if (m) {
      vaultRefs.push({ key, ref: m[1]!.trim() });
      continue;
    }
    if (isUsableTemplateDefault(val)) defaults[key] = val;
  }
  return { keys, vaultRefs, defaults };
}
