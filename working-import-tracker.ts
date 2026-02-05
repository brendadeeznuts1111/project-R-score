import { plugin } from "bun";
import { logger } from "./lib/utils/logger.ts";

plugin({
  name: "working import tracker",
  setup(build) {
    const transpiler = new Bun.Transpiler();
    const trackedImports: Record<string, number> = {};
    let processedFiles = 0;

    // Track all TypeScript and JavaScript files
    build.onLoad({ filter: /\.(ts|js)$/ }, async ({ path }) => {
      logger.info(`🔍 Processing: ${path}`);
      processedFiles++;
      
      try {
        const contents = await Bun.file(path).text();
        const imports = transpiler.scanImports(new TextEncoder().encode(contents));

        for (const importInfo of imports) {
          const importPath = importInfo.path;
          trackedImports[importPath] = (trackedImports[importPath] || 0) + 1;
          logger.info(`   📦 ${importPath}`);
        }

        if (imports.length === 0) {
          logger.info(`   (no imports)`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error(`❌ Error: ${errorMessage}`);
      }

      // Return undefined to let Bun handle the file normally
      return undefined;
    });

    // Generate stats when requested - this uses defer()
    build.onLoad({ filter: /generate-stats\.ts$/ }, async ({ defer }) => {
      logger.info(`📊 Stats requested - waiting for ${processedFiles} files to complete...`);
      
      // CRITICAL: Wait for all other modules to be loaded first
      await defer();
      
      logger.info(`✅ All files processed! Generating final statistics...`);
      logger.info(`📋 Total unique imports tracked: ${Object.keys(trackedImports).length}`);

      const statsContent = `
// Generated Import Statistics
// Total files processed: ${processedFiles}
// Total unique imports: ${Object.keys(trackedImports).length}

const importStats = ${JSON.stringify(trackedImports, null, 2)};

console.log('🎯 IMPORT ANALYSIS REPORT');
console.log('='.repeat(50));
console.log(\`Files processed: \${importStats._filesProcessed || ${processedFiles}}\`);
console.log(\`Unique imports: \${Object.keys(importStats).length}\`);
console.log('');
console.log('📊 Import Frequency:');
Object.entries(importStats).forEach(([path, count]) => {
  console.log(\`  \${path}: \${count} time\${count === 1 ? '' : 's'}\`);
});

export default importStats;
      `;

      return {
        contents: statsContent,
        loader: "ts",
      };
    });
  },
});
