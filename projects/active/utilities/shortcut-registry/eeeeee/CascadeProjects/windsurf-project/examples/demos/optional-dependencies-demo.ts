#!/usr/bin/env bun

// Demo of optional dependencies usage
async function runOptionalDemo() {
  console.info('🎯 Optional Dependencies Demo');
  console.info('=============================');

  // Try to import optional dependencies with graceful fallback
  let chalk: any = null;
  let figlet: any = null;
  let ora: any = null;

  try {
    chalk = await import('chalk');
    console.info('✅ Chalk (optional): Loaded successfully');
  } catch (error) {
    console.info('⚠️  Chalk (optional): Not available - using fallback');
  }

  try {
    figlet = await import('figlet');
    console.info('✅ Figlet (optional): Loaded successfully');
  } catch (error) {
    console.info('⚠️  Figlet (optional): Not available - using fallback');
  }

  try {
    ora = await import('ora');
    console.info('✅ Ora (optional): Loaded successfully');
  } catch (error) {
    console.info('⚠️  Ora (optional): Not available - using fallback');
  }

  console.info('\n🎨 Styling Demo (with fallbacks):');
  console.info('===============================');

  // Demo chalk with fallback
  if (chalk) {
    console.info(chalk?.default?.blue?.('🔵 Blue text with Chalk'));
    console.info(chalk?.default?.green?.('🟢 Green text with Chalk'));
    console.info(chalk?.default?.red?.('🔴 Red text with Chalk'));
  } else {
    console.info('🔵 Blue text (fallback)');
    console.info('🟢 Green text (fallback)');
    console.info('🔴 Red text (fallback)');
  }

  // Demo figlet with fallback
  console.info('\n🎭 ASCII Art Demo:');
  if (figlet) {
    try {
      const asciiText = figlet.textSync('BUN', { font: 'Standard' });
      console.info(asciiText);
    } catch (error) {
      console.info('BUN (fallback ASCII)');
    }
  } else {
    console.info('BUN (fallback - no figlet available)');
  }

  // Demo ora spinner with fallback
  console.info('\n⏳ Loading Demo:');
  if (ora) {
    try {
      const spinner = ora?.default?.('Loading with Ora...')?.start();
      await new Promise(resolve => setTimeout(resolve, 2000));
      spinner?.succeed('✅ Loaded successfully!');
    } catch (error) {
      console.info('⏳ Loading... (fallback)');
      setTimeout(() => console.info('✅ Loaded successfully!'), 2000);
    }
  } else {
    console.info('⏳ Loading... (fallback - no spinner)');
    setTimeout(() => console.info('✅ Loaded successfully!'), 2000);
  }

  await new Promise(resolve => setTimeout(resolve, 2100));

  console.info('\n📦 Package Configuration:');
  console.info('========================');
  
  // Read package.json to show optional dependencies
  const packageJsonText = await Bun.file('./package.json').text();
  const packageJson = JSON.parse(packageJsonText);
  
  console.info('Optional Dependencies in package.json:');
  if (packageJson.optionalDependencies) {
    Object.entries(packageJson.optionalDependencies).forEach(([name, version]) => {
      console.info(`   ${name}: ${version}`);
    });
  }

  console.info('\n🎯 Optional Dependency Benefits:');
  console.info('=================================');
  console.info('✅ Reduced bundle size - not included by default');
  console.info('✅ Graceful degradation - app works without them');
  console.info('✅ Conditional loading - import only when needed');
  console.info('✅ Flexible installation - user choice');
  console.info('✅ Development tools - CLI utilities and enhancements');

  console.info('\n🛠️ Usage Patterns:');
  console.info('==================');
  console.info('bun add package --optional           # Add optional dependency');
  console.info('bun add package --optional --exact    # Pin optional dependency');
  console.info('try { import } catch { fallback }    # Graceful error handling');
  console.info('dynamic import()                    # Load only when needed');

  console.info('\n🎉 Optional Dependencies Demo Complete!');
}

// Run the demo
runOptionalDemo().catch(console.error);
