#!/usr/bin/env bun
/**
 * check-env-defaults.ts — verify Bun.env.* calls have proper fallbacks or SSOT defaults.
 * Prevents runtime crashes from missing env vars.
 *
 *   bun run scripts/check-env-defaults.ts
 */
import { Glob } from 'bun';

const ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', '.cache', 'bun.lock', '__snapshots__'];
const IGNORE_PATTERNS = [/\.test\./, /\.spec\./, /\.bench\./, /\.d\.ts$/, /fixtures\//, /__tests__\//];
const DRY_RUN = Bun.argv.includes('--dry-run') || Bun.argv.includes('--dry');

// Patterns that are safe: Bun.env.FOO || 'default' or Bun.env.FOO ?? 'default'
const SAFE_RE = /\bBun\.env\.([A-Z_][A-Z0-9_]*)/
const HAS_FALLBACK_RE = /\|\| ['"`]|\?\? ['"`]/
const HAS_SSOT_RE = /CLOUDFLARE_DEFAULTS|R2_CONFIG|DEFAULT_/

const glob = new Glob('**/*.ts');
const issues: string[] = [];

for await (const file of glob.scan({ cwd: ROOT, absolute: true })) {
  if (IGNORE_DIRS.some(d => file.includes(`/${d}/`))) continue;
  if (IGNORE_PATTERNS.some(p => p.test(file))) continue;
  const text = await Bun.file(file).text();
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(SAFE_RE);
    if (!match) continue;
    
    const envVar = match[1];
    // Skip known SSOT config vars
    if (envVar.startsWith('NODE_') || envVar === 'HOME' || envVar === 'PATH' || envVar === 'PORT' || envVar === 'HOSTNAME') continue;
    
    // Check same line for fallback
    if (HAS_FALLBACK_RE.test(line)) continue;
    
    // Check for SSOT reference
    if (HAS_SSOT_RE.test(line)) continue;
    
    issues.push(`${file}:${i + 1}: Bun.env.${envVar} without explicit fallback`);
  }
}

if (issues.length > 20) {
  console.error(`❌ ${issues.length} env var(s) without fallbacks (showing first 20):`);
  for (const issue of issues.slice(0, 20)) console.error(`  ${issue}`);
  console.error(`  ... and ${issues.length - 20} more`);
  if (!DRY_RUN) process.exit(1);
} else if (issues.length > 0) {
  console.error(`❌ ${issues.length} env var(s) without fallbacks:`);
  for (const issue of issues) console.error(`  ${issue}`);
  if (!DRY_RUN) process.exit(1);
} else {
  console.log('✅ All Bun.env.* calls have fallbacks or SSOT defaults');
}
