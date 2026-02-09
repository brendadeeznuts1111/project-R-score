// proof-fabricated-apis.ts — Runtime proof that claimed APIs don't exist
// Run: bun run /tmp/proof-fabricated-apis.ts

let pass = 0;
let fail = 0;

function prove(label: string, fn: () => boolean) {
  const result = fn();
  console.log(`[${result ? "PROVED" : "WRONG"}] ${label}`);
  result ? pass++ : fail++;
}

// === 1. regex.jitCompiled does NOT exist ===
prove("RegExp has no .jitCompiled property", () => {
  const r = /(?:abc){3}/;
  return !("jitCompiled" in r);
});

prove("RegExp.prototype has no .jitCompiled", () => {
  return !("jitCompiled" in RegExp.prototype);
});

prove("typeof regex.jitCompiled === 'undefined'", () => {
  const r = /(?:abc){3}/;
  return typeof (r as any).jitCompiled === "undefined";
});

// === 2. regex.jitStatus does NOT exist ===
prove("RegExp has no .jitStatus property", () => {
  const r = /(?:abc){3}/;
  return !("jitStatus" in r);
});

// === 3. mock(obj, method) does NOT work — mock() takes a function ===
prove("mock() with 2 args throws or returns wrong type", () => {
  const { mock } = require("bun:test");
  try {
    const m = mock(Date, "now");
    // If it didn't throw, check if it has mockReturnValue (it won't — mock wraps arg1 as a function)
    return typeof m?.mockReturnValue !== "function" || typeof m !== "function";
  } catch {
    return true; // threw = proved
  }
});

// === 4. Bun.spawn rejects { cmd: [...] } object form ===
prove("Bun.spawn({ cmd: [...] }) throws", () => {
  try {
    // @ts-ignore
    Bun.spawn({ cmd: ["echo", "test"] });
    return false; // didn't throw = disproved
  } catch {
    return true;
  }
});

// === 5. Bun.spawn({ shell: true }) — shell is not a spawn option ===
prove("Bun.spawn does not accept shell: true option", () => {
  try {
    // @ts-ignore
    Bun.spawn({ cmd: ["echo", "test"], shell: true });
    return false;
  } catch {
    return true;
  }
});

console.log(`\n${pass}/${pass + fail} claims proved`);
if (fail > 0) process.exit(1);
