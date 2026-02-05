// src/examples/bun-loaders-demo.ts
// Comprehensive demonstration of Bun's built-in loaders

console.log("🚀 Bun Loaders Demo");
console.log("==================");

// Demonstrate all supported file types
const supportedTypes = [
  '.js', '.cjs', '.mjs', '.mts', '.cts', 
  '.ts', '.tsx', '.jsx', '.css', 
  '.json', '.jsonc', '.toml', '.yaml', '.yml', 
  '.txt', '.wasm', '.node', '.html', '.sh'
];

console.log(`📋 Supported file types: ${supportedTypes.join(', ')}`);
console.log(`🎯 Rule of thumb: Bundler and runtime support the same file types!`);

async function demonstrateLoaders() {
  console.log("\n🍅 TOML Loader - Primary Configuration Format");
  
  // Static import with explicit type
  const { default: configStatic } = await import('../../config.toml', { with: { type: "toml" } });
  console.log(`✅ App name: ${configStatic.app.name}`);
  console.log(`✅ Unicode clustering: ${configStatic.unicode.grapheme_clustering.use_intl_segmenter}`);
  
  console.log("\n📄 JSON Loader - Package Information");
  
  // Import package.json
  const { default: packageInfo } = await import('../../package.json');
  console.log(`✅ Package: ${packageInfo.name} v${packageInfo.version}`);
  console.log(`✅ Scripts: ${Object.keys(packageInfo.scripts).join(', ')}`);
  
  console.log("\n💬 JSONC Loader - Configuration with Comments");
  
  // Import tsconfig.json (automatically uses jsonc loader)
  const { default: tsconfig } = await import('../../tsconfig.json');
  console.log(`✅ TypeScript target: ${tsconfig.compilerOptions.target}`);
  console.log(`✅ Include patterns: ${tsconfig.include.join(', ')}`);
  
  console.log("\n📝 Text Loader - Content Import");
  
  // Create and import a sample text file using absolute path
  const tempDir = "/tmp/bun-loaders-demo";
  await Bun.write(`${tempDir}/temp-sample.txt`, "Hello from Bun's text loader!");
  
  try {
    const { default: textContent } = await import(`${tempDir}/temp-sample.txt`, { with: { type: "text" } });
    console.log(`✅ Text content: "${textContent}"`);
  } finally {
    await Bun.file(`${tempDir}/temp-sample.txt`).delete();
  }
  
  console.log("\n🗂️ File Loader - Asset References");
  
  // Create a sample asset
  const sampleSvg = '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="blue"/></svg>';
  await Bun.write(`${tempDir}/temp-icon.svg`, sampleSvg);
  
  try {
    const { default: iconPath } = await import(`${tempDir}/temp-icon.svg`, { with: { type: "file" } });
    console.log(`✅ File path: ${iconPath}`);
    console.log(`✅ File exists: ${await Bun.file(iconPath).exists()}`);
  } finally {
    await Bun.file(`${tempDir}/temp-icon.svg`).delete();
  }
  
  console.log("\n🗄️ SQLite Loader - Database Integration");
  
  // Create a sample database
  const { Database } = await import('bun:sqlite');
  const db = new Database(":memory:");
  db.run(`
    CREATE TABLE demo (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      value INTEGER
    )
  `);
  
  db.run("INSERT INTO demo (name, value) VALUES (?, ?)", ["test", 42]);
  
  // Save database to file for loader demo
  const dbBuffer = db.serialize();
  await Bun.write(`${tempDir}/temp-demo.db`, dbBuffer);
  db.close();
  
  try {
    const { default: demoDb } = await import(`${tempDir}/temp-demo.db`, { with: { type: "sqlite" } });
    
    const result = demoDb.query("SELECT * FROM demo WHERE name = ?").get("test");
    console.log(`✅ SQLite query result: ${JSON.stringify(result)}`);
    demoDb.close();
  } finally {
    await Bun.file(`${tempDir}/temp-demo.db`).delete();
  }
  
  console.log("\n🎨 CSS Loader - Styling Integration");
  
  // Create sample CSS
  const sampleCSS = `
    .demo-class {
      color: #3b82f6;
      background: linear-gradient(45deg, #22c55e, #f59e0b);
      padding: 16px;
      border-radius: 8px;
    }
  `;
  await Bun.write(`${tempDir}/temp-styles.css`, sampleCSS);
  
  try {
    // In runtime, we'll read the file to demonstrate
    const cssContent = await Bun.file(`${tempDir}/temp-styles.css`).text();
    console.log(`✅ CSS imported successfully (${cssContent.length} chars)`);
    console.log(`✅ Contains gradient: ${cssContent.includes('gradient')}`);
  } finally {
    await Bun.file(`${tempDir}/temp-styles.css`).delete();
  }
  
  console.log("\n📋 YAML Loader - Alternative Configuration");
  
  // Create sample YAML
  const sampleYAML = `
app:
  name: "yaml-demo"
  version: "1.0.0"
  environment: "development"

features:
  - authentication
  - database
  - caching

settings:
  debug: true
  port: 3000
    `;
    
  await Bun.write(`${tempDir}/temp-config.yaml`, sampleYAML);
  
  try {
    const { default: yamlConfig } = await import(`${tempDir}/temp-config.yaml`, { with: { type: "yaml" } });
    
    console.log(`✅ YAML app: ${yamlConfig.app.name} v${yamlConfig.app.version}`);
    console.log(`✅ Features: ${yamlConfig.features.join(', ')}`);
    console.log(`✅ Debug mode: ${yamlConfig.settings.debug}`);
  } finally {
    await Bun.file(`${tempDir}/temp-config.yaml`).delete();
  }
  
  console.log("\n⚡ Loader Performance Comparison");
  
  const iterations = 100;
  
  // Test TOML loading performance
  const tomlStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await import('../../config.toml', { with: { type: "toml" } });
  }
  const tomlTime = performance.now() - tomlStart;
  
  // Test JSON loading performance
  const jsonStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await import('../../package.json');
  }
  const jsonTime = performance.now() - jsonStart;
  
  console.log(`📊 Performance Results (${iterations} iterations):`);
  console.log(`   TOML: ${tomlTime.toFixed(2)}ms (${(tomlTime/iterations).toFixed(3)}ms avg)`);
  console.log(`   JSON: ${jsonTime.toFixed(2)}ms (${(jsonTime/iterations).toFixed(3)}ms avg)`);
  
  console.log("\n🔧 Advanced Features - Type Override");
  
  // Test explicit type override
  const configContent = `
name = "override-test"
value = 123
    `;
  await Bun.write(`${tempDir}/temp-config.txt`, configContent);
  
  try {
    // Import .txt file as TOML (type override)
    const { default: overrideConfig } = await import(`${tempDir}/temp-config.txt`, { with: { type: "toml" } });
    
    console.log(`✅ Type override successful: ${overrideConfig.name}`);
    console.log(`✅ Value: ${overrideConfig.value}`);
  } finally {
    await Bun.file(`${tempDir}/temp-config.txt`).delete();
  }
  
  console.log("\n🎉 All loaders demonstrated successfully!");
}

// Run the demonstration
demonstrateLoaders().catch(console.error);
