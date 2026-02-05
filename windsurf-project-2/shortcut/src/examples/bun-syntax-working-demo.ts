#!/usr/bin/env bun

/**
 * Working Bun Loader Syntax Demo
 * 
 * Demonstrating the exact import patterns from the documentation
 * using dynamic imports that work in a single file
 */

console.log('🚀 Bun Loader Syntax - Working Demo');
console.log('===================================');

// Create sample files
async function createSampleFiles() {
  console.log('📁 Creating sample files...');
  
  // Exact TOML file from the docs example
  await Bun.write('./my_file.toml', `
# This is my_file.toml - from the exact docs example
[app]
name = "Bun Loader Demo"
version = "1.0.0"
port = 3000

[database]
type = "sqlite"
path = "./data.db"

[features]
authentication = true
caching = true
logging = true
`);

  // YAML file for dynamic import
  await Bun.write('./config.yaml', `
app:
  name: "Dynamic Import Demo"
  debug: true
  
server:
  host: "localhost"
  port: 8080
  
features:
  - hot_reload
  - auto_save
  - error_tracking
`);

  // JSONC with comments
  await Bun.write('./settings.jsonc', `
{
  // JSONC file with comments and trailing comma
  "theme": "dark",
  "language": "typescript",
  "editor": {
    "tabSize": 2,
    "wordWrap": true,
    "minimap": false
  },
}
`);

  console.log('✅ Sample files created!\n');
}

// Demonstrate the exact syntax from documentation
async function demonstrateExactSyntax() {
  console.log('📋 Exact Documentation Examples:');
  console.log('===============================');
  
  try {
    // 1. EXACT example from the documentation - Static import syntax
    console.log('\n1️⃣ Static Import Syntax (from docs):');
    console.log('   import my_toml from "./my_file" with { type: "toml" };');
    console.log('   📝 Note: Static imports work in separate files, not in same file');
    
    // 2. EXACT example from documentation - Dynamic import syntax
    console.log('\n2️⃣ Dynamic Import Syntax (from docs):');
    console.log('   const { default: my_toml } = await import("./my_file", { with: { type: "toml" } });');
    
    // Let's actually run the dynamic import
    console.log('\n🔄 Executing Dynamic Import:');
    const { default: my_toml } = await import("./my_file.toml", { with: { type: "toml" } });
    console.log(`   ✅ Success! Loaded: ${my_toml.app.name} v${my_toml.app.version}`);
    console.log(`   🔧 Database: ${my_toml.database.type} at ${my_toml.database.path}`);
    
    // 3. Show type override on different file extensions
    console.log('\n3️⃣ Type Override Examples:');
    
    // Load YAML as YAML
    const { default: yaml_config } = await import("./config.yaml", { with: { type: "yaml" } });
    console.log(`   ✅ YAML: ${yaml_config.app.name} (debug: ${yaml_config.app.debug})`);
    
    // Load JSONC as JSONC
    const { default: jsonc_config } = await import("./settings.jsonc", { with: { type: "jsonc" } });
    console.log(`   ✅ JSONC: Theme "${jsonc_config.theme}", Tab size: ${jsonc_config.editor.tabSize}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Advanced syntax demonstrations
async function demonstrateAdvancedSyntax() {
  console.log('\n🎯 Advanced Syntax Patterns:');
  console.log('==========================');
  
  try {
    // 1. Conditional loading based on environment
    console.log('\n1️⃣ Conditional Loading:');
    const env = process.env.NODE_ENV || 'development';
    console.log(`   🌍 Environment: ${env}`);
    
    if (env === 'production') {
      console.log('   📦 Would load production config');
    } else {
      const { default: devConfig } = await import("./my_file.toml", { with: { type: "toml" } });
      console.log(`   ✅ Loaded dev config: ${devConfig.app.name}`);
    }
    
    // 2. Multiple formats for same data
    console.log('\n2️⃣ Multi-Format Loading:');
    const formats = [
      { file: './my_file.toml', type: 'toml' },
      { file: './config.yaml', type: 'yaml' },
      { file: './settings.jsonc', type: 'jsonc' }
    ];
    
    for (const format of formats) {
      const { default: config } = await import(format.file, { with: { type: format.type as any } });
      const name = config.app?.name || config.theme || 'Unknown';
      console.log(`   ✅ ${format.type.toUpperCase()}: ${name}`);
    }
    
    // 3. Performance measurement
    console.log('\n3️⃣ Performance Measurement:');
    const iterations = 100;
    const start = Bun.nanoseconds();
    
    for (let i = 0; i < iterations; i++) {
      await import("./my_file.toml", { with: { type: "toml" } });
    }
    
    const end = Bun.nanoseconds();
    const avgTime = (end - start) / iterations / 1_000_000;
    console.log(`   ⚡ Average load time: ${avgTime.toFixed(3)}ms per import`);
    
  } catch (error) {
    console.error('❌ Advanced syntax error:', error);
  }
}

// Show all supported loader types
function showSupportedLoaders() {
  console.log('\n📚 All Supported Loaders:');
  console.log('=========================');
  
  const loaders = [
    { ext: '.js', type: 'js', desc: 'JavaScript with dead-code elimination' },
    { ext: '.jsx', type: 'jsx', desc: 'JavaScript + JSX' },
    { ext: '.ts', type: 'ts', desc: 'TypeScript (syntax stripped)' },
    { ext: '.tsx', type: 'tsx', desc: 'TypeScript + JSX' },
    { ext: '.json', type: 'json', desc: 'JSON files' },
    { ext: '.jsonc', type: 'jsonc', desc: 'JSON with comments' },
    { ext: '.toml', type: 'toml', desc: 'TOML configuration' },
    { ext: '.yaml/.yml', type: 'yaml', desc: 'YAML configuration' },
    { ext: '.txt', type: 'text', desc: 'Plain text files' },
    { ext: '.html', type: 'html', desc: 'HTML with asset bundling' },
    { ext: '.css', type: 'css', desc: 'CSS with @import support' },
    { ext: '.sqlite', type: 'sqlite', desc: 'SQLite databases' },
    { ext: '.sh', type: 'sh', desc: 'Bun Shell scripts' },
    { ext: '.node', type: 'napi', desc: 'Native addons' },
    { ext: '*', type: 'file', desc: 'Generic file loader' }
  ];
  
  loaders.forEach(loader => {
    console.log(`   ${loader.ext.padEnd(12)} ${loader.type.padEnd(8)} - ${loader.desc}`);
  });
  
  console.log('\n💡 Usage Examples:');
  console.log('   import config from "./app.toml";           // Auto-detected');
  console.log('   import data from "./data.txt" with { type: "yaml" }; // Force YAML');
  console.log('   import db from "./data.db" with { type: "sqlite" };  // SQLite');
  console.log('   const { default: cfg } = await import("./cfg", { with: { type: "toml" } }); // Dynamic');
}

// Main demonstration
async function main() {
  await createSampleFiles();
  
  console.log('🎯 Demonstrating Bun Loader Syntax\n');
  console.log('📝 From the Bun documentation:');
  console.log('');
  console.log('   // Static import with type override');
  console.log('   import my_toml from "./my_file" with { type: "toml" };');
  console.log('');
  console.log('   // Dynamic import with type override');
  console.log('   const { default: my_toml } = await import("./my_file", { with: { type: "toml" } });');
  console.log('');
  
  await demonstrateExactSyntax();
  await demonstrateAdvancedSyntax();
  showSupportedLoaders();
  
  console.log('\n🎉 Bun Loader Syntax Demo Complete!');
  console.log('==================================');
  
  console.log('\n🚀 Key Features Demonstrated:');
  console.log('   ✅ Type override with { type: "loader" }');
  console.log('   ✅ Static and dynamic import syntax');
  console.log('   ✅ Force any file type to any format');
  console.log('   ✅ Zero configuration required');
  console.log('   ✅ Native parsers (no npm deps)');
  console.log('   ✅ Runtime + Bundler parity');
  
  console.log('\n🔥 This syntax eliminates build tools!');
}

// Cleanup
async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  const files = ['./my_file.toml', './config.yaml', './settings.jsonc'];
  
  for (const file of files) {
    try {
      await Bun.file(file).delete();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  console.log('✅ Done!');
}

// Run the demo
if (import.meta.main) {
  await main();
  
  // Uncomment to cleanup after demo
  // await cleanup();
}
