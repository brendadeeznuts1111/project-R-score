// semver-macro-demo.ts
// Demonstrating compile-time optimization concepts with Bun
// Using Bun's built-in semver ordering

// --- Optimized comparator function (what a macro would generate) ---
// This represents the inline comparator that would be generated at compile time
const semverComparator = (a: string, b: string) => {
  // Simple semver comparison logic (what bun:semver.order would do)
  const partsA = a.split(/[-.]/).map(x => /^\d+$/.test(x) ? parseInt(x) : x);
  const partsB = b.split(/[-.]/).map(x => /^\d+$/.test(x) ? parseInt(x) : x);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const aVal = partsA[i] ?? 0;
    const bVal = partsB[i] ?? 0;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      if (aVal !== bVal) return aVal - bVal;
    } else {
      const aStr = String(aVal);
      const bStr = String(bVal);
      if (aStr !== bStr) {
        // Handle pre-release identifiers (alpha < beta < rc < release)
        const preReleaseOrder = { 'alpha': 1, 'beta': 2, 'rc': 3, '': 4 };
        const aOrder = preReleaseOrder[aStr as keyof typeof preReleaseOrder] ?? 0;
        const bOrder = preReleaseOrder[bStr as keyof typeof preReleaseOrder] ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return aStr.localeCompare(bStr);
      }
    }
  }
  return 0;
};

// --- usage ---------------------------------------------------------
const versions = [
  "2.0.0-beta.2",
  "1.0.0",
  "2.0.0-alpha.1",
  "2.0.0",
  "1.9.0"
];

// Direct inline sort with pre-compiled comparator
// In a real macro, this line would be: versions.sort(semverSort());
versions.sort(semverComparator);

console.log("→", versions);

// --- What macro expansion would generate ---
// The macro would transform: versions.sort(semverSort());
// Into: versions.sort((a,b)=>/*inline comparator logic*/);
