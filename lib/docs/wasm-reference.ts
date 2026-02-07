/**
 * WebAssembly API Reference
 *
 * Structured reference of the WebAssembly JS API surface.
 * Used by the CLI inspector, doc generation, and extension points.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface WasmAPIMember {
  name: string;
  kind: 'method' | 'property';
  signature?: string;
  description: string;
  mdnUrl: string;
  bunUrl: string;
}

export interface WasmAPIEntry {
  name: string;
  kind: 'class' | 'function' | 'property';
  description: string;
  mdnUrl: string;
  bunUrl: string;
  members?: WasmAPIMember[];
}

// ─── Constants ───────────────────────────────────────────────────────

const MDN = 'https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface';
const BUN = 'https://bun.sh/docs/api/wasm';

export const WASM_API: readonly WasmAPIEntry[] = [
  {
    name: 'WebAssembly.Module',
    kind: 'class',
    description: 'Contains stateless WebAssembly code that has been compiled by the browser.',
    mdnUrl: `${MDN}/Module`,
    bunUrl: `${BUN}#module`,
    members: [
      {
        name: 'exports',
        kind: 'method',
        signature: 'WebAssembly.Module.exports(module: Module): ModuleExportDescriptor[]',
        description: 'Returns an array of export descriptors for a given module.',
        mdnUrl: `${MDN}/Module/exports_static`,
        bunUrl: `${BUN}#module`,
      },
      {
        name: 'imports',
        kind: 'method',
        signature: 'WebAssembly.Module.imports(module: Module): ModuleImportDescriptor[]',
        description: 'Returns an array of import descriptors for a given module.',
        mdnUrl: `${MDN}/Module/imports_static`,
        bunUrl: `${BUN}#module`,
      },
      {
        name: 'customSections',
        kind: 'method',
        signature: 'WebAssembly.Module.customSections(module: Module, name: string): ArrayBuffer[]',
        description: 'Returns the contents of all custom sections with the given name.',
        mdnUrl: `${MDN}/Module/customSections_static`,
        bunUrl: `${BUN}#module`,
      },
    ],
  },
  {
    name: 'WebAssembly.Instance',
    kind: 'class',
    description: 'A stateful, executable instance of a WebAssembly.Module.',
    mdnUrl: `${MDN}/Instance`,
    bunUrl: `${BUN}#instance`,
    members: [
      {
        name: 'exports',
        kind: 'property',
        signature: 'instance.exports: Record<string, Function | Memory | Table | Global>',
        description: 'Object containing all exported functions and values from the instance.',
        mdnUrl: `${MDN}/Instance/exports`,
        bunUrl: `${BUN}#instance`,
      },
    ],
  },
  {
    name: 'WebAssembly.Memory',
    kind: 'class',
    description: 'A resizable ArrayBuffer that holds the raw bytes of memory accessed by an Instance.',
    mdnUrl: `${MDN}/Memory`,
    bunUrl: `${BUN}#memory`,
    members: [
      {
        name: 'buffer',
        kind: 'property',
        signature: 'memory.buffer: ArrayBuffer',
        description: 'Returns the buffer contained in the memory.',
        mdnUrl: `${MDN}/Memory/buffer`,
        bunUrl: `${BUN}#memory`,
      },
      {
        name: 'grow',
        kind: 'method',
        signature: 'memory.grow(delta: number): number',
        description: 'Grows the memory by delta pages (64KB each). Returns the previous page count.',
        mdnUrl: `${MDN}/Memory/grow`,
        bunUrl: `${BUN}#memory`,
      },
    ],
  },
  {
    name: 'WebAssembly.Table',
    kind: 'class',
    description: 'A resizable typed array of references (e.g. to functions) accessed by an Instance.',
    mdnUrl: `${MDN}/Table`,
    bunUrl: `${BUN}#table`,
    members: [
      {
        name: 'get',
        kind: 'method',
        signature: 'table.get(index: number): Function | null',
        description: 'Returns the element stored at a given index.',
        mdnUrl: `${MDN}/Table/get`,
        bunUrl: `${BUN}#table`,
      },
      {
        name: 'set',
        kind: 'method',
        signature: 'table.set(index: number, value: Function): void',
        description: 'Sets an element at a given index to a given value.',
        mdnUrl: `${MDN}/Table/set`,
        bunUrl: `${BUN}#table`,
      },
      {
        name: 'grow',
        kind: 'method',
        signature: 'table.grow(delta: number): number',
        description: 'Grows the table by delta elements. Returns the previous length.',
        mdnUrl: `${MDN}/Table/grow`,
        bunUrl: `${BUN}#table`,
      },
      {
        name: 'length',
        kind: 'property',
        signature: 'table.length: number',
        description: 'Returns the current number of elements in the table (read-only).',
        mdnUrl: `${MDN}/Table/length`,
        bunUrl: `${BUN}#table`,
      },
    ],
  },
  {
    name: 'WebAssembly.compile',
    kind: 'function',
    description: 'Compiles WebAssembly binary code into a WebAssembly.Module.',
    mdnUrl: `${MDN}/compile_static`,
    bunUrl: `${BUN}#compile`,
    members: [],
  },
  {
    name: 'WebAssembly.instantiate',
    kind: 'function',
    description: 'Compiles and instantiates WebAssembly binary code.',
    mdnUrl: `${MDN}/instantiate_static`,
    bunUrl: `${BUN}#instantiate`,
    members: [],
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────

/** Lookup a top-level WASM class/function by name (case-insensitive tail match) */
export function getWasmClass(name: string): WasmAPIEntry | undefined {
  const lower = name.toLowerCase();
  return WASM_API.find(
    e => e.name.toLowerCase() === lower || e.name.toLowerCase().endsWith(`.${lower}`),
  );
}

/** Lookup a specific member inside a WASM class */
export function getWasmMember(className: string, memberName: string): WasmAPIMember | undefined {
  const entry = getWasmClass(className);
  if (!entry?.members) return undefined;
  return entry.members.find(m => m.name === memberName);
}

/** Flat list of every reference URL (MDN + Bun) for validation */
export function getAllWasmUrls(): string[] {
  const urls: string[] = [];
  for (const entry of WASM_API) {
    urls.push(entry.mdnUrl, entry.bunUrl);
    if (entry.members) {
      for (const m of entry.members) {
        urls.push(m.mdnUrl, m.bunUrl);
      }
    }
  }
  // deduplicate
  return [...new Set(urls)];
}
