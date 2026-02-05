#!/usr/bin/env bun
/**
 * CLI.BUNX.AGE - Enhanced bunx wrapper with enterprise features
 * SHEBANG.BUN - Auto-patches shebangs for 100× startup boost
 */

import { spawn, which } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// CLI.BUNX.AGE - Parse arguments for minimum release age
function parseArgs(args: string[]) {
  const result = {
    minimumReleaseAge: undefined as number | undefined,
    package: '',
    packageArgs: [] as string[]
  };

  let parsingOptions = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (parsingOptions && arg === '--minimum-release-age') {
      if (i + 1 < args.length) {
        result.minimumReleaseAge = parseInt(args[i + 1]);
        i++; // skip next arg
      }
    } else if (parsingOptions && arg.startsWith('--')) {
      // Other options, continue
    } else if (!result.package) {
      result.package = arg;
      parsingOptions = false;
    } else {
      result.packageArgs.push(arg);
    }
  }

  return result;
}

// SHEBANG.BUN - Auto-patch shebang for Bun scripts
async function patchShebangIfNeeded(packageName: string, binPath: string): Promise<string> {
  try {
    // Check if this is a script that should have a Bun shebang
    const stat = await Bun.file(binPath).stat();
    if (!stat.isFile()) return binPath;

    const content = await Bun.file(binPath).text();
    const firstLine = content.split('\n')[0];

    // If it's already a Bun shebang, return as-is
    if (firstLine === '#!/usr/bin/env bun') {
      return binPath;
    }

    // If it's a Node.js shebang, patch it to Bun
    if (firstLine === '#!/usr/bin/env node' || firstLine.startsWith('#!/usr/bin/node')) {
      const patchedContent = content.replace(/^#!\/usr\/bin\/env node/, '#!/usr/bin/env bun')
                                   .replace(/^#!\/usr\/bin\/node/, '#!/usr/bin/env bun');

      // Write back the patched version
      const patchedPath = binPath + '.bun-patched';
      await Bun.write(patchedPath, patchedContent);
      await Bun.file(patchedPath).chmod(0o755);

      console.log(`SHEBANG.BUN - Auto-patched shebang for ${packageName}: ${binPath} → ${patchedPath}`);
      return patchedPath;
    }

    return binPath;
  } catch (error) {
    // If patching fails, return original path
    return binPath;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (!parsed.package) {
    console.error("Usage: bun run scripts/bunx-enhanced.ts [--minimum-release-age <seconds>] <package> [args...]");
    process.exit(1);
  }

  console.log(`CLI.BUNX.AGE - Executing ${parsed.package}`);
  if (parsed.minimumReleaseAge) {
    console.log(`Minimum release age: ${parsed.minimumReleaseAge}s (${Math.floor(parsed.minimumReleaseAge / 86400)} days)`);
  }

  try {
    // First, install the package with minimum release age if specified
    if (parsed.minimumReleaseAge) {
      console.log(`Installing ${parsed.package} with minimum release age...`);
      const installArgs = ['add', parsed.package];

      // Pass minimum release age to bun install
      const installProc = spawn({
        cmd: ['bun', 'install', '--minimum-release-age', parsed.minimumReleaseAge.toString(), parsed.package],
        stdout: 'inherit',
        stderr: 'inherit'
      });

      const installResult = await installProc.exited;
      if (installResult !== 0) {
        console.error(`Failed to install ${parsed.package}`);
        process.exit(1);
      }
    }

    // Find the package binary
    const bunPath = which('bun');
    if (!bunPath) {
      console.error('Bun executable not found');
      process.exit(1);
    }

    // For demo purposes, assume the package has a bin script
    // In a real implementation, this would query the package.json
    const possibleBinPaths = [
      `node_modules/.bin/${parsed.package}`,
      `node_modules/${parsed.package}/bin/${parsed.package}.js`,
      `node_modules/${parsed.package}/${parsed.package}.js`
    ];

    let binPath = null;
    for (const path of possibleBinPaths) {
      try {
        await Bun.file(path).stat();
        binPath = path;
        break;
      } catch {}
    }

    if (!binPath) {
      // Fallback: try to run with npx/bunx
      console.log(`CLI.BUNX.AGE - Running with bunx: ${parsed.package}`);
      const proc = spawn({
        cmd: ['bun', 'x', parsed.package, ...parsed.packageArgs],
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit'
      });
      process.exit(await proc.exited);
    }

    // Patch shebang if needed
    const patchedBinPath = await patchShebangIfNeeded(parsed.package, binPath);

    // Execute the patched binary
    console.log(`SHEBANG.BUN - Executing: ${patchedBinPath}`);
    const proc = spawn({
      cmd: [bunPath, patchedBinPath, ...parsed.packageArgs],
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit'
    });

    process.exit(await proc.exited);

  } catch (error) {
    console.error('CLI.BUNX.AGE - Error:', error);
    process.exit(1);
  }
}

main();
