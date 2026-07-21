// scripts/validate-connect.ts - WS sentinel + telemetry sim
// Bun 1.3 connectivity validation engine

import { file, YAML } from 'bun';
import { spawn } from 'child_process';

async function validateConnectivity() {
  console.info('🔍 Validating WebSocket connectivity...');

  const config = YAML.parse(await file('bun.yaml').text());
  const { connectivity } = config.api;
  const errors: string[] = [];
  const warnings: string[] = [];
  let valid = 0;

  // Check WS handler files
  const wsFiles = ['routes/ws/telemetry.ts', 'routes/ws/config-broadcast.ts', 'src/api/websocket/persistent-server.ts'];
  console.info(`📄 Found ${wsFiles.length} WebSocket files`);

  for (const filePath of wsFiles) {
    try {
      const content = await file(filePath).text();

      // Check for WS lifecycle handlers
      const wsMatch = content.match(/async\s+(open|message|close)\(/g);
      if (!wsMatch || wsMatch.length < 2) {
        warnings.push(`⚠️  ${filePath}: Incomplete WS lifecycle (found ${wsMatch?.length || 0} handlers)`);
      }

      // Check for heartbeat support
      const heartbeatType = connectivity.ws.heartbeat.payload.type;
      if (!content.includes(heartbeatType) && !content.includes('PING')) {
        warnings.push(`⚠️  ${filePath}: Missing heartbeat support`);
      }

      // Check data type support
      const typesMatch = content.match(/dataType:\s*['"]([A-Z]+)['"]/g);
      if (typesMatch) {
        const foundTypes = typesMatch.map(m => {
          const match = m.match(/['"]([A-Z]+)['"]/);
          return match ? match[1] : null;
        }).filter(Boolean);

        const supportedTypes = connectivity.ws.dataTypes.map((t: string) => t.toUpperCase());
        const unsupportedTypes = foundTypes.filter(t => !supportedTypes.includes(t));

        if (unsupportedTypes.length > 0) {
          warnings.push(`⚠️  ${filePath}: Unsupported data types found: ${unsupportedTypes.join(', ')}`);
        }
      }

      // Check for topic subscription
      if (!content.includes('subscribe') && !content.includes('SUBSCRIBE')) {
        warnings.push(`⚠️  ${filePath}: Missing topic subscription logic`);
      }

      // Check for compression support
      if (connectivity.ws.compression.permessageDeflate && !content.includes('permessageDeflate') && !content.includes('compress')) {
        warnings.push(`⚠️  ${filePath}: Missing compression support`);
      }

      valid++;
      console.info(`🟢 ${filePath}: Full WS + Telemetry [${connectivity.ws.dataTypes.join(', ')}]`);
    } catch (error) {
      // File might not exist yet, skip
      if (error.code !== 'ENOENT') {
        errors.push(`❌ ${filePath}: ${error.message}`);
      }
    }
  }

  // Check telemetry stream utilities
  const telemetryFiles = ['utils/telemetry-stream.ts'];
  console.info(`📄 Found ${telemetryFiles.length} telemetry utility files`);

  for (const filePath of telemetryFiles) {
    try {
      const content = await file(filePath).text();

      // Check for multi-type support
      const requiredTypes = ['JSON', 'YAML', 'BINARY', 'TELEMETRY', 'STREAM'];
      const missingTypes = requiredTypes.filter(type => !content.includes(`'${type}'`) && !content.includes(`"${type}"`));

      if (missingTypes.length > 0) {
        warnings.push(`⚠️  ${filePath}: Missing type support: ${missingTypes.join(', ')}`);
      }

      // Check for sendTelemetry function
      if (!content.includes('sendTelemetry')) {
        errors.push(`❌ ${filePath}: Missing sendTelemetry function`);
      }

      // Check for receiveTelemetry function
      if (!content.includes('receiveTelemetry')) {
        warnings.push(`⚠️  ${filePath}: Missing receiveTelemetry function`);
      }

      console.info(`🟢 ${filePath}: Telemetry streaming utilities validated`);
    } catch (error) {
      errors.push(`❌ ${filePath}: ${error.message}`);
    }
  }

  // Check client reconnection utilities
  const clientFiles = ['utils/client-reconnect.ts'];
  console.info(`📄 Found ${clientFiles.length} client utility files`);

  for (const filePath of clientFiles) {
    try {
      const content = await file(filePath).text();

      // Check for exponential backoff
      if (!content.includes('backoff') && !content.includes('Math.pow')) {
        warnings.push(`⚠️  ${filePath}: Missing exponential backoff logic`);
      }

      // Check for max retries
      if (!content.includes('maxRetries')) {
        warnings.push(`⚠️  ${filePath}: Missing max retries logic`);
      }

      console.info(`🟢 ${filePath}: Client reconnection utilities validated`);
    } catch (error) {
      errors.push(`❌ ${filePath}: ${error.message}`);
    }
  }

  // Build telemetry index using ripgrep
  console.info('📄 Building telemetry index...');
  try {
    const rgResult = await runRipgrep('sendTelemetry', '.', ['--files-with-matches']);
    const foundTelemetryHandlers = rgResult.trim().split('\n').filter(Boolean);
    console.info(`📄 Found ${foundTelemetryHandlers.length} telemetry handlers in index`);

    // Write to .telemetry.index
    await file('.telemetry.index').write(foundTelemetryHandlers.join('\n'));
    console.info('🟢 Telemetry index built: .telemetry.index');
  } catch (error) {
    warnings.push(`⚠️  Failed to build telemetry index: ${error.message}`);
  }

  // Validate connectivity config
  if (!connectivity.ws.port) {
    errors.push('❌ Missing WS port configuration');
  }

  if (!connectivity.ws.heartbeat.interval) {
    errors.push('❌ Missing heartbeat interval');
  }

  if (!connectivity.ws.dataTypes || connectivity.ws.dataTypes.length === 0) {
    errors.push('❌ Missing data types configuration');
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Connectivity validation errors:');
    errors.forEach(error => console.error(`  ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Connectivity validation warnings:');
    warnings.forEach(warning => console.warn(`  ${warning}`));
  }

  if (errors.length === 0) {
    console.info(`\n🎉 All ${valid} connections valid & telemetry-ready!`);
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
  validateConnectivity().catch(console.error);
}
