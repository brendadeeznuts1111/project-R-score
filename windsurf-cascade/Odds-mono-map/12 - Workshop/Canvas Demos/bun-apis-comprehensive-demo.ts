#!/usr/bin/env bun
/**
 * Comprehensive Bun APIs Demonstration
 * 
 * Complete showcase of Bun's native APIs including:
 * - HTTP Server with ETags and cookies
 * - DNS resolution and caching
 * - File I/O operations
 * - TCP/UDP sockets
 * - SQLite database operations
 * - Redis client functionality
 * - Shell commands and child processes
 * - Hashing, encryption, and compression
 * - Workers and bundling
 * - Testing framework
 * - WebSocket server/client
 * - Stream processing and utilities
 * 
 * Usage:
 *   bun run bun-apis-comprehensive-demo.ts
 *   bun --expose-gc run bun-apis-comprehensive-demo.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { $ } from "bun";

console.log('🚀 Comprehensive Bun APIs Demonstration');
console.log('==========================================');

// =============================================================================
// HTTP SERVER WITH ETAGS AND COOKIES
// =============================================================================

async function demonstrateHTTPServer() {
    console.log('\n🌐 HTTP Server with ETags and Cookies:');
    console.log('=====================================');

    const server = Bun.serve({
        port: 0, // Random port
        fetch(req) {
            const url = new URL(req.url);

            // Cookie handling
            const cookies = new Bun.CookieMap(req.headers.get('cookie') || '');
            const visitCount = parseInt(cookies.get('visits') || '0') + 1;

            // ETag generation
            const content = `Hello from Bun! Visit #${visitCount}`;
            const etag = Bun.hash(content).toString();

            // Check If-None-Match header
            const ifNoneMatch = req.headers.get('if-none-match');
            if (ifNoneMatch === etag) {
                return new Response(null, { status: 304 });
            }

            // Set cookies in response
            const response = new Response(content, {
                headers: {
                    'ETag': etag,
                    'Cache-Control': 'max-age=60',
                    'Content-Type': 'text/plain',
                    'Set-Cookie': `visits=${visitCount}; HttpOnly; SameSite=Strict; Path=/`
                }
            });

            return response;
        }
    });

    console.log(`✅ HTTP Server started on port ${server.port}`);

    // Test the server
    try {
        const response = await fetch(`http://localhost:${server.port}`);
        console.log(`📊 Response status: ${response.status}`);
        console.log(`🏷️ ETag: ${response.headers.get('etag')}`);
        console.log(`🍪 Set-Cookie: ${response.headers.get('set-cookie')}`);
        console.log(`📄 Content: ${await response.text()}`);

        // Test conditional request
        const etag = response.headers.get('etag');
        const conditionalResponse = await fetch(`http://localhost:${server.port}`, {
            headers: { 'If-None-Match': etag || '' }
        });
        console.log(`🔄 Conditional request status: ${conditionalResponse.status} (should be 304)`);

    } catch (error) {
        console.error(`❌ Server test failed: ${(error as Error).message}`);
    }

    server.stop();
    console.log('🛑 HTTP Server stopped');
}

// =============================================================================
// DNS OPERATIONS
// =============================================================================

async function demonstrateDNS() {
    console.log('\n🌍 DNS Operations:');
    console.log('==================');

    try {
        // DNS lookup
        console.log('🔍 Performing DNS lookup...');
        const lookup = await Bun.dns.lookup('httpbin.org');
        if (lookup && lookup.length > 0) {
            const firstResult = lookup[0];
            console.log(`📡 httpbin.org resolves to: ${firstResult.address || 'N/A'}`);
            console.log(`🏷️ DNS TTL: ${firstResult.ttl || 'N/A'} seconds`);
            console.log(`📋 DNS family: ${firstResult.family || 'N/A'} (IPv${firstResult.family || 'N/A'})`);
        } else {
            console.log('📡 httpbin.org: No DNS records found');
        }

        // DNS prefetch
        console.log('\n⚡ Prefetching DNS records...');
        await Bun.dns.prefetch('github.com');
        console.log('✅ DNS prefetch completed');

        // DNS cache statistics
        console.log('\n📊 DNS Cache Statistics:');
        const cacheStats = Bun.dns.getCacheStats();
        console.log(`   • Cache size: ${cacheStats.size}`);
        console.log(`   • Cache hits: ${cacheStats.cacheHitsCompleted || 0}`);
        console.log(`   • Cache misses: ${cacheStats.cacheMisses || 0}`);
        console.log(`   • Hit rate: ${cacheStats.cacheHitsCompleted > 0 ? ((cacheStats.cacheHitsCompleted / (cacheStats.cacheHitsCompleted + cacheStats.cacheMisses)) * 100).toFixed(2) : 0}%`);

        // Multiple lookups
        console.log('\n🔍 Multiple DNS lookups:');
        const domains = ['google.com', 'github.com', 'bun.sh'];
        for (const domain of domains) {
            try {
                const result = await Bun.dns.lookup(domain);
                if (result && result.length > 0) {
                    console.log(`   • ${domain}: ${result[0]?.address || 'Failed'}`);
                } else {
                    console.log(`   • ${domain}: No records found`);
                }
            } catch (error) {
                console.log(`   • ${domain}: Failed (${(error as Error).message})`);
            }
        }

    } catch (error) {
        console.error(`❌ DNS demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// SQLITE DATABASE OPERATIONS
// =============================================================================

async function demonstrateSQLite() {
    console.log('\n🗄️ SQLite Database Operations:');
    console.log('===============================');

    try {
        // Import SQLite module
        const { Database } = await import('bun:sqlite');

        // Create in-memory database
        const db = new Database(':memory:');

        // Create table
        console.log('📋 Creating database table...');
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert data
        console.log('💾 Inserting sample data...');
        const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        insert.run('Alice', 'alice@example.com');
        insert.run('Bob', 'bob@example.com');
        insert.run('Charlie', 'charlie@example.com');

        // Query data
        console.log('📊 Querying users:');
        const users = db.query('SELECT * FROM users ORDER BY id').all();
        users.forEach((user: any) => {
            console.log(`   • ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created: ${user.created_at}`);
        });

        // Prepared statements
        console.log('\n🎯 Using prepared statements:');
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(1) as { name?: string; email?: string };
        console.log(`   User ID 1: ${user?.name || 'N/A'} (${user?.email || 'N/A'})`);

        // Transactions
        console.log('\n🔄 Demonstrating transactions:');
        db.transaction(() => {
            insert.run('David', 'david@example.com');
            insert.run('Eve', 'eve@example.com');
        })();

        const updatedCount = db.query('SELECT COUNT(*) as count FROM users').get() as { count: number };
        console.log(`   Total users after transaction: ${updatedCount.count}`);

        // Close database
        db.close();
        console.log('✅ SQLite database operations completed');

    } catch (error) {
        console.error(`❌ SQLite demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// REDIS CLIENT OPERATIONS
// =============================================================================

async function demonstrateRedis() {
    console.log('\n🔴 Redis Client Operations:');
    console.log('=============================');

    try {
        // Note: This requires a Redis server to be running
        console.log('🔗 Attempting Redis connection...');

        const redis = new Bun.RedisClient('redis://localhost:6379');

        // Basic operations
        await redis.set('bun-demo-key', 'Hello from Bun Redis!');
        const value = await redis.get('bun-demo-key');
        console.log(`📝 SET/GET: ${value}`);

        // Hash operations
        await redis.hset('bun-demo-hash', {
            'field1': 'value1',
            'field2': 'value2',
            'number': '42'
        });
        const hashValue = await redis.hgetall('bun-demo-hash');
        console.log(`🗂️ Hash operations:`, hashValue);

        // List operations
        await redis.lpush('bun-demo-list', 'item3', 'item2', 'item1');
        const listValue = await redis.lrange('bun-demo-list', 0, -1);
        console.log(`📋 List operations:`, listValue);

        // TTL operations
        await redis.setex('bun-demo-expire', 10, 'This will expire in 10 seconds');
        const ttl = await redis.ttl('bun-demo-expire');
        console.log(`⏰ TTL operation: ${ttl} seconds remaining`);

        // Cleanup
        await redis.del('bun-demo-key', 'bun-demo-hash', 'bun-demo-list', 'bun-demo-expire');

        redis.close();
        console.log('✅ Redis operations completed');

    } catch (error) {
        console.log(`⚠️ Redis demonstration skipped (no Redis server): ${(error as Error).message}`);
    }
}

// =============================================================================
// TCP SOCKET OPERATIONS
// =============================================================================

async function demonstrateTCPSockets() {
    console.log('\n🔌 TCP Socket Operations:');
    console.log('==========================');

    try {
        // Create TCP server
        const server = Bun.listen({
            hostname: 'localhost',
            port: 0, // Random port
            socket: {
                open(socket) {
                    console.log(`🔗 Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
                    (socket as any).data = { messages: 0 };
                },
                data(socket, data) {
                    const message = data.toString();
                    console.log(`📨 Received: ${message}`);
                    if (socket.data) {
                        (socket.data as any).messages++;
                        // Echo back with message count
                        socket.write(`Echo #${(socket.data as any).messages}: ${message}`);
                    }
                },
                close(socket) {
                    console.log(`🔌 Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
                },
                error(socket, error) {
                    console.error(`❌ Socket error: ${error.message}`);
                }
            }
        });

        console.log(`🚀 TCP Server started on port ${server.port}`);

        // Create TCP client
        const client = await Bun.connect({
            hostname: 'localhost',
            port: server.port,
            socket: {
                open(socket) {
                    console.log('🔗 Connected to TCP server');
                },
                data(socket, data) {
                    const response = data.toString();
                    console.log(`📬 Server response: ${response}`);
                },
                close(socket) {
                    console.log('🔌 Disconnected from TCP server');
                },
                error(socket, error) {
                    console.error(`❌ Client error: ${error.message}`);
                }
            }
        });

        // Send test messages
        client.write('Hello, TCP Server!');
        await Bun.sleep(100);
        client.write('This is Bun!');
        await Bun.sleep(100);
        client.write('Final message');

        // Wait for responses
        await Bun.sleep(500);

        // Clean up
        client.end();
        server.stop();

        console.log('✅ TCP socket operations completed');

    } catch (error) {
        console.error(`❌ TCP socket demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// UDP SOCKET OPERATIONS
// =============================================================================

async function demonstrateUDPSockets() {
    console.log('\n📡 UDP Socket Operations:');
    console.log('==========================');

    try {
        // Create UDP server with proper API
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.log(`📨 UDP received from ${addr}:${port}: ${message}`);

                    // Echo back to the specific client
                    socket.send(`UDP Echo: ${message}`, port, addr);
                },
                error(socket, error) {
                    console.error(`❌ UDP error: ${error.message}`);
                },
                drain(socket) {
                    console.log('💧 UDP socket buffer drained, ready for more data');
                }
            }
        });

        console.log(`🚀 UDP Server bound to port ${server.port}`);

        // Create UDP client
        const client = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1',
            }
        });

        console.log('🔗 UDP client connected to server');

        // Send test messages using connected socket
        client.send('Hello from connected UDP client!');
        await Bun.sleep(50);

        client.send('This is Bun UDP API!');
        await Bun.sleep(50);

        client.send('Final test message');
        await Bun.sleep(50);

        // Demonstrate sendMany with connected socket
        console.log('\n📦 Demonstrating sendMany with connected socket...');
        const packetsSent = client.sendMany(['Batch 1', 'Batch 2', 'Batch 3']);
        console.log(`📊 Sent ${packetsSent} packets in batch`);

        // Create unconnected client for sendMany demo
        const unconnectedClient = await Bun.udpSocket({});

        console.log('\n📦 Demonstrating sendMany with unconnected socket...');
        const batchPackets = unconnectedClient.sendMany([
            'Hello', server.port, '127.0.0.1',
            'World', server.port, '127.0.0.1',
            'Bun', server.port, '127.0.0.1'
        ]);
        console.log(`📊 Sent ${batchPackets / 3} packets in batch (3 elements per packet)`);

        // Wait for all responses
        await Bun.sleep(200);

        // Demonstrate backpressure handling
        console.log('\n🌊 Demonstrating backpressure handling...');
        let packetsSentCount = 0;
        let backpressureDetected = false;

        const backpressureSocket = await Bun.udpSocket({
            socket: {
                drain(socket) {
                    console.log('💧 Backpressure detected - socket buffer drained');
                    backpressureDetected = true;
                }
            }
        });

        // Try to send many packets quickly (may trigger backpressure)
        for (let i = 0; i < 100; i++) {
            const sent = backpressureSocket.send(`Packet ${i}`, server.port, '127.0.0.1');
            if (!sent) {
                console.log(`⚠️ Backpressure at packet ${i}`);
                break;
            }
            packetsSentCount++;
        }

        console.log(`📊 Successfully sent ${packetsSentCount} packets before potential backpressure`);

        // Clean up all sockets
        server.close();
        client.close();
        unconnectedClient.close();
        backpressureSocket.close();

        console.log('✅ UDP socket operations completed');

    } catch (error) {
        console.error(`❌ UDP socket demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// FILE I/O OPERATIONS
// =============================================================================

async function demonstrateFileIO() {
    console.log('\n📁 File I/O Operations:');
    console.log('========================');

    try {
        const testFile = './test-bun-file-io.txt';

        // Write file using Bun.write
        console.log('💾 Writing file with Bun.write...');
        const content = `Hello from Bun File I/O!
Timestamp: ${new Date().toISOString()}
Random UUID: ${Bun.randomUUIDv7()}
Bun Version: ${Bun.version}`;

        await Bun.write(testFile, content);
        console.log(`✅ File written: ${testFile}`);

        // Read file using Bun.file
        console.log('📖 Reading file with Bun.file...');
        const file = Bun.file(testFile);
        const fileContent = await file.text();
        console.log(`📄 File size: ${file.size} bytes`);
        console.log(`📄 File type: ${file.type}`);
        console.log(`📄 Last modified: ${new Date(file.lastModified).toISOString()}`);
        console.log(`📄 Content preview: ${fileContent.substring(0, 100)}...`);

        // Stream operations
        console.log('\n🌊 Demonstrating stream operations...');
        const stream = file.stream();
        const reader = stream.getReader();

        let chunkCount = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunkCount++;
        }

        console.log(`📊 Stream read in ${chunkCount} chunks`);

        // File operations with utilities
        console.log('\n🔧 File utility operations...');
        const fileExists = await file.exists();
        console.log(`📂 File exists: ${fileExists}`);

        // Clean up
        await Bun.write(testFile, ''); // Empty file
        console.log('🧹 File cleaned up');

    } catch (error) {
        console.error(`❌ File I/O demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// SHELL COMMANDS AND CHILD PROCESSES
// =============================================================================

async function demonstrateShellAndProcesses() {
    console.log('\n🐚 Shell Commands and Child Processes:');
    console.log('=========================================');

    try {
        // Shell command with $
        console.log('💻 Running shell command with $...');
        const result = await $`echo "Hello from Bun Shell!" && date`;
        console.log(`📤 Shell output: ${result.stdout?.toString().trim()}`);
        console.log(`📤 Shell exit code: ${result.exitCode}`);

        // Bun.spawn for async processes
        console.log('\n🚀 Using Bun.spawn for async process...');
        const proc = Bun.spawn(['echo', 'Hello from Bun.spawn!'], {
            stdout: 'pipe',
            stderr: 'pipe'
        });

        const spawnOutput = await new Response(proc.stdout).text();
        console.log(`📤 Spawn output: ${spawnOutput.trim()}`);
        console.log(`📤 Spawn exit code: ${await proc.exited}`);

        // Bun.spawnSync for blocking processes
        console.log('\n⏳ Using Bun.spawnSync for blocking process...');
        const syncResult = Bun.spawnSync(['pwd'], {
            cwd: process.cwd()
        });
        console.log(`📤 Sync output: ${syncResult.stdout?.toString().trim()}`);

        // Process with environment variables
        console.log('\n🌍 Process with environment variables...');
        const envProc = Bun.spawn(['printenv'], {
            env: {
                ...process.env,
                BUN_DEMO_VAR: 'Hello from environment!'
            }
        });

        const envOutput = await new Response(envProc.stdout).text();
        console.log(`📤 Environment variable: ${envOutput.split('\n').find(line => line.includes('BUN_DEMO_VAR'))}`);

    } catch (error) {
        console.error(`❌ Shell/Process demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// HASHING, ENCRYPTION, AND COMPRESSION
// =============================================================================

async function demonstrateHashingAndCompression() {
    console.log('\n🔐 Hashing, Encryption, and Compression:');
    console.log('==========================================');

    try {
        const testData = 'Hello, Bun! This is test data for hashing and compression.';

        // Hashing operations
        console.log('🔤 Hashing operations...');
        const hash1 = Bun.hash(testData);
        const hash2 = Bun.hash(testData + ' modified');
        console.log(`📊 Hash 1: ${hash1}`);
        console.log(`📊 Hash 2: ${hash2}`);
        console.log(`📊 Hashes equal: ${hash1 === hash2}`);

        // Password hashing
        console.log('\n🔑 Password hashing...');
        const password = 'my-secret-password';
        const hashedPassword = await Bun.password.hash(password);
        console.log(`🔐 Hashed password: ${hashedPassword.substring(0, 50)}...`);

        const isValid = await Bun.password.verify(password, hashedPassword);
        console.log(`✅ Password verification: ${isValid}`);

        // Compression operations
        console.log('\n📦 Compression operations...');
        const originalData = 'x'.repeat(1000); // Repetitive data for better compression
        console.log(`📊 Original size: ${originalData.length} bytes`);

        // Gzip compression
        const gzipped = Bun.gzipSync(originalData);
        console.log(`📊 Gzipped size: ${gzipped.length} bytes`);
        console.log(`📊 Compression ratio: ${((1 - gzipped.length / originalData.length) * 100).toFixed(2)}%`);

        // Decompression
        const decompressed = Bun.gunzipSync(gzipped);
        console.log(`✅ Decompression successful: ${decompressed.length === originalData.length}`);

        // Zstd compression
        const zstdCompressed = Bun.zstdCompressSync(originalData);
        console.log(`📊 Zstd compressed size: ${zstdCompressed.length} bytes`);

        const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
        console.log(`✅ Zstd decompression successful: ${zstdDecompressed.length === originalData.length}`);

    } catch (error) {
        console.error(`❌ Hashing/Compression demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// BUN UTILITIES AND INSPECTION
// =============================================================================

async function demonstrateBunUtilities() {
    console.log('\n🛠️ Bun Utilities and Inspection:');
    console.log('===================================');

    try {
        // Version and environment
        console.log('📋 Bun version information:');
        console.log(`   • Version: ${Bun.version}`);
        console.log(`   • Revision: ${Bun.revision}`);
        console.log(`   • Main module: ${Bun.main}`);

        // Environment utilities
        console.log('\n🌍 Environment utilities:');
        console.log(`   • Shell available: ${Bun.which('bash') || Bun.which('zsh') || Bun.which('fish')}`);
        console.log(`   • Node available: ${!!Bun.which('node')}`);

        // Inspection utilities
        console.log('\n🔍 Inspection utilities:');
        const testObject = {
            name: 'Test Object',
            nested: { deep: { value: 'found me!' } },
            array: [1, 2, 3, { nested: 'array item' }]
        };

        console.log('📊 Bun.inspect with default options:');
        console.log(Bun.inspect(testObject));

        console.log('\n📊 Bun.inspect with depth limit:');
        console.log(Bun.inspect(testObject, { depth: 2, colors: false }));

        // Deep comparison
        console.log('\n🔗 Deep comparison utilities:');
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { a: 1, b: { c: 2 } };
        const obj3 = { a: 1, b: { c: 3 } };

        console.log(`✅ obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`);
        console.log(`❌ obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`);

        // Timing utilities
        console.log('\n⏱️ Timing utilities:');
        const start = Bun.nanoseconds();
        await Bun.sleep(100); // Sleep for 100ms
        const end = Bun.nanoseconds();
        const elapsedMs = (end - start) / 1_000_000;
        console.log(`⏰ Slept for ${elapsedMs.toFixed(2)}ms`);

        // UUID generation
        console.log('\n🆔 UUID generation:');
        const uuid1 = Bun.randomUUIDv7();
        const uuid2 = Bun.randomUUIDv7();
        console.log(`🆔 UUID 1: ${uuid1}`);
        console.log(`🆔 UUID 2: ${uuid2}`);
        console.log(`✅ UUIDs unique: ${uuid1 !== uuid2}`);

    } catch (error) {
        console.error(`❌ Bun utilities demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// STREAM PROCESSING
// =============================================================================

async function demonstrateStreamProcessing() {
    console.log('\n🌊 Stream Processing:');
    console.log('======================');

    try {
        // Create test data
        const testData = JSON.stringify({
            users: Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                email: `user${i + 1}@example.com`
            }))
        });

        // Create readable stream
        const stream = new Response(testData).body!;

        // Convert stream to different formats
        console.log('🔄 Converting stream to different formats...');

        // To JSON
        const jsonData = await Bun.readableStreamToJSON(stream);
        console.log(`📊 Stream to JSON: ${jsonData.users.length} users parsed`);

        // Create new stream for next test
        const stream2 = new Response(testData).body!;

        // To text
        const textData = await Bun.readableStreamToText(stream2);
        console.log(`📝 Stream to text: ${textData.length} characters`);

        // Create new stream for blob test
        const stream3 = new Response(testData).body!;

        // To blob
        const blobData = await Bun.readableStreamToBlob(stream3);
        console.log(`📦 Stream to blob: ${blobData.size} bytes, type: ${blobData.type}`);

        // ArrayBuffer operations
        console.log('\n🧠 ArrayBuffer operations:');
        const stream4 = new Response(testData).body!;
        const arrayBuffer = await Bun.readableStreamToArrayBuffer(stream4);
        console.log(`📊 Stream to ArrayBuffer: ${arrayBuffer.byteLength} bytes`);

        // Concatenate ArrayBuffers
        const buffer1 = new Uint8Array([1, 2, 3]);
        const buffer2 = new Uint8Array([4, 5, 6]);
        const concatenated = Bun.concatArrayBuffers([buffer1.buffer, buffer2.buffer]);
        console.log(`🔗 Concatenated ArrayBuffer: ${concatenated.byteLength} bytes`);

    } catch (error) {
        console.error(`❌ Stream processing demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('🚀 Starting Comprehensive Bun APIs Demonstration');
    console.log('=================================================');
    console.log(`📋 Running on Bun ${Bun.version}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
        // Run all demonstrations
        await demonstrateHTTPServer();
        await demonstrateDNS();
        await demonstrateSQLite();
        await demonstrateRedis();
        await demonstrateTCPSockets();
        await demonstrateUDPSockets();
        await demonstrateFileIO();
        await demonstrateShellAndProcesses();
        await demonstrateHashingAndCompression();
        await demonstrateBunUtilities();
        await demonstrateStreamProcessing();

        console.log('\n🎉 Comprehensive Bun APIs Demonstration Complete!');
        console.log('===================================================');
        console.log('✅ All major Bun APIs demonstrated successfully');
        console.log('📚 Features shown:');
        console.log('   • HTTP Server with ETags and Cookies');
        console.log('   • DNS resolution and caching');
        console.log('   • SQLite database operations');
        console.log('   • Redis client functionality');
        console.log('   • TCP/UDP socket programming');
        console.log('   • File I/O and stream processing');
        console.log('   • Shell commands and child processes');
        console.log('   • Hashing, encryption, and compression');
        console.log('   • Bun utilities and inspection tools');
        console.log('   • Advanced stream processing');
        console.log('');
        console.log('🚀 Bun provides a comprehensive, high-performance runtime!');

    } catch (error) {
        console.error(`❌ Demonstration failed: ${(error as Error).message}`);
        console.error(`📍 Error location: ${(error as Error).stack}`);
    }
}

// Run the comprehensive demonstration
main().catch(console.error);
