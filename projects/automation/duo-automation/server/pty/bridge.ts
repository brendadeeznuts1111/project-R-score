// [DUOPLUS][PTY][FIX][BUG][META:{context:broadcast}] [CRITICAL] [#REF:FIX-PTY-003][BUN:6.1-NATIVE]

export interface PTYManager {
  broadcastToClients(sessionId: string, payload: unknown): void;
}

export class PTYBridge {
  private manager: PTYManager;
  private sessionId: string;

  constructor(manager: PTYManager, sessionId: string) {
    this.manager = manager;
    this.sessionId = sessionId;
  }

  onData(data: string): void {
    // [PTY][DATA][EVENT] - Correctly broadcast via manager
    this.manager.broadcastToClients(this.sessionId, {
      type: "pty-output",
      data,
      timestamp: Date.now(),
      tags: ["[DUO][PTY][DATA][EVENT]"]
    });
  }
}
