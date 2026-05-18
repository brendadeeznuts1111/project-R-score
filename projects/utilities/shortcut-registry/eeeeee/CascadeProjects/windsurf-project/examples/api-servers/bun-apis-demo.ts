#!/usr/bin/env bun

// Comprehensive Demo of Bun's Native APIs for Enterprise Dashboard
export {}; // Make this a module for top-level await

async function demonstrateBunAPIs() {
  console.info('🚀 Bun Native APIs Demo - Enterprise Dashboard');
  console.info('==============================================');

  // 1. HTTP Server API
  console.info('\n🌐 HTTP Server API:');
  console.info('====================');
  try {
    const server = Bun.serve({
      port: 0, // Random port
      fetch(req) {
        return new Response(JSON.stringify({
          message: "Enterprise Dashboard API",
          timestamp: new Date().toISOString(),
          endpoints: ['/health', '/metrics', '/fraud-detection']
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      },
    });
    
    console.info(`✅ Server started on port ${server.port}`);
    console.info('📡 Available endpoints: /health, /metrics, /fraud-detection');
    
    // Test the server
    const response = await fetch(`http://localhost:${server.port}`);
    const data = await response.json();
    console.info('📄 Server response:', data);
    
    server.stop();
  } catch (error) {
    console.info('❌ Server error:', error instanceof Error ? error.message : String(error));
  }

  // 2. File I/O API
  console.info('\n📁 File I/O API:');
  console.info('=================');
  try {
    // Write file
    const testData = { 
      dashboard: 'enterprise',
      timestamp: new Date().toISOString(),
      metrics: { users: 1000, requests: 5000 }
    };
    
    await Bun.write('./temp-dashboard-data.json', JSON.stringify(testData, null, 2));
    console.info('✅ File written successfully');
    
    // Read file
    const file = Bun.file('./temp-dashboard-data.json');
    const content = await file.text();
    const parsed = JSON.parse(content);
    console.info('📖 File read:', parsed);
    
    // Clean up
    await Bun.write('./temp-dashboard-data.json', '');
  } catch (error) {
    console.info('❌ File I/O error:', error instanceof Error ? error.message : String(error));
  }

  // 3. Hashing & Security API
  console.info('\n🔐 Hashing & Security API:');
  console.info('=========================');
  try {
    const sensitiveData = 'enterprise-dashboard-secret';
    const hash = Bun.hash(sensitiveData);
    console.info('🔒 Hash of sensitive data:', hash);
    
    // Password hashing
    const password = 'admin123';
    const hashedPassword = await Bun.password.hash(password);
    console.info('🔑 Hashed password:', hashedPassword.substring(0, 20) + '...');
    
    // Verify password
    const isValid = await Bun.password.verify(password, hashedPassword);
    console.info('✅ Password verification:', isValid);
  } catch (error) {
    console.info('❌ Hashing error:', error instanceof Error ? error.message : String(error));
  }

  // 4. SQLite API
  console.info('\n🗄️ SQLite API:');
  console.info('===============');
  try {
    // Import SQLite for the demo
    const { Database } = await import('bun:sqlite');
    
    const db = new Database('./enterprise-dashboard.db');
    
    // Create table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.info('✅ Database table created');
    
    // Insert data
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    stmt.run('Admin User', 'admin@enterprise.com');
    console.info('✅ User inserted');
    
    // Query data
    const users = db.prepare('SELECT * FROM users').all();
    console.info('👥 Users:', users);
    
    // Clean up
    db.close();
    await Bun.write('./enterprise-dashboard.db', '');
  } catch (error) {
    console.info('❌ SQLite error:', error instanceof Error ? error.message : String(error));
  }

  // 5. Utilities API
  console.info('\n🛠️ Utilities API:');
  console.info('=================');
  try {
    console.info('📊 Bun version:', Bun.version);
    console.info('🔍 Bun revision:', Bun.revision);
    console.info('🌍 Environment:', Bun.env.NODE_ENV || 'development');
    console.info('🎯 Main module:', Bun.main);
    
    // UUID generation
    const uuid = Bun.randomUUIDv7();
    console.info('🆔 Generated UUID v7:', uuid);
    
    // Sleep timing
    const start = Bun.nanoseconds();
    await Bun.sleep(10); // 10ms
    const elapsed = Bun.nanoseconds() - start;
    console.info('⏱️ Sleep timing:', elapsed / 1_000_000, 'ms');
    
    // Deep comparison
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    const isEqual = Bun.deepEquals(obj1, obj2);
    console.info('🔍 Deep equality check:', isEqual);
  } catch (error) {
    console.info('❌ Utilities error:', error instanceof Error ? error.message : String(error));
  }

  // 6. Compression API
  console.info('\n📦 Compression API:');
  console.info('==================');
  try {
    const jsonData = JSON.stringify({
      dashboard: 'enterprise',
      metrics: Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }))
    });
    
    // Compress
    const compressed = Bun.gzipSync(jsonData);
    console.info('🗜️ Original size:', jsonData.length, 'bytes');
    console.info('📦 Compressed size:', compressed.length, 'bytes');
    console.info('💾 Compression ratio:', ((compressed.length / jsonData.length) * 100).toFixed(2) + '%');
    
    // Decompress
    const decompressed = Bun.gunzipSync(compressed);
    const parsed = JSON.parse(decompressed.toString());
    console.info('✅ Decompression successful, items:', parsed.metrics.length);
  } catch (error) {
    console.info('❌ Compression error:', error instanceof Error ? error.message : String(error));
  }

  // 7. Shell API
  console.info('\n🐚 Shell API:');
  console.info('=============');
  try {
    // Import shell API
    const { $ } = await import('bun');
    
    // Run shell command
    const result = await $`echo "Bun Shell API Demo" | tr '[:lower:]' '[:upper:]'`;
    console.info('📟 Shell command output:', result.stdout.toString().trim());
    
    // Get system info
    const nodeVersion = await $`node --version`.quiet();
    console.info('🔧 Node version:', nodeVersion.stdout.toString().trim());
  } catch (error) {
    console.info('❌ Shell error:', error instanceof Error ? error.message : String(error));
  }

  console.info('\n🎉 Bun APIs Demo Complete!');
  console.info('================================');
  console.info('✅ HTTP Server - High-performance web server');
  console.info('✅ File I/O - Optimized file operations');
  console.info('✅ Security - Built-in hashing and password handling');
  console.info('✅ Database - Native SQLite support');
  console.info('✅ Utilities - Performance and developer tools');
  console.info('✅ Compression - Fast data compression');
  console.info('✅ Shell - Integrated shell command execution');
  console.info('');
  console.info('🚀 Enterprise Dashboard powered by Bun APIs!');
}

// Run the demonstration
demonstrateBunAPIs().catch(console.error);
