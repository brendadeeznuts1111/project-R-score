/**
 * Dead Code Elimination (DCE) Annotations Demo
 * 
 * This script demonstrates Bun's tree-shaking annotations.
 * While `bun run` executes code directly, these annotations are critical 
 * when bundling code with `bun build` to remove unused code.
 * 
 * Important Annotations:
 * - @__PURE__: Tells bundler the function is side-effect-free.
 * - @__DEAD__: Tells bundler the function call can be removed.
 */

// 1. Pure Function (No Side Effects)
// Bun can safely remove this if unused.
function add(a: number, b: number): number {
  return a + b;
}

// 2. Impure Function (Has Side Effects)
// Bun will NOT remove this if used, as it touches external state.
let counter = 0;
function incrementCounter() {
  counter++;
}

console.log("--- DCE Annotations Demo ---");

// Calling functions to verify they exist
console.log(`add(1, 2) = ${add(1, 2)}`);
incrementCounter();
console.log(`counter = ${counter}`);

// Note: To see the effect of these annotations, run:
// bun build ./dce-demo.ts --outdir ./out --analyze
// or bundle this file and check the output.
