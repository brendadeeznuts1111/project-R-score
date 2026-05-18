#!/usr/bin/env bun
/**
 * Sync version across all files
 * Ensures package.json and all code files use the same version
 */

import { readFile, writeFile } from 'fs/promises';
import { VERSION_INFO, NEBULA_VERSION } from '../src/utils/version.js';

async function syncVersions() {
  console.info(`🔄 Syncing version ${NEBULA_VERSION} across codebase...\n`);

  // Update package.json
  try {
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
    if (packageJson.version !== NEBULA_VERSION) {
      packageJson.version = NEBULA_VERSION;
      await writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
      console.info(`✅ Updated package.json: ${NEBULA_VERSION}`);
    } else {
      console.info(`✓ package.json already at ${NEBULA_VERSION}`);
    }
  } catch (error) {
    console.error('❌ Error updating package.json:', error);
  }

  // Update web-app/version.js
  try {
    const versionJsContent = await readFile('web-app/version.js', 'utf-8');
    const updatedContent = versionJsContent.replace(
      /const NEBULA_VERSION = ['"](.*?)['"]/,
      `const NEBULA_VERSION = '${NEBULA_VERSION}'`
    );
    
    // Update version info object
    const major = VERSION_INFO.major;
    const minor = VERSION_INFO.minor;
    const patch = VERSION_INFO.patch;
    
    const finalContent = updatedContent.replace(
      /version: NEBULA_VERSION,\s+major: \d+,\s+minor: \d+,\s+patch: \d+,/,
      `version: NEBULA_VERSION,\n  major: ${major},\n  minor: ${minor},\n  patch: ${patch},`
    );
    
    await writeFile('web-app/version.js', finalContent, 'utf-8');
    console.info(`✅ Updated web-app/version.js: ${NEBULA_VERSION}`);
  } catch (error) {
    console.error('❌ Error updating web-app/version.js:', error);
  }

  console.info(`\n✨ Version sync complete!`);
  console.info(`📦 Current version: ${NEBULA_VERSION}`);
  console.info(`📊 Version info:`);
  console.info(`   • API Version: ${VERSION_INFO.apiVersion}`);
  console.info(`   • Dashboard Version: ${VERSION_INFO.dashboardVersion}`);
  console.info(`   • Schema Version: ${VERSION_INFO.schemaVersion}`);
  console.info(`   • Release Type: ${VERSION_INFO.releaseType}`);
}

syncVersions().catch(console.error);
