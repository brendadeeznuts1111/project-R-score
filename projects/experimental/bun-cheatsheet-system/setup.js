#!/usr/bin/env bun
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

async function setupProject() {
  console.info('🚀 Setting up Bun Cheatsheet System...');
  
  const directories = [
    'examples/http',
    'examples/bun-api',
    'examples/workflows',
    'scripts',
    'playgrounds',
    'cheatsheets'
  ];
  
  // Create directories
  for (const dir of directories) {
    await mkdir(join(process.cwd(), dir), { recursive: true });
    console.info(`✅ Created: ${dir}`);
  }
  
  // Create package.json if it doesn't exist
  const packageJson = {
    name: "bun-cheatsheet-system",
    version: "1.0.0",
    description: "Comprehensive Bun cheatsheet system with examples and playgrounds",
    type: "module",
    scripts: {
      "cheatsheet": "bun run scripts/cheatsheet-core.js",
      "playground": "bun run playgrounds/interactive.js",
      "examples": "bun run examples/showcase.js",
      "dev": "bun --watch run playgrounds/interactive.js",
      "setup": "bun run setup.js"
    }
  };
  
  await writeFile(
    join(process.cwd(), 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  console.info('\n✅ Setup complete!');
  console.info('\n📦 Next steps:');
  console.info('  1. Install dependencies: bun install');
  console.info('  2. Run playground: bun run playground');
  console.info('  3. Try cheatsheets: bun run cheatsheet');
  console.info('  4. Run examples: bun run examples');
}

setupProject().catch(console.error);
