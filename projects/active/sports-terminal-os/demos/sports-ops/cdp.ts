/** Small Chrome DevTools Protocol client. Bun WebSocket, no puppeteer. */

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type CdpEvent = { method: string; params: Record<string, unknown> };

export class Cdp {
  private seq = 0;
  private pending = new Map<number, Pending>();
  onEvent: ((event: CdpEvent) => void) | null = null;

  private constructor(private ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data)) as {
        id?: number;
        method?: string;
        params?: Record<string, unknown>;
        result?: unknown;
        error?: { message?: string };
      };
      if (msg.id && this.pending.has(msg.id)) {
        const waiter = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        clearTimeout(waiter.timer);
        if (msg.error) waiter.reject(new Error(msg.error.message || "cdp error"));
        else waiter.resolve(msg.result);
        return;
      }
      if (msg.method) this.onEvent?.({ method: msg.method, params: msg.params ?? {} });
    });
  }

  static async connect(wsUrl: string): Promise<Cdp> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error("cdp socket failed")), { once: true });
    });
    return new Cdp(ws);
  }

  send(method: string, params: Record<string, unknown> = {}, timeoutMs = 20000): Promise<unknown> {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate<T>(expression: string, timeoutMs = 25000): Promise<T> {
    const result = (await this.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      timeoutMs,
    )) as { result?: { value?: T }; exceptionDetails?: { text?: string } };
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "evaluate failed");
    return result.result?.value as T;
  }

  close() {
    this.ws.close();
  }
}

export async function openChromeTab(port: number, url: string): Promise<{ webSocketDebuggerUrl: string; id: string }> {
  const endpoint = `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`;
  let response = await fetch(endpoint, { method: "PUT" });
  if (!response.ok) response = await fetch(endpoint);
  if (!response.ok) throw new Error(`chrome tab ${response.status}`);
  const tab = (await response.json()) as { webSocketDebuggerUrl?: string; id?: string };
  if (!tab.webSocketDebuggerUrl || !tab.id) throw new Error("chrome tab missing debugger url");
  return { webSocketDebuggerUrl: tab.webSocketDebuggerUrl, id: tab.id };
}
