// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --outfile
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetch
// @see https://bun.com/docs/runtime/networking/fetch#custom-headers — fetch headers
// @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
// @see https://bun.com/docs/runtime/networking/fetch#debugging — verbose: true
// @see https://bun.com/docs/runtime/networking/fetch#dns-prefetching — dns.prefetch
// @see https://bun.com/docs/runtime/networking/fetch#implementation-details — keepalive
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — port/hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — BUN_PORT / --port
// @see https://bun.com/docs/runtime/http/server#reference — Server type surface
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags — SocialMetadata
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
// @see https://bun.com/docs/runtime/markdown#bun-markdown-react — Bun.markdown.react
// @see https://bun.com/docs/runtime/markdown#component-overrides — component-overrides
// @see https://bun.com/docs/runtime/markdown#available-overrides — available-overrides
// @see https://bun.com/docs/runtime/markdown#options — options
// @see https://bun.com/docs/runtime/markdown#parser-options — parser-options
// @see https://bun.com/docs/runtime/markdown#parser-options — parser-options-2
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — BUN_OPTIONS
// @see https://bun.com/docs/bundler/executables#embedding-runtime-arguments — embedding-runtime-arguments
// @see https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata — file-uploads
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker
// @see https://bun.com/docs/runtime/workers#worker-ref — worker.ref
// @see https://bun.com/docs/runtime/workers#worker-unref — worker.unref
// @see https://bun.com/docs/runtime/workers#bun-ismainthread — Bun.isMainThread
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
/**
 * Frozen lang+code from Bun guide / blog pages.
 * Prefer these over catalog peer-scavenge — examples bind to token or path key.
 *
 * Full hrefs: lib/docs/bun-site-url.ts (URLPatternInit protocol/hostname/pathname).
 * Path keys stay relative (guides/…, blog/…#frag) — never hardcode host strings here.
 *
 * Note: bun.com blog HTML often uses meta name="og:*" (not only property="og:*");
 * extract-metadata + social-metadata-boundaries cover both shapes.
 */

import { guideKeyFromUrl } from '../lib/docs/bun-site-url.ts';
export type GuideExample = { lang: string; body: string };

/** Key = path under bun.com/docs/ (no leading slash, no .md). */
export const GUIDE_EXAMPLES: Record<string, GuideExample[]> = {
  'runtime/networking/fetch': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com");\n\nconsole.log(response.status); // => 200\n\nconst text = await response.text(); // or response.json(), response.formData(), etc.',
    },
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  headers: {\n    "X-Custom-Header": "value",\n  },\n});',
    },
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  signal: AbortSignal.timeout(1000),\n});',
    },
  ],
  'runtime/networking/fetch#sending-a-post-request': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  method: "POST",\n  body: "Hello, world!",\n});',
    },
  ],
  'runtime/networking/fetch#proxying-requests': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  proxy: "http://proxy.com",\n});',
    },
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  proxy: {\n    url: "http://proxy.com",\n    headers: {\n      "Proxy-Authorization": "Bearer my-token",\n      "X-Custom-Proxy-Header": "value",\n    },\n  },\n});',
    },
  ],
  'runtime/networking/fetch#streaming-response-bodies': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com");\n\nfor await (const chunk of response.body) {\n  console.log(chunk);\n}',
    },
  ],
  'runtime/networking/fetch#streaming-request-bodies': [
    {
      lang: 'ts',
      body: 'const stream = new ReadableStream({\n  start(controller) {\n    controller.enqueue("Hello");\n    controller.enqueue(" ");\n    controller.enqueue("World");\n    controller.close();\n  },\n});\n\nconst response = await fetch("http://example.com", {\n  method: "POST",\n  body: stream,\n});',
    },
  ],
  'runtime/networking/fetch#fetching-a-url-with-a-timeout': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  signal: AbortSignal.timeout(1000),\n});',
    },
  ],
  'runtime/networking/fetch#performance': [
    {
      lang: 'ts',
      body: 'import { dns } from "bun";\n\ndns.prefetch("bun.com");',
    },
    {
      lang: 'ts',
      body: 'import { fetch } from "bun";\n\nfetch.preconnect("https://bun.com");',
    },
  ],
  'runtime/networking/fetch#preconnect-to-a-host': [
    {
      lang: 'ts',
      body: 'import { fetch } from "bun";\n\nfetch.preconnect("https://bun.com");',
    },
  ],
  // Not implemented on Windows — see Bun docs caveat on this anchor.
  // Explicit :443 required on current Bun (default HTTPS port rejected as "Invalid port").
  'runtime/networking/fetch#preconnect-at-startup': [
    {
      lang: 'sh',
      body: 'bun --fetch-preconnect https://bun.com:443 ./my-script.ts',
    },
  ],
  'runtime/networking/fetch#connection-pooling-http-keep-alive': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  keepalive: false,\n});',
    },
  ],
  'runtime/networking/fetch#simultaneous-connection-limit': [
    {
      lang: 'sh',
      body: 'BUN_CONFIG_MAX_HTTP_REQUESTS=512 bun ./my-script.ts',
    },
  ],
  'runtime/networking/fetch#response-buffering': [
    {
      lang: 'ts',
      body: 'import { write } from "bun";\n\nawait write("output.txt", response);',
    },
  ],
  'runtime/networking/fetch#debugging': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  verbose: true,\n});',
    },
  ],
  'runtime/networking/fetch#dns-prefetching': [
    {
      lang: 'ts',
      body: 'import { dns } from "bun";\n\ndns.prefetch("bun.com");',
    },
  ],
  'runtime/networking/fetch#dns-caching': [
    {
      lang: 'ts',
      body: 'import { dns } from "bun";\n\ndns.getCacheStats();',
    },
  ],
  'runtime/networking/fetch#implementation-details': [
    {
      lang: 'ts',
      body: 'const response = await fetch("http://example.com", {\n  keepalive: false,\n});',
    },
  ],
  'runtime/http/server': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  routes: {\n    "/api/status": new Response("OK"),\n    "/users/:id": req => {\n      return new Response(`Hello User ${req.params.id}!`);\n    },\n    "/api/posts": {\n      GET: () => new Response("List posts"),\n      POST: async req => {\n        const body = await req.json();\n        return Response.json({ created: true, ...body });\n      },\n    },\n    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),\n  },\n  fetch(req) {\n    return new Response("Not Found", { status: 404 });\n  },\n});\n\nconsole.log(`Server running at ${server.url}`);',
    },
  ],
  'runtime/http/server#basic-setup': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  routes: {\n    "/api/status": new Response("OK"),\n    "/users/:id": req => {\n      return new Response(`Hello User ${req.params.id}!`);\n    },\n  },\n  fetch(req) {\n    return new Response("Not Found", { status: 404 });\n  },\n});\n\nconsole.log(`Server running at ${server.url}`);',
    },
  ],
  'runtime/http/server#html-imports': [
    {
      lang: 'ts',
      body: 'import myReactSinglePageApp from "./index.html";\n\nBun.serve({\n  routes: {\n    "/": myReactSinglePageApp,\n  },\n});',
    },
  ],
  'runtime/http/server#changing-the-port-and-hostname': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  port: 8080, // defaults to $BUN_PORT, $PORT, $NODE_PORT otherwise 3000\n  hostname: "mydomain.com", // defaults to "0.0.0.0"\n  fetch(req) {\n    return new Response("404!");\n  },\n});',
    },
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  port: 0, // random port\n  fetch(req) {\n    return new Response("404!");\n  },\n});\n\n// server.port is the randomly selected port\nconsole.log(server.port);',
    },
    {
      lang: 'ts',
      body: 'console.log(server.port); // 3000\nconsole.log(server.url); // http://localhost:3000',
    },
  ],
  'runtime/http/server#configuring-a-default-port': [
    { lang: 'sh', body: 'bun --port=4002 server.ts' },
    { lang: 'sh', body: 'BUN_PORT=4002 bun server.ts' },
    { lang: 'sh', body: 'PORT=4002 bun server.ts' },
    { lang: 'sh', body: 'NODE_PORT=4002 bun server.ts' },
  ],
  'runtime/http/server#unix-domain-sockets': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  unix: "/tmp/my-socket.sock", // path to socket\n  fetch(req) {\n    return new Response(`404!`);\n  },\n});',
    },
  ],
  'runtime/http/server#abstract-namespace-sockets': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  unix: "\\0my-abstract-socket", // abstract namespace socket\n  fetch(req) {\n    return new Response(`404!`);\n  },\n});',
    },
  ],
  'runtime/http/server#http-3-quic': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  tls: {\n    key: Bun.file("./key.pem"),\n    cert: Bun.file("./cert.pem"),\n  },\n  http3: true,\n  fetch(req) {\n    return new Response("Hello over HTTP/3!");\n  },\n});',
    },
    {
      lang: 'ts',
      body: 'Bun.serve({\n  tls: {\n    key: Bun.file("./key.pem"),\n    cert: Bun.file("./cert.pem"),\n  },\n  http3: true,\n  http1: false,\n  fetch(req) {\n    return new Response("HTTP/3 only");\n  },\n});',
    },
  ],
  'runtime/http/server#idletimeout': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  // 30 seconds (default is 10)\n  idleTimeout: 30,\n  fetch(req) {\n    return new Response("Bun!");\n  },\n});',
    },
  ],
  'runtime/http/server#export-default-syntax': [
    {
      lang: 'ts',
      body: 'import type { Serve } from "bun";\n\nexport default {\n  fetch(req) {\n    return new Response("Bun!");\n  },\n} satisfies Serve.Options<undefined>;',
    },
  ],
  'runtime/http/server#hot-route-reloading': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  routes: {\n    "/api/version": () => Response.json({ version: "1.0.0" }),\n  },\n});\n\n// Deploy new routes without downtime\nserver.reload({\n  routes: {\n    "/api/version": () => Response.json({ version: "2.0.0" }),\n  },\n});',
    },
  ],
  'runtime/http/server#server-stop': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  fetch(req) {\n    return new Response("Hello!");\n  },\n});\n\n// Gracefully stop the server (waits for in-flight requests)\nawait server.stop();\n\n// Force stop and close all active connections\nawait server.stop(true);',
    },
  ],
  'runtime/http/server#server-ref-and-server-unref': [
    {
      lang: 'ts',
      body: "// Don't keep process alive if server is the only thing running\nserver.unref();\n\n// Restore default behavior - keep process alive\nserver.ref();",
    },
  ],
  'runtime/http/server#server-reload': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  routes: {\n    "/api/version": Response.json({ version: "v1" }),\n  },\n  fetch(req) {\n    return new Response("v1");\n  },\n});\n\nserver.reload({\n  routes: {\n    "/api/version": Response.json({ version: "v2" }),\n  },\n  fetch(req) {\n    return new Response("v2");\n  },\n});',
    },
  ],
  'runtime/http/server#server-timeout-request-seconds': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  async fetch(req, server) {\n    // Give this request up to 60 seconds of inactivity instead of the default 10\n    server.timeout(req, 60);\n    await req.text();\n    return new Response("Done!");\n  },\n});',
    },
    {
      lang: 'ts',
      body: 'Bun.serve({\n  routes: {\n    "/events": (req, server) => {\n      server.timeout(req, 0);\n      return new Response(\n        async function* () {\n          yield "data: hello\\n\\n";\n        },\n        { headers: { "Content-Type": "text/event-stream" } },\n      );\n    },\n  },\n});',
    },
  ],
  'runtime/http/server#server-requestip-request': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  fetch(req, server) {\n    const address = server.requestIP(req);\n    if (address) {\n      return new Response(`Client IP: ${address.address}, Port: ${address.port}`);\n    }\n    return new Response("Unknown client");\n  },\n});',
    },
  ],
  'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  fetch(req, server) {\n    return new Response(\n      `Active requests: ${server.pendingRequests}\\n` +\n        `Active WebSockets: ${server.pendingWebSockets}`,\n    );\n  },\n});',
    },
  ],
  'runtime/http/server#server-subscribercount-topic': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  fetch(req, server) {\n    const chatUsers = server.subscriberCount("chat");\n    return new Response(`${chatUsers} users in chat`);\n  },\n  websocket: {\n    message(ws) {\n      ws.subscribe("chat");\n    },\n  },\n});',
    },
  ],
  'runtime/http/server#benchmarks': [
    {
      lang: 'ts',
      body: 'Bun.serve({\n  fetch(req: Request) {\n    return new Response("Bun!");\n  },\n  port: 3000,\n});',
    },
  ],
  // Type surface from docs #reference
  'runtime/http/server#reference': [
    {
      lang: 'ts',
      body: 'interface Server extends Disposable {\n  stop(closeActiveConnections?: boolean): Promise<void>;\n  reload(options: Serve): void;\n  fetch(request: Request | string): Response | Promise<Response>;\n  upgrade<T = undefined>(request: Request, options?: { headers?: Bun.HeadersInit; data?: T }): boolean;\n  publish(topic: string, data: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer, compress?: boolean): ServerWebSocketSendStatus;\n  subscriberCount(topic: string): number;\n  requestIP(request: Request): SocketAddress | null;\n  timeout(request: Request, seconds: number): void;\n  ref(): void;\n  unref(): void;\n  readonly pendingRequests: number;\n  readonly pendingWebSockets: number;\n  readonly url: URL;\n  readonly port: number;\n  readonly hostname: string;\n  readonly development: boolean;\n  readonly id: string; // brand-ok — Bun Server.id from docs reference\n}',
    },
  ],
  'guides/runtime/read-env': [
    { lang: 'ts', body: 'process.env.API_TOKEN; // => "secret"' },
    { lang: 'ts', body: 'Bun.env.API_TOKEN; // => "secret"' },
    { lang: 'sh', body: 'bun --print process.env' },
  ],
  'guides/runtime/set-env': [
    {
      lang: 'ts',
      body: 'Bun.env.API_TOKEN; // => "secret"\nprocess.env.API_TOKEN; // => "secret"',
    },
    { lang: 'ini', body: 'FOO=hello\nBAR=world' },
    { lang: 'sh', body: 'FOO=helloworld bun run dev' },
  ],
  'guides/runtime/timezone': [
    { lang: 'ts', body: 'process.env.TZ = "America/New_York";' },
    { lang: 'sh', body: 'TZ=America/New_York bun run dev' },
    {
      lang: 'ts',
      body: 'new Date().getHours(); // => 18\n\nprocess.env.TZ = "America/New_York";\n\nnew Date().getHours(); // => 21',
    },
  ],
  'guides/html-rewriter/extract-social-meta': [
    {
      lang: 'ts',
      body: `interface SocialMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
}

async function extractSocialMetadata(url: string): Promise<SocialMetadata> {
  const metadata: SocialMetadata = {};
  const response = await fetch(url);

  const rewriter = new HTMLRewriter()
    .on('meta[property^="og:"]', {
      element(el) {
        const property = el.getAttribute("property");
        const content = el.getAttribute("content");
        if (property && content) {
          const key = property.replace("og:", "") as keyof SocialMetadata;
          metadata[key] = content;
        }
      },
    })
    .on('meta[name^="twitter:"]', {
      element(el) {
        const name = el.getAttribute("name");
        const content = el.getAttribute("content");
        if (name && content) {
          const key = name.replace("twitter:", "") as keyof SocialMetadata;
          if (!metadata[key]) {
            metadata[key] = content;
          }
        }
      },
    })
    .on('meta[name="description"]', {
      element(el) {
        const content = el.getAttribute("content");
        if (content && !metadata.description) {
          metadata.description = content;
        }
      },
    })
    .on("title", {
      text(text) {
        if (!metadata.title) {
          metadata.title = text.text;
        }
      },
    });

  await rewriter.transform(response).blob();

  if (metadata.image && !metadata.image.startsWith("http")) {
    try {
      metadata.image = new URL(metadata.image, url).href;
    } catch {
      // Keep the original URL if parsing fails
    }
  }

  return metadata;
}`,
    },
  ],
  'guides/util/which-path-to-executable-bin': [
    {
      lang: 'ts',
      body: 'Bun.which("sh"); // => "/bin/sh"\nBun.which("notfound"); // => null\nBun.which("bun"); // => "/home/user/.bun/bin/bun"',
    },
  ],
  'guides/util/path-to-file-url': [
    {
      lang: 'ts',
      body: 'Bun.pathToFileURL("/path/to/file.txt").href;\n// => "file:///path/to/file.txt"',
    },
  ],
  'guides/util/file-url-to-path': [
    {
      lang: 'ts',
      body: 'Bun.fileURLToPath("file:///path/to/file.txt");\n// => "/path/to/file.txt"',
    },
  ],
  // Primary API examples from runtime/utils.md
  'runtime/utils#bun-fileurltopath': [
    {
      lang: 'ts',
      body: 'const path = Bun.fileURLToPath(new URL("file:///foo/bar.txt"));\nconsole.log(path); // "/foo/bar.txt"',
    },
  ],
  'runtime/utils#bun-pathtofileurl': [
    {
      lang: 'ts',
      body: 'const url = Bun.pathToFileURL("/foo/bar.txt");\nconsole.log(url); // "file:///foo/bar.txt"',
    },
  ],
  // Official docs — Bun.inspect()
  'runtime/utils#bun-inspect': [
    {
      lang: 'ts',
      body: 'const obj = { foo: "bar" };\nconst str = Bun.inspect(obj);\n// => \'{\\nfoo: "bar" \\n}\'\n\nconst arr = new Uint8Array([1, 2, 3]);\nconst str = Bun.inspect(arr);\n// => "Uint8Array(3) [ 1, 2, 3 ]"',
    },
  ],
  // Official reference — BunInspectOptions { colors, depth, sorted, compact }
  'reference/bun/BunInspectOptions': [
    {
      lang: 'ts',
      body: 'const str = Bun.inspect(\n  { z: 1, a: { b: 2, c: 3 } },\n  { colors: true, depth: 2, sorted: true, compact: false },\n);',
    },
  ],
  // Official docs — Bun.inspect.custom (≡ util.inspect.custom)
  'runtime/utils#bun-inspect-custom': [
    {
      lang: 'ts',
      body: 'class Foo {\n  [Bun.inspect.custom]() {\n    return "foo";\n  }\n}\n\nconst foo = new Foo();\nconsole.log(foo); // => "foo"',
    },
  ],
  // Official docs — Bun.markdown.react
  'runtime/markdown#bun-markdown-react': [
    {
      lang: 'tsx',
      body: 'function Markdown({ text }: { text: string }) {\n  return Bun.markdown.react(text);\n}',
    },
  ],
  // Official docs — Component overrides (+ Available overrides table)
  'runtime/markdown#component-overrides': [
    {
      lang: 'tsx',
      body: 'function Code({ language, children }) {\n  return (\n    <pre data-language={language}>\n      <code>{children}</code>\n    </pre>\n  );\n}\n\nfunction Link({ href, title, children }) {\n  return (\n    <a href={href} title={title} target="_blank" rel="noopener noreferrer">\n      {children}\n    </a>\n  );\n}\n\nfunction Heading({ id, children }) {\n  return (\n    <h2 id={id}>\n      <a href={`#${id}`}>{children}</a>\n    </h2>\n  );\n}\n\nconst el = Bun.markdown.react(\n  content,\n  {\n    pre: Code,\n    a: Link,\n    h2: Heading,\n  },\n  { headings: { ids: true } },\n);',
    },
  ],
  'runtime/markdown#available-overrides': [
    {
      lang: 'tsx',
      body: 'const el = Bun.markdown.react(\n  content,\n  {\n    pre: Code,\n    a: Link,\n    h2: Heading,\n  },\n  { headings: { ids: true } },\n);',
    },
  ],
  // Official docs — Bun.markdown.html Options (parser SSOT)
  'runtime/markdown#options': [
    {
      lang: 'ts',
      body: 'const html = Bun.markdown.html("some markdown", {\n  tables: true, // GFM tables (default: true)\n  strikethrough: true, // GFM strikethrough (default: true)\n  tasklists: true, // GFM task lists (default: true)\n  tagFilter: true, // GFM tag filter for disallowed HTML tags\n  autolinks: true, // Autolink URLs, emails, and www. links\n});',
    },
  ],
  // Official docs — Bun.markdown.render Parser options (third arg)
  'runtime/markdown#parser-options': [
    {
      lang: 'ts',
      body: 'const result = Bun.markdown.render(\n  "Visit www.example.com",\n  {\n    link: (children, { href }) => `[${children}](${href})`,\n    paragraph: children => children,\n  },\n  { autolinks: true },\n);',
    },
  ],
  // Official docs — Bun.markdown.react Parser options (#parser-options)
  'runtime/markdown#parser-options': [
    {
      lang: 'tsx',
      body: 'const el = Bun.markdown.react("## Hello World", undefined, {\n  headings: { ids: true },\n  autolinks: true,\n});',
    },
  ],
  // Official docs — Runtime arguments via BUN_OPTIONS (standalone executables)
  'bundler/executables#runtime-arguments-via-bun-options': [
    {
      lang: 'bash',
      body: '# Enable CPU profiling on a compiled executable\nBUN_OPTIONS="--cpu-prof" ./myapp\n\n# Enable heap profiling with markdown output\nBUN_OPTIONS="--heap-prof-md" ./myapp\n\n# Combine multiple flags\nBUN_OPTIONS="--smol --cpu-prof-md" ./myapp',
    },
  ],
  // Official docs — Embedding runtime arguments (--compile-exec-argv)
  'bundler/executables#embedding-runtime-arguments': [
    {
      lang: 'bash',
      body: 'bun build --compile --compile-exec-argv="--smol --user-agent=MyBot" ./app.ts --outfile myapp',
    },
  ],
  // Official guide — Upload files via HTTP using FormData
  'guides/http/file-uploads#upload-files-via-http-using-formdata': [
    {
      lang: 'ts',
      body: 'const server = Bun.serve({\n  port: 4000,\n  async fetch(req) {\n    const url = new URL(req.url);\n\n    // return index.html for root path\n    if (url.pathname === "/")\n      return new Response(Bun.file("index.html"), {\n        headers: {\n          "Content-Type": "text/html",\n        },\n      });\n\n    // parse formdata at /action\n    if (url.pathname === "/action") {\n      const formdata = await req.formData();\n      const name = formdata.get("name");\n      const profilePicture = formdata.get("profilePicture");\n      if (!profilePicture) throw new Error("Must upload a profile picture.");\n      // write profilePicture to disk\n      await Bun.write("profilePicture.png", profilePicture);\n      return new Response("Success");\n    }\n\n    return new Response("Not Found", { status: 404 });\n  },\n});',
    },
  ],
  // Official docs — Creating a Worker
  'runtime/workers#creating-a-worker': [
    {
      lang: 'ts',
      body: 'const worker = new Worker("./worker.ts");\n\nworker.postMessage("hello");\nworker.onmessage = event => {\n  console.log(event.data);\n};',
    },
  ],
  // Official docs — worker.unref()
  'runtime/workers#worker-unref': [
    {
      lang: 'ts',
      body: 'const worker = new Worker(new URL("worker.ts", import.meta.url).href);\nworker.unref();',
    },
  ],
  // Official docs — worker.ref()
  'runtime/workers#worker-ref': [
    {
      lang: 'ts',
      body: 'const worker = new Worker(new URL("worker.ts", import.meta.url).href);\nworker.unref();\n// later...\nworker.ref();',
    },
    {
      lang: 'ts',
      body: 'const worker = new Worker(new URL("worker.ts", import.meta.url).href, {\n  ref: false,\n});',
    },
  ],
  // Official docs — Terminating a worker
  'runtime/workers#terminating-a-worker': [
    {
      lang: 'ts',
      body: 'const worker = new Worker(new URL("worker.ts", import.meta.url).href);\n\n// ...some time later\nworker.terminate();',
    },
  ],
  // Official docs — Worker smol mode
  'runtime/workers#memory-usage-with-smol': [
    {
      lang: 'ts',
      body: 'const worker = new Worker("./i-am-smol.ts", {\n  smol: true,\n});',
    },
  ],
  // Official docs — Bun.isMainThread
  'runtime/workers#bun-ismainthread': [
    {
      lang: 'ts',
      body: 'if (Bun.isMainThread) {\n  console.log("I\'m the main thread");\n} else {\n  console.log("I\'m in a worker");\n}',
    },
  ],
  // Official blog — bun test --isolate / --parallel (v1.3.13)
  'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel': [
    {
      lang: 'bash',
      body: '# --- bun test --isolate (fresh global per file) ---\nbun test --isolate ./tests\n\n# --- bun test --parallel (file workers; auto --isolate) ---\n# NOT the same as: bun run --parallel  (see pm/filter#parallel-and-sequential-mode)\nbun test --parallel ./tests\nbun test --parallel=8 ./tests',
    },
  ],
  // Official blog — bun test --shard=M/N (v1.3.13)
  'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs': [
    {
      lang: 'bash',
      body: '# CI matrix (1-based). Empty shards exit 0.\nbun test --shard=1/3\nbun test --shard=2/3\nbun test --shard=3/3',
    },
  ],
  // Official blog — bun test --changed (v1.3.13)
  'blog/bun-v1.3.13#bun-test-changed': [
    {
      lang: 'bash',
      body: '# Dirty tree (unstaged + staged + untracked)\nbun test --changed\n\n# Since commit / branch / tag\nbun test --changed=HEAD~1\nbun test --changed=main\n\n# Re-query git on every watch restart\nbun test --changed --watch',
    },
  ],
  // Official blog — SHA3 in WebCrypto + node:crypto (v1.3.13)
  'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto': [
    {
      lang: 'ts',
      body: 'import crypto from "crypto";\n\n// node:crypto\nconst hash = crypto.createHash("sha3-256");\nhash.update("Hello, world!");\nconsole.log(hash.digest("hex"));\n// => "f345a219da005ebe9c1a1eaad97bbf38a10c8473e41d0af7fb617caa0c6aa722"\n\nconst hmac = crypto.createHmac("sha3-256", "secret-key");\nhmac.update("Hello, world!");\nconsole.log(hmac.digest("hex"));\n\n// Web Crypto API\nconst digest = await crypto.subtle.digest(\n  "SHA3-256",\n  new TextEncoder().encode("Hello, world!"),\n);\nconsole.log(Buffer.from(digest).toString("hex"));\n\n// Also: Bun.CryptoHasher("sha3-256") — sync native path',
    },
  ],
  // Official docs — bun run --parallel / --sequential (Foreman; ≠ bun test --parallel)
  'pm/filter#parallel-and-sequential-mode': [
    {
      lang: 'bash',
      body: "# Workspace / package.json scripts (Foreman-style) — NOT bun test workers\nbun run --parallel build test\nbun run --sequential build test\nbun run --parallel --filter '*' lint\nbun run --parallel --workspaces --if-present build",
    },
  ],
  // Official docs — Bun.inspect.table(tabularData, properties, options)
  'runtime/utils#bun-inspect-table-tabulardata-properties-options': [
    {
      lang: 'ts',
      body: 'console.log(\n  Bun.inspect.table([\n    { a: 1, b: 2, c: 3 },\n    { a: 4, b: 5, c: 6 },\n    { a: 7, b: 8, c: 9 },\n  ]),\n);\n//\n// ┌───┬───┬───┬───┐\n// │   │ a │ b │ c │\n// ├───┼───┼───┼───┤\n// │ 0 │ 1 │ 2 │ 3 │\n// │ 1 │ 4 │ 5 │ 6 │\n// │ 2 │ 7 │ 8 │ 9 │\n// └───┴───┴───┴───┘',
    },
    {
      lang: 'ts',
      // Pass an array of property names to display only those properties.
      body: 'console.log(\n  Bun.inspect.table(\n    [\n      { a: 1, b: 2, c: 3 },\n      { a: 4, b: 5, c: 6 },\n    ],\n    ["a", "c"],\n  ),\n);\n//\n// ┌───┬───┬───┐\n// │   │ a │ c │\n// ├───┼───┼───┤\n// │ 0 │ 1 │ 3 │\n// │ 1 │ 4 │ 6 │\n// └───┴───┴───┘',
    },
    {
      lang: 'ts',
      // Pass { colors: true } to enable ANSI colors (options as 2nd arg).
      body: 'console.log(\n  Bun.inspect.table(\n    [\n      { a: 1, b: 2, c: 3 },\n      { a: 4, b: 5, c: 6 },\n    ],\n    {\n      colors: true,\n    },\n  ),\n);',
    },
  ],
  // node:url compatibility (reference pages)
  'reference/node/url/fileURLToPath': [
    {
      lang: 'ts',
      body: "import { fileURLToPath } from 'node:url';\nconst __filename = fileURLToPath(import.meta.url);",
    },
    {
      lang: 'ts',
      body: "new URL('file:///C:/path/').pathname;      // Incorrect: /C:/path/\nfileURLToPath('file:///C:/path/');         // Correct:   C:\\path\\ (Windows)",
    },
  ],
  'reference/node/url/pathToFileURL': [
    {
      lang: 'ts',
      body: "import { pathToFileURL } from 'node:url';\npathToFileURL('/foo#1');        // Correct: file:///foo%231 (POSIX)\npathToFileURL('/some/path%.c'); // Correct: file:///some/path%25.c (POSIX)",
    },
  ],
  'guides/util/import-meta-dir': [{ lang: 'ts', body: 'import.meta.dir; // => "/a/b"' }],
  // Runtime CLI section (ParamField docs — no ``` fences on page)
  'runtime#transpilation-language-features': [
    {
      lang: 'sh',
      body: 'bun --define process.env.NODE_ENV:\\"development\\" ./index.ts',
    },
    { lang: 'sh', body: 'bun --drop=console ./index.ts' },
    { lang: 'sh', body: 'bun --loader .js:jsx ./index.ts' },
    { lang: 'sh', body: 'bun --no-macros ./index.ts' },
  ],
  // Official runtime.md — `bun run -` to pipe code from stdin (bash fences)
  'runtime#bun-run-to-pipe-code-from-stdin': [
    { lang: 'bash', body: 'echo "console.log(\'Hello\')" | bun run -' },
    {
      lang: 'bash',
      body: 'echo "console.log!(\'This is TypeScript!\' as any)" > secretly-typescript.js\nbun run - < secretly-typescript.js',
    },
    { lang: 'bash', body: 'curl -s https://example.com/script.ts | bun run -' },
  ],
  'guides/process/stdin': [
    {
      lang: 'ts',
      body: 'for await (const chunk of Bun.stdin.stream()) {\n  const chunkText = Buffer.from(chunk).toString();\n  console.log(`Chunk: ${chunkText}`);\n}',
    },
    { lang: 'sh', body: 'echo "hello" | bun run stdin.ts' },
  ],
  // Blog ship — URLPattern API (v1.3.4)
  // Text fragment: #urlpattern-api:~:text=//%20Match%20URLs%20with,for%20implementing%20this!
  'blog/bun-v1.3.4#urlpattern-api': [
    {
      lang: 'js',
      body: '// Match URLs with a user ID parameter\nconst pattern = new URLPattern({ pathname: "/users/:id" });\n\npattern.test("https://example.com/users/123"); // true\npattern.test("https://example.com/posts/456"); // false\n\nconst result = pattern.exec("https://example.com/users/123");\nconsole.log(result.pathname.groups.id); // "123"\n\n// Wildcard matching\nconst filesPattern = new URLPattern({ pathname: "/files/*" });\nconst match = filesPattern.exec("https://example.com/files/image.png");\nconsole.log(match.pathname.groups[0]); // "image.png"',
    },
    // Ship-note <ul> — Constructor / test / exec / properties / hasRegExpGroups
    {
      lang: 'md',
      body: [
        '- **Constructor**: Create patterns from strings or `URLPatternInit` dictionaries',
        '- **`test()`**: Check if a URL matches the pattern (returns boolean)',
        '- **`exec()`**: Extract matched groups from a URL (returns `URLPatternResult` or null)',
        '- **Pattern properties**: `protocol`, `username`, `password`, `hostname`, `port`, `pathname`, `search`, `hash`',
        '- **`hasRegExpGroups`**: Detect if the pattern uses custom regular expressions',
      ].join('\n'),
    },
    {
      lang: 'txt',
      body: '408 Web Platform Tests pass for this implementation. Thanks to the WebKit team for implementing this!',
    },
  ],
  // Blog perf — URLPattern.test/exec faster (v1.3.12)
  'blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster': [
    {
      lang: 'js',
      body: 'const pattern = new URLPattern({ pathname: "/api/users/:id/posts/:postId" });\n\npattern.test("https://example.com/api/users/42/posts/123");\npattern.exec("https://example.com/api/users/42/posts/123");',
    },
  ],
};

/** Token / topic → guide path (examples + how-to). API locus may still be utils#. */
export const TOKEN_GUIDE_PATH: Record<string, string> = {
  'Bun.env': 'guides/runtime/read-env',
  'process.env': 'guides/runtime/read-env',
  'Read environment variables': 'guides/runtime/read-env',
  'read-env': 'guides/runtime/read-env',
  '.env': 'guides/runtime/set-env',
  '.env files': 'guides/runtime/set-env',
  '.env.local': 'guides/runtime/set-env',
  'Set environment variables': 'guides/runtime/set-env',
  'set-env': 'guides/runtime/set-env',
  TZ: 'guides/runtime/timezone',
  timezone: 'guides/runtime/timezone',
  'set-timezone': 'guides/runtime/timezone',
  'Set a time zone in Bun': 'guides/runtime/timezone',
  SocialMetadata: 'guides/html-rewriter/extract-social-meta',
  extractSocialMetadata: 'guides/html-rewriter/extract-social-meta',
  'extract-social-meta': 'guides/html-rewriter/extract-social-meta',
  'Extract social share images and Open Graph tags': 'guides/html-rewriter/extract-social-meta',
  'HTMLRewriter social': 'guides/html-rewriter/extract-social-meta',
  // networking/fetch TOC fragments (suggest prints these over the page-level trio)
  'sending-a-post-request': 'runtime/networking/fetch#sending-a-post-request',
  'fetch POST': 'runtime/networking/fetch#sending-a-post-request',
  'proxying-requests': 'runtime/networking/fetch#proxying-requests',
  'fetch proxy': 'runtime/networking/fetch#proxying-requests',
  'streaming-response-bodies': 'runtime/networking/fetch#streaming-response-bodies',
  'streaming-request-bodies': 'runtime/networking/fetch#streaming-request-bodies',
  'fetching-a-url-with-a-timeout': 'runtime/networking/fetch#fetching-a-url-with-a-timeout',
  'AbortSignal.timeout': 'runtime/networking/fetch#fetching-a-url-with-a-timeout',
  'fetch performance': 'runtime/networking/fetch#performance',
  'fetch.preconnect': 'runtime/networking/fetch#preconnect-to-a-host',
  'preconnect-to-a-host': 'runtime/networking/fetch#preconnect-to-a-host',
  '--fetch-preconnect': 'runtime/networking/fetch#preconnect-at-startup',
  'preconnect-at-startup': 'runtime/networking/fetch#preconnect-at-startup',
  'connection-pooling-http-keep-alive':
    'runtime/networking/fetch#connection-pooling-http-keep-alive',
  'connection pooling': 'runtime/networking/fetch#connection-pooling-http-keep-alive',
  keepalive: 'runtime/networking/fetch#connection-pooling-http-keep-alive',
  'simultaneous-connection-limit': 'runtime/networking/fetch#simultaneous-connection-limit',
  BUN_CONFIG_MAX_HTTP_REQUESTS: 'runtime/networking/fetch#simultaneous-connection-limit',
  'response-buffering': 'runtime/networking/fetch#response-buffering',
  'response buffering': 'runtime/networking/fetch#response-buffering',
  'fetch debugging': 'runtime/networking/fetch#debugging',
  'fetch verbose': 'runtime/networking/fetch#debugging',
  'verbose: true': 'runtime/networking/fetch#debugging',
  BUN_CONFIG_VERBOSE_FETCH: 'runtime/networking/fetch#debugging',
  'dns-prefetching': 'runtime/networking/fetch#dns-prefetching',
  'dns-caching': 'runtime/networking/fetch#dns-caching',
  'implementation-details': 'runtime/networking/fetch#implementation-details',
  'Connection: close': 'runtime/networking/fetch#implementation-details',
  // runtime/http/server full-page TOC (howto anchors; #reference = type dump)
  'Bun.serve': 'runtime/http/server#basic-setup',
  'basic-setup': 'runtime/http/server#basic-setup',
  'Bun.serve routes': 'runtime/http/server#basic-setup',
  'html-imports': 'runtime/http/server#html-imports',
  'HTML imports': 'runtime/http/server#html-imports',
  'changing-the-port-and-hostname': 'runtime/http/server#changing-the-port-and-hostname',
  'Bun.serve port': 'runtime/http/server#changing-the-port-and-hostname',
  'Bun.serve hostname': 'runtime/http/server#changing-the-port-and-hostname',
  'server.port': 'runtime/http/server#changing-the-port-and-hostname',
  'server.url': 'runtime/http/server#changing-the-port-and-hostname',
  'port: 0': 'runtime/http/server#changing-the-port-and-hostname',
  'configuring-a-default-port': 'runtime/http/server#configuring-a-default-port',
  BUN_PORT: 'runtime/http/server#configuring-a-default-port',
  NODE_PORT: 'runtime/http/server#configuring-a-default-port',
  '--port': 'runtime/http/server#configuring-a-default-port',
  'unix-domain-sockets': 'runtime/http/server#unix-domain-sockets',
  'Bun.serve unix': 'runtime/http/server#unix-domain-sockets',
  'abstract-namespace-sockets': 'runtime/http/server#abstract-namespace-sockets',
  'http-3-quic': 'runtime/http/server#http-3-quic',
  http3: 'runtime/http/server#http-3-quic',
  'http1: false': 'runtime/http/server#http-3-quic',
  idleTimeout: 'runtime/http/server#idletimeout',
  idletimeout: 'runtime/http/server#idletimeout',
  'export-default-syntax': 'runtime/http/server#export-default-syntax',
  'Serve.Options': 'runtime/http/server#export-default-syntax',
  'hot-route-reloading': 'runtime/http/server#hot-route-reloading',
  'server-stop': 'runtime/http/server#server-stop',
  'server.stop': 'runtime/http/server#server-stop',
  'server-ref-and-server-unref': 'runtime/http/server#server-ref-and-server-unref',
  'server.ref': 'runtime/http/server#server-ref-and-server-unref',
  'server.unref': 'runtime/http/server#server-ref-and-server-unref',
  'server-reload': 'runtime/http/server#server-reload',
  'server.reload': 'runtime/http/server#server-reload',
  'server-timeout-request-seconds': 'runtime/http/server#server-timeout-request-seconds',
  'server.timeout': 'runtime/http/server#server-timeout-request-seconds',
  'server-requestip-request': 'runtime/http/server#server-requestip-request',
  'server.requestIP': 'runtime/http/server#server-requestip-request',
  'server-pendingrequests-and-server-pendingwebsockets':
    'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets',
  pendingRequests: 'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets',
  pendingWebSockets: 'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets',
  'server.pendingRequests':
    'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets',
  'server.pendingWebSockets':
    'runtime/http/server#server-pendingrequests-and-server-pendingwebsockets',
  'server-subscribercount-topic': 'runtime/http/server#server-subscribercount-topic',
  'server.subscriberCount': 'runtime/http/server#server-subscribercount-topic',
  'Bun.serve benchmarks': 'runtime/http/server#benchmarks',
  'Bun.serve reference': 'runtime/http/server#reference',
  'server reference': 'runtime/http/server#reference',
  Server: 'runtime/http/server#reference',
  'server.fetch': 'runtime/http/server#reference',
  'server.upgrade': 'runtime/http/server#reference',
  'server.publish': 'runtime/http/server#reference',
  'server.development': 'runtime/http/server#reference',
  'server.id': 'runtime/http/server#reference',
  WebSocketHandler: 'runtime/http/server#reference',
  TLSOptions: 'runtime/http/server#reference',
  'Bun.which': 'guides/util/which-path-to-executable-bin',
  'Get the path to an executable bin file': 'guides/util/which-path-to-executable-bin',
  'which-path-to-executable-bin': 'guides/util/which-path-to-executable-bin',
  'get-the-path-to-an-executable-bin-file': 'guides/util/which-path-to-executable-bin',
  // Bun.* → utils fences; bare / node:url → reference; guide titles → guides
  'Bun.inspect': 'runtime/utils#bun-inspect',
  'Bun.inspect()': 'runtime/utils#bun-inspect',
  'Bun.inspect.custom': 'runtime/utils#bun-inspect-custom',
  'Bun.inspect.table': 'runtime/utils#bun-inspect-table-tabulardata-properties-options',
  'Bun.inspect.table(tabularData, properties, options)':
    'runtime/utils#bun-inspect-table-tabulardata-properties-options',
  BunInspectOptions: 'reference/bun/BunInspectOptions',
  'Bun.markdown.react': 'runtime/markdown#bun-markdown-react',
  'component-overrides': 'runtime/markdown#component-overrides',
  'Bun.markdown.react component overrides': 'runtime/markdown#component-overrides',
  'available-overrides': 'runtime/markdown#available-overrides',
  'Bun.markdown.react available overrides': 'runtime/markdown#available-overrides',
  options: 'runtime/markdown#options',
  'Bun.markdown.html options': 'runtime/markdown#options',
  'Bun.markdown.html': 'runtime/markdown#bun-markdown-html',
  'Bun.markdown.render': 'runtime/markdown#bun-markdown-render',
  'parser-options': 'runtime/markdown#parser-options',
  'Bun.markdown.render parser options': 'runtime/markdown#parser-options',
  'parser-options-2': 'runtime/markdown#parser-options',
  'Bun.markdown.react parser options': 'runtime/markdown#parser-options',
  BUN_OPTIONS: 'bundler/executables#runtime-arguments-via-bun-options',
  'runtime-arguments-via-bun-options': 'bundler/executables#runtime-arguments-via-bun-options',
  'Runtime arguments via BUN_OPTIONS': 'bundler/executables#runtime-arguments-via-bun-options',
  'embedding-runtime-arguments': 'bundler/executables#embedding-runtime-arguments',
  '--compile-exec-argv': 'bundler/executables#embedding-runtime-arguments',
  'file-uploads': 'guides/http/file-uploads#upload-files-via-http-using-formdata',
  'Upload files via HTTP using FormData':
    'guides/http/file-uploads#upload-files-via-http-using-formdata',
  'upload-files-via-http-using-formdata':
    'guides/http/file-uploads#upload-files-via-http-using-formdata',
  'guides/http/file-uploads': 'guides/http/file-uploads#upload-files-via-http-using-formdata',
  'req.formData': 'guides/http/file-uploads#upload-files-via-http-using-formdata',
  'Request.formData': 'guides/http/file-uploads#upload-files-via-http-using-formdata',
  Concurrency: 'runtime/workers#creating-a-worker',
  'Runtime Concurrency': 'runtime/workers#creating-a-worker',
  Worker: 'runtime/workers#creating-a-worker',
  'new Worker': 'runtime/workers#creating-a-worker',
  Workers: 'runtime/workers#creating-a-worker',
  'creating-a-worker': 'runtime/workers#creating-a-worker',
  'worker.ref': 'runtime/workers#worker-ref',
  'worker-ref': 'runtime/workers#worker-ref',
  'worker.unref': 'runtime/workers#worker-unref',
  'worker-unref': 'runtime/workers#worker-unref',
  'managing-lifetime': 'runtime/workers#worker-ref',
  'worker.terminate': 'runtime/workers#terminating-a-worker',
  'terminating-a-worker': 'runtime/workers#terminating-a-worker',
  'worker.postMessage': 'runtime/workers#creating-a-worker',
  'messages-with-postmessage': 'runtime/workers#creating-a-worker',
  'Worker.preload': 'runtime/workers#preload-load-modules-before-the-worker-starts',
  'Worker smol': 'runtime/workers#memory-usage-with-smol',
  'memory-usage-with-smol': 'runtime/workers#memory-usage-with-smol',
  'Bun.isMainThread': 'runtime/workers#bun-ismainthread',
  '--isolate': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  'bun test --isolate': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--parallel': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--parallel=N': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  'bun test --parallel': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--shard': 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  '--shard=M/N': 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  'bun test --shard': 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  '--changed': 'blog/bun-v1.3.13#bun-test-changed',
  'bun test --changed': 'blog/bun-v1.3.13#bun-test-changed',
  'bun test flags': 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  SHA3: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA-3': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-256': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-224': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-384': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-512': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-256': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-224': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-384': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-512': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'crypto.createHash("sha3-256")': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'crypto.subtle.digest("SHA3-256")': 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'bun run --parallel': 'pm/filter#parallel-and-sequential-mode',
  'bun run --sequential': 'pm/filter#parallel-and-sequential-mode',
  'parallel-and-sequential-mode': 'pm/filter#parallel-and-sequential-mode',
  'executables Worker': 'bundler/executables#worker',
  'Bun.pathToFileURL': 'runtime/utils#bun-pathtofileurl',
  'Bun.fileURLToPath': 'runtime/utils#bun-fileurltopath',
  pathToFileURL: 'reference/node/url/pathToFileURL',
  fileURLToPath: 'reference/node/url/fileURLToPath',
  'node:url/pathToFileURL': 'reference/node/url/pathToFileURL',
  'node:url/fileURLToPath': 'reference/node/url/fileURLToPath',
  'url.pathToFileURL': 'reference/node/url/pathToFileURL',
  'url.fileURLToPath': 'reference/node/url/fileURLToPath',
  'Convert an absolute path to a file URL': 'guides/util/path-to-file-url',
  'path-to-file-url': 'guides/util/path-to-file-url',
  'convert-an-absolute-path-to-a-file-url': 'guides/util/path-to-file-url',
  'Convert a file URL to an absolute path': 'guides/util/file-url-to-path',
  'file-url-to-path': 'guides/util/file-url-to-path',
  'convert-a-file-url-to-an-absolute-path': 'guides/util/file-url-to-path',
  'import.meta.dir': 'guides/util/import-meta-dir',
  'Get the directory of the current file': 'guides/util/import-meta-dir',
  'import-meta-dir': 'guides/util/import-meta-dir',
  'get-the-directory-of-the-current-file': 'guides/util/import-meta-dir',
  'Transpilation & Language Features': 'runtime#transpilation-language-features',
  'transpilation-language-features': 'runtime#transpilation-language-features',
  '--tsconfig-override': 'runtime#transpilation-language-features',
  '--define': 'runtime#transpilation-language-features',
  '--drop': 'runtime#transpilation-language-features',
  '--loader': 'runtime#transpilation-language-features',
  '--no-macros': 'runtime#transpilation-language-features',
  '--jsx-factory': 'runtime#transpilation-language-features',
  '--jsx-fragment': 'runtime#transpilation-language-features',
  '--jsx-import-source': 'runtime#transpilation-language-features',
  '--jsx-runtime': 'runtime#transpilation-language-features',
  '--jsx-side-effects': 'runtime#transpilation-language-features',
  '--ignore-dce-annotations': 'runtime#transpilation-language-features',
  'bun run -': 'runtime#bun-run-to-pipe-code-from-stdin',
  'bun run - to pipe code from stdin': 'runtime#bun-run-to-pipe-code-from-stdin',
  'bun-run-to-pipe-code-from-stdin': 'runtime#bun-run-to-pipe-code-from-stdin',
  'pipe code from stdin': 'runtime#bun-run-to-pipe-code-from-stdin',
  'Read from stdin': 'guides/process/stdin',
  'guides/process/stdin': 'guides/process/stdin',
  URLPattern: 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern ship': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern API': 'blog/bun-v1.3.4#urlpattern-api',
  'urlpattern-api': 'blog/bun-v1.3.4#urlpattern-api',
  URLPatternInit: 'blog/bun-v1.3.4#urlpattern-api',
  URLPatternInput: 'blog/bun-v1.3.4#urlpattern-api',
  URLPatternResult: 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.constructor': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.test()': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.exec()': 'blog/bun-v1.3.4#urlpattern-api',
  'test()': 'blog/bun-v1.3.4#urlpattern-api',
  'exec()': 'blog/bun-v1.3.4#urlpattern-api',
  hasRegExpGroups: 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.hasRegExpGroups': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.protocol': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.username': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.password': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.hostname': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.port': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.pathname': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.search': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.hash': 'blog/bun-v1.3.4#urlpattern-api',
  'URLPattern.test': 'blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster',
  'URLPattern.exec': 'blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster',
  'URLPattern perf': 'blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster',
  'urlpattern-is-up-to-2-3x-faster': 'blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster',
};

/**
 * Path key for GUIDE_EXAMPLES via URLPattern.exec (protocol/hostname/pathname/hash).
 * Docs → `guides/…` / `runtime/…`; blog → `blog/<slug>#frag`.
 */
export function docsPathFromUrl(pageUrl: string, opts?: { keepHash?: boolean }): string {
  return guideKeyFromUrl(pageUrl, opts);
}

export function guideExamplesForPage(pageUrl: string): GuideExample[] {
  const withHash = docsPathFromUrl(pageUrl, { keepHash: true });
  if (withHash && GUIDE_EXAMPLES[withHash]) return GUIDE_EXAMPLES[withHash]!;
  const base = docsPathFromUrl(pageUrl);
  return (base && GUIDE_EXAMPLES[base]) || [];
}

export function guideExamplesForToken(name: string): GuideExample[] {
  const path = TOKEN_GUIDE_PATH[name];
  if (!path) return [];
  return GUIDE_EXAMPLES[path] ?? [];
}

/** Prefer token→guide map, then examples keyed by mapped URL (incl. #fragment). */
export function guideExamplesForQuery(query: string, mappedUrl: string): GuideExample[] {
  const byToken = guideExamplesForToken(query);
  if (byToken.length) return byToken;
  return guideExamplesForPage(mappedUrl);
}
