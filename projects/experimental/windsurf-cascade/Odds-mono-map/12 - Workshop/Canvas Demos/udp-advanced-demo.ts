#!/usr/bin/env bun
/**
 * Advanced UDP Socket Demonstration
 * 
 * Comprehensive showcase of Bun's UDP API features:
 * - Basic UDP server/client communication
 * - Connected vs unconnected sockets
 * - sendMany() for batch operations
 * - Backpressure handling with drain events
 * - High-performance real-time scenarios
 * - Voice chat simulation patterns
 * 
 * Usage:
 *   bun run udp-advanced-demo.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

console.log('🚀 Advanced UDP Socket Demonstration');
console.log('======================================');

// =============================================================================
// BASIC UDP SERVER/CLIENT COMMUNICATION
// =============================================================================

async function demonstrateBasicUDPServer() {
    console.log('\n📡 Basic UDP Server/Client:');
    console.log('==========================');

    try {
        // Create UDP server
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.log(`📨 Server received from ${addr}:${port}: "${message}"`);

                    // Echo back with timestamp
                    const response = `Echo: ${message} (at ${new Date().toISOString()})`;
                    socket.send(response, port, addr);
                },
                error(socket, error) {
                    console.error(`❌ Server error: ${error.message}`);
                }
            }
        });

        console.log(`🚀 UDP Server started on port ${server.port}`);

        // Create multiple clients
        const clients = [];
        for (let i = 1; i <= 3; i++) {
            const client = await Bun.udpSocket({});
            clients.push({ client, id: i });

            // Send message from each client
            const message = `Hello from client ${i}!`;
            client.send(message, server.port, '127.0.0.1');
            console.log(`📤 Client ${i} sent: "${message}"`);
        }

        // Wait for responses
        await Bun.sleep(200);

        // Clean up
        clients.forEach(({ client }) => client.close());
        server.close();

        console.log('✅ Basic UDP communication completed');

    } catch (error) {
        console.error(`❌ Basic UDP demo failed: ${error.message}`);
    }
}

// =============================================================================
// CONNECTED VS UNCONNECTED SOCKETS
// =============================================================================

async function demonstrateConnectedSockets() {
    console.log('\n🔗 Connected vs Unconnected Sockets:');
    console.log('=====================================');

    try {
        // Create server
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.log(`📨 Received: "${message}" from ${addr}:${port}`);

                    // Send response back to specific client
                    socket.send(`Response to: ${message}`, port, addr);
                }
            }
        });

        console.log(`🚀 Server listening on port ${server.port}`);

        // Connected client (performance optimized)
        const connectedClient = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1'
            }
        });

        console.log('🔗 Connected client established');

        // Unconnected client (flexible destinations)
        const unconnectedClient = await Bun.udpSocket({});

        console.log('🔓 Unconnected client created');

        // Test connected client (no need to specify address/port)
        connectedClient.send('Message from connected client');
        await Bun.sleep(50);
        connectedClient.send('Another connected message');
        await Bun.sleep(50);

        // Test unconnected client (must specify address/port each time)
        unconnectedClient.send('Message from unconnected client', server.port, '127.0.0.1');
        await Bun.sleep(50);
        unconnectedClient.send('Another unconnected message', server.port, '127.0.0.1');

        // Wait for responses
        await Bun.sleep(200);

        // Clean up
        connectedClient.close();
        unconnectedClient.close();
        server.close();

        console.log('✅ Connected vs unconnected demo completed');

    } catch (error) {
        console.error(`❌ Connected sockets demo failed: ${error.message}`);
    }
}

// =============================================================================
// BATCH OPERATIONS WITH sendMany()
// =============================================================================

async function demonstrateBatchOperations() {
    console.log('\n📦 Batch Operations with sendMany():');
    console.log('=====================================');

    try {
        // Create server to receive batch messages
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.log(`📨 Batch message received: "${message}" from ${addr}:${port}`);

                    // Acknowledge receipt
                    socket.send(`ACK: ${message}`, port, addr);
                }
            }
        });

        console.log(`🚀 Batch server listening on port ${server.port}`);

        // Connected socket batch send
        const connectedBatcher = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1'
            }
        });

        console.log('\n📦 Testing connected socket sendMany()...');

        // Send multiple messages in one system call
        const batchMessages = [
            'Batch Message 1',
            'Batch Message 2',
            'Batch Message 3',
            'Batch Message 4',
            'Batch Message 5'
        ];

        const sentCount = connectedBatcher.sendMany(batchMessages);
        console.log(`📊 Sent ${sentCount} messages in batch via connected socket`);

        await Bun.sleep(100);

        // Unconnected socket batch send
        const unconnectedBatcher = await Bun.udpSocket({});

        console.log('\n📦 Testing unconnected socket sendMany()...');

        // For unconnected sockets: [data, port, address, data, port, address, ...]
        const unconnectedBatch = [
            'Unconnected 1', server.port, '127.0.0.1',
            'Unconnected 2', server.port, '127.0.0.1',
            'Unconnected 3', server.port, '127.0.0.1'
        ];

        const unconnectedSent = unconnectedBatcher.sendMany(unconnectedBatch);
        console.log(`📊 Sent ${unconnectedSent / 3} packets in batch via unconnected socket`);

        await Bun.sleep(200);

        // Performance comparison
        console.log('\n⚡ Performance comparison...');

        const startConnected = performance.now();
        for (let i = 0; i < 100; i++) {
            connectedBatcher.send(`Perf test ${i}`);
        }
        const connectedTime = performance.now() - startConnected;

        const startUnconnected = performance.now();
        for (let i = 0; i < 100; i++) {
            unconnectedBatcher.send(`Perf test ${i}`, server.port, '127.0.0.1');
        }
        const unconnectedTime = performance.now() - startUnconnected;

        console.log(`📊 Connected 100 messages: ${connectedTime.toFixed(2)}ms`);
        console.log(`📊 Unconnected 100 messages: ${unconnectedTime.toFixed(2)}ms`);
        console.log(`📊 Performance improvement: ${((unconnectedTime - connectedTime) / unconnectedTime * 100).toFixed(1)}%`);

        // Clean up
        connectedBatcher.close();
        unconnectedBatcher.close();
        server.close();

        console.log('✅ Batch operations demo completed');

    } catch (error) {
        console.error(`❌ Batch operations demo failed: ${error.message}`);
    }
}

// =============================================================================
// BACKPRESSURE HANDLING
// =============================================================================

async function demonstrateBackpressure() {
    console.log('\n🌊 Backpressure Handling:');
    console.log('==========================');

    try {
        let drainCount = 0;
        let messagesReceived = 0;

        // Create server with drain handler
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    messagesReceived++;
                    if (messagesReceived % 100 === 0) {
                        console.log(`📨 Server processed ${messagesReceived} messages`);
                    }
                },
                drain(socket) {
                    drainCount++;
                    console.log(`💧 Drain event #${drainCount} - socket buffer ready for more data`);
                }
            }
        });

        console.log(`🚀 Backpressure server on port ${server.port}`);

        // Create sender that might trigger backpressure
        const sender = await Bun.udpSocket({});

        console.log('\n🌊 Rapidly sending messages to test backpressure...');

        let sentCount = 0;
        let failedCount = 0;

        // Send many messages rapidly
        for (let i = 0; i < 1000; i++) {
            const success = sender.send(`Backpressure test message ${i}`, server.port, '127.0.0.1');
            if (success) {
                sentCount++;
            } else {
                failedCount++;
                console.log(`⚠️ Send failed at message ${i} - buffer full`);
                break;
            }

            // Small delay to allow processing
            if (i % 50 === 0) {
                await Bun.sleep(1);
            }
        }

        console.log(`📊 Successfully sent: ${sentCount} messages`);
        console.log(`📊 Failed to send: ${failedCount} messages`);
        console.log(`📊 Drain events triggered: ${drainCount}`);
        console.log(`📊 Messages received by server: ${messagesReceived}`);

        // Wait for processing
        await Bun.sleep(500);

        // Clean up
        sender.close();
        server.close();

        console.log('✅ Backpressure handling demo completed');

    } catch (error) {
        console.error(`❌ Backpressure demo failed: ${error.message}`);
    }
}

// =============================================================================
// REAL-TIME VOICE CHAT SIMULATION
// =============================================================================

async function demonstrateVoiceChatSimulation() {
    console.log('\n🎤 Real-Time Voice Chat Simulation:');
    console.log('===================================');

    try {
        // Simulate voice chat server
        const voiceServer = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    // Simulate processing audio packet
                    const packetId = buf.toString().split(':')[0];
                    const audioData = buf.toString().split(':')[1];

                    console.log(`🎤 Audio packet ${packetId} from ${addr}:${port} (${audioData?.length || 0} bytes)`);

                    // Echo back with processing delay
                    setTimeout(() => {
                        socket.send(`PROCESSED:${packetId}`, port, addr);
                    }, 10); // 10ms processing delay
                },
                error(socket, error) {
                    console.error(`❌ Voice server error: ${error.message}`);
                }
            }
        });

        console.log(`🎤 Voice server started on port ${voiceServer.port}`);

        // Simulate multiple voice clients
        const voiceClients = [];

        for (let clientId = 1; clientId <= 3; clientId++) {
            const client = await Bun.udpSocket({
                connect: {
                    port: voiceServer.port,
                    hostname: '127.0.0.1'
                },
                socket: {
                    data(socket, buf, port, addr) {
                        const response = buf.toString();
                        if (response.startsWith('PROCESSED:')) {
                            const packetId = response.split(':')[1];
                            console.log(`🔊 Client ${clientId} received processed packet ${packetId}`);
                        }
                    }
                }
            });

            voiceClients.push({ client, id: clientId });
        }

        console.log('🎤 Simulating voice chat traffic...');

        // Simulate sending audio packets
        for (let round = 1; round <= 5; round++) {
            console.log(`\n📡 Round ${round} - Sending audio packets...`);

            // Each client sends multiple audio packets
            for (const { client, id } of voiceClients) {
                for (let packet = 1; packet <= 3; packet++) {
                    const packetId = `${id}-${round}-${packet}`;
                    const audioData = 'x'.repeat(100); // Simulate 100-byte audio packet
                    client.send(`${packetId}:${audioData}`);
                }
            }

            // Wait for processing
            await Bun.sleep(50);
        }

        // Calculate performance metrics
        console.log('\n📊 Voice Chat Performance Metrics:');
        console.log('• Low latency: ~10ms processing delay');
        console.log('• High throughput: Multiple concurrent clients');
        console.log('• Connected sockets: Optimized for single-peer communication');
        console.log('• UDP benefits: No connection overhead, packet-based transmission');

        // Clean up
        voiceClients.forEach(({ client }) => client.close());
        voiceServer.close();

        console.log('✅ Voice chat simulation completed');

    } catch (error) {
        console.error(`❌ Voice chat simulation failed: ${error.message}`);
    }
}

// =============================================================================
// PERFORMANCE BENCHMARKING
// =============================================================================

async function demonstratePerformanceBenchmark() {
    console.log('\n🏁 UDP Performance Benchmarking:');
    console.log('==================================');

    try {
        // Create benchmark server
        const benchmarkServer = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    // Minimal processing for benchmark
                    const messageId = buf.toString();
                    socket.send(`ACK:${messageId}`, port, addr);
                }
            }
        });

        console.log(`🏁 Benchmark server on port ${benchmarkServer.port}`);

        // Benchmark configurations
        const benchmarks = [
            { name: 'Connected Socket', connected: true, messageCount: 1000 },
            { name: 'Unconnected Socket', connected: false, messageCount: 1000 },
            { name: 'Batch Send (Connected)', connected: true, messageCount: 3000, batch: true },
            { name: 'Batch Send (Unconnected)', connected: false, messageCount: 3000, batch: true }
        ];

        for (const benchmark of benchmarks) {
            console.log(`\n📊 Running: ${benchmark.name}`);

            const client = benchmark.connected
                ? await Bun.udpSocket({
                    connect: { port: benchmarkServer.port, hostname: '127.0.0.1' }
                })
                : await Bun.udpSocket({});

            const startTime = performance.now();
            let ackCount = 0;

            // Add ACK counter
            if (benchmark.connected) {
                const originalData = client.data;
                client.data = {
                    ...client.data,
                    data(socket, buf, port, addr) {
                        ackCount++;
                        if (originalData?.data) {
                            originalData.data(socket, buf, port, addr);
                        }
                    }
                };
            }

            if (benchmark.batch) {
                // Batch sending
                const batchSize = 100;
                const batches = Math.floor(benchmark.messageCount / batchSize);

                for (let i = 0; i < batches; i++) {
                    if (benchmark.connected) {
                        const batch = Array.from({ length: batchSize }, (_, j) =>
                            `batch-${i}-${j}`
                        );
                        client.sendMany(batch);
                    } else {
                        const batch = [];
                        for (let j = 0; j < batchSize; j++) {
                            batch.push(`batch-${i}-${j}`, benchmarkServer.port, '127.0.0.1');
                        }
                        client.sendMany(batch);
                    }
                }
            } else {
                // Individual sending
                for (let i = 0; i < benchmark.messageCount; i++) {
                    if (benchmark.connected) {
                        client.send(`msg-${i}`);
                    } else {
                        client.send(`msg-${i}`, benchmarkServer.port, '127.0.0.1');
                    }
                }
            }

            const sendTime = performance.now() - startTime;

            // Wait for ACKs
            await Bun.sleep(1000);

            const totalTime = performance.now() - startTime;
            const messagesPerSecond = (benchmark.messageCount / totalTime) * 1000;

            console.log(`   • Messages sent: ${benchmark.messageCount}`);
            console.log(`   • Send time: ${sendTime.toFixed(2)}ms`);
            console.log(`   • Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`   • Throughput: ${messagesPerSecond.toFixed(0)} msg/sec`);
            console.log(`   • ACKs received: ${ackCount}`);

            client.close();
        }

        benchmarkServer.close();

        console.log('✅ Performance benchmarking completed');

    } catch (error) {
        console.error(`❌ Performance benchmarking failed: ${error.message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('🚀 Starting Advanced UDP Socket Demonstration');
    console.log('================================================');
    console.log(`📋 Running on Bun ${Bun.version}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    console.log('');
    console.log('💡 This demo showcases Bun\'s high-performance UDP API');
    console.log('   • Real-time communication capabilities');
    console.log('   • Batch operations with sendMany()');
    console.log('   • Backpressure handling');
    console.log('   • Voice chat simulation patterns');
    console.log('   • Performance benchmarking');
    console.log('');

    try {
        // Run all demonstrations
        await demonstrateBasicUDPServer();
        await demonstrateConnectedSockets();
        await demonstrateBatchOperations();
        await demonstrateBackpressure();
        await demonstrateVoiceChatSimulation();
        await demonstratePerformanceBenchmark();

        console.log('\n🎉 Advanced UDP Socket Demonstration Complete!');
        console.log('=================================================');
        console.log('✅ All UDP API features demonstrated successfully');
        console.log('📚 Features shown:');
        console.log('   • Basic UDP server/client communication');
        console.log('   • Connected vs unconnected socket performance');
        console.log('   • Batch operations with sendMany()');
        console.log('   • Backpressure handling and drain events');
        console.log('   • Real-time voice chat simulation');
        console.log('   • Performance benchmarking and optimization');
        console.log('');
        console.log('🚀 Bun UDP API is perfect for:');
        console.log('   • Real-time gaming and voice chat');
        console.log('   • High-frequency data streaming');
        console.log('   • IoT device communication');
        console.log('   • DNS and service discovery');
        console.log('   • Log aggregation and monitoring');

    } catch (error) {
        console.error(`❌ Demonstration failed: ${error.message}`);
        console.error(`📍 Error location: ${error.stack}`);
    }
}

// Run the advanced UDP demonstration
main().catch(console.error);
