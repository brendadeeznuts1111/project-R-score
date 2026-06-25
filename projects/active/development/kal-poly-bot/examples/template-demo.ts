// examples/template-demo.ts - Demonstrate Bun Template API usage
import { BunTemplateAPI } from '../scripts/bun-template-api.ts';
import { surgicalPrecisionTemplate } from '../scripts/create-surgical-precision-template.ts';

async function demonstrateTemplateAPI() {
  console.info('🎯 Bun Template API Demonstration');
  console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.info('');

  // Demonstrate the exact usage pattern from the user's example
  console.info('📝 Creating template using BunTemplateAPI.scaffoldProject...');
  await BunTemplateAPI.scaffoldProject(
    surgicalPrecisionTemplate,
    {
      dir: "./demo-app",
      name: "my-demo-app",
      variant: "mcp-only"
    }
  );

  // Verify the template file was created (exact same assertion as user's example)
  const exists = await Bun.file("./demo-app/src/index.ts").exists();
  console.assert(exists, "Template file should be created");

  console.info('✅ Template creation verified!');
  console.info('');
  console.info('📁 Generated application structure:');
  console.info('   demo-app/');
  console.info('   ├── src/');
  console.info('   │   ├── index.ts');
  console.info('   │   └── mcp-init.ts');
  console.info('   ├── scripts/');
  console.info('   │   └── help.ts');
  console.info('   ├── package.json');
  console.info('   ├── README.md');
  console.info('   └── ...');
  console.info('');
  console.info('🚀 To test the generated app:');
  console.info('   cd demo-app');
  console.info('   bun install');
  console.info('   bun run help');
  console.info('   bun run dev');
  console.info('');
}

// Run if called directly
if (import.meta.main) {
  demonstrateTemplateAPI().catch(console.error);
}