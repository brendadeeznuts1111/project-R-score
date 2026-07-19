#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.file
// tools/working-import-tracker.ts — Bun plugin for import tracking with logging

import { plugin } from 'bun';

plugin({
  name: 'working import tracker',
  setup(build) {
    const transpiler = new Bun.Transpiler();
    const trackedImports: Record<string, number> = {};
    let processedFiles = 0;

    // Track all TypeScript and JavaScript files
    build.onLoad({ filter: /\.(ts|js)$/ }, async ({ path }) => {
      console.info(`🔍 Processing: ${path}`);
      processedFiles++;

      try {
        const contents = await Bun.file(path).text();
        const imports = transpiler.scanImports(new TextEncoder().encode(contents));

        for (const importInfo of imports) {
          const importPath = importInfo.path;
          trackedImports[importPath] = (trackedImports[importPath] || 0) + 1;
          console.info(`   📦 ${importPath}`);
        }

        if (imports.length === 0) {
          console.info(`   (no imports)`);
        }
      } catch (error) {
        console.info(`❌ Error: ${error.message}`);
      }

      // Return undefined to let Bun handle the file normally
      return undefined;
    });

    // Generate stats when requested - this uses defer()
    build.onLoad({ filter: /generate-stats\.ts$/ }, async ({ defer }) => {
      console.info(`📊 Stats requested - waiting for ${processedFiles} files to complete...`);

      // CRITICAL: Wait for all other modules to be loaded first
      await defer();

      console.info(`✅ All files processed! Generating final statistics...`);
      console.info(`📋 Total unique imports tracked: ${Object.keys(trackedImports).length}`);

      const statsContent = `
// Generated Import Statistics
// Total files processed: ${processedFiles}
// Total unique imports: ${Object.keys(trackedImports).length}

const importStats = ${JSON.stringify(trackedImports, null, 2)};

console.info('🎯 IMPORT ANALYSIS REPORT');
console.info('='.repeat(50));
console.info(\`Files processed: \${importStats._filesProcessed || ${processedFiles}}\`);
console.info(\`Unique imports: \${Object.keys(importStats).length}\`);
console.info('');
console.info('📊 Import Frequency:');
Object.entries(importStats).forEach(([path, count]) => {
  console.info(\`  \${path}: \${count} time\${count === 1 ? '' : 's'}\`);
});

export default importStats;
      `;

      return {
        contents: statsContent,
        loader: 'ts',
      };
    });
  },
});
