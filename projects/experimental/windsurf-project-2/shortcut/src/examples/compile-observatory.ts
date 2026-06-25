#!/usr/bin/env bun

/**
 * Compile URLPattern Observatory to Standalone Binary
 * 
 * Uses Bun v1.3.6 --compile with embedded patterns and database
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.info('🔧 Compiling URLPattern Observatory v1.3.6 to Standalone Binary');
console.info('================================================================');

async function compileStandalone() {
  try {
    // First, prepare the observatory
    console.info('📦 Preparing observatory for compilation...');
    
    const observatory = new (await import('./urlpattern-observatory-v1.3.6')).URLPatternObservatory();
    await observatory.prepareStandaloneBuild();
    observatory.close();
    
    // Compile with embedded features
    console.info('🚀 Compiling to standalone binary...');
    
    const compileCommand = [
      'bun build',
      './src/examples/urlpattern-observatory-v1.3.6.ts',
      '--compile',
      '--outfile', './observatory-v1.3.6',
      '--target', 'bun',
      '--minify',
      '--define', 'process.env.NODE_ENV="production"',
      '--define', 'process.env.OBSERVATORY_VERSION="1.3.6"',
      '--define', 'process.env.BUILD_TIME="' + new Date().toISOString() + '"'
    ].join(' ');
    
    console.info('🔨 Running:', compileCommand);
    execSync(compileCommand, { stdio: 'inherit' });
    
    // Verify the binary was created
    if (existsSync('./observatory-v1.3.6')) {
      const stats = await Bun.file('./observatory-v1.3.6').stat();
      
      console.info('✅ Compilation successful!');
      console.info(`📦 Binary: ./observatory-v1.3.6`);
      console.info(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.info(`🕒 Built: ${new Date().toISOString()}`);
      
      console.info('\n🎯 Usage:');
      console.info('   ./observatory-v1.3.6 start');
      console.info('   ./observatory-v1.3.6 analyze "https://localhost:3000/*"');
      console.info('   ./observatory-v1.3.6 backup');
      console.info('   ./observatory-v1.3.6 dashboard');
      
      console.info('\n🔥 Features embedded:');
      console.info('   ✅ SQLite database with WAL optimization');
      console.info('   ✅ Security policy with JSONC parsing');
      console.info('   ✅ 20× faster CRC32 pattern hashing');
      console.info('   ✅ WebSocket proxy support');
      console.info('   ✅ 3.5× faster Response.json()');
      console.info('   ✅ Bun.Archive backup with integrity');
      console.info('   ✅ Virtual guard injection');
      
      console.info('\n🚀 Ready for deployment to staging or production!');
      
    } else {
      throw new Error('Binary compilation failed - no output file found');
    }
    
  } catch (error) {
    console.error('❌ Compilation failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run compilation
if (import.meta.main) {
  compileStandalone();
}
