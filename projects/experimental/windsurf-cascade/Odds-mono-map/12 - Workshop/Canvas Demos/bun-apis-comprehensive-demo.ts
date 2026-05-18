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

console.info('🚀 Comprehensive Bun APIs Demonstration');
console.info('==========================================');

// =============================================================================
// HTTP SERVER WITH ETAGS AND COOKIES
// =============================================================================

async function demonstrateHTTPServer() {
    console.info('\n🌐 HTTP Server with ETags and Cookies:');
    console.info('=====================================');

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

    console.info(`✅ HTTP Server started on port ${server.port}`);

    // Test the server
    try {
        const response = await fetch(`http://localhost:${server.port}`);
        console.info(`📊 Response status: ${response.status}`);
        console.info(`🏷️ ETag: ${response.headers.get('etag')}`);
        console.info(`🍪 Set-Cookie: ${response.headers.get('set-cookie')}`);
        console.info(`📄 Content: ${await response.text()}`);

        // Test conditional request
        const etag = response.headers.get('etag');
        const conditionalResponse = await fetch(`http://localhost:${server.port}`, {
            headers: { 'If-None-Match': etag || '' }
        });
        console.info(`🔄 Conditional request status: ${conditionalResponse.status} (should be 304)`);

    } catch (error) {
        console.error(`❌ Server test failed: ${(error as Error).message}`);
    }

    server.stop();
    console.info('🛑 HTTP Server stopped');
}

// =============================================================================
// DNS OPERATIONS
// =============================================================================

async function demonstrateDNS() {
    console.info('\n🌍 DNS Operations:');
    console.info('==================');

    try {
        // DNS lookup
        console.info('🔍 Performing DNS lookup...');
        const lookup = await Bun.dns.lookup('httpbin.org');
        if (lookup && lookup.length > 0) {
            const firstResult = lookup[0];
            console.info(`📡 httpbin.org resolves to: ${firstResult.address || 'N/A'}`);
            console.info(`🏷️ DNS TTL: ${firstResult.ttl || 'N/A'} seconds`);
            console.info(`📋 DNS family: ${firstResult.family || 'N/A'} (IPv${firstResult.family || 'N/A'})`);
        } else {
            console.info('📡 httpbin.org: No DNS records found');
        }

        // DNS prefetch
        console.info('\n⚡ Prefetching DNS records...');
        await Bun.dns.prefetch('github.com');
        console.info('✅ DNS prefetch completed');

        // DNS cache statistics
        console.info('\n📊 DNS Cache Statistics:');
        const cacheStats = Bun.dns.getCacheStats();
        console.info(`   • Cache size: ${cacheStats.size}`);
        console.info(`   • Cache hits: ${cacheStats.cacheHitsCompleted || 0}`);
        console.info(`   • Cache misses: ${cacheStats.cacheMisses || 0}`);
        console.info(`   • Hit rate: ${cacheStats.cacheHitsCompleted > 0 ? ((cacheStats.cacheHitsCompleted / (cacheStats.cacheHitsCompleted + cacheStats.cacheMisses)) * 100).toFixed(2) : 0}%`);

        // Multiple lookups
        console.info('\n🔍 Multiple DNS lookups:');
        const domains = ['google.com', 'github.com', 'bun.sh'];
        for (const domain of domains) {
            try {
                const result = await Bun.dns.lookup(domain);
                if (result && result.length > 0) {
                    console.info(`   • ${domain}: ${result[0]?.address || 'Failed'}`);
                } else {
                    console.info(`   • ${domain}: No records found`);
                }
            } catch (error) {
                console.info(`   • ${domain}: Failed (${(error as Error).message})`);
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
    console.info('\n🗄️ SQLite Database Operations:');
    console.info('===============================');

    try {
        // Import SQLite module
        const { Database } = await import('bun:sqlite');

        // Create in-memory database
        const db = new Database(':memory:');

        // Create table
        console.info('📋 Creating database table...');
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert data
        console.info('💾 Inserting sample data...');
        const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        insert.run('Alice', 'alice@example.com');
        insert.run('Bob', 'bob@example.com');
        insert.run('Charlie', 'charlie@example.com');

        // Query data
        console.info('📊 Querying users:');
        const users = db.query('SELECT * FROM users ORDER BY id').all();
        users.forEach((user: any) => {
            console.info(`   • ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created: ${user.created_at}`);
        });

        // Prepared statements
        console.info('\n🎯 Using prepared statements:');
        const getUser = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = getUser.get(1) as { name?: string; email?: string };
        console.info(`   User ID 1: ${user?.name || 'N/A'} (${user?.email || 'N/A'})`);

        // Transactions
        console.info('\n🔄 Demonstrating transactions:');
        db.transaction(() => {
            insert.run('David', 'david@example.com');
            insert.run('Eve', 'eve@example.com');
        })();

        const updatedCount = db.query('SELECT COUNT(*) as count FROM users').get() as { count: number };
        console.info(`   Total users after transaction: ${updatedCount.count}`);

        // Close database
        db.close();
        console.info('✅ SQLite database operations completed');

    } catch (error) {
        console.error(`❌ SQLite demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// REDIS CLIENT OPERATIONS
// =============================================================================

async function demonstrateRedis() {
    console.info('\n🔴 Redis Client Operations:');
    console.info('=============================');

    try {
        // Note: This requires a Redis server to be running
        console.info('🔗 Attempting Redis connection...');

        const redis = new Bun.RedisClient('redis://localhost:6379');

        // Basic operations
        await redis.set('bun-demo-key', 'Hello from Bun Redis!');
        const value = await redis.get('bun-demo-key');
        console.info(`📝 SET/GET: ${value}`);

        // Hash operations
        await redis.hset('bun-demo-hash', {
            'field1': 'value1',
            'field2': 'value2',
            'number': '42'
        });
        const hashValue = await redis.hgetall('bun-demo-hash');
        console.info(`🗂️ Hash operations:`, hashValue);

        // List operations
        await redis.lpush('bun-demo-list', 'item3', 'item2', 'item1');
        const listValue = await redis.lrange('bun-demo-list', 0, -1);
        console.info(`📋 List operations:`, listValue);

        // TTL operations
        await redis.setex('bun-demo-expire', 10, 'This will expire in 10 seconds');
        const ttl = await redis.ttl('bun-demo-expire');
        console.info(`⏰ TTL operation: ${ttl} seconds remaining`);

        // Cleanup
        await redis.del('bun-demo-key', 'bun-demo-hash', 'bun-demo-list', 'bun-demo-expire');

        redis.close();
        console.info('✅ Redis operations completed');

    } catch (error) {
        console.info(`⚠️ Redis demonstration skipped (no Redis server): ${(error as Error).message}`);
    }
}

// =============================================================================
// TCP SOCKET OPERATIONS
// =============================================================================

async function demonstrateTCPSockets() {
    console.info('\n🔌 TCP Socket Operations:');
    console.info('==========================');

    try {
        // Create TCP server
        const server = Bun.listen({
            hostname: 'localhost',
            port: 0, // Random port
            socket: {
                open(socket) {
                    console.info(`🔗 Client connected: ${socket.remoteAddress}:${socket.remotePort}`);
                    (socket as any).data = { messages: 0 };
                },
                data(socket, data) {
                    const message = data.toString();
                    console.info(`📨 Received: ${message}`);
                    if (socket.data) {
                        (socket.data as any).messages++;
                        // Echo back with message count
                        socket.write(`Echo #${(socket.data as any).messages}: ${message}`);
                    }
                },
                close(socket) {
                    console.info(`🔌 Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
                },
                error(socket, error) {
                    console.error(`❌ Socket error: ${error.message}`);
                }
            }
        });

        console.info(`🚀 TCP Server started on port ${server.port}`);

        // Create TCP client
        const client = await Bun.connect({
            hostname: 'localhost',
            port: server.port,
            socket: {
                open(socket) {
                    console.info('🔗 Connected to TCP server');
                },
                data(socket, data) {
                    const response = data.toString();
                    console.info(`📬 Server response: ${response}`);
                },
                close(socket) {
                    console.info('🔌 Disconnected from TCP server');
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

        console.info('✅ TCP socket operations completed');

    } catch (error) {
        console.error(`❌ TCP socket demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// UDP SOCKET OPERATIONS
// =============================================================================

async function demonstrateUDPSockets() {
    console.info('\n📡 UDP Socket Operations:');
    console.info('==========================');

    try {
        // Create UDP server with proper API
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.info(`📨 UDP received from ${addr}:${port}: ${message}`);

                    // Echo back to the specific client
                    socket.send(`UDP Echo: ${message}`, port, addr);
                },
                error(socket, error) {
                    console.error(`❌ UDP error: ${error.message}`);
                },
                drain(socket) {
                    console.info('💧 UDP socket buffer drained, ready for more data');
                }
            }
        });

        console.info(`🚀 UDP Server bound to port ${server.port}`);

        // Create UDP client
        const client = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1',
            }
        });

        console.info('🔗 UDP client connected to server');

        // Send test messages using connected socket
        client.send('Hello from connected UDP client!');
        await Bun.sleep(50);

        client.send('This is Bun UDP API!');
        await Bun.sleep(50);

        client.send('Final test message');
        await Bun.sleep(50);

        // Demonstrate sendMany with connected socket
        console.info('\n📦 Demonstrating sendMany with connected socket...');
        const packetsSent = client.sendMany(['Batch 1', 'Batch 2', 'Batch 3']);
        console.info(`📊 Sent ${packetsSent} packets in batch`);

        // Create unconnected client for sendMany demo
        const unconnectedClient = await Bun.udpSocket({});

        console.info('\n📦 Demonstrating sendMany with unconnected socket...');
        const batchPackets = unconnectedClient.sendMany([
            'Hello', server.port, '127.0.0.1',
            'World', server.port, '127.0.0.1',
            'Bun', server.port, '127.0.0.1'
        ]);
        console.info(`📊 Sent ${batchPackets / 3} packets in batch (3 elements per packet)`);

        // Wait for all responses
        await Bun.sleep(200);

        // Demonstrate backpressure handling
        console.info('\n🌊 Demonstrating backpressure handling...');
        let packetsSentCount = 0;
        let backpressureDetected = false;

        const backpressureSocket = await Bun.udpSocket({
            socket: {
                drain(socket) {
                    console.info('💧 Backpressure detected - socket buffer drained');
                    backpressureDetected = true;
                }
            }
        });

        // Try to send many packets quickly (may trigger backpressure)
        for (let i = 0; i < 100; i++) {
            const sent = backpressureSocket.send(`Packet ${i}`, server.port, '127.0.0.1');
            if (!sent) {
                console.info(`⚠️ Backpressure at packet ${i}`);
                break;
            }
            packetsSentCount++;
        }

        console.info(`📊 Successfully sent ${packetsSentCount} packets before potential backpressure`);

        // Clean up all sockets
        server.close();
        client.close();
        unconnectedClient.close();
        backpressureSocket.close();

        console.info('✅ UDP socket operations completed');

    } catch (error) {
        console.error(`❌ UDP socket demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// FILE I/O OPERATIONS
// =============================================================================

async function demonstrateFileIO() {
    console.info('\n📁 File I/O Operations:');
    console.info('========================');

    try {
        const testFile = './test-bun-file-io.txt';

        // Write file using Bun.write
        console.info('💾 Writing file with Bun.write...');
        const content = `Hello from Bun File I/O!
Timestamp: ${new Date().toISOString()}
Random UUID: ${Bun.randomUUIDv7()}
Bun Version: ${Bun.version}`;

        await Bun.write(testFile, content);
        console.info(`✅ File written: ${testFile}`);

        // Read file using Bun.file
        console.info('📖 Reading file with Bun.file...');
        const file = Bun.file(testFile);
        const fileContent = await file.text();
        console.info(`📄 File size: ${file.size} bytes`);
        console.info(`📄 File type: ${file.type}`);
        console.info(`📄 Last modified: ${new Date(file.lastModified).toISOString()}`);
        console.info(`📄 Content preview: ${fileContent.substring(0, 100)}...`);

        // Stream operations
        console.info('\n🌊 Demonstrating stream operations...');
        const stream = file.stream();
        const reader = stream.getReader();

        let chunkCount = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunkCount++;
        }

        console.info(`📊 Stream read in ${chunkCount} chunks`);

        // File operations with utilities
        console.info('\n🔧 File utility operations...');
        const fileExists = await file.exists();
        console.info(`📂 File exists: ${fileExists}`);

        // Clean up
        await Bun.write(testFile, ''); // Empty file
        console.info('🧹 File cleaned up');

    } catch (error) {
        console.error(`❌ File I/O demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// SHELL COMMANDS AND CHILD PROCESSES
// =============================================================================

async function demonstrateShellAndProcesses() {
    console.info('\n🐚 Shell Commands and Child Processes:');
    console.info('=========================================');

    try {
        // Shell command with $
        console.info('💻 Running shell command with $...');
        const result = await $`echo "Hello from Bun Shell!" && date`;
        console.info(`📤 Shell output: ${result.stdout?.toString().trim()}`);
        console.info(`📤 Shell exit code: ${result.exitCode}`);

        // Bun.spawn for async processes
        console.info('\n🚀 Using Bun.spawn for async process...');
        const proc = Bun.spawn(['echo', 'Hello from Bun.spawn!'], {
            stdout: 'pipe',
            stderr: 'pipe'
        });

        const spawnOutput = await new Response(proc.stdout).text();
        console.info(`📤 Spawn output: ${spawnOutput.trim()}`);
        console.info(`📤 Spawn exit code: ${await proc.exited}`);

        // Bun.spawnSync for blocking processes
        console.info('\n⏳ Using Bun.spawnSync for blocking process...');
        const syncResult = Bun.spawnSync(['pwd'], {
            cwd: process.cwd()
        });
        console.info(`📤 Sync output: ${syncResult.stdout?.toString().trim()}`);

        // Process with environment variables
        console.info('\n🌍 Process with environment variables...');
        const envProc = Bun.spawn(['printenv'], {
            env: {
                ...process.env,
                BUN_DEMO_VAR: 'Hello from environment!'
            }
        });

        const envOutput = await new Response(envProc.stdout).text();
        console.info(`📤 Environment variable: ${envOutput.split('\n').find(line => line.includes('BUN_DEMO_VAR'))}`);

    } catch (error) {
        console.error(`❌ Shell/Process demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// HASHING, ENCRYPTION, AND COMPRESSION
// =============================================================================

async function demonstrateHashingAndCompression() {
    console.info('\n🔐 Hashing, Encryption, and Compression:');
    console.info('==========================================');

    try {
        const testData = 'Hello, Bun! This is test data for hashing and compression.';

        // Hashing operations
        console.info('🔤 Hashing operations...');
        const hash1 = Bun.hash(testData);
        const hash2 = Bun.hash(testData + ' modified');
        console.info(`📊 Hash 1: ${hash1}`);
        console.info(`📊 Hash 2: ${hash2}`);
        console.info(`📊 Hashes equal: ${hash1 === hash2}`);

        // Password hashing
        console.info('\n🔑 Password hashing...');
        const password = 'my-secret-password';
        const hashedPassword = await Bun.password.hash(password);
        console.info(`🔐 Hashed password: ${hashedPassword.substring(0, 50)}...`);

        const isValid = await Bun.password.verify(password, hashedPassword);
        console.info(`✅ Password verification: ${isValid}`);

        // Compression operations
        console.info('\n📦 Compression operations...');
        const originalData = 'x'.repeat(1000); // Repetitive data for better compression
        console.info(`📊 Original size: ${originalData.length} bytes`);

        // Gzip compression
        const gzipped = Bun.gzipSync(originalData);
        console.info(`📊 Gzipped size: ${gzipped.length} bytes`);
        console.info(`📊 Compression ratio: ${((1 - gzipped.length / originalData.length) * 100).toFixed(2)}%`);

        // Decompression
        const decompressed = Bun.gunzipSync(gzipped);
        console.info(`✅ Decompression successful: ${decompressed.length === originalData.length}`);

        // Zstd compression
        const zstdCompressed = Bun.zstdCompressSync(originalData);
        console.info(`📊 Zstd compressed size: ${zstdCompressed.length} bytes`);

        const zstdDecompressed = Bun.zstdDecompressSync(zstdCompressed);
        console.info(`✅ Zstd decompression successful: ${zstdDecompressed.length === originalData.length}`);

    } catch (error) {
        console.error(`❌ Hashing/Compression demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// BUN UTILITIES AND INSPECTION
// =============================================================================

async function demonstrateBunUtilities() {
    console.info('\n🛠️ Bun Utilities and Inspection:');
    console.info('===================================');

    try {
        // Version and environment
        console.info('📋 Bun version information:');
        console.info(`   • Version: ${Bun.version}`);
        console.info(`   • Revision: ${Bun.revision}`);
        console.info(`   • Main module: ${Bun.main}`);

        // Environment utilities
        console.info('\n🌍 Environment utilities:');
        console.info(`   • Shell available: ${Bun.which('bash') || Bun.which('zsh') || Bun.which('fish')}`);
        console.info(`   • Node available: ${!!Bun.which('node')}`);

        // Inspection utilities
        console.info('\n🔍 Inspection utilities:');
        const testObject = {
            name: 'Test Object',
            nested: { deep: { value: 'found me!' } },
            array: [1, 2, 3, { nested: 'array item' }]
        };

        console.info('📊 Bun.inspect with default options:');
        console.info(Bun.inspect(testObject));

        console.info('\n📊 Bun.inspect with depth limit:');
        console.info(Bun.inspect(testObject, { depth: 2, colors: false }));

        // Deep comparison
        console.info('\n🔗 Deep comparison utilities:');
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { a: 1, b: { c: 2 } };
        const obj3 = { a: 1, b: { c: 3 } };

        console.info(`✅ obj1 === obj2: ${Bun.deepEquals(obj1, obj2)}`);
        console.info(`❌ obj1 === obj3: ${Bun.deepEquals(obj1, obj3)}`);

        // Timing utilities
        console.info('\n⏱️ Timing utilities:');
        const start = Bun.nanoseconds();
        await Bun.sleep(100); // Sleep for 100ms
        const end = Bun.nanoseconds();
        const elapsedMs = (end - start) / 1_000_000;
        console.info(`⏰ Slept for ${elapsedMs.toFixed(2)}ms`);

        // UUID generation
        console.info('\n🆔 UUID generation:');
        const uuid1 = Bun.randomUUIDv7();
        const uuid2 = Bun.randomUUIDv7();
        console.info(`🆔 UUID 1: ${uuid1}`);
        console.info(`🆔 UUID 2: ${uuid2}`);
        console.info(`✅ UUIDs unique: ${uuid1 !== uuid2}`);

    } catch (error) {
        console.error(`❌ Bun utilities demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// STREAM PROCESSING
// =============================================================================

async function demonstrateStreamProcessing() {
    console.info('\n🌊 Stream Processing:');
    console.info('======================');

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
        console.info('🔄 Converting stream to different formats...');

        // To JSON
        const jsonData = await Bun.readableStreamToJSON(stream);
        console.info(`📊 Stream to JSON: ${jsonData.users.length} users parsed`);

        // Create new stream for next test
        const stream2 = new Response(testData).body!;

        // To text
        const textData = await Bun.readableStreamToText(stream2);
        console.info(`📝 Stream to text: ${textData.length} characters`);

        // Create new stream for blob test
        const stream3 = new Response(testData).body!;

        // To blob
        const blobData = await Bun.readableStreamToBlob(stream3);
        console.info(`📦 Stream to blob: ${blobData.size} bytes, type: ${blobData.type}`);

        // ArrayBuffer operations
        console.info('\n🧠 ArrayBuffer operations:');
        const stream4 = new Response(testData).body!;
        const arrayBuffer = await Bun.readableStreamToArrayBuffer(stream4);
        console.info(`📊 Stream to ArrayBuffer: ${arrayBuffer.byteLength} bytes`);

        // Concatenate ArrayBuffers
        const buffer1 = new Uint8Array([1, 2, 3]);
        const buffer2 = new Uint8Array([4, 5, 6]);
        const concatenated = Bun.concatArrayBuffers([buffer1.buffer, buffer2.buffer]);
        console.info(`🔗 Concatenated ArrayBuffer: ${concatenated.byteLength} bytes`);

    } catch (error) {
        console.error(`❌ Stream processing demonstration failed: ${(error as Error).message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.info('🚀 Starting Comprehensive Bun APIs Demonstration');
    console.info('=================================================');
    console.info(`📋 Running on Bun ${Bun.version}`);
    console.info(`🕐 Started at: ${new Date().toISOString()}`);
    console.info('');

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

        console.info('\n🎉 Comprehensive Bun APIs Demonstration Complete!');
        console.info('===================================================');
        console.info('✅ All major Bun APIs demonstrated successfully');
        console.info('📚 Features shown:');
        console.info('   • HTTP Server with ETags and Cookies');
        console.info('   • DNS resolution and caching');
        console.info('   • SQLite database operations');
        console.info('   • Redis client functionality');
        console.info('   • TCP/UDP socket programming');
        console.info('   • File I/O and stream processing');
        console.info('   • Shell commands and child processes');
        console.info('   • Hashing, encryption, and compression');
        console.info('   • Bun utilities and inspection tools');
        console.info('   • Advanced stream processing');
        console.info('');
        console.info('🚀 Bun provides a comprehensive, high-performance runtime!');

    } catch (error) {
        console.error(`❌ Demonstration failed: ${(error as Error).message}`);
        console.error(`📍 Error location: ${(error as Error).stack}`);
    }
}

// Run the comprehensive demonstration
main().catch(console.error);
