#!/usr/bin/env bun

type Violation = {
  file: string;
  line: number;
  column: number;
  api: 'get' | 'set' | 'delete';
  snippet: string;
};

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_PREFIXES = ['node_modules/', 'dist/', '.cache/'];

function isCodeFile(path: string): boolean {
  if (IGNORE_PREFIXES.some(prefix => path.startsWith(prefix))) return false;
  const idx = path.lastIndexOf('.');
  if (idx === -1) return false;
  return CODE_EXT.has(path.slice(idx));
}

function getTrackedFiles(): string[] {
  const out = Bun.spawnSync(['git', 'ls-files'], { stdout: 'pipe', stderr: 'pipe' });
  if (out.exitCode !== 0) {
    const err = Buffer.from(out.stderr).toString('utf8');
    throw new Error(`git ls-files failed: ${err}`);
  }
  return Buffer.from(out.stdout)
    .toString('utf8')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean)
    .filter(isCodeFile);
}

function stripCommentsAndStrings(input: string): string {
  let result = '';
  let i = 0;
  let state: 'code' | 'line-comment' | 'block-comment' | 'single' | 'double' | 'template' = 'code';

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (state === 'code') {
      if (ch === '/' && next === '/') {
        state = 'line-comment';
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        state = 'block-comment';
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === "'") {
        state = 'single';
        result += ' ';
        i++;
        continue;
      }
      if (ch === '"') {
        state = 'double';
        result += ' ';
        i++;
        continue;
      }
      if (ch === '`') {
        state = 'template';
        result += ' ';
        i++;
        continue;
      }

      result += ch;
      i++;
      continue;
    }

    if (state === 'line-comment') {
      if (ch === '\n') {
        state = 'code';
        result += '\n';
      } else {
        result += ' ';
      }
      i++;
      continue;
    }

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        state = 'code';
        result += '  ';
        i += 2;
      } else {
        result += ch === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    if (state === 'single') {
      if (ch === '\\') {
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === "'") {
        state = 'code';
        result += ' ';
        i++;
        continue;
      }
      result += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }

    if (state === 'double') {
      if (ch === '\\') {
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === '"') {
        state = 'code';
        result += ' ';
        i++;
        continue;
      }
      result += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }

    if (state === 'template') {
      if (ch === '\\') {
        result += '  ';
        i += 2;
        continue;
      }
      if (ch === '`') {
        state = 'code';
        result += ' ';
        i++;
        continue;
      }
      result += ch === '\n' ? '\n' : ' ';
      i++;
      continue;
    }
  }

  return result;
}

function positionFromIndex(content: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function snippetFromLine(content: string, line: number): string {
  const lines = content.split('\n');
  return (lines[line - 1] || '').trim();
}

function findViolations(file: string, source: string): Violation[] {
  const cleaned = stripCommentsAndStrings(source);
  const pattern = /\bBun\.secrets\.(get|set|delete)\s*\(/g;
  const violations: Violation[] = [];

  for (const match of cleaned.matchAll(pattern)) {
    const start = match.index ?? 0;
    const { line, column } = positionFromIndex(cleaned, start);
    const api = (match[1] as 'get' | 'set' | 'delete') || 'get';
    const openIndex = start + match[0].length - 1;
    const parsed = parseCallArguments(cleaned, openIndex);
    if (!parsed) continue;
    const { args } = parsed;
    if (!isViolationByArgs(args)) continue;
    violations.push({
      file,
      line,
      column,
      api,
      snippet: snippetFromLine(source, line),
    });
  }

  return violations;
}

function parseCallArguments(text: string, openParenIndex: number): { args: string[] } | null {
  if (text[openParenIndex] !== '(') return null;
  let i = openParenIndex + 1;
  let depth = 1;
  let arg = '';
  const args: string[] = [];

  while (i < text.length) {
    const ch = text[i];

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      arg += ch;
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) {
        const last = arg.trim();
        if (last.length > 0) args.push(last);
        return { args };
      }
      arg += ch;
      i++;
      continue;
    }
    if (ch === ',' && depth === 1) {
      args.push(arg.trim());
      arg = '';
      i++;
      continue;
    }

    arg += ch;
    i++;
  }
  return null;
}

function isPrimitiveLikeExpression(expr: string): boolean {
  const t = expr.trim();
  if (!t) return true;
  return (
    t.startsWith("'") ||
    t.startsWith('\"') ||
    t.startsWith('`') ||
    t.startsWith('[') ||
    /^\\d/.test(t) ||
    t === 'true' ||
    t === 'false' ||
    t === 'null' ||
    t === 'undefined'
  );
}

function isViolationByArgs(args: string[]): boolean {
  if (args.length !== 1) return true;
  const first = args[0].trim();
  if (first.startsWith('{')) return false;
  if (isPrimitiveLikeExpression(first)) return true;
  return false;
}

async function main() {
  const files = getTrackedFiles();
  const all: Violation[] = [];

  for (const file of files) {
    const source = await Bun.file(file).text();
    const violations = findViolations(file, source);
    if (violations.length) all.push(...violations);
  }

  if (all.length === 0) {
    console.log('PASS secrets conformance: no positional Bun.secrets usage found');
    process.exit(0);
  }

  console.error(`FAIL secrets conformance: found ${all.length} positional Bun.secrets call(s)`);
  for (const v of all) {
    console.error(`- ${v.file}:${v.line}:${v.column} Bun.secrets.${v.api}(...) must use object options`);
    if (v.snippet.length > 0) console.error(`  ${v.snippet}`);
  }

  console.error('\nExpected pattern: Bun.secrets.get({ service, name }) / set({ service, name, value }) / delete({ service, name })');
  process.exit(1);
}

await main();
