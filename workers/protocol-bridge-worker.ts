import { ProtocolOrchestrator } from "../src/protocol-matrix";

declare var self: Worker;

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;
  if (msg.type === "task") {
    try {
      const result = await ProtocolOrchestrator.execute(msg.payload);
      postMessage({ type: "result", id: msg.id, ok: true, value: result });
    } catch (error) {
      postMessage({
        type: "result",
        id: msg.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
