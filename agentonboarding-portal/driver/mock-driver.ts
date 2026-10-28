/**
 * Mock automation driver — simulates the step timeline and returns fake
 * snapshots/screenshots so the portal runs fully offline.
 * This is the default (AUTOMATION_DRIVER=mock).
 */
import type { AutomationDriver, LoginSelectors, SessionSnapshot } from "./types.ts";

const sleep = (ms: number) => Bun.sleep(ms);

/** 1x1 transparent PNG (static bytes, valid for canvas decode). */
const MOCK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export class MockDriver implements AutomationDriver {
  readonly kind = "mock" as const;
  private closed = false;

  async navigate(_url: string): Promise<void> {
    await sleep(300);
  }

  async waitForSelector(_selector: string, _timeoutMs = 30_000): Promise<void> {
    await sleep(150);
  }

  async fillLogin(_selectors: LoginSelectors, _username: string, _password: string): Promise<void> {
    await sleep(400);
  }

  async submit(_selector: string): Promise<void> {
    await sleep(150);
  }

  async waitForSuccess(_selector: string, _timeoutMs = 30_000): Promise<void> {
    await sleep(300);
  }

  async capture(): Promise<SessionSnapshot> {
    await sleep(50);
    return {
      cookies: "session=mock-session-token; token=mock-token",
      local_storage: JSON.stringify({ mock: true }),
      session_storage: JSON.stringify({ mock: true }),
    };
  }

  async screenshot(): Promise<Uint8Array> {
    await sleep(30);
    return new Uint8Array(MOCK_PNG);
  }

  async click(_x: number, _y: number): Promise<void> {
    await sleep(30);
  }

  async press(_key: string): Promise<void> {
    await sleep(30);
  }

  async evaluate<T = unknown>(script: string): Promise<T> {
    // Parse a literal expression so mock mode can answer simple probes.
    const trimmed = script.trim().replace(/^\(\(\) => /, "").replace(/\)\)$/, "");
    try {
      // eslint-disable-next-line no-new-func
      return new Function(`return (${trimmed})`)() as T;
    } catch {
      return undefined as T;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
