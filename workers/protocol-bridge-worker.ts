import { ProtocolOrchestrator, type ExecuteRequest } from "../src/protocol-matrix";
import type { WorkerTaskMessage, WorkerResultMessage } from "./ultra-pool";

declare var self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<WorkerTaskMessage<ExecuteRequest>>) => {
  const msg = event.data;
  if (msg.type === "task") {
    try {
      const result = await ProtocolOrchestrator.execute(msg.payload);
      const response: WorkerResultMessage = { type: "result", id: msg.id, ok: true, value: result };
      postMessage(response);
    } catch (error) {
      const response: WorkerResultMessage = {
        type: "result",
        id: msg.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      postMessage(response);
    }
  }
};
