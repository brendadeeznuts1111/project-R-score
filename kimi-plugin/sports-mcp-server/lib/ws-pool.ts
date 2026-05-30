export interface WSConnection {
  ws: WebSocket;
  topic: string;
  retryCount: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  lastMessage: number;
}

type NotificationFn = (level: "info" | "warning" | "critical" | "error", data: Record<string, unknown>) => void;

const connections = new Map<string, WSConnection>();

const RECONNECT = {
  baseDelay: 1000,
  maxDelay: 30000,
  maxRetries: 10,
  jitter: 0.25,
};

function getBackoffDelay(retryCount: number): number {
  const exp = Math.min(retryCount, 10);
  const delay = Math.min(RECONNECT.baseDelay * 2 ** exp, RECONNECT.maxDelay);
  const jitter = delay * RECONNECT.jitter * (Math.random() * 2 - 1);
  return Math.max(RECONNECT.baseDelay, delay + jitter);
}

export function connect(
  topic: string,
  wsUrl: string,
  onMessage: (data: any) => void,
  notify: NotificationFn,
): WSConnection {
  const ws = new WebSocket(wsUrl);

  const conn: WSConnection = {
    ws,
    topic,
    retryCount: 0,
    reconnectTimer: null,
    lastMessage: Date.now(),
  };

  ws.onopen = () => {
    console.error(`[MCP] WS connected: ${topic}`);
    conn.retryCount = 0;
  };

  ws.onmessage = (event) => {
    conn.lastMessage = Date.now();
    try {
      onMessage(JSON.parse(event.data));
    } catch (err) {
      console.error(`[MCP] Parse error on ${topic}:`, err);
    }
  };

  ws.onerror = (err) => console.error(`[MCP] WS error on ${topic}:`, err);

  ws.onclose = () => {
    console.error(`[MCP] WS closed: ${topic} (retries: ${conn.retryCount}/${RECONNECT.maxRetries})`);

    if (conn.retryCount < RECONNECT.maxRetries) {
      const delay = getBackoffDelay(conn.retryCount);
      console.error(`[MCP] Reconnecting ${topic} in ${Math.round(delay)}ms...`);

      conn.reconnectTimer = setTimeout(() => {
        conn.retryCount++;
        const newConn = connect(topic, wsUrl, onMessage, notify);
        connections.set(topic, newConn);
      }, delay);
    } else {
      console.error(`[MCP] Max retries reached for ${topic}. Manual reconnect required.`);
      notify("error", { type: "ws_disconnect", topic, message: "Max reconnection retries reached" });
    }
  };

  return conn;
}

export function disconnect(topic: string): boolean {
  const conn = connections.get(topic);
  if (!conn) return false;
  if (conn.reconnectTimer) {
    clearTimeout(conn.reconnectTimer);
    conn.reconnectTimer = null;
  }
  conn.ws.close();
  connections.delete(topic);
  return true;
}

export function hasConnection(topic: string): boolean {
  return connections.has(topic);
}

export function setConnection(topic: string, conn: WSConnection): void {
  connections.set(topic, conn);
}

export function getConnections(): Map<string, WSConnection> {
  return connections;
}

export function disconnectAll(): void {
  for (const [t] of connections) disconnect(t);
}
