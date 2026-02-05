/**
 * HTTP connection state machine validation tests
 * Tests: numeric state transitions, timeout calculations, error handling
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-HTTP-CONNECTION-STATE@1.3.3;instance-id=TEST-HTTP-001;version=1.3.3}][PROPERTIES:{test={value:"connection-state";@root:"ROOT-TEST";@chain:["BP-STATE-MACHINE","BP-TIMEOUT","BP-ERROR-HANDLING"];@version:"1.3.3"}}][CLASS:HttpConnectionStateTests][#REF:v-1.3.3.BP.HTTP.CONNECTION.1.0.A.1.1.TEST.1.1]]
 */

import { describe, test, expect } from "bun:test";

// Connection state enum (numeric)
const CONNECTION_STATE = {
	ACTIVE: 0,
	IDLE: 1,
	ERROR: 2,
} as const;

type ConnectionState = typeof CONNECTION_STATE[keyof typeof CONNECTION_STATE];

interface Connection {
	state: ConnectionState;
	idleSince?: bigint;
	errorTime?: bigint;
	lastActivity?: bigint;
	timeout_ms: number;
}

/**
 * Calculate timeout deadline using high-precision timestamps
 */
function getTimeoutDeadline(conn: Connection): bigint {
	// ✅ Immediate timeout on error state
	if (conn.state === CONNECTION_STATE.ERROR) {
		return 0n; // Immediate timeout
	}

	// ✅ Calculate deadline: current time + timeout duration
	const timeoutNs = BigInt(conn.timeout_ms) * 1_000_000n;
	const now = BigInt(Bun.nanoseconds());
	return now + timeoutNs;
}

/**
 * Check if connection should timeout
 */
function shouldTimeout(conn: Connection): boolean {
	if (conn.state === CONNECTION_STATE.ERROR) {
		return true; // Always timeout errors immediately
	}

	const deadline = getTimeoutDeadline(conn);
	const now = BigInt(Bun.nanoseconds());

	return now >= deadline;
}

/**
 * Transition connection to error state
 */
function markError(conn: Connection): void {
	conn.state = CONNECTION_STATE.ERROR;
	conn.errorTime = BigInt(Bun.nanoseconds());
}

/**
 * Transition to idle state (only from active)
 */
function markIdle(conn: Connection): void {
	// ✅ State validation: only transition from active
	if (conn.state !== CONNECTION_STATE.ACTIVE) {
		return; // Invalid transition, ignore
	}

	conn.state = CONNECTION_STATE.IDLE;
	conn.idleSince = BigInt(Bun.nanoseconds());
}

/**
 * Transition to active state (from idle or error)
 */
function markActive(conn: Connection): void {
	// ✅ Can transition from idle or error
	if (
		conn.state === CONNECTION_STATE.IDLE ||
		conn.state === CONNECTION_STATE.ERROR
	) {
		conn.state = CONNECTION_STATE.ACTIVE;
		conn.lastActivity = BigInt(Bun.nanoseconds());
	}
}

describe("HTTP Connection State Machine", () => {
	describe("State Enum", () => {
		test("state values are numeric", () => {
			expect(typeof CONNECTION_STATE.ACTIVE).toBe("number");
			expect(typeof CONNECTION_STATE.IDLE).toBe("number");
			expect(typeof CONNECTION_STATE.ERROR).toBe("number");
		});

		test("state values are distinct", () => {
			expect(CONNECTION_STATE.ACTIVE).not.toBe(CONNECTION_STATE.IDLE);
			expect(CONNECTION_STATE.IDLE).not.toBe(CONNECTION_STATE.ERROR);
			expect(CONNECTION_STATE.ERROR).not.toBe(CONNECTION_STATE.ACTIVE);
		});

		test("state fits in u8 (0-255)", () => {
			expect(CONNECTION_STATE.ACTIVE).toBeGreaterThanOrEqual(0);
			expect(CONNECTION_STATE.ERROR).toBeLessThan(256);
		});
	});

	describe("Timeout Deadline Calculation", () => {
		test("error state returns immediate timeout", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			const deadline = getTimeoutDeadline(conn);
			expect(deadline).toBe(0n); // Immediate timeout
		});

		test("active state calculates future deadline", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000, // 30 seconds
			};

			const now = BigInt(Bun.nanoseconds());
			const deadline = getTimeoutDeadline(conn);

			// Deadline should be ~30 seconds in the future
			const expectedNs = BigInt(30_000) * 1_000_000n;
			expect(deadline > now).toBe(true);
			const diff = deadline - now;
			// Allow variance: 29.5s to 30.5s (accounting for test execution time)
			expect(diff > expectedNs - 500_000_000n).toBe(true); // Allow 500ms variance
			expect(diff < expectedNs + 500_000_000n).toBe(true);
		});

		test("idle state calculates future deadline", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.IDLE,
				timeout_ms: 60000, // 60 seconds
			};

			const now = BigInt(Bun.nanoseconds());
			const deadline = getTimeoutDeadline(conn);

			expect(deadline > now).toBe(true);
		});
	});

	describe("Timeout Detection", () => {
		test("error state always times out", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			expect(shouldTimeout(conn)).toBe(true);
		});

		test("active state does not timeout immediately", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000, // 30 seconds timeout
			};

			// Should not timeout immediately (30s in future)
			const result = shouldTimeout(conn);
			expect(result).toBe(false);
		});
	});

	describe("State Transitions", () => {
		test("markIdle transitions from active to idle", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000,
			};

			markIdle(conn);

			expect(conn.state).toBe(CONNECTION_STATE.IDLE);
			expect(conn.idleSince).toBeDefined();
		});

		test("markIdle ignores invalid transitions", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			const originalState = conn.state;
			markIdle(conn);

			expect(conn.state).toBe(originalState); // Unchanged
		});

		test("markError transitions to error state", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000,
			};

			markError(conn);

			expect(conn.state).toBe(CONNECTION_STATE.ERROR);
			expect(conn.errorTime).toBeDefined();
		});

		test("markActive transitions from idle to active", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.IDLE,
				timeout_ms: 30000,
			};

			markActive(conn);

			expect(conn.state).toBe(CONNECTION_STATE.ACTIVE);
			expect(conn.lastActivity).toBeDefined();
		});

		test("markActive transitions from error to active", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			markActive(conn);

			expect(conn.state).toBe(CONNECTION_STATE.ACTIVE);
			expect(conn.lastActivity).toBeDefined();
		});
	});

	describe("Bug Fix: Timeout Drift Prevention", () => {
		test("error state triggers immediate timeout", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			const deadline = getTimeoutDeadline(conn);
			expect(deadline).toBe(0n); // ✅ Immediate timeout, no drift
		});

		test("error state always times out", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ERROR,
				timeout_ms: 30000,
			};

			expect(shouldTimeout(conn)).toBe(true); // ✅ Immediate cleanup
		});
	});

	describe("Performance", () => {
		test("state check is fast", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000,
			};

			const start = Bun.nanoseconds();
			for (let i = 0; i < 1000; i++) {
				// State check
				const _ = conn.state === CONNECTION_STATE.ERROR;
			}
			const end = Bun.nanoseconds();

			const totalNs = end - start;
			const avgNs = Number(totalNs) / 1000;
			expect(avgNs).toBeLessThan(100); // < 100ns per check (allows for test overhead)
		});

		test("timeout calculation is fast", () => {
			const conn: Connection = {
				state: CONNECTION_STATE.ACTIVE,
				timeout_ms: 30000,
			};

			const start = BigInt(Bun.nanoseconds());
			for (let i = 0; i < 1000; i++) {
				getTimeoutDeadline(conn);
			}
			const end = BigInt(Bun.nanoseconds());

			const totalNs = end - start;
			const avgNs = Number(totalNs) / 1000;
			expect(avgNs).toBeLessThan(1000); // < 1µs per calculation (allows for BigInt overhead)
		});
	});
});
