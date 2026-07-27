// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Pending send-to ForceReply actions — file-backed (gitignored under reports/).
 */
export const SEAT_DESK_PENDING_PATH = 'reports/telegram/seat-desk-pending.json';

export type SeatDeskPendingAction = {
  callSign: string;
  outId: string; // brand-ok — seat out token
  field: 'sendTo' | 'bookLogin';
  promptMessageId: number;
  chatId: string; // brand-ok
  threadId: number;
  expiresAt: string;
};

export type SeatDeskPendingStore = Record<string, SeatDeskPendingAction>;

const PENDING_TTL_MS = 15 * 60 * 1000;

export function seatDeskPendingExpiry(now = Date.now()): string {
  return new Date(now + PENDING_TTL_MS).toISOString();
}

export async function loadSeatDeskPending(
  path = SEAT_DESK_PENDING_PATH
): Promise<SeatDeskPendingStore> {
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  try {
    const raw = (await file.json()) as SeatDeskPendingStore;
    const now = Date.now();
    const out: SeatDeskPendingStore = {};
    for (const [userId, action] of Object.entries(raw)) {
      if (new Date(action.expiresAt).getTime() > now) out[userId] = action;
    }
    return out;
  } catch {
    return {};
  }
}

export async function saveSeatDeskPending(
  store: SeatDeskPendingStore,
  path = SEAT_DESK_PENDING_PATH
): Promise<void> {
  await Bun.write(path, `${JSON.stringify(store, null, 2)}\n`);
}

export async function setSeatDeskPending(
  userId: string, // brand-ok
  action: SeatDeskPendingAction,
  path = SEAT_DESK_PENDING_PATH
): Promise<void> {
  const store = await loadSeatDeskPending(path);
  store[userId] = action;
  await saveSeatDeskPending(store, path);
}

export async function clearSeatDeskPending(
  userId: string, // brand-ok
  path = SEAT_DESK_PENDING_PATH
): Promise<void> {
  const store = await loadSeatDeskPending(path);
  if (!store[userId]) return;
  delete store[userId];
  await saveSeatDeskPending(store, path);
}

export async function getSeatDeskPending(
  userId: string, // brand-ok
  path = SEAT_DESK_PENDING_PATH
): Promise<SeatDeskPendingAction | null> {
  const store = await loadSeatDeskPending(path);
  const action = store[userId];
  if (!action) return null;
  if (new Date(action.expiresAt).getTime() <= Date.now()) {
    await clearSeatDeskPending(userId, path);
    return null;
  }
  return action;
}
