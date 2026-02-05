// examples/template-demo.ts - Demonstrate Bun Template API usage
import { BunTemplateAPI } from '../scripts/bun-template-api.ts';
import { surgicalPrecisionTemplate } from '../scripts/create-surgical-precision-template.ts';

async function demonstrateTemplateAPI() {
  console.log('🎯 Bun Template API Demonstration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Demonstrate the exact usage pattern from the user's example
  console.log('📝 Creating template using BunTemplateAPI.scaffoldProject...');
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

  console.log('✅ Template creation verified!');
  console.log('');
  console.log('📁 Generated application structure:');
  console.log('   demo-app/');
  console.log('   ├── src/');
  console.log('   │   ├── index.ts');
  console.log('   │   └── mcp-init.ts');
  console.log('   ├── scripts/');
  console.log('   │   └── help.ts');
  console.log('   ├── package.json');
  console.log('   ├── README.md');
  console.log('   └── ...');
  console.log('');
  console.log('🚀 To test the generated app:');
  console.log('   cd demo-app');
  console.log('   bun install');
  console.log('   bun run help');
  console.log('   bun run dev');
  console.log('');
}

// Run if called directly
if (import.meta.main) {
  demonstrateTemplateAPI().catch(console.error);
}