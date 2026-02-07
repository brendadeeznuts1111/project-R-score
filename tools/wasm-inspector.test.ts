import { test, expect, describe } from 'bun:test';
import {
  WASM_API,
  getWasmClass,
  getWasmMember,
  getAllWasmUrls,
} from '../lib/docs/wasm-reference';
import type { WasmAPIEntry } from '../lib/docs/wasm-reference';
import { DocumentationCategory, UrlType } from '../lib/docs/constants/enums';
import { DOC_PATTERNS } from '../lib/docs/patterns';

// ─── wasm-reference.ts ───────────────────────────────────────────────

describe('WASM_API entries', () => {
  test('contains all 4 core classes', () => {
    const classNames = WASM_API.filter(e => e.kind === 'class').map(e => e.name);
    expect(classNames).toContain('WebAssembly.Module');
    expect(classNames).toContain('WebAssembly.Instance');
    expect(classNames).toContain('WebAssembly.Memory');
    expect(classNames).toContain('WebAssembly.Table');
  });

  test('contains compile and instantiate functions', () => {
    const funcNames = WASM_API.filter(e => e.kind === 'function').map(e => e.name);
    expect(funcNames).toContain('WebAssembly.compile');
    expect(funcNames).toContain('WebAssembly.instantiate');
  });

  test('every entry has mdnUrl and bunUrl', () => {
    for (const entry of WASM_API) {
      expect(entry.mdnUrl).toMatch(/^https:\/\/developer\.mozilla\.org/);
      expect(entry.bunUrl).toMatch(/^https:\/\/bun\.sh/);
      if (entry.members) {
        for (const m of entry.members) {
          expect(m.mdnUrl).toMatch(/^https:\/\/developer\.mozilla\.org/);
          expect(m.bunUrl).toMatch(/^https:\/\/bun\.sh/);
        }
      }
    }
  });

  test('every entry has a non-empty description', () => {
    for (const entry of WASM_API) {
      expect(entry.description.length).toBeGreaterThan(0);
      if (entry.members) {
        for (const m of entry.members) {
          expect(m.description.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('getWasmClass', () => {
  test('finds by full name', () => {
    const entry = getWasmClass('WebAssembly.Table');
    expect(entry).toBeDefined();
    expect(entry!.name).toBe('WebAssembly.Table');
  });

  test('finds by short name', () => {
    const entry = getWasmClass('Table');
    expect(entry).toBeDefined();
    expect(entry!.name).toBe('WebAssembly.Table');
  });

  test('case-insensitive', () => {
    const entry = getWasmClass('webassembly.memory');
    expect(entry).toBeDefined();
    expect(entry!.name).toBe('WebAssembly.Memory');
  });

  test('returns undefined for unknown', () => {
    expect(getWasmClass('WebAssembly.Nonexistent')).toBeUndefined();
  });
});

describe('getWasmMember', () => {
  test('finds a method', () => {
    const member = getWasmMember('Table', 'set');
    expect(member).toBeDefined();
    expect(member!.kind).toBe('method');
  });

  test('finds a property', () => {
    const member = getWasmMember('Table', 'length');
    expect(member).toBeDefined();
    expect(member!.kind).toBe('property');
  });

  test('returns undefined for unknown member', () => {
    expect(getWasmMember('Table', 'nonexistent')).toBeUndefined();
  });
});

describe('getAllWasmUrls', () => {
  test('returns valid URL strings', () => {
    const urls = getAllWasmUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(() => new URL(url)).not.toThrow();
    }
  });

  test('includes both MDN and Bun URLs', () => {
    const urls = getAllWasmUrls();
    expect(urls.some(u => u.includes('developer.mozilla.org'))).toBe(true);
    expect(urls.some(u => u.includes('bun.sh'))).toBe(true);
  });

  test('is deduplicated', () => {
    const urls = getAllWasmUrls();
    expect(new Set(urls).size).toBe(urls.length);
  });
});

// ─── Enum additions ──────────────────────────────────────────────────

describe('Enum additions', () => {
  test('DocumentationCategory includes WEBASSEMBLY', () => {
    expect(DocumentationCategory.WEBASSEMBLY).toBe('webassembly');
  });

  test('UrlType includes WASM_MODULE', () => {
    expect(UrlType.WASM_MODULE).toBe('wasm_module');
  });
});

// ─── DOC_PATTERNS integration ────────────────────────────────────────

describe('DOC_PATTERNS WASM integration', () => {
  test('getRelatedDocs returns results for /api/wasm', () => {
    const related = DOC_PATTERNS.getRelatedDocs('/api/wasm');
    expect(related.length).toBeGreaterThan(0);
    expect(related.some(u => u.includes('wasm') || u.includes('WebAssembly'))).toBe(true);
  });

  test('getRelatedDocs returns results for WebAssembly keyword', () => {
    const related = DOC_PATTERNS.getRelatedDocs('/some/path/WebAssembly');
    expect(related.length).toBeGreaterThan(0);
  });

  test('patterns map includes /api/wasm', () => {
    expect(DOC_PATTERNS.patterns['/api/wasm']).toBe('webassembly');
  });
});

// ─── CLI inspector output ────────────────────────────────────────────

describe('wasm-inspector CLI', () => {
  test('reference command outputs all 4 classes', async () => {
    const proc = Bun.spawn(['bun', 'tools/wasm-inspector.ts', 'reference', '--no-color'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    expect(text).toContain('WebAssembly.Module');
    expect(text).toContain('WebAssembly.Instance');
    expect(text).toContain('WebAssembly.Memory');
    expect(text).toContain('WebAssembly.Table');
  });

  test('reference --json returns valid JSON', async () => {
    const proc = Bun.spawn(['bun', 'tools/wasm-inspector.ts', 'reference', '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(WASM_API.length);
  });

  test('urls command returns valid URLs', async () => {
    const proc = Bun.spawn(['bun', 'tools/wasm-inspector.ts', 'urls'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    const lines = text.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => new URL(line)).not.toThrow();
    }
  });

  test('inspect on a minimal wasm module', async () => {
    // Minimal valid .wasm binary (empty module: magic + version + no sections)
    // WAT: (module)
    const minimalWasm = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic: \0asm
      0x01, 0x00, 0x00, 0x00, // version: 1
    ]);

    const tmpPath = '/tmp/test-minimal.wasm';
    await Bun.write(tmpPath, minimalWasm);

    const proc = Bun.spawn(['bun', 'tools/wasm-inspector.ts', 'inspect', tmpPath, '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    const result = JSON.parse(text);
    expect(result.file).toBe(tmpPath);
    expect(result.size).toBe(8);
    expect(Array.isArray(result.exports)).toBe(true);
    expect(Array.isArray(result.imports)).toBe(true);
  });

  test('inspect on a wasm module with exports', async () => {
    // A slightly richer wasm module with a function export
    // WAT equivalent: (module (func (export "add") (param i32 i32) (result i32) local.get 0 local.get 1 i32.add))
    const wasmWithExport = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // header
      0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // type section: (i32, i32) -> i32
      0x03, 0x02, 0x01, 0x00, // function section: 1 func, type 0
      0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, // export section: "add" -> func 0
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, // code section
    ]);

    const tmpPath = '/tmp/test-add.wasm';
    await Bun.write(tmpPath, wasmWithExport);

    const proc = Bun.spawn(['bun', 'tools/wasm-inspector.ts', 'inspect', tmpPath, '--json'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;

    const result = JSON.parse(text);
    expect(result.exports.length).toBe(1);
    expect(result.exports[0].name).toBe('add');
    expect(result.exports[0].kind).toBe('function');
  });
});
