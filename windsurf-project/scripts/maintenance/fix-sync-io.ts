#!/usr/bin/env bun
// scripts/maintenance/fix-sync-io.ts - Empire I/O Optimizer
import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('--deyyrun');

async function processFiles(files: string[], search: RegExp, replace: string) {
  for (const file of files) {
    try {
      const content = await Bun.file(file).text();
      if (search.test(content)) {
        if (DRY_RUN) {
          console.log(`  🔍 [DRY RUN] Would fix: ${file}`);
          continue;
        }
        const newContent = content.replace(search, replace);
        await Bun.write(file, newContent);
        console.log(`  ✅ Fixed: ${file}`);
      }
    } catch (e: any) {
      console.error(`  ❌ Error processing ${file}:`, e.message);
    }
  }
}

function getFiles(pattern: string) {
  const res = Bun.spawnSync(['grep', '-rl', pattern, 'src', 'utils', 'scripts']);
  return res.stdout.toString().trim().split('\n').filter(f => f.length > 0 && (f.endsWith('.ts') || f.endsWith('.js')));
}

async function fixAll() {
  console.log('🚀 Empire I/O Optimizer: Canonicalizing to native Bun APIs...');
  if (DRY_RUN) console.log('🧪 Mode: DRY RUN - No changes will be persisted.');

  // 0. Canonicalize shell commands to Bun.$ where appropriate
  // Replace execSync(`command`) with await Bun.$`command`.text()
  const execSyncFiles = getFiles('execSync\\(');
  await processFiles(execSyncFiles, /execSync\(`(.*?)`\)/g, 'await Bun.$`$1`.text()');
  await processFiles(execSyncFiles, /execSync\('(.*?)'\)/g, "await Bun.$`$1`.text()");

  // 1. Repair common syntax errors
  const syntaxErrors = getFiles('fs\\.await Bun');
  await processFiles(syntaxErrors, /fs\.await Bun\.file/g, 'await Bun.file');
  await processFiles(syntaxErrors, /fs\.await Bun\.write/g, 'await Bun.write');
  
  const requireErrors = getFiles('require\(\'fs\'\)\.await Bun');
  await processFiles(requireErrors, /require\('fs'\)\.await Bun\.write/g, 'await Bun.write');

  // 2. Migrate Bun.randomUUIDv7() to Bun.randomUUIDv7()
  const uuidFiles = getFiles('crypto\\.randomUUID\\(\\)');
  await processFiles(uuidFiles, /crypto\.randomUUID\(\)/g, 'Bun.randomUUIDv7()');

  // 3. Migrate setTimeout/Promise wrapper to Bun.sleep()
  const timeoutFiles = getFiles('new Promise\(resolve => setTimeout\(resolve');
  await processFiles(timeoutFiles, /new Promise\(resolve => setTimeout\(resolve, (.*?)\)\)/g, 'Bun.sleep($1)');
  
  // 4. Migrate standalone setTimeout to Bun.sleep() where awaited
  const standaloneTimeoutFiles = getFiles('await setTimeout\\(');
  await processFiles(standaloneTimeoutFiles, /await setTimeout\((.*?)\)/g, 'await Bun.sleep($1)');

  // 5. Migrate hashing to Bun.hash
  const hashFiles = getFiles('crypto\\.createHash\\(\'sha256\'\\)');
  await processFiles(hashFiles, /crypto\.createHash\('sha256'\)\.update\((.*?)\)\.digest\(\)/g, 'Bun.sha256($1)');

  // 6. Migrate JSON.parse(await Bun.file().text()) to Bun.file().json()
  const jsonFiles = getFiles('JSON\\.parse\\(await Bun\\.file\\(.*?\\)\\.text\\(\\)\\)');
  await processFiles(jsonFiles, /JSON\.parse\(await Bun\.file\((.*?)\)\.text\(\)\)/g, 'await Bun.file($1).json()');

  // 7. Fix remaining Node.js I/O patterns
  const syncReadFiles = getFiles('readFileSync\\(');
  await processFiles(syncReadFiles, /readFileSync\((.*?)\)/g, 'await Bun.file($1).text()');
  
  const syncWriteFiles = getFiles('writeFileSync\\(');
  await processFiles(syncWriteFiles, /writeFileSync\((.*?), (.*?)\)/g, 'await Bun.write($1, $2)');

  // 8. Canonicalize stream-to-arrayBuffer to native Bun helpers
  // This targets legacy Node stream accumulation patterns
  const bufferConcatFiles = getFiles('Buffer\\.concat\\(');
  // Pattern: stream.on('data', c => chunks.push(c)).on('end', () => Buffer.concat(chunks))
  // Optimized: await Bun.readableStreamToArrayBuffer(stream)
  await processFiles(bufferConcatFiles, /Buffer\.concat\((.*?)\)/g, 'await Bun.readableStreamToArrayBuffer($1)');

  // 9. Clean up TypeScript keywords from `.js` files (Maintenance)
  const jsFiles = getFiles('interface |: string|: number|: any|: unknown|: void|: SystemMetrics');
  const actualJsFiles = jsFiles.filter(f => f.endsWith('.js'));
  
  for (const file of actualJsFiles) {
    try {
      let content = await Bun.file(file).text();
      let modified = false;

      const patterns = [
        { s: /interface\s+\w+\s*\{[\s\S]*?\}/g, r: '' },
        { s: /:\s*(string|number|any|unknown|boolean|void|SystemMetrics|RPATask|BatchCreationResult|AnalyticsReport|AlertRule|CostAnalysis|DuoPlusSDK|EnhancedAnalyticsManager|MonitoringDashboardManager)(\[\])?/g, r: '' },
        { s: /import\s+\{\s*type\s+.*?\s*\}\s+from\s+['"].*?['"];/g, r: '' }
      ];

      for (const p of patterns) {
        if (p.s.test(content)) {
          content = content.replace(p.s, p.r);
          modified = true;
        }
      }

      if (modified) {
        if (DRY_RUN) {
          console.log(`  🔍 [DRY RUN] Would clean TS keywords: ${file}`);
        } else {
          await Bun.write(file, content);
          console.log(`  ✅ Cleaned TS keywords: ${file}`);
        }
      }
    } catch (e: any) {
      console.error(`  ❌ Error cleaning ${file}:`, e.message);
    }
  }

  console.log('\n🎉 Canonicalization Complete!');
}

fixAll().catch(console.error);
