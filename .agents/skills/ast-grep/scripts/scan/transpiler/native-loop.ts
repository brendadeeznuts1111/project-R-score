/** Bun-native loop helpers — peek coalescing, nanosecond timing, abortable wait. */

export function elapsedMsSince(startNs: number): number {
  return Math.round(Number(Bun.nanoseconds() - startNs) / 1_000_000);
}

const inflightSlot = Symbol("inflight");

type InflightState = { [inflightSlot]: Promise<void> | null };

/** Join or skip overlapping runs — returns in-flight promise when still pending. */
export async function runInflight(
  run: () => Promise<void>,
  state: InflightState = defaultInflight,
): Promise<void> {
  const existing = state[inflightSlot];
  if (existing !== null && Bun.peek.status(existing) === "pending") {
    return existing;
  }
  const promise = run().finally(() => {
    if (state[inflightSlot] === promise) state[inflightSlot] = null;
  });
  state[inflightSlot] = promise;
  return promise;
}

const defaultInflight: InflightState = { [inflightSlot]: null };

export function createInflightState(): InflightState {
  return { [inflightSlot]: null };
}

/** Fire-and-forget coalescer (cron probe ticks). */
export function createInflightCoalescer(state: InflightState = defaultInflight): (run: () => Promise<void>) => void {
  return (run) => {
    void runInflight(run, state);
  };
}

/** Wait until aborted — replaces `new Promise(() => {})` hang patterns. */
export async function waitUntilAborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await Bun.sleep(Number.POSITIVE_INFINITY, { signal });
}