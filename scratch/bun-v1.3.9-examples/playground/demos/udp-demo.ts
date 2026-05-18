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
  console.info(`\n${"=".repeat(70)}`);
  console.info(`  Section ${n}: ${title}`);
  console.info("=".repeat(70));
}

async function main() {
  console.info("UDP Realtime Service Demo\n");

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

  console.info(`  Sender port:   ${sender.port}`);
  console.info(`  Receiver port: ${receiver.port}`);
  console.info(`  Received:      ${received.length} packet(s) — "${received[0] ?? "(none)"}"`);
  console.info(`  Metrics:       sent=${sender.getMetrics().packetsSent}, recv=${receiver.getMetrics().packetsReceived}`);

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
  console.info(`  Queued: ${batchTx.pendingBatchSize} packets`);

  const flushed = batchTx.flush();
  await Bun.sleep(50);

  console.info(`  Flushed: ${flushed} packets`);
  console.info(`  Received: [${batchMsgs.join(", ")}]`);

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

  console.info(`  Sequence IDs received: [${seqIds.join(", ")}]`);
  console.info(`  Sender outSeq:  ${trackTx.getMetrics().sequenceId}`);

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
  console.info(`  Peers detected: ${peers.length}`);
  console.info(`  Heartbeats received: ${hbMetrics.heartbeatsReceived}`);
  console.info(`  Heartbeats sent (tx): ${hbTx.getMetrics().heartbeatsSent}`);

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
  console.info(`  Pending before shutdown: ${shutSvc.pendingBatchSize}`);

  await shutSvc.shutdown(500);
  console.info(`  State after shutdown:    ${shutSvc.state}`);
  console.info(`  Shutdown handler fired:  ${shutdownFired}`);
  console.info(`  Batch flushes:           ${shutSvc.getMetrics().batchFlushes}`);

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
  console.info(`  Breaker configured: failureThreshold=3, resetTimeoutMs=1000, successThreshold=2`);
  console.info(`  Initial state: ${breaker.getState()}`);

  // Send some successful packets (localhost won't backpressure)
  for (let i = 0; i < 3; i++) {
    cbSvc.send(`data-${i}`, 4000, "10.0.0.1");
  }
  let stats = breaker.getStats();
  console.info(`  After 3 sends: state=${stats.state}, successes=${stats.successes}, failures=${stats.failures}`);

  // Force the breaker open (simulates production backpressure scenario)
  console.info("\n  [Simulating backpressure — forcing breaker OPEN]");
  breaker.forceOpen();
  console.info(`  State after forceOpen(): ${breaker.getState()}`);

  // Attempt to send — should be rejected
  try {
    cbSvc.send("blocked", 4000, "10.0.0.1");
    console.info("  ERROR: send should have thrown!");
  } catch (err: any) {
    console.info(`  send() rejected: ${err.name}`);
  }

  // scheduleSend should also reject
  try {
    cbSvc.scheduleSend("blocked", 4000, "10.0.0.1");
    console.info("  ERROR: scheduleSend should have thrown!");
  } catch (err: any) {
    console.info(`  scheduleSend() rejected: ${err.name}`);
  }

  stats = breaker.getStats();
  console.info(`  Rejected calls: ${stats.rejectedCalls}`);

  // Wait for resetTimeoutMs to trigger HALF_OPEN recovery
  console.info("\n  [Waiting 1.1s for HALF_OPEN recovery window...]");
  await Bun.sleep(1100);

  // isOpen() should now transition to HALF_OPEN
  const stillOpen = breaker.isOpen();
  console.info(`  isOpen() after timeout: ${stillOpen} (state=${breaker.getState()})`);

  // Send successThreshold packets to close the breaker
  cbSvc.send("recovery-1", 4000, "10.0.0.1");
  cbSvc.send("recovery-2", 4000, "10.0.0.1");

  console.info(`  After 2 successful sends: state=${breaker.getState()}`);

  stats = breaker.getStats();
  console.info(`  Final stats: total=${stats.totalCalls}, rejected=${stats.rejectedCalls}, stateChanges=${stats.stateChanges}`);

  cbSvc.close();
  breaker.destroy();

  // ------------------------------------------------------------------
  console.info(`\n${"=".repeat(70)}`);
  console.info("  All 6 sections complete.");
  console.info("=".repeat(70));
}

main().catch(console.error);
