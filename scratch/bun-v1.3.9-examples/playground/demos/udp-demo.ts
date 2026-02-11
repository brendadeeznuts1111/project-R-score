#!/usr/bin/env bun
/**
 * Demo: Bun UDP Realtime Service — Circuit Breaker Integration
 *
 * Demonstrates:
 * 1. Basic UDP send/receive
 * 2. Batch send + flush
 * 3. Packet tracking with sequence IDs
 * 4. Heartbeat & peer detection
 * 5. Graceful shutdown
 * 6. Circuit breaker (backpressure protection)
 */

import { UDPRealtimeService } from "../../../../lib/udp/udp-realtime-service";
import { CircuitState } from "../../../../lib/core/circuit-breaker";

function section(n: number, title: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  Section ${n}: ${title}`);
  console.log("=".repeat(70));
}

async function main() {
  console.log("UDP Realtime Service Demo\n");

  // ------------------------------------------------------------------
  // Section 1: Basic UDP send/receive
  // ------------------------------------------------------------------
  section(1, "Basic UDP Send/Receive");

  const receiver = new UDPRealtimeService({ port: 0 });
  await receiver.bind();

  const received: string[] = [];
  receiver.onMessage((dg) => received.push(dg.data.toString()));

  const sender = new UDPRealtimeService({ port: 0 });
  await sender.bind();

  sender.send("hello from sender", receiver.port!, "127.0.0.1");
  await Bun.sleep(50);

  console.log(`  Sender port:   ${sender.port}`);
  console.log(`  Receiver port: ${receiver.port}`);
  console.log(`  Received:      ${received.length} packet(s) — "${received[0] ?? "(none)"}"`);
  console.log(`  Metrics:       sent=${sender.getMetrics().packetsSent}, recv=${receiver.getMetrics().packetsReceived}`);

  sender.close();
  receiver.close();

  // ------------------------------------------------------------------
  // Section 2: Batch send + flush
  // ------------------------------------------------------------------
  section(2, "Batch Send + Flush");

  const batchRx = new UDPRealtimeService({ port: 0 });
  await batchRx.bind();

  const batchMsgs: string[] = [];
  batchRx.onMessage((dg) => batchMsgs.push(dg.data.toString()));

  const batchTx = new UDPRealtimeService({ port: 0 });
  await batchTx.bind();

  batchTx.scheduleSend("batch-1", batchRx.port!, "127.0.0.1");
  batchTx.scheduleSend("batch-2", batchRx.port!, "127.0.0.1");
  batchTx.scheduleSend("batch-3", batchRx.port!, "127.0.0.1");
  console.log(`  Queued: ${batchTx.pendingBatchSize} packets`);

  const flushed = batchTx.flush();
  await Bun.sleep(50);

  console.log(`  Flushed: ${flushed} packets`);
  console.log(`  Received: [${batchMsgs.join(", ")}]`);

  batchTx.close();
  batchRx.close();

  // ------------------------------------------------------------------
  // Section 3: Packet tracking
  // ------------------------------------------------------------------
  section(3, "Packet Tracking (Sequence IDs)");

  const trackRx = new UDPRealtimeService({ port: 0, packetTracking: true });
  await trackRx.bind();

  const seqIds: number[] = [];
  trackRx.onMessage((dg) => {
    if (dg.sequenceId !== undefined) seqIds.push(dg.sequenceId);
  });

  const trackTx = new UDPRealtimeService({ port: 0, packetTracking: true });
  await trackTx.bind();

  for (let i = 0; i < 5; i++) {
    trackTx.send(`pkt-${i}`, trackRx.port!, "127.0.0.1");
  }
  await Bun.sleep(50);

  console.log(`  Sequence IDs received: [${seqIds.join(", ")}]`);
  console.log(`  Sender outSeq:  ${trackTx.getMetrics().sequenceId}`);

  trackTx.close();
  trackRx.close();

  // ------------------------------------------------------------------
  // Section 4: Heartbeat & peer detection
  // ------------------------------------------------------------------
  section(4, "Heartbeat & Peer Detection");

  const hbRx = new UDPRealtimeService({
    port: 0,
    packetTracking: true,
    heartbeatIntervalMs: 100,
    heartbeatTimeoutMs: 500,
  });
  await hbRx.bind();

  const hbTx = new UDPRealtimeService({
    port: 0,
    packetTracking: true,
    heartbeatIntervalMs: 100,
    connect: { hostname: "127.0.0.1", port: hbRx.port! },
  });
  await hbTx.bind();

  // Send a data packet so receiver knows about the peer
  // (heartbeats on unconnected sockets don't know destination)
  hbRx.onMessage(() => {}); // keep alive
  // Sender is connected, its heartbeats go to receiver
  await Bun.sleep(350);

  const peers = hbRx.getPeers();
  const hbMetrics = hbRx.getMetrics();
  console.log(`  Peers detected: ${peers.length}`);
  console.log(`  Heartbeats received: ${hbMetrics.heartbeatsReceived}`);
  console.log(`  Heartbeats sent (tx): ${hbTx.getMetrics().heartbeatsSent}`);

  hbTx.close();
  hbRx.close();

  // ------------------------------------------------------------------
  // Section 5: Graceful shutdown
  // ------------------------------------------------------------------
  section(5, "Graceful Shutdown");

  const shutSvc = new UDPRealtimeService({ port: 0, batchFlushIntervalMs: 50 });
  await shutSvc.bind();

  let shutdownFired = false;
  shutSvc.onShutdown(() => { shutdownFired = true; });

  shutSvc.scheduleSend("pending-data", 4000, "10.0.0.1");
  console.log(`  Pending before shutdown: ${shutSvc.pendingBatchSize}`);

  await shutSvc.shutdown(500);
  console.log(`  State after shutdown:    ${shutSvc.state}`);
  console.log(`  Shutdown handler fired:  ${shutdownFired}`);
  console.log(`  Batch flushes:           ${shutSvc.getMetrics().batchFlushes}`);

  // ------------------------------------------------------------------
  // Section 6: Circuit Breaker
  // ------------------------------------------------------------------
  section(6, "Circuit Breaker");

  const cbSvc = new UDPRealtimeService({
    port: 0,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      successThreshold: 2,
    },
  });
  await cbSvc.bind();

  const breaker = cbSvc.getCircuitBreaker()!;
  console.log(`  Breaker configured: failureThreshold=3, resetTimeoutMs=1000, successThreshold=2`);
  console.log(`  Initial state: ${breaker.getState()}`);

  // Send some successful packets (localhost won't backpressure)
  for (let i = 0; i < 3; i++) {
    cbSvc.send(`data-${i}`, 4000, "10.0.0.1");
  }
  let stats = breaker.getStats();
  console.log(`  After 3 sends: state=${stats.state}, successes=${stats.successes}, failures=${stats.failures}`);

  // Force the breaker open (simulates production backpressure scenario)
  console.log("\n  [Simulating backpressure — forcing breaker OPEN]");
  breaker.forceOpen();
  console.log(`  State after forceOpen(): ${breaker.getState()}`);

  // Attempt to send — should be rejected
  try {
    cbSvc.send("blocked", 4000, "10.0.0.1");
    console.log("  ERROR: send should have thrown!");
  } catch (err: any) {
    console.log(`  send() rejected: ${err.name}`);
  }

  // scheduleSend should also reject
  try {
    cbSvc.scheduleSend("blocked", 4000, "10.0.0.1");
    console.log("  ERROR: scheduleSend should have thrown!");
  } catch (err: any) {
    console.log(`  scheduleSend() rejected: ${err.name}`);
  }

  stats = breaker.getStats();
  console.log(`  Rejected calls: ${stats.rejectedCalls}`);

  // Wait for resetTimeoutMs to trigger HALF_OPEN recovery
  console.log("\n  [Waiting 1.1s for HALF_OPEN recovery window...]");
  await Bun.sleep(1100);

  // isOpen() should now transition to HALF_OPEN
  const stillOpen = breaker.isOpen();
  console.log(`  isOpen() after timeout: ${stillOpen} (state=${breaker.getState()})`);

  // Send successThreshold packets to close the breaker
  cbSvc.send("recovery-1", 4000, "10.0.0.1");
  cbSvc.send("recovery-2", 4000, "10.0.0.1");

  console.log(`  After 2 successful sends: state=${breaker.getState()}`);

  stats = breaker.getStats();
  console.log(`  Final stats: total=${stats.totalCalls}, rejected=${stats.rejectedCalls}, stateChanges=${stats.stateChanges}`);

  cbSvc.close();
  breaker.destroy();

  // ------------------------------------------------------------------
  console.log(`\n${"=".repeat(70)}`);
  console.log("  All 6 sections complete.");
  console.log("=".repeat(70));
}

main().catch(console.error);
