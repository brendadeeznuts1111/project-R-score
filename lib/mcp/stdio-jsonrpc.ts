// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
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

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ClientFraming = 'content-length' | 'ndjson';

/** Framing detected from the client's input; responses mirror it. Default: Content-Length. */
let clientFraming: ClientFraming = 'content-length';

/** Current negotiated framing (env `DX_MCP_NDJSON=1` forces ndjson). */
export function stdioFraming(): ClientFraming {
  return Bun.env.DX_MCP_NDJSON === '1' ? 'ndjson' : clientFraming;
}

export function toolJson(data: JsonValue, pretty = true): ToolCallResult {
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
  result: JsonValue
): JsonRpcMessage & { result: JsonValue } {
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

const CRLFCRLF = new Uint8Array([0x0d, 0x0a, 0x0d, 0x0a]);
const LFLF = new Uint8Array([0x0a, 0x0a]);
const LF = new Uint8Array([0x0a]);

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export async function* readJsonRpcStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<JsonRpcMessage> {
  // Content-Length counts UTF-8 *bytes*; JS string offsets count UTF-16 code units, so we
  // accumulate raw bytes and slice bodies by byte offsets before decoding (unicode-safe).
  let buffer = new Uint8Array(0);
  const decoder = new TextDecoder();

  for await (const chunk of stream) {
    const next = new Uint8Array(buffer.length + chunk.length);
    next.set(buffer, 0);
    next.set(chunk, buffer.length);
    buffer = next;

    while (true) {
      // Header terminator: standard \r\n\r\n, lenient \n\n (e.g. MCP servers that use bare LFs).
      const crlfEnd = indexOfBytes(buffer, CRLFCRLF);
      const lfEnd = indexOfBytes(buffer, LFLF);
      let headerEnd = -1;
      let separatorLength = 0;
      if (crlfEnd !== -1 && (lfEnd === -1 || crlfEnd <= lfEnd)) {
        headerEnd = crlfEnd;
        separatorLength = 4;
      } else if (lfEnd !== -1) {
        headerEnd = lfEnd;
        separatorLength = 2;
      }

      if (headerEnd !== -1) {
        const header = decoder.decode(buffer.subarray(0, headerEnd));
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (match) {
          const contentLength = Number(match[1]);
          const bodyStart = headerEnd + separatorLength;
          const bodyEnd = bodyStart + contentLength;
          if (buffer.length < bodyEnd) break; // body incomplete — wait for more chunks
          const body = decoder.decode(buffer.subarray(bodyStart, bodyEnd));
          buffer = buffer.subarray(bodyEnd);
          clientFraming = 'content-length';
          yield JSON.parse(body) as JsonRpcMessage;
          continue;
        }
      }

      // NDJSON fallback (bare JSON lines, e.g. kimi-code).
      const nl = indexOfBytes(buffer, LF);
      if (nl === -1) break;
      const line = decoder.decode(buffer.subarray(0, nl)).trim();
      buffer = buffer.subarray(nl + 1);
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
