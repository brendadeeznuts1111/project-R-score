import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { ProtocolCircuitBreaker } from "../src/protocol-circuit-breaker";
import { ProtocolOrchestrator, type Protocol } from "../src/protocol-matrix";

// ─── Standalone Circuit Breaker ────────────────────────────────────
describe("ProtocolCircuitBreaker standalone", () => {
  test("new circuit is CLOSED", () => {
    const cb = new ProtocolCircuitBreaker();
    const snap = cb.getSnapshot("https");
    expect(snap.state).toBe("CLOSED");
    expect(snap.totalCalls).toBe(0);
  });

  test("stays CLOSED below threshold", () => {
    const cb = new ProtocolCircuitBreaker({ windowSize: 10, failureRateThreshold: 0.5 });

    // 7 successes, 3 failures = 30% failure rate — below 50%
    for (let i = 0; i < 7; i++) cb.recordSuccess("https");
    for (let i = 0; i < 3; i++) cb.recordFailure("https");

    const snap = cb.getSnapshot("https");
    expect(snap.state).toBe("CLOSED");
    expect(snap.failureRate).toBe(0.3);
    expect(cb.isAvailable("https")).toBe(true);
  });

  test("opens when failure rate exceeds threshold after windowSize calls", () => {
    const cb = new ProtocolCircuitBreaker({ windowSize: 10, failureRateThreshold: 0.5 });

    // 4 successes, 6 failures = 60% failure rate
    for (let i = 0; i < 4; i++) cb.recordSuccess("https");
    for (let i = 0; i < 6; i++) cb.recordFailure("https");

    const snap = cb.getSnapshot("https");
    expect(snap.state).toBe("OPEN");
    expect(snap.failureRate).toBeGreaterThanOrEqual(0.5);
    expect(cb.isAvailable("https")).toBe(false);
  });

  test("stays CLOSED if window not yet full", () => {
    const cb = new ProtocolCircuitBreaker({ windowSize: 10, failureRateThreshold: 0.5 });

    // Only 5 calls (all failures) — window not full
    for (let i = 0; i < 5; i++) cb.recordFailure("https");

    const snap = cb.getSnapshot("https");
    expect(snap.state).toBe("CLOSED");
    expect(cb.isAvailable("https")).toBe(true);
  });

  test("OPEN blocks isAvailable()", () => {
    const cb = new ProtocolCircuitBreaker({ windowSize: 4, failureRateThreshold: 0.5 });

    // All failures — opens immediately at windowSize
    for (let i = 0; i < 4; i++) cb.recordFailure("https");

    expect(cb.getSnapshot("https").state).toBe("OPEN");
    expect(cb.isAvailable("https")).toBe(false);
  });

  test("OPEN → HALF_OPEN after cooldownMs", () => {
    const cb = new ProtocolCircuitBreaker({
      windowSize: 4,
      failureRateThreshold: 0.5,
      cooldownMs: 10,
    });

    for (let i = 0; i < 4; i++) cb.recordFailure("https");
    expect(cb.getSnapshot("https").state).toBe("OPEN");

    // Manipulate time by overriding Date.now
    const realNow = Date.now;
    Date.now = () => realNow() + 15;
    try {
      expect(cb.isAvailable("https")).toBe(true);
      expect(cb.getSnapshot("https").state).toBe("HALF_OPEN");
    } finally {
      Date.now = realNow;
    }
  });

  test("HALF_OPEN → CLOSED on success", () => {
    const cb = new ProtocolCircuitBreaker({
      windowSize: 4,
      failureRateThreshold: 0.5,
      cooldownMs: 10,
    });

    for (let i = 0; i < 4; i++) cb.recordFailure("https");
    expect(cb.getSnapshot("https").state).toBe("OPEN");

    // Transition to HALF_OPEN
    const realNow = Date.now;
    Date.now = () => realNow() + 15;
    try {
      cb.isAvailable("https"); // triggers HALF_OPEN
      expect(cb.getSnapshot("https").state).toBe("HALF_OPEN");

      // Probe succeeds → CLOSED
      cb.recordSuccess("https");
      expect(cb.getSnapshot("https").state).toBe("CLOSED");
    } finally {
      Date.now = realNow;
    }
  });

  test("HALF_OPEN → OPEN on failure", () => {
    const cb = new ProtocolCircuitBreaker({
      windowSize: 4,
      failureRateThreshold: 0.5,
      cooldownMs: 10,
    });

    for (let i = 0; i < 4; i++) cb.recordFailure("https");

    const realNow = Date.now;
    Date.now = () => realNow() + 15;
    try {
      cb.isAvailable("https"); // triggers HALF_OPEN
      expect(cb.getSnapshot("https").state).toBe("HALF_OPEN");

      // Probe fails → back to OPEN
      cb.recordFailure("https");
      expect(cb.getSnapshot("https").state).toBe("OPEN");
    } finally {
      Date.now = realNow;
    }
  });
});

// ─── Integration with ProtocolOrchestrator ─────────────────────────
describe("ProtocolCircuitBreaker integration", () => {
  beforeEach(() => {
    ProtocolOrchestrator.reset();
    ProtocolOrchestrator.setCircuitBreaker(
      new ProtocolCircuitBreaker({
        windowSize: 4,
        failureRateThreshold: 0.5,
        cooldownMs: 30_000,
      }),
    );
  });

  test("open circuit skips protocol in fallback chain", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    // Open circuit for "data" protocol
    for (let i = 0; i < 4; i++) cb.recordFailure("data");
    expect(cb.getSnapshot("data").state).toBe("OPEN");

    using spy = spyOn(ProtocolOrchestrator, "executeProtocol");
    const calledProtocols: Protocol[] = [];
    spy.mockImplementation(async (protocol: Protocol, data: unknown) => {
      calledProtocols.push(protocol);
      return { result: protocol };
    });

    // Small payload normally selects "data", but circuit is open
    const result = await ProtocolOrchestrator.execute({
      data: { test: 1 },
      size: 10,
      options: { cache: false },
    });

    expect(result.success).toBe(true);
    expect(calledProtocols).not.toContain("data");
  });

  test("fallback proceeds to next when primary circuit open", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    // Open circuit for "data"
    for (let i = 0; i < 4; i++) cb.recordFailure("data");

    const result = await ProtocolOrchestrator.execute({
      data: { test: "fallback" },
      size: 10,
      options: { cache: false },
    });

    // data's fallback chain is ["blob", "file"] — should try blob
    expect(result.success).toBe(true);
    expect(result.protocol).toBe("blob");
  });

  test("success records on circuit breaker", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    await ProtocolOrchestrator.execute({
      data: { test: "success" },
      size: 10,
      options: { cache: false },
    });

    const snap = cb.getSnapshot("data");
    expect(snap.recentSuccesses).toBe(1);
    expect(snap.state).toBe("CLOSED");
  });

  test("failure records on circuit breaker", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    using spy = spyOn(ProtocolOrchestrator, "executeProtocol");
    spy.mockImplementation(async () => {
      throw new Error("protocol down");
    });

    await ProtocolOrchestrator.execute({
      data: { test: "failure" },
      size: 10,
      options: { cache: false },
    });

    // "data" plus its fallback chain ["blob", "file"] all failed
    const dataSnap = cb.getSnapshot("data");
    expect(dataSnap.recentFailures).toBeGreaterThanOrEqual(1);
  });

  test("all circuits open returns success: false", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    // Open circuits for "data" and its fallback chain: blob, file
    for (const p of ["data", "blob", "file"] as Protocol[]) {
      for (let i = 0; i < 4; i++) cb.recordFailure(p);
    }

    const result = await ProtocolOrchestrator.execute({
      data: { test: "all-open" },
      size: 10,
      options: { cache: false },
    });

    expect(result.success).toBe(false);
  });

  test("getSnapshot returns accurate state after execute", async () => {
    const cb = ProtocolOrchestrator.getCircuitBreaker()!;

    // Execute 3 successful requests
    for (let i = 0; i < 3; i++) {
      await ProtocolOrchestrator.execute({
        data: { id: i },
        size: 10,
        options: { cache: false },
      });
    }

    const snap = cb.getSnapshot("data");
    expect(snap.state).toBe("CLOSED");
    expect(snap.recentSuccesses).toBe(3);
    expect(snap.recentFailures).toBe(0);
    expect(snap.totalCalls).toBe(3);
  });
});
