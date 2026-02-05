// bench/bench-deep-equals.ts
// Benchmark Bun's native Bun.deepEquals vs custom JS implementation

function manualDeepEquals(a: any, b: any, strict: boolean = false): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (strict) {
    if (keysA.length !== keysB.length) return false;
    // Check prototypes in strict mode
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  } else {
    // In non-strict mode, we filter out undefined values to match Bun.deepEquals behavior
    const filteredA = keysA.filter(k => a[k] !== undefined);
    const filteredB = keysB.filter(k => b[k] !== undefined);
    if (filteredA.length !== filteredB.length) return false;
  }

  for (const key of keysA) {
    if (a[key] === undefined && !strict) continue;
    if (!(key in b) || !manualDeepEquals(a[key], b[key], strict)) return false;
  }
  return true;
}

async function runBench() {
  const iterations = 10000;
  const objA = {
    id: 1,
    name: "Test Object",
    metadata: {
      tags: ["apple", "r2", "bench"],
      nested: {
        active: true,
        score: 42
      }
    }
  };
  const objB = JSON.parse(JSON.stringify(objA));

  console.log(`🚀 Benchmarking Deep Equality (Strict vs Normal) - ${iterations.toLocaleString()} iterations...`);

  // 1. Manual JS Implementation
  const startManual = performance.now();
  for (let i = 0; i < iterations; i++) {
    manualDeepEquals(objA, objB, false);
  }
  const endManual = performance.now();
  const timeManual = endManual - startManual;

  // 2. Native Bun.deepEquals
  const startNative = performance.now();
  for (let i = 0; i < iterations; i++) {
    // @ts-ignore
    Bun.deepEquals(objA, objB, false);
  }
  const endNative = performance.now();
  const timeNative = endNative - startNative;

  const speedup = ((timeManual / timeNative)).toFixed(1);

  console.log(`\n--- Results ---`);
  console.log(`Manual JS: ${((timeManual * 1000) / iterations).toFixed(2)}μs per call`);
  console.log(`Bun.deepEquals: ${((timeNative * 1000) / iterations).toFixed(2)}μs per call`);
  console.log(`Native Speedup: ${speedup}x faster 🚀`);

  console.log(`\n✅ Verified Exact Scenarios:`);
  const a = { entries: [1, 2] };
  const b = { entries: [1, 2], extra: undefined };

  // @ts-ignore
  const normalRes = Bun.deepEquals(a, b);
  // @ts-ignore
  const strictRes = Bun.deepEquals(a, b, true);

  console.log(`  Bun.deepEquals(a, b)       => ${normalRes} (Expected: true)`);
  console.log(`  Bun.deepEquals(a, b, true) => ${strictRes} (Expected: false)`);

  if (normalRes === true && strictRes === false) {
    console.log(`\n🎯 STRICT_MODE logic verified successfully.`);
  }
}

runBench();
