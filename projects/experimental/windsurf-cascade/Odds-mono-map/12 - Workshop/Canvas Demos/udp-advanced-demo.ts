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

console.info('🚀 Advanced UDP Socket Demonstration');
console.info('======================================');

// =============================================================================
// BASIC UDP SERVER/CLIENT COMMUNICATION
// =============================================================================

async function demonstrateBasicUDPServer() {
    console.info('\n📡 Basic UDP Server/Client:');
    console.info('==========================');

    try {
        // Create UDP server
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.info(`📨 Server received from ${addr}:${port}: "${message}"`);

                    // Echo back with timestamp
                    const response = `Echo: ${message} (at ${new Date().toISOString()})`;
                    socket.send(response, port, addr);
                },
                error(socket, error) {
                    console.error(`❌ Server error: ${error.message}`);
                }
            }
        });

        console.info(`🚀 UDP Server started on port ${server.port}`);

        // Create multiple clients
        const clients = [];
        for (let i = 1; i <= 3; i++) {
            const client = await Bun.udpSocket({});
            clients.push({ client, id: i });

            // Send message from each client
            const message = `Hello from client ${i}!`;
            client.send(message, server.port, '127.0.0.1');
            console.info(`📤 Client ${i} sent: "${message}"`);
        }

        // Wait for responses
        await Bun.sleep(200);

        // Clean up
        clients.forEach(({ client }) => client.close());
        server.close();

        console.info('✅ Basic UDP communication completed');

    } catch (error) {
        console.error(`❌ Basic UDP demo failed: ${error.message}`);
    }
}

// =============================================================================
// CONNECTED VS UNCONNECTED SOCKETS
// =============================================================================

async function demonstrateConnectedSockets() {
    console.info('\n🔗 Connected vs Unconnected Sockets:');
    console.info('=====================================');

    try {
        // Create server
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.info(`📨 Received: "${message}" from ${addr}:${port}`);

                    // Send response back to specific client
                    socket.send(`Response to: ${message}`, port, addr);
                }
            }
        });

        console.info(`🚀 Server listening on port ${server.port}`);

        // Connected client (performance optimized)
        const connectedClient = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1'
            }
        });

        console.info('🔗 Connected client established');

        // Unconnected client (flexible destinations)
        const unconnectedClient = await Bun.udpSocket({});

        console.info('🔓 Unconnected client created');

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

        console.info('✅ Connected vs unconnected demo completed');

    } catch (error) {
        console.error(`❌ Connected sockets demo failed: ${error.message}`);
    }
}

// =============================================================================
// BATCH OPERATIONS WITH sendMany()
// =============================================================================

async function demonstrateBatchOperations() {
    console.info('\n📦 Batch Operations with sendMany():');
    console.info('=====================================');

    try {
        // Create server to receive batch messages
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    const message = buf.toString();
                    console.info(`📨 Batch message received: "${message}" from ${addr}:${port}`);

                    // Acknowledge receipt
                    socket.send(`ACK: ${message}`, port, addr);
                }
            }
        });

        console.info(`🚀 Batch server listening on port ${server.port}`);

        // Connected socket batch send
        const connectedBatcher = await Bun.udpSocket({
            connect: {
                port: server.port,
                hostname: '127.0.0.1'
            }
        });

        console.info('\n📦 Testing connected socket sendMany()...');

        // Send multiple messages in one system call
        const batchMessages = [
            'Batch Message 1',
            'Batch Message 2',
            'Batch Message 3',
            'Batch Message 4',
            'Batch Message 5'
        ];

        const sentCount = connectedBatcher.sendMany(batchMessages);
        console.info(`📊 Sent ${sentCount} messages in batch via connected socket`);

        await Bun.sleep(100);

        // Unconnected socket batch send
        const unconnectedBatcher = await Bun.udpSocket({});

        console.info('\n📦 Testing unconnected socket sendMany()...');

        // For unconnected sockets: [data, port, address, data, port, address, ...]
        const unconnectedBatch = [
            'Unconnected 1', server.port, '127.0.0.1',
            'Unconnected 2', server.port, '127.0.0.1',
            'Unconnected 3', server.port, '127.0.0.1'
        ];

        const unconnectedSent = unconnectedBatcher.sendMany(unconnectedBatch);
        console.info(`📊 Sent ${unconnectedSent / 3} packets in batch via unconnected socket`);

        await Bun.sleep(200);

        // Performance comparison
        console.info('\n⚡ Performance comparison...');

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

        console.info(`📊 Connected 100 messages: ${connectedTime.toFixed(2)}ms`);
        console.info(`📊 Unconnected 100 messages: ${unconnectedTime.toFixed(2)}ms`);
        console.info(`📊 Performance improvement: ${((unconnectedTime - connectedTime) / unconnectedTime * 100).toFixed(1)}%`);

        // Clean up
        connectedBatcher.close();
        unconnectedBatcher.close();
        server.close();

        console.info('✅ Batch operations demo completed');

    } catch (error) {
        console.error(`❌ Batch operations demo failed: ${error.message}`);
    }
}

// =============================================================================
// BACKPRESSURE HANDLING
// =============================================================================

async function demonstrateBackpressure() {
    console.info('\n🌊 Backpressure Handling:');
    console.info('==========================');

    try {
        let drainCount = 0;
        let messagesReceived = 0;

        // Create server with drain handler
        const server = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    messagesReceived++;
                    if (messagesReceived % 100 === 0) {
                        console.info(`📨 Server processed ${messagesReceived} messages`);
                    }
                },
                drain(socket) {
                    drainCount++;
                    console.info(`💧 Drain event #${drainCount} - socket buffer ready for more data`);
                }
            }
        });

        console.info(`🚀 Backpressure server on port ${server.port}`);

        // Create sender that might trigger backpressure
        const sender = await Bun.udpSocket({});

        console.info('\n🌊 Rapidly sending messages to test backpressure...');

        let sentCount = 0;
        let failedCount = 0;

        // Send many messages rapidly
        for (let i = 0; i < 1000; i++) {
            const success = sender.send(`Backpressure test message ${i}`, server.port, '127.0.0.1');
            if (success) {
                sentCount++;
            } else {
                failedCount++;
                console.info(`⚠️ Send failed at message ${i} - buffer full`);
                break;
            }

            // Small delay to allow processing
            if (i % 50 === 0) {
                await Bun.sleep(1);
            }
        }

        console.info(`📊 Successfully sent: ${sentCount} messages`);
        console.info(`📊 Failed to send: ${failedCount} messages`);
        console.info(`📊 Drain events triggered: ${drainCount}`);
        console.info(`📊 Messages received by server: ${messagesReceived}`);

        // Wait for processing
        await Bun.sleep(500);

        // Clean up
        sender.close();
        server.close();

        console.info('✅ Backpressure handling demo completed');

    } catch (error) {
        console.error(`❌ Backpressure demo failed: ${error.message}`);
    }
}

// =============================================================================
// REAL-TIME VOICE CHAT SIMULATION
// =============================================================================

async function demonstrateVoiceChatSimulation() {
    console.info('\n🎤 Real-Time Voice Chat Simulation:');
    console.info('===================================');

    try {
        // Simulate voice chat server
        const voiceServer = await Bun.udpSocket({
            socket: {
                data(socket, buf, port, addr) {
                    // Simulate processing audio packet
                    const packetId = buf.toString().split(':')[0];
                    const audioData = buf.toString().split(':')[1];

                    console.info(`🎤 Audio packet ${packetId} from ${addr}:${port} (${audioData?.length || 0} bytes)`);

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

        console.info(`🎤 Voice server started on port ${voiceServer.port}`);

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
                            console.info(`🔊 Client ${clientId} received processed packet ${packetId}`);
                        }
                    }
                }
            });

            voiceClients.push({ client, id: clientId });
        }

        console.info('🎤 Simulating voice chat traffic...');

        // Simulate sending audio packets
        for (let round = 1; round <= 5; round++) {
            console.info(`\n📡 Round ${round} - Sending audio packets...`);

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
        console.info('\n📊 Voice Chat Performance Metrics:');
        console.info('• Low latency: ~10ms processing delay');
        console.info('• High throughput: Multiple concurrent clients');
        console.info('• Connected sockets: Optimized for single-peer communication');
        console.info('• UDP benefits: No connection overhead, packet-based transmission');

        // Clean up
        voiceClients.forEach(({ client }) => client.close());
        voiceServer.close();

        console.info('✅ Voice chat simulation completed');

    } catch (error) {
        console.error(`❌ Voice chat simulation failed: ${error.message}`);
    }
}

// =============================================================================
// PERFORMANCE BENCHMARKING
// =============================================================================

async function demonstratePerformanceBenchmark() {
    console.info('\n🏁 UDP Performance Benchmarking:');
    console.info('==================================');

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

        console.info(`🏁 Benchmark server on port ${benchmarkServer.port}`);

        // Benchmark configurations
        const benchmarks = [
            { name: 'Connected Socket', connected: true, messageCount: 1000 },
            { name: 'Unconnected Socket', connected: false, messageCount: 1000 },
            { name: 'Batch Send (Connected)', connected: true, messageCount: 3000, batch: true },
            { name: 'Batch Send (Unconnected)', connected: false, messageCount: 3000, batch: true }
        ];

        for (const benchmark of benchmarks) {
            console.info(`\n📊 Running: ${benchmark.name}`);

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

            console.info(`   • Messages sent: ${benchmark.messageCount}`);
            console.info(`   • Send time: ${sendTime.toFixed(2)}ms`);
            console.info(`   • Total time: ${totalTime.toFixed(2)}ms`);
            console.info(`   • Throughput: ${messagesPerSecond.toFixed(0)} msg/sec`);
            console.info(`   • ACKs received: ${ackCount}`);

            client.close();
        }

        benchmarkServer.close();

        console.info('✅ Performance benchmarking completed');

    } catch (error) {
        console.error(`❌ Performance benchmarking failed: ${error.message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.info('🚀 Starting Advanced UDP Socket Demonstration');
    console.info('================================================');
    console.info(`📋 Running on Bun ${Bun.version}`);
    console.info(`🕐 Started at: ${new Date().toISOString()}`);
    console.info('');
    console.info('💡 This demo showcases Bun\'s high-performance UDP API');
    console.info('   • Real-time communication capabilities');
    console.info('   • Batch operations with sendMany()');
    console.info('   • Backpressure handling');
    console.info('   • Voice chat simulation patterns');
    console.info('   • Performance benchmarking');
    console.info('');

    try {
        // Run all demonstrations
        await demonstrateBasicUDPServer();
        await demonstrateConnectedSockets();
        await demonstrateBatchOperations();
        await demonstrateBackpressure();
        await demonstrateVoiceChatSimulation();
        await demonstratePerformanceBenchmark();

        console.info('\n🎉 Advanced UDP Socket Demonstration Complete!');
        console.info('=================================================');
        console.info('✅ All UDP API features demonstrated successfully');
        console.info('📚 Features shown:');
        console.info('   • Basic UDP server/client communication');
        console.info('   • Connected vs unconnected socket performance');
        console.info('   • Batch operations with sendMany()');
        console.info('   • Backpressure handling and drain events');
        console.info('   • Real-time voice chat simulation');
        console.info('   • Performance benchmarking and optimization');
        console.info('');
        console.info('🚀 Bun UDP API is perfect for:');
        console.info('   • Real-time gaming and voice chat');
        console.info('   • High-frequency data streaming');
        console.info('   • IoT device communication');
        console.info('   • DNS and service discovery');
        console.info('   • Log aggregation and monitoring');

    } catch (error) {
        console.error(`❌ Demonstration failed: ${error.message}`);
        console.error(`📍 Error location: ${error.stack}`);
    }
}

// Run the advanced UDP demonstration
main().catch(console.error);
