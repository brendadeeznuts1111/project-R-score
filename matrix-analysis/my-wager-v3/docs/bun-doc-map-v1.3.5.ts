// docs/bun-doc-map-v1.3.5.ts — Updated BUN_DOC_MAP with v1.3.5 features
// Tier-1380 PTY Supremacy Documentation

export const BUN_DOC_MAP_V1_3_5 = {
  // Add to BUN_DOC_MAP — v1.3.5 Native Terminal API
  "Bun.Terminal": {
    term: "Bun.Terminal",
    path: "api/terminal",
    fullUrl: "https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support",
    bunMinVersion: "1.3.5",
    stability: "stable",
    platforms: ["darwin", "linux"], // POSIX only
    securityScope: { 
      classification: "critical", 
      notes: "PTY spawn enables interactive shells, validate all input/output",
      zeroTrustEnforced: true,
      posixOnly: true
    },
    methods: ["write", "resize", "setRawMode", "ref", "unref", "close"],
    features: ["Reusable terminals", "Auto-cleanup (await using)", "Interactive program support"],
    category: "runtime"
  },
  
  "bun:bundle feature": {
    term: "bun:bundle feature",
    path: "api/bundle",
    fullUrl: "https://bun.com/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination",
    bunMinVersion: "1.3.5",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    securityScope: { classification: "medium", notes: "Dead code elimination reduces attack surface" },
    syntax: "import { feature } from 'bun:bundle'",
    useCases: ["Platform-specific builds", "A/B testing", "Paid tier features"],
    category: "bundler"
  },
  
  "Bun.stringWidth v2": {
    term: "Bun.stringWidth v2",
    path: "api/string-width",
    fullUrl: "https://bun.com/blog/bun-v1.3.5#improved-bunstringwidth-accuracy",
    bunMinVersion: "1.3.5",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    improvements: [
      "Zero-width chars (U+00AD, U+2060-U+2064)",
      "CSI/ANSI sequences (cursor movement, OSC 8 hyperlinks)",
      "Emoji grapheme clusters (flags, ZWJ, skin tones)"
    ],
    category: "runtime"
  },
  
  "Content-Disposition S3": {
    term: "Content-Disposition",
    path: "api/s3",
    fullUrl: "https://bun.com/blog/bun-v1.3.5#v8-value-type-checking-apis--content-disposition-support-for-s3-uploads--environment-variable-expansion-in-npmrc-quoted-values--bug-fixes",
    bunMinVersion: "1.3.5",
    stability: "stable",
    platforms: ["darwin", "linux", "win32"],
    securityScope: { classification: "low", notes: "Proper content headers for secure downloads" },
    syntax: "s3.write(file, data, { contentDisposition: 'attachment; filename=\"report.pdf\"' })",
    category: "runtime"
  }
};

// Integration examples
export const INTEGRATION_EXAMPLES = {
  terminal: `
// Native PTY with quantum security
const terminal = new Bun.Terminal({
  cols: 93, rows: 45,
  env: { BUN_QUANTUM_SEAL: await generateSeal() },
  data: (term, data) => scanForThreats(data)
});

const proc = Bun.spawn(['bash'], { terminal });
await proc.exited;
`,
  
  featureFlags: `
// Compile-time feature selection
import { feature } from "bun:bundle";

if (feature("QUANTUM_ENCRYPTION")) {
  // Only included in quantum builds
  await initQuantumCrypto();
}
`,
  
  stringWidth: `
// Accurate width calculation (v1.3.5)
const width = Bun.stringWidth('👨‍👩‍👧'); // 2, not 8
const padded = text.padEnd(93 - width); // Col 93 compliance
`
};

// Build configurations
export const BUILD_CONFIGS = {
  debug: {
    features: ["TIER_1380_DEBUG", "QUANTUM_ENCRYPTION", "PTY_SUPPORT"],
    command: "bun build --feature=TIER_1380_DEBUG --feature=QUANTUM_ENCRYPTION --feature=PTY_SUPPORT"
  },
  
  production: {
    features: ["QUANTUM_ENCRYPTION", "PTY_SUPPORT", "COL_93_COMPLIANCE"],
    command: "bun build --feature=QUANTUM_ENCRYPTION --feature=PTY_SUPPORT --feature=COL_93_COMPLIANCE"
  },
  
  minimal: {
    features: ["PTY_SUPPORT"],
    command: "bun build --feature=PTY_SUPPORT"
  }
};
