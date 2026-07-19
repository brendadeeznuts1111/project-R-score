// lib/mcp/stdio-jsonrpc.ts — Bun-native MCP stdio transport (framing-agnostic: mirrors the
// client's framing — Content-Length headers (Cursor) or bare NDJSON lines (kimi-code))

export type JsonRpcMessage = {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
};

export type ToolTextContent = { type: 'text'; text: string };

export type ToolCallResult = {
  content: ToolTextContent[];
  isError?: boolean;
};

type ClientFraming = 'content-length' | 'ndjson';

/** Framing detected from the client's input; responses mirror it. Default: Content-Length. */
let clientFraming: ClientFraming = 'content-length';

/** Current negotiated framing (env `DX_MCP_NDJSON=1` forces ndjson). */
export function stdioFraming(): ClientFraming {
  return Bun.env.DX_MCP_NDJSON === '1' ? 'ndjson' : clientFraming;
}

export function toolJson(data: unknown, pretty = true): ToolCallResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, pretty ? 2 : 0),
      },
    ],
  };
}

export function toolText(text: string, isError = false): ToolCallResult {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

export function rpcOk(
  id: number | string | undefined,
  result: unknown
): JsonRpcMessage & { result: unknown } {
  return { jsonrpc: '2.0', id, result };
}

export function rpcErr(
  id: number | string | undefined,
  code: number,
  message: string
): JsonRpcMessage & { error: { code: number; message: string } } {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/** Parse tool payload from MCP tools/call result (for tests and tooling). */
export function parseToolPayload(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result;
  const content = (result as { content?: ToolTextContent[] }).content;
  if (!Array.isArray(content) || content.length === 0) return result;
  const text = content[0]?.text;
  if (typeof text !== 'string') return result;
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

export async function* readJsonRpcStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<JsonRpcMessage> {
  let buffer = '';
  const decoder = new TextDecoder();

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });

    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (match) {
          const contentLength = Number(match[1]);
          const bodyStart = headerEnd + 4;
          const bodyEnd = bodyStart + contentLength;
          if (buffer.length < bodyEnd) break;
          const body = buffer.slice(bodyStart, bodyEnd);
          buffer = buffer.slice(bodyEnd);
          clientFraming = 'content-length';
          yield JSON.parse(body) as JsonRpcMessage;
          continue;
        }
      }

      const nl = buffer.indexOf('\n');
      if (nl === -1) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith('{')) continue;
      clientFraming = 'ndjson';
      yield JSON.parse(line) as JsonRpcMessage;
    }
  }
}

export function writeJsonRpc(msg: object): void {
  const json = JSON.stringify(msg);
  if (stdioFraming() === 'ndjson') {
    Bun.stdout.write(json + '\n');
    return;
  }
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`;
  Bun.stdout.write(header + json);
}
