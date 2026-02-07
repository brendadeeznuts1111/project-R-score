// lib/mcp/compression-worker.ts - Bun.spawn subprocess for gzip compress/decompress via IPC

interface WorkerRequest {
  id: string;
  action: "compress" | "decompress";
  data: string;
}

interface WorkerResponse {
  id: string;
  result?: string;
  error?: string;
}

function handleMessage(msg: WorkerRequest): WorkerResponse {
  const { id, action, data } = msg;

  try {
    if (action === "compress") {
      const compressed = Bun.gzipSync(data);
      return { id, result: Buffer.from(compressed).toString("base64") };
    }

    if (action === "decompress") {
      const buf = Buffer.from(data, "base64");
      const decompressed = Bun.gunzipSync(buf);
      return { id, result: Buffer.from(decompressed).toString() };
    }

    return { id, error: `Unknown action: ${action}` };
  } catch (err) {
    return { id, error: err instanceof Error ? err.message : String(err) };
  }
}

// IPC message handler — Bun.spawn({ ipc }) delivers messages here
process.on("message", (msg: WorkerRequest) => {
  const response = handleMessage(msg);
  process.send!(response);
});

// Graceful shutdown
process.on("SIGTERM", () => process.exit(0));
