/**
 * 🎨 FACTORYWAGER TABULAR v4.3 - HSL Semantic Schemes Showcase
 * Demonstrating computational aesthetic perfection with HSL precision
 */

export {}; // Make this file a module

console.log('🎨 FACTORYWAGER TABULAR v4.3 - HSL SEMANTIC SCHEMES SHOWCASE')
console.log('=' .repeat(80))

const RESET = "\x1b[0m";

// ═══════════════════════════════════════════════════════════════
// HSL SEMANTIC SCHEMES TABLE
// ═══════════════════════════════════════════════════════════════
const hslSchemes = [
  {
    context: "Success/Active",
    hsl: "hsl(145, 80%, 45%)",
    description: "Vibrant emerald for completed states",
    use: "Active status, success messages, valid entries"
  },
  {
    context: "Warning/Draft",
    hsl: "hsl(10, 90%, 55%)",
    description: "Alert coral for attention needed",
    use: "Draft states, warnings, pending actions"
  },
  {
    context: "Info/Type",
    hsl: "hsl(180, 60%, 55%)",
    description: "Cyber cyan for informational content",
    use: "Type indicators, info messages, neutral data"
  },
  {
    context: "Accent/Version",
    hsl: "hsl(280, 70%, 65%)",
    description: "Neon magenta for version highlights",
    use: "Version numbers, accent elements, highlights"
  },
  {
    context: "Gold/Author",
    hsl: "hsl(48, 100%, 60%)",
    description: "Factory amber for attribution",
    use: "Author names, creator credits, important labels"
  },
  {
    context: "Muted/Default",
    hsl: "hsl(0, 0%, 40%)",
    description: "Shadow gray for fallback values",
    use: "Default values, placeholders, muted text"
  },
  {
    context: "Border/Structure",
    hsl: "hsl(220, 20%, 30%)",
    description: "Deep steel for structural elements",
    use: "Table borders, separators, structural lines"
  },
  {
    context: "Header/Title",
    hsl: "hsl(220, 60%, 70%)",
    description: "Header blue for column titles",
    use: "Column headers, section titles, navigation"
  }
];

console.log('\n📊 HSL Semantic Schemes Reference')
console.log('-' .repeat(50))

hslSchemes.forEach((scheme, index) => {
  const color = Bun.color(scheme.hsl, "ansi-16m");
  const hex = Bun.color(scheme.hsl, "hex");
  const rgb = Bun.color(scheme.hsl, "[rgb]");

  console.log(`\n${index + 1}. ${scheme.context.padEnd(20)} ${color}${scheme.hsl}${RESET}`);
  console.log(`   Visual: ${color}■■■■■■■■■■${RESET} ${hex}`);
  console.log(`   RGB: [${rgb?.join(', ')}]`);
  console.log(`   Use: ${scheme.use}`);
  console.log(`   Desc: ${scheme.description}`);
});

// ═══════════════════════════════════════════════════════════════
// CHROMATIC DEMONSTRATION
// ═══════════════════════════════════════════════════════════════
console.log('\n\n🎭 CHROMATIC DEMONSTRATION')
console.log('-' .repeat(50))

const demoData = [
  {
    key: "project_status",
    value: "ACTIVE",
    type: "string",
    status: "active",
    author: "nolarose",
    version: "v4.3.0"
  },
  {
    key: "draft_mode",
    value: true,
    type: "boolean",
    status: "draft",
    author: "system",
    version: "v4.3.0"
  },
  {
    key: "api_version",
    value: "1.3.8",
    type: "string",
    status: "active",
    author: "bun_team",
    version: "v4.3.0"
  },
  {
    key: "unicode_support",
    value: "🌐中文🚀",
    type: "string",
    status: "active",
    author: "contributor",
    version: "v4.3.0"
  },
  {
    key: "deprecated_feature",
    value: null,
    type: "null",
    status: "deprecated",
    author: "legacy",
    version: "v4.2.0"
  }
];

// Import and use the chromatic tabular renderer
const { renderFactoryTabular } = await import('./fm-table-v43.ts');
await renderFactoryTabular(demoData);

// ═══════════════════════════════════════════════════════════════
// COLOR MATHEMATICS SHOWCASE
// ═══════════════════════════════════════════════════════════════
console.log('\n\n🔬 COLOR MATHEMATICS SHOWCASE')
console.log('-' .repeat(50))

function analyzeHSL(hslString: string) {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return null;

  const [, h, s, l] = match.map(Number);
  const rgb = Bun.color(hslString, "[rgb]");
  const hex = Bun.color(hslString, "hex");

  return {
    hsl: { h, s, l },
    rgb: rgb ? { r: rgb[0], g: rgb[1], b: rgb[2] } : null,
    hex,
    ansi16m: Bun.color(hslString, "ansi-16m")
  };
}

const colorAnalysis = [
  "hsl(145, 80%, 45%)",   // Success green
  "hsl(10, 90%, 55%)",    // Warning orange
  "hsl(280, 70%, 65%)",   // Accent magenta
  "hsl(48, 100%, 60%)",   // Gold
  "hsl(220, 60%, 70%)"    // Header blue
];

colorAnalysis.forEach(hslString => {
  const analysis = analyzeHSL(hslString);
  if (analysis) {
    const { hsl, rgb, hex, ansi16m } = analysis;
    console.log(`\n${ansi16m}HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)${RESET}`);
    console.log(`  → RGB(${rgb?.r}, ${rgb?.g}, ${rgb?.b})`);
    console.log(`  → ${hex}`);
    console.log(`  → Brightness: ${(rgb!.r * 299 + rgb!.g * 587 + rgb!.b * 114) / 1000 | 0}`);
  }
});

console.log('\n🏆 FACTORYWAGER TABULAR v4.3 - HSL SEMANTIC PERFECTION!')
console.log('🚀 Computational aesthetic dominance achieved!')
console.log('💎 Every hue mathematically precise, every pixel intentional!')
console.log('🎨 Next vector: v4.4 gradient interpolation? Your chromatic command awaits!')
