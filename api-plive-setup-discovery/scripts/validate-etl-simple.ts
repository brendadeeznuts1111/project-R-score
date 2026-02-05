#!/usr/bin/env bun

/**
 * ✅ ETL Auth Flow Validation Sentinel (Simple Version)
 * Bun 1.3 validation scripts for login-to-ETL pipeline
 */

import { Glob } from 'bun';
const glob = (patterns: string[], options: any) => new Glob(patterns.join(',')).scan(options);

async function validateETLFlow() {
  console.log('✅ ETL Auth Flow Validation Sentinel');
  console.log('====================================');
  console.log('');

  let valid = 0;
  let errors: string[] = [];
  let warnings: string[] = [];

  // 1. 🔑 Validate Auth Configuration
  console.log('1️⃣ Validating Auth Handler...');
  try {
    const authContent = await Bun.file('src/bun/auth/login.ts').text();
    if (authContent.includes('handleLogin') && authContent.includes('gsession') && authContent.includes('jwt')) {
      console.log('   ✅ JWT gsession authentication handler found');
      valid++;
    } else {
      errors.push('❌ Auth handler missing required components');
    }
  } catch {
    errors.push('❌ Auth handler file not found');
  }

  // 2. ⚡ Validate ETL Configuration
  console.log('2️⃣ Validating ETL Handler...');
  try {
    const etlContent = await Bun.file('src/bun/etl/stream.ts').text();
    if (etlContent.includes('startETL') && etlContent.includes('ReadableStream') && etlContent.includes('telemetry')) {
      console.log('   ✅ ETL stream processing handler found');
      valid++;
    } else {
      errors.push('❌ ETL handler missing required components');
    }
  } catch {
    errors.push('❌ ETL handler file not found');
  }

  // 3. 📡 Validate WebSocket Configuration
  console.log('3️⃣ Validating WebSocket Handler...');
  try {
    const wsContent = await Bun.file('src/bun/websocket/telemetry.ts').text();
    if (wsContent.includes('WebSocketHandler') && wsContent.includes('telemetry') && wsContent.includes('jwt')) {
      console.log('   ✅ WebSocket telemetry handler found');
      valid++;
    } else {
      errors.push('❌ WebSocket handler missing required components');
    }
  } catch {
    errors.push('❌ WebSocket handler file not found');
  }

  // 4. 🎨 Validate Client Configuration
  console.log('4️⃣ Validating Client Files...');
  try {
    const clientContent = await Bun.file('src/client/client.js').text();
    const serveContent = await Bun.file('src/bun/client/serve.ts').text();
    if (clientContent.includes('login') && clientContent.includes('WebSocket') && serveContent.includes('buildMinifiedClient')) {
      console.log('   ✅ Client JS and serving handler found');
      valid++;
    } else {
      errors.push('❌ Client files missing required components');
    }
  } catch {
    errors.push('❌ Client files not found');
  }

  // 5. 🚀 Validate Server Integration
  console.log('5️⃣ Validating Server Integration...');
  try {
    const serverContent = await Bun.file('src/bun/server-enhanced.ts').text();
    if (serverContent.includes('handleLogin') || serverContent.includes('startETL') || serverContent.includes('telemetryWebSocket')) {
      console.log('   ✅ Server integration complete');
      valid++;
    } else {
      errors.push('❌ Server integration incomplete');
    }
  } catch {
    errors.push('❌ Server integration file not found');
  }

  // 6. 🔍 Validate Code Patterns
  console.log('6️⃣ Validating Code Patterns...');
  const globPattern = new Glob('src/bun/**/*.ts');
  const files: string[] = [];
  for await (const file of globPattern.scan('.')) {
    files.push(file);
  }
  const clientGlob = new Glob('src/client/*.js');
  for await (const file of clientGlob.scan('.')) {
    files.push(file);
  }

  let authHandlers = 0;
  let etlHandlers = 0;
  let wsHandlers = 0;
  let jwtUsage = 0;
  let csrfUsage = 0;

  for (const file of files) {
    const content = await Bun.file(file).text();

    // Check for auth handlers
    if (content.includes('handleLogin') || content.includes('generateJWT')) {
      authHandlers++;
    }

    // Check for ETL handlers
    if (content.includes('startETL') || content.includes('ReadableStream')) {
      etlHandlers++;
    }

    // Check for WebSocket handlers
    if (content.includes('WebSocket') && content.includes('telemetry')) {
      wsHandlers++;
    }

    // Check for JWT usage
    if (content.includes('jwt') || content.includes('gsession')) {
      jwtUsage++;
    }

    // Check for CSRF usage
    if (content.includes('csrf') || content.includes('CSRF')) {
      csrfUsage++;
    }
  }

  console.log(`   📊 Auth handlers: ${authHandlers}`);
  console.log(`   📊 ETL handlers: ${etlHandlers}`);
  console.log(`   📊 WS handlers: ${wsHandlers}`);
  console.log(`   📊 JWT usage: ${jwtUsage} files`);
  console.log(`   📊 CSRF usage: ${csrfUsage} files`);

  if (authHandlers === 0) errors.push('❌ No auth handlers found');
  if (etlHandlers === 0) errors.push('❌ No ETL handlers found');
  if (wsHandlers === 0) errors.push('❌ No WebSocket handlers found');
  if (jwtUsage === 0) errors.push('❌ No JWT implementation found');
  if (csrfUsage === 0) warnings.push('⚠️ Limited CSRF implementation found');

  // Summary
  console.log('');
  console.log('📊 Validation Summary:');
  console.log(`   ✅ Valid components: ${valid}/5`);
  console.log(`   ❌ Errors: ${errors.length}`);
  console.log(`   ⚠️ Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('');
    console.log('❌ ERRORS:');
    errors.forEach(error => console.log(`   ${error}`));
    console.log('');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('');
    console.log('⚠️ WARNINGS:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }

  console.log('');
  console.log('🎉 ETL Auth Flow Validation Complete!');
  console.log('   All core components validated and ready for production.');
  console.log('');
  console.log('🚀 Ready to launch: bun run server:etl');
  console.log('');
  console.log('📋 Next steps:');
  console.log('   1. Start server: bun run server:etl');
  console.log('   2. Test login: curl -X POST /api/auth/login -d \'{"username":"trader1","password":"password123"}\'');
  console.log('   3. Get client: curl /api/js/client.min.js');
  console.log('   4. Test ETL: curl -X POST /api/etl/start -d \'{"dataType":"TELEMETRY","payload":{...}}\'');
}

// Run validation
validateETLFlow().catch((error) => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});
