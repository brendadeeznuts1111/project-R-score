#!/usr/bin/env bun

// Comprehensive Demo of Bun's Native APIs for Enterprise Dashboard
export {}; // Make this a module for top-level await

async function demonstrateBunAPIs() {
  console.log('🚀 Bun Native APIs Demo - Enterprise Dashboard');
  console.log('==============================================');

  // 1. HTTP Server API
  console.log('\n🌐 HTTP Server API:');
  console.log('====================');
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
    
    console.log(`✅ Server started on port ${server.port}`);
    console.log('📡 Available endpoints: /health, /metrics, /fraud-detection');
    
    // Test the server
    const response = await fetch(`http://localhost:${server.port}`);
    const data = await response.json();
    console.log('📄 Server response:', data);
    
    server.stop();
  } catch (error) {
    console.log('❌ Server error:', error instanceof Error ? error.message : String(error));
  }

  // 2. File I/O API
  console.log('\n📁 File I/O API:');
  console.log('=================');
  try {
    // Write file
    const testData = { 
      dashboard: 'enterprise',
      timestamp: new Date().toISOString(),
      metrics: { users: 1000, requests: 5000 }
    };
    
    await Bun.write('./temp-dashboard-data.json', JSON.stringify(testData, null, 2));
    console.log('✅ File written successfully');
    
    // Read file
    const file = Bun.file('./temp-dashboard-data.json');
    const content = await file.text();
    const parsed = JSON.parse(content);
    console.log('📖 File read:', parsed);
    
    // Clean up
    await Bun.write('./temp-dashboard-data.json', '');
  } catch (error) {
    console.log('❌ File I/O error:', error instanceof Error ? error.message : String(error));
  }

  // 3. Hashing & Security API
  console.log('\n🔐 Hashing & Security API:');
  console.log('=========================');
  try {
    const sensitiveData = 'enterprise-dashboard-secret';
    const hash = Bun.hash(sensitiveData);
    console.log('🔒 Hash of sensitive data:', hash);
    
    // Password hashing
    const password = 'admin123';
    const hashedPassword = await Bun.password.hash(password);
    console.log('🔑 Hashed password:', hashedPassword.substring(0, 20) + '...');
    
    // Verify password
    const isValid = await Bun.password.verify(password, hashedPassword);
    console.log('✅ Password verification:', isValid);
  } catch (error) {
    console.log('❌ Hashing error:', error instanceof Error ? error.message : String(error));
  }

  // 4. SQLite API
  console.log('\n🗄️ SQLite API:');
  console.log('===============');
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
    console.log('✅ Database table created');
    
    // Insert data
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    stmt.run('Admin User', 'admin@enterprise.com');
    console.log('✅ User inserted');
    
    // Query data
    const users = db.prepare('SELECT * FROM users').all();
    console.log('👥 Users:', users);
    
    // Clean up
    db.close();
    await Bun.write('./enterprise-dashboard.db', '');
  } catch (error) {
    console.log('❌ SQLite error:', error instanceof Error ? error.message : String(error));
  }

  // 5. Utilities API
  console.log('\n🛠️ Utilities API:');
  console.log('=================');
  try {
    console.log('📊 Bun version:', Bun.version);
    console.log('🔍 Bun revision:', Bun.revision);
    console.log('🌍 Environment:', Bun.env.NODE_ENV || 'development');
    console.log('🎯 Main module:', Bun.main);
    
    // UUID generation
    const uuid = Bun.randomUUIDv7();
    console.log('🆔 Generated UUID v7:', uuid);
    
    // Sleep timing
    const start = Bun.nanoseconds();
    await Bun.sleep(10); // 10ms
    const elapsed = Bun.nanoseconds() - start;
    console.log('⏱️ Sleep timing:', elapsed / 1_000_000, 'ms');
    
    // Deep comparison
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    const isEqual = Bun.deepEquals(obj1, obj2);
    console.log('🔍 Deep equality check:', isEqual);
  } catch (error) {
    console.log('❌ Utilities error:', error instanceof Error ? error.message : String(error));
  }

  // 6. Compression API
  console.log('\n📦 Compression API:');
  console.log('==================');
  try {
    const jsonData = JSON.stringify({
      dashboard: 'enterprise',
      metrics: Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }))
    });
    
    // Compress
    const compressed = Bun.gzipSync(jsonData);
    console.log('🗜️ Original size:', jsonData.length, 'bytes');
    console.log('📦 Compressed size:', compressed.length, 'bytes');
    console.log('💾 Compression ratio:', ((compressed.length / jsonData.length) * 100).toFixed(2) + '%');
    
    // Decompress
    const decompressed = Bun.gunzipSync(compressed);
    const parsed = JSON.parse(decompressed.toString());
    console.log('✅ Decompression successful, items:', parsed.metrics.length);
  } catch (error) {
    console.log('❌ Compression error:', error instanceof Error ? error.message : String(error));
  }

  // 7. Shell API
  console.log('\n🐚 Shell API:');
  console.log('=============');
  try {
    // Import shell API
    const { $ } = await import('bun');
    
    // Run shell command
    const result = await $`echo "Bun Shell API Demo" | tr '[:lower:]' '[:upper:]'`;
    console.log('📟 Shell command output:', result.stdout.toString().trim());
    
    // Get system info
    const nodeVersion = await $`node --version`.quiet();
    console.log('🔧 Node version:', nodeVersion.stdout.toString().trim());
  } catch (error) {
    console.log('❌ Shell error:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 Bun APIs Demo Complete!');
  console.log('================================');
  console.log('✅ HTTP Server - High-performance web server');
  console.log('✅ File I/O - Optimized file operations');
  console.log('✅ Security - Built-in hashing and password handling');
  console.log('✅ Database - Native SQLite support');
  console.log('✅ Utilities - Performance and developer tools');
  console.log('✅ Compression - Fast data compression');
  console.log('✅ Shell - Integrated shell command execution');
  console.log('');
  console.log('🚀 Enterprise Dashboard powered by Bun APIs!');
}

// Run the demonstration
demonstrateBunAPIs().catch(console.error);
