/**
 * WebAssembly.Table Integration for High-Performance Operations
 * 
 * Uses Bun's WebAssembly.Table support for:
 * - Dynamic function dispatch within WASM modules
 * - Hot-swappable computation modules
 * - Table length management and growth
 * 
 * @see https://bun.sh/reference/bun/WebAssembly/Table/length
 * @see https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/Table
 */

import { getBrandColor } from '../config/domain';

// ANSI colors for CLI output
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/** Hook function type for compute operations */
export type ComputeHook = (input: number[]) => number;

/** WASM Table configuration */
export interface TableConfig {
  /** Initial table size */
  initial: number;
  /** Maximum table size (optional) */
  maximum?: number;
  /** Element type - must be 'funcref' for function tables (Bun/WebAssembly spec) */
  element: 'funcref';
}

/** Hook registry entry */
export interface HookEntry {
  name: string;
  description: string;
  fn: ComputeHook;
  isWASM: boolean;
}

/** Compute hook registry */
export type HookRegistry = Map<number, HookEntry>;

/**
 * WebAssembly Table Manager for dynamic computation hooks
 * 
 * Note: WebAssembly.Table can only store WebAssembly functions, not JS functions.
 * This class manages both JS hooks (in registry) and WASM hooks (in table).
 */
export class WASMMachine {
  private table: WebAssembly.Table;
  private registry: HookRegistry = new Map();
  private wasmModule?: WebAssembly.WebAssemblyInstantiatedSource;
  private initialized = false;
  private nextIndex = 0;

  constructor(config: TableConfig = { initial: 16, element: 'funcref' }) {
    this.table = new WebAssembly.Table(config);
  }

  /**
   * Get current table length
   * @see https://bun.sh/reference/bun/WebAssembly/Table/length
   */
  get length(): number {
    return this.table.length;
  }

  /**
   * Grow the table by delta elements
   * Returns the previous length
   */
  grow(delta: number): number {
    const previous = this.table.grow(delta);
    console.log(`${ANSI.green}↗${ANSI.reset} Table grown: ${previous} → ${this.length}`);
    return previous;
  }

  /**
   * Register a JavaScript computation hook
   * JS hooks are stored in registry, not WASM table
   */
  registerHook(
    name: string,
    fn: ComputeHook,
    description: string = ''
  ): number {
    const index = this.nextIndex++;
    
    this.registry.set(index, { 
      name, 
      fn, 
      description,
      isWASM: false 
    });

    return index;
  }

  /**
   * Register a WASM function in the table
   * This is the actual WebAssembly.Table.set() usage
   */
  registerWASMFunction(
    index: number,
    wasmFn: WebAssembly.Function,
    name: string,
    description: string = ''
  ): void {
    if (index < 0 || index >= this.table.length) {
      throw new RangeError(
        `Index ${index} out of bounds (table length: ${this.table.length})`
      );
    }

    // Set in WASM table - only works with actual WASM functions
    this.table.set(index, wasmFn);

    // Register metadata
    this.registry.set(index, { 
      name, 
      fn: wasmFn as unknown as ComputeHook,
      description,
      isWASM: true 
    });
  }

  /**
   * Get hook at index
   */
  getHook(index: number): HookEntry | undefined {
    return this.registry.get(index);
  }

  /**
   * Execute hook by index
   */
  execute(index: number, input: number[]): number {
    const hook = this.registry.get(index);
    if (!hook) {
      throw new Error(`No hook registered at index ${index}`);
    }
    return hook.fn(input);
  }

  /**
   * Hot-swap a JS hook at runtime
   */
  hotSwap(index: number, newFn: ComputeHook, reason?: string): void {
    const hook = this.registry.get(index);
    if (!hook) {
      throw new Error(`No hook at index ${index} to swap`);
    }

    if (hook.isWASM) {
      throw new Error(`Cannot hot-swap WASM functions (index ${index})`);
    }

    const oldName = hook.name;
    hook.fn = newFn;

    console.log(
      `${ANSI.yellow}⚡ Hot-swap${ANSI.reset} [${index}]: ${oldName} → ${reason || 'updated'}`
    );
  }

  /**
   * Load WASM module and populate table
   * Demonstrates actual WebAssembly.Table.set() usage
   */
  async loadWASM(wasmBuffer: Uint8Array, importObject?: WebAssembly.Imports): Promise<void> {
    // Compile and instantiate with table import
    this.wasmModule = await WebAssembly.instantiate(wasmBuffer, {
      env: { 
        table: this.table,
        memory: new WebAssembly.Memory({ initial: 256 }),
        ...importObject?.env,
      },
      ...importObject,
    });

    const exports = this.wasmModule.instance.exports;
    let wasmCount = 0;

    // Register WASM functions to table
    for (const [name, value] of Object.entries(exports)) {
      if (typeof value === 'function') {
        const index = this.nextIndex++;
        this.registerWASMFunction(
          index,
          value as WebAssembly.Function,
          name,
          `WASM: ${name}`
        );
        wasmCount++;
      }
    }

    this.initialized = true;
    console.log(`${ANSI.green}✓${ANSI.reset} WASM loaded: ${wasmCount} functions → table`);
  }

  /**
   * Create a simple WASM module for testing
   * This demonstrates table usage without external WASM files
   */
  async loadTestWASM(): Promise<void> {
    // Simple WASM that exports a function and uses call_indirect
    // (f64, f64) -> f64 add function
    const wasmBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic
      0x01, 0x00, 0x00, 0x00, // version
      // Type section
      0x01, 0x07, 0x01,       // section id=1, size=7, 1 type
      0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // (i32, i32) -> i32
      // Function section
      0x03, 0x02, 0x01, 0x00, // section id=3, size=2, 1 func, type 0
      // Table section
      0x04, 0x04, 0x01, 0x70, 0x00, 0x01, // section id=4, funcref table, min=1
      // Export section
      0x07, 0x08, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, // export "add" at index 0
      // Code section
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b, // local.get 0, local.get 1, i32.add, end
    ]);

    await this.loadWASM(wasmBytes);
  }

  /**
   * Get table contents info
   */
  getTableInfo(): { index: number; entry: HookEntry | null }[] {
    const info: { index: number; entry: HookEntry | null }[] = [];
    
    for (let i = 0; i < this.table.length; i++) {
      const fn = this.table.get(i);
      const entry = this.registry.get(i);
      
      if (fn || entry) {
        info.push({ index: i, entry: entry || null });
      }
    }
    
    return info;
  }

  /**
   * Print table status
   */
  printStatus(): void {
    console.log(`\n${ANSI.bold}WebAssembly.Table Status${ANSI.reset}`);
    console.log(`  Table length: ${this.length}`);
    console.log(`  Registry size: ${this.registry.size}`);
    console.log(`  Initialized: ${this.initialized ? 'Yes' : 'No'}`);
    
    if (this.registry.size > 0) {
      console.log(`\n${ANSI.dim}Registered Functions:${ANSI.reset}`);
      
      for (const [index, entry] of this.registry) {
        const icon = entry.isWASM ? '⚡ WASM' : '📦 JS  ';
        const type = entry.isWASM ? ANSI.cyan : ANSI.yellow;
        console.log(`  ${icon} [${index}] ${type}${entry.name}${ANSI.reset}`);
        if (entry.description) {
          console.log(`      ${ANSI.dim}${entry.description}${ANSI.reset}`);
        }
      }
    }
    console.log();
  }
}

/**
 * Pre-defined compute hooks for secrets field operations
 */
export const DefaultHooks = {
  /** Risk score calculation */
  riskScore: (input: number[]): number => {
    const [exposure, age, accessCount] = input;
    return (exposure * 0.4 + age * 0.3 + accessCount * 0.3) * 100;
  },

  /** Entropy calculation (Shannon entropy) */
  entropy: (input: number[]): number => {
    const sum = input.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    
    return -input.reduce((acc, val) => {
      if (val === 0) return acc;
      const p = val / sum;
      return acc + p * Math.log2(p);
    }, 0);
  },

  /** Field normalization */
  normalize: (input: number[]): number => {
    const max = Math.max(...input);
    const min = Math.min(...input);
    const avg = input.reduce((a, b) => a + b, 0) / input.length;
    return (avg - min) / (max - min || 1);
  },

  /** Anomaly detection (z-score) */
  anomaly: (input: number[]): number => {
    const mean = input.reduce((a, b) => a + b, 0) / input.length;
    const variance = input.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / input.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (input[input.length - 1] - mean) / stdDev;
  },

  /** Vector magnitude */
  magnitude: (input: number[]): number => {
    return Math.sqrt(input.reduce((acc, val) => acc + val * val, 0));
  },
};

/**
 * Initialize default compute machine with JS hooks
 */
export function createDefaultMachine(): WASMMachine {
  const machine = new WASMMachine({ initial: 8, element: 'funcref' });

  machine.registerHook('riskScore', DefaultHooks.riskScore, 'Calculate risk score');
  machine.registerHook('entropy', DefaultHooks.entropy, 'Shannon entropy');
  machine.registerHook('normalize', DefaultHooks.normalize, 'Normalize to 0-1');
  machine.registerHook('anomaly', DefaultHooks.anomaly, 'Z-score anomaly');
  machine.registerHook('magnitude', DefaultHooks.magnitude, 'Vector magnitude');

  return machine;
}

/**
 * Demo function showing WASM Table usage
 */
export async function demoWASMTable(): Promise<void> {
  console.log(`\n${ANSI.bold}${ANSI.blue}🏰 WebAssembly.Table Demo${ANSI.reset}\n`);

  const machine = createDefaultMachine();
  machine.printStatus();

  // Demo computations
  console.log(`${ANSI.bold}Compute Examples:${ANSI.reset}`);

  // Risk score
  const riskInput = [7.5, 30, 1000];
  const risk = machine.execute(0, riskInput);
  console.log(`  Risk Score: ${risk.toFixed(2)}`);

  // Entropy
  const entropyInput = [0.1, 0.2, 0.3, 0.4];
  const entropy = machine.execute(1, entropyInput);
  console.log(`  Entropy: ${entropy.toFixed(4)} bits`);

  // Magnitude (3-4-5 triangle)
  const magInput = [3, 4];
  const magnitude = machine.execute(4, magInput);
  console.log(`  Magnitude: ${magnitude.toFixed(2)}`);

  // Hot-swap demo
  console.log(`\n${ANSI.bold}Hot-swap Demo:${ANSI.reset}`);
  machine.hotSwap(0, (input: number[]): number => {
    const [exposure, age, accessCount] = input;
    return (exposure * 0.5 + age * 0.2 + accessCount * 0.3) * 100;
  }, 'improved v2');

  const newRisk = machine.execute(0, riskInput);
  console.log(`  New Risk Score: ${newRisk.toFixed(2)}`);

  // Table growth demo
  console.log(`\n${ANSI.bold}Table Growth:${ANSI.reset}`);
  machine.grow(8);
  machine.printStatus();

  // Test WASM loading (optional)
  try {
    console.log(`${ANSI.bold}Loading Test WASM:${ANSI.reset}`);
    await machine.loadTestWASM();
    
    // Try calling WASM function
    const wasmHook = machine.getHook(5);
    if (wasmHook?.isWASM) {
      console.log(`  WASM function "${wasmHook.name}" loaded at index 5`);
    }
  } catch (e) {
    console.log(`  ${ANSI.dim}WASM test skipped: ${(e as Error).message}${ANSI.reset}`);
  }

  console.log(`\n${ANSI.green}✓${ANSI.reset} Demo complete!`);
  console.log(`\n${ANSI.dim}Table.length: ${machine.length}${ANSI.reset}\n`);
}

// Run demo if executed directly
if (import.meta.main) {
  demoWASMTable();
}
