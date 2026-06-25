#!/usr/bin/env bun

/**
 * Executable Compilation Demo
 * Demonstrates the new Bun.build() API for creating standalone executables
 */

async function main() {
  console.info('🔨 Executable Compilation Demo');
  console.info('==============================');

  const outputDir = './dist/executables';

  // Ensure output directory exists
  await Bun.write(`${outputDir}/.gitkeep`, '');

  console.info('📁 Building executables...');

  try {
    // Build for multiple platforms with different configurations
    const builds = [
      {
        name: 'Linux x64 (glibc)',
        target: 'bun-linux-x64',
        outfile: `${outputDir}/crystal-clear-linux-x64`,
      },
      {
        name: 'Linux x64 (musl)',
        target: 'bun-linux-x64-musl',
        outfile: `${outputDir}/crystal-clear-linux-x64-musl`,
      },
      {
        name: 'Linux ARM64',
        target: 'bun-linux-arm64',
        outfile: `${outputDir}/crystal-clear-linux-arm64`,
      },
      {
        name: 'macOS x64',
        target: 'bun-macos-x64',
        outfile: `${outputDir}/crystal-clear-macos-x64`,
      },
      {
        name: 'macOS ARM64',
        target: 'bun-macos-arm64',
        outfile: `${outputDir}/crystal-clear-macos-arm64`,
      },
      {
        name: 'Windows x64',
        target: 'bun-windows-x64',
        outfile: `${outputDir}/crystal-clear-windows-x64.exe`,
      },
    ];

    for (const build of builds) {
      console.info(`\n🏗️  Building for ${build.name}...`);

      try {
        await Bun.build({
          entrypoints: ['./scripts/user-agent-demo.ts'],
          outfile: build.outfile,
          compile: {
            target: build.target,
            // Embed runtime arguments
            exec_argv: [
              '--smol',
              '--user-agent=CrystalClearArchitecture/2.0.0',
              '--title=Crystal Clear Architecture',
            ],
          },
          // Minify for smaller executables
          minify: {
            whitespace: true,
            identifiers: true,
            syntax: true,
          },
          // Enable source maps for debugging
          sourcemap: 'linked',
        });

        console.info(`✅ Built: ${build.outfile}`);

        // Show file size
        const stats = await Bun.file(build.outfile).stat();
        console.info(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.error(`❌ Failed to build ${build.name}:`, error);
      }
    }

    // Build with Windows metadata
    console.info('\n🏗️  Building Windows executable with metadata...');

    await Bun.build({
      entrypoints: ['./scripts/user-agent-demo.ts'],
      outfile: `${outputDir}/crystal-clear-windows-metadata.exe`,
      compile: {
        target: 'bun-windows-x64',
        windows: {
          title: 'Crystal Clear Architecture',
          publisher: 'Fire22 Enterprise',
          version: '2.0.0.0',
          description: 'Enterprise-grade interactive hub with advanced analytics and automation',
          copyright: '© 2024 Fire22 Enterprise. All rights reserved.',
        },
        exec_argv: ['--user-agent=CrystalClearArchitecture/2.0.0', '--smol'],
      },
    });

    console.info('✅ Windows executable with metadata built');

    // Build with macOS settings
    console.info('\n🏗️  Building macOS executable with bundle settings...');

    await Bun.build({
      entrypoints: ['./scripts/user-agent-demo.ts'],
      outfile: `${outputDir}/crystal-clear-macos-bundle`,
      compile: {
        target: 'bun-macos-arm64',
        macos: {
          bundle_id: 'com.fire22.crystalclear',
          category: 'public.app-category.business',
          minimum_version: '12.0',
        },
        exec_argv: ['--user-agent=CrystalClearArchitecture/2.0.0'],
      },
    });

    console.info('✅ macOS executable with bundle settings built');

    console.info('\n📋 Build Summary:');
    console.info('================');
    console.info('✅ All executables built successfully!');
    console.info(`📁 Output directory: ${outputDir}`);
    console.info('');
    console.info('🚀 Usage Examples:');
    console.info('==================');
    console.info('# Run Linux executable');
    console.info('./dist/executables/crystal-clear-linux-x64');
    console.info('');
    console.info('# Run Windows executable');
    console.info('./dist/executables/crystal-clear-windows-x64.exe');
    console.info('');
    console.info('# Run macOS executable');
    console.info('./dist/executables/crystal-clear-macos-arm64');
    console.info('');
    console.info('🔍 All executables include embedded User-Agent:');
    console.info('   CrystalClearArchitecture/2.0.0');
    console.info('');
    console.info('📊 Check embedded arguments:');
    console.info('   process.execArgv will show the embedded flags');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Export for use as a module
export { main };

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
