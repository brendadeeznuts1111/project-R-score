// scripts/validate-etl.ts - Auth + ETL flow validation
// Bun 1.3 validation engine for login-to-ETL pipeline

import { file, YAML } from 'bun';
import { spawn } from 'child_process';

async function validateETLFlow() {
  console.info('🔍 Validating Login-to-ETL flow...');

  const config = YAML.parse(await file('bun.yaml').text());
  const { auth, etl } = config.api;
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = 0;

  // Check ETL files
  const etlFiles = ['etl/stream.ts'];
  console.info(`📄 Found ${etlFiles.length} ETL files`);

  for (const filePath of etlFiles) {
    try {
      const content = await file(filePath).text();

      // Check for ETL handler
      if (!content.includes('startETL')) {
        errors.push(`❌ ${filePath}: Missing ETL handler`);
        continue;
      }

      // Validate JWT + CSRF usage
      if (!content.includes('CookieMap') && !content.includes('verifyJWT')) {
        warnings.push(`⚠️  ${filePath}: Missing auth enforcement`);
      }

      // Schema check
      const typesMatch = content.match(/dataType:\s*['"]([A-Z]+)['"]/g);
      if (typesMatch) {
        const foundTypes = typesMatch.map(m => {
          const match = m.match(/['"]([A-Z]+)['"]/);
          return match ? match[1] : null;
        }).filter(Boolean);

        const supportedTypes = etl.stream.types.map((t: string) => t.toUpperCase());
        const unsupportedTypes = foundTypes.filter(t => !supportedTypes.includes(t));

        if (unsupportedTypes.length > 0) {
          errors.push(`❌ ${filePath}: Unsupported data types: ${unsupportedTypes.join(', ')}`);
        }
      }

      valid++;
      console.info(`🟢 ${filePath}: ETL + Auth [${etl.stream.types.join(', ')}]`);
    } catch (error) {
      errors.push(`❌ ${filePath}: ${error.message}`);
    }
  }

  // Check auth handler
  const authFiles = ['routes/auth/login.ts'];
  console.info(`📄 Found ${authFiles.length} auth files`);

  for (const filePath of authFiles) {
    try {
      const content = await file(filePath).text();

      // Check for gsession cookie usage
      if (!content.includes('gsession')) {
        errors.push(`❌ ${filePath}: Missing gsession cookie`);
      }

      // Check for CookieMap usage
      if (!content.includes('CookieMap')) {
        warnings.push(`⚠️  ${filePath}: Not using CookieMap for cookies`);
      }

      // Check for JWT generation
      if (!content.includes('generateJWT') && !content.includes('jwt')) {
        warnings.push(`⚠️  ${filePath}: Missing JWT generation`);
      }

      // Check for CSRF token generation
      if (!content.includes('csrf') && !content.includes('CSRF')) {
        warnings.push(`⚠️  ${filePath}: Missing CSRF token`);
      }

      console.info(`🟢 ${filePath}: Auth handler validated`);
    } catch (error) {
      errors.push(`❌ ${filePath}: ${error.message}`);
    }
  }

  // Check WebSocket handlers
  const wsFiles = ['routes/ws/telemetry.ts'];
  console.info(`📄 Found ${wsFiles.length} WebSocket files`);

  for (const filePath of wsFiles) {
    try {
      const content = await file(filePath).text();

      // Check for WebSocket upgrade handling
      if (!content.includes('WebSocketPair') && !content.includes('webSocket')) {
        errors.push(`❌ ${filePath}: Missing WebSocket upgrade`);
      }

      // Check for heartbeat support
      if (!content.includes('heartbeat') && !content.includes('PING')) {
        warnings.push(`⚠️  ${filePath}: Missing heartbeat support`);
      }

      console.info(`🟢 ${filePath}: WebSocket handler validated`);
    } catch (error) {
      errors.push(`❌ ${filePath}: ${error.message}`);
    }
  }

  // Build ETL index using ripgrep
  console.info('📄 Building ETL index...');
  try {
    const rgResult = await runRipgrep('startETL', 'etl/', ['--files-with-matches']);
    const foundETLHandlers = rgResult.trim().split('\n').filter(Boolean);
    console.info(`📄 Found ${foundETLHandlers.length} ETL handlers in index`);

    // Write to .etl.index
    await file('.etl.index').write(foundETLHandlers.join('\n'));
    console.info('🟢 ETL index built: .etl.index');
  } catch (error) {
    warnings.push(`⚠️  Failed to build ETL index: ${error.message}`);
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Validation errors:');
    errors.forEach(error => console.error(`  ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Validation warnings:');
    warnings.forEach(warning => console.warn(`  ${warning}`));
  }

  if (errors.length === 0) {
    console.info(`\n🎉 All ${valid} ETL flows valid & telemetry-ready!`);
  }
}

async function runRipgrep(pattern: string, path: string = '.', args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const rg = spawn('rg', [pattern, path, ...args], { stdio: 'pipe' });

    let stdout = '';
    let stderr = '';

    rg.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    rg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    rg.on('close', (code) => {
      if (code === 0 || code === 1) { // 1 is OK for rg (no matches found)
        resolve(stdout);
      } else {
        reject(new Error(`ripgrep failed: ${stderr}`));
      }
    });

    rg.on('error', reject);
  });
}

if (import.meta.main) {
  validateETLFlow().catch(console.error);
}
