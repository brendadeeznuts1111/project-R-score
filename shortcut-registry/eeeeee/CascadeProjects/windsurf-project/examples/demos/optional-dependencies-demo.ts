#!/usr/bin/env bun

// Demo of optional dependencies usage
async function runOptionalDemo() {
  console.log('🎯 Optional Dependencies Demo');
  console.log('=============================');

  // Try to import optional dependencies with graceful fallback
  let chalk: any = null;
  let figlet: any = null;
  let ora: any = null;

  try {
    chalk = await import('chalk');
    console.log('✅ Chalk (optional): Loaded successfully');
  } catch (error) {
    console.log('⚠️  Chalk (optional): Not available - using fallback');
  }

  try {
    figlet = await import('figlet');
    console.log('✅ Figlet (optional): Loaded successfully');
  } catch (error) {
    console.log('⚠️  Figlet (optional): Not available - using fallback');
  }

  try {
    ora = await import('ora');
    console.log('✅ Ora (optional): Loaded successfully');
  } catch (error) {
    console.log('⚠️  Ora (optional): Not available - using fallback');
  }

  console.log('\n🎨 Styling Demo (with fallbacks):');
  console.log('===============================');

  // Demo chalk with fallback
  if (chalk) {
    console.log(chalk?.default?.blue?.('🔵 Blue text with Chalk'));
    console.log(chalk?.default?.green?.('🟢 Green text with Chalk'));
    console.log(chalk?.default?.red?.('🔴 Red text with Chalk'));
  } else {
    console.log('🔵 Blue text (fallback)');
    console.log('🟢 Green text (fallback)');
    console.log('🔴 Red text (fallback)');
  }

  // Demo figlet with fallback
  console.log('\n🎭 ASCII Art Demo:');
  if (figlet) {
    try {
      const asciiText = figlet.textSync('BUN', { font: 'Standard' });
      console.log(asciiText);
    } catch (error) {
      console.log('BUN (fallback ASCII)');
    }
  } else {
    console.log('BUN (fallback - no figlet available)');
  }

  // Demo ora spinner with fallback
  console.log('\n⏳ Loading Demo:');
  if (ora) {
    try {
      const spinner = ora?.default?.('Loading with Ora...')?.start();
      await new Promise(resolve => setTimeout(resolve, 2000));
      spinner?.succeed('✅ Loaded successfully!');
    } catch (error) {
      console.log('⏳ Loading... (fallback)');
      setTimeout(() => console.log('✅ Loaded successfully!'), 2000);
    }
  } else {
    console.log('⏳ Loading... (fallback - no spinner)');
    setTimeout(() => console.log('✅ Loaded successfully!'), 2000);
  }

  await new Promise(resolve => setTimeout(resolve, 2100));

  console.log('\n📦 Package Configuration:');
  console.log('========================');
  
  // Read package.json to show optional dependencies
  const packageJsonText = await Bun.file('./package.json').text();
  const packageJson = JSON.parse(packageJsonText);
  
  console.log('Optional Dependencies in package.json:');
  if (packageJson.optionalDependencies) {
    Object.entries(packageJson.optionalDependencies).forEach(([name, version]) => {
      console.log(`   ${name}: ${version}`);
    });
  }

  console.log('\n🎯 Optional Dependency Benefits:');
  console.log('=================================');
  console.log('✅ Reduced bundle size - not included by default');
  console.log('✅ Graceful degradation - app works without them');
  console.log('✅ Conditional loading - import only when needed');
  console.log('✅ Flexible installation - user choice');
  console.log('✅ Development tools - CLI utilities and enhancements');

  console.log('\n🛠️ Usage Patterns:');
  console.log('==================');
  console.log('bun add package --optional           # Add optional dependency');
  console.log('bun add package --optional --exact    # Pin optional dependency');
  console.log('try { import } catch { fallback }    # Graceful error handling');
  console.log('dynamic import()                    # Load only when needed');

  console.log('\n🎉 Optional Dependencies Demo Complete!');
}

// Run the demo
runOptionalDemo().catch(console.error);
