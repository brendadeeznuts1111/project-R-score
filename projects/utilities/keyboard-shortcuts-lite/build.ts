// Bun-optimized build script
export {};

const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  target: 'browser',
  format: 'esm',
  naming: '[dir]/[name].[ext]',
  sourcemap: 'external'
});

if (!result.success) {
  console.error('❌ Build failed:');
  result.logs.forEach(log => {
    console.error(log.message);
  });
  process.exit(1);
} else {
  console.log('✅ Built successfully to dist/');
  console.log(`📦 Generated ${result.outputs.length} files`);
  
  // Show file sizes
  for (const output of result.outputs) {
    const stats = await Bun.file(output.path).stat();
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   📄 ${output.path.split('/').pop()} (${sizeKB} KB)`);
  }
}
