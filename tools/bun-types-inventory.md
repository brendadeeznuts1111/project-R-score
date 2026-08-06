# bun-types inventory (deep v3)

Generated from pinned **bun-types** — top-level + nested namespace/class/**interface**/**type X = {…}**/**enum** methods, properties, enum-members + anonymous nested object fields + satellite modules. Not the docs-only utils page.

| Field | Value |
| --- | --- |
| Schema | `factorywager/bun-types-inventory/v3` |
| Generated | 2026-08-06T20:50:31.288Z |
| Runtime | Bun 1.3.14 (`0d9b296a`) |
| bun-types | bun-types@1.4.0-tip.ed700c20 |
| Types root | `/Users/nolarose/.grok/worktrees/nolarose-projects/2026-08-06-3e0e2535/node_modules/bun-types` |
| Source files | `bun.d.ts`, `deprecated.d.ts`, `serve.d.ts`, `sql.d.ts`, `s3.d.ts`, `redis.d.ts`, `shell.d.ts`, `security.d.ts`, `wasm.d.ts`, `jsc.d.ts`, `ffi.d.ts`, `sqlite.d.ts`, `test.d.ts`, `bundle.d.ts` |
| Mode | deep · interfaces · typeAliases · props · enums · nestedObjects |
| Scan roots | `lib/`, `tools/`, `scripts/`, `tests/`, `config/` |
| Total members | **2388** (top **454** · nested **1934** · maxDepth **3**) |
| By depth | d0=454 · d1=1527 · d2=378 · d3=29 |
| By kind | class 33 · const 107 · enum 1 · enum-member 31 · function 158 · interface 225 · method 584 · namespace 29 · property 1033 · type 184 · var 3 |
| By module | `bun` 1876 · `bun:test` 265 · `bun:sqlite` 117 · `bun:ffi` 80 · `bun:jsc` 48 · `bun:bundle` 2 |
| AGENTS map hits | 70 / 2388 |
| Call sites > 0 | 158 · zero 2230 |

Regenerate: `bun run bun:types-inventory:write` · check: `bun run bun:types-inventory:check` · flags: `--shallow` · `--no-interfaces` · `--no-type-aliases` · `--no-props` · `--no-enums` · `--no-nested-objects` · `--tip-diff`

## Module `bun` (1876)

### Top-level (344)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | namespace | `Bun.__internal` | `Bun.__internal.*` | — | — | 0 | 1 | — | `bun.d.ts:49` |
| 0 | interface | `Bun.AbstractWorker` | `Bun.AbstractWorker` | — | — | 0 | 1 | — | `bun.d.ts:347` |
| 0 | interface | `Bun.AbstractWorkerEventMap` | `Bun.AbstractWorkerEventMap` | — | — | 0 | 1 | — | `bun.d.ts:334` |
| 0 | interface | `Bun.AddEventListenerOptions` | `Bun.AddEventListenerOptions` | — | — | 0 | 1 | — | `bun.d.ts:164` |
| 0 | function | `Bun.allocUnsafe` | `Bun.allocUnsafe(size: number): Uint8Array<ArrayBuffer>;` | — | — | 10 | 1 | Allocate a new [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) without zeroing the bytes. | `bun.d.ts:4206` |
| 0 | type | `Bun.Architecture` *(deprecated)* | `Bun.Architecture` | — | — | 0 | 1 | — | `deprecated.d.ts:17` |
| 0 | class | `Bun.Archive` | `new Bun.Archive(…)` | — | — | 39 | 1 | A class for creating and extracting tar archives with optional gzip compression. | `bun.d.ts:9164` |
| 0 | type | `Bun.ArchiveCompression` | `Bun.ArchiveCompression` | — | — | 0 | 1 | Compression format for archive output. | `bun.d.ts:9036` |
| 0 | interface | `Bun.ArchiveExtractOptions` | `Bun.ArchiveExtractOptions` | — | — | 0 | 1 | Options for extracting archive contents. | `bun.d.ts:9076` |
| 0 | type | `Bun.ArchiveInput` | `Bun.ArchiveInput` | — | — | 0 | 1 | Input data for creating an archive. Can be: | `bun.d.ts:9030` |
| 0 | interface | `Bun.ArchiveOptions` | `Bun.ArchiveOptions` | — | — | 0 | 1 | Options for creating an Archive instance. | `bun.d.ts:9055` |
| 0 | const | `Bun.argv` | `Bun.argv: string[];` | — | — | 336 | 1 | The raw arguments passed to the process, including flags passed to Bun. If you want to easily read flags passed to your script, consider using `process.argv`… | `bun.d.ts:523` |
| 0 | class | `Bun.ArrayBufferSink` | `new Bun.ArrayBufferSink(…)` | — | — | 13 | 1 | Fast incremental writer that becomes an {@link ArrayBuffer} on end(). | `bun.d.ts:1912` |
| 0 | type | `Bun.ArrayBufferView` | `Bun.ArrayBufferView` | — | — | 0 | 1 | — | `bun.d.ts:18` |
| 0 | type | `Bun.ArrayType` | `Bun.ArrayType` | — | — | 0 | 1 | — | `sql.d.ts:15` |
| 0 | type | `Bun.BeforeExitListener` | `Bun.BeforeExitListener` | — | — | 0 | 1 | — | `bun.d.ts:34` |
| 0 | type | `Bun.BinaryType` | `Bun.BinaryType` | — | — | 0 | 1 | — | `bun.d.ts:6349` |
| 0 | interface | `Bun.BinaryTypeList` | `Bun.BinaryTypeList` | — | — | 0 | 1 | — | `bun.d.ts:6342` |
| 0 | type | `Bun.BlobOrStringOrBuffer` | `Bun.BlobOrStringOrBuffer` | — | — | 4 | 1 | — | `bun.d.ts:46` |
| 0 | type | `Bun.BlobPart` | `Bun.BlobPart` | — | — | 0 | 1 | — | `bun.d.ts:42` |
| 0 | function | `Bun.braces` | `Bun.braces(pattern: string): string[];` | — | — | 0 | 1 | Perform bash-like brace expansion on the given pattern. | `shell.d.ts:38` |
| 0 | type | `Bun.BufferSource` | `Bun.BufferSource` | — | — | 0 | 1 | — | `bun.d.ts:21` |
| 0 | function | `Bun.build` | `Bun.build(config: BuildConfig): Promise<BuildOutput>;` | — | — | 98 | 1 | Bundles JavaScript, TypeScript, CSS, HTML and other supported files into optimized outputs. | `bun.d.ts:4009` |
| 0 | namespace | `Bun.Build` | `Bun.Build.*` | — | — | 0 | 1 | — | `bun.d.ts:2610` |
| 0 | interface | `Bun.BuildArtifact` | `Bun.BuildArtifact` | — | — | 0 | 1 | A build artifact represents a file that was generated by the bundler @see {@link Bun.build} | `bun.d.ts:3644` |
| 0 | interface | `Bun.BuildConfig` | `Bun.BuildConfig` | — | — | 0 | 1 | — | `bun.d.ts:2628` |
| 0 | interface | `Bun.BuildMetafile` | `Bun.BuildMetafile` | — | — | 0 | 1 | Metafile structure containing build metadata for analysis. | `bun.d.ts:3711` |
| 0 | interface | `Bun.BuildOutput` | `Bun.BuildOutput` | — | — | 0 | 1 | The output of a build | `bun.d.ts:3657` |
| 0 | interface | `Bun.BunFile` | `Bun.BunFile` | — | — | 2 | 1 | [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) powered by the fastest system calls available for operating on files. | `bun.d.ts:2123` |
| 0 | interface | `Bun.BunInspectOptions` | `Bun.BunInspectOptions` | — | — | 1 | 1 | Options for `Bun.inspect` | `bun.d.ts:4211` |
| 0 | type | `Bun.BunLockFile` | `Bun.BunLockFile` | — | — | 0 | 1 | Types for `bun.lock` | `bun.d.ts:9478` |
| 0 | type | `Bun.BunLockFileBasePackageInfo` | `Bun.BunLockFileBasePackageInfo` | — | — | 0 | 1 | — | `bun.d.ts:9524` |
| 0 | type | `Bun.BunLockFilePackageArray` | `Bun.BunLockFilePackageArray` | — | — | 0 | 1 | — | `bun.d.ts:9546` |
| 0 | type | `Bun.BunLockFilePackageInfo` | `Bun.BunLockFilePackageInfo` | — | — | 0 | 1 | — | `bun.d.ts:9539` |
| 0 | type | `Bun.BunLockFileWorkspacePackage` | `Bun.BunLockFileWorkspacePackage` | — | — | 0 | 1 | — | `bun.d.ts:9534` |
| 0 | interface | `Bun.BunMessageEvent` | `Bun.BunMessageEvent` | — | — | 0 | 2 | A message received by a target object. | `bun.d.ts:137` |
| 0 | interface | `Bun.BunPlugin` | `Bun.BunPlugin` | — | — | 0 | 1 | A Bun plugin. Used for extending Bun's behavior at runtime, or with {@link Bun.build} | `bun.d.ts:5687` |
| 0 | interface | `Bun.BunRegisterPlugin` | `Bun.BunRegisterPlugin` | — | — | 0 | 1 | Extend Bun's module resolution and loading behavior | `bun.d.ts:5767` |
| 0 | interface | `Bun.BunRequest` | `Bun.BunRequest` | — | — | 2 | 1 | — | `serve.d.ts:816` |
| 0 | interface | `Bun.CloseEventInit` | `Bun.CloseEventInit` | — | — | 0 | 1 | — | `bun.d.ts:109` |
| 0 | function | `Bun.color` | `Bun.color( input: ColorInput, outputFormat?: /** * True color ANSI color string, for use in terminals * @example \x1b[38;2;100;200;200m */ \| "ansi" \| "ansi-16" ` | — | yes | 213 | 6 | Converts formats of colors | `bun.d.ts:4612` |
| 0 | type | `Bun.ColorInput` | `Bun.ColorInput` | — | — | 0 | 1 | Valid inputs for {@link color} | `bun.d.ts:4592` |
| 0 | interface | `Bun.CompileBuildOptions` | `Bun.CompileBuildOptions` | — | — | 0 | 1 | — | `bun.d.ts:3064` |
| 0 | type | `Bun.CompressionFormat` | `Bun.CompressionFormat` | — | — | 0 | 1 | Extends the standard web formats with `brotli` and `zstd` support. | `bun.d.ts:5220` |
| 0 | function | `Bun.concatArrayBuffers` | `Bun.concatArrayBuffers(buffers: Array<ArrayBufferView \| ArrayBufferLike>, maxLength?: number): ArrayBuffer;` | — | — | 14 | 3 | Concatenate an array of typed arrays into a single `ArrayBuffer`. This is a fast path. | `bun.d.ts:1779` |
| 0 | function | `Bun.connect` | `Bun.connect(options: TCPSocketConnectOptions<Data>): Promise<Socket<Data>>;` | — | — | 21 | 2 | Create a TCP client that connects to a server via a TCP socket | `bun.d.ts:6546` |
| 0 | class | `Bun.Cookie` | `new Bun.Cookie(…)` | — | — | 28 | 1 | A class for working with a single cookie | `bun.d.ts:9595` |
| 0 | interface | `Bun.CookieInit` | `Bun.CookieInit` | — | — | 0 | 1 | — | `bun.d.ts:9558` |
| 0 | class | `Bun.CookieMap` | `new Bun.CookieMap(…)` | — | — | 14 | 1 | A Map-like interface for working with collections of cookies. | `bun.d.ts:9715` |
| 0 | type | `Bun.CookieSameSite` | `Bun.CookieSameSite` | — | — | 0 | 1 | — | `bun.d.ts:9584` |
| 0 | interface | `Bun.CookieStoreDeleteOptions` | `Bun.CookieStoreDeleteOptions` | — | — | 0 | 1 | — | `bun.d.ts:9573` |
| 0 | interface | `Bun.CookieStoreGetOptions` | `Bun.CookieStoreGetOptions` | — | — | 0 | 1 | — | `bun.d.ts:9579` |
| 0 | const | `Bun.cron` | `Bun.cron: {` | — | — | 183 | 1 | — | `bun.d.ts:7605` |
| 0 | interface | `Bun.CronController` | `Bun.CronController` | — | — | 10 | 1 | Controller object passed to the `scheduled()` handler when a cron job fires. | `bun.d.ts:7546` |
| 0 | interface | `Bun.CronJob` | `Bun.CronJob` | — | — | 8 | 1 | A handle to an in-process cron job returned by {@link Bun.cron} when called with a callback. | `bun.d.ts:7594` |
| 0 | type | `Bun.CronWithAutocomplete` | `Bun.CronWithAutocomplete` | — | — | 0 | 1 | A cron schedule: a 5-field expression (`minute hour day month weekday`) or a nickname. | `bun.d.ts:7565` |
| 0 | class | `Bun.CryptoHasher` | `new Bun.CryptoHasher(…)` | — | — | 238 | 1 | Hardware-accelerated cryptographic hash functions | `bun.d.ts:4968` |
| 0 | namespace | `Bun.CSRF` | `Bun.CSRF.*` | — | — | 16 | 1 | Generate and verify CSRF tokens | `bun.d.ts:2290` |
| 0 | type | `Bun.CSRFAlgorithm` | `Bun.CSRFAlgorithm` | — | — | 0 | 1 | — | `bun.d.ts:2222` |
| 0 | interface | `Bun.CSRFGenerateOptions` | `Bun.CSRFGenerateOptions` | — | — | 0 | 1 | — | `bun.d.ts:2224` |
| 0 | interface | `Bun.CSRFVerifyOptions` | `Bun.CSRFVerifyOptions` | — | — | 0 | 1 | — | `bun.d.ts:2252` |
| 0 | interface | `Bun.CustomEventInit` | `Bun.CustomEventInit` | — | — | 0 | 1 | — | `bun.d.ts:132` |
| 0 | const | `Bun.cwd` | `Bun.cwd: string;` | — | — | 5 | 1 | The current working directory of the Bun process. | `bun.d.ts:4790` |
| 0 | function | `Bun.cwd` | `Bun.cwd(newCwd?: string): $;` | — | — | 5 | 1 | — | `shell.d.ts:67` |
| 0 | function | `Bun.deepEquals` | `Bun.deepEquals( a: any, b: any, /** @default false */ strict?: boolean, ): boolean;` | — | yes | 123 | 1 | Fast deep-equality check two objects. | `bun.d.ts:2356` |
| 0 | function | `Bun.deepMatch` | `Bun.deepMatch(subset: unknown, a: unknown): boolean;` | — | — | 0 | 1 | Returns true if all properties in the subset exist in the | `bun.d.ts:2369` |
| 0 | function | `Bun.deflateSync` | `Bun.deflateSync( data: Uint8Array<ArrayBuffer> \| string \| ArrayBuffer, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions, ): Uint8Array<ArrayBuffe` | — | yes | 11 | 1 | Compresses a chunk of data with `zlib` DEFLATE algorithm. | `bun.d.ts:5305` |
| 0 | type | `Bun.DigestEncoding` | `Bun.DigestEncoding` | — | — | 0 | 1 | — | `bun.d.ts:4769` |
| 0 | interface | `Bun.DirectUnderlyingSource` | `Bun.DirectUnderlyingSource` | — | — | 0 | 1 | — | `bun.d.ts:315` |
| 0 | type | `Bun.DisconnectListener` | `Bun.DisconnectListener` | — | — | 0 | 1 | — | `bun.d.ts:35` |
| 0 | namespace | `Bun.dns` | `Bun.dns.*` | — | — | 25 | 1 | DNS Related APIs | `bun.d.ts:1942` |
| 0 | interface | `Bun.DNSLookup` | `Bun.DNSLookup` | — | — | 0 | 1 | — | `bun.d.ts:2077` |
| 0 | type | `Bun.DOMHighResTimeStamp` | `Bun.DOMHighResTimeStamp` | — | — | 0 | 1 | — | `bun.d.ts:44` |
| 0 | interface | `Bun.EditorOptions` | `Bun.EditorOptions` | — | — | 0 | 1 | — | `bun.d.ts:4892` |
| 0 | const | `Bun.embeddedFiles` | `Bun.embeddedFiles: ReadonlyArray<Blob>;` | — | — | 2 | 1 | A list of files embedded into the standalone executable. Lexigraphically sorted by name. | `bun.d.ts:4149` |
| 0 | const | `Bun.enableANSIColors` | `Bun.enableANSIColors: boolean;` | — | — | 15 | 1 | Are ANSI colors enabled for stdin and stdout? | `bun.d.ts:4776` |
| 0 | type | `Bun.Encoding` | `Bun.Encoding` | — | — | 0 | 1 | — | `bun.d.ts:31` |
| 0 | const | `Bun.env` | `Bun.env: Env & NodeJS.ProcessEnv & ImportMetaEnv;` | — | yes | 714 | 1 | The environment variables of the process | `bun.d.ts:518` |
| 0 | function | `Bun.env` | `Bun.env(newEnv?: Record<string, string \| undefined> \| NodeJS.Dict<string> \| undefined): $;` | process.env | yes | 714 | 1 | Change the default environment variables for shells created by this instance. | `shell.d.ts:61` |
| 0 | interface | `Bun.Env` | `Bun.Env` | — | — | 0 | 1 | — | `bun.d.ts:503` |
| 0 | const | `Bun.Err` | `Bun.Err` | — | — | 0 | 4 | — | `bun.d.ts:7413` |
| 0 | interface | `Bun.ErrorEventInit` | `Bun.ErrorEventInit` | — | — | 0 | 1 | — | `bun.d.ts:101` |
| 0 | type | `Bun.Errorlike` *(deprecated)* | `Bun.Errorlike` | — | — | 0 | 1 | — | `deprecated.d.ts:121` |
| 0 | interface | `Bun.ErrorLike` | `Bun.ErrorLike` | — | — | 0 | 1 | — | `bun.d.ts:4011` |
| 0 | function | `Bun.escape` | `Bun.escape(input: string): string;` | — | yes | 0 | 1 | Escape strings for input into shell commands. | `shell.d.ts:44` |
| 0 | function | `Bun.escapeHTML` | `Bun.escapeHTML(input: string \| object \| number \| boolean): string;` | — | yes | 55 | 1 | Escape the following characters in a string: | `bun.d.ts:1863` |
| 0 | interface | `Bun.EventInit` | `Bun.EventInit` | — | — | 0 | 1 | — | `bun.d.ts:122` |
| 0 | interface | `Bun.EventListener` | `Bun.EventListener` | — | — | 0 | 1 | — | `bun.d.ts:172` |
| 0 | interface | `Bun.EventListenerObject` | `Bun.EventListenerObject` | — | — | 0 | 1 | — | `bun.d.ts:176` |
| 0 | interface | `Bun.EventListenerOptions` | `Bun.EventListenerOptions` | — | — | 0 | 1 | — | `bun.d.ts:128` |
| 0 | type | `Bun.EventListenerOrEventListenerObject` | `Bun.EventListenerOrEventListenerObject` | — | — | 0 | 1 | — | `bun.d.ts:45` |
| 0 | interface | `Bun.EventMap` | `Bun.EventMap` | — | — | 0 | 1 | — | `bun.d.ts:188` |
| 0 | interface | `Bun.EventSource` | `Bun.EventSource` | — | — | 0 | 1 | — | `bun.d.ts:199` |
| 0 | interface | `Bun.EventSourceEventMap` | `Bun.EventSourceEventMap` | — | — | 0 | 1 | — | `bun.d.ts:158` |
| 0 | type | `Bun.ExitListener` | `Bun.ExitListener` | — | — | 0 | 1 | — | `bun.d.ts:36` |
| 0 | interface | `Bun.FdSocketOptions` | `Bun.FdSocketOptions` | — | — | 0 | 1 | — | `bun.d.ts:6530` |
| 0 | var | `Bun.fetch` | `Bun.fetch: typeof globalThis.fetch;` | — | — | 9 | 1 | — | `bun.d.ts:4890` |
| 0 | interface | `Bun.FetchEvent` | `Bun.FetchEvent` | — | — | 0 | 1 | — | `bun.d.ts:180` |
| 0 | type | `Bun.FFIFunctionCallable` | `Bun.FFIFunctionCallable` | — | — | 0 | 1 | — | `bun.d.ts:5561` |
| 0 | function | `Bun.file` | `Bun.file(path: string \| URL, options?: BlobPropertyBag): BunFile;` | — | yes | 2189 | 3 | [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob) powered by the fastest system calls available for operating on files. | `bun.d.ts:4142` |
| 0 | interface | `Bun.FileBlob` | `Bun.FileBlob` | — | — | 0 | 1 | — | `bun.d.ts:2097` |
| 0 | interface | `Bun.FileSink` | `Bun.FileSink` | — | — | 0 | 1 | Fast incremental writer for files and pipes. | `s3.d.ts:7` |
| 0 | class | `Bun.FileSystemRouter` | `new Bun.FileSystemRouter(…)` | — | — | 10 | 1 | — | `bun.d.ts:8015` |
| 0 | function | `Bun.fileURLToPath` | `Bun.fileURLToPath(url: URL \| string): string;` | — | yes | 31 | 1 | Convert a {@link URL} to a filesystem path. | `bun.d.ts:1907` |
| 0 | type | `Bun.FormDataEntryValue` | `Bun.FormDataEntryValue` | — | — | 0 | 1 | — | `bun.d.ts:38` |
| 0 | function | `Bun.gc` | `Bun.gc(force?: boolean): void;` | — | — | 26 | 1 | Manually trigger the garbage collector | `bun.d.ts:4801` |
| 0 | function | `Bun.generateHeapSnapshot` | `Bun.generateHeapSnapshot(format?: "jsc"): HeapSnapshot;` | — | — | 12 | 3 | Show precise statistics about memory usage of your application | `bun.d.ts:4847` |
| 0 | interface | `Bun.GenericTransformStream` | `Bun.GenericTransformStream` | — | — | 0 | 1 | — | `bun.d.ts:329` |
| 0 | class | `Bun.Glob` | `new Bun.Glob(…)` | — | — | 323 | 1 | Match files using [glob patterns](https://en.wikipedia.org/wiki/Glob_(programming)). | `bun.d.ts:8195` |
| 0 | interface | `Bun.GlobScanOptions` | `Bun.GlobScanOptions` | — | — | 0 | 1 | — | `bun.d.ts:8119` |
| 0 | function | `Bun.gunzipSync` | `Bun.gunzipSync( data: Uint8Array<ArrayBuffer> \| string \| ArrayBuffer, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions, ): Uint8Array<ArrayBuffer` | — | yes | 14 | 1 | Decompresses a chunk of data with `zlib` GUNZIP algorithm. | `bun.d.ts:5333` |
| 0 | function | `Bun.gzipSync` | `Bun.gzipSync( data: Uint8Array<ArrayBuffer> \| string \| ArrayBuffer, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions, ): Uint8Array<ArrayBuffer>;` | — | yes | 25 | 1 | Compresses a chunk of data with `zlib` GZIP algorithm. | `bun.d.ts:5315` |
| 0 | const | `Bun.hash` | `Bun.hash: ((` | — | — | 73 | 1 | Hash a string or array buffer using Wyhash | `bun.d.ts:2328` |
| 0 | interface | `Bun.Hash` | `Bun.Hash` | — | — | 0 | 1 | — | `bun.d.ts:2334` |
| 0 | interface | `Bun.HeapSnapshot` | `Bun.HeapSnapshot` | — | — | 0 | 1 | JavaScriptCore engine's internal heap snapshot | `bun.d.ts:4810` |
| 0 | interface | `Bun.HTMLBundle` | `Bun.HTMLBundle` | — | — | 0 | 1 | Used when importing an HTML file at runtime or at build time. | `bun.d.ts:5796` |
| 0 | class | `Bun.Image` | `new Bun.Image(…)` | — | yes | 192 | 1 | Decode, transform and re-encode images. Ships JPEG, PNG and WebP via | `bun.d.ts:8363` |
| 0 | namespace | `Bun.Image` | `Bun.Image.*` | — | yes | 192 | 1 | — | `bun.d.ts:8252` |
| 0 | interface | `Bun.Import` | `Bun.Import` | — | — | 0 | 1 | — | `bun.d.ts:2605` |
| 0 | type | `Bun.ImportKind` | `Bun.ImportKind` | — | — | 0 | 1 | — | `bun.d.ts:2594` |
| 0 | const | `Bun.In` | `Bun.In` | — | — | 0 | 4 | — | `bun.d.ts:7411` |
| 0 | function | `Bun.indexOfLine` | `Bun.indexOfLine(buffer: ArrayBufferView \| ArrayBufferLike, offset?: number): number;` | — | — | 0 | 1 | Find the index of a newline character in potentially ill-formed UTF-8 text. | `bun.d.ts:8117` |
| 0 | function | `Bun.inflateSync` | `Bun.inflateSync( data: Uint8Array<ArrayBuffer> \| string \| ArrayBuffer, options?: ZlibCompressionOptions \| LibdeflateCompressionOptions, ): Uint8Array<ArrayBuffe` | — | yes | 15 | 1 | Decompresses a chunk of data with `zlib` INFLATE algorithm. | `bun.d.ts:5324` |
| 0 | function | `Bun.inspect` | `Bun.inspect(arg: any, options?: BunInspectOptions): string;` | — | yes | 250 | 1 | Pretty-print an object the same as {@link console.log} to a `string` | `bun.d.ts:4520` |
| 0 | namespace | `Bun.inspect` | `Bun.inspect.*` | — | yes | 250 | 1 | — | `bun.d.ts:4521` |
| 0 | const | `Bun.isMainThread` | `Bun.isMainThread: boolean;` | — | — | 21 | 1 | Is the current global scope the main thread? | `bun.d.ts:5783` |
| 0 | const | `Bun.isStandaloneExecutable` | `Bun.isStandaloneExecutable: boolean;` | — | — | 5 | 1 | `true` when the current process is a standalone executable produced by | `bun.d.ts:4165` |
| 0 | type | `Bun.JavaScriptLoader` | `Bun.JavaScriptLoader` | — | — | 0 | 1 | — | `bun.d.ts:2349` |
| 0 | namespace | `Bun.JSON5` | `Bun.JSON5.*` | — | — | 7 | 1 | JSON5 related APIs | `bun.d.ts:1486` |
| 0 | namespace | `Bun.JSONC` | `Bun.JSONC.*` | — | — | 12 | 1 | JSONC related APIs | `bun.d.ts:799` |
| 0 | namespace | `Bun.JSONL` | `Bun.JSONL.*` | — | — | 8 | 1 | JSONL (JSON Lines) related APIs. | `bun.d.ts:828` |
| 0 | interface | `Bun.LibdeflateCompressionOptions` | `Bun.LibdeflateCompressionOptions` | — | — | 0 | 1 | — | `bun.d.ts:5294` |
| 0 | function | `Bun.listen` | `Bun.listen(options: TCPSocketListenOptions<Data>): TCPSocketListener<Data>;` | — | — | 16 | 2 | Create a TCP server that listens on a port | `bun.d.ts:6559` |
| 0 | type | `Bun.Loader` | `Bun.Loader` | — | — | 0 | 1 | https://bun.com/docs/bundler/loaders | `bun.d.ts:5395` |
| 0 | type | `Bun.MacroMap` | `Bun.MacroMap` | — | — | 0 | 1 | This lets you use macros as regular imports | `bun.d.ts:2319` |
| 0 | const | `Bun.main` | `Bun.main: string;` | — | yes | 41 | 1 | What script launched Bun? | `bun.d.ts:4785` |
| 0 | namespace | `Bun.markdown` | `Bun.markdown.*` | — | — | 40 | 1 | Markdown related APIs. | `bun.d.ts:1019` |
| 0 | interface | `Bun.MatchedRoute` | `Bun.MatchedRoute` | — | — | 0 | 1 | — | `bun.d.ts:8066` |
| 0 | type | `Bun.MaybePromise` | `Bun.MaybePromise` | — | — | 0 | 1 | — | `bun.d.ts:47` |
| 0 | class | `Bun.MD4` | `new Bun.MD4(…)` | — | — | 0 | 1 | — | `bun.d.ts:5167` |
| 0 | class | `Bun.MD5` | `new Bun.MD5(…)` | — | — | 0 | 1 | — | `bun.d.ts:5159` |
| 0 | type | `Bun.MessageEvent` | `Bun.MessageEvent` | — | — | 0 | 1 | — | `bun.d.ts:149` |
| 0 | interface | `Bun.MessageEventInit` | `Bun.MessageEventInit` | — | — | 0 | 1 | — | `bun.d.ts:115` |
| 0 | type | `Bun.MessageEventSource` | `Bun.MessageEventSource` | — | — | 0 | 1 | — | `bun.d.ts:30` |
| 0 | type | `Bun.MessageListener` | `Bun.MessageListener` | — | — | 0 | 1 | — | `bun.d.ts:40` |
| 0 | function | `Bun.mmap` | `Bun.mmap(path: PathLike, opts?: MMapOptions): Uint8Array<ArrayBuffer>;` | — | — | 70 | 1 | Open a file as a live-updating `Uint8Array` without copying memory | `bun.d.ts:4566` |
| 0 | interface | `Bun.MMapOptions` | `Bun.MMapOptions` | — | — | 0 | 1 | — | `bun.d.ts:4536` |
| 0 | type | `Bun.MultipleResolveListener` *(deprecated)* | `Bun.MultipleResolveListener` | — | — | 0 | 1 | — | `deprecated.d.ts:31` |
| 0 | type | `Bun.MultipleResolveType` | `Bun.MultipleResolveType` | — | — | 0 | 1 | — | `bun.d.ts:33` |
| 0 | function | `Bun.nanoseconds` | `Bun.nanoseconds(): number;` | — | yes | 195 | 1 | Returns the number of nanoseconds since the process was started. | `bun.d.ts:4840` |
| 0 | interface | `Bun.NetworkSink` | `Bun.NetworkSink` | — | — | 0 | 1 | — | `s3.d.ts:74` |
| 0 | function | `Bun.nothrow` | `Bun.nothrow(): $;` | — | — | 0 | 1 | Configure the shell to not throw an exception on non-zero exit codes. | `shell.d.ts:72` |
| 0 | type | `Bun.NullSubprocess` | `Bun.NullSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawn()} with stdin, stdout, stderr all set to `null` or similar. | `bun.d.ts:7829` |
| 0 | type | `Bun.NullSyncSubprocess` | `Bun.NullSyncSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawnSync()} with both stdout and stderr set to `null` or similar | `bun.d.ts:7837` |
| 0 | type | `Bun.OnBeforeParseCallback` | `Bun.OnBeforeParseCallback` | — | — | 0 | 1 | — | `bun.d.ts:5509` |
| 0 | type | `Bun.OnEndCallback` | `Bun.OnEndCallback` | — | — | 0 | 1 | — | `bun.d.ts:5508` |
| 0 | interface | `Bun.OnLoadArgs` | `Bun.OnLoadArgs` | — | — | 0 | 1 | — | `bun.d.ts:5477` |
| 0 | type | `Bun.OnLoadCallback` | `Bun.OnLoadCallback` | — | — | 0 | 1 | — | `bun.d.ts:5506` |
| 0 | type | `Bun.OnLoadResult` | `Bun.OnLoadResult` | — | — | 0 | 1 | — | `bun.d.ts:5505` |
| 0 | interface | `Bun.OnLoadResultObject` | `Bun.OnLoadResultObject` | — | — | 0 | 1 | — | `bun.d.ts:5455` |
| 0 | interface | `Bun.OnLoadResultSourceCode` | `Bun.OnLoadResultSourceCode` | — | — | 0 | 1 | — | `bun.d.ts:5442` |
| 0 | interface | `Bun.OnResolveArgs` | `Bun.OnResolveArgs` | — | — | 0 | 1 | — | `bun.d.ts:5515` |
| 0 | type | `Bun.OnResolveCallback` | `Bun.OnResolveCallback` | — | — | 0 | 1 | — | `bun.d.ts:5557` |
| 0 | interface | `Bun.OnResolveResult` | `Bun.OnResolveResult` | — | — | 0 | 1 | — | `bun.d.ts:5540` |
| 0 | type | `Bun.OnStartCallback` | `Bun.OnStartCallback` | — | — | 0 | 1 | — | `bun.d.ts:5507` |
| 0 | function | `Bun.openInEditor` | `Bun.openInEditor(path: string, options?: EditorOptions): void;` | — | yes | 17 | 1 | Open a file in your local editor. Auto-detects via `$VISUAL` \|\| `$EDITOR` | `bun.d.ts:4888` |
| 0 | const | `Bun.Out` | `Bun.Out` | — | — | 0 | 4 | — | `bun.d.ts:7412` |
| 0 | const | `Bun.password` | `Bun.password: {` | — | — | 42 | 1 | Hash and verify passwords using argon2 or bcrypt. The default is argon2. | `bun.d.ts:3190` |
| 0 | namespace | `Bun.Password` | `Bun.Password.*` | — | — | 0 | 1 | Hash and verify passwords using argon2 or bcrypt | `bun.d.ts:3129` |
| 0 | type | `Bun.PathLike` | `Bun.PathLike` | — | — | 0 | 1 | — | `bun.d.ts:17` |
| 0 | function | `Bun.pathToFileURL` | `Bun.pathToFileURL(path: string): URL;` | — | yes | 34 | 1 | Convert a filesystem path to a file:// URL. | `bun.d.ts:1882` |
| 0 | function | `Bun.peek` | `Bun.peek(promise: T \| Promise<T>): Promise<T> \| T;` | — | yes | 67 | 1 | Extract the value from the Promise in the same tick of the event loop | `bun.d.ts:1887` |
| 0 | namespace | `Bun.peek` | `Bun.peek.*` | — | yes | 67 | 1 | — | `bun.d.ts:1888` |
| 0 | type | `Bun.PipedSubprocess` | `Bun.PipedSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawn()} with stdin, stdout, stderr all set to `"pipe"`. A combination of {@link ReadableSubprocess} and {@link … | `bun.d.ts:7827` |
| 0 | type | `Bun.Platform` *(deprecated)* | `Bun.Platform` | — | — | 0 | 1 | — | `deprecated.d.ts:3` |
| 0 | const | `Bun.plugin` | `Bun.plugin: BunRegisterPlugin;` | — | — | 9 | 1 | — | `bun.d.ts:5778` |
| 0 | interface | `Bun.PluginBuilder` | `Bun.PluginBuilder` | — | — | 0 | 1 | The builder object passed to `Bun.plugin` | `bun.d.ts:5571` |
| 0 | interface | `Bun.PluginConstraints` | `Bun.PluginConstraints` | — | — | 0 | 1 | — | `bun.d.ts:5411` |
| 0 | const | `Bun.postgres` *(deprecated)* | `Bun.postgres: SQL;` | — | — | 0 | 1 | SQL client for PostgreSQL | `sql.d.ts:895` |
| 0 | function | `Bun.randomUUIDv5` | `Bun.randomUUIDv5( name: string \| BufferSource, namespace: string \| BufferSource \| "dns" \| "url" \| "oid" \| "x500", /** * @default "hex" */ encoding?: "hex" \| "ba` | — | — | 0 | 2 | Generate a UUIDv5, which is a name-based UUID based on the SHA-1 hash of a namespace UUID and a name. | `bun.d.ts:9446` |
| 0 | function | `Bun.randomUUIDv7` | `Bun.randomUUIDv7( /** * @default "hex" */ encoding?: "hex" \| "base64" \| "base64url", /** * @default Date.now() */ timestamp?: number \| Date, ): string;` | — | yes | 335 | 2 | Generate a UUIDv7, which is a sequential ID based on the current timestamp with a random component. | `bun.d.ts:9400` |
| 0 | type | `Bun.ReadableIO` *(deprecated)* | `Bun.ReadableIO` | — | — | 0 | 1 | — | `deprecated.d.ts:154` |
| 0 | type | `Bun.ReadableStreamController` | `Bun.ReadableStreamController` | — | — | 0 | 1 | — | `bun.d.ts:24` |
| 0 | interface | `Bun.ReadableStreamDefaultReadManyResult` | `Bun.ReadableStreamDefaultReadManyResult` | — | — | 0 | 1 | — | `bun.d.ts:151` |
| 0 | type | `Bun.ReadableStreamDefaultReadResult` | `Bun.ReadableStreamDefaultReadResult` | — | — | 0 | 1 | — | `bun.d.ts:25` |
| 0 | type | `Bun.ReadableStreamReader` | `Bun.ReadableStreamReader` | — | — | 0 | 1 | — | `bun.d.ts:28` |
| 0 | function | `Bun.readableStreamToArray` | `Bun.readableStreamToArray(stream: ReadableStream<T>): Promise<T[]> \| T[];` | — | — | 6 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `bun.d.ts:1844` |
| 0 | function | `Bun.readableStreamToArrayBuffer` | `Bun.readableStreamToArrayBuffer( stream: ReadableStream<ArrayBufferView \| ArrayBufferLike>, ): Promise<ArrayBuffer> \| ArrayBuffer;` | — | — | 0 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `bun.d.ts:1802` |
| 0 | function | `Bun.readableStreamToBlob` *(deprecated)* | `Bun.readableStreamToBlob(stream: ReadableStream): Promise<Blob>;` | — | — | 4 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `deprecated.d.ts:60` |
| 0 | function | `Bun.readableStreamToBytes` *(deprecated)* | `Bun.readableStreamToBytes( stream: ReadableStream<ArrayBufferView \| ArrayBufferLike>, ): Promise<Uint8Array<ArrayBuffer>> \| Uint8Array<ArrayBuffer>;` | — | — | 15 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `deprecated.d.ts:46` |
| 0 | function | `Bun.readableStreamToFormData` | `Bun.readableStreamToFormData( stream: ReadableStream<string \| NodeJS.TypedArray \| ArrayBufferView>, multipartBoundaryExcludingDashes?: string \| NodeJS.TypedArra` | — | — | 4 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `bun.d.ts:1833` |
| 0 | function | `Bun.readableStreamToJSON` *(deprecated)* | `Bun.readableStreamToJSON(stream: ReadableStream): Promise<any>;` | — | — | 4 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `deprecated.d.ts:84` |
| 0 | function | `Bun.readableStreamToText` *(deprecated)* | `Bun.readableStreamToText(stream: ReadableStream): Promise<string>;` | — | yes | 12 | 1 | Consume all data from a {@link ReadableStream} until it closes or errors. | `deprecated.d.ts:72` |
| 0 | type | `Bun.ReadableSubprocess` | `Bun.ReadableSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawn()} with both stdout and stderr set to `"pipe"` | `bun.d.ts:7823` |
| 0 | type | `Bun.ReadableSyncSubprocess` | `Bun.ReadableSyncSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawnSync()} with both stdout and stderr set to `"pipe"` | `bun.d.ts:7835` |
| 0 | const | `Bun.redis` | `Bun.redis: RedisClient;` | — | — | 12 | 1 | Default Redis client | `redis.d.ts:3351` |
| 0 | class | `Bun.RedisClient` | `new Bun.RedisClient(…)` | — | — | 16 | 1 | — | `redis.d.ts:54` |
| 0 | namespace | `Bun.RedisClient` | `Bun.RedisClient.*` | — | — | 16 | 1 | — | `redis.d.ts:46` |
| 0 | interface | `Bun.RedisOptions` | `Bun.RedisOptions` | — | — | 0 | 1 | — | `redis.d.ts:2` |
| 0 | type | `Bun.RejectionHandledListener` | `Bun.RejectionHandledListener` | — | — | 0 | 1 | — | `bun.d.ts:37` |
| 0 | interface | `Bun.ReservedSQL` | `Bun.ReservedSQL` | — | — | 0 | 1 | Represents a reserved connection from the connection pool Extends SQL with | `sql.d.ts:8` |
| 0 | function | `Bun.resolve` | `Bun.resolve(moduleId: string, parent: string): Promise<string>;` | — | yes | 0 | 1 | Resolve a `moduleId` as though it were imported from `parent` | `bun.d.ts:1560` |
| 0 | function | `Bun.resolveSync` | `Bun.resolveSync(moduleId: string, parent: string): string;` | — | yes | 21 | 1 | Synchronously resolve a `moduleId` as though it were imported from `parent` | `bun.d.ts:1551` |
| 0 | interface | `Bun.ResourceUsage` | `Bun.ResourceUsage` | — | — | 0 | 1 | — | `bun.d.ts:7150` |
| 0 | const | `Bun.revision` | `Bun.revision: string;` | — | yes | 100 | 1 | The git sha at the time the currently-running version of Bun was compiled | `bun.d.ts:8110` |
| 0 | var | `Bun.s3` | `Bun.s3: S3Client;` | — | — | 11 | 1 | A default instance of S3Client | `s3.d.ts:1353` |
| 0 | class | `Bun.S3Client` | `new Bun.S3Client(…)` | — | — | 14 | 1 | A configured S3 bucket instance for managing files. | `s3.d.ts:837` |
| 0 | interface | `Bun.S3File` | `Bun.S3File` | — | — | 0 | 1 | Represents a file in an S3-compatible storage service. | `s3.d.ts:430` |
| 0 | interface | `Bun.S3FilePresignOptions` | `Bun.S3FilePresignOptions` | — | — | 0 | 1 | Options for generating presigned URLs | `s3.d.ts:376` |
| 0 | interface | `Bun.S3ListObjectsOptions` | `Bun.S3ListObjectsOptions` | — | — | 0 | 1 | — | `s3.d.ts:714` |
| 0 | interface | `Bun.S3ListObjectsResponse` | `Bun.S3ListObjectsResponse` | — | — | 0 | 1 | — | `s3.d.ts:731` |
| 0 | interface | `Bun.S3Options` | `Bun.S3Options` | — | — | 0 | 1 | Configuration options for S3 operations | `s3.d.ts:109` |
| 0 | interface | `Bun.S3Stats` | `Bun.S3Stats` | — | — | 0 | 1 | — | `s3.d.ts:417` |
| 0 | interface | `Bun.SavepointSQL` | `Bun.SavepointSQL` | — | — | 0 | 1 | Represents a savepoint within a transaction | `sql.d.ts:900` |
| 0 | const | `Bun.secrets` | `Bun.secrets: {` | — | — | 38 | 1 | Securely store and retrieve sensitive credentials using the operating system's native credential storage. | `bun.d.ts:3425` |
| 0 | namespace | `Bun.Security` | `Bun.Security.*` | — | — | 0 | 1 | `bun install` security related declarations | `security.d.ts:5` |
| 0 | namespace | `Bun.semver` | `Bun.semver.*` | — | yes | 49 | 1 | Bun.semver provides a fast way to parse and compare version numbers. | `bun.d.ts:4699` |
| 0 | function | `Bun.serve` | `Bun.serve( options: Serve.Options<WebSocketData, R>, ): Server<WebSocketData>;` | — | — | 293 | 1 | Bun.serve provides a high-performance HTTP server with built-in routing support. | `serve.d.ts:1308` |
| 0 | namespace | `Bun.Serve` | `Bun.Serve.*` | — | — | 1 | 1 | — | `serve.d.ts:489` |
| 0 | type | `Bun.ServeOptions` *(deprecated)* | `Bun.ServeOptions` | — | — | 0 | 1 | — | `deprecated.d.ts:104` |
| 0 | interface | `Bun.Server` | `Bun.Server` | — | — | 15 | 1 | HTTP & HTTPS Server | `serve.d.ts:835` |
| 0 | interface | `Bun.ServerWebSocket` | `Bun.ServerWebSocket` | — | — | 0 | 1 | A fast WebSocket designed for servers. | `serve.d.ts:66` |
| 0 | type | `Bun.ServerWebSocketSendStatus` | `Bun.ServerWebSocketSendStatus` | — | — | 0 | 1 | A status that represents the outcome of a sent message. | `serve.d.ts:21` |
| 0 | function | `Bun.sha` | `Bun.sha(input: Bun.StringOrBuffer, hashInto?: NodeJS.TypedArray): NodeJS.TypedArray;` | — | — | 2 | 2 | Hash `input` using [SHA-2 512/256](https://en.wikipedia.org/wiki/SHA-2#Comparison_of_SHA_functions) | `bun.d.ts:5123` |
| 0 | class | `Bun.SHA1` | `new Bun.SHA1(…)` | — | — | 0 | 1 | This is not the default because it's not cryptographically secure and it's slower than {@link SHA512} | `bun.d.ts:5151` |
| 0 | class | `Bun.SHA224` | `new Bun.SHA224(…)` | — | — | 0 | 1 | — | `bun.d.ts:5175` |
| 0 | class | `Bun.SHA256` | `new Bun.SHA256(…)` | — | — | 0 | 1 | — | `bun.d.ts:5199` |
| 0 | class | `Bun.SHA384` | `new Bun.SHA384(…)` | — | — | 0 | 1 | — | `bun.d.ts:5191` |
| 0 | class | `Bun.SHA512` | `new Bun.SHA512(…)` | — | — | 0 | 1 | — | `bun.d.ts:5183` |
| 0 | class | `Bun.SHA512_256` | `new Bun.SHA512_256(…)` | — | — | 0 | 1 | See also {@link sha} | `bun.d.ts:5210` |
| 0 | const | `Bun.Shell` | `Bun.Shell: new ()` | — | — | 0 | 1 | — | `shell.d.ts:378` |
| 0 | class | `Bun.ShellError` | `new Bun.ShellError(…)` | — | — | 0 | 1 | ShellError represents an error that occurred while executing a shell command with [the Bun Shell](https://bun.com/docs/runtime/shell). | `shell.d.ts:221` |
| 0 | type | `Bun.ShellExpression` | `Bun.ShellExpression` | — | — | 0 | 1 | — | `shell.d.ts:2` |
| 0 | type | `Bun.ShellFunction` *(deprecated)* | `Bun.ShellFunction` | — | — | 0 | 1 | — | `deprecated.d.ts:124` |
| 0 | interface | `Bun.ShellOutput` | `Bun.ShellOutput` | — | — | 0 | 1 | — | `shell.d.ts:299` |
| 0 | class | `Bun.ShellPromise` | `new Bun.ShellPromise(…)` | — | — | 0 | 1 | The `Bun.$.ShellPromise` class represents a shell command that gets executed | `shell.d.ts:90` |
| 0 | function | `Bun.shrink` *(deprecated)* | `Bun.shrink(): void;` | — | — | 0 | 1 | The next time JavaScriptCore is idle, clear unused memory and attempt to reduce the heap size. | `bun.d.ts:4881` |
| 0 | type | `Bun.SignalsListener` | `Bun.SignalsListener` | — | — | 0 | 1 | — | `bun.d.ts:41` |
| 0 | function | `Bun.sleep` | `Bun.sleep(ms: number \| Date): Promise<void>;` | — | yes | 170 | 1 | Resolve a `Promise` after milliseconds. This is like | `bun.d.ts:5093` |
| 0 | function | `Bun.sleepSync` | `Bun.sleepSync(ms: number): void;` | — | yes | 14 | 1 | Sleep the thread for a given number of milliseconds | `bun.d.ts:5102` |
| 0 | function | `Bun.sliceAnsi` | `Bun.sliceAnsi( input: string, start?: number, end?: number, /** * Shorthand for common options (avoids `{}` allocation):` | — | — | 49 | 1 | Slice a string by visible column width, preserving ANSI escape codes. | `bun.d.ts:671` |
| 0 | interface | `Bun.SliceAnsiOptions` | `Bun.SliceAnsiOptions` | — | — | 0 | 1 | — | `bun.d.ts:613` |
| 0 | interface | `Bun.Socket` | `Bun.Socket` | — | — | 4 | 1 | Represents a TCP or TLS socket connection used for network communication. | `bun.d.ts:5833` |
| 0 | interface | `Bun.SocketAddress` | `Bun.SocketAddress` | — | — | 0 | 1 | — | `bun.d.ts:4101` |
| 0 | interface | `Bun.SocketHandler` | `Bun.SocketHandler` | — | — | 0 | 1 | — | `bun.d.ts:6351` |
| 0 | interface | `Bun.SocketListener` | `Bun.SocketListener` | — | — | 0 | 1 | — | `bun.d.ts:6324` |
| 0 | interface | `Bun.SocketOptions` | `Bun.SocketOptions` | — | — | 0 | 1 | — | `bun.d.ts:6413` |
| 0 | function | `Bun.spawn` | `Bun.spawn()` | — | yes | 536 | 2 | Spawn a new process | `bun.d.ts:7410` |
| 0 | namespace | `Bun.Spawn` | `Bun.Spawn.*` | — | — | 0 | 1 | — | `bun.d.ts:6737` |
| 0 | function | `Bun.spawnSync` | `Bun.spawnSync()` | — | — | 210 | 2 | Spawn a new process | `bun.d.ts:7482` |
| 0 | const | `Bun.sql` | `Bun.sql: SQL;` | — | — | 5 | 1 | SQL client | `sql.d.ts:888` |
| 0 | class | `Bun.SQL` | `new Bun.SQL(…)` | — | — | 25 | 1 | Main SQL client interface providing connection and transaction management | `sql.d.ts:559` |
| 0 | interface | `Bun.SQL` | `Bun.SQL` | — | — | 25 | 1 | — | `sql.d.ts:485` |
| 0 | namespace | `Bun.SQL` | `Bun.SQL.*` | — | — | 25 | 1 | — | `sql.d.ts:99` |
| 0 | interface | `Bun.SQLArrayParameter` | `Bun.SQLArrayParameter` | — | — | 0 | 1 | Represents a SQL array parameter | `sql.d.ts:66` |
| 0 | type | `Bun.SQLOptions` *(deprecated)* | `Bun.SQLOptions` | — | — | 0 | 1 | — | `deprecated.d.ts:116` |
| 0 | type | `Bun.SQLQuery` *(deprecated)* | `Bun.SQLQuery` | — | — | 0 | 1 | — | `deprecated.d.ts:107` |
| 0 | type | `Bun.SQLSavepointContextCallback` *(deprecated)* | `Bun.SQLSavepointContextCallback` | — | — | 0 | 1 | — | `deprecated.d.ts:113` |
| 0 | type | `Bun.SQLTransactionContextCallback` *(deprecated)* | `Bun.SQLTransactionContextCallback` | — | — | 0 | 1 | — | `deprecated.d.ts:110` |
| 0 | const | `Bun.stderr` | `Bun.stderr: BunFile;` | — | — | 3 | 1 | Write to stderr | `bun.d.ts:4576` |
| 0 | const | `Bun.stdin` | `Bun.stdin: BunFile;` | — | — | 24 | 1 | Read from stdin | `bun.d.ts:4583` |
| 0 | const | `Bun.stdout` | `Bun.stdout: BunFile;` | — | — | 14 | 1 | Write to stdout | `bun.d.ts:4571` |
| 0 | type | `Bun.StringLike` | `Bun.StringLike` | — | — | 0 | 1 | — | `bun.d.ts:4585` |
| 0 | type | `Bun.StringOrBuffer` | `Bun.StringOrBuffer` | — | — | 0 | 1 | — | `bun.d.ts:22` |
| 0 | function | `Bun.stringWidth` | `Bun.stringWidth( /** * The string to measure */ input: string, options?: StringWidthOptions, ): number;` | — | yes | 150 | 1 | Get the column count of a string as it would be displayed in a terminal. | `bun.d.ts:588` |
| 0 | interface | `Bun.StringWidthOptions` | `Bun.StringWidthOptions` | — | — | 0 | 1 | — | `bun.d.ts:547` |
| 0 | function | `Bun.stripANSI` | `Bun.stripANSI(input: string): string;` | — | yes | 45 | 1 | Remove ANSI escape codes from a string. | `bun.d.ts:611` |
| 0 | interface | `Bun.StructuredSerializeOptions` | `Bun.StructuredSerializeOptions` | — | — | 0 | 1 | — | `bun.d.ts:195` |
| 0 | interface | `Bun.Subprocess` | `Bun.Subprocess` | — | — | 0 | 1 | A process created by {@link Bun.spawn}. | `bun.d.ts:7236` |
| 0 | type | `Bun.SupportedCryptoAlgorithms` | `Bun.SupportedCryptoAlgorithms` | — | — | 0 | 1 | — | `bun.d.ts:4942` |
| 0 | interface | `Bun.SyncSubprocess` | `Bun.SyncSubprocess` | — | — | 0 | 1 | A process created by {@link Bun.spawnSync}. | `bun.d.ts:7375` |
| 0 | interface | `Bun.SystemError` | `Bun.SystemError` | — | — | 0 | 1 | — | `bun.d.ts:1741` |
| 0 | type | `Bun.Target` | `Bun.Target` | — | — | 0 | 1 | — | `bun.d.ts:5374` |
| 0 | interface | `Bun.TCPSocket` | `Bun.TCPSocket` | — | — | 0 | 1 | — | `bun.d.ts:6339` |
| 0 | interface | `Bun.TCPSocketConnectOptions` | `Bun.TCPSocketConnectOptions` | — | — | 0 | 1 | — | `bun.d.ts:6486` |
| 0 | interface | `Bun.TCPSocketListener` | `Bun.TCPSocketListener` | — | — | 0 | 1 | — | `bun.d.ts:6331` |
| 0 | interface | `Bun.TCPSocketListenOptions` | `Bun.TCPSocketListenOptions` | — | — | 0 | 1 | — | `bun.d.ts:6440` |
| 0 | class | `Bun.Terminal` | `new Bun.Terminal(…)` | — | yes | 54 | 1 | A pseudo-terminal (PTY) that can be used to spawn interactive terminal programs. | `bun.d.ts:7908` |
| 0 | interface | `Bun.TerminalOptions` | `Bun.TerminalOptions` | — | — | 4 | 1 | Options for creating a pseudo-terminal (PTY). | `bun.d.ts:7845` |
| 0 | function | `Bun.throws` | `Bun.throws(shouldThrow: boolean): $;` | — | — | 0 | 1 | Configure whether or not the shell should throw an exception on non-zero exit codes. | `shell.d.ts:77` |
| 0 | type | `Bun.TimerHandler` | `Bun.TimerHandler` | — | — | 0 | 1 | — | `bun.d.ts:43` |
| 0 | interface | `Bun.TLSOptions` | `Bun.TLSOptions` | — | — | 0 | 2 | Options for TLS connections | `bun.d.ts:4020` |
| 0 | interface | `Bun.TLSSocket` | `Bun.TLSSocket` | — | — | 0 | 1 | — | `bun.d.ts:6340` |
| 0 | interface | `Bun.TLSUpgradeOptions` | `Bun.TLSUpgradeOptions` | — | — | 0 | 1 | — | `bun.d.ts:6318` |
| 0 | namespace | `Bun.TOML` | `Bun.TOML.*` | — | yes | 26 | 1 | TOML related APIs | `bun.d.ts:784` |
| 0 | interface | `Bun.TransactionSQL` | `Bun.TransactionSQL` | — | — | 0 | 1 | Represents a client within a transaction context Extends SQL with savepoint | `sql.d.ts:81` |
| 0 | type | `Bun.Transferable` | `Bun.Transferable` | — | — | 0 | 1 | — | `bun.d.ts:29` |
| 0 | interface | `Bun.TransformerFlushCallback` | `Bun.TransformerFlushCallback` | — | — | 0 | 1 | — | `bun.d.ts:265` |
| 0 | interface | `Bun.TransformerStartCallback` | `Bun.TransformerStartCallback` | — | — | 0 | 1 | — | `bun.d.ts:269` |
| 0 | interface | `Bun.TransformerTransformCallback` | `Bun.TransformerTransformCallback` | — | — | 0 | 1 | — | `bun.d.ts:273` |
| 0 | class | `Bun.Transpiler` | `new Bun.Transpiler(…)` | — | — | 41 | 1 | Quickly transpile TypeScript, JSX, or JS to modern JavaScript. | `bun.d.ts:2530` |
| 0 | interface | `Bun.TranspilerOptions` | `Bun.TranspilerOptions` | — | — | 0 | 1 | — | `bun.d.ts:2391` |
| 0 | interface | `Bun.TSConfig` | `Bun.TSConfig` | — | — | 0 | 1 | tsconfig.json options supported by Bun | `bun.d.ts:2374` |
| 0 | namespace | `Bun.udp` | `Bun.udp.*` | — | — | 0 | 1 | — | `bun.d.ts:6570` |
| 0 | function | `Bun.udpSocket` | `Bun.udpSocket( options: udp.SocketOptions<DataBinaryType>, ): Promise<udp.Socket<DataBinaryType>>;` | — | — | 21 | 2 | Create a UDP socket | `bun.d.ts:6725` |
| 0 | type | `Bun.UncaughtExceptionListener` *(deprecated)* | `Bun.UncaughtExceptionListener` | — | — | 0 | 1 | — | `deprecated.d.ts:20` |
| 0 | type | `Bun.UncaughtExceptionOrigin` | `Bun.UncaughtExceptionOrigin` | — | — | 0 | 1 | — | `bun.d.ts:32` |
| 0 | interface | `Bun.UnderlyingSink` | `Bun.UnderlyingSink` | — | — | 0 | 1 | — | `bun.d.ts:297` |
| 0 | interface | `Bun.UnderlyingSinkAbortCallback` | `Bun.UnderlyingSinkAbortCallback` | — | — | 0 | 1 | — | `bun.d.ts:277` |
| 0 | interface | `Bun.UnderlyingSinkCloseCallback` | `Bun.UnderlyingSinkCloseCallback` | — | — | 0 | 1 | — | `bun.d.ts:281` |
| 0 | interface | `Bun.UnderlyingSinkStartCallback` | `Bun.UnderlyingSinkStartCallback` | — | — | 0 | 1 | — | `bun.d.ts:285` |
| 0 | interface | `Bun.UnderlyingSinkWriteCallback` | `Bun.UnderlyingSinkWriteCallback` | — | — | 0 | 1 | — | `bun.d.ts:289` |
| 0 | interface | `Bun.UnderlyingSource` | `Bun.UnderlyingSource` | — | — | 0 | 1 | — | `bun.d.ts:305` |
| 0 | interface | `Bun.UnderlyingSourceCancelCallback` | `Bun.UnderlyingSourceCancelCallback` | — | — | 0 | 1 | — | `bun.d.ts:293` |
| 0 | interface | `Bun.UnderlyingSourcePullCallback` | `Bun.UnderlyingSourcePullCallback` | — | — | 0 | 1 | — | `bun.d.ts:321` |
| 0 | interface | `Bun.UnderlyingSourceStartCallback` | `Bun.UnderlyingSourceStartCallback` | — | — | 0 | 1 | — | `bun.d.ts:325` |
| 0 | type | `Bun.UnhandledRejectionListener` *(deprecated)* | `Bun.UnhandledRejectionListener` | — | — | 0 | 1 | Most of the time the unhandledRejection will be an Error, but this should not be relied upon | `deprecated.d.ts:28` |
| 0 | interface | `Bun.UnixSocketListener` | `Bun.UnixSocketListener` | — | — | 0 | 1 | — | `bun.d.ts:6335` |
| 0 | interface | `Bun.UnixSocketOptions` | `Bun.UnixSocketOptions` | — | — | 0 | 1 | — | `bun.d.ts:6518` |
| 0 | namespace | `Bun.unsafe` | `Bun.unsafe.*` | — | — | 0 | 1 | — | `bun.d.ts:4712` |
| 0 | const | `Bun.version` | `Bun.version: string;` | — | yes | 308 | 1 | The current version of Bun | `bun.d.ts:8097` |
| 0 | const | `Bun.version_with_sha` | `Bun.version_with_sha: string;` | — | — | 0 | 1 | The current version of Bun with the shortened commit sha of the build | `bun.d.ts:8103` |
| 0 | type | `Bun.WarningListener` | `Bun.WarningListener` | — | — | 0 | 1 | — | `bun.d.ts:39` |
| 0 | namespace | `Bun.WebAssembly` | `Bun.WebAssembly.*` | — | — | 0 | 1 | — | `wasm.d.ts:2` |
| 0 | interface | `Bun.WebSocket` | `Bun.WebSocket` | — | — | 0 | 1 | A WebSocket client implementation | `bun.d.ts:4377` |
| 0 | type | `Bun.WebSocketCompressor` | `Bun.WebSocketCompressor` | — | — | 0 | 1 | Compression options for WebSocket messages. | `serve.d.ts:301` |
| 0 | interface | `Bun.WebSocketEventMap` | `Bun.WebSocketEventMap` | — | — | 0 | 1 | — | `bun.d.ts:4347` |
| 0 | interface | `Bun.WebSocketHandler` | `Bun.WebSocketHandler` | — | — | 0 | 1 | Create a server-side {@link ServerWebSocket} handler for use with {@link Bun.serve} | `serve.d.ts:353` |
| 0 | type | `Bun.WebSocketOptions` | `Bun.WebSocketOptions` | — | — | 0 | 1 | Constructor options for the `Bun.WebSocket` client | `bun.d.ts:4341` |
| 0 | type | `Bun.WebSocketOptionsCompression` | `Bun.WebSocketOptionsCompression` | — | — | 0 | 1 | — | `bun.d.ts:4322` |
| 0 | type | `Bun.WebSocketOptionsHeaders` | `Bun.WebSocketOptionsHeaders` | — | — | 0 | 1 | — | `bun.d.ts:4271` |
| 0 | type | `Bun.WebSocketOptionsProtocolsOrProtocol` | `Bun.WebSocketOptionsProtocolsOrProtocol` | — | — | 0 | 1 | — | `bun.d.ts:4230` |
| 0 | type | `Bun.WebSocketOptionsProxy` | `Bun.WebSocketOptionsProxy` | — | — | 0 | 1 | — | `bun.d.ts:4278` |
| 0 | type | `Bun.WebSocketOptionsTLS` | `Bun.WebSocketOptionsTLS` | — | — | 0 | 1 | — | `bun.d.ts:4244` |
| 0 | type | `Bun.WebSocketReadyState` | `Bun.WebSocketReadyState` | — | — | 0 | 1 | A state that represents if a WebSocket is connected. | `serve.d.ts:33` |
| 0 | class | `Bun.WebView` | `new Bun.WebView(…)` | — | — | 96 | 1 | A headless browser view for automation. WKWebView on macOS (zero | `bun.d.ts:8743` |
| 0 | namespace | `Bun.WebView` | `Bun.WebView.*` | — | — | 96 | 1 | — | `bun.d.ts:8496` |
| 0 | function | `Bun.which` | `Bun.which(command: string, options?: WhichOptions): string \| null;` | — | yes | 147 | 1 | Find the path to an executable, similar to typing which in your terminal. Reads the `PATH` environment variable unless overridden with `options.PATH`. | `bun.d.ts:545` |
| 0 | interface | `Bun.WhichOptions` | `Bun.WhichOptions` | — | — | 0 | 1 | — | `bun.d.ts:525` |
| 0 | interface | `Bun.Worker` | `Bun.Worker` | — | — | 0 | 1 | — | `bun.d.ts:440` |
| 0 | interface | `Bun.WorkerEventMap` | `Bun.WorkerEventMap` | — | — | 0 | 1 | — | `bun.d.ts:338` |
| 0 | interface | `Bun.WorkerOptions` | `Bun.WorkerOptions` | — | — | 0 | 1 | Bun's Web Worker constructor supports some extra options on top of the API browsers have. | `bun.d.ts:375` |
| 0 | type | `Bun.WorkerType` | `Bun.WorkerType` | — | — | 0 | 1 | — | `bun.d.ts:345` |
| 0 | function | `Bun.wrapAnsi` | `Bun.wrapAnsi( /** * The string to wrap */ input: string, /** * The maximum column width */ columns: number, /** * Wrapping options */ options?: WrapAnsiOptions,` | — | yes | 30 | 1 | Wrap a string to fit within the specified column width, preserving ANSI escape codes. | `bun.d.ts:766` |
| 0 | interface | `Bun.WrapAnsiOptions` | `Bun.WrapAnsiOptions` | — | — | 0 | 1 | — | `bun.d.ts:690` |
| 0 | type | `Bun.WritableSubprocess` | `Bun.WritableSubprocess` | — | — | 0 | 1 | Utility type for any process from {@link Bun.spawn()} with stdin set to `"pipe"` | `bun.d.ts:7825` |
| 0 | function | `Bun.write` | `Bun.write( destination: BunFile \| S3File \| PathLike, input: Blob \| NodeJS.TypedArray \| ArrayBufferLike \| string \| BlobPart[] \| Archive, options?: {` | — | yes | 973 | 5 | Use the fastest syscalls available to copy from `input` into `destination`. | `bun.d.ts:1575` |
| 0 | type | `Bun.XMLHttpRequestBodyInit` | `Bun.XMLHttpRequestBodyInit` | — | — | 0 | 1 | — | `bun.d.ts:23` |
| 0 | namespace | `Bun.YAML` | `Bun.YAML.*` | — | — | 12 | 1 | YAML related APIs | `bun.d.ts:922` |
| 0 | interface | `Bun.ZlibCompressionOptions` | `Bun.ZlibCompressionOptions` | — | — | 0 | 1 | Compression options for `Bun.deflateSync` and `Bun.gzipSync` | `bun.d.ts:5223` |
| 0 | function | `Bun.zstdCompress` | `Bun.zstdCompress( data: NodeJS.TypedArray \| Buffer \| string \| ArrayBuffer, options?: { level?: number }, ): Promise<Buffer>;` | — | yes | 2 | 1 | Compresses a chunk of data with the Zstandard (zstd) compression algorithm. | `bun.d.ts:5355` |
| 0 | function | `Bun.zstdCompressSync` | `Bun.zstdCompressSync( data: NodeJS.TypedArray \| Buffer \| string \| ArrayBuffer, options?: { level?: number }, ): Buffer;` | — | yes | 11 | 1 | Compresses a chunk of data with the Zstandard (zstd) compression algorithm. | `bun.d.ts:5344` |
| 0 | function | `Bun.zstdDecompress` | `Bun.zstdDecompress(data: NodeJS.TypedArray \| Buffer \| string \| ArrayBuffer): Promise<Buffer>;` | — | yes | 2 | 1 | Decompresses a chunk of data with the Zstandard (zstd) decompression algorithm. | `bun.d.ts:5372` |
| 0 | function | `Bun.zstdDecompressSync` | `Bun.zstdDecompressSync(data: NodeJS.TypedArray \| Buffer \| string \| ArrayBuffer): Buffer;` | — | — | 10 | 1 | Decompresses a chunk of data with the Zstandard (zstd) decompression algorithm. | `bun.d.ts:5365` |

### Nested (1532)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | type | `Bun.__internal.DistributedMerge` | `Bun.__internal.DistributedMerge` | — | — | 0 | 1 | — | `bun.d.ts:92` |
| 1 | type | `Bun.__internal.DistributedOmit` | `Bun.__internal.DistributedOmit` | — | — | 0 | 1 | Like Omit, but correctly distributes over unions. Most useful for removing | `bun.d.ts:84` |
| 1 | type | `Bun.__internal.KeysInBoth` | `Bun.__internal.KeysInBoth` | — | — | 0 | 1 | — | `bun.d.ts:86` |
| 1 | type | `Bun.__internal.LibDomIsLoaded` | `Bun.__internal.LibDomIsLoaded` | — | — | 0 | 1 | — | `bun.d.ts:50` |
| 1 | type | `Bun.__internal.Merge` | `Bun.__internal.Merge` | — | — | 0 | 1 | — | `bun.d.ts:91` |
| 1 | type | `Bun.__internal.MergeInner` | `Bun.__internal.MergeInner` | — | — | 0 | 1 | — | `bun.d.ts:87` |
| 1 | type | `Bun.__internal.UseLibDomIfAvailable` | `Bun.__internal.UseLibDomIfAvailable` | — | — | 0 | 1 | Helper type for avoiding conflicts in types. | `bun.d.ts:63` |
| 1 | type | `Bun.__internal.Without` | `Bun.__internal.Without` | — | — | 0 | 1 | — | `bun.d.ts:94` |
| 1 | type | `Bun.__internal.XOR` | `Bun.__internal.XOR` | — | — | 0 | 1 | — | `bun.d.ts:98` |
| 1 | method | `Bun.AbstractWorker.addEventListener` | `Bun.AbstractWorker.addEventListener( type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean \| AddEventListenerOption` | — | — | 0 | 2 | — | `bun.d.ts:350` |
| 1 | property | `Bun.AbstractWorker.listener` | `Bun.AbstractWorker.listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K])` | — | — | 0 | 4 | — | `bun.d.ts:352` |
| 1 | property | `Bun.AbstractWorker.onerror` | `Bun.AbstractWorker.onerror: ((this: AbstractWorker, ev: ErrorEvent)` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/API/ServiceWorker/error_event) | `bun.d.ts:349` |
| 1 | property | `Bun.AbstractWorker.options` | `Bun.AbstractWorker.options?: boolean \| AddEventListenerOptions,` | — | — | 0 | 4 | — | `bun.d.ts:353` |
| 1 | method | `Bun.AbstractWorker.removeEventListener` | `Bun.AbstractWorker.removeEventListener( type: K, listener: (this: AbstractWorker, ev: AbstractWorkerEventMap[K]) => any, options?: boolean \| EventListenerOption` | — | — | 0 | 2 | — | `bun.d.ts:360` |
| 1 | property | `Bun.AbstractWorkerEventMap.error` | `Bun.AbstractWorkerEventMap.error: ErrorEvent;` | — | — | 0 | 1 | — | `bun.d.ts:335` |
| 1 | property | `Bun.AddEventListenerOptions.once` | `Bun.AddEventListenerOptions.once?: boolean;` | — | — | 0 | 1 | When `true`, the listener is automatically removed when it is first invoked. Default: `false`. | `bun.d.ts:166` |
| 1 | property | `Bun.AddEventListenerOptions.passive` | `Bun.AddEventListenerOptions.passive?: boolean;` | — | — | 0 | 1 | When `true`, serves as a hint that the listener will not call the `Event` object's `preventDefault()` method. Default: false. | `bun.d.ts:168` |
| 1 | property | `Bun.AddEventListenerOptions.signal` | `Bun.AddEventListenerOptions.signal?: AbortSignal;` | — | — | 0 | 1 | — | `bun.d.ts:169` |
| 1 | method | `Bun.Archive.blob` | `Bun.Archive.blob(): Promise<Blob>;` | — | — | 0 | 1 | Get the archive contents as a `Blob`. | `bun.d.ts:9297` |
| 1 | method | `Bun.Archive.bytes` | `Bun.Archive.bytes(): Promise<Uint8Array<ArrayBuffer>>;` | — | — | 0 | 1 | Get the archive contents as a `Uint8Array`. | `bun.d.ts:9320` |
| 1 | method | `Bun.Archive.extract` | `Bun.Archive.extract(path: string, options?: ArchiveExtractOptions): Promise<number>;` | — | — | 0 | 1 | glob: ["src/**", "lib/**", "!**" + "/*.test.ts", "!**" + "/__tests__/**"] | `bun.d.ts:9274` |
| 1 | method | `Bun.Archive.files` | `Bun.Archive.files(glob?: string \| readonly string[]): Promise<Map<string, File>>;` | — | — | 0 | 1 | const srcFiles = await archive.files(["src/**", "!**" + "/*.test.ts"]); | `bun.d.ts:9371` |
| 1 | method | `Bun.Archive.write` | `Bun.Archive.write(path: string, data: ArchiveInput \| Archive, options?: ArchiveOptions): Promise<void>;` | — | yes | 0 | 1 | Create and write an archive directly to disk in one operation. | `bun.d.ts:9233` |
| 1 | property | `Bun.ArchiveExtractOptions.glob` | `Bun.ArchiveExtractOptions.glob?: string \| readonly string[];` | — | yes | 0 | 1 | await archive.extract("./out", { glob: ["src/**", "!**" + "/*.test.ts"] }); | `bun.d.ts:9106` |
| 1 | property | `Bun.ArchiveOptions.compress` | `Bun.ArchiveOptions.compress?: ArchiveCompression;` | — | — | 0 | 1 | Compression algorithm to use. | `bun.d.ts:9061` |
| 1 | property | `Bun.ArchiveOptions.level` | `Bun.ArchiveOptions.level?: number;` | 6 | — | 0 | 1 | Compression level (1-12). Only applies when `compress` is set. | `bun.d.ts:9070` |
| 1 | method | `Bun.ArrayBufferSink.end` | `Bun.ArrayBufferSink.end(): ArrayBuffer \| Uint8Array<ArrayBuffer>;` | — | — | 0 | 1 | — | `bun.d.ts:1938` |
| 1 | method | `Bun.ArrayBufferSink.flush` | `Bun.ArrayBufferSink.flush(): number \| Uint8Array<ArrayBuffer> \| ArrayBuffer;` | — | — | 0 | 1 | Flush the internal buffer | `bun.d.ts:1937` |
| 1 | method | `Bun.ArrayBufferSink.start` | `Bun.ArrayBufferSink.start(options?: { asUint8Array?: boolean; /** * Preallocate an internal buffer of this size * This can significantly improve performance whe` | — | — | 0 | 1 | — | `bun.d.ts:1913` |
| 1 | method | `Bun.ArrayBufferSink.write` | `Bun.ArrayBufferSink.write(chunk: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer): number;` | — | yes | 0 | 1 | — | `bun.d.ts:1927` |
| 1 | property | `Bun.BinaryTypeList.arraybuffer` | `Bun.BinaryTypeList.arraybuffer: ArrayBuffer;` | — | — | 0 | 1 | — | `bun.d.ts:6343` |
| 1 | property | `Bun.BinaryTypeList.buffer` | `Bun.BinaryTypeList.buffer: Buffer;` | — | — | 0 | 1 | — | `bun.d.ts:6344` |
| 1 | property | `Bun.BinaryTypeList.uint8array` | `Bun.BinaryTypeList.uint8array: Uint8Array<ArrayBuffer>;` | — | — | 0 | 1 | — | `bun.d.ts:6345` |
| 1 | type | `Bun.Build.Architecture` | `Bun.Build.Architecture` | — | — | 0 | 1 | — | `bun.d.ts:2611` |
| 1 | type | `Bun.Build.CompileTarget` | `Bun.Build.CompileTarget` | — | — | 0 | 1 | — | `bun.d.ts:2614` |
| 1 | type | `Bun.Build.Libc` | `Bun.Build.Libc` | — | — | 0 | 1 | — | `bun.d.ts:2612` |
| 1 | type | `Bun.Build.SIMD` | `Bun.Build.SIMD` | — | — | 0 | 1 | — | `bun.d.ts:2613` |
| 1 | property | `Bun.BuildArtifact.hash` | `Bun.BuildArtifact.hash: string \| null;` | — | — | 0 | 1 | — | `bun.d.ts:3647` |
| 1 | property | `Bun.BuildArtifact.kind` | `Bun.BuildArtifact.kind: "entry-point" \| "chunk" \| "asset" \| "sourcemap" \| "bytecode";` | — | — | 0 | 1 | — | `bun.d.ts:3648` |
| 1 | property | `Bun.BuildArtifact.loader` | `Bun.BuildArtifact.loader: Loader;` | — | — | 0 | 1 | — | `bun.d.ts:3646` |
| 1 | property | `Bun.BuildArtifact.path` | `Bun.BuildArtifact.path: string;` | — | — | 0 | 1 | — | `bun.d.ts:3645` |
| 1 | property | `Bun.BuildArtifact.sourcemap` | `Bun.BuildArtifact.sourcemap: BuildArtifact \| null;` | — | — | 0 | 1 | — | `bun.d.ts:3649` |
| 1 | property | `Bun.BuildConfig.allowUnresolved` | `Bun.BuildConfig.allowUnresolved?: string[];` | [" | — | 0 | 1 | Control whether dynamic `import()`, `require()`, or `require.resolve()` specifiers (non-literal | `bun.d.ts:2693` |
| 1 | property | `Bun.BuildConfig.banner` | `Bun.BuildConfig.banner?: string;` | — | — | 0 | 1 | Add a banner to the bundled code such as "use client"; | `bun.d.ts:2815` |
| 1 | property | `Bun.BuildConfig.bytecode` | `Bun.BuildConfig.bytecode?: boolean;` | false | — | 0 | 1 | Generate bytecode for the output. This can dramatically improve cold | `bun.d.ts:2810` |
| 1 | property | `Bun.BuildConfig.compile` | `Bun.BuildConfig.compile?: boolean \| Bun.Build.CompileTarget \| CompileBuildOptions;` | — | — | 0 | 1 | Create a standalone executable or self-contained HTML. | `bun.d.ts:3061` |
| 1 | property | `Bun.BuildConfig.conditions` | `Bun.BuildConfig.conditions?: Array<string> \| string;` | — | — | 0 | 1 | package.json `exports` conditions used when resolving imports | `bun.d.ts:2726` |
| 1 | property | `Bun.BuildConfig.define` | `Bun.BuildConfig.define?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:2696` |
| 1 | property | `Bun.BuildConfig.drop` | `Bun.BuildConfig.drop?: string[];` | — | — | 0 | 1 | Drop function calls to matching property accesses. | `bun.d.ts:2827` |
| 1 | property | `Bun.BuildConfig.emitDCEAnnotations` | `Bun.BuildConfig.emitDCEAnnotations?: boolean;` | — | — | 0 | 1 | Force emitting @__PURE__ annotations even if minify.whitespace is true. | `bun.d.ts:2775` |
| 1 | property | `Bun.BuildConfig.entrypoints` | `Bun.BuildConfig.entrypoints: string[];` | — | — | 0 | 1 | List of entrypoints, usually file paths | `bun.d.ts:2637` |
| 1 | property | `Bun.BuildConfig.env` | `Bun.BuildConfig.env?: "inline" \| "disable" \| `${string}*`;` | — | yes | 0 | 1 | Controls how environment variables are handled during bundling. | `bun.d.ts:2746` |
| 1 | property | `Bun.BuildConfig.external` | `Bun.BuildConfig.external?: string[];` | — | — | 0 | 1 | — | `bun.d.ts:2678` |
| 1 | property | `Bun.BuildConfig.features` | `Bun.BuildConfig.features?: string[];` | — | — | 0 | 1 | Enable feature flags for dead-code elimination via `import { feature } from "bun:bundle"`. | `bun.d.ts:2845` |
| 1 | property | `Bun.BuildConfig.files` | `Bun.BuildConfig.files?: Record<string, string \| Blob \| NodeJS.TypedArray \| ArrayBufferLike>;` | — | — | 0 | 1 | A map of file paths to their contents for in-memory bundling. | `bun.d.ts:2987` |
| 1 | property | `Bun.BuildConfig.footer` | `Bun.BuildConfig.footer?: string;` | — | — | 0 | 1 | Add a footer to the bundled code such as a comment block like | `bun.d.ts:2822` |
| 1 | property | `Bun.BuildConfig.ignoreDCEAnnotations` | `Bun.BuildConfig.ignoreDCEAnnotations?: boolean;` | — | — | 0 | 1 | Ignore dead code elimination/tree-shaking annotations such as @__PURE__ and package.json | `bun.d.ts:2770` |
| 1 | property | `Bun.BuildConfig.jsx` | `Bun.BuildConfig.jsx?: {` | — | — | 0 | 1 | JSX configuration options | `bun.d.ts:2890` |
| 1 | property | `Bun.BuildConfig.loader` | `Bun.BuildConfig.loader?: { [k in string]: Loader };` | — | — | 0 | 1 | — | `bun.d.ts:2698` |
| 1 | property | `Bun.BuildConfig.metafile` | `Bun.BuildConfig.metafile?: boolean;` | false | — | 0 | 1 | Generate a JSON file containing metadata about the build. | `bun.d.ts:3019` |
| 1 | property | `Bun.BuildConfig.minify` | `Bun.BuildConfig.minify?:` | false | — | 0 | 1 | Whether to enable minification. | `bun.d.ts:2756` |
| 1 | property | `Bun.BuildConfig.naming` | `Bun.BuildConfig.naming?:` | — | — | 0 | 1 | — | `bun.d.ts:2668` |
| 1 | property | `Bun.BuildConfig.optimizeImports` | `Bun.BuildConfig.optimizeImports?: string[];` | — | — | 0 | 1 | List of package names whose barrel files (re-export index files) should | `bun.d.ts:2864` |
| 1 | property | `Bun.BuildConfig.outdir` | `Bun.BuildConfig.outdir?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3021` |
| 1 | property | `Bun.BuildConfig.packages` | `Bun.BuildConfig.packages?: "bundle" \| "external";` | — | — | 0 | 1 | — | `bun.d.ts:2694` |
| 1 | property | `Bun.BuildConfig.plugins` | `Bun.BuildConfig.plugins?: BunPlugin[];` | — | — | 0 | 1 | — | `bun.d.ts:2676` |
| 1 | property | `Bun.BuildConfig.publicPath` | `Bun.BuildConfig.publicPath?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2695` |
| 1 | property | `Bun.BuildConfig.reactCompiler` | `Bun.BuildConfig.reactCompiler?: boolean;` | false | — | 0 | 1 | Run the React Compiler over `.jsx`/`.tsx` source files, automatically | `bun.d.ts:2916` |
| 1 | property | `Bun.BuildConfig.reactCompilerOutputMode` | `Bun.BuildConfig.reactCompilerOutputMode?: "client" \| "ssr";` | `"client"` when {@link target} is `"browser"`; `"ssr"` when | — | 0 | 1 | Output mode for the React Compiler. `"ssr"` skips memoization (the | `bun.d.ts:2928` |
| 1 | property | `Bun.BuildConfig.reactFastRefresh` | `Bun.BuildConfig.reactFastRefresh?: boolean;` | false | — | 0 | 1 | Enable React Fast Refresh transform. | `bun.d.ts:2907` |
| 1 | property | `Bun.BuildConfig.root` | `Bun.BuildConfig.root?: string; // project root` | — | — | 0 | 1 | — | `bun.d.ts:2675` |
| 1 | property | `Bun.BuildConfig.sourcemap` | `Bun.BuildConfig.sourcemap?: "none" \| "linked" \| "inline" \| "external" \| boolean;` | "none" | — | 0 | 1 | Specifies if and how to generate source maps. | `bun.d.ts:2717` |
| 1 | property | `Bun.BuildConfig.splitting` | `Bun.BuildConfig.splitting?: boolean;` | — | — | 0 | 1 | Enable code splitting | `bun.d.ts:2632` |
| 1 | property | `Bun.BuildConfig.target` | `Bun.BuildConfig.target?: Target; // default: "browser"` | "browser" | — | 0 | 1 | — | `bun.d.ts:2642` |
| 1 | property | `Bun.BuildConfig.treeShaking` | `Bun.BuildConfig.treeShaking?: boolean;` | — | — | 0 | 1 | Whether to enable tree-shaking (removal of unreferenced top-level | `bun.d.ts:2782` |
| 1 | property | `Bun.BuildConfig.tsconfig` | `Bun.BuildConfig.tsconfig?: string;` | — | — | 0 | 1 | Custom tsconfig.json file path to use for path resolution. | `bun.d.ts:2885` |
| 1 | property | `Bun.BuildMetafile.inputs` | `Bun.BuildMetafile.inputs: {` | — | — | 0 | 1 | Information about all input source files | `bun.d.ts:3713` |
| 1 | property | `Bun.BuildMetafile.outputs` | `Bun.BuildMetafile.outputs: {` | — | — | 0 | 1 | Information about all output files | `bun.d.ts:3735` |
| 1 | property | `Bun.BuildOutput.logs` | `Bun.BuildOutput.logs: Array<BuildMessage \| ResolveMessage>;` | — | — | 0 | 1 | — | `bun.d.ts:3660` |
| 1 | property | `Bun.BuildOutput.metafile` | `Bun.BuildOutput.metafile?: BuildMetafile;` | — | — | 0 | 1 | Metadata about the build including inputs, outputs, and their relationships. | `bun.d.ts:3703` |
| 1 | property | `Bun.BuildOutput.outputs` | `Bun.BuildOutput.outputs: BuildArtifact[];` | — | — | 0 | 1 | — | `bun.d.ts:3658` |
| 1 | property | `Bun.BuildOutput.success` | `Bun.BuildOutput.success: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:3659` |
| 1 | property | `Bun.BunFile.data` | `Bun.BunFile.data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer \| Request \| Response \| BunFile,` | — | — | 0 | 1 | — | `bun.d.ts:2202` |
| 1 | method | `Bun.BunFile.delete` | `Bun.BunFile.delete(): Promise<void>;` | — | — | 0 | 1 | Deletes the file (same as unlink) | `bun.d.ts:2214` |
| 1 | method | `Bun.BunFile.exists` | `Bun.BunFile.exists(): Promise<boolean>;` | — | — | 0 | 1 | Does the file exist? | `bun.d.ts:2194` |
| 1 | property | `Bun.BunFile.lastModified` | `Bun.BunFile.lastModified: number;` | — | — | 0 | 1 | A UNIX timestamp indicating when the file was last modified. | `bun.d.ts:2168` |
| 1 | property | `Bun.BunFile.name` | `Bun.BunFile.name?: string;` | — | — | 0 | 1 | The name or path of the file, as specified in the constructor. | `bun.d.ts:2172` |
| 1 | property | `Bun.BunFile.options` | `Bun.BunFile.options?: { highWaterMark?: number },` | — | — | 0 | 1 | — | `bun.d.ts:2203` |
| 1 | method | `Bun.BunFile.slice` | `Bun.BunFile.slice(begin?: number, end?: number, contentType?: string): BunFile;` | — | — | 0 | 3 | Offset any operation on the file starting at `begin` and ending at `end`. `end` is relative to 0 | `bun.d.ts:2135` |
| 1 | method | `Bun.BunFile.stat` | `Bun.BunFile.stat(): Promise<import("node:fs").Stats>;` | — | — | 0 | 1 | Provides useful information about the file. | `bun.d.ts:2219` |
| 1 | method | `Bun.BunFile.unlink` | `Bun.BunFile.unlink(): Promise<void>;` | — | — | 0 | 1 | Deletes the file. | `bun.d.ts:2209` |
| 1 | method | `Bun.BunFile.write` | `Bun.BunFile.write( data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer \| Request \| Response \| BunFile, options?: { highWaterMark?: number }, ): Pro` | — | yes | 0 | 1 | Write data to the file. This is equivalent to using {@link Bun.write} with a {@link BunFile}. | `bun.d.ts:2201` |
| 1 | method | `Bun.BunFile.writer` | `Bun.BunFile.writer(options?: { highWaterMark?: number }): FileSink;` | — | — | 0 | 1 | Incremental writer for files and pipes. | `bun.d.ts:2159` |
| 1 | property | `Bun.BunInspectOptions.colors` | `Bun.BunInspectOptions.colors?: boolean;` | — | — | 0 | 1 | Whether to colorize the output | `bun.d.ts:4215` |
| 1 | property | `Bun.BunInspectOptions.compact` | `Bun.BunInspectOptions.compact?: boolean;` | — | — | 0 | 1 | Whether to compact the output | `bun.d.ts:4227` |
| 1 | property | `Bun.BunInspectOptions.depth` | `Bun.BunInspectOptions.depth?: number;` | — | — | 0 | 1 | The depth of the inspection | `bun.d.ts:4219` |
| 1 | property | `Bun.BunInspectOptions.sorted` | `Bun.BunInspectOptions.sorted?: boolean;` | — | — | 0 | 1 | Whether to sort the properties of the object | `bun.d.ts:4223` |
| 1 | property | `Bun.BunLockFile.catalog` | `Bun.BunLockFile.catalog?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9490` |
| 1 | property | `Bun.BunLockFile.catalogs` | `Bun.BunLockFile.catalogs?: Record<string, Record<string, string>>;` | — | — | 0 | 1 | — | `bun.d.ts:9492` |
| 1 | property | `Bun.BunLockFile.configVersion` | `Bun.BunLockFile.configVersion?: 0 \| 1;` | — | — | 0 | 1 | `0` / `undefined` for projects created before v1.3.2, `1` for projects created after. | `bun.d.ts:9502` |
| 1 | property | `Bun.BunLockFile.lockfileVersion` | `Bun.BunLockFile.lockfileVersion: 0 \| 1 \| 2;` | — | — | 0 | 1 | — | `bun.d.ts:9479` |
| 1 | property | `Bun.BunLockFile.overrides` | `Bun.BunLockFile.overrides?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9484` |
| 1 | property | `Bun.BunLockFile.packages` | `Bun.BunLockFile.packages: {` | — | — | 0 | 1 | ``` | `bun.d.ts:9519` |
| 1 | property | `Bun.BunLockFile.patchedDependencies` | `Bun.BunLockFile.patchedDependencies?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9486` |
| 1 | property | `Bun.BunLockFile.trustedDependencies` | `Bun.BunLockFile.trustedDependencies?: string[];` | — | — | 0 | 1 | — | `bun.d.ts:9488` |
| 1 | property | `Bun.BunLockFile.workspaces` | `Bun.BunLockFile.workspaces: {` | — | — | 4 | 1 | — | `bun.d.ts:9480` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.bin` | `Bun.BunLockFileBasePackageInfo.bin?: string \| Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9530` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.binDir` | `Bun.BunLockFileBasePackageInfo.binDir?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9531` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.dependencies` | `Bun.BunLockFileBasePackageInfo.dependencies?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9525` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.devDependencies` | `Bun.BunLockFileBasePackageInfo.devDependencies?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9526` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.optionalDependencies` | `Bun.BunLockFileBasePackageInfo.optionalDependencies?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9527` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.optionalPeers` | `Bun.BunLockFileBasePackageInfo.optionalPeers?: string[];` | — | — | 0 | 1 | — | `bun.d.ts:9529` |
| 1 | property | `Bun.BunLockFileBasePackageInfo.peerDependencies` | `Bun.BunLockFileBasePackageInfo.peerDependencies?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:9528` |
| 1 | property | `Bun.BunMessageEvent.bubbles` | `Bun.BunMessageEvent.bubbles?: boolean,` | — | — | 0 | 1 | — | `deprecated.d.ts:92` |
| 1 | property | `Bun.BunMessageEvent.cancelable` | `Bun.BunMessageEvent.cancelable?: boolean,` | — | — | 0 | 1 | — | `deprecated.d.ts:93` |
| 1 | property | `Bun.BunMessageEvent.data` | `Bun.BunMessageEvent.data: T;` | — | — | 0 | 2 | Returns the data of the message. | `bun.d.ts:139` |
| 1 | method | `Bun.BunMessageEvent.initMessageEvent` *(deprecated)* | `Bun.BunMessageEvent.initMessageEvent( type: string, bubbles?: boolean, cancelable?: boolean, data?: any, origin?: string, lastEventId?: string, source?: null, )` | — | — | 0 | 1 | — | `deprecated.d.ts:90` |
| 1 | property | `Bun.BunMessageEvent.lastEventId` | `Bun.BunMessageEvent.lastEventId: string;` | — | — | 0 | 2 | Returns the last event ID string, for server-sent events. | `bun.d.ts:141` |
| 1 | property | `Bun.BunMessageEvent.origin` | `Bun.BunMessageEvent.origin: string;` | — | — | 0 | 2 | Returns the origin of the message, for server-sent events and cross-document messaging. | `bun.d.ts:143` |
| 1 | property | `Bun.BunMessageEvent.ports` | `Bun.BunMessageEvent.ports: readonly MessagePort[]; // ReadonlyArray<typeof import("worker_threads").MessagePort["prototype"]>;` | — | — | 0 | 1 | Returns the MessagePort array sent with the message, for cross-document messaging and channel messaging. | `bun.d.ts:145` |
| 1 | property | `Bun.BunMessageEvent.source` | `Bun.BunMessageEvent.source: Bun.MessageEventSource \| null;` | — | — | 0 | 2 | — | `bun.d.ts:146` |
| 1 | property | `Bun.BunPlugin.build` | `Bun.BunPlugin.build: PluginBuilder,` | — | — | 0 | 1 | A builder object that can be used to register plugin hooks | `bun.d.ts:5725` |
| 1 | property | `Bun.BunPlugin.name` | `Bun.BunPlugin.name: string;` | — | — | 0 | 1 | Human-readable name of the plugin | `bun.d.ts:5693` |
| 1 | method | `Bun.BunPlugin.setup` | `Bun.BunPlugin.setup( /** * A builder object that can be used to register plugin hooks * @example * ```ts * builder.onLoad({ filter: /\.yaml$/ }, ({ path }) => (` | — | — | 0 | 1 | A function that will be called when the plugin is loaded. | `bun.d.ts:5714` |
| 1 | property | `Bun.BunPlugin.target` | `Bun.BunPlugin.target?: Target;` | — | — | 0 | 1 | The target JavaScript environment the plugin should be applied to. | `bun.d.ts:5705` |
| 1 | method | `Bun.BunRegisterPlugin.clearAll` | `Bun.BunRegisterPlugin.clearAll(): void;` | — | — | 0 | 1 | Deactivate all plugins | `bun.d.ts:5775` |
| 1 | method | `Bun.BunRequest.clone` | `Bun.BunRequest.clone(): BunRequest<T>;` | — | — | 0 | 1 | — | `serve.d.ts:821` |
| 1 | property | `Bun.BunRequest.cookies` | `Bun.BunRequest.cookies: CookieMap;` | — | — | 0 | 1 | — | `serve.d.ts:820` |
| 1 | property | `Bun.BunRequest.params` | `Bun.BunRequest.params: {` | — | — | 0 | 1 | — | `serve.d.ts:817` |
| 1 | property | `Bun.CloseEventInit.code` | `Bun.CloseEventInit.code?: number;` | — | — | 0 | 1 | — | `bun.d.ts:110` |
| 1 | property | `Bun.CloseEventInit.reason` | `Bun.CloseEventInit.reason?: string;` | — | — | 0 | 1 | — | `bun.d.ts:111` |
| 1 | property | `Bun.CloseEventInit.wasClean` | `Bun.CloseEventInit.wasClean?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:112` |
| 1 | property | `Bun.CompileBuildOptions.autoloadBunfig` | `Bun.CompileBuildOptions.autoloadBunfig?: boolean;` | true | — | 0 | 1 | Whether to autoload bunfig.toml when the standalone executable runs | `bun.d.ts:3088` |
| 1 | property | `Bun.CompileBuildOptions.autoloadDotenv` | `Bun.CompileBuildOptions.autoloadDotenv?: boolean;` | true | — | 0 | 1 | Whether to autoload .env files when the standalone executable runs | `bun.d.ts:3078` |
| 1 | property | `Bun.CompileBuildOptions.autoloadPackageJson` | `Bun.CompileBuildOptions.autoloadPackageJson?: boolean;` | false | — | 0 | 1 | Whether to autoload package.json when the standalone executable runs | `bun.d.ts:3108` |
| 1 | property | `Bun.CompileBuildOptions.autoloadTsconfig` | `Bun.CompileBuildOptions.autoloadTsconfig?: boolean;` | false | — | 0 | 1 | Whether to autoload tsconfig.json when the standalone executable runs | `bun.d.ts:3098` |
| 1 | property | `Bun.CompileBuildOptions.execArgv` | `Bun.CompileBuildOptions.execArgv?: string[];` | — | — | 0 | 1 | — | `bun.d.ts:3066` |
| 1 | property | `Bun.CompileBuildOptions.executablePath` | `Bun.CompileBuildOptions.executablePath?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3067` |
| 1 | property | `Bun.CompileBuildOptions.outfile` | `Bun.CompileBuildOptions.outfile?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3068` |
| 1 | property | `Bun.CompileBuildOptions.target` | `Bun.CompileBuildOptions.target?: Bun.Build.CompileTarget;` | — | — | 0 | 1 | — | `bun.d.ts:3065` |
| 1 | property | `Bun.CompileBuildOptions.windows` | `Bun.CompileBuildOptions.windows?: {` | — | — | 0 | 1 | — | `bun.d.ts:3109` |
| 1 | property | `Bun.Cookie.domain` | `Bun.Cookie.domain?: string;` | — | — | 0 | 1 | The domain of the cookie | `bun.d.ts:9629` |
| 1 | property | `Bun.Cookie.expires` | `Bun.Cookie.expires?: Date;` | — | — | 0 | 1 | The expiration date of the cookie | `bun.d.ts:9639` |
| 1 | property | `Bun.Cookie.httpOnly` | `Bun.Cookie.httpOnly: boolean;` | — | — | 0 | 1 | Whether the cookie is HTTP-only | `bun.d.ts:9664` |
| 1 | method | `Bun.Cookie.isExpired` | `Bun.Cookie.isExpired(): boolean;` | — | — | 0 | 1 | Whether the cookie is expired | `bun.d.ts:9669` |
| 1 | property | `Bun.Cookie.maxAge` | `Bun.Cookie.maxAge?: number;` | — | — | 0 | 1 | The maximum age of the cookie in seconds | `bun.d.ts:9659` |
| 1 | property | `Bun.Cookie.name` | `Bun.Cookie.name: string;` | — | — | 0 | 1 | The name of the cookie | `bun.d.ts:9619` |
| 1 | method | `Bun.Cookie.parse` | `Bun.Cookie.parse(cookieString: string): Cookie;` | — | — | 0 | 1 | Parse a cookie string into a Cookie object | `bun.d.ts:9702` |
| 1 | property | `Bun.Cookie.partitioned` | `Bun.Cookie.partitioned: boolean;` | — | — | 0 | 1 | Whether the cookie is partitioned | `bun.d.ts:9654` |
| 1 | property | `Bun.Cookie.path` | `Bun.Cookie.path: string;` | — | — | 0 | 1 | The path of the cookie | `bun.d.ts:9634` |
| 1 | property | `Bun.Cookie.sameSite` | `Bun.Cookie.sameSite: CookieSameSite;` | — | — | 0 | 1 | The same-site attribute of the cookie | `bun.d.ts:9649` |
| 1 | property | `Bun.Cookie.secure` | `Bun.Cookie.secure: boolean;` | — | — | 0 | 1 | Whether the cookie is secure | `bun.d.ts:9644` |
| 1 | method | `Bun.Cookie.serialize` | `Bun.Cookie.serialize(): string;` | — | — | 0 | 1 | Serialize the cookie to a string | `bun.d.ts:9684` |
| 1 | method | `Bun.Cookie.toJSON` | `Bun.Cookie.toJSON(): CookieInit;` | — | — | 0 | 1 | Serialize the cookie to a JSON object | `bun.d.ts:9696` |
| 1 | method | `Bun.Cookie.toString` | `Bun.Cookie.toString(): string;` | — | — | 0 | 1 | Serialize the cookie to a string | `bun.d.ts:9691` |
| 1 | property | `Bun.Cookie.value` | `Bun.Cookie.value: string;` | — | — | 0 | 1 | The value of the cookie | `bun.d.ts:9624` |
| 1 | property | `Bun.CookieInit.domain` | `Bun.CookieInit.domain?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9561` |
| 1 | property | `Bun.CookieInit.expires` | `Bun.CookieInit.expires?: number \| Date \| string;` | — | — | 0 | 1 | — | `bun.d.ts:9564` |
| 1 | property | `Bun.CookieInit.httpOnly` | `Bun.CookieInit.httpOnly?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:9568` |
| 1 | property | `Bun.CookieInit.maxAge` | `Bun.CookieInit.maxAge?: number;` | — | — | 0 | 1 | — | `bun.d.ts:9570` |
| 1 | property | `Bun.CookieInit.name` | `Bun.CookieInit.name?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9559` |
| 1 | property | `Bun.CookieInit.partitioned` | `Bun.CookieInit.partitioned?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:9569` |
| 1 | property | `Bun.CookieInit.path` | `Bun.CookieInit.path?: string;` | — | — | 0 | 1 | Defaults to '/'. To allow the browser to set the path, use an empty string. | `bun.d.ts:9563` |
| 1 | property | `Bun.CookieInit.sameSite` | `Bun.CookieInit.sameSite?: CookieSameSite;` | — | — | 0 | 1 | Defaults to `lax`. | `bun.d.ts:9567` |
| 1 | property | `Bun.CookieInit.secure` | `Bun.CookieInit.secure?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:9565` |
| 1 | property | `Bun.CookieInit.value` | `Bun.CookieInit.value?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9560` |
| 1 | method | `Bun.CookieMap.delete` | `Bun.CookieMap.delete(name: string): void;` | — | — | 0 | 3 | Removes a cookie from the map. | `bun.d.ts:9770` |
| 1 | method | `Bun.CookieMap.entries` | `Bun.CookieMap.entries(): IterableIterator<[string, string]>;` | — | — | 0 | 1 | Returns an iterator of [name, value] pairs for every cookie in the map. | `bun.d.ts:9804` |
| 1 | method | `Bun.CookieMap.forEach` | `Bun.CookieMap.forEach(callback: (value: string, key: string, map: CookieMap) => void): void;` | — | — | 0 | 1 | Executes a provided function once for each cookie in the map. | `bun.d.ts:9825` |
| 1 | method | `Bun.CookieMap.has` | `Bun.CookieMap.has(name: string): boolean;` | — | — | 0 | 1 | Checks if a cookie with the given name exists. | `bun.d.ts:9747` |
| 1 | method | `Bun.CookieMap.keys` | `Bun.CookieMap.keys(): IterableIterator<string>;` | — | — | 0 | 1 | Returns an iterator of all cookie names in the map. | `bun.d.ts:9811` |
| 1 | property | `Bun.CookieMap.size` | `Bun.CookieMap.size: number;` | — | — | 0 | 1 | The number of cookies in the map. | `bun.d.ts:9797` |
| 1 | method | `Bun.CookieMap.toJSON` | `Bun.CookieMap.toJSON(): Record<string, string>;` | — | — | 0 | 1 | Converts the cookie map to a serializable format. | `bun.d.ts:9792` |
| 1 | method | `Bun.CookieMap.toSetCookieHeaders` | `Bun.CookieMap.toSetCookieHeaders(): string[];` | — | — | 0 | 1 | Gets an array of values for Set-Cookie headers in order to apply all changes to cookies. | `bun.d.ts:9739` |
| 1 | method | `Bun.CookieMap.values` | `Bun.CookieMap.values(): IterableIterator<string>;` | — | — | 0 | 1 | Returns an iterator of all cookie values in the map. | `bun.d.ts:9818` |
| 1 | property | `Bun.CookieStoreDeleteOptions.domain` | `Bun.CookieStoreDeleteOptions.domain?: string \| null;` | — | — | 0 | 1 | — | `bun.d.ts:9575` |
| 1 | property | `Bun.CookieStoreDeleteOptions.name` | `Bun.CookieStoreDeleteOptions.name: string;` | — | — | 0 | 1 | — | `bun.d.ts:9574` |
| 1 | property | `Bun.CookieStoreDeleteOptions.path` | `Bun.CookieStoreDeleteOptions.path?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9576` |
| 1 | property | `Bun.CookieStoreGetOptions.name` | `Bun.CookieStoreGetOptions.name?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9580` |
| 1 | property | `Bun.CookieStoreGetOptions.url` | `Bun.CookieStoreGetOptions.url?: string;` | — | — | 0 | 1 | — | `bun.d.ts:9581` |
| 1 | property | `Bun.CronController.cron` | `Bun.CronController.cron: string;` | — | — | 0 | 1 | The cron expression that triggered this invocation. | `bun.d.ts:7550` |
| 1 | property | `Bun.CronController.scheduledTime` | `Bun.CronController.scheduledTime: number;` | — | — | 0 | 1 | Timestamp (ms since epoch) when the job was scheduled to run. | `bun.d.ts:7552` |
| 1 | property | `Bun.CronJob.cron` | `Bun.CronJob.cron: string;` | — | — | 0 | 1 | The cron expression string. | `bun.d.ts:7596` |
| 1 | method | `Bun.CronJob.ref` | `Bun.CronJob.ref(): CronJob;` | — | — | 0 | 1 | Keep the process alive while this job is scheduled (default). | `bun.d.ts:7600` |
| 1 | method | `Bun.CronJob.stop` | `Bun.CronJob.stop(): CronJob;` | — | — | 0 | 1 | Cancel this cron job. The callback will not fire again. | `bun.d.ts:7598` |
| 1 | method | `Bun.CronJob.unref` | `Bun.CronJob.unref(): CronJob;` | — | — | 0 | 1 | Allow the process to exit even while this job is scheduled. | `bun.d.ts:7602` |
| 1 | property | `Bun.CryptoHasher.algorithm` | `Bun.CryptoHasher.algorithm: SupportedCryptoAlgorithms;` | — | — | 0 | 3 | The algorithm chosen to hash the data | `bun.d.ts:4972` |
| 1 | property | `Bun.CryptoHasher.byteLength` | `Bun.CryptoHasher.byteLength: number;` | — | — | 0 | 1 | The length of the output hash in bytes | `bun.d.ts:4977` |
| 1 | method | `Bun.CryptoHasher.copy` | `Bun.CryptoHasher.copy(): CryptoHasher;` | — | — | 0 | 1 | Perform a deep copy of the hasher | `bun.d.ts:4997` |
| 1 | method | `Bun.CryptoHasher.digest` | `Bun.CryptoHasher.digest(encoding: DigestEncoding): string;` | — | — | 1 | 3 | Finalize the hash. Resets the CryptoHasher so it can be reused. | `bun.d.ts:5004` |
| 1 | property | `Bun.CryptoHasher.encoding` | `Bun.CryptoHasher.encoding: DigestEncoding,` | — | — | 0 | 1 | — | `bun.d.ts:5048` |
| 1 | method | `Bun.CryptoHasher.hash` | `Bun.CryptoHasher.hash(algorithm: SupportedCryptoAlgorithms, input: Bun.BlobOrStringOrBuffer): Buffer;` | — | — | 2 | 3 | Run the hash over the given data | `bun.d.ts:5023` |
| 1 | property | `Bun.CryptoHasher.hashInto` | `Bun.CryptoHasher.hashInto: NodeJS.TypedArray,` | — | — | 0 | 1 | — | `bun.d.ts:5035` |
| 1 | property | `Bun.CryptoHasher.input` | `Bun.CryptoHasher.input: Bun.BlobOrStringOrBuffer,` | — | — | 0 | 2 | — | `bun.d.ts:5034` |
| 1 | method | `Bun.CryptoHasher.update` | `Bun.CryptoHasher.update(input: Bun.BlobOrStringOrBuffer, inputEncoding?: import("crypto").Encoding): CryptoHasher;` | — | — | 0 | 1 | Update the hash with data | `bun.d.ts:4992` |
| 1 | function | `Bun.CSRF.generate` | `Bun.CSRF.generate(secret?: string, options?: CSRFGenerateOptions): string;` | — | — | 20 | 1 | Generate a CSRF token. | `bun.d.ts:2297` |
| 1 | function | `Bun.CSRF.verify` | `Bun.CSRF.verify(token: string, options?: CSRFVerifyOptions): boolean;` | — | — | 14 | 1 | Verify a CSRF token. | `bun.d.ts:2305` |
| 1 | property | `Bun.CSRFGenerateOptions.algorithm` | `Bun.CSRFGenerateOptions.algorithm?: CSRFAlgorithm;` | "sha256" | — | 0 | 1 | The algorithm to use for the token. | `bun.d.ts:2241` |
| 1 | property | `Bun.CSRFGenerateOptions.encoding` | `Bun.CSRFGenerateOptions.encoding?: "base64" \| "base64url" \| "hex";` | "base64url" | — | 0 | 1 | The encoding of the token. | `bun.d.ts:2235` |
| 1 | property | `Bun.CSRFGenerateOptions.expiresIn` | `Bun.CSRFGenerateOptions.expiresIn?: number;` | 24 | — | 0 | 1 | The number of milliseconds until the token expires. 0 means the token never expires. | `bun.d.ts:2229` |
| 1 | property | `Bun.CSRFGenerateOptions.sessionId` | `Bun.CSRFGenerateOptions.sessionId?: string;` | — | — | 0 | 1 | Binds the token to the requesting principal (session ID, user ID, or | `bun.d.ts:2249` |
| 1 | property | `Bun.CSRFVerifyOptions.algorithm` | `Bun.CSRFVerifyOptions.algorithm?: CSRFAlgorithm;` | "sha256" | — | 0 | 1 | The algorithm to use for the token. | `bun.d.ts:2268` |
| 1 | property | `Bun.CSRFVerifyOptions.encoding` | `Bun.CSRFVerifyOptions.encoding?: "base64" \| "base64url" \| "hex";` | "base64url" | — | 0 | 1 | The encoding of the token. | `bun.d.ts:2262` |
| 1 | property | `Bun.CSRFVerifyOptions.maxAge` | `Bun.CSRFVerifyOptions.maxAge?: number;` | 24 | — | 0 | 1 | The number of milliseconds until the token expires. 0 means the token never expires. | `bun.d.ts:2274` |
| 1 | property | `Bun.CSRFVerifyOptions.secret` | `Bun.CSRFVerifyOptions.secret?: string;` | — | — | 0 | 1 | The secret to use for the token. If not provided, a random default secret will be generated in memory and used. | `bun.d.ts:2256` |
| 1 | property | `Bun.CSRFVerifyOptions.sessionId` | `Bun.CSRFVerifyOptions.sessionId?: string;` | — | — | 0 | 1 | The principal (session ID, user ID, or equivalent) the token must be | `bun.d.ts:2282` |
| 1 | property | `Bun.CustomEventInit.detail` | `Bun.CustomEventInit.detail?: T;` | — | — | 0 | 1 | — | `bun.d.ts:133` |
| 1 | property | `Bun.DirectUnderlyingSource.cancel` | `Bun.DirectUnderlyingSource.cancel?: UnderlyingSourceCancelCallback;` | — | — | 0 | 1 | — | `bun.d.ts:316` |
| 1 | property | `Bun.DirectUnderlyingSource.pull` | `Bun.DirectUnderlyingSource.pull: (controller: ReadableStreamDirectController)` | — | — | 0 | 1 | — | `bun.d.ts:317` |
| 1 | const | `Bun.dns.ADDRCONFIG` | `Bun.dns.ADDRCONFIG: number;` | — | — | 0 | 1 | — | `bun.d.ts:2072` |
| 1 | const | `Bun.dns.ALL` | `Bun.dns.ALL: number;` | — | — | 0 | 1 | — | `bun.d.ts:2073` |
| 1 | function | `Bun.dns.getCacheStats` | `Bun.dns.getCacheStats(): {` | — | — | 10 | 1 | **Experimental API** | `bun.d.ts:2060` |
| 1 | function | `Bun.dns.lookup` | `Bun.dns.lookup( hostname: string, options?: {` | — | — | 20 | 1 | Lookup the IP address for a hostname | `bun.d.ts:1985` |
| 1 | function | `Bun.dns.prefetch` | `Bun.dns.prefetch(hostname: string, port?: number): void;` | — | — | 15 | 1 | **Experimental API** | `bun.d.ts:2055` |
| 1 | const | `Bun.dns.V4MAPPED` | `Bun.dns.V4MAPPED: number;` | — | — | 0 | 1 | — | `bun.d.ts:2074` |
| 1 | property | `Bun.DNSLookup.address` | `Bun.DNSLookup.address: string;` | — | — | 0 | 1 | The IP address of the host as a string in IPv4 or IPv6 format. | `bun.d.ts:2085` |
| 1 | property | `Bun.DNSLookup.family` | `Bun.DNSLookup.family: 4 \| 6;` | — | — | 0 | 1 | — | `bun.d.ts:2086` |
| 1 | property | `Bun.DNSLookup.ttl` | `Bun.DNSLookup.ttl: number;` | — | — | 0 | 1 | Time to live in seconds | `bun.d.ts:2094` |
| 1 | property | `Bun.EditorOptions.column` | `Bun.EditorOptions.column?: number;` | — | — | 0 | 1 | — | `bun.d.ts:4895` |
| 1 | property | `Bun.EditorOptions.editor` | `Bun.EditorOptions.editor?: "vscode" \| "subl";` | — | — | 0 | 1 | — | `bun.d.ts:4893` |
| 1 | property | `Bun.EditorOptions.line` | `Bun.EditorOptions.line?: number;` | — | — | 0 | 1 | — | `bun.d.ts:4894` |
| 1 | property | `Bun.Env.NODE_ENV` | `Bun.Env.NODE_ENV?: string;` | — | — | 0 | 1 | — | `bun.d.ts:504` |
| 1 | property | `Bun.Env.TZ` | `Bun.Env.TZ?: string;` | — | — | 0 | 1 | Can be used to change the default timezone at runtime | `bun.d.ts:508` |
| 1 | property | `Bun.ErrorEventInit.colno` | `Bun.ErrorEventInit.colno?: number;` | — | — | 0 | 1 | — | `bun.d.ts:102` |
| 1 | property | `Bun.ErrorEventInit.error` | `Bun.ErrorEventInit.error?: any;` | — | — | 0 | 1 | — | `bun.d.ts:103` |
| 1 | property | `Bun.ErrorEventInit.filename` | `Bun.ErrorEventInit.filename?: string;` | — | — | 0 | 1 | — | `bun.d.ts:104` |
| 1 | property | `Bun.ErrorEventInit.lineno` | `Bun.ErrorEventInit.lineno?: number;` | — | — | 0 | 1 | — | `bun.d.ts:105` |
| 1 | property | `Bun.ErrorEventInit.message` | `Bun.ErrorEventInit.message?: string;` | — | — | 0 | 1 | — | `bun.d.ts:106` |
| 1 | property | `Bun.ErrorLike.code` | `Bun.ErrorLike.code?: string;` | — | — | 0 | 1 | — | `bun.d.ts:4012` |
| 1 | property | `Bun.ErrorLike.errno` | `Bun.ErrorLike.errno?: number;` | — | — | 0 | 1 | — | `bun.d.ts:4013` |
| 1 | property | `Bun.ErrorLike.syscall` | `Bun.ErrorLike.syscall?: string;` | — | — | 0 | 1 | — | `bun.d.ts:4014` |
| 1 | property | `Bun.EventInit.bubbles` | `Bun.EventInit.bubbles?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:123` |
| 1 | property | `Bun.EventInit.cancelable` | `Bun.EventInit.cancelable?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:124` |
| 1 | property | `Bun.EventInit.composed` | `Bun.EventInit.composed?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:125` |
| 1 | method | `Bun.EventListenerObject.handleEvent` | `Bun.EventListenerObject.handleEvent(object: Event): void;` | — | — | 0 | 1 | — | `bun.d.ts:177` |
| 1 | property | `Bun.EventListenerOptions.capture` | `Bun.EventListenerOptions.capture?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:129` |
| 1 | property | `Bun.EventMap.fetch` | `Bun.EventMap.fetch: FetchEvent;` | — | — | 0 | 1 | — | `bun.d.ts:189` |
| 1 | property | `Bun.EventMap.message` | `Bun.EventMap.message: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:190` |
| 1 | property | `Bun.EventMap.messageerror` | `Bun.EventMap.messageerror: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:191` |
| 1 | method | `Bun.EventSource.addEventListener` | `Bun.EventSource.addEventListener( type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) => any, options?: boolean \| AddEventListenerOptions, ): voi` | — | — | 0 | 3 | — | `bun.d.ts:219` |
| 1 | method | `Bun.EventSource.close` | `Bun.EventSource.close(): void;` | — | — | 0 | 1 | Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED. | `bun.d.ts:215` |
| 1 | property | `Bun.EventSource.CLOSED` | `Bun.EventSource.CLOSED: 2;` | — | — | 0 | 1 | — | `bun.d.ts:216` |
| 1 | property | `Bun.EventSource.CONNECTING` | `Bun.EventSource.CONNECTING: 0;` | — | — | 0 | 1 | — | `bun.d.ts:217` |
| 1 | property | `Bun.EventSource.listener` | `Bun.EventSource.listener: (this: EventSource, ev: EventSourceEventMap[K])` | — | — | 0 | 6 | — | `bun.d.ts:221` |
| 1 | property | `Bun.EventSource.onerror` | `Bun.EventSource.onerror: ((this: EventSource, ev: Event)` | — | — | 0 | 1 | — | `bun.d.ts:202` |
| 1 | property | `Bun.EventSource.onmessage` | `Bun.EventSource.onmessage: ((this: EventSource, ev: MessageEvent)` | — | — | 0 | 1 | — | `bun.d.ts:203` |
| 1 | property | `Bun.EventSource.onopen` | `Bun.EventSource.onopen: ((this: EventSource, ev: Event)` | — | — | 0 | 1 | — | `bun.d.ts:204` |
| 1 | property | `Bun.EventSource.OPEN` | `Bun.EventSource.OPEN: 1;` | — | — | 0 | 1 | — | `bun.d.ts:218` |
| 1 | property | `Bun.EventSource.options` | `Bun.EventSource.options?: boolean \| AddEventListenerOptions,` | — | — | 0 | 6 | — | `bun.d.ts:222` |
| 1 | property | `Bun.EventSource.readyState` | `Bun.EventSource.readyState: number;` | — | — | 0 | 1 | Returns the state of this EventSource object's connection. It can have the values described below. | `bun.d.ts:206` |
| 1 | method | `Bun.EventSource.ref` | `Bun.EventSource.ref(): void;` | — | — | 0 | 1 | Keep the event loop alive while connection is open or reconnecting | `bun.d.ts:255` |
| 1 | method | `Bun.EventSource.removeEventListener` | `Bun.EventSource.removeEventListener( type: K, listener: (this: EventSource, ev: EventSourceEventMap[K]) => any, options?: boolean \| EventListenerOptions, ): voi` | — | — | 0 | 3 | — | `bun.d.ts:234` |
| 1 | method | `Bun.EventSource.unref` | `Bun.EventSource.unref(): void;` | — | — | 0 | 1 | Do not keep the event loop alive while connection is open or reconnecting | `bun.d.ts:262` |
| 1 | property | `Bun.EventSource.url` | `Bun.EventSource.url: string;` | — | — | 0 | 1 | Returns the URL providing the event stream. | `bun.d.ts:208` |
| 1 | property | `Bun.EventSource.withCredentials` | `Bun.EventSource.withCredentials: boolean;` | — | — | 0 | 1 | Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise. | `bun.d.ts:213` |
| 1 | property | `Bun.EventSourceEventMap.error` | `Bun.EventSourceEventMap.error: Event;` | — | — | 0 | 1 | — | `bun.d.ts:159` |
| 1 | property | `Bun.EventSourceEventMap.message` | `Bun.EventSourceEventMap.message: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:160` |
| 1 | property | `Bun.EventSourceEventMap.open` | `Bun.EventSourceEventMap.open: Event;` | — | — | 0 | 1 | — | `bun.d.ts:161` |
| 1 | property | `Bun.FdSocketOptions.fd` | `Bun.FdSocketOptions.fd: number;` | — | — | 0 | 1 | The file descriptor to connect to | `bun.d.ts:6538` |
| 1 | property | `Bun.FdSocketOptions.tls` | `Bun.FdSocketOptions.tls?: TLSOptions \| boolean;` | — | — | 0 | 1 | TLS Configuration with which to create the socket | `bun.d.ts:6534` |
| 1 | property | `Bun.FetchEvent.request` | `Bun.FetchEvent.request: Request;` | — | — | 0 | 1 | — | `bun.d.ts:181` |
| 1 | method | `Bun.FetchEvent.respondWith` | `Bun.FetchEvent.respondWith(response: Response \| Promise<Response>): void;` | — | — | 0 | 1 | — | `bun.d.ts:185` |
| 1 | property | `Bun.FetchEvent.url` | `Bun.FetchEvent.url: string;` | — | — | 0 | 1 | — | `bun.d.ts:182` |
| 1 | method | `Bun.FetchEvent.waitUntil` | `Bun.FetchEvent.waitUntil(promise: Promise<any>): void;` | — | — | 0 | 1 | — | `bun.d.ts:184` |
| 1 | method | `Bun.FileSink.end` | `Bun.FileSink.end(error?: Error): number \| Promise<number>;` | — | — | 0 | 1 | Close the file descriptor. This also flushes the internal buffer. | `s3.d.ts:29` |
| 1 | method | `Bun.FileSink.flush` | `Bun.FileSink.flush(): number \| Promise<number>;` | — | — | 0 | 1 | Flush the internal buffer, committing the data to disk or the pipe. | `s3.d.ts:22` |
| 1 | method | `Bun.FileSink.ref` | `Bun.FileSink.ref(): void;` | — | — | 0 | 1 | For FIFOs & pipes, this lets you decide whether Bun's process should | `s3.d.ts:59` |
| 1 | method | `Bun.FileSink.start` | `Bun.FileSink.start(options?: { /** * Preallocate an internal buffer of this size * This can significantly improve performance when the chunk size is small */ hi` | — | — | 0 | 1 | Start the file sink with provided options. | `s3.d.ts:36` |
| 1 | method | `Bun.FileSink.unref` | `Bun.FileSink.unref(): void;` | — | — | 0 | 1 | For FIFOs & pipes, this lets you decide whether Bun's process should | `s3.d.ts:71` |
| 1 | method | `Bun.FileSink.write` | `Bun.FileSink.write(chunk: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer): number \| Promise<number>;` | — | yes | 0 | 1 | Write a chunk of data to the file. | `s3.d.ts:16` |
| 1 | property | `Bun.FileSystemRouter.assetPrefix` | `Bun.FileSystemRouter.assetPrefix: string;` | — | — | 0 | 1 | — | `bun.d.ts:8058` |
| 1 | method | `Bun.FileSystemRouter.match` | `Bun.FileSystemRouter.match(input: string \| Request \| Response): MatchedRoute \| null;` | — | — | 0 | 1 | — | `bun.d.ts:8056` |
| 1 | property | `Bun.FileSystemRouter.origin` | `Bun.FileSystemRouter.origin: string;` | — | — | 0 | 1 | — | `bun.d.ts:8059` |
| 1 | method | `Bun.FileSystemRouter.reload` | `Bun.FileSystemRouter.reload(): void;` | — | — | 0 | 1 | — | `bun.d.ts:8063` |
| 1 | property | `Bun.FileSystemRouter.routes` | `Bun.FileSystemRouter.routes: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:8061` |
| 1 | property | `Bun.FileSystemRouter.style` | `Bun.FileSystemRouter.style: string;` | — | — | 0 | 1 | — | `bun.d.ts:8060` |
| 1 | property | `Bun.GenericTransformStream.readable` | `Bun.GenericTransformStream.readable: ReadableStream;` | — | — | 0 | 1 | — | `bun.d.ts:330` |
| 1 | property | `Bun.GenericTransformStream.writable` | `Bun.GenericTransformStream.writable: WritableStream;` | — | — | 0 | 1 | — | `bun.d.ts:331` |
| 1 | method | `Bun.Glob.match` | `Bun.Glob.match(str: string): boolean;` | — | — | 0 | 1 | Match the glob against a string | `bun.d.ts:8249` |
| 1 | method | `Bun.Glob.scan` | `Bun.Glob.scan(optionsOrCwd?: string \| GlobScanOptions): AsyncIterableIterator<string>;` | — | — | 9 | 1 | Scan a root directory recursively for files that match this glob pattern. Returns an async iterator. | `bun.d.ts:8217` |
| 1 | method | `Bun.Glob.scanSync` | `Bun.Glob.scanSync(optionsOrCwd?: string \| GlobScanOptions): IterableIterator<string>;` | — | — | 0 | 1 | Synchronously scan a root directory recursively for files that match this glob pattern. Returns an iterator. | `bun.d.ts:8238` |
| 1 | property | `Bun.GlobScanOptions.absolute` | `Bun.GlobScanOptions.absolute?: boolean;` | false | — | 0 | 1 | Return the absolute path for entries. | `bun.d.ts:8137` |
| 1 | property | `Bun.GlobScanOptions.cwd` | `Bun.GlobScanOptions.cwd?: string;` | — | — | 0 | 1 | The root directory to start matching from. Defaults to `process.cwd()` | `bun.d.ts:8123` |
| 1 | property | `Bun.GlobScanOptions.dot` | `Bun.GlobScanOptions.dot?: boolean;` | false | — | 0 | 1 | Allow patterns to match entries that begin with a period (`.`). | `bun.d.ts:8130` |
| 1 | property | `Bun.GlobScanOptions.followSymlinks` | `Bun.GlobScanOptions.followSymlinks?: boolean;` | false | — | 0 | 1 | Indicates whether to traverse descendants of symbolic link directories. | `bun.d.ts:8144` |
| 1 | property | `Bun.GlobScanOptions.onlyFiles` | `Bun.GlobScanOptions.onlyFiles?: boolean;` | true | — | 0 | 1 | Return only files. | `bun.d.ts:8158` |
| 1 | property | `Bun.GlobScanOptions.throwErrorOnBrokenSymlink` | `Bun.GlobScanOptions.throwErrorOnBrokenSymlink?: boolean;` | false | — | 0 | 1 | Throw an error when symbolic link is broken | `bun.d.ts:8151` |
| 1 | property | `Bun.Hash.adler32` | `Bun.Hash.adler32: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer)` | — | — | 0 | 1 | — | `bun.d.ts:2336` |
| 1 | property | `Bun.Hash.cityHash32` | `Bun.Hash.cityHash32: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer)` | — | — | 0 | 1 | — | `bun.d.ts:2338` |
| 1 | property | `Bun.Hash.cityHash64` | `Bun.Hash.cityHash64: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2339` |
| 1 | property | `Bun.Hash.crc32` | `Bun.Hash.crc32: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: number)` | — | — | 0 | 1 | — | `bun.d.ts:2337` |
| 1 | property | `Bun.Hash.murmur32v2` | `Bun.Hash.murmur32v2: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: number)` | — | — | 0 | 1 | — | `bun.d.ts:2344` |
| 1 | property | `Bun.Hash.murmur32v3` | `Bun.Hash.murmur32v3: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: number)` | — | — | 0 | 1 | — | `bun.d.ts:2343` |
| 1 | property | `Bun.Hash.murmur64v2` | `Bun.Hash.murmur64v2: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2345` |
| 1 | property | `Bun.Hash.rapidhash` | `Bun.Hash.rapidhash: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2346` |
| 1 | property | `Bun.Hash.wyhash` | `Bun.Hash.wyhash: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2335` |
| 1 | property | `Bun.Hash.xxHash3` | `Bun.Hash.xxHash3: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2342` |
| 1 | property | `Bun.Hash.xxHash32` | `Bun.Hash.xxHash32: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: number)` | — | — | 0 | 1 | — | `bun.d.ts:2340` |
| 1 | property | `Bun.Hash.xxHash64` | `Bun.Hash.xxHash64: (data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, seed?: bigint)` | — | — | 0 | 1 | — | `bun.d.ts:2341` |
| 1 | property | `Bun.HeapSnapshot.edgeNames` | `Bun.HeapSnapshot.edgeNames: string[];` | — | — | 0 | 1 | — | `bun.d.ts:4822` |
| 1 | property | `Bun.HeapSnapshot.edges` | `Bun.HeapSnapshot.edges: number[];` | — | — | 0 | 1 | — | `bun.d.ts:4820` |
| 1 | property | `Bun.HeapSnapshot.edgeTypes` | `Bun.HeapSnapshot.edgeTypes: string[];` | — | — | 0 | 1 | — | `bun.d.ts:4821` |
| 1 | property | `Bun.HeapSnapshot.nodeClassNames` | `Bun.HeapSnapshot.nodeClassNames: string[];` | — | — | 0 | 1 | — | `bun.d.ts:4819` |
| 1 | property | `Bun.HeapSnapshot.nodes` | `Bun.HeapSnapshot.nodes: number[];` | — | — | 0 | 1 | — | `bun.d.ts:4817` |
| 1 | property | `Bun.HeapSnapshot.version` | `Bun.HeapSnapshot.version: number;` | — | yes | 0 | 1 | 2 | `bun.d.ts:4812` |
| 1 | property | `Bun.HTMLBundle.files` | `Bun.HTMLBundle.files?: Array<{` | — | — | 0 | 1 | Array of generated output files with metadata. This only exists when built ahead of time with `Bun.build` or `bun build` | `bun.d.ts:5800` |
| 1 | property | `Bun.HTMLBundle.index` | `Bun.HTMLBundle.index: string;` | — | — | 0 | 1 | — | `bun.d.ts:5797` |
| 1 | method | `Bun.Image.avif` | `Bun.Image.avif(options?: { quality?: number }): this;` | — | — | 0 | 1 | Set output format to AVIF. Requires an OS AV1 encoder (macOS on Apple | `bun.d.ts:8444` |
| 1 | method | `Bun.Image.blob` | `Bun.Image.blob(): Promise<Blob>;` | — | — | 0 | 1 | Run the pipeline and return a `Blob` with the matching `type`. | `bun.d.ts:8485` |
| 1 | method | `Bun.Image.buffer` | `Bun.Image.buffer(): Promise<Buffer>;` | — | — | 0 | 1 | Like {@link bytes} but as a Node `Buffer`. | `bun.d.ts:8452` |
| 1 | method | `Bun.Image.bytes` | `Bun.Image.bytes(): Promise<Uint8Array>;` | — | — | 0 | 1 | Run the pipeline and return the encoded bytes. If no format setter was | `bun.d.ts:8450` |
| 1 | method | `Bun.Image.clipboardChangeCount` | `Bun.Image.clipboardChangeCount(): number;` | — | — | 0 | 1 | Monotone counter that increments on every system-wide clipboard write. | `bun.d.ts:8398` |
| 1 | interface | `Bun.Image.ConstructorOptions` | `Bun.Image.ConstructorOptions` | — | — | 0 | 1 | — | `bun.d.ts:8296` |
| 1 | method | `Bun.Image.dataurl` | `Bun.Image.dataurl(): Promise<string>;` | — | — | 0 | 1 | Like {@link toBase64} with a `data:image/{format};base64,` prefix. | `bun.d.ts:8470` |
| 1 | type | `Bun.Image.ErrorCode` | `Bun.Image.ErrorCode` | — | — | 0 | 1 | Stable `error.code` values set on rejections from `Bun.Image` terminals. | `bun.d.ts:8269` |
| 1 | type | `Bun.Image.Filter` | `Bun.Image.Filter` | — | — | 0 | 1 | — | `bun.d.ts:8284` |
| 1 | method | `Bun.Image.flip` | `Bun.Image.flip(): this;` | — | — | 0 | 1 | Mirror about the x-axis (vertical). | `bun.d.ts:8407` |
| 1 | method | `Bun.Image.flop` | `Bun.Image.flop(): this;` | — | — | 0 | 1 | Mirror about the y-axis (horizontal). | `bun.d.ts:8409` |
| 1 | type | `Bun.Image.Format` | `Bun.Image.Format` | — | — | 0 | 1 | `bmp`/`tiff`/`gif` are decode-only — `metadata().format` may report them | `bun.d.ts:8283` |
| 1 | method | `Bun.Image.fromClipboard` | `Bun.Image.fromClipboard(): Image \| null;` | — | — | 0 | 1 | Read an image from the system clipboard. | `bun.d.ts:8390` |
| 1 | method | `Bun.Image.hasClipboardImage` | `Bun.Image.hasClipboardImage(): boolean;` | — | — | 0 | 1 | Cheap probe — true if {@link fromClipboard} would return non-null. | `bun.d.ts:8392` |
| 1 | method | `Bun.Image.heic` | `Bun.Image.heic(options?: { quality?: number }): this;` | — | — | 0 | 1 | Set output format to HEIC. macOS / Windows-with-HEIF-Extension only — | `bun.d.ts:8438` |
| 1 | property | `Bun.Image.height` | `Bun.Image.height: number;` | — | — | 0 | 1 | — | `bun.d.ts:8493` |
| 1 | method | `Bun.Image.jpeg` | `Bun.Image.jpeg(options?: { /** 1–100, default 80. */ quality?: number; /** Emit a progressive (multi-scan) JPEG. Default `false`. */ progressive?: boolean; }): ` | — | — | 0 | 1 | Set output format to JPEG. | `bun.d.ts:8414` |
| 1 | method | `Bun.Image.metadata` | `Bun.Image.metadata(): Promise<Image.Metadata>;` | — | — | 8 | 1 | Decode just enough to read width/height/format. | `bun.d.ts:8489` |
| 1 | interface | `Bun.Image.Metadata` | `Bun.Image.Metadata` | — | — | 0 | 1 | — | `bun.d.ts:8331` |
| 1 | method | `Bun.Image.modulate` | `Bun.Image.modulate(options: Image.ModulateOptions): this;` | — | — | 0 | 1 | Adjust brightness/saturation. | `bun.d.ts:8411` |
| 1 | interface | `Bun.Image.ModulateOptions` | `Bun.Image.ModulateOptions` | — | — | 0 | 1 | — | `bun.d.ts:8324` |
| 1 | method | `Bun.Image.placeholder` | `Bun.Image.placeholder(as?: "dataurl"): Promise<string>;` | — | — | 0 | 1 | A [ThumbHash](https://github.com/evanw/thumbhash)-rendered low-quality | `bun.d.ts:8483` |
| 1 | method | `Bun.Image.png` | `Bun.Image.png(options?: { /** zlib level 0–9. */ compressionLevel?: number; /** Quantize to a palette and emit indexed (colour-type 3) PNG. */ palette?: boolean` | — | — | 0 | 1 | Set output format to PNG. | `bun.d.ts:8421` |
| 1 | method | `Bun.Image.resize` | `Bun.Image.resize(width: number, height?: number, options?: Image.ResizeOptions): this;` | — | — | 0 | 1 | Set target dimensions. Omit `height` to keep the source aspect ratio. | `bun.d.ts:8403` |
| 1 | interface | `Bun.Image.ResizeOptions` | `Bun.Image.ResizeOptions` | — | — | 0 | 1 | — | `bun.d.ts:8311` |
| 1 | method | `Bun.Image.rotate` | `Bun.Image.rotate(degrees: number): this;` | — | — | 0 | 1 | Rotate by a multiple of 90°. | `bun.d.ts:8405` |
| 1 | method | `Bun.Image.toBase64` | `Bun.Image.toBase64(): Promise<string>;` | — | — | 0 | 1 | Run the pipeline and return base64-encoded output. | `bun.d.ts:8487` |
| 1 | method | `Bun.Image.toBuffer` | `Bun.Image.toBuffer(): Promise<Buffer>;` | — | — | 0 | 1 | Sharp-compatible alias for {@link buffer}. | `bun.d.ts:8454` |
| 1 | method | `Bun.Image.webp` | `Bun.Image.webp(options?: { quality?: number; lossless?: boolean }): this;` | — | — | 0 | 1 | Set output format to WebP. | `bun.d.ts:8432` |
| 1 | property | `Bun.Image.width` | `Bun.Image.width: number;` | — | — | 0 | 1 | Populated after the first awaited terminal; `-1` before. | `bun.d.ts:8492` |
| 1 | method | `Bun.Image.write` | `Bun.Image.write(dest: BunFile \| S3File \| Bun.PathLike \| number): Promise<number>;` | — | yes | 0 | 1 | Run the pipeline and write the encoded result via {@link Bun.write} — | `bun.d.ts:8465` |
| 1 | property | `Bun.Import.kind` | `Bun.Import.kind: ImportKind;` | — | — | 0 | 1 | — | `bun.d.ts:2607` |
| 1 | property | `Bun.Import.path` | `Bun.Import.path: string;` | — | — | 0 | 1 | — | `bun.d.ts:2606` |
| 1 | const | `Bun.inspect.custom` | `Bun.inspect.custom: typeof import("util").inspect.custom;` | — | yes | 72 | 1 | That can be used to declare custom inspect functions. | `bun.d.ts:4525` |
| 1 | function | `Bun.inspect.table` | `Bun.inspect.table(tabularData: object \| unknown[], properties?: string[], options?: { colors?: boolean }): string;` | — | yes | 180 | 2 | Pretty-print an object or array as a table | `bun.d.ts:4532` |
| 1 | function | `Bun.JSON5.parse` | `Bun.JSON5.parse(input: string): unknown;` | — | — | 5 | 1 | Parse a JSON5 string into a JavaScript value. | `bun.d.ts:1513` |
| 1 | function | `Bun.JSON5.stringify` | `Bun.JSON5.stringify(input: unknown, replacer?: undefined \| null, space?: string \| number): string \| undefined;` | — | — | 0 | 1 | Convert a JavaScript value into a JSON5 string. Object keys that are | `bun.d.ts:1543` |
| 1 | function | `Bun.JSONC.parse` | `Bun.JSONC.parse(input: string): unknown;` | — | — | 9 | 1 | Parse a JSONC (JSON with Comments) string into a JavaScript value. | `bun.d.ts:820` |
| 1 | function | `Bun.JSONL.parse` | `Bun.JSONL.parse(input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike): unknown[];` | — | — | 6 | 1 | Parse a JSONL (JSON Lines) string into an array of JavaScript values. | `bun.d.ts:878` |
| 1 | function | `Bun.JSONL.parseChunk` | `Bun.JSONL.parseChunk( input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike, start?: number, end?: number, ): ParseChunkResult;` | — | — | 0 | 1 | Parse a JSONL chunk, designed for streaming use. | `bun.d.ts:912` |
| 1 | interface | `Bun.JSONL.ParseChunkResult` | `Bun.JSONL.ParseChunkResult` | — | — | 0 | 1 | The result of `Bun.JSONL.parseChunk`. | `bun.d.ts:832` |
| 1 | property | `Bun.LibdeflateCompressionOptions.level` | `Bun.LibdeflateCompressionOptions.level?: 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12;` | — | — | 0 | 1 | — | `bun.d.ts:5295` |
| 1 | property | `Bun.LibdeflateCompressionOptions.library` | `Bun.LibdeflateCompressionOptions.library?: "libdeflate";` | — | — | 0 | 1 | — | `bun.d.ts:5296` |
| 1 | function | `Bun.markdown.ansi` | `Bun.markdown.ansi( input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike, theme?: AnsiTheme, ): string;` | — | — | 73 | 1 | Render markdown to an ANSI-colored terminal string. | `bun.d.ts:1385` |
| 1 | interface | `Bun.markdown.AnsiTheme` | `Bun.markdown.AnsiTheme` | — | — | 0 | 1 | Theme for ANSI terminal rendering. | `bun.d.ts:1317` |
| 1 | interface | `Bun.markdown.CellMeta` | `Bun.markdown.CellMeta` | — | — | 0 | 1 | Meta passed to `th` and `td` callbacks. | `bun.d.ts:1216` |
| 1 | interface | `Bun.markdown.CellProps` | `Bun.markdown.CellProps` | — | — | 0 | 1 | — | `bun.d.ts:1105` |
| 1 | interface | `Bun.markdown.ChildrenProps` | `Bun.markdown.ChildrenProps` | — | — | 0 | 1 | — | `bun.d.ts:1086` |
| 1 | interface | `Bun.markdown.CodeBlockMeta` | `Bun.markdown.CodeBlockMeta` | — | — | 0 | 1 | Meta passed to the `code` callback. | `bun.d.ts:1186` |
| 1 | interface | `Bun.markdown.CodeBlockProps` | `Bun.markdown.CodeBlockProps` | — | — | 0 | 1 | — | `bun.d.ts:1101` |
| 1 | type | `Bun.markdown.Component` | `Bun.markdown.Component` | — | — | 0 | 1 | A component that accepts props `P`: a function, class, or HTML tag name. | `bun.d.ts:1084` |
| 1 | interface | `Bun.markdown.ComponentOverrides` | `Bun.markdown.ComponentOverrides` | — | — | 0 | 1 | Component overrides for `react()`. | `bun.d.ts:1138` |
| 1 | interface | `Bun.markdown.HeadingMeta` | `Bun.markdown.HeadingMeta` | — | — | 0 | 1 | Meta passed to the `heading` callback. | `bun.d.ts:1178` |
| 1 | interface | `Bun.markdown.HeadingProps` | `Bun.markdown.HeadingProps` | — | — | 0 | 1 | — | `bun.d.ts:1089` |
| 1 | function | `Bun.markdown.html` | `Bun.markdown.html( input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike, options?: Options, ): string;` | — | — | 40 | 1 | Render markdown to an HTML string. | `bun.d.ts:1309` |
| 1 | interface | `Bun.markdown.ImageMeta` | `Bun.markdown.ImageMeta` | — | — | 0 | 1 | Meta passed to the `image` callback. | `bun.d.ts:1230` |
| 1 | interface | `Bun.markdown.ImageProps` | `Bun.markdown.ImageProps` | — | — | 0 | 1 | — | `bun.d.ts:1115` |
| 1 | interface | `Bun.markdown.LinkMeta` | `Bun.markdown.LinkMeta` | — | — | 0 | 1 | Meta passed to the `link` callback. | `bun.d.ts:1222` |
| 1 | interface | `Bun.markdown.LinkProps` | `Bun.markdown.LinkProps` | — | — | 0 | 1 | — | `bun.d.ts:1109` |
| 1 | interface | `Bun.markdown.ListItemMeta` | `Bun.markdown.ListItemMeta` | — | — | 0 | 1 | Meta passed to the `listItem` callback. | `bun.d.ts:1202` |
| 1 | interface | `Bun.markdown.ListItemProps` | `Bun.markdown.ListItemProps` | — | — | 0 | 1 | — | `bun.d.ts:1097` |
| 1 | interface | `Bun.markdown.ListMeta` | `Bun.markdown.ListMeta` | — | — | 0 | 1 | Meta passed to the `list` callback. | `bun.d.ts:1192` |
| 1 | interface | `Bun.markdown.Options` | `Bun.markdown.Options` | — | — | 0 | 1 | Options for configuring the markdown parser. | `bun.d.ts:1025` |
| 1 | interface | `Bun.markdown.OrderedListProps` | `Bun.markdown.OrderedListProps` | — | — | 0 | 1 | — | `bun.d.ts:1093` |
| 1 | function | `Bun.markdown.react` | `Bun.markdown.react( input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike, components?: ComponentOverrides, options?: ReactOptions, ): imp` | — | — | 55 | 1 | Render markdown to React JSX elements. | `bun.d.ts:1476` |
| 1 | interface | `Bun.markdown.ReactOptions` | `Bun.markdown.ReactOptions` | — | — | 0 | 1 | Options for `react()` — parser options and element symbol configuration. | `bun.d.ts:1283` |
| 1 | function | `Bun.markdown.render` | `Bun.markdown.render( input: string \| NodeJS.TypedArray \| DataView<ArrayBuffer> \| ArrayBufferLike, callbacks?: RenderCallbacks, options?: Options, ): string;` | — | — | 35 | 1 | Render markdown with custom JavaScript callbacks for each element. | `bun.d.ts:1427` |
| 1 | interface | `Bun.markdown.RenderCallbacks` | `Bun.markdown.RenderCallbacks` | — | — | 0 | 1 | — | `bun.d.ts:1237` |
| 1 | property | `Bun.MatchedRoute.filePath` | `Bun.MatchedRoute.filePath: string;` | — | — | 0 | 1 | — | `bun.d.ts:8084` |
| 1 | property | `Bun.MatchedRoute.kind` | `Bun.MatchedRoute.kind: "exact" \| "catch-all" \| "optional-catch-all" \| "dynamic";` | — | — | 0 | 1 | — | `bun.d.ts:8088` |
| 1 | property | `Bun.MatchedRoute.name` | `Bun.MatchedRoute.name: string;` | — | — | 0 | 1 | — | `bun.d.ts:8087` |
| 1 | property | `Bun.MatchedRoute.params` | `Bun.MatchedRoute.params: Record<string, string>;` | — | — | 0 | 1 | A map of the parameters from the route | `bun.d.ts:8083` |
| 1 | property | `Bun.MatchedRoute.pathname` | `Bun.MatchedRoute.pathname: string;` | — | — | 0 | 1 | — | `bun.d.ts:8085` |
| 1 | property | `Bun.MatchedRoute.query` | `Bun.MatchedRoute.query: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:8086` |
| 1 | property | `Bun.MatchedRoute.src` | `Bun.MatchedRoute.src: string;` | — | — | 0 | 1 | — | `bun.d.ts:8089` |
| 1 | property | `Bun.MessageEventInit.data` | `Bun.MessageEventInit.data?: T;` | — | — | 0 | 1 | — | `bun.d.ts:116` |
| 1 | property | `Bun.MessageEventInit.lastEventId` | `Bun.MessageEventInit.lastEventId?: string;` | — | — | 0 | 1 | — | `bun.d.ts:117` |
| 1 | property | `Bun.MessageEventInit.origin` | `Bun.MessageEventInit.origin?: string;` | — | — | 0 | 1 | — | `bun.d.ts:118` |
| 1 | property | `Bun.MessageEventInit.source` | `Bun.MessageEventInit.source?: Bun.MessageEventSource \| null;` | — | — | 0 | 1 | — | `bun.d.ts:119` |
| 1 | property | `Bun.MMapOptions.shared` | `Bun.MMapOptions.shared?: boolean;` | true | — | 0 | 1 | Allow other processes to see results instantly? | `bun.d.ts:4546` |
| 1 | property | `Bun.MMapOptions.sync` | `Bun.MMapOptions.sync?: boolean;` | — | — | 0 | 1 | Sets MAP_SYNC flag on Linux. Ignored on macOS due to lack of support. | `bun.d.ts:4540` |
| 1 | method | `Bun.NetworkSink.end` | `Bun.NetworkSink.end(error?: Error): number \| Promise<number>;` | — | — | 0 | 1 | Finish the upload. This also flushes the internal buffer. | `s3.d.ts:96` |
| 1 | method | `Bun.NetworkSink.flush` | `Bun.NetworkSink.flush(): number \| Promise<number>;` | — | — | 0 | 1 | Flush the internal buffer, committing the data to the network. | `s3.d.ts:89` |
| 1 | method | `Bun.NetworkSink.stat` | `Bun.NetworkSink.stat(): Promise<import("node:fs").Stats>;` | — | — | 0 | 1 | Get the stat of the file. | `s3.d.ts:103` |
| 1 | method | `Bun.NetworkSink.write` | `Bun.NetworkSink.write(chunk: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer): number \| Promise<number>;` | — | yes | 0 | 1 | Write a chunk of data to the network. | `s3.d.ts:83` |
| 1 | property | `Bun.OnBeforeParseCallback.external` | `Bun.OnBeforeParseCallback.external?: unknown \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:5512` |
| 1 | property | `Bun.OnBeforeParseCallback.napiModule` | `Bun.OnBeforeParseCallback.napiModule: unknown;` | — | — | 0 | 1 | — | `bun.d.ts:5510` |
| 1 | property | `Bun.OnLoadArgs.defer` | `Bun.OnLoadArgs.defer: ()` | — | — | 0 | 1 | Defer the execution of this callback until all other modules have been parsed. | `bun.d.ts:5502` |
| 1 | property | `Bun.OnLoadArgs.loader` | `Bun.OnLoadArgs.loader: Loader;` | — | — | 0 | 1 | The default loader for this file extension | `bun.d.ts:5496` |
| 1 | property | `Bun.OnLoadArgs.path` | `Bun.OnLoadArgs.path: string;` | — | — | 0 | 1 | The resolved import specifier of the module being loaded | `bun.d.ts:5488` |
| 1 | property | `Bun.OnLoadResultObject.exports` | `Bun.OnLoadResultObject.exports: Record<string, unknown>;` | — | — | 0 | 1 | The object to use as the module | `bun.d.ts:5470` |
| 1 | property | `Bun.OnLoadResultObject.loader` | `Bun.OnLoadResultObject.loader: "object";` | — | — | 0 | 1 | The loader to use for this file | `bun.d.ts:5474` |
| 1 | property | `Bun.OnLoadResultSourceCode.contents` | `Bun.OnLoadResultSourceCode.contents: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer;` | — | — | 0 | 1 | The source code of the module | `bun.d.ts:5446` |
| 1 | property | `Bun.OnLoadResultSourceCode.loader` | `Bun.OnLoadResultSourceCode.loader?: Loader;` | — | — | 0 | 1 | The loader to use for this file | `bun.d.ts:5452` |
| 1 | property | `Bun.OnResolveArgs.importer` | `Bun.OnResolveArgs.importer: string;` | — | — | 0 | 1 | The module that imported the module being resolved | `bun.d.ts:5523` |
| 1 | property | `Bun.OnResolveArgs.kind` | `Bun.OnResolveArgs.kind: ImportKind;` | — | — | 0 | 1 | The kind of import this resolve is for. | `bun.d.ts:5535` |
| 1 | property | `Bun.OnResolveArgs.path` | `Bun.OnResolveArgs.path: string;` | — | — | 0 | 1 | The import specifier of the module being loaded | `bun.d.ts:5519` |
| 1 | property | `Bun.OnResolveArgs.resolveDir` | `Bun.OnResolveArgs.resolveDir: string;` | — | — | 0 | 1 | The directory to perform file-based resolutions in. | `bun.d.ts:5531` |
| 1 | property | `Bun.OnResolveResult.external` | `Bun.OnResolveResult.external?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:5554` |
| 1 | property | `Bun.OnResolveResult.path` | `Bun.OnResolveResult.path: string;` | — | — | 0 | 1 | The destination of the import | `bun.d.ts:5544` |
| 1 | type | `Bun.Password.AlgorithmLabel` | `Bun.Password.AlgorithmLabel` | — | — | 0 | 1 | — | `bun.d.ts:3153` |
| 1 | interface | `Bun.Password.Argon2Algorithm` | `Bun.Password.Argon2Algorithm` | — | — | 0 | 1 | — | `bun.d.ts:3130` |
| 1 | interface | `Bun.Password.BCryptAlgorithm` | `Bun.Password.BCryptAlgorithm` | — | — | 0 | 1 | — | `bun.d.ts:3144` |
| 1 | function | `Bun.peek.status` | `Bun.peek.status(promise: T \| Promise<T>): "pending" \| "fulfilled" \| "rejected";` | — | — | 6 | 1 | — | `bun.d.ts:1889` |
| 1 | property | `Bun.PluginBuilder.config` | `Bun.PluginBuilder.config: BuildConfig & { plugins: BunPlugin[] };` | — | — | 0 | 1 | The config object passed to `Bun.build` as is. Can be mutated. | `bun.d.ts:5650` |
| 1 | method | `Bun.PluginBuilder.onBeforeParse` | `Bun.PluginBuilder.onBeforeParse(constraints: PluginConstraints, callback: OnBeforeParseCallback): this;` | — | — | 0 | 1 | — | `bun.d.ts:5610` |
| 1 | method | `Bun.PluginBuilder.onEnd` | `Bun.PluginBuilder.onEnd(callback: OnEndCallback): this;` | — | — | 0 | 1 | Register a callback which will be invoked when bundling ends. This is | `bun.d.ts:5609` |
| 1 | method | `Bun.PluginBuilder.onLoad` | `Bun.PluginBuilder.onLoad(constraints: PluginConstraints, callback: OnLoadCallback): this;` | — | — | 0 | 1 | Register a callback to load imports with a specific import specifier | `bun.d.ts:5628` |
| 1 | method | `Bun.PluginBuilder.onResolve` | `Bun.PluginBuilder.onResolve(constraints: PluginConstraints, callback: OnResolveCallback): this;` | — | — | 0 | 1 | Register a callback to resolve imports matching a filter and/or namespace | `bun.d.ts:5646` |
| 1 | method | `Bun.PluginBuilder.onStart` | `Bun.PluginBuilder.onStart(callback: OnStartCallback): this;` | — | — | 0 | 1 | Register a callback which will be invoked when bundling starts. When | `bun.d.ts:5590` |
| 1 | property | `Bun.PluginConstraints.filter` | `Bun.PluginConstraints.filter: RegExp;` | — | — | 0 | 1 | Only apply the plugin when the import specifier matches this regular expression | `bun.d.ts:5427` |
| 1 | property | `Bun.ReadableStreamDefaultReadManyResult.done` | `Bun.ReadableStreamDefaultReadManyResult.done: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:152` |
| 1 | property | `Bun.ReadableStreamDefaultReadManyResult.size` | `Bun.ReadableStreamDefaultReadManyResult.size: number;` | — | — | 0 | 1 | Number of bytes | `bun.d.ts:154` |
| 1 | property | `Bun.ReadableStreamDefaultReadManyResult.value` | `Bun.ReadableStreamDefaultReadManyResult.value: T[];` | — | — | 0 | 1 | — | `bun.d.ts:155` |
| 1 | method | `Bun.RedisClient.append` | `Bun.RedisClient.append(key: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Append a value to a key | `redis.d.ts:1790` |
| 1 | method | `Bun.RedisClient.bitcount` | `Bun.RedisClient.bitcount(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Count the number of set bits (population counting) in a string | `redis.d.ts:2553` |
| 1 | method | `Bun.RedisClient.blmove` | `Bun.RedisClient.blmove( source: RedisClient.KeyLike, destination: RedisClient.KeyLike, from: "LEFT" \| "RIGHT", to: "LEFT" \| "RIGHT", timeout: number, ): Promise` | — | — | 0 | 1 | Blocking move from one list to another | `redis.d.ts:992` |
| 1 | method | `Bun.RedisClient.blmpop` | `Bun.RedisClient.blmpop(timeout: number, numkeys: number, ...args: (string \| number)[]): Promise<[string, string[]] \| null>;` | — | — | 0 | 1 | Blocking pop multiple elements from lists | `redis.d.ts:1025` |
| 1 | method | `Bun.RedisClient.blpop` | `Bun.RedisClient.blpop(...args: (RedisClient.KeyLike \| number)[]): Promise<[string, string] \| null>;` | — | — | 0 | 1 | Blocking pop from head of one or more lists | `redis.d.ts:941` |
| 1 | method | `Bun.RedisClient.brpop` | `Bun.RedisClient.brpop(...args: (RedisClient.KeyLike \| number)[]): Promise<[string, string] \| null>;` | — | — | 0 | 1 | Blocking pop from tail of one or more lists | `redis.d.ts:965` |
| 1 | method | `Bun.RedisClient.brpoplpush` | `Bun.RedisClient.brpoplpush(source: RedisClient.KeyLike, destination: RedisClient.KeyLike, timeout: number): Promise<string \| null>;` | — | — | 0 | 1 | Blocking right pop from source and left push to destination | `redis.d.ts:1052` |
| 1 | property | `Bun.RedisClient.bufferedAmount` | `Bun.RedisClient.bufferedAmount: number;` | — | — | 0 | 1 | Amount of data buffered in bytes | `redis.d.ts:79` |
| 1 | property | `Bun.RedisClient.byscore` | `Bun.RedisClient.byscore: "BYSCORE",` | — | — | 0 | 1 | — | `redis.d.ts:1662` |
| 1 | method | `Bun.RedisClient.bzmpop` | `Bun.RedisClient.bzmpop( timeout: number, numkeys: number, ...args: (string \| number)[] ): Promise<[string, [string, number][]] \| null>;` | — | — | 0 | 1 | Blocking version of ZMPOP. Blocks until a member is available or timeout expires. | `redis.d.ts:3335` |
| 1 | method | `Bun.RedisClient.bzpopmax` | `Bun.RedisClient.bzpopmax(...args: (RedisClient.KeyLike \| number)[]): Promise<[string, string, number] \| null>;` | — | — | 0 | 1 | Remove and return the member with the highest score from one or more sorted sets, or block until one is available | `redis.d.ts:1592` |
| 1 | method | `Bun.RedisClient.bzpopmin` | `Bun.RedisClient.bzpopmin(...args: (RedisClient.KeyLike \| number)[]): Promise<[string, string, number] \| null>;` | — | — | 0 | 1 | Remove and return the member with the lowest score from one or more sorted sets, or block until one is available | `redis.d.ts:1576` |
| 1 | method | `Bun.RedisClient.close` | `Bun.RedisClient.close(): void;` | — | — | 0 | 1 | Disconnect from the Redis server | `redis.d.ts:103` |
| 1 | property | `Bun.RedisClient.condition` | `Bun.RedisClient.condition: "NX" \| "XX" \| "GT" \| "LT",` | — | — | 0 | 4 | — | `redis.d.ts:443` |
| 1 | method | `Bun.RedisClient.connect` | `Bun.RedisClient.connect(): Promise<void>;` | — | — | 0 | 1 | Connect to the Redis server | `redis.d.ts:98` |
| 1 | property | `Bun.RedisClient.connected` | `Bun.RedisClient.connected: boolean;` | — | — | 0 | 1 | Whether the client is connected to the Redis server | `redis.d.ts:74` |
| 1 | method | `Bun.RedisClient.copy` | `Bun.RedisClient.copy(source: RedisClient.KeyLike, destination: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 2 | Copy the value stored at the source key to the destination key | `redis.d.ts:2839` |
| 1 | property | `Bun.RedisClient.count` | `Bun.RedisClient.count: "COUNT",` | — | — | 0 | 7 | — | `redis.d.ts:719` |
| 1 | property | `Bun.RedisClient.cursor` | `Bun.RedisClient.cursor: number \| string,` | — | — | 0 | 4 | — | `redis.d.ts:703` |
| 1 | method | `Bun.RedisClient.decr` | `Bun.RedisClient.decr(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Decrement the integer value of a key by one | `redis.d.ts:262` |
| 1 | method | `Bun.RedisClient.decrby` | `Bun.RedisClient.decrby(key: RedisClient.KeyLike, decrement: number): Promise<number>;` | — | — | 0 | 1 | Decrement the integer value of a key by the given amount | `redis.d.ts:270` |
| 1 | method | `Bun.RedisClient.del` | `Bun.RedisClient.del(...keys: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Delete a key(s) | `redis.d.ts:232` |
| 1 | property | `Bun.RedisClient.destination` | `Bun.RedisClient.destination: RedisClient.KeyLike,` | — | — | 0 | 6 | — | `redis.d.ts:831` |
| 1 | method | `Bun.RedisClient.dump` | `Bun.RedisClient.dump(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 1 | Return a serialized version of the value stored at the specified key | `redis.d.ts:2607` |
| 1 | method | `Bun.RedisClient.duplicate` | `Bun.RedisClient.duplicate(): Promise<RedisClient>;` | — | — | 0 | 1 | the current instance. | `redis.d.ts:2819` |
| 1 | property | `Bun.RedisClient.element` | `Bun.RedisClient.element: RedisClient.KeyLike,` | — | — | 0 | 2 | — | `redis.d.ts:1151` |
| 1 | method | `Bun.RedisClient.exists` | `Bun.RedisClient.exists(key: RedisClient.KeyLike): Promise<boolean>;` | — | — | 0 | 1 | Determine if a key exists | `redis.d.ts:278` |
| 1 | method | `Bun.RedisClient.expire` | `Bun.RedisClient.expire(key: RedisClient.KeyLike, seconds: number): Promise<number>;` | — | — | 0 | 1 | Set a key's time to live in seconds | `redis.d.ts:286` |
| 1 | method | `Bun.RedisClient.expireat` | `Bun.RedisClient.expireat(key: RedisClient.KeyLike, timestamp: number): Promise<number>;` | — | — | 0 | 1 | Set the expiration for a key as a Unix timestamp (in seconds) | `redis.d.ts:294` |
| 1 | method | `Bun.RedisClient.expiretime` | `Bun.RedisClient.expiretime(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the expiration time of a key as a UNIX timestamp in seconds | `redis.d.ts:2616` |
| 1 | property | `Bun.RedisClient.field` | `Bun.RedisClient.field: RedisClient.KeyLike,` | — | — | 0 | 2 | — | `redis.d.ts:330` |
| 1 | property | `Bun.RedisClient.fieldsKeyword` | `Bun.RedisClient.fieldsKeyword: "FIELDS",` | — | — | 0 | 14 | — | `redis.d.ts:356` |
| 1 | method | `Bun.RedisClient.getbit` | `Bun.RedisClient.getbit(key: RedisClient.KeyLike, offset: number): Promise<number>;` | — | — | 0 | 1 | Returns the bit value at offset in the string value stored at key | `redis.d.ts:2561` |
| 1 | method | `Bun.RedisClient.getBuffer` | `Bun.RedisClient.getBuffer(key: RedisClient.KeyLike): Promise<Uint8Array<ArrayBuffer> \| null>;` | — | — | 0 | 1 | Get the value of a key as a Uint8Array | `redis.d.ts:125` |
| 1 | method | `Bun.RedisClient.getdel` | `Bun.RedisClient.getdel(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 1 | Get the value of a key and delete the key | `redis.d.ts:2625` |
| 1 | method | `Bun.RedisClient.getex` | `Bun.RedisClient.getex(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 6 | Get the value of a key and optionally set its expiration | `redis.d.ts:2634` |
| 1 | method | `Bun.RedisClient.getrange` | `Bun.RedisClient.getrange(key: RedisClient.KeyLike, start: number, end: number): Promise<string>;` | — | — | 0 | 1 | Get a substring of the string stored at a key | `redis.d.ts:2579` |
| 1 | method | `Bun.RedisClient.getset` | `Bun.RedisClient.getset(key: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 1 | Set the value of a key and return its old value | `redis.d.ts:1799` |
| 1 | method | `Bun.RedisClient.hdel` | `Bun.RedisClient.hdel(key: RedisClient.KeyLike, field: RedisClient.KeyLike, ...rest: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Delete one or more hash fields | `redis.d.ts:651` |
| 1 | method | `Bun.RedisClient.hexists` | `Bun.RedisClient.hexists(key: RedisClient.KeyLike, field: RedisClient.KeyLike): Promise<boolean>;` | — | — | 0 | 1 | Determine if a hash field exists | `redis.d.ts:659` |
| 1 | method | `Bun.RedisClient.hexpire` | `Bun.RedisClient.hexpire( key: RedisClient.KeyLike, seconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<numb` | — | — | 0 | 2 | Set expiration for hash fields (Redis 7.4+) | `redis.d.ts:433` |
| 1 | method | `Bun.RedisClient.hexpireat` | `Bun.RedisClient.hexpireat( key: RedisClient.KeyLike, unixTimeSeconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Pr` | — | — | 0 | 2 | Set expiration for hash fields using Unix timestamp in seconds (Redis 7.4+) | `redis.d.ts:455` |
| 1 | method | `Bun.RedisClient.hexpiretime` | `Bun.RedisClient.hexpiretime( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Get expiration time of hash fields as Unix timestamp in seconds (Redis 7.4+) | `redis.d.ts:477` |
| 1 | method | `Bun.RedisClient.hget` | `Bun.RedisClient.hget(key: RedisClient.KeyLike, field: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 1 | Get the value of a hash field | `redis.d.ts:626` |
| 1 | method | `Bun.RedisClient.hgetall` | `Bun.RedisClient.hgetall(key: RedisClient.KeyLike): Promise<Record<string, string>>;` | — | — | 0 | 1 | Get all the fields and values in a hash | `redis.d.ts:881` |
| 1 | method | `Bun.RedisClient.hgetdel` | `Bun.RedisClient.hgetdel( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<Array<string \| null>>` | — | — | 0 | 1 | Get and delete one or more hash fields (Redis 8.0.0+) | `redis.d.ts:354` |
| 1 | method | `Bun.RedisClient.hgetex` | `Bun.RedisClient.hgetex(key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[]): Promise<Array<string \| null>>;` | — | — | 0 | 6 | — | `redis.d.ts:370` |
| 1 | method | `Bun.RedisClient.hincrby` | `Bun.RedisClient.hincrby(key: RedisClient.KeyLike, field: string, increment: string \| number): Promise<number>;` | — | — | 0 | 1 | Increment the integer value of a hash field by the given number | `redis.d.ts:865` |
| 1 | method | `Bun.RedisClient.hincrbyfloat` | `Bun.RedisClient.hincrbyfloat(key: RedisClient.KeyLike, field: string, increment: string \| number): Promise<string>;` | — | — | 0 | 1 | Increment the float value of a hash field by the given amount | `redis.d.ts:874` |
| 1 | property | `Bun.RedisClient.hint` | `Bun.RedisClient.hint: number,` | — | — | 0 | 1 | — | `redis.d.ts:1383` |
| 1 | method | `Bun.RedisClient.hkeys` | `Bun.RedisClient.hkeys(key: RedisClient.KeyLike): Promise<string[]>;` | — | — | 0 | 1 | Get all field names in a hash | `redis.d.ts:888` |
| 1 | method | `Bun.RedisClient.hlen` | `Bun.RedisClient.hlen(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the number of fields in a hash | `redis.d.ts:895` |
| 1 | method | `Bun.RedisClient.hmget` | `Bun.RedisClient.hmget(key: RedisClient.KeyLike, ...fields: string[]): Promise<Array<string \| null>>;` | — | — | 0 | 2 | Get the values of all the given hash fields | `redis.d.ts:634` |
| 1 | method | `Bun.RedisClient.hmset` *(deprecated)* | `Bun.RedisClient.hmset(key: RedisClient.KeyLike, fields: Record<string \| number, RedisClient.KeyLike \| number>): Promise<"OK">;` | — | — | 0 | 3 | Set multiple hash fields to multiple values | `redis.d.ts:589` |
| 1 | method | `Bun.RedisClient.hpersist` | `Bun.RedisClient.hpersist( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Remove expiration from hash fields (Redis 7.4+) | `redis.d.ts:490` |
| 1 | method | `Bun.RedisClient.hpexpire` | `Bun.RedisClient.hpexpire( key: RedisClient.KeyLike, milliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promis` | — | — | 0 | 2 | Set expiration for hash fields in milliseconds (Redis 7.4+) | `redis.d.ts:503` |
| 1 | method | `Bun.RedisClient.hpexpireat` | `Bun.RedisClient.hpexpireat( key: RedisClient.KeyLike, unixTimeMilliseconds: number, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[]` | — | — | 0 | 2 | Set expiration for hash fields using Unix timestamp in milliseconds (Redis 7.4+) | `redis.d.ts:525` |
| 1 | method | `Bun.RedisClient.hpexpiretime` | `Bun.RedisClient.hpexpiretime( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Get expiration time of hash fields as Unix timestamp in milliseconds (Redis 7.4+) | `redis.d.ts:547` |
| 1 | method | `Bun.RedisClient.hpttl` | `Bun.RedisClient.hpttl( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Get TTL of hash fields in milliseconds (Redis 7.4+) | `redis.d.ts:560` |
| 1 | method | `Bun.RedisClient.hrandfield` | `Bun.RedisClient.hrandfield(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 3 | Get one or multiple random fields from a hash | `redis.d.ts:666` |
| 1 | method | `Bun.RedisClient.hscan` | `Bun.RedisClient.hscan(key: RedisClient.KeyLike, cursor: number \| string): Promise<[string, string[]]>;` | — | — | 0 | 4 | Incrementally iterate hash fields and values | `redis.d.ts:691` |
| 1 | method | `Bun.RedisClient.hset` | `Bun.RedisClient.hset(key: RedisClient.KeyLike, fields: Record<string \| number, RedisClient.KeyLike \| number>): Promise<number>;` | — | — | 0 | 2 | Set the value of a hash field or multiple fields | `redis.d.ts:318` |
| 1 | method | `Bun.RedisClient.hsetex` | `Bun.RedisClient.hsetex(key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fieldValues: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 18 | — | `redis.d.ts:390` |
| 1 | method | `Bun.RedisClient.hsetnx` | `Bun.RedisClient.hsetnx(key: RedisClient.KeyLike, field: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<boolean>;` | — | — | 0 | 1 | Set the value of a hash field, only if the field does not exist | `redis.d.ts:342` |
| 1 | method | `Bun.RedisClient.hstrlen` | `Bun.RedisClient.hstrlen(key: RedisClient.KeyLike, field: string): Promise<number>;` | — | — | 0 | 1 | Get the string length of the value stored in a hash field | `redis.d.ts:903` |
| 1 | method | `Bun.RedisClient.httl` | `Bun.RedisClient.httl( key: RedisClient.KeyLike, fieldsKeyword: "FIELDS", numfields: number, ...fields: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Get TTL of hash fields in seconds (Redis 7.4+) | `redis.d.ts:573` |
| 1 | method | `Bun.RedisClient.hvals` | `Bun.RedisClient.hvals(key: RedisClient.KeyLike): Promise<string[]>;` | — | — | 0 | 1 | Get all values in a hash | `redis.d.ts:910` |
| 1 | method | `Bun.RedisClient.incr` | `Bun.RedisClient.incr(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Increment the integer value of a key by one | `redis.d.ts:239` |
| 1 | method | `Bun.RedisClient.incrby` | `Bun.RedisClient.incrby(key: RedisClient.KeyLike, increment: number): Promise<number>;` | — | — | 0 | 1 | Increment the integer value of a key by the given amount | `redis.d.ts:247` |
| 1 | method | `Bun.RedisClient.incrbyfloat` | `Bun.RedisClient.incrbyfloat(key: RedisClient.KeyLike, increment: number \| string): Promise<string>;` | — | — | 0 | 1 | Increment the float value of a key by the given amount | `redis.d.ts:255` |
| 1 | property | `Bun.RedisClient.key` | `Bun.RedisClient.key: RedisClient.KeyLike,` | — | — | 0 | 41 | — | `redis.d.ts:172` |
| 1 | type | `Bun.RedisClient.KeyLike` | `Bun.RedisClient.KeyLike` | — | — | 0 | 1 | — | `redis.d.ts:47` |
| 1 | method | `Bun.RedisClient.keys` | `Bun.RedisClient.keys(pattern: string): Promise<string[]>;` | — | — | 0 | 1 | Find all keys matching the given pattern | `redis.d.ts:917` |
| 1 | property | `Bun.RedisClient.limit` | `Bun.RedisClient.limit: number,` | — | — | 0 | 6 | — | `redis.d.ts:720` |
| 1 | method | `Bun.RedisClient.lindex` | `Bun.RedisClient.lindex(key: RedisClient.KeyLike, index: number): Promise<string \| null>;` | — | — | 0 | 1 | Get element at index from a list | `redis.d.ts:1068` |
| 1 | method | `Bun.RedisClient.linsert` | `Bun.RedisClient.linsert( key: RedisClient.KeyLike, position: "BEFORE" \| "AFTER", pivot: RedisClient.KeyLike, element: RedisClient.KeyLike, ): Promise<number>;` | — | — | 0 | 1 | Insert an element before or after another element in a list | `redis.d.ts:1817` |
| 1 | method | `Bun.RedisClient.llen` | `Bun.RedisClient.llen(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the length of a list | `redis.d.ts:1075` |
| 1 | method | `Bun.RedisClient.lmove` | `Bun.RedisClient.lmove( source: RedisClient.KeyLike, destination: RedisClient.KeyLike, from: "LEFT" \| "RIGHT", to: "LEFT" \| "RIGHT", ): Promise<string \| null>;` | — | — | 0 | 1 | Atomically pop an element from a source list and push it to a destination list | `redis.d.ts:1099` |
| 1 | method | `Bun.RedisClient.lmpop` | `Bun.RedisClient.lmpop(numkeys: number, ...args: (string \| number)[]): Promise<[string, string[]] \| null>;` | — | — | 0 | 1 | Pop one or more elements from one or more lists | `redis.d.ts:1178` |
| 1 | method | `Bun.RedisClient.lpop` | `Bun.RedisClient.lpop(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 2 | Remove and get the first element in a list | `redis.d.ts:1111` |
| 1 | method | `Bun.RedisClient.lpos` | `Bun.RedisClient.lpos( key: RedisClient.KeyLike, element: RedisClient.KeyLike, ...options: (string \| number)[] ): Promise<number \| number[] \| null>;` | — | — | 0 | 1 | Find the position(s) of an element in a list | `redis.d.ts:1149` |
| 1 | method | `Bun.RedisClient.lpush` | `Bun.RedisClient.lpush(key: RedisClient.KeyLike, value: RedisClient.KeyLike, ...rest: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Prepend one or multiple values to a list | `redis.d.ts:1831` |
| 1 | method | `Bun.RedisClient.lpushx` | `Bun.RedisClient.lpushx(key: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Prepend a value to a list, only if the list exists | `redis.d.ts:1840` |
| 1 | method | `Bun.RedisClient.lrange` | `Bun.RedisClient.lrange(key: RedisClient.KeyLike, start: number, stop: number): Promise<string[]>;` | — | — | 0 | 1 | Get a range of elements from a list | `redis.d.ts:1195` |
| 1 | method | `Bun.RedisClient.lrem` | `Bun.RedisClient.lrem(key: RedisClient.KeyLike, count: number, element: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Remove elements from a list | `redis.d.ts:1859` |
| 1 | method | `Bun.RedisClient.lset` | `Bun.RedisClient.lset(key: RedisClient.KeyLike, index: number, element: RedisClient.KeyLike): Promise<string>;` | — | — | 0 | 1 | Set element at index in a list | `redis.d.ts:1213` |
| 1 | method | `Bun.RedisClient.ltrim` | `Bun.RedisClient.ltrim(key: RedisClient.KeyLike, start: number, stop: number): Promise<string>;` | — | — | 0 | 1 | Trim a list to the specified range | `redis.d.ts:1875` |
| 1 | property | `Bun.RedisClient.match` | `Bun.RedisClient.match: "MATCH",` | — | — | 0 | 3 | — | `redis.d.ts:704` |
| 1 | property | `Bun.RedisClient.max` | `Bun.RedisClient.max: string,` | — | — | 0 | 9 | — | `redis.d.ts:2159` |
| 1 | property | `Bun.RedisClient.member` | `Bun.RedisClient.member: RedisClient.KeyLike,` | — | — | 0 | 2 | — | `redis.d.ts:845` |
| 1 | method | `Bun.RedisClient.mget` | `Bun.RedisClient.mget(...keys: RedisClient.KeyLike[]): Promise<(string \| null)[]>;` | — | — | 0 | 1 | Get the values of all specified keys | `redis.d.ts:2497` |
| 1 | property | `Bun.RedisClient.milliseconds` | `Bun.RedisClient.milliseconds: number,` | — | — | 0 | 2 | — | `redis.d.ts:505` |
| 1 | property | `Bun.RedisClient.min` | `Bun.RedisClient.min: string,` | — | — | 0 | 9 | — | `redis.d.ts:2158` |
| 1 | method | `Bun.RedisClient.mset` | `Bun.RedisClient.mset(...keyValuePairs: RedisClient.KeyLike[]): Promise<"OK">;` | — | — | 0 | 1 | Set multiple keys to multiple values atomically | `redis.d.ts:2518` |
| 1 | method | `Bun.RedisClient.msetnx` | `Bun.RedisClient.msetnx(...keyValuePairs: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Set multiple keys to multiple values, only if none of the keys exist | `redis.d.ts:2546` |
| 1 | property | `Bun.RedisClient.numfields` | `Bun.RedisClient.numfields: number,` | — | — | 0 | 14 | — | `redis.d.ts:357` |
| 1 | property | `Bun.RedisClient.numkeys` | `Bun.RedisClient.numkeys: number,` | — | — | 0 | 5 | — | `redis.d.ts:1440` |
| 1 | property | `Bun.RedisClient.offset` | `Bun.RedisClient.offset: number,` | — | — | 0 | 4 | — | `redis.d.ts:2161` |
| 1 | property | `Bun.RedisClient.onclose` | `Bun.RedisClient.onclose: ((this: RedisClient, error: Error)` | — | — | 0 | 1 | Callback fired when the client disconnects from the Redis server | `redis.d.ts:91` |
| 1 | property | `Bun.RedisClient.onconnect` | `Bun.RedisClient.onconnect: ((this: RedisClient)` | — | — | 0 | 1 | Callback fired when the client connects to the Redis server | `redis.d.ts:84` |
| 1 | property | `Bun.RedisClient.pattern` | `Bun.RedisClient.pattern: string,` | — | — | 0 | 3 | — | `redis.d.ts:705` |
| 1 | method | `Bun.RedisClient.persist` | `Bun.RedisClient.persist(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Remove the expiration from a key | `redis.d.ts:1221` |
| 1 | method | `Bun.RedisClient.pexpire` | `Bun.RedisClient.pexpire(key: RedisClient.KeyLike, milliseconds: number): Promise<number>;` | — | — | 0 | 1 | Set a key's time to live in milliseconds | `redis.d.ts:302` |
| 1 | method | `Bun.RedisClient.pexpireat` | `Bun.RedisClient.pexpireat(key: RedisClient.KeyLike, millisecondsTimestamp: number): Promise<number>;` | — | — | 0 | 1 | Set the expiration for a key as a Unix timestamp in milliseconds | `redis.d.ts:1229` |
| 1 | method | `Bun.RedisClient.pexpiretime` | `Bun.RedisClient.pexpiretime(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the expiration time of a key as a UNIX timestamp in milliseconds | `redis.d.ts:1237` |
| 1 | method | `Bun.RedisClient.pfadd` | `Bun.RedisClient.pfadd(key: RedisClient.KeyLike, element: string): Promise<number>;` | — | — | 0 | 1 | Add one or more members to a HyperLogLog | `redis.d.ts:1884` |
| 1 | method | `Bun.RedisClient.ping` | `Bun.RedisClient.ping(): Promise<"PONG">;` | — | — | 0 | 2 | Ping the server | `redis.d.ts:2689` |
| 1 | property | `Bun.RedisClient.pivot` | `Bun.RedisClient.pivot: RedisClient.KeyLike,` | — | — | 0 | 1 | — | `redis.d.ts:1820` |
| 1 | property | `Bun.RedisClient.position` | `Bun.RedisClient.position: "BEFORE" \| "AFTER",` | — | — | 0 | 1 | — | `redis.d.ts:1819` |
| 1 | method | `Bun.RedisClient.psetex` | `Bun.RedisClient.psetex(key: RedisClient.KeyLike, milliseconds: number, value: RedisClient.KeyLike): Promise<"OK">;` | — | — | 0 | 1 | Set key to hold the string value with expiration time in milliseconds | `redis.d.ts:1941` |
| 1 | method | `Bun.RedisClient.pttl` | `Bun.RedisClient.pttl(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the time to live for a key in milliseconds | `redis.d.ts:1245` |
| 1 | method | `Bun.RedisClient.publish` | `Bun.RedisClient.publish(channel: string, message: string): Promise<number>;` | — | — | 0 | 1 | Publish a message to a Redis channel. | `redis.d.ts:2708` |
| 1 | property | `Bun.RedisClient.pxat` | `Bun.RedisClient.pxat: "PXAT",` | — | — | 0 | 1 | — | `redis.d.ts:174` |
| 1 | method | `Bun.RedisClient.randomkey` | `Bun.RedisClient.randomkey(): Promise<string \| null>;` | — | — | 0 | 1 | Return a random key from the keyspace | `redis.d.ts:1264` |
| 1 | method | `Bun.RedisClient.rename` | `Bun.RedisClient.rename(key: RedisClient.KeyLike, newkey: RedisClient.KeyLike): Promise<"OK">;` | — | — | 0 | 1 | Rename a key to a new key | `redis.d.ts:2924` |
| 1 | method | `Bun.RedisClient.renamenx` | `Bun.RedisClient.renamenx(key: RedisClient.KeyLike, newkey: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Rename a key to a new key only if the new key does not exist | `redis.d.ts:2944` |
| 1 | method | `Bun.RedisClient.rpop` | `Bun.RedisClient.rpop(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 2 | Remove and get the last element in a list | `redis.d.ts:1271` |
| 1 | method | `Bun.RedisClient.rpoplpush` | `Bun.RedisClient.rpoplpush(source: RedisClient.KeyLike, destination: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 1 | Atomically pop the last element from a source list and push it to the head of a destination list | `redis.d.ts:1301` |
| 1 | method | `Bun.RedisClient.rpush` | `Bun.RedisClient.rpush(key: RedisClient.KeyLike, value: RedisClient.KeyLike, ...rest: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Append one or multiple values to a list | `redis.d.ts:1893` |
| 1 | method | `Bun.RedisClient.rpushx` | `Bun.RedisClient.rpushx(key: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Append a value to a list, only if the list exists | `redis.d.ts:1902` |
| 1 | method | `Bun.RedisClient.sadd` | `Bun.RedisClient.sadd(key: RedisClient.KeyLike, ...members: string[]): Promise<number>;` | — | — | 0 | 1 | Add one or more members to a set | `redis.d.ts:757` |
| 1 | method | `Bun.RedisClient.scan` | `Bun.RedisClient.scan(cursor: string \| number): Promise<[string, string[]]>;` | — | — | 0 | 5 | Incrementally iterate the keyspace | `redis.d.ts:1346` |
| 1 | method | `Bun.RedisClient.scard` | `Bun.RedisClient.scard(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the number of members in a set | `redis.d.ts:1401` |
| 1 | method | `Bun.RedisClient.sdiff` | `Bun.RedisClient.sdiff(key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[]): Promise<string[]>;` | — | — | 0 | 1 | Get the difference of multiple sets | `redis.d.ts:1409` |
| 1 | method | `Bun.RedisClient.sdiffstore` | `Bun.RedisClient.sdiffstore( destination: RedisClient.KeyLike, key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[] ): Promise<number>;` | — | — | 0 | 1 | Store the difference of multiple sets in a key | `redis.d.ts:830` |
| 1 | property | `Bun.RedisClient.seconds` | `Bun.RedisClient.seconds: number,` | — | — | 0 | 2 | — | `redis.d.ts:435` |
| 1 | method | `Bun.RedisClient.send` | `Bun.RedisClient.send(command: string, args: string[]): Promise<any>;` | — | — | 0 | 1 | Send a raw command to the Redis server | `redis.d.ts:111` |
| 1 | method | `Bun.RedisClient.setbit` | `Bun.RedisClient.setbit(key: RedisClient.KeyLike, offset: number, value: 0 \| 1): Promise<number>;` | — | — | 0 | 1 | Sets or clears the bit at offset in the string value stored at key | `redis.d.ts:2570` |
| 1 | method | `Bun.RedisClient.setex` | `Bun.RedisClient.setex(key: RedisClient.KeyLike, seconds: number, value: RedisClient.KeyLike): Promise<"OK">;` | — | — | 0 | 1 | Set key to hold the string value with expiration time in seconds | `redis.d.ts:1926` |
| 1 | method | `Bun.RedisClient.setnx` | `Bun.RedisClient.setnx(key: RedisClient.KeyLike, value: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Set the value of a key, only if the key does not exist | `redis.d.ts:1911` |
| 1 | method | `Bun.RedisClient.setrange` | `Bun.RedisClient.setrange(key: RedisClient.KeyLike, offset: number, value: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Overwrite part of a string at key starting at the specified offset | `redis.d.ts:2599` |
| 1 | method | `Bun.RedisClient.sinter` | `Bun.RedisClient.sinter(key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[]): Promise<string[]>;` | — | — | 0 | 1 | Get the intersection of multiple sets | `redis.d.ts:1417` |
| 1 | method | `Bun.RedisClient.sintercard` | `Bun.RedisClient.sintercard( numkeys: number, key: RedisClient.KeyLike, ...args: (RedisClient.KeyLike \| "LIMIT" \| number)[] ): Promise<number>;` | — | — | 0 | 1 | Get the cardinality of the intersection of multiple sets | `redis.d.ts:1439` |
| 1 | method | `Bun.RedisClient.sinterstore` | `Bun.RedisClient.sinterstore( destination: RedisClient.KeyLike, key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[] ): Promise<number>;` | — | — | 0 | 1 | Store the intersection of multiple sets in a key | `redis.d.ts:1426` |
| 1 | method | `Bun.RedisClient.sismember` | `Bun.RedisClient.sismember(key: RedisClient.KeyLike, member: string): Promise<boolean>;` | — | — | 0 | 1 | Check if a value is a member of a set | `redis.d.ts:749` |
| 1 | method | `Bun.RedisClient.smembers` | `Bun.RedisClient.smembers(key: RedisClient.KeyLike): Promise<string[]>;` | — | — | 0 | 1 | Get all the members in a set | `redis.d.ts:781` |
| 1 | method | `Bun.RedisClient.smismember` | `Bun.RedisClient.smismember( key: RedisClient.KeyLike, member: RedisClient.KeyLike, ...members: RedisClient.KeyLike[] ): Promise<number[]>;` | — | — | 0 | 1 | Check if multiple members are members of a set | `redis.d.ts:843` |
| 1 | method | `Bun.RedisClient.smove` | `Bun.RedisClient.smove(source: RedisClient.KeyLike, destination: RedisClient.KeyLike, member: string): Promise<boolean>;` | — | — | 0 | 1 | Move a member from one set to another | `redis.d.ts:774` |
| 1 | property | `Bun.RedisClient.source` | `Bun.RedisClient.source: RedisClient.KeyLike,` | — | — | 0 | 3 | — | `redis.d.ts:993` |
| 1 | method | `Bun.RedisClient.spop` | `Bun.RedisClient.spop(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 2 | Remove and return a random member from a set | `redis.d.ts:805` |
| 1 | method | `Bun.RedisClient.spublish` | `Bun.RedisClient.spublish(channel: RedisClient.KeyLike, message: string): Promise<number>;` | — | — | 0 | 1 | Post a message to a shard channel | `redis.d.ts:821` |
| 1 | method | `Bun.RedisClient.srandmember` | `Bun.RedisClient.srandmember(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 2 | Get a random member from a set | `redis.d.ts:789` |
| 1 | method | `Bun.RedisClient.srem` | `Bun.RedisClient.srem(key: RedisClient.KeyLike, ...members: string[]): Promise<number>;` | — | — | 0 | 1 | Remove one or more members from a set | `redis.d.ts:765` |
| 1 | method | `Bun.RedisClient.sscan` | `Bun.RedisClient.sscan(key: RedisClient.KeyLike, cursor: number \| string, ...args: (string \| number)[]): Promise<[string, string[]]>;` | — | — | 0 | 1 | Incrementally iterate over a set | `redis.d.ts:856` |
| 1 | property | `Bun.RedisClient.start` | `Bun.RedisClient.start: string \| number,` | — | — | 0 | 5 | — | `redis.d.ts:1635` |
| 1 | property | `Bun.RedisClient.stop` | `Bun.RedisClient.stop: string \| number,` | — | — | 0 | 5 | — | `redis.d.ts:1636` |
| 1 | type | `Bun.RedisClient.StringPubSubListener` | `Bun.RedisClient.StringPubSubListener` | — | — | 0 | 1 | — | `redis.d.ts:48` |
| 1 | method | `Bun.RedisClient.strlen` | `Bun.RedisClient.strlen(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the length of the value stored in a key | `redis.d.ts:1451` |
| 1 | method | `Bun.RedisClient.subscribe` | `Bun.RedisClient.subscribe(channel: string, listener: RedisClient.StringPubSubListener): Promise<number>;` | — | — | 0 | 2 | Subscribe to a Redis channel. | `redis.d.ts:2734` |
| 1 | method | `Bun.RedisClient.substr` *(deprecated)* | `Bun.RedisClient.substr(key: RedisClient.KeyLike, start: number, end: number): Promise<string>;` | — | — | 0 | 1 | Get a substring of the string stored at a key | `redis.d.ts:2590` |
| 1 | method | `Bun.RedisClient.sunion` | `Bun.RedisClient.sunion(key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[]): Promise<string[]>;` | — | — | 0 | 1 | Get the union of multiple sets | `redis.d.ts:1459` |
| 1 | method | `Bun.RedisClient.sunionstore` | `Bun.RedisClient.sunionstore( destination: RedisClient.KeyLike, key: RedisClient.KeyLike, ...keys: RedisClient.KeyLike[] ): Promise<number>;` | — | — | 0 | 1 | Store the union of multiple sets in a key | `redis.d.ts:1468` |
| 1 | property | `Bun.RedisClient.timeout` | `Bun.RedisClient.timeout: number,` | — | — | 0 | 2 | — | `redis.d.ts:997` |
| 1 | property | `Bun.RedisClient.timestampMilliseconds` | `Bun.RedisClient.timestampMilliseconds: number,` | — | — | 0 | 1 | — | `redis.d.ts:175` |
| 1 | property | `Bun.RedisClient.to` | `Bun.RedisClient.to: "LEFT" \| "RIGHT",` | — | — | 0 | 2 | — | `redis.d.ts:996` |
| 1 | method | `Bun.RedisClient.touch` | `Bun.RedisClient.touch(...keys: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Alters the last access time of one or more keys | `redis.d.ts:2904` |
| 1 | method | `Bun.RedisClient.ttl` | `Bun.RedisClient.ttl(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the time to live for a key in seconds | `redis.d.ts:310` |
| 1 | property | `Bun.RedisClient.unixTimeMilliseconds` | `Bun.RedisClient.unixTimeMilliseconds: number,` | — | — | 0 | 2 | — | `redis.d.ts:527` |
| 1 | property | `Bun.RedisClient.unixTimeSeconds` | `Bun.RedisClient.unixTimeSeconds: number,` | — | — | 0 | 2 | — | `redis.d.ts:457` |
| 1 | method | `Bun.RedisClient.unlink` | `Bun.RedisClient.unlink(...keys: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Asynchronously delete one or more keys | `redis.d.ts:2881` |
| 1 | method | `Bun.RedisClient.unsubscribe` | `Bun.RedisClient.unsubscribe(channel: string): Promise<void>;` | — | — | 0 | 4 | Unsubscribe from a singular Redis channel. | `redis.d.ts:2765` |
| 1 | property | `Bun.RedisClient.value` | `Bun.RedisClient.value: RedisClient.KeyLike,` | — | — | 0 | 3 | — | `redis.d.ts:173` |
| 1 | property | `Bun.RedisClient.withscores` | `Bun.RedisClient.withscores: "WITHSCORES",` | — | — | 0 | 6 | — | `redis.d.ts:1637` |
| 1 | method | `Bun.RedisClient.zadd` | `Bun.RedisClient.zadd(key: RedisClient.KeyLike, ...args: (string \| number)[]): Promise<number>;` | — | — | 0 | 1 | Add one or more members to a sorted set, or update scores if they already exist | `redis.d.ts:2020` |
| 1 | method | `Bun.RedisClient.zcard` | `Bun.RedisClient.zcard(key: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Get the number of members in a sorted set | `redis.d.ts:1510` |
| 1 | method | `Bun.RedisClient.zcount` | `Bun.RedisClient.zcount(key: RedisClient.KeyLike, min: string \| number, max: string \| number): Promise<number>;` | — | — | 0 | 1 | Count the members in a sorted set with scores within the given range | `redis.d.ts:1519` |
| 1 | method | `Bun.RedisClient.zdiff` | `Bun.RedisClient.zdiff( numkeys: number, ...args: [...keys: RedisClient.KeyLike[], withscores: "WITHSCORES"] ): Promise<[string, number][]>;` | — | — | 0 | 2 | Compute the difference between sorted sets with scores | `redis.d.ts:2961` |
| 1 | method | `Bun.RedisClient.zdiffstore` | `Bun.RedisClient.zdiffstore(destination: RedisClient.KeyLike, numkeys: number, ...keys: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Compute the difference between sorted sets and store the result | `redis.d.ts:3007` |
| 1 | method | `Bun.RedisClient.zincrby` | `Bun.RedisClient.zincrby(key: RedisClient.KeyLike, increment: number, member: RedisClient.KeyLike): Promise<number>;` | — | — | 0 | 1 | Increment the score of a member in a sorted set | `redis.d.ts:1959` |
| 1 | method | `Bun.RedisClient.zinter` | `Bun.RedisClient.zinter( numkeys: number, ...args: [...args: (string \| number)[], withscores: "WITHSCORES"] ): Promise<[string, number][]>;` | — | — | 0 | 2 | Compute the intersection of multiple sorted sets | `redis.d.ts:3049` |
| 1 | method | `Bun.RedisClient.zintercard` | `Bun.RedisClient.zintercard(numkeys: number, ...keys: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 2 | Count the number of members in the intersection of multiple sorted sets | `redis.d.ts:3118` |
| 1 | method | `Bun.RedisClient.zinterstore` | `Bun.RedisClient.zinterstore(destination: RedisClient.KeyLike, numkeys: number, ...args: (string \| number)[]): Promise<number>;` | — | — | 0 | 1 | Compute the intersection of multiple sorted sets and store in destination | `redis.d.ts:3171` |
| 1 | method | `Bun.RedisClient.zlexcount` | `Bun.RedisClient.zlexcount(key: RedisClient.KeyLike, min: string, max: string): Promise<number>;` | — | — | 0 | 1 | Count the members in a sorted set within a lexicographical range | `redis.d.ts:1528` |
| 1 | method | `Bun.RedisClient.zmpop` | `Bun.RedisClient.zmpop(numkeys: number, ...args: (string \| number)[]): Promise<[string, [string, number][]] \| null>;` | — | — | 0 | 1 | Remove and return members with scores from one or more sorted sets. | `redis.d.ts:3315` |
| 1 | method | `Bun.RedisClient.zmscore` | `Bun.RedisClient.zmscore( key: RedisClient.KeyLike, member: RedisClient.KeyLike, ...members: RedisClient.KeyLike[] ): Promise<(number \| null)[]>;` | — | — | 0 | 1 | Returns the scores associated with the specified members in the sorted set | `redis.d.ts:1968` |
| 1 | method | `Bun.RedisClient.zpopmax` | `Bun.RedisClient.zpopmax(key: RedisClient.KeyLike): Promise<[string, number] \| []>;` | — | — | 0 | 2 | Remove and return members with the highest scores in a sorted set | `redis.d.ts:1536` |
| 1 | method | `Bun.RedisClient.zpopmin` | `Bun.RedisClient.zpopmin(key: RedisClient.KeyLike): Promise<[string, number] \| []>;` | — | — | 0 | 2 | Remove and return members with the lowest scores in a sorted set | `redis.d.ts:1552` |
| 1 | method | `Bun.RedisClient.zrandmember` | `Bun.RedisClient.zrandmember(key: RedisClient.KeyLike): Promise<string \| null>;` | — | — | 0 | 3 | Get one or multiple random members from a sorted set | `redis.d.ts:1600` |
| 1 | method | `Bun.RedisClient.zrange` | `Bun.RedisClient.zrange( key: RedisClient.KeyLike, start: string \| number, stop: string \| number, withscores: "WITHSCORES", ): Promise<[string, number][]>;` | — | — | 0 | 5 | Return a range of members in a sorted set with their scores | `redis.d.ts:1633` |
| 1 | method | `Bun.RedisClient.zrangebylex` | `Bun.RedisClient.zrangebylex(key: RedisClient.KeyLike, min: string, max: string): Promise<string[]>;` | — | — | 0 | 3 | Return members in a sorted set within a lexicographical range | `redis.d.ts:2136` |
| 1 | method | `Bun.RedisClient.zrangebyscore` | `Bun.RedisClient.zrangebyscore(key: RedisClient.KeyLike, min: string \| number, max: string \| number): Promise<string[]>;` | — | — | 0 | 6 | Return members in a sorted set with scores within a given range | `redis.d.ts:2199` |
| 1 | method | `Bun.RedisClient.zrangestore` | `Bun.RedisClient.zrangestore( destination: RedisClient.KeyLike, source: RedisClient.KeyLike, start: string \| number, stop: string \| number, ...options: string[] ` | — | — | 0 | 1 | Store a range of members from a sorted set into a destination key | `redis.d.ts:2449` |
| 1 | method | `Bun.RedisClient.zrank` | `Bun.RedisClient.zrank(key: RedisClient.KeyLike, member: string): Promise<number \| null>;` | — | — | 0 | 2 | Determine the index of a member in a sorted set | `redis.d.ts:2463` |
| 1 | method | `Bun.RedisClient.zrem` | `Bun.RedisClient.zrem(key: RedisClient.KeyLike, member: RedisClient.KeyLike, ...members: RedisClient.KeyLike[]): Promise<number>;` | — | — | 0 | 1 | Remove one or more members from a sorted set | `redis.d.ts:2083` |
| 1 | method | `Bun.RedisClient.zremrangebylex` | `Bun.RedisClient.zremrangebylex(key: RedisClient.KeyLike, min: string, max: string): Promise<number>;` | — | — | 0 | 1 | Remove all members in a sorted set within the given lexicographical range | `redis.d.ts:2092` |
| 1 | method | `Bun.RedisClient.zremrangebyrank` | `Bun.RedisClient.zremrangebyrank(key: RedisClient.KeyLike, start: number, stop: number): Promise<number>;` | — | — | 0 | 1 | Remove all members in a sorted set within the given rank range | `redis.d.ts:2101` |
| 1 | method | `Bun.RedisClient.zremrangebyscore` | `Bun.RedisClient.zremrangebyscore(key: RedisClient.KeyLike, min: string \| number, max: string \| number): Promise<number>;` | — | — | 0 | 1 | Remove all members in a sorted set within the given score range | `redis.d.ts:2110` |
| 1 | method | `Bun.RedisClient.zrevrange` | `Bun.RedisClient.zrevrange(key: RedisClient.KeyLike, start: number, stop: number): Promise<string[]>;` | — | — | 0 | 3 | Return a range of members in a sorted set, by index, with scores ordered from high to low | `redis.d.ts:1748` |
| 1 | method | `Bun.RedisClient.zrevrangebylex` | `Bun.RedisClient.zrevrangebylex(key: RedisClient.KeyLike, max: string, min: string, ...options: string[]): Promise<string[]>;` | — | — | 0 | 1 | Return members in a sorted set within a lexicographical range, ordered from high to low | `redis.d.ts:2416` |
| 1 | method | `Bun.RedisClient.zrevrangebyscore` | `Bun.RedisClient.zrevrangebyscore(key: RedisClient.KeyLike, max: string \| number, min: string \| number): Promise<string[]>;` | — | — | 0 | 4 | Return members in a sorted set with scores within a given range, ordered from high to low | `redis.d.ts:2327` |
| 1 | method | `Bun.RedisClient.zrevrank` | `Bun.RedisClient.zrevrank(key: RedisClient.KeyLike, member: string): Promise<number \| null>;` | — | — | 0 | 2 | Determine the index of a member in a sorted set, with scores ordered from high to low | `redis.d.ts:2480` |
| 1 | method | `Bun.RedisClient.zscan` | `Bun.RedisClient.zscan(key: RedisClient.KeyLike, cursor: string \| number, ...options: string[]): Promise<[string, string[]]>;` | — | — | 0 | 1 | Incrementally iterate sorted set elements and their scores | `redis.d.ts:2074` |
| 1 | method | `Bun.RedisClient.zscore` | `Bun.RedisClient.zscore(key: RedisClient.KeyLike, member: string): Promise<number \| null>;` | — | — | 0 | 1 | Get the score associated with the given member in a sorted set | `redis.d.ts:1950` |
| 1 | method | `Bun.RedisClient.zunion` | `Bun.RedisClient.zunion( numkeys: number, ...args: [...args: (string \| number)[], withscores: "WITHSCORES"] ): Promise<[string, number][]>;` | — | — | 0 | 2 | Compute the union of multiple sorted sets | `redis.d.ts:3211` |
| 1 | method | `Bun.RedisClient.zunionstore` | `Bun.RedisClient.zunionstore(destination: RedisClient.KeyLike, numkeys: number, ...args: (string \| number)[]): Promise<number>;` | — | — | 0 | 1 | Compute the union of multiple sorted sets and store in destination | `redis.d.ts:3290` |
| 1 | property | `Bun.RedisOptions.autoReconnect` | `Bun.RedisOptions.autoReconnect?: boolean;` | true | — | 0 | 1 | Whether to automatically reconnect | `redis.d.ts:19` |
| 1 | property | `Bun.RedisOptions.connectionTimeout` | `Bun.RedisOptions.connectionTimeout?: number;` | 10000 | — | 0 | 1 | Connection timeout in milliseconds | `redis.d.ts:7` |
| 1 | property | `Bun.RedisOptions.enableAutoPipelining` | `Bun.RedisOptions.enableAutoPipelining?: boolean;` | true | — | 0 | 1 | Whether to enable auto-pipelining | `redis.d.ts:43` |
| 1 | property | `Bun.RedisOptions.enableOfflineQueue` | `Bun.RedisOptions.enableOfflineQueue?: boolean;` | true | — | 0 | 1 | Whether to queue commands when disconnected | `redis.d.ts:31` |
| 1 | property | `Bun.RedisOptions.idleTimeout` | `Bun.RedisOptions.idleTimeout?: number;` | 0 (no timeout) | — | 0 | 1 | Idle timeout in milliseconds | `redis.d.ts:13` |
| 1 | property | `Bun.RedisOptions.maxRetries` | `Bun.RedisOptions.maxRetries?: number;` | 10 | — | 0 | 1 | Maximum number of reconnection attempts | `redis.d.ts:25` |
| 1 | property | `Bun.RedisOptions.tls` | `Bun.RedisOptions.tls?: boolean \| Bun.TLSOptions;` | — | — | 0 | 1 | TLS options | `redis.d.ts:37` |
| 1 | method | `Bun.ReservedSQL.release` | `Bun.ReservedSQL.release(): void;` | — | — | 0 | 1 | Releases the client back to the connection pool | `sql.d.ts:12` |
| 1 | property | `Bun.ResourceUsage.contextSwitches` | `Bun.ResourceUsage.contextSwitches: {` | — | — | 0 | 1 | The number of voluntary and involuntary context switches that the process made. | `bun.d.ts:7154` |
| 1 | property | `Bun.ResourceUsage.cpuTime` | `Bun.ResourceUsage.cpuTime: {` | — | — | 0 | 1 | The amount of CPU time used by the process, in microseconds. | `bun.d.ts:7168` |
| 1 | property | `Bun.ResourceUsage.maxRSS` | `Bun.ResourceUsage.maxRSS: number;` | — | — | 0 | 1 | The maximum amount of resident set size (in bytes) used by the process during its lifetime. | `bun.d.ts:7185` |
| 1 | property | `Bun.ResourceUsage.messages` | `Bun.ResourceUsage.messages: {` | — | — | 0 | 1 | IPC messages sent and received by the process. | `bun.d.ts:7190` |
| 1 | property | `Bun.ResourceUsage.ops` | `Bun.ResourceUsage.ops: {` | — | — | 0 | 1 | The number of IO operations done by the process. | `bun.d.ts:7203` |
| 1 | property | `Bun.ResourceUsage.shmSize` | `Bun.ResourceUsage.shmSize: number;` | — | — | 0 | 1 | The amount of shared memory that the process used. | `bun.d.ts:7216` |
| 1 | property | `Bun.ResourceUsage.signalCount` | `Bun.ResourceUsage.signalCount: number;` | — | — | 0 | 1 | The number of signals delivered to the process. | `bun.d.ts:7220` |
| 1 | property | `Bun.ResourceUsage.swapCount` | `Bun.ResourceUsage.swapCount: number;` | — | — | 0 | 1 | The number of times the process was swapped out of main memory. | `bun.d.ts:7224` |
| 1 | property | `Bun.S3Client.data` | `Bun.S3Client.data:` | — | — | 0 | 2 | — | `s3.d.ts:942` |
| 1 | method | `Bun.S3Client.delete` | `Bun.S3Client.delete(path: string, options?: S3Options): Promise<void>;` | — | — | 0 | 2 | Delete a file from the bucket. | `s3.d.ts:1133` |
| 1 | method | `Bun.S3Client.exists` | `Bun.S3Client.exists(path: string, options?: S3Options): Promise<boolean>;` | — | — | 0 | 2 | Check if a file exists in the bucket. | `s3.d.ts:1221` |
| 1 | method | `Bun.S3Client.file` | `Bun.S3Client.file(path: string, options?: S3Options): S3File;` | — | yes | 0 | 2 | Creates an S3File instance for the given path. | `s3.d.ts:889` |
| 1 | property | `Bun.S3Client.input` | `Bun.S3Client.input?: S3ListObjectsOptions \| null,` | — | — | 0 | 2 | — | `s3.d.ts:1305` |
| 1 | method | `Bun.S3Client.list` | `Bun.S3Client.list( input?: S3ListObjectsOptions \| null, options?: Pick<S3Options, "accessKeyId" \| "secretAccessKey" \| "sessionToken" \| "region" \| "bucket" \| "en` | — | — | 0 | 2 | Returns some or all (up to 1,000) of the objects in a bucket with each request. | `s3.d.ts:1304` |
| 1 | property | `Bun.S3Client.options` | `Bun.S3Client.options?: S3Options,` | — | — | 0 | 4 | — | `s3.d.ts:954` |
| 1 | property | `Bun.S3Client.path` | `Bun.S3Client.path: string,` | — | — | 0 | 2 | — | `s3.d.ts:941` |
| 1 | method | `Bun.S3Client.presign` | `Bun.S3Client.presign(path: string, options?: S3FilePresignOptions): string;` | — | — | 0 | 2 | Generate a presigned URL for temporary access to a file. | `s3.d.ts:1036` |
| 1 | method | `Bun.S3Client.size` | `Bun.S3Client.size(path: string, options?: S3Options): Promise<number>;` | — | — | 0 | 2 | Get the size of a file in bytes. | `s3.d.ts:1175` |
| 1 | method | `Bun.S3Client.stat` | `Bun.S3Client.stat(path: string, options?: S3Options): Promise<S3Stats>;` | — | — | 0 | 2 | Get the stat of a file in an S3-compatible storage service. | `s3.d.ts:1259` |
| 1 | method | `Bun.S3Client.unlink` | `Bun.S3Client.unlink(path: string, options?: S3Options): Promise<void>;` | — | — | 0 | 2 | Delete a file from the bucket. | `s3.d.ts:1090` |
| 1 | method | `Bun.S3Client.write` | `Bun.S3Client.write( path: string, data: \| string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer \| Request \| Response \| BunFile \| S3File \| Blob \| File \| Arc` | — | yes | 0 | 2 | Writes data directly to a path in the bucket. | `s3.d.ts:940` |
| 1 | property | `Bun.S3File.bucket` | `Bun.S3File.bucket?: string;` | — | — | 0 | 1 | The bucket name containing the file. | `s3.d.ts:570` |
| 1 | property | `Bun.S3File.data` | `Bun.S3File.data:` | — | — | 0 | 1 | — | `s3.d.ts:631` |
| 1 | method | `Bun.S3File.delete` | `Bun.S3File.delete(): Promise<void>;` | — | — | 0 | 1 | Deletes the file from S3. | `s3.d.ts:695` |
| 1 | method | `Bun.S3File.exists` | `Bun.S3File.exists(): Promise<boolean>;` | — | — | 0 | 1 | Checks if the file exists in S3. | `s3.d.ts:595` |
| 1 | property | `Bun.S3File.name` | `Bun.S3File.name?: string;` | — | — | 0 | 1 | The name or path of the file in the bucket. | `s3.d.ts:561` |
| 1 | property | `Bun.S3File.options` | `Bun.S3File.options?: S3Options,` | — | — | 0 | 1 | — | `s3.d.ts:642` |
| 1 | method | `Bun.S3File.presign` | `Bun.S3File.presign(options?: S3FilePresignOptions): string;` | — | — | 0 | 1 | Generates a presigned URL for the file. | `s3.d.ts:675` |
| 1 | property | `Bun.S3File.readable` | `Bun.S3File.readable: ReadableStream<Uint8Array<ArrayBuffer>>;` | — | — | 0 | 1 | Gets a readable stream of the file's content. | `s3.d.ts:551` |
| 1 | method | `Bun.S3File.slice` | `Bun.S3File.slice(begin?: number, end?: number, contentType?: string): S3File;` | — | — | 0 | 3 | Creates a new S3File representing a slice of the original file. | `s3.d.ts:475` |
| 1 | method | `Bun.S3File.stat` | `Bun.S3File.stat(): Promise<S3Stats>;` | — | — | 0 | 1 | Get the stat of a file in an S3-compatible storage service. | `s3.d.ts:711` |
| 1 | method | `Bun.S3File.stream` | `Bun.S3File.stream(): ReadableStream<Uint8Array<ArrayBuffer>>;` | — | — | 0 | 1 | — | `s3.d.ts:552` |
| 1 | property | `Bun.S3File.unlink` | `Bun.S3File.unlink: S3File["delete"];` | — | — | 0 | 1 | Alias for delete() method. | `s3.d.ts:704` |
| 1 | method | `Bun.S3File.write` | `Bun.S3File.write( data: \| string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer \| Request \| Response \| BunFile \| S3File \| Blob \| Archive, options?: S3Optio` | — | yes | 0 | 1 | Uploads data to S3. | `s3.d.ts:630` |
| 1 | method | `Bun.S3File.writer` | `Bun.S3File.writer(options?: S3Options): NetworkSink;` | — | — | 0 | 1 | Creates a writable stream for uploading data. | `s3.d.ts:520` |
| 1 | property | `Bun.S3FilePresignOptions.expiresIn` | `Bun.S3FilePresignOptions.expiresIn?: number;` | — | — | 0 | 1 | Number of seconds until the presigned URL expires. | `s3.d.ts:394` |
| 1 | property | `Bun.S3FilePresignOptions.method` | `Bun.S3FilePresignOptions.method?: "GET" \| "POST" \| "PUT" \| "DELETE" \| "HEAD";` | — | — | 0 | 1 | The HTTP method allowed for the presigned URL. | `s3.d.ts:414` |
| 1 | property | `Bun.S3ListObjectsOptions.continuationToken` | `Bun.S3ListObjectsOptions.continuationToken?: string;` | — | — | 0 | 1 | ContinuationToken indicates to S3 that the list is being continued on this bucket with a token. ContinuationToken is obfuscated and is not a real key. You ca… | `s3.d.ts:718` |
| 1 | property | `Bun.S3ListObjectsOptions.delimiter` | `Bun.S3ListObjectsOptions.delimiter?: string;` | — | — | 0 | 1 | A delimiter is a character that you use to group keys. | `s3.d.ts:720` |
| 1 | property | `Bun.S3ListObjectsOptions.encodingType` | `Bun.S3ListObjectsOptions.encodingType?: "url";` | — | — | 0 | 1 | Encoding type used by S3 to encode the object keys in the response. Responses are encoded only in UTF-8. An object key can contain any Unicode character. How… | `s3.d.ts:726` |
| 1 | property | `Bun.S3ListObjectsOptions.fetchOwner` | `Bun.S3ListObjectsOptions.fetchOwner?: boolean;` | — | — | 0 | 1 | If you want to return the owner field with each key in the result, then set the FetchOwner field to true. | `s3.d.ts:728` |
| 1 | property | `Bun.S3ListObjectsOptions.maxKeys` | `Bun.S3ListObjectsOptions.maxKeys?: number;` | — | — | 0 | 1 | Sets the maximum number of keys returned in the response. By default, the action returns up to 1,000 key names. The response might contain fewer keys but wil… | `s3.d.ts:722` |
| 1 | property | `Bun.S3ListObjectsOptions.prefix` | `Bun.S3ListObjectsOptions.prefix?: string;` | — | — | 0 | 1 | Limits the response to keys that begin with the specified prefix. | `s3.d.ts:716` |
| 1 | property | `Bun.S3ListObjectsOptions.startAfter` | `Bun.S3ListObjectsOptions.startAfter?: string;` | — | — | 0 | 1 | StartAfter is where you want S3 to start listing from. S3 starts listing after this specified key. StartAfter can be any key in the bucket. | `s3.d.ts:724` |
| 1 | property | `Bun.S3ListObjectsResponse.commonPrefixes` | `Bun.S3ListObjectsResponse.commonPrefixes?: { prefix: string }[];` | — | — | 0 | 1 | All of the keys (up to 1,000) that share the same prefix are grouped together. When counting the total numbers of returns by this API operation, this group o… | `s3.d.ts:741` |
| 1 | property | `Bun.S3ListObjectsResponse.contents` | `Bun.S3ListObjectsResponse.contents?: {` | — | — | 0 | 1 | Metadata about each object returned. | `s3.d.ts:743` |
| 1 | property | `Bun.S3ListObjectsResponse.continuationToken` | `Bun.S3ListObjectsResponse.continuationToken?: string;` | — | — | 0 | 1 | If ContinuationToken was sent with the request, it is included in the response. You can use the returned ContinuationToken for pagination of the list response. | `s3.d.ts:793` |
| 1 | property | `Bun.S3ListObjectsResponse.delimiter` | `Bun.S3ListObjectsResponse.delimiter?: string;` | — | — | 0 | 1 | Causes keys that contain the same string between the prefix and the first occurrence of the delimiter to be rolled up into a single result element in the Com… | `s3.d.ts:795` |
| 1 | property | `Bun.S3ListObjectsResponse.encodingType` | `Bun.S3ListObjectsResponse.encodingType?: "url";` | — | — | 0 | 1 | Encoding type used by S3 to encode object key names in the XML response. | `s3.d.ts:797` |
| 1 | property | `Bun.S3ListObjectsResponse.isTruncated` | `Bun.S3ListObjectsResponse.isTruncated?: boolean;` | — | — | 0 | 1 | Set to false if all of the results were returned. Set to true if more keys are available to return. If the number of results exceeds that specified by MaxKey… | `s3.d.ts:799` |
| 1 | property | `Bun.S3ListObjectsResponse.keyCount` | `Bun.S3ListObjectsResponse.keyCount?: number;` | — | — | 0 | 1 | KeyCount is the number of keys returned with this request. KeyCount will always be less than or equal to the MaxKeys field. For example, if you ask for 50 ke… | `s3.d.ts:801` |
| 1 | property | `Bun.S3ListObjectsResponse.maxKeys` | `Bun.S3ListObjectsResponse.maxKeys?: number;` | — | — | 0 | 1 | Sets the maximum number of keys returned in the response. By default, the action returns up to 1,000 key names. The response might contain fewer keys but wil… | `s3.d.ts:803` |
| 1 | property | `Bun.S3ListObjectsResponse.name` | `Bun.S3ListObjectsResponse.name?: string;` | — | — | 0 | 1 | The bucket name. | `s3.d.ts:805` |
| 1 | property | `Bun.S3ListObjectsResponse.nextContinuationToken` | `Bun.S3ListObjectsResponse.nextContinuationToken?: string;` | — | — | 0 | 1 | NextContinuationToken is sent when isTruncated is true, which means there are more keys in the bucket that can be listed. The next list requests to S3 can be… | `s3.d.ts:807` |
| 1 | property | `Bun.S3ListObjectsResponse.prefix` | `Bun.S3ListObjectsResponse.prefix?: string;` | — | — | 0 | 1 | Keys that begin with the indicated prefix. | `s3.d.ts:809` |
| 1 | property | `Bun.S3ListObjectsResponse.startAfter` | `Bun.S3ListObjectsResponse.startAfter?: string;` | — | — | 0 | 1 | If StartAfter was sent with the request, it is included in the response. | `s3.d.ts:811` |
| 1 | property | `Bun.S3Options.accessKeyId` | `Bun.S3Options.accessKeyId?: string;` | — | — | 0 | 1 | The access key ID for authentication. | `s3.d.ts:167` |
| 1 | property | `Bun.S3Options.acl` | `Bun.S3Options.acl?:` | — | — | 0 | 1 | The Access Control List (ACL) policy for the file. | `s3.d.ts:128` |
| 1 | property | `Bun.S3Options.bucket` | `Bun.S3Options.bucket?: string;` | — | — | 0 | 1 | The S3 bucket name. Defaults to `S3_BUCKET` or `AWS_BUCKET` environment variables. | `s3.d.ts:150` |
| 1 | property | `Bun.S3Options.contentDisposition` | `Bun.S3Options.contentDisposition?: string \| undefined;` | — | — | 0 | 1 | The Content-Disposition header value. | `s3.d.ts:300` |
| 1 | property | `Bun.S3Options.contentEncoding` | `Bun.S3Options.contentEncoding?: string \| undefined;` | — | — | 0 | 1 | The Content-Encoding header value. | `s3.d.ts:319` |
| 1 | property | `Bun.S3Options.endpoint` | `Bun.S3Options.endpoint?: string;` | — | — | 0 | 1 | The S3-compatible service endpoint URL. | `s3.d.ts:217` |
| 1 | property | `Bun.S3Options.highWaterMark` *(deprecated)* | `Bun.S3Options.highWaterMark?: number;` | — | — | 0 | 1 | — | `s3.d.ts:370` |
| 1 | property | `Bun.S3Options.partSize` | `Bun.S3Options.partSize?: number;` | — | — | 0 | 1 | The size of each part in multipart uploads (in bytes). | `s3.d.ts:247` |
| 1 | property | `Bun.S3Options.queueSize` | `Bun.S3Options.queueSize?: number;` | — | — | 0 | 1 | Number of parts to upload in parallel for multipart uploads. | `s3.d.ts:257` |
| 1 | property | `Bun.S3Options.region` | `Bun.S3Options.region?: string;` | — | — | 0 | 1 | The AWS region. Defaults to `S3_REGION` or `AWS_REGION` environment variables. | `s3.d.ts:161` |
| 1 | property | `Bun.S3Options.requestPayer` | `Bun.S3Options.requestPayer?: boolean;` | — | — | 0 | 1 | When set to `true`, confirms that the requester knows they will be charged | `s3.d.ts:365` |
| 1 | property | `Bun.S3Options.retry` | `Bun.S3Options.retry?: number;` | — | — | 0 | 1 | Number of retry attempts for failed uploads. | `s3.d.ts:270` |
| 1 | property | `Bun.S3Options.secretAccessKey` | `Bun.S3Options.secretAccessKey?: string;` | — | — | 0 | 1 | The secret access key for authentication. | `s3.d.ts:173` |
| 1 | property | `Bun.S3Options.sessionToken` | `Bun.S3Options.sessionToken?: string;` | — | — | 0 | 1 | Optional session token for temporary credentials. | `s3.d.ts:187` |
| 1 | property | `Bun.S3Options.storageClass` | `Bun.S3Options.storageClass?:` | — | — | 0 | 1 | By default, Amazon S3 uses the STANDARD Storage Class to store newly created objects. | `s3.d.ts:330` |
| 1 | property | `Bun.S3Options.virtualHostedStyle` | `Bun.S3Options.virtualHostedStyle?: boolean;` | — | — | 0 | 1 | Use virtual hosted style endpoint. default to false, when true if `endpoint` is informed it will ignore the `bucket` | `s3.d.ts:229` |
| 1 | property | `Bun.S3Stats.etag` | `Bun.S3Stats.etag: string;` | — | — | 0 | 1 | — | `s3.d.ts:420` |
| 1 | property | `Bun.S3Stats.lastModified` | `Bun.S3Stats.lastModified: Date;` | — | — | 0 | 1 | — | `s3.d.ts:419` |
| 1 | property | `Bun.S3Stats.size` | `Bun.S3Stats.size: number;` | — | — | 0 | 1 | — | `s3.d.ts:418` |
| 1 | interface | `Bun.Security.Advisory` | `Bun.Security.Advisory` | — | — | 1 | 1 | Advisory represents the result of a security scan result of a package | `security.d.ts:35` |
| 1 | interface | `Bun.Security.Package` | `Bun.Security.Package` | — | — | 0 | 1 | — | `security.d.ts:6` |
| 1 | interface | `Bun.Security.Scanner` | `Bun.Security.Scanner` | — | — | 2 | 1 | — | `security.d.ts:72` |
| 1 | function | `Bun.semver.order` | `Bun.semver.order(v1: StringLike, v2: StringLike): -1 \| 0 \| 1;` | — | yes | 25 | 1 | Returns 0 if the versions are equal, 1 if `v1` is greater, or -1 if `v2` is greater. | `bun.d.ts:4709` |
| 1 | function | `Bun.semver.satisfies` | `Bun.semver.satisfies(version: StringLike, range: StringLike): boolean;` | — | yes | 46 | 1 | Test if the version satisfies the range. Stringifies both arguments. Returns `true` or `false`. | `bun.d.ts:4703` |
| 1 | type | `Bun.Serve.BaseRouteValue` | `Bun.Serve.BaseRouteValue` | — | — | 0 | 1 | — | `serve.d.ts:549` |
| 1 | interface | `Bun.Serve.BaseServeOptions` | `Bun.Serve.BaseServeOptions` | — | — | 0 | 1 | — | `serve.d.ts:656` |
| 1 | type | `Bun.Serve.Development` | `Bun.Serve.Development` | — | — | 0 | 1 | Development configuration for {@link Bun.serve} | `serve.d.ts:503` |
| 1 | type | `Bun.Serve.ExtractRouteParams` | `Bun.Serve.ExtractRouteParams` | — | — | 0 | 1 | — | `serve.d.ts:490` |
| 1 | type | `Bun.Serve.FetchOrRoutes` | `Bun.Serve.FetchOrRoutes` | — | — | 0 | 1 | — | `serve.d.ts:567` |
| 1 | type | `Bun.Serve.FetchOrRoutesWithWebSocket` | `Bun.Serve.FetchOrRoutesWithWebSocket` | — | — | 0 | 1 | — | `serve.d.ts:589` |
| 1 | type | `Bun.Serve.Handler` | `Bun.Serve.Handler` | — | — | 0 | 1 | — | `serve.d.ts:547` |
| 1 | interface | `Bun.Serve.HostnamePortServeOptions` | `Bun.Serve.HostnamePortServeOptions` | — | — | 0 | 1 | — | `serve.d.ts:718` |
| 1 | type | `Bun.Serve.HTTPMethod` | `Bun.Serve.HTTPMethod` | — | — | 0 | 1 | — | `serve.d.ts:545` |
| 1 | type | `Bun.Serve.Options` | `Bun.Serve.Options` | — | — | 0 | 1 | The type of options that can be passed to {@link serve}, with support for | `serve.d.ts:809` |
| 1 | type | `Bun.Serve.Routes` | `Bun.Serve.Routes` | — | — | 0 | 1 | — | `serve.d.ts:551` |
| 1 | type | `Bun.Serve.RoutesWithUpgrade` | `Bun.Serve.RoutesWithUpgrade` | — | — | 0 | 1 | — | `serve.d.ts:558` |
| 1 | interface | `Bun.Serve.UnixServeOptions` | `Bun.Serve.UnixServeOptions` | — | — | 0 | 1 | — | `serve.d.ts:784` |
| 1 | property | `Bun.Server.compress` | `Bun.Server.compress?: boolean,` | — | — | 0 | 1 | — | `serve.d.ts:1002` |
| 1 | property | `Bun.Server.data` | `Bun.Server.data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer,` | — | — | 0 | 1 | — | `serve.d.ts:1001` |
| 1 | property | `Bun.Server.development` | `Bun.Server.development: boolean;` | — | — | 0 | 1 | Is the server running in development mode? | `serve.d.ts:1117` |
| 1 | method | `Bun.Server.fetch` | `Bun.Server.fetch(request: Request \| string): Response \| Promise<Response>;` | — | — | 0 | 1 | Mock the fetch handler for a running server. | `serve.d.ts:881` |
| 1 | property | `Bun.Server.hostname` | `Bun.Server.hostname: string \| undefined;` | — | — | 0 | 1 | The hostname the server is listening on. Does not include the port. | `serve.d.ts:1098` |
| 1 | property | `Bun.Server.id` | `Bun.Server.id: string;` | — | — | 0 | 1 | An identifier of the server instance | `serve.d.ts:1126` |
| 1 | property | `Bun.Server.options` | `Bun.Server.options?: {` | — | — | 0 | 2 | — | `serve.d.ts:927` |
| 1 | property | `Bun.Server.pendingRequests` | `Bun.Server.pendingRequests: number;` | — | — | 0 | 1 | How many requests are in-flight right now? | `serve.d.ts:1067` |
| 1 | property | `Bun.Server.pendingWebSockets` | `Bun.Server.pendingWebSockets: number;` | — | — | 0 | 1 | How many {@link ServerWebSocket}s are in-flight right now? | `serve.d.ts:1072` |
| 1 | property | `Bun.Server.port` | `Bun.Server.port: number \| undefined;` | — | — | 0 | 1 | The port the server is listening on. | `serve.d.ts:1086` |
| 1 | property | `Bun.Server.protocol` | `Bun.Server.protocol: "http" \| "https" \| null;` | — | — | 0 | 1 | The protocol the server is listening on. | `serve.d.ts:1107` |
| 1 | method | `Bun.Server.publish` | `Bun.Server.publish( topic: string, data: string \| ArrayBufferView \| ArrayBuffer \| SharedArrayBuffer, compress?: boolean, ): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Send a message to all connected {@link ServerWebSocket} subscribed to a topic | `serve.d.ts:999` |
| 1 | method | `Bun.Server.ref` | `Bun.Server.ref(): void;` | — | — | 0 | 1 | Undo a call to {@link Server.unref} | `serve.d.ts:1052` |
| 1 | method | `Bun.Server.reload` | `Bun.Server.reload(options: Serve.Options<WebSocketData, R>): Server<WebSocketData>;` | — | — | 0 | 1 | Update the `fetch` and `error` handlers without restarting the server. | `serve.d.ts:872` |
| 1 | property | `Bun.Server.request` | `Bun.Server.request: Request,` | — | — | 0 | 1 | — | `serve.d.ts:924` |
| 1 | method | `Bun.Server.requestIP` | `Bun.Server.requestIP(request: Request): SocketAddress \| null;` | — | — | 0 | 1 | Returns the client IP address and port of the given Request. If the request was closed or is a unix socket, returns null. | `serve.d.ts:1027` |
| 1 | method | `Bun.Server.stop` | `Bun.Server.stop(closeActiveConnections?: boolean): Promise<void>;` | false | — | 1 | 1 | Stop listening to prevent new connections from being accepted. | `serve.d.ts:844` |
| 1 | method | `Bun.Server.subscriberCount` | `Bun.Server.subscriberCount(topic: string): number;` | — | — | 0 | 1 | A count of connections subscribed to a given topic | `serve.d.ts:1013` |
| 1 | method | `Bun.Server.timeout` | `Bun.Server.timeout(request: Request, seconds: number): void;` | — | — | 0 | 1 | Reset the idleTimeout of the given Request to the number in seconds. 0 means no timeout. | `serve.d.ts:1043` |
| 1 | property | `Bun.Server.topic` | `Bun.Server.topic: string,` | — | — | 0 | 1 | — | `serve.d.ts:1000` |
| 1 | method | `Bun.Server.unref` | `Bun.Server.unref(): void;` | — | — | 0 | 1 | Don't keep the process alive if this server is the only thing left. | `serve.d.ts:1062` |
| 1 | method | `Bun.Server.upgrade` | `Bun.Server.upgrade( request: Request, ...options: [WebSocketData] extends [undefined] ? [ options?: {` | — | — | 0 | 1 | Upgrade a {@link Request} to a {@link ServerWebSocket} | `serve.d.ts:923` |
| 1 | property | `Bun.Server.url` | `Bun.Server.url: URL;` | — | — | 0 | 1 | — | `serve.d.ts:1074` |
| 1 | property | `Bun.ServerWebSocket.binaryType` | `Bun.ServerWebSocket.binaryType?: "nodebuffer" \| "arraybuffer" \| "uint8array";` | — | — | 0 | 1 | Sets how binary data is returned in events. | `serve.d.ts:267` |
| 1 | method | `Bun.ServerWebSocket.close` | `Bun.ServerWebSocket.close(code?: number, reason?: string): void;` | — | — | 0 | 1 | Closes the connection. | `serve.d.ts:117` |
| 1 | method | `Bun.ServerWebSocket.cork` | `Bun.ServerWebSocket.cork(callback: (ws: ServerWebSocket<T>) => T): T;` | — | — | 0 | 1 | Batches `send()` and `publish()` operations, which makes it faster to send data. | `serve.d.ts:230` |
| 1 | property | `Bun.ServerWebSocket.data` | `Bun.ServerWebSocket.data: T;` | — | — | 0 | 1 | Custom data that you can assign to a client, can be read and written at any time. | `serve.d.ts:293` |
| 1 | method | `Bun.ServerWebSocket.getBufferedAmount` | `Bun.ServerWebSocket.getBufferedAmount(): number;` | — | — | 0 | 1 | — | `serve.d.ts:295` |
| 1 | method | `Bun.ServerWebSocket.isSubscribed` | `Bun.ServerWebSocket.isSubscribed(topic: string): boolean;` | — | — | 0 | 1 | Is the client subscribed to a topic? | `serve.d.ts:203` |
| 1 | method | `Bun.ServerWebSocket.ping` | `Bun.ServerWebSocket.ping(data?: string \| BufferSource): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a ping. | `serve.d.ts:131` |
| 1 | method | `Bun.ServerWebSocket.pong` | `Bun.ServerWebSocket.pong(data?: string \| BufferSource): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a pong. | `serve.d.ts:138` |
| 1 | method | `Bun.ServerWebSocket.publish` | `Bun.ServerWebSocket.publish(topic: string, data: string \| BufferSource, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a message to subscribers of the topic. | `serve.d.ts:151` |
| 1 | method | `Bun.ServerWebSocket.publishBinary` | `Bun.ServerWebSocket.publishBinary(topic: string, data: BufferSource, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a binary message to subscribers of the topic. | `serve.d.ts:175` |
| 1 | method | `Bun.ServerWebSocket.publishText` | `Bun.ServerWebSocket.publishText(topic: string, data: string, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a text message to subscribers of the topic. | `serve.d.ts:163` |
| 1 | property | `Bun.ServerWebSocket.readyState` | `Bun.ServerWebSocket.readyState: WebSocketReadyState;` | — | — | 0 | 1 | The ready state of the client. | `serve.d.ts:251` |
| 1 | property | `Bun.ServerWebSocket.remoteAddress` | `Bun.ServerWebSocket.remoteAddress: string;` | — | — | 0 | 1 | The IP address of the client. | `serve.d.ts:238` |
| 1 | method | `Bun.ServerWebSocket.send` | `Bun.ServerWebSocket.send(data: string \| BufferSource, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a message to the client. | `serve.d.ts:77` |
| 1 | method | `Bun.ServerWebSocket.sendBinary` | `Bun.ServerWebSocket.sendBinary(data: BufferSource, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a binary message to the client. | `serve.d.ts:99` |
| 1 | method | `Bun.ServerWebSocket.sendText` | `Bun.ServerWebSocket.sendText(data: string, compress?: boolean): ServerWebSocketSendStatus;` | — | — | 0 | 1 | Sends a text message to the client. | `serve.d.ts:88` |
| 1 | method | `Bun.ServerWebSocket.subscribe` | `Bun.ServerWebSocket.subscribe(topic: string): void;` | — | — | 0 | 1 | Subscribes a client to the topic. | `serve.d.ts:184` |
| 1 | property | `Bun.ServerWebSocket.subscriptions` | `Bun.ServerWebSocket.subscriptions: string[];` | — | — | 0 | 1 | Returns an array of all topics the client is currently subscribed to. | `serve.d.ts:213` |
| 1 | method | `Bun.ServerWebSocket.terminate` | `Bun.ServerWebSocket.terminate(): void;` | — | — | 0 | 1 | Abruptly close the connection. | `serve.d.ts:124` |
| 1 | method | `Bun.ServerWebSocket.unsubscribe` | `Bun.ServerWebSocket.unsubscribe(topic: string): void;` | — | — | 0 | 1 | Unsubscribes a client to the topic. | `serve.d.ts:193` |
| 1 | method | `Bun.ShellError.arrayBuffer` | `Bun.ShellError.arrayBuffer(): ArrayBuffer;` | — | — | 0 | 1 | Read from stdout as an ArrayBuffer | `shell.d.ts:272` |
| 1 | method | `Bun.ShellError.blob` | `Bun.ShellError.blob(): Blob;` | — | — | 0 | 1 | Read from stdout as a Blob | `shell.d.ts:284` |
| 1 | method | `Bun.ShellError.bytes` | `Bun.ShellError.bytes(): Uint8Array<ArrayBuffer>;` | — | — | 0 | 1 | Read from stdout as an Uint8Array | `shell.d.ts:296` |
| 1 | property | `Bun.ShellError.exitCode` | `Bun.ShellError.exitCode: number;` | — | — | 0 | 1 | — | `shell.d.ts:224` |
| 1 | method | `Bun.ShellError.json` | `Bun.ShellError.json(): any;` | — | — | 0 | 1 | Read from stdout as a JSON object | `shell.d.ts:259` |
| 1 | property | `Bun.ShellError.stderr` | `Bun.ShellError.stderr: Buffer;` | — | — | 0 | 1 | — | `shell.d.ts:223` |
| 1 | property | `Bun.ShellError.stdout` | `Bun.ShellError.stdout: Buffer;` | — | — | 0 | 1 | — | `shell.d.ts:222` |
| 1 | method | `Bun.ShellError.text` | `Bun.ShellError.text(encoding?: BufferEncoding): string;` | — | — | 0 | 1 | Read from stdout as a string | `shell.d.ts:245` |
| 1 | method | `Bun.ShellOutput.arrayBuffer` | `Bun.ShellOutput.arrayBuffer(): ArrayBuffer;` | — | — | 0 | 1 | Read from stdout as an ArrayBuffer | `shell.d.ts:350` |
| 1 | method | `Bun.ShellOutput.blob` | `Bun.ShellOutput.blob(): Blob;` | — | — | 0 | 1 | Read from stdout as a Blob | `shell.d.ts:375` |
| 1 | method | `Bun.ShellOutput.bytes` | `Bun.ShellOutput.bytes(): Uint8Array<ArrayBuffer>;` | — | — | 0 | 1 | Read from stdout as an Uint8Array | `shell.d.ts:363` |
| 1 | property | `Bun.ShellOutput.exitCode` | `Bun.ShellOutput.exitCode: number;` | — | — | 0 | 1 | — | `shell.d.ts:302` |
| 1 | method | `Bun.ShellOutput.json` | `Bun.ShellOutput.json(): any;` | — | — | 0 | 1 | Read from stdout as a JSON object | `shell.d.ts:337` |
| 1 | property | `Bun.ShellOutput.stderr` | `Bun.ShellOutput.stderr: Buffer;` | — | — | 0 | 1 | — | `shell.d.ts:301` |
| 1 | property | `Bun.ShellOutput.stdout` | `Bun.ShellOutput.stdout: Buffer;` | — | — | 0 | 1 | — | `shell.d.ts:300` |
| 1 | method | `Bun.ShellOutput.text` | `Bun.ShellOutput.text(encoding?: BufferEncoding): string;` | — | — | 0 | 1 | Read from stdout as a string | `shell.d.ts:323` |
| 1 | method | `Bun.ShellPromise.arrayBuffer` | `Bun.ShellPromise.arrayBuffer(): Promise<ArrayBuffer>;` | — | — | 0 | 1 | Read from stdout as an ArrayBuffer | `shell.d.ts:177` |
| 1 | method | `Bun.ShellPromise.blob` | `Bun.ShellPromise.blob(): Promise<Blob>;` | — | — | 0 | 1 | Read from stdout as a Blob | `shell.d.ts:190` |
| 1 | method | `Bun.ShellPromise.cwd` | `Bun.ShellPromise.cwd(newCwd: string): this;` | — | — | 0 | 1 | Change the current working directory of the shell. | `shell.d.ts:97` |
| 1 | method | `Bun.ShellPromise.env` | `Bun.ShellPromise.env(newEnv: Record<string, string \| undefined> \| NodeJS.Dict<string> \| undefined): this;` | — | yes | 0 | 1 | Set environment variables for the shell. | `shell.d.ts:109` |
| 1 | method | `Bun.ShellPromise.json` | `Bun.ShellPromise.json(): Promise<any>;` | — | — | 0 | 1 | Read from stdout as a JSON object | `shell.d.ts:163` |
| 1 | method | `Bun.ShellPromise.lines` | `Bun.ShellPromise.lines(): AsyncIterable<string>;` | — | — | 0 | 1 | Read from stdout as a string, line by line | `shell.d.ts:124` |
| 1 | method | `Bun.ShellPromise.nothrow` | `Bun.ShellPromise.nothrow(): this;` | — | — | 0 | 1 | Configure the shell to not throw an exception on non-zero exit codes. Throwing can be re-enabled with `.throws(true)`. | `shell.d.ts:197` |
| 1 | method | `Bun.ShellPromise.quiet` | `Bun.ShellPromise.quiet(isQuiet?: boolean): this;` | — | — | 0 | 1 | By default, the shell will write to the current process's stdout and stderr, as well as buffering that output. | `shell.d.ts:117` |
| 1 | method | `Bun.ShellPromise.stdin` | `get Bun.ShellPromise.stdin(): WritableStream;` | — | — | 0 | 1 | — | `shell.d.ts:91` |
| 1 | method | `Bun.ShellPromise.text` | `Bun.ShellPromise.text(encoding?: BufferEncoding): Promise<string>;` | — | — | 0 | 1 | Read from stdout as a string. | `shell.d.ts:147` |
| 1 | method | `Bun.ShellPromise.throws` | `Bun.ShellPromise.throws(shouldThrow: boolean): this;` | — | — | 0 | 1 | Configure whether or not the shell should throw an exception on non-zero exit codes. | `shell.d.ts:204` |
| 1 | property | `Bun.SliceAnsiOptions.ambiguousIsNarrow` | `Bun.SliceAnsiOptions.ambiguousIsNarrow?: boolean;` | true | — | 0 | 1 | Count characters with East Asian Width "Ambiguous" as 1 column (narrow) | `bun.d.ts:637` |
| 1 | property | `Bun.SliceAnsiOptions.ellipsis` | `Bun.SliceAnsiOptions.ellipsis?: string;` | — | — | 0 | 1 | If set, and content was cut at either edge of the requested range, | `bun.d.ts:625` |
| 1 | property | `Bun.Socket.alpnProtocol` | `Bun.Socket.alpnProtocol: string \| false \| null;` | — | — | 0 | 1 | String containing the selected ALPN protocol. | `bun.d.ts:6037` |
| 1 | property | `Bun.Socket.authorized` | `Bun.Socket.authorized: boolean;` | — | — | 0 | 1 | This property is `true` if the peer certificate was signed by one of the CAs | `bun.d.ts:6030` |
| 1 | property | `Bun.Socket.bytesWritten` | `Bun.Socket.bytesWritten: number;` | — | — | 0 | 1 | The total number of bytes successfully written to the socket since it was established. | `bun.d.ts:6233` |
| 1 | method | `Bun.Socket.close` | `Bun.Socket.close(): void;` | — | — | 0 | 1 | Closes the socket. | `bun.d.ts:6301` |
| 1 | property | `Bun.Socket.data` | `Bun.Socket.data: Data;` | — | — | 0 | 1 | The user-defined data associated with this socket instance. | `bun.d.ts:5875` |
| 1 | method | `Bun.Socket.disableRenegotiation` | `Bun.Socket.disableRenegotiation(): void;` | — | — | 0 | 1 | Disables TLS renegotiation for this `Socket` instance. Once called, attempts | `bun.d.ts:6045` |
| 1 | method | `Bun.Socket.end` | `Bun.Socket.end(data?: string \| BufferSource, byteOffset?: number, byteLength?: number): number;` | — | — | 0 | 2 | Sends the final data chunk and initiates a graceful shutdown of the socket's write side. | `bun.d.ts:5895` |
| 1 | method | `Bun.Socket.exportKeyingMaterial` | `Bun.Socket.exportKeyingMaterial(length: number, label: string, context: Buffer): Buffer;` | — | — | 0 | 2 | Keying material is used for validations to prevent different kind of attacks in | `bun.d.ts:6072` |
| 1 | method | `Bun.Socket.flush` | `Bun.Socket.flush(): void;` | — | — | 0 | 1 | Flush any buffered data to the socket | `bun.d.ts:5978` |
| 1 | method | `Bun.Socket.getAuthorizationError` | `Bun.Socket.getAuthorizationError(): Error \| null;` | — | — | 0 | 1 | Returns the reason why the peer's certificate was not been verified. This | `bun.d.ts:6078` |
| 1 | method | `Bun.Socket.getCertificate` | `Bun.Socket.getCertificate(): import("tls").PeerCertificate \| object \| null;` | — | — | 0 | 1 | Returns an object representing the local certificate. The returned object has | `bun.d.ts:6087` |
| 1 | method | `Bun.Socket.getCipher` | `Bun.Socket.getCipher(): import("tls").CipherNameAndProtocol;` | — | — | 0 | 1 | Returns an object containing information on the negotiated cipher suite. | `bun.d.ts:6104` |
| 1 | method | `Bun.Socket.getEphemeralKeyInfo` | `Bun.Socket.getEphemeralKeyInfo(): import("tls").EphemeralKeyInfo \| object \| null;` | — | — | 0 | 1 | Returns an object representing the type, name, and size of parameter of | `bun.d.ts:6115` |
| 1 | method | `Bun.Socket.getPeerCertificate` | `Bun.Socket.getPeerCertificate(): import("node:tls").PeerCertificate;` | — | — | 0 | 1 | Returns an object representing the peer's certificate. If the peer does not | `bun.d.ts:6126` |
| 1 | method | `Bun.Socket.getPeerX509Certificate` | `Bun.Socket.getPeerX509Certificate(): import("node:crypto").X509Certificate;` | — | — | 0 | 1 | — | `bun.d.ts:6127` |
| 1 | method | `Bun.Socket.getServername` | `Bun.Socket.getServername(): string;` | — | — | 0 | 1 | Returns the servername of the socket. | `bun.d.ts:6308` |
| 1 | method | `Bun.Socket.getSession` | `Bun.Socket.getSession(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6266` |
| 1 | method | `Bun.Socket.getSharedSigalgs` | `Bun.Socket.getSharedSigalgs(): string[];` | — | — | 0 | 1 | See [SSL\_get\_shared\_sigalgs](https://www.openssl.org/docs/man1.1.1/man3/SSL_get_shared_sigalgs.html) for more information. | `bun.d.ts:6134` |
| 1 | method | `Bun.Socket.getTLSFinishedMessage` | `Bun.Socket.getTLSFinishedMessage(): Buffer \| undefined;` | — | — | 0 | 1 | As the `Finished` messages are message digests of the complete handshake | `bun.d.ts:6144` |
| 1 | method | `Bun.Socket.getTLSPeerFinishedMessage` | `Bun.Socket.getTLSPeerFinishedMessage(): Buffer \| undefined;` | — | — | 0 | 1 | As the `Finished` messages are message digests of the complete handshake | `bun.d.ts:6155` |
| 1 | method | `Bun.Socket.getTLSTicket` | `Bun.Socket.getTLSTicket(): Buffer \| undefined;` | — | — | 0 | 1 | For a client, returns the TLS session ticket if one is available, or`undefined`. For a server, always returns `undefined`. | `bun.d.ts:6164` |
| 1 | method | `Bun.Socket.getTLSVersion` | `Bun.Socket.getTLSVersion(): string;` | — | — | 0 | 1 | Returns a string containing the negotiated SSL/TLS protocol version of the | `bun.d.ts:6181` |
| 1 | method | `Bun.Socket.getX509Certificate` | `Bun.Socket.getX509Certificate(): import("node:crypto").X509Certificate \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:6088` |
| 1 | method | `Bun.Socket.isSessionReused` | `Bun.Socket.isSessionReused(): boolean;` | — | — | 0 | 1 | See `Session Resumption` for more information. | `bun.d.ts:6189` |
| 1 | property | `Bun.Socket.listener` | `Bun.Socket.listener?: SocketListener;` | — | — | 0 | 1 | Get the server that created this socket | `bun.d.ts:5992` |
| 1 | property | `Bun.Socket.localAddress` | `Bun.Socket.localAddress: string;` | — | — | 0 | 1 | Local IP address connected to the socket | `bun.d.ts:6018` |
| 1 | property | `Bun.Socket.localFamily` | `Bun.Socket.localFamily: "IPv4" \| "IPv6";` | — | — | 0 | 1 | IP protocol family used for the local endpoint of the socket | `bun.d.ts:6012` |
| 1 | property | `Bun.Socket.localPort` | `Bun.Socket.localPort: number;` | — | — | 0 | 1 | local port connected to the socket | `bun.d.ts:6024` |
| 1 | method | `Bun.Socket.pause` | `Bun.Socket.pause(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6251` |
| 1 | property | `Bun.Socket.readyState` | `Bun.Socket.readyState: -2 \| -1 \| 0 \| 1 \| 2;` | — | — | 0 | 1 | The ready state of the socket. | `bun.d.ts:5961` |
| 1 | method | `Bun.Socket.ref` | `Bun.Socket.ref(): void;` | — | — | 0 | 1 | Keep Bun's process alive at least until this socket is closed | `bun.d.ts:5908` |
| 1 | method | `Bun.Socket.reload` | `Bun.Socket.reload(options: Pick<SocketOptions<Data>, "socket">): void;` | — | — | 0 | 1 | Reset the socket's callbacks. This is useful with `bun --hot` to facilitate hot reloading. | `bun.d.ts:5985` |
| 1 | property | `Bun.Socket.remoteAddress` | `Bun.Socket.remoteAddress: string;` | — | — | 0 | 1 | Remote IP address connected to the socket | `bun.d.ts:6000` |
| 1 | property | `Bun.Socket.remoteFamily` | `Bun.Socket.remoteFamily: "IPv4" \| "IPv6";` | — | — | 0 | 1 | — | `bun.d.ts:5994` |
| 1 | property | `Bun.Socket.remotePort` | `Bun.Socket.remotePort: number;` | — | — | 0 | 1 | Remote port connected to the socket | `bun.d.ts:6006` |
| 1 | method | `Bun.Socket.renegotiate` | `Bun.Socket.renegotiate(): void;` | — | — | 0 | 1 | If this is a TLS Socket | `bun.d.ts:6256` |
| 1 | method | `Bun.Socket.resume` | `Bun.Socket.resume(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6249` |
| 1 | method | `Bun.Socket.setKeepAlive` | `Bun.Socket.setKeepAlive(enable?: boolean, initialDelay?: number): boolean;` | — | — | 0 | 1 | Enable/disable keep-alive functionality, and optionally set the initial delay before the first keepalive probe is sent on an idle socket. | `bun.d.ts:6227` |
| 1 | method | `Bun.Socket.setMaxSendFragment` | `Bun.Socket.setMaxSendFragment(size: number): boolean;` | — | — | 0 | 1 | The `socket.setMaxSendFragment()` method sets the maximum TLS fragment size. | `bun.d.ts:6203` |
| 1 | method | `Bun.Socket.setNoDelay` | `Bun.Socket.setNoDelay(noDelay?: boolean): boolean;` | — | — | 0 | 1 | Enable/disable the use of Nagle's algorithm. | `bun.d.ts:6211` |
| 1 | method | `Bun.Socket.setServername` | `Bun.Socket.setServername(name: string): void;` | — | — | 0 | 1 | Sets the servername of the socket. | `bun.d.ts:6315` |
| 1 | method | `Bun.Socket.setSession` | `Bun.Socket.setSession(session: string \| Buffer \| BufferSource): void;` | — | — | 0 | 1 | Sets the session of the socket. | `bun.d.ts:6273` |
| 1 | method | `Bun.Socket.setVerifyMode` | `Bun.Socket.setVerifyMode(requestCert: boolean, rejectUnauthorized: boolean): void;` | — | — | 0 | 1 | Sets the verify mode of the socket. | `bun.d.ts:6264` |
| 1 | method | `Bun.Socket.shutdown` | `Bun.Socket.shutdown(halfClose?: boolean): void;` | — | — | 0 | 1 | Shuts down the write-half or both halves of the connection. | `bun.d.ts:5948` |
| 1 | method | `Bun.Socket.terminate` | `Bun.Socket.terminate(): void;` | — | — | 0 | 1 | Forcefully closes the socket connection immediately. This is an abrupt termination, unlike the graceful shutdown initiated by `end()`. | `bun.d.ts:5929` |
| 1 | method | `Bun.Socket.timeout` | `Bun.Socket.timeout(seconds: number): void;` | — | — | 0 | 1 | Set a timeout until the socket automatically closes. | `bun.d.ts:5917` |
| 1 | method | `Bun.Socket.unref` | `Bun.Socket.unref(): void;` | — | — | 0 | 1 | Allow Bun's process to exit even if this socket is still open | `bun.d.ts:5968` |
| 1 | method | `Bun.Socket.upgradeTLS` | `Bun.Socket.upgradeTLS(options: TLSUpgradeOptions<Data>): [raw: Socket<Data>, tls: Socket<Data>];` | — | — | 0 | 1 | Upgrades the socket to a TLS socket. | `bun.d.ts:6291` |
| 1 | method | `Bun.Socket.write` | `Bun.Socket.write(data: string \| BufferSource, byteOffset?: number, byteLength?: number): number;` | — | yes | 0 | 1 | Writes `data` to the socket. This method is unbuffered and non-blocking. This uses the `sendto(2)` syscall internally. | `bun.d.ts:5859` |
| 1 | property | `Bun.SocketAddress.address` | `Bun.SocketAddress.address: string;` | — | — | 0 | 1 | The IP address of the client. | `bun.d.ts:4105` |
| 1 | property | `Bun.SocketAddress.family` | `Bun.SocketAddress.family: "IPv4" \| "IPv6";` | — | — | 0 | 1 | The IP family ("IPv4" or "IPv6"). | `bun.d.ts:4115` |
| 1 | property | `Bun.SocketAddress.port` | `Bun.SocketAddress.port: number;` | — | — | 0 | 1 | The port of the client. | `bun.d.ts:4110` |
| 1 | property | `Bun.SocketHandler.binaryType` | `Bun.SocketHandler.binaryType?: BinaryType;` | "buffer" | — | 0 | 1 | Choose what `ArrayBufferView` is returned in the {@link SocketHandler.data} callback. | `bun.d.ts:6410` |
| 1 | property | `Bun.SocketListener.data` | `Bun.SocketListener.data: Data;` | — | — | 0 | 1 | — | `bun.d.ts:6329` |
| 1 | method | `Bun.SocketListener.ref` | `Bun.SocketListener.ref(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6326` |
| 1 | method | `Bun.SocketListener.reload` | `Bun.SocketListener.reload(options: Pick<SocketOptions<Data>, "socket">): void;` | — | — | 0 | 1 | — | `bun.d.ts:6328` |
| 1 | method | `Bun.SocketListener.stop` | `Bun.SocketListener.stop(closeActiveConnections?: boolean): void;` | — | — | 0 | 1 | — | `bun.d.ts:6325` |
| 1 | method | `Bun.SocketListener.unref` | `Bun.SocketListener.unref(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6327` |
| 1 | property | `Bun.SocketOptions.allowHalfOpen` | `Bun.SocketOptions.allowHalfOpen?: boolean;` | false | — | 0 | 1 | Whether to allow half-open connections. | `bun.d.ts:6437` |
| 1 | property | `Bun.SocketOptions.data` | `Bun.SocketOptions.data?: Data;` | — | — | 0 | 1 | The per-instance data context | `bun.d.ts:6421` |
| 1 | property | `Bun.SocketOptions.socket` | `Bun.SocketOptions.socket: SocketHandler<Data>;` | — | — | 0 | 1 | Handlers for socket events | `bun.d.ts:6417` |
| 1 | interface | `Bun.Spawn.BaseOptions` | `Bun.Spawn.BaseOptions` | — | — | 0 | 1 | — | `bun.d.ts:6773` |
| 1 | type | `Bun.Spawn.OptionsObject` *(deprecated)* | `Bun.Spawn.OptionsObject` | — | — | 0 | 1 | — | `bun.d.ts:6771` |
| 1 | type | `Bun.Spawn.Readable` | `Bun.Spawn.Readable` | — | — | 0 | 1 | Option for stdout/stderr | `bun.d.ts:6741` |
| 1 | type | `Bun.Spawn.ReadableToIO` | `Bun.Spawn.ReadableToIO` | — | — | 0 | 1 | — | `bun.d.ts:7133` |
| 1 | type | `Bun.Spawn.ReadableToSyncIO` | `Bun.Spawn.ReadableToSyncIO` | — | — | 0 | 1 | — | `bun.d.ts:7139` |
| 1 | interface | `Bun.Spawn.SpawnOptions` | `Bun.Spawn.SpawnOptions` | — | — | 0 | 1 | — | `bun.d.ts:7070` |
| 1 | interface | `Bun.Spawn.SpawnSyncOptions` | `Bun.Spawn.SpawnSyncOptions` | — | — | 0 | 1 | — | `bun.d.ts:7067` |
| 1 | type | `Bun.Spawn.Writable` | `Bun.Spawn.Writable` | — | — | 0 | 1 | Option for stdin | `bun.d.ts:6754` |
| 1 | type | `Bun.Spawn.WritableIO` | `Bun.Spawn.WritableIO` | — | — | 0 | 1 | — | `bun.d.ts:7141` |
| 1 | type | `Bun.Spawn.WritableToIO` | `Bun.Spawn.WritableToIO` | — | — | 0 | 1 | — | `bun.d.ts:7143` |
| 1 | method | `Bun.SQL.array` | `Bun.SQL.array(values: any[], typeNameOrTypeID?: number \| ArrayType): SQLArrayParameter;` | — | — | 0 | 1 | Creates a new SQL array parameter | `sql.d.ts:722` |
| 1 | type | `Bun.SQL.AwaitPromisesArray` | `Bun.SQL.AwaitPromisesArray` | — | — | 0 | 1 | — | `sql.d.ts:162` |
| 1 | method | `Bun.SQL.begin` | `Bun.SQL.begin(fn: SQL.TransactionContextCallback<T>): Promise<SQL.ContextCallbackResult<T>>;` | — | — | 0 | 2 | Begins a new transaction. | `sql.d.ts:750` |
| 1 | method | `Bun.SQL.beginDistributed` | `Bun.SQL.beginDistributed( name: string, fn: SQL.TransactionContextCallback<T>, ): Promise<SQL.ContextCallbackResult<T>>;` | — | — | 0 | 1 | Begins a distributed transaction | `sql.d.ts:858` |
| 1 | method | `Bun.SQL.close` | `Bun.SQL.close(options?: { timeout?: number }): Promise<void>;` | — | — | 0 | 1 | Closes the database connection with optional timeout in seconds. If timeout is 0, it will close immediately, if is not provided it will wait for all queries … | `sql.d.ts:653` |
| 1 | method | `Bun.SQL.commitDistributed` | `Bun.SQL.commitDistributed(name: string): Promise<void>;` | — | — | 0 | 1 | Commits a distributed transaction also know as prepared transaction in postgres or XA transaction in MySQL | `sql.d.ts:618` |
| 1 | method | `Bun.SQL.connect` | `Bun.SQL.connect(): Promise<SQL>;` | — | — | 0 | 1 | Waits for the database connection to be established | `sql.d.ts:641` |
| 1 | property | `Bun.SQL.connectionString` | `Bun.SQL.connectionString: string \| URL,` | — | — | 0 | 1 | — | `sql.d.ts:585` |
| 1 | type | `Bun.SQL.ContextCallback` | `Bun.SQL.ContextCallback` | — | — | 0 | 1 | — | `sql.d.ts:167` |
| 1 | type | `Bun.SQL.ContextCallbackResult` | `Bun.SQL.ContextCallbackResult` | — | — | 0 | 1 | — | `sql.d.ts:166` |
| 1 | method | `Bun.SQL.distributed` | `Bun.SQL.distributed(name: string, fn: SQL.TransactionContextCallback<T>): Promise<SQL.ContextCallbackResult<T>>;` | — | — | 0 | 1 | Alternative method to begin a distributed transaction | `sql.d.ts:866` |
| 1 | method | `Bun.SQL.end` | `Bun.SQL.end(options?: { timeout?: number }): Promise<void>;` | — | — | 0 | 1 | Closes the database connection with optional timeout in seconds. If timeout is 0, it will close immediately, if is not provided it will wait for all queries … | `sql.d.ts:666` |
| 1 | method | `Bun.SQL.file` | `Bun.SQL.file(filename: string, values?: any[]): SQL.Query<T>;` | — | yes | 0 | 1 | Reads a file and uses the contents as a query. | `sql.d.ts:882` |
| 1 | method | `Bun.SQL.flush` | `Bun.SQL.flush(): void;` | — | — | 0 | 1 | Flushes any pending operations | `sql.d.ts:678` |
| 1 | property | `Bun.SQL.fn` | `Bun.SQL.fn: SQL.TransactionContextCallback<T>,` | — | — | 0 | 1 | — | `sql.d.ts:860` |
| 1 | interface | `Bun.SQL.Helper` | `Bun.SQL.Helper` | — | — | 0 | 1 | SQL.Helper represents a parameter or serializable | `sql.d.ts:479` |
| 1 | class | `Bun.SQL.MySQLError` | `new Bun.SQL.MySQLError(…)` | — | — | 0 | 1 | — | `sql.d.ts:147` |
| 1 | property | `Bun.SQL.name` | `Bun.SQL.name: string,` | — | — | 0 | 1 | — | `sql.d.ts:859` |
| 1 | property | `Bun.SQL.obj` | `Bun.SQL.obj: T \| T[] \| readonly T[],` | — | — | 0 | 1 | — | `sql.d.ts:538` |
| 1 | property | `Bun.SQL.options` | `Bun.SQL.options: Bun.__internal.DistributedOmit<SQL.Options, "url" \| "filename">,` | — | — | 0 | 2 | — | `sql.d.ts:586` |
| 1 | type | `Bun.SQL.Options` | `Bun.SQL.Options` | — | — | 0 | 1 | Configuration options for SQL client connection and behavior | `sql.d.ts:413` |
| 1 | class | `Bun.SQL.PostgresError` | `new Bun.SQL.PostgresError(…)` | — | — | 0 | 1 | — | `sql.d.ts:104` |
| 1 | interface | `Bun.SQL.PostgresOrMySQLOptions` | `Bun.SQL.PostgresOrMySQLOptions` | — | — | 0 | 1 | — | `sql.d.ts:200` |
| 1 | interface | `Bun.SQL.Query` | `Bun.SQL.Query` | — | — | 0 | 1 | Represents a SQL query that can be executed, with additional control | `sql.d.ts:419` |
| 1 | method | `Bun.SQL.reserve` | `Bun.SQL.reserve(): Promise<ReservedSQL>;` | — | — | 0 | 1 | The reserve method pulls out a connection from the pool, and returns a client that wraps the single connection. | `sql.d.ts:707` |
| 1 | method | `Bun.SQL.rollbackDistributed` | `Bun.SQL.rollbackDistributed(name: string): Promise<void>;` | — | — | 0 | 1 | Rolls back a distributed transaction also know as prepared transaction in postgres or XA transaction in MySQL | `sql.d.ts:632` |
| 1 | type | `Bun.SQL.SavepointContextCallback` | `Bun.SQL.SavepointContextCallback` | — | — | 0 | 1 | Callback function type for savepoint contexts | `sql.d.ts:467` |
| 1 | class | `Bun.SQL.SQLError` | `new Bun.SQL.SQLError(…)` | — | — | 0 | 1 | — | `sql.d.ts:100` |
| 1 | class | `Bun.SQL.SQLiteError` | `new Bun.SQL.SQLiteError(…)` | — | — | 0 | 1 | — | `sql.d.ts:154` |
| 1 | interface | `Bun.SQL.SQLiteOptions` | `Bun.SQL.SQLiteOptions` | — | — | 0 | 1 | — | `sql.d.ts:169` |
| 1 | method | `Bun.SQL.transaction` | `Bun.SQL.transaction(fn: SQL.TransactionContextCallback<T>): Promise<SQL.ContextCallbackResult<T>>;` | — | — | 0 | 2 | Alternative method to begin a transaction. | `sql.d.ts:807` |
| 1 | type | `Bun.SQL.TransactionContextCallback` | `Bun.SQL.TransactionContextCallback` | — | — | 0 | 1 | Callback function type for transaction contexts | `sql.d.ts:461` |
| 1 | method | `Bun.SQL.unsafe` | `Bun.SQL.unsafe(string: string, values?: any[]): SQL.Query<T>;` | — | — | 0 | 1 | If you know what you're doing, you can use unsafe to pass any string you'd like. | `sql.d.ts:874` |
| 1 | property | `Bun.SQLArrayParameter.arrayType` | `Bun.SQLArrayParameter.arrayType: ArrayType;` | — | — | 0 | 1 | The type of the array parameter | `sql.d.ts:74` |
| 1 | property | `Bun.SQLArrayParameter.serializedValues` | `Bun.SQLArrayParameter.serializedValues: string;` | — | — | 0 | 1 | The serialized values of the array parameter | `sql.d.ts:70` |
| 1 | property | `Bun.StringWidthOptions.ambiguousIsNarrow` | `Bun.StringWidthOptions.ambiguousIsNarrow?: boolean;` | true | — | 0 | 1 | When it's ambiugous and `true`, count emoji as 1 characters wide. If `false`, emoji are counted as 2 character wide. | `bun.d.ts:560` |
| 1 | property | `Bun.StringWidthOptions.countAnsiEscapeCodes` | `Bun.StringWidthOptions.countAnsiEscapeCodes?: boolean;` | false | — | 0 | 1 | If `true`, count ANSI escape codes as part of the string width. If `false`, ANSI escape codes are ignored when calculating the string width. | `bun.d.ts:553` |
| 1 | property | `Bun.StructuredSerializeOptions.transfer` | `Bun.StructuredSerializeOptions.transfer?: Bun.Transferable[];` | — | — | 0 | 1 | — | `bun.d.ts:196` |
| 1 | method | `Bun.Subprocess.disconnect` | `Bun.Subprocess.disconnect(): void;` | — | — | 0 | 1 | Disconnect the IPC channel to the subprocess. This is only supported if the subprocess | `bun.d.ts:7356` |
| 1 | property | `Bun.Subprocess.exitCode` | `Bun.Subprocess.exitCode: number \| null;` | — | — | 0 | 1 | Synchronously get the exit code of the process | `bun.d.ts:7304` |
| 1 | property | `Bun.Subprocess.exited` | `Bun.Subprocess.exited: Promise<number>;` | — | — | 0 | 1 | The exit code of the process | `bun.d.ts:7297` |
| 1 | method | `Bun.Subprocess.kill` | `Bun.Subprocess.kill(exitCode?: number \| NodeJS.Signals): void;` | — | — | 0 | 1 | Kill the process | `bun.d.ts:7327` |
| 1 | property | `Bun.Subprocess.killed` | `Bun.Subprocess.killed: boolean;` | — | — | 0 | 1 | Has the process exited? | `bun.d.ts:7321` |
| 1 | property | `Bun.Subprocess.pid` | `Bun.Subprocess.pid: number;` | — | — | 0 | 1 | The process ID of the child process | `bun.d.ts:7290` |
| 1 | property | `Bun.Subprocess.readable` | `Bun.Subprocess.readable: SpawnOptions.ReadableToIO<Out>;` | — | — | 0 | 1 | This returns the same value as {@link Subprocess.stdout} | `bun.d.ts:7280` |
| 1 | method | `Bun.Subprocess.ref` | `Bun.Subprocess.ref(): void;` | — | — | 0 | 1 | This method will tell Bun to wait for this process to exit after you already | `bun.d.ts:7335` |
| 1 | method | `Bun.Subprocess.resourceUsage` | `Bun.Subprocess.resourceUsage(): ResourceUsage \| undefined;` | — | — | 0 | 1 | Get the resource usage information of the process (max RSS, CPU time, etc) | `bun.d.ts:7365` |
| 1 | method | `Bun.Subprocess.send` | `Bun.Subprocess.send(message: any): void;` | — | — | 0 | 1 | Send a message to the subprocess. This is only supported if the subprocess | `bun.d.ts:7350` |
| 1 | property | `Bun.Subprocess.signalCode` | `Bun.Subprocess.signalCode: NodeJS.Signals \| null;` | — | — | 0 | 1 | Synchronously get the signal code of the process | `bun.d.ts:7316` |
| 1 | property | `Bun.Subprocess.stderr` | `Bun.Subprocess.stderr: SpawnOptions.ReadableToIO<Err>;` | — | — | 0 | 1 | — | `bun.d.ts:7243` |
| 1 | property | `Bun.Subprocess.stdin` | `Bun.Subprocess.stdin: SpawnOptions.WritableToIO<In>;` | — | — | 0 | 1 | — | `bun.d.ts:7241` |
| 1 | property | `Bun.Subprocess.stdio` | `Bun.Subprocess.stdio: [null, null, null, ...(number \| null)[]];` | — | — | 0 | 1 | Access extra file descriptors passed to the `stdio` option in the options object. | `bun.d.ts:7273` |
| 1 | property | `Bun.Subprocess.stdout` | `Bun.Subprocess.stdout: SpawnOptions.ReadableToIO<Out>;` | — | — | 0 | 1 | — | `bun.d.ts:7242` |
| 1 | property | `Bun.Subprocess.terminal` | `Bun.Subprocess.terminal: Terminal \| undefined;` | — | — | 0 | 1 | The terminal attached to this subprocess, if spawned with the `terminal` option. | `bun.d.ts:7261` |
| 1 | method | `Bun.Subprocess.unref` | `Bun.Subprocess.unref(): void;` | — | — | 0 | 1 | Before shutting down, Bun will wait for all subprocesses to exit by default | `bun.d.ts:7342` |
| 1 | property | `Bun.SyncSubprocess.exitCode` | `Bun.SyncSubprocess.exitCode: number;` | — | — | 0 | 1 | — | `bun.d.ts:7381` |
| 1 | property | `Bun.SyncSubprocess.exitedDueToMaxBuffer` | `Bun.SyncSubprocess.exitedDueToMaxBuffer?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:7390` |
| 1 | property | `Bun.SyncSubprocess.exitedDueToTimeout` | `Bun.SyncSubprocess.exitedDueToTimeout?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:7389` |
| 1 | property | `Bun.SyncSubprocess.pid` | `Bun.SyncSubprocess.pid: number;` | — | — | 0 | 1 | — | `bun.d.ts:7391` |
| 1 | property | `Bun.SyncSubprocess.resourceUsage` | `Bun.SyncSubprocess.resourceUsage: ResourceUsage;` | — | — | 0 | 1 | Get the resource usage information of the process (max RSS, CPU time, etc) | `bun.d.ts:7386` |
| 1 | property | `Bun.SyncSubprocess.signalCode` | `Bun.SyncSubprocess.signalCode?: string;` | — | — | 0 | 1 | — | `bun.d.ts:7388` |
| 1 | property | `Bun.SyncSubprocess.stderr` | `Bun.SyncSubprocess.stderr: SpawnOptions.ReadableToSyncIO<Err>;` | — | — | 0 | 1 | — | `bun.d.ts:7380` |
| 1 | property | `Bun.SyncSubprocess.stdout` | `Bun.SyncSubprocess.stdout: SpawnOptions.ReadableToSyncIO<Out>;` | — | — | 0 | 1 | — | `bun.d.ts:7379` |
| 1 | property | `Bun.SyncSubprocess.success` | `Bun.SyncSubprocess.success: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:7382` |
| 1 | property | `Bun.SystemError.code` | `Bun.SystemError.code?: string \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:1743` |
| 1 | property | `Bun.SystemError.errno` | `Bun.SystemError.errno?: number \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:1742` |
| 1 | property | `Bun.SystemError.path` | `Bun.SystemError.path?: string \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:1744` |
| 1 | property | `Bun.SystemError.syscall` | `Bun.SystemError.syscall?: string \| undefined;` | — | — | 0 | 1 | — | `bun.d.ts:1745` |
| 1 | property | `Bun.TCPSocketConnectOptions.exclusive` | `Bun.TCPSocketConnectOptions.exclusive?: boolean;` | false | — | 0 | 1 | Whether to use exclusive mode. | `bun.d.ts:6513` |
| 1 | property | `Bun.TCPSocketConnectOptions.hostname` | `Bun.TCPSocketConnectOptions.hostname: string;` | — | — | 0 | 1 | The hostname to connect to | `bun.d.ts:6490` |
| 1 | property | `Bun.TCPSocketConnectOptions.ipv6Only` | `Bun.TCPSocketConnectOptions.ipv6Only?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6515` |
| 1 | property | `Bun.TCPSocketConnectOptions.port` | `Bun.TCPSocketConnectOptions.port: number;` | — | — | 0 | 1 | The port to connect to | `bun.d.ts:6494` |
| 1 | property | `Bun.TCPSocketConnectOptions.reusePort` | `Bun.TCPSocketConnectOptions.reusePort?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6514` |
| 1 | property | `Bun.TCPSocketConnectOptions.tls` | `Bun.TCPSocketConnectOptions.tls?: TLSOptions \| boolean;` | — | — | 0 | 1 | TLS Configuration with which to create the socket | `bun.d.ts:6498` |
| 1 | property | `Bun.TCPSocketListener.hostname` | `Bun.TCPSocketListener.hostname: string;` | — | — | 0 | 1 | — | `bun.d.ts:6333` |
| 1 | property | `Bun.TCPSocketListener.port` | `Bun.TCPSocketListener.port: number;` | — | — | 0 | 1 | — | `bun.d.ts:6332` |
| 1 | property | `Bun.TCPSocketListenOptions.allowHalfOpen` | `Bun.TCPSocketListenOptions.allowHalfOpen?: boolean;` | false | — | 0 | 1 | Whether to allow half-open connections. | `bun.d.ts:6483` |
| 1 | property | `Bun.TCPSocketListenOptions.exclusive` | `Bun.TCPSocketListenOptions.exclusive?: boolean;` | false | — | 0 | 1 | Whether to use exclusive mode. | `bun.d.ts:6467` |
| 1 | property | `Bun.TCPSocketListenOptions.hostname` | `Bun.TCPSocketListenOptions.hostname: string;` | — | — | 0 | 1 | The hostname to listen on | `bun.d.ts:6444` |
| 1 | property | `Bun.TCPSocketListenOptions.port` | `Bun.TCPSocketListenOptions.port: number;` | — | — | 0 | 1 | The port to listen on | `bun.d.ts:6448` |
| 1 | property | `Bun.TCPSocketListenOptions.tls` | `Bun.TCPSocketListenOptions.tls?: TLSOptions \| boolean;` | — | — | 0 | 1 | The TLS configuration object with which to create the server | `bun.d.ts:6452` |
| 1 | method | `Bun.Terminal.close` | `Bun.Terminal.close(): void;` | — | — | 0 | 1 | Close the terminal. | `bun.d.ts:7950` |
| 1 | property | `Bun.Terminal.closed` | `Bun.Terminal.closed: boolean;` | — | — | 0 | 1 | Whether the terminal is closed. | `bun.d.ts:7914` |
| 1 | property | `Bun.Terminal.controlFlags` | `Bun.Terminal.controlFlags: number;` | — | — | 0 | 1 | Terminal control flags (c_cflag from termios). | `bun.d.ts:7987` |
| 1 | property | `Bun.Terminal.inputFlags` | `Bun.Terminal.inputFlags: number;` | — | — | 0 | 1 | Terminal input flags (c_iflag from termios). | `bun.d.ts:7963` |
| 1 | property | `Bun.Terminal.localFlags` | `Bun.Terminal.localFlags: number;` | — | — | 0 | 1 | Terminal local flags (c_lflag from termios). | `bun.d.ts:7979` |
| 1 | property | `Bun.Terminal.outputFlags` | `Bun.Terminal.outputFlags: number;` | — | — | 0 | 1 | Terminal output flags (c_oflag from termios). | `bun.d.ts:7971` |
| 1 | method | `Bun.Terminal.ref` | `Bun.Terminal.ref(): void;` | — | — | 0 | 1 | Reference the terminal to keep the event loop alive. | `bun.d.ts:7940` |
| 1 | method | `Bun.Terminal.resize` | `Bun.Terminal.resize(cols: number, rows: number): void;` | — | — | 0 | 1 | Resize the terminal. | `bun.d.ts:7928` |
| 1 | method | `Bun.Terminal.setRawMode` | `Bun.Terminal.setRawMode(enabled: boolean): void;` | — | — | 0 | 1 | Set raw mode on the terminal. | `bun.d.ts:7935` |
| 1 | method | `Bun.Terminal.unref` | `Bun.Terminal.unref(): void;` | — | — | 0 | 1 | Unreference the terminal to allow the event loop to exit. | `bun.d.ts:7945` |
| 1 | method | `Bun.Terminal.write` | `Bun.Terminal.write(data: string \| BufferSource): number;` | — | yes | 0 | 1 | Write data to the terminal. | `bun.d.ts:7921` |
| 1 | property | `Bun.TerminalOptions.cols` | `Bun.TerminalOptions.cols?: number;` | 80 | — | 0 | 1 | Number of columns for the terminal. | `bun.d.ts:7850` |
| 1 | property | `Bun.TerminalOptions.data` | `Bun.TerminalOptions.data?: (terminal: Terminal, data: Uint8Array<ArrayBuffer>)` | — | — | 0 | 1 | Callback invoked when data is received from the terminal. | `bun.d.ts:7866` |
| 1 | property | `Bun.TerminalOptions.drain` | `Bun.TerminalOptions.drain?: (terminal: Terminal)` | — | — | 0 | 1 | Callback invoked when the terminal is ready to receive more data. | `bun.d.ts:7880` |
| 1 | property | `Bun.TerminalOptions.exit` | `Bun.TerminalOptions.exit?: (terminal: Terminal, exitCode: number, signal: string \| null)` | — | — | 0 | 1 | Callback invoked when the PTY stream closes (EOF or read error). | `bun.d.ts:7875` |
| 1 | property | `Bun.TerminalOptions.name` | `Bun.TerminalOptions.name?: string;` | "xterm-256color" | — | 0 | 1 | Terminal name (e.g., "xterm-256color"). | `bun.d.ts:7860` |
| 1 | property | `Bun.TerminalOptions.rows` | `Bun.TerminalOptions.rows?: number;` | 24 | — | 0 | 1 | Number of rows for the terminal. | `bun.d.ts:7855` |
| 1 | property | `Bun.TLSOptions.ALPNProtocols` | `Bun.TLSOptions.ALPNProtocols?: string \| BufferSource;` | — | — | 0 | 1 | — | `bun.d.ts:4092` |
| 1 | property | `Bun.TLSOptions.ca` | `Bun.TLSOptions.ca?: string \| BufferSource \| BunFile \| Array<string \| BufferSource \| BunFile> \| undefined;` | — | — | 0 | 1 | Optionally override the trusted CA certificates. Default is to trust | `bun.d.ts:4061` |
| 1 | property | `Bun.TLSOptions.caFile` *(deprecated)* | `Bun.TLSOptions.caFile?: string;` | — | — | 0 | 1 | File path to a .pem file for a custom root CA | `deprecated.d.ts:150` |
| 1 | property | `Bun.TLSOptions.cert` | `Bun.TLSOptions.cert?: string \| BufferSource \| BunFile \| Array<string \| BufferSource \| BunFile> \| undefined;` | — | — | 0 | 1 | Cert chains in PEM format. One cert chain should be provided per | `bun.d.ts:4073` |
| 1 | property | `Bun.TLSOptions.certFile` *(deprecated)* | `Bun.TLSOptions.certFile?: string;` | — | — | 0 | 1 | File path to a TLS certificate | `deprecated.d.ts:143` |
| 1 | property | `Bun.TLSOptions.ciphers` | `Bun.TLSOptions.ciphers?: string;` | — | — | 0 | 1 | — | `bun.d.ts:4094` |
| 1 | property | `Bun.TLSOptions.clientRenegotiationLimit` | `Bun.TLSOptions.clientRenegotiationLimit?: number;` | — | — | 0 | 1 | — | `bun.d.ts:4096` |
| 1 | property | `Bun.TLSOptions.clientRenegotiationWindow` | `Bun.TLSOptions.clientRenegotiationWindow?: number;` | — | — | 0 | 1 | — | `bun.d.ts:4098` |
| 1 | property | `Bun.TLSOptions.dhParamsFile` | `Bun.TLSOptions.dhParamsFile?: string;` | — | — | 0 | 1 | File path to a .pem file custom Diffie Helman parameters | `bun.d.ts:4029` |
| 1 | property | `Bun.TLSOptions.key` | `Bun.TLSOptions.key?: string \| BufferSource \| BunFile \| Array<string \| BufferSource \| BunFile> \| undefined;` | — | — | 0 | 1 | Private keys in PEM format. PEM allows the option of private keys | `bun.d.ts:4084` |
| 1 | property | `Bun.TLSOptions.keyFile` *(deprecated)* | `Bun.TLSOptions.keyFile?: string;` | — | — | 0 | 1 | File path to a TLS key | `deprecated.d.ts:134` |
| 1 | property | `Bun.TLSOptions.lowMemoryMode` | `Bun.TLSOptions.lowMemoryMode?: boolean;` | false | — | 0 | 1 | This sets `OPENSSL_RELEASE_BUFFERS` to 1. | `bun.d.ts:4041` |
| 1 | property | `Bun.TLSOptions.passphrase` | `Bun.TLSOptions.passphrase?: string;` | — | — | 0 | 1 | Passphrase for the TLS key | `bun.d.ts:4024` |
| 1 | property | `Bun.TLSOptions.rejectUnauthorized` | `Bun.TLSOptions.rejectUnauthorized?: boolean;` | — | — | 0 | 1 | If set to `false`, any certificate is accepted. | `bun.d.ts:4047` |
| 1 | property | `Bun.TLSOptions.requestCert` | `Bun.TLSOptions.requestCert?: boolean;` | — | — | 0 | 1 | If set to `true`, the server will request a client certificate. | `bun.d.ts:4054` |
| 1 | property | `Bun.TLSOptions.secureOptions` | `Bun.TLSOptions.secureOptions?: number \| undefined; // Value is a numeric bitmask of the `SSL_OP_*` options` | — | — | 0 | 1 | Optionally affect the OpenSSL protocol behavior, which is not | `bun.d.ts:4090` |
| 1 | property | `Bun.TLSOptions.serverName` | `Bun.TLSOptions.serverName?: string;` | — | — | 0 | 1 | Explicitly set a server name | `bun.d.ts:4034` |
| 1 | property | `Bun.TLSUpgradeOptions.data` | `Bun.TLSUpgradeOptions.data?: Data;` | — | — | 0 | 1 | — | `bun.d.ts:6319` |
| 1 | property | `Bun.TLSUpgradeOptions.socket` | `Bun.TLSUpgradeOptions.socket: SocketHandler<Data>;` | — | — | 0 | 1 | — | `bun.d.ts:6321` |
| 1 | property | `Bun.TLSUpgradeOptions.tls` | `Bun.TLSUpgradeOptions.tls: TLSOptions \| boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6320` |
| 1 | function | `Bun.TOML.parse` | `Bun.TOML.parse(input: string): object;` | — | yes | 96 | 1 | Parse a TOML string into a JavaScript object. | `bun.d.ts:793` |
| 1 | method | `Bun.TransactionSQL.reserve` | `Bun.TransactionSQL.reserve(): Promise<ReservedSQL>;` | — | — | 0 | 1 | The reserve method pulls out a connection from the pool, and returns a | `sql.d.ts:96` |
| 1 | method | `Bun.TransactionSQL.savepoint` | `Bun.TransactionSQL.savepoint(name: string, fn: SQL.SavepointContextCallback<T>): Promise<T>;` | — | — | 0 | 2 | Creates a savepoint within the current transaction | `sql.d.ts:85` |
| 1 | method | `Bun.Transpiler.scan` | `Bun.Transpiler.scan(code: Bun.StringOrBuffer): { exports: string[]; imports: Import[] };` | — | — | 5 | 1 | Get a list of import paths and paths from a TypeScript, JSX, TSX, or JavaScript file. | `bun.d.ts:2574` |
| 1 | method | `Bun.Transpiler.scanImports` | `Bun.Transpiler.scanImports(code: Bun.StringOrBuffer): Import[];` | — | — | 5 | 1 | Get a list of import paths from a TypeScript, JSX, TSX, or JavaScript file. | `bun.d.ts:2591` |
| 1 | method | `Bun.Transpiler.transform` | `Bun.Transpiler.transform(code: Bun.StringOrBuffer, loader?: JavaScriptLoader): Promise<string>;` | — | — | 0 | 1 | Transpile code from TypeScript or JSX into valid JavaScript. | `bun.d.ts:2538` |
| 1 | method | `Bun.Transpiler.transformSync` | `Bun.Transpiler.transformSync(code: Bun.StringOrBuffer, loader: JavaScriptLoader, ctx: object): string;` | — | — | 0 | 3 | Transpile code from TypeScript or JSX into valid JavaScript. | `bun.d.ts:2544` |
| 1 | property | `Bun.TranspilerOptions.allowBunRuntime` | `Bun.TranspilerOptions.allowBunRuntime?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2455` |
| 1 | property | `Bun.TranspilerOptions.autoImportJSX` | `Bun.TranspilerOptions.autoImportJSX?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2454` |
| 1 | property | `Bun.TranspilerOptions.deadCodeElimination` | `Bun.TranspilerOptions.deadCodeElimination?: boolean;` | — | — | 0 | 1 | **Experimental** | `bun.d.ts:2477` |
| 1 | property | `Bun.TranspilerOptions.define` | `Bun.TranspilerOptions.define?: Record<string, string>;` | — | — | 0 | 1 | Replace key with value. Value must be a JSON string. | `bun.d.ts:2399` |
| 1 | property | `Bun.TranspilerOptions.exports` | `Bun.TranspilerOptions.exports?: {` | — | — | 0 | 1 | — | `bun.d.ts:2456` |
| 1 | property | `Bun.TranspilerOptions.inline` | `Bun.TranspilerOptions.inline?: boolean;` | — | — | 0 | 1 | This does two things (and possibly more in the future): | `bun.d.ts:2491` |
| 1 | property | `Bun.TranspilerOptions.jsxOptimizationInline` | `Bun.TranspilerOptions.jsxOptimizationInline?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2462` |
| 1 | property | `Bun.TranspilerOptions.loader` | `Bun.TranspilerOptions.loader?: JavaScriptLoader;` | — | — | 0 | 1 | What is the default loader used for this transpiler? | `bun.d.ts:2402` |
| 1 | property | `Bun.TranspilerOptions.logLevel` | `Bun.TranspilerOptions.logLevel?: "verbose" \| "debug" \| "info" \| "warn" \| "error";` | "warn" | — | 0 | 1 | — | `bun.d.ts:2496` |
| 1 | property | `Bun.TranspilerOptions.macro` | `Bun.TranspilerOptions.macro?: MacroMap;` | — | — | 0 | 1 | Replace an import statement with a macro. | `bun.d.ts:2452` |
| 1 | property | `Bun.TranspilerOptions.minifyWhitespace` | `Bun.TranspilerOptions.minifyWhitespace?: boolean;` | — | — | 0 | 1 | **Experimental** | `bun.d.ts:2469` |
| 1 | property | `Bun.TranspilerOptions.replMode` | `Bun.TranspilerOptions.replMode?: boolean;` | false | — | 0 | 1 | Enable REPL mode transforms: | `bun.d.ts:2507` |
| 1 | property | `Bun.TranspilerOptions.target` | `Bun.TranspilerOptions.target?: Target;` | — | — | 0 | 1 | — | `bun.d.ts:2406` |
| 1 | property | `Bun.TranspilerOptions.treeShaking` | `Bun.TranspilerOptions.treeShaking?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2460` |
| 1 | property | `Bun.TranspilerOptions.trimUnusedImports` | `Bun.TranspilerOptions.trimUnusedImports?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2461` |
| 1 | property | `Bun.TranspilerOptions.tsconfig` | `Bun.TranspilerOptions.tsconfig?: string \| TSConfig;` | — | — | 0 | 1 | TSConfig.json file as stringified JSON or an object | `bun.d.ts:2413` |
| 1 | property | `Bun.TSConfig.compilerOptions` | `Bun.TSConfig.compilerOptions?: {` | — | — | 0 | 1 | — | `bun.d.ts:2376` |
| 1 | interface | `Bun.udp.BaseUDPSocket` | `Bun.udp.BaseUDPSocket` | — | — | 0 | 1 | — | `bun.d.ts:6627` |
| 1 | interface | `Bun.udp.ConnectedSocket` | `Bun.udp.ConnectedSocket` | — | — | 0 | 1 | — | `bun.d.ts:6699` |
| 1 | interface | `Bun.udp.ConnectedSocketHandler` | `Bun.udp.ConnectedSocketHandler` | — | — | 0 | 1 | — | `bun.d.ts:6597` |
| 1 | interface | `Bun.udp.ConnectSocketOptions` | `Bun.udp.ConnectSocketOptions` | — | — | 0 | 1 | — | `bun.d.ts:6616` |
| 1 | type | `Bun.udp.Data` | `Bun.udp.Data` | — | — | 0 | 1 | — | `bun.d.ts:6571` |
| 1 | interface | `Bun.udp.ReceiveFlags` | `Bun.udp.ReceiveFlags` | — | — | 0 | 1 | Extra metadata passed to the `data` callback for each received datagram. | `bun.d.ts:6576` |
| 1 | interface | `Bun.udp.Socket` | `Bun.udp.Socket` | — | — | 0 | 1 | — | `bun.d.ts:6706` |
| 1 | interface | `Bun.udp.SocketHandler` | `Bun.udp.SocketHandler` | — | — | 0 | 1 | — | `bun.d.ts:6585` |
| 1 | interface | `Bun.udp.SocketOptions` | `Bun.udp.SocketOptions` | — | — | 0 | 1 | — | `bun.d.ts:6609` |
| 1 | property | `Bun.UnderlyingSink.abort` | `Bun.UnderlyingSink.abort?: UnderlyingSinkAbortCallback;` | — | — | 0 | 1 | — | `bun.d.ts:298` |
| 1 | property | `Bun.UnderlyingSink.close` | `Bun.UnderlyingSink.close?: UnderlyingSinkCloseCallback;` | — | — | 0 | 1 | — | `bun.d.ts:299` |
| 1 | property | `Bun.UnderlyingSink.start` | `Bun.UnderlyingSink.start?: UnderlyingSinkStartCallback;` | — | — | 0 | 1 | — | `bun.d.ts:300` |
| 1 | property | `Bun.UnderlyingSink.write` | `Bun.UnderlyingSink.write?: UnderlyingSinkWriteCallback<W>;` | — | yes | 0 | 1 | — | `bun.d.ts:302` |
| 1 | property | `Bun.UnderlyingSource.cancel` | `Bun.UnderlyingSource.cancel?: UnderlyingSourceCancelCallback;` | — | — | 0 | 1 | — | `bun.d.ts:306` |
| 1 | property | `Bun.UnderlyingSource.pull` | `Bun.UnderlyingSource.pull?: UnderlyingSourcePullCallback<R>;` | — | — | 0 | 1 | — | `bun.d.ts:307` |
| 1 | property | `Bun.UnderlyingSource.start` | `Bun.UnderlyingSource.start?: UnderlyingSourceStartCallback<R>;` | — | — | 0 | 1 | — | `bun.d.ts:308` |
| 1 | property | `Bun.UnixSocketListener.unix` | `Bun.UnixSocketListener.unix: string;` | — | — | 0 | 1 | — | `bun.d.ts:6336` |
| 1 | property | `Bun.UnixSocketOptions.tls` | `Bun.UnixSocketOptions.tls?: TLSOptions \| boolean;` | — | — | 0 | 1 | TLS Configuration with which to create the socket | `bun.d.ts:6527` |
| 1 | property | `Bun.UnixSocketOptions.unix` | `Bun.UnixSocketOptions.unix: string;` | — | — | 0 | 1 | The unix socket to listen on or connect to | `bun.d.ts:6522` |
| 1 | function | `Bun.unsafe.arrayBufferToString` | `Bun.unsafe.arrayBufferToString(buffer: Uint8Array<ArrayBuffer> \| ArrayBufferLike): string;` | — | — | 0 | 2 | Cast bytes to a `String` without copying. This is the fastest way to get a `String` from a `Uint8Array` or `ArrayBuffer`. | `bun.d.ts:4720` |
| 1 | function | `Bun.unsafe.gcAggressionLevel` | `Bun.unsafe.gcAggressionLevel(level?: 0 \| 1 \| 2): 0 \| 1 \| 2;` | — | — | 0 | 1 | Force the garbage collector to run extremely often, | `bun.d.ts:4747` |
| 1 | function | `Bun.unsafe.memoryFootprint` | `Bun.unsafe.memoryFootprint(): number \| undefined;` | — | — | 0 | 1 | Accurate per-process memory footprint in bytes. | `bun.d.ts:4766` |
| 1 | function | `Bun.unsafe.mimallocDump` | `Bun.unsafe.mimallocDump(): void;` | — | — | 0 | 1 | Dump the mimalloc heap to the console | `bun.d.ts:4752` |
| 1 | interface | `Bun.WebAssembly.CompileError` | `Bun.WebAssembly.CompileError` | — | — | 0 | 1 | — | `wasm.d.ts:36` |
| 1 | type | `Bun.WebAssembly.Exports` | `Bun.WebAssembly.Exports` | — | — | 0 | 1 | — | `wasm.d.ts:6` |
| 1 | type | `Bun.WebAssembly.ExportValue` | `Bun.WebAssembly.ExportValue` | — | — | 0 | 1 | — | `wasm.d.ts:5` |
| 1 | interface | `Bun.WebAssembly.Global` | `Bun.WebAssembly.Global` | — | — | 0 | 1 | — | `wasm.d.ts:28` |
| 1 | interface | `Bun.WebAssembly.GlobalDescriptor` | `Bun.WebAssembly.GlobalDescriptor` | — | — | 0 | 1 | — | `wasm.d.ts:23` |
| 1 | type | `Bun.WebAssembly.ImportExportKind` | `Bun.WebAssembly.ImportExportKind` | — | — | 0 | 1 | — | `wasm.d.ts:3` |
| 1 | type | `Bun.WebAssembly.Imports` | `Bun.WebAssembly.Imports` | — | — | 0 | 1 | — | `wasm.d.ts:8` |
| 1 | type | `Bun.WebAssembly.ImportValue` | `Bun.WebAssembly.ImportValue` | — | — | 0 | 1 | — | `wasm.d.ts:7` |
| 1 | interface | `Bun.WebAssembly.Instance` | `Bun.WebAssembly.Instance` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Instance) | `wasm.d.ts:43` |
| 1 | interface | `Bun.WebAssembly.LinkError` | `Bun.WebAssembly.LinkError` | — | — | 0 | 1 | — | `wasm.d.ts:38` |
| 1 | interface | `Bun.WebAssembly.Memory` | `Bun.WebAssembly.Memory` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory) | `wasm.d.ts:49` |
| 1 | interface | `Bun.WebAssembly.MemoryDescriptor` | `Bun.WebAssembly.MemoryDescriptor` | — | — | 0 | 1 | — | `wasm.d.ts:71` |
| 1 | interface | `Bun.WebAssembly.Module` | `Bun.WebAssembly.Module` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Module) | `wasm.d.ts:57` |
| 1 | interface | `Bun.WebAssembly.ModuleExportDescriptor` | `Bun.WebAssembly.ModuleExportDescriptor` | — | — | 0 | 1 | — | `wasm.d.ts:77` |
| 1 | interface | `Bun.WebAssembly.ModuleImportDescriptor` | `Bun.WebAssembly.ModuleImportDescriptor` | — | — | 0 | 1 | — | `wasm.d.ts:82` |
| 1 | type | `Bun.WebAssembly.ModuleImports` | `Bun.WebAssembly.ModuleImports` | — | — | 0 | 1 | — | `wasm.d.ts:9` |
| 1 | interface | `Bun.WebAssembly.RuntimeError` | `Bun.WebAssembly.RuntimeError` | — | — | 0 | 1 | — | `wasm.d.ts:40` |
| 1 | interface | `Bun.WebAssembly.Table` | `Bun.WebAssembly.Table` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Table) | `wasm.d.ts:60` |
| 1 | interface | `Bun.WebAssembly.TableDescriptor` | `Bun.WebAssembly.TableDescriptor` | — | — | 0 | 1 | — | `wasm.d.ts:88` |
| 1 | type | `Bun.WebAssembly.TableKind` | `Bun.WebAssembly.TableKind` | — | — | 0 | 1 | — | `wasm.d.ts:4` |
| 1 | type | `Bun.WebAssembly.ValueType` | `Bun.WebAssembly.ValueType` | — | — | 0 | 1 | — | `wasm.d.ts:21` |
| 1 | interface | `Bun.WebAssembly.ValueTypeMap` | `Bun.WebAssembly.ValueTypeMap` | — | — | 0 | 1 | — | `wasm.d.ts:11` |
| 1 | interface | `Bun.WebAssembly.WebAssemblyInstantiatedSource` | `Bun.WebAssembly.WebAssemblyInstantiatedSource` | — | — | 0 | 1 | — | `wasm.d.ts:94` |
| 1 | method | `Bun.WebSocket.addEventListener` | `Bun.WebSocket.addEventListener( type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean \| AddEventListenerOptions, ): void;` | — | — | 0 | 2 | Registers an event handler of a specific event type on the WebSocket. | `bun.d.ts:4474` |
| 1 | property | `Bun.WebSocket.binaryType` | `Bun.WebSocket.binaryType: "arraybuffer" \| "nodebuffer";` | — | — | 0 | 1 | The type of binary data being received. | `bun.d.ts:4416` |
| 1 | property | `Bun.WebSocket.bufferedAmount` | `Bun.WebSocket.bufferedAmount: number;` | — | — | 0 | 1 | The number of bytes of data that have been queued using send() but not yet transmitted to the network | `bun.d.ts:4401` |
| 1 | method | `Bun.WebSocket.close` | `Bun.WebSocket.close(code?: number, reason?: string): void;` | — | — | 0 | 1 | Closes the WebSocket connection | `bun.d.ts:4449` |
| 1 | property | `Bun.WebSocket.CLOSED` *(deprecated)* | `Bun.WebSocket.CLOSED: 3;` | — | — | 0 | 1 | — | `bun.d.ts:4509` |
| 1 | property | `Bun.WebSocket.CLOSING` *(deprecated)* | `Bun.WebSocket.CLOSING: 2;` | — | — | 0 | 1 | — | `bun.d.ts:4507` |
| 1 | property | `Bun.WebSocket.CONNECTING` *(deprecated)* | `Bun.WebSocket.CONNECTING: 0;` | — | — | 0 | 1 | — | `bun.d.ts:4503` |
| 1 | property | `Bun.WebSocket.extensions` | `Bun.WebSocket.extensions: string;` | — | — | 0 | 1 | The extensions selected by the server | `bun.d.ts:4411` |
| 1 | property | `Bun.WebSocket.listener` | `Bun.WebSocket.listener: (this: WebSocket, ev: WebSocketEventMap[K])` | — | — | 0 | 4 | — | `bun.d.ts:4476` |
| 1 | property | `Bun.WebSocket.onclose` | `Bun.WebSocket.onclose: ((this: WebSocket, ev: CloseEvent)` | — | — | 0 | 1 | Event handler for close event | `bun.d.ts:4436` |
| 1 | property | `Bun.WebSocket.onerror` | `Bun.WebSocket.onerror: ((this: WebSocket, ev: Event)` | — | — | 0 | 1 | Event handler for error event | `bun.d.ts:4431` |
| 1 | property | `Bun.WebSocket.onmessage` | `Bun.WebSocket.onmessage: ((this: WebSocket, ev: MessageEvent)` | — | — | 0 | 1 | Event handler for message event | `bun.d.ts:4426` |
| 1 | property | `Bun.WebSocket.onopen` | `Bun.WebSocket.onopen: ((this: WebSocket, ev: Event)` | — | — | 0 | 1 | Event handler for open event | `bun.d.ts:4421` |
| 1 | property | `Bun.WebSocket.OPEN` *(deprecated)* | `Bun.WebSocket.OPEN: 1;` | — | — | 0 | 1 | — | `bun.d.ts:4505` |
| 1 | property | `Bun.WebSocket.options` | `Bun.WebSocket.options?: boolean \| AddEventListenerOptions,` | — | — | 0 | 4 | — | `bun.d.ts:4477` |
| 1 | method | `Bun.WebSocket.ping` | `Bun.WebSocket.ping(data?: string \| ArrayBufferLike \| ArrayBufferView): void;` | — | — | 0 | 1 | Sends a ping frame to the server | `bun.d.ts:4455` |
| 1 | method | `Bun.WebSocket.pong` | `Bun.WebSocket.pong(data?: string \| ArrayBufferLike \| ArrayBufferView): void;` | — | — | 0 | 1 | Sends a pong frame to the server | `bun.d.ts:4461` |
| 1 | property | `Bun.WebSocket.protocol` | `Bun.WebSocket.protocol: string;` | — | — | 0 | 1 | The protocol selected by the server | `bun.d.ts:4406` |
| 1 | property | `Bun.WebSocket.readyState` | `Bun.WebSocket.readyState:` | — | — | 0 | 1 | The current state of the connection | `bun.d.ts:4392` |
| 1 | method | `Bun.WebSocket.removeEventListener` | `Bun.WebSocket.removeEventListener( type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, options?: boolean \| EventListenerOptions, ): void;` | — | — | 0 | 2 | Removes an event listener previously registered with addEventListener() | `bun.d.ts:4491` |
| 1 | method | `Bun.WebSocket.send` | `Bun.WebSocket.send(data: string \| ArrayBufferLike \| ArrayBufferView): void;` | — | — | 0 | 1 | Transmits data to the server | `bun.d.ts:4442` |
| 1 | method | `Bun.WebSocket.terminate` | `Bun.WebSocket.terminate(): void;` | — | — | 0 | 1 | Immediately terminates the connection | `bun.d.ts:4466` |
| 1 | property | `Bun.WebSocket.url` | `Bun.WebSocket.url: string;` | — | — | 0 | 1 | The URL of the WebSocket connection | `bun.d.ts:4381` |
| 1 | property | `Bun.WebSocket.URL` *(deprecated)* | `Bun.WebSocket.URL: string;` | — | — | 0 | 1 | Legacy URL property (same as url) | `bun.d.ts:4387` |
| 1 | property | `Bun.WebSocketEventMap.close` | `Bun.WebSocketEventMap.close: CloseEvent;` | — | — | 0 | 1 | — | `bun.d.ts:4348` |
| 1 | property | `Bun.WebSocketEventMap.error` | `Bun.WebSocketEventMap.error: Event;` | — | — | 0 | 1 | — | `bun.d.ts:4349` |
| 1 | property | `Bun.WebSocketEventMap.message` | `Bun.WebSocketEventMap.message: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:4350` |
| 1 | property | `Bun.WebSocketEventMap.open` | `Bun.WebSocketEventMap.open: Event;` | — | — | 0 | 1 | — | `bun.d.ts:4351` |
| 1 | property | `Bun.WebSocketHandler.backpressureLimit` | `Bun.WebSocketHandler.backpressureLimit?: number;` | — | — | 0 | 1 | Sets the maximum number of bytes that can be buffered on a single connection. | `serve.d.ts:439` |
| 1 | property | `Bun.WebSocketHandler.closeOnBackpressureLimit` | `Bun.WebSocketHandler.closeOnBackpressureLimit?: boolean;` | false | — | 0 | 1 | Sets if the connection should be closed if `backpressureLimit` is reached. | `serve.d.ts:446` |
| 1 | property | `Bun.WebSocketHandler.data` | `Bun.WebSocketHandler.data?: T;` | — | — | 0 | 1 | Specify the type for the {@link ServerWebSocket.data} property on | `serve.d.ts:372` |
| 1 | property | `Bun.WebSocketHandler.idleTimeout` | `Bun.WebSocketHandler.idleTimeout?: number;` | 120 | — | 0 | 1 | Sets the number of seconds to wait before timing out a connection | `serve.d.ts:454` |
| 1 | property | `Bun.WebSocketHandler.maxPayloadLength` | `Bun.WebSocketHandler.maxPayloadLength?: number;` | — | — | 0 | 1 | Sets the maximum size of messages in bytes. | `serve.d.ts:432` |
| 1 | method | `Bun.WebSocketHandler.message` | `Bun.WebSocketHandler.message(ws: ServerWebSocket<T>, message: string \| Buffer<ArrayBuffer>): void \| Promise<void>;` | — | — | 0 | 1 | Called when the server receives an incoming message. | `serve.d.ts:385` |
| 1 | property | `Bun.WebSocketHandler.perMessageDeflate` | `Bun.WebSocketHandler.perMessageDeflate?:` | false | — | 0 | 1 | Sets the compression level for messages, for clients that supports it. By default, compression is disabled. | `serve.d.ts:475` |
| 1 | property | `Bun.WebSocketHandler.publishToSelf` | `Bun.WebSocketHandler.publishToSelf?: boolean;` | false | — | 0 | 1 | Should `ws.publish()` also send a message to `ws` (itself), if it is subscribed? | `serve.d.ts:461` |
| 1 | property | `Bun.WebSocketHandler.sendPings` | `Bun.WebSocketHandler.sendPings?: boolean;` | true | — | 0 | 1 | Should the server automatically send and respond to pings to clients? | `serve.d.ts:468` |
| 1 | property | `Bun.WebSocketOptionsCompression.perMessageDeflate` | `Bun.WebSocketOptionsCompression.perMessageDeflate?: boolean;` | true | — | 0 | 1 | Whether to offer the `permessage-deflate` extension in the WebSocket | `bun.d.ts:4335` |
| 1 | property | `Bun.WebSocketOptionsHeaders.headers` | `Bun.WebSocketOptionsHeaders.headers?: import("node:http").OutgoingHttpHeaders;` | — | — | 0 | 1 | Headers to send to the server | `bun.d.ts:4275` |
| 1 | property | `Bun.WebSocketOptionsProxy.proxy` | `Bun.WebSocketOptionsProxy.proxy?:` | — | — | 0 | 1 | HTTP proxy to use for the WebSocket connection. | `bun.d.ts:4307` |
| 1 | property | `Bun.WebSocketOptionsTLS.tls` | `Bun.WebSocketOptionsTLS.tls?: TLSOptions;` | — | — | 0 | 1 | Options for the TLS connection. | `bun.d.ts:4268` |
| 1 | method | `Bun.WebView.addEventListener` | `Bun.WebView.addEventListener( type: `${string}.${string}`, listener: (event: MessageEvent<T>) => void, options?: boolean \| AddEventListenerOptions, ): void;` | — | — | 0 | 2 | Subscribe to CDP events. **Chrome backend only.** | `bun.d.ts:8913` |
| 1 | method | `Bun.WebView.back` | `Bun.WebView.back(): Promise<void>;` | — | — | 0 | 1 | Navigate back in session history. | `bun.d.ts:9006` |
| 1 | type | `Bun.WebView.Backend` | `Bun.WebView.Backend` | — | — | 0 | 1 | Browser backend selection. | `bun.d.ts:8573` |
| 1 | method | `Bun.WebView.cdp` | `Bun.WebView.cdp(method: string, params?: Record<string, unknown>): Promise<T>;` | — | — | 0 | 1 | Send a raw Chrome DevTools Protocol command. **Chrome backend only.** | `bun.d.ts:8888` |
| 1 | method | `Bun.WebView.click` | `Bun.WebView.click(x: number, y: number, options?: WebView.ClickOptions): Promise<void>;` | — | — | 0 | 2 | Click at the given viewport coordinates. | `bun.d.ts:8932` |
| 1 | interface | `Bun.WebView.ClickOptions` | `Bun.WebView.ClickOptions` | — | — | 0 | 1 | — | `bun.d.ts:8515` |
| 1 | interface | `Bun.WebView.ClickSelectorOptions` | `Bun.WebView.ClickSelectorOptions` | — | — | 0 | 1 | — | `bun.d.ts:8524` |
| 1 | method | `Bun.WebView.close` | `Bun.WebView.close(): void;` | — | — | 0 | 1 | Close the view and release its WebContent process. After close, | `bun.d.ts:9016` |
| 1 | method | `Bun.WebView.closeAll` | `Bun.WebView.closeAll(): void;` | — | — | 0 | 1 | Force-kill all browser subprocesses (Chrome and the WKWebView host). | `bun.d.ts:8758` |
| 1 | type | `Bun.WebView.ConsoleCapture` | `Bun.WebView.ConsoleCapture` | — | — | 0 | 1 | Console capture. Called for each `console.*` invocation in the page. | `bun.d.ts:8673` |
| 1 | interface | `Bun.WebView.ConstructorOptions` | `Bun.WebView.ConstructorOptions` | — | — | 0 | 1 | — | `bun.d.ts:8675` |
| 1 | method | `Bun.WebView.evaluate` | `Bun.WebView.evaluate(script: string): Promise<T>;` | — | — | 0 | 1 | Run a JavaScript expression in the page's main frame and return the | `bun.d.ts:8816` |
| 1 | method | `Bun.WebView.forward` | `Bun.WebView.forward(): Promise<void>;` | — | — | 0 | 1 | Navigate forward in session history. | `bun.d.ts:9008` |
| 1 | property | `Bun.WebView.listener` | `Bun.WebView.listener: (event: MessageEvent<T>)` | — | — | 0 | 2 | — | `bun.d.ts:8915` |
| 1 | property | `Bun.WebView.loading` | `Bun.WebView.loading: boolean;` | — | — | 0 | 1 | True while a navigation is in flight. | `bun.d.ts:8765` |
| 1 | type | `Bun.WebView.Modifier` | `Bun.WebView.Modifier` | — | — | 0 | 1 | — | `bun.d.ts:8497` |
| 1 | method | `Bun.WebView.navigate` | `Bun.WebView.navigate(url: string): Promise<void>;` | — | — | 0 | 1 | Navigate to a URL. Resolves when the main frame's load completes | `bun.d.ts:8788` |
| 1 | property | `Bun.WebView.onNavigated` | `Bun.WebView.onNavigated: ((url: string, title: string)` | — | — | 0 | 1 | Fired when a navigation completes successfully. The callback runs | `bun.d.ts:8771` |
| 1 | property | `Bun.WebView.onNavigationFailed` | `Bun.WebView.onNavigationFailed: ((error: Error)` | — | — | 0 | 1 | Fired when a navigation fails. The callback runs before the | `bun.d.ts:8776` |
| 1 | property | `Bun.WebView.options` | `Bun.WebView.options?: boolean \| AddEventListenerOptions,` | — | — | 0 | 2 | — | `bun.d.ts:8916` |
| 1 | method | `Bun.WebView.press` | `Bun.WebView.press(key: WebView.VirtualKey \| (string & {}), options?: WebView.PressOptions): Promise<void>;` | — | — | 0 | 1 | Press a key. | `bun.d.ts:8972` |
| 1 | interface | `Bun.WebView.PressOptions` | `Bun.WebView.PressOptions` | — | — | 0 | 1 | — | `bun.d.ts:8548` |
| 1 | method | `Bun.WebView.reload` | `Bun.WebView.reload(): Promise<void>;` | — | — | 0 | 1 | Reload the current page. | `bun.d.ts:9010` |
| 1 | method | `Bun.WebView.resize` | `Bun.WebView.resize(width: number, height: number): Promise<void>;` | — | — | 0 | 1 | Resize the viewport. | `bun.d.ts:9003` |
| 1 | method | `Bun.WebView.screenshot` | `Bun.WebView.screenshot(options?: { encoding?: "blob"; format?: "png" \| "jpeg" \| "webp"; quality?: number }): Promise<Blob>;` | `"blob"` | — | 0 | 4 | Capture a screenshot of the current viewport. | `bun.d.ts:8848` |
| 1 | method | `Bun.WebView.scroll` | `Bun.WebView.scroll(dx: number, dy: number): Promise<void>;` | — | — | 0 | 1 | Scroll the viewport by the given pixel delta. | `bun.d.ts:8981` |
| 1 | method | `Bun.WebView.scrollTo` | `Bun.WebView.scrollTo(selector: string, options?: WebView.ScrollToOptions): Promise<void>;` | — | — | 0 | 1 | Wait for an element to exist, then scroll it into view. | `bun.d.ts:8998` |
| 1 | interface | `Bun.WebView.ScrollToOptions` | `Bun.WebView.ScrollToOptions` | — | — | 0 | 1 | — | `bun.d.ts:8533` |
| 1 | property | `Bun.WebView.title` | `Bun.WebView.title: string;` | — | — | 0 | 1 | The page's `<title>`. Updated when a navigation completes. | `bun.d.ts:8763` |
| 1 | property | `Bun.WebView.url` | `Bun.WebView.url: string;` | — | — | 0 | 1 | The last-navigated URL. Updated when a navigation completes. | `bun.d.ts:8761` |
| 1 | type | `Bun.WebView.VirtualKey` | `Bun.WebView.VirtualKey` | — | — | 0 | 1 | — | `bun.d.ts:8499` |
| 1 | property | `Bun.WhichOptions.cwd` | `Bun.WhichOptions.cwd?: string;` | — | — | 0 | 1 | When given a relative path, use this path to join it. | `bun.d.ts:534` |
| 1 | property | `Bun.WhichOptions.PATH` | `Bun.WhichOptions.PATH?: string;` | — | — | 0 | 1 | Overrides the PATH environment variable | `bun.d.ts:529` |
| 1 | method | `Bun.Worker.addEventListener` | `Bun.Worker.addEventListener( type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean \| AddEventListenerOptions, ): void;` | — | — | 0 | 2 | — | `bun.d.ts:458` |
| 1 | property | `Bun.Worker.listener` | `Bun.Worker.listener: (this: Worker, ev: WorkerEventMap[K])` | — | — | 0 | 4 | — | `bun.d.ts:460` |
| 1 | property | `Bun.Worker.onmessage` | `Bun.Worker.onmessage: ((this: Worker, ev: MessageEvent)` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/message_event) | `bun.d.ts:442` |
| 1 | property | `Bun.Worker.onmessageerror` | `Bun.Worker.onmessageerror: ((this: Worker, ev: MessageEvent)` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/API/Worker/messageerror_event) | `bun.d.ts:444` |
| 1 | property | `Bun.Worker.options` | `Bun.Worker.options?: boolean \| AddEventListenerOptions,` | — | — | 0 | 4 | — | `bun.d.ts:461` |
| 1 | method | `Bun.Worker.postMessage` | `Bun.Worker.postMessage(message: any, transfer: Transferable[]): void;` | — | — | 0 | 2 | Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned. | `bun.d.ts:450` |
| 1 | method | `Bun.Worker.ref` | `Bun.Worker.ref(): void;` | — | — | 0 | 1 | Opposite of `unref()`, calling `ref()` on a previously `unref()`ed worker does _not_ let the program exit if it's the only active handle left (the default | `bun.d.ts:485` |
| 1 | method | `Bun.Worker.removeEventListener` | `Bun.Worker.removeEventListener( type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => any, options?: boolean \| EventListenerOptions, ): void;` | — | — | 0 | 2 | — | `bun.d.ts:468` |
| 1 | method | `Bun.Worker.terminate` | `Bun.Worker.terminate(): void;` | — | — | 0 | 1 | Aborts worker's associated global environment. | `bun.d.ts:457` |
| 1 | property | `Bun.Worker.threadId` | `Bun.Worker.threadId: number;` | — | — | 0 | 1 | An integer identifier for the referenced thread. Inside the worker thread, | `bun.d.ts:500` |
| 1 | method | `Bun.Worker.unref` | `Bun.Worker.unref(): void;` | — | — | 0 | 1 | Calling `unref()` on a worker allows the thread to exit if this is the only | `bun.d.ts:492` |
| 1 | property | `Bun.WorkerEventMap.close` | `Bun.WorkerEventMap.close: CloseEvent;` | — | — | 0 | 1 | — | `bun.d.ts:341` |
| 1 | property | `Bun.WorkerEventMap.message` | `Bun.WorkerEventMap.message: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:339` |
| 1 | property | `Bun.WorkerEventMap.messageerror` | `Bun.WorkerEventMap.messageerror: MessageEvent;` | — | — | 0 | 1 | — | `bun.d.ts:340` |
| 1 | property | `Bun.WorkerEventMap.open` | `Bun.WorkerEventMap.open: Event;` | — | — | 0 | 1 | — | `bun.d.ts:342` |
| 1 | property | `Bun.WorkerOptions.argv` | `Bun.WorkerOptions.argv?: any[] \| undefined;` | — | — | 0 | 1 | List of arguments which would be stringified and appended to | `bun.d.ts:409` |
| 1 | property | `Bun.WorkerOptions.credentials` | `Bun.WorkerOptions.credentials?: import("undici-types").RequestCredentials \| undefined;` | — | — | 0 | 1 | In Bun, this does nothing. | `bun.d.ts:422` |
| 1 | property | `Bun.WorkerOptions.env` | `Bun.WorkerOptions.env?: Record<string, string> \| (typeof import("node:worker_threads"))["SHARE_ENV"] \| undefined;` | — | yes | 0 | 1 | If set, specifies the initial value of process.env inside the Worker thread. As a special value, worker.SHARE_ENV may be used to specify that the parent thre… | `bun.d.ts:417` |
| 1 | property | `Bun.WorkerOptions.name` | `Bun.WorkerOptions.name?: string;` | — | — | 0 | 1 | A string specifying an identifying name for the DedicatedWorkerGlobalScope representing the scope of | `bun.d.ts:380` |
| 1 | property | `Bun.WorkerOptions.preload` | `Bun.WorkerOptions.preload?: string[] \| string \| undefined;` | — | — | 0 | 1 | An array of module specifiers to preload in the worker. | `bun.d.ts:437` |
| 1 | property | `Bun.WorkerOptions.ref` | `Bun.WorkerOptions.ref?: boolean;` | — | — | 0 | 1 | When `true`, the worker will keep the parent thread alive until the worker is terminated or `unref`'d. | `bun.d.ts:396` |
| 1 | property | `Bun.WorkerOptions.smol` | `Bun.WorkerOptions.smol?: boolean;` | — | — | 0 | 1 | Use less memory, but make the worker slower. | `bun.d.ts:388` |
| 1 | property | `Bun.WrapAnsiOptions.ambiguousIsNarrow` | `Bun.WrapAnsiOptions.ambiguousIsNarrow?: boolean;` | true | — | 0 | 1 | When it's ambiguous and `true`, count ambiguous width characters as 1 character wide. | `bun.d.ts:721` |
| 1 | property | `Bun.WrapAnsiOptions.hard` | `Bun.WrapAnsiOptions.hard?: boolean;` | false | — | 0 | 1 | If `true`, break words in the middle if they don't fit on a line. | `bun.d.ts:697` |
| 1 | property | `Bun.WrapAnsiOptions.trim` | `Bun.WrapAnsiOptions.trim?: boolean;` | true | — | 0 | 1 | If `true`, trim leading and trailing whitespace from each line. | `bun.d.ts:713` |
| 1 | property | `Bun.WrapAnsiOptions.wordWrap` | `Bun.WrapAnsiOptions.wordWrap?: boolean;` | true | — | 0 | 1 | If `true`, wrap at word boundaries when possible. | `bun.d.ts:705` |
| 1 | function | `Bun.YAML.parse` | `Bun.YAML.parse(input: string): unknown;` | — | — | 3 | 1 | Parse a YAML string into a JavaScript value | `bun.d.ts:943` |
| 1 | function | `Bun.YAML.stringify` | `Bun.YAML.stringify(input: unknown, replacer?: undefined \| null, space?: string \| number): string;` | — | — | 0 | 1 | Convert a JavaScript value into a YAML string. Strings are double quoted if they contain keywords, non-printable or | `bun.d.ts:983` |
| 1 | property | `Bun.ZlibCompressionOptions.level` | `Bun.ZlibCompressionOptions.level?: -1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9;` | — | — | 0 | 1 | The compression level to use. Must be between `-1` and `9`. | `bun.d.ts:5231` |
| 1 | property | `Bun.ZlibCompressionOptions.library` | `Bun.ZlibCompressionOptions.library?: "zlib";` | — | — | 0 | 1 | — | `bun.d.ts:5291` |
| 1 | property | `Bun.ZlibCompressionOptions.memLevel` | `Bun.ZlibCompressionOptions.memLevel?: 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9;` | — | — | 0 | 1 | How much memory should be allocated for the internal compression state. | `bun.d.ts:5239` |
| 1 | property | `Bun.ZlibCompressionOptions.strategy` | `Bun.ZlibCompressionOptions.strategy?: number;` | — | — | 0 | 1 | Tunes the compression algorithm. | `bun.d.ts:5289` |
| 1 | property | `Bun.ZlibCompressionOptions.windowBits` | `Bun.ZlibCompressionOptions.windowBits?:` | — | — | 0 | 1 | The base 2 logarithm of the window size (the size of the history buffer). | `bun.d.ts:5252` |
| 2 | property | `Bun.BuildConfig.jsx.development` | `Bun.BuildConfig.jsx.development?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2896` |
| 2 | property | `Bun.BuildConfig.jsx.factory` | `Bun.BuildConfig.jsx.factory?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2893` |
| 2 | property | `Bun.BuildConfig.jsx.fragment` | `Bun.BuildConfig.jsx.fragment?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2894` |
| 2 | property | `Bun.BuildConfig.jsx.importSource` | `Bun.BuildConfig.jsx.importSource?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2892` |
| 2 | property | `Bun.BuildConfig.jsx.runtime` | `Bun.BuildConfig.jsx.runtime?: "automatic" \| "classic";` | — | — | 0 | 1 | — | `bun.d.ts:2891` |
| 2 | property | `Bun.BuildConfig.jsx.sideEffects` | `Bun.BuildConfig.jsx.sideEffects?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2895` |
| 2 | property | `Bun.BuildConfig.minify.identifiers` | `Bun.BuildConfig.minify.identifiers?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2761` |
| 2 | property | `Bun.BuildConfig.minify.keepNames` | `Bun.BuildConfig.minify.keepNames?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2762` |
| 2 | property | `Bun.BuildConfig.minify.syntax` | `Bun.BuildConfig.minify.syntax?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2760` |
| 2 | property | `Bun.BuildConfig.minify.whitespace` | `Bun.BuildConfig.minify.whitespace?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2759` |
| 2 | property | `Bun.BuildConfig.naming.asset` | `Bun.BuildConfig.naming.asset?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2673` |
| 2 | property | `Bun.BuildConfig.naming.chunk` | `Bun.BuildConfig.naming.chunk?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2671` |
| 2 | property | `Bun.BuildConfig.naming.entry` | `Bun.BuildConfig.naming.entry?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2672` |
| 2 | property | `Bun.BunFile.options.highWaterMark` | `Bun.BunFile.options.highWaterMark: number` | — | — | 0 | 1 | — | `bun.d.ts:2203` |
| 2 | property | `Bun.CompileBuildOptions.windows.copyright` | `Bun.CompileBuildOptions.windows.copyright?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3116` |
| 2 | property | `Bun.CompileBuildOptions.windows.description` | `Bun.CompileBuildOptions.windows.description?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3115` |
| 2 | property | `Bun.CompileBuildOptions.windows.hideConsole` | `Bun.CompileBuildOptions.windows.hideConsole?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:3110` |
| 2 | property | `Bun.CompileBuildOptions.windows.icon` | `Bun.CompileBuildOptions.windows.icon?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3111` |
| 2 | property | `Bun.CompileBuildOptions.windows.publisher` | `Bun.CompileBuildOptions.windows.publisher?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3113` |
| 2 | property | `Bun.CompileBuildOptions.windows.title` | `Bun.CompileBuildOptions.windows.title?: string;` | — | — | 0 | 1 | — | `bun.d.ts:3112` |
| 2 | property | `Bun.CompileBuildOptions.windows.version` | `Bun.CompileBuildOptions.windows.version?: string;` | — | yes | 0 | 1 | — | `bun.d.ts:3114` |
| 2 | property | `Bun.Image.ConstructorOptions.autoOrient` | `Bun.Image.ConstructorOptions.autoOrient?: boolean;` | true | — | 0 | 1 | Apply EXIF Orientation (JPEG) before any other operation. | `bun.d.ts:8308` |
| 2 | property | `Bun.Image.ConstructorOptions.maxPixels` | `Bun.Image.ConstructorOptions.maxPixels?: number;` | 268402689 // 0x3FFF | — | 0 | 1 | Reject inputs whose `width × height` exceeds this many pixels. The | `bun.d.ts:8303` |
| 2 | property | `Bun.Image.Metadata.format` | `Bun.Image.Metadata.format: Format;` | — | — | 0 | 1 | — | `bun.d.ts:8334` |
| 2 | property | `Bun.Image.Metadata.height` | `Bun.Image.Metadata.height: number;` | — | — | 0 | 1 | — | `bun.d.ts:8333` |
| 2 | property | `Bun.Image.Metadata.width` | `Bun.Image.Metadata.width: number;` | — | — | 0 | 1 | — | `bun.d.ts:8332` |
| 2 | property | `Bun.Image.ModulateOptions.brightness` | `Bun.Image.ModulateOptions.brightness?: number;` | — | — | 0 | 1 | Multiplier; `1` leaves brightness unchanged. | `bun.d.ts:8326` |
| 2 | property | `Bun.Image.ModulateOptions.saturation` | `Bun.Image.ModulateOptions.saturation?: number;` | — | — | 0 | 1 | `0` = greyscale, `1` = unchanged, `>1` = more saturated. | `bun.d.ts:8328` |
| 2 | property | `Bun.Image.ResizeOptions.filter` | `Bun.Image.ResizeOptions.filter?: Filter;` | "lanczos3" | — | 0 | 1 | Resampling kernel. @default "lanczos3" | `bun.d.ts:8313` |
| 2 | property | `Bun.Image.ResizeOptions.fit` | `Bun.Image.ResizeOptions.fit?: "fill" \| "inside";` | "fill" | — | 0 | 1 | `"fill"` stretches to exactly width×height. `"inside"` preserves | `bun.d.ts:8319` |
| 2 | property | `Bun.Image.ResizeOptions.withoutEnlargement` | `Bun.Image.ResizeOptions.withoutEnlargement?: boolean;` | — | — | 0 | 1 | Never upscale — if the source is already smaller, leave it. | `bun.d.ts:8321` |
| 2 | property | `Bun.JSONL.ParseChunkResult.done` | `Bun.JSONL.ParseChunkResult.done: boolean;` | — | — | 0 | 1 | `true` if all input was consumed successfully. `false` if the input ends with an incomplete value or a parse error occurred. | `bun.d.ts:838` |
| 2 | property | `Bun.JSONL.ParseChunkResult.error` | `Bun.JSONL.ParseChunkResult.error: SyntaxError \| null;` | — | — | 0 | 1 | A `SyntaxError` if a parse error occurred, otherwise `null`. Values parsed before the error are still available in `values`. | `bun.d.ts:840` |
| 2 | property | `Bun.JSONL.ParseChunkResult.read` | `Bun.JSONL.ParseChunkResult.read: number;` | — | — | 0 | 1 | How far into the input was consumed. When the input is a string, this is a character offset. When the input is a `TypedArray`, this is a byte offset. Use `in… | `bun.d.ts:836` |
| 2 | property | `Bun.JSONL.ParseChunkResult.values` | `Bun.JSONL.ParseChunkResult.values: unknown[];` | — | — | 0 | 1 | The successfully parsed JSON values. | `bun.d.ts:834` |
| 2 | property | `Bun.markdown.AnsiTheme.colors` | `Bun.markdown.AnsiTheme.colors?: boolean;` | true | — | 0 | 1 | Emit ANSI color + styling escape sequences. When `false`, the | `bun.d.ts:1324` |
| 2 | property | `Bun.markdown.AnsiTheme.columns` | `Bun.markdown.AnsiTheme.columns?: number;` | 80 | — | 0 | 1 | Line width used for word-wrapping paragraphs and headings and | `bun.d.ts:1342` |
| 2 | property | `Bun.markdown.AnsiTheme.hyperlinks` | `Bun.markdown.AnsiTheme.hyperlinks?: boolean;` | false | — | 0 | 1 | Emit OSC 8 hyperlinks (clickable links in modern terminals). | `bun.d.ts:1330` |
| 2 | property | `Bun.markdown.AnsiTheme.kittyGraphics` | `Bun.markdown.AnsiTheme.kittyGraphics?: boolean;` | false | — | 0 | 1 | Inline images using the Kitty Graphics Protocol when the `src` | `bun.d.ts:1349` |
| 2 | property | `Bun.markdown.AnsiTheme.light` | `Bun.markdown.AnsiTheme.light?: boolean;` | — | — | 0 | 1 | True when the terminal background is light. Affects the color | `bun.d.ts:1336` |
| 2 | property | `Bun.markdown.CellMeta.align` | `Bun.markdown.CellMeta.align?: "left" \| "center" \| "right";` | — | — | 0 | 1 | Column alignment. | `bun.d.ts:1218` |
| 2 | property | `Bun.markdown.CellProps.align` | `Bun.markdown.CellProps.align?: "left" \| "center" \| "right";` | — | — | 0 | 1 | Column alignment. | `bun.d.ts:1107` |
| 2 | property | `Bun.markdown.ChildrenProps.children` | `Bun.markdown.ChildrenProps.children: import("./jsx.d.ts").JSX.Element[];` | — | — | 0 | 1 | — | `bun.d.ts:1087` |
| 2 | property | `Bun.markdown.CodeBlockMeta.language` | `Bun.markdown.CodeBlockMeta.language?: string;` | — | — | 0 | 1 | The info-string language (e.g. `"js"`). | `bun.d.ts:1188` |
| 2 | property | `Bun.markdown.CodeBlockProps.language` | `Bun.markdown.CodeBlockProps.language?: string;` | — | — | 0 | 1 | The info-string language (e.g. `"js"`). | `bun.d.ts:1103` |
| 2 | property | `Bun.markdown.ComponentOverrides.a` | `Bun.markdown.ComponentOverrides.a?: Component<LinkProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1161` |
| 2 | property | `Bun.markdown.ComponentOverrides.blockquote` | `Bun.markdown.ComponentOverrides.blockquote?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1146` |
| 2 | property | `Bun.markdown.ComponentOverrides.br` | `Bun.markdown.ComponentOverrides.br?: Component<{}>;` | — | — | 0 | 1 | — | `bun.d.ts:1167` |
| 2 | property | `Bun.markdown.ComponentOverrides.code` | `Bun.markdown.ComponentOverrides.code?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1163` |
| 2 | property | `Bun.markdown.ComponentOverrides.del` | `Bun.markdown.ComponentOverrides.del?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1164` |
| 2 | property | `Bun.markdown.ComponentOverrides.em` | `Bun.markdown.ComponentOverrides.em?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1159` |
| 2 | property | `Bun.markdown.ComponentOverrides.h1` | `Bun.markdown.ComponentOverrides.h1?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1139` |
| 2 | property | `Bun.markdown.ComponentOverrides.h2` | `Bun.markdown.ComponentOverrides.h2?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1140` |
| 2 | property | `Bun.markdown.ComponentOverrides.h3` | `Bun.markdown.ComponentOverrides.h3?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1141` |
| 2 | property | `Bun.markdown.ComponentOverrides.h4` | `Bun.markdown.ComponentOverrides.h4?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1142` |
| 2 | property | `Bun.markdown.ComponentOverrides.h5` | `Bun.markdown.ComponentOverrides.h5?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1143` |
| 2 | property | `Bun.markdown.ComponentOverrides.h6` | `Bun.markdown.ComponentOverrides.h6?: Component<HeadingProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1144` |
| 2 | property | `Bun.markdown.ComponentOverrides.hr` | `Bun.markdown.ComponentOverrides.hr?: Component<{}>;` | — | — | 0 | 1 | — | `bun.d.ts:1151` |
| 2 | property | `Bun.markdown.ComponentOverrides.html` | `Bun.markdown.ComponentOverrides.html?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1152` |
| 2 | property | `Bun.markdown.ComponentOverrides.img` | `Bun.markdown.ComponentOverrides.img?: Component<ImageProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1162` |
| 2 | property | `Bun.markdown.ComponentOverrides.li` | `Bun.markdown.ComponentOverrides.li?: Component<ListItemProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1149` |
| 2 | property | `Bun.markdown.ComponentOverrides.math` | `Bun.markdown.ComponentOverrides.math?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1165` |
| 2 | property | `Bun.markdown.ComponentOverrides.ol` | `Bun.markdown.ComponentOverrides.ol?: Component<OrderedListProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1148` |
| 2 | property | `Bun.markdown.ComponentOverrides.p` | `Bun.markdown.ComponentOverrides.p?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1145` |
| 2 | property | `Bun.markdown.ComponentOverrides.pre` | `Bun.markdown.ComponentOverrides.pre?: Component<CodeBlockProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1150` |
| 2 | property | `Bun.markdown.ComponentOverrides.strong` | `Bun.markdown.ComponentOverrides.strong?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1160` |
| 2 | property | `Bun.markdown.ComponentOverrides.table` | `Bun.markdown.ComponentOverrides.table?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1153` |
| 2 | property | `Bun.markdown.ComponentOverrides.tbody` | `Bun.markdown.ComponentOverrides.tbody?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1155` |
| 2 | property | `Bun.markdown.ComponentOverrides.td` | `Bun.markdown.ComponentOverrides.td?: Component<CellProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1158` |
| 2 | property | `Bun.markdown.ComponentOverrides.th` | `Bun.markdown.ComponentOverrides.th?: Component<CellProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1157` |
| 2 | property | `Bun.markdown.ComponentOverrides.thead` | `Bun.markdown.ComponentOverrides.thead?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1154` |
| 2 | property | `Bun.markdown.ComponentOverrides.tr` | `Bun.markdown.ComponentOverrides.tr?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1156` |
| 2 | property | `Bun.markdown.ComponentOverrides.u` | `Bun.markdown.ComponentOverrides.u?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1166` |
| 2 | property | `Bun.markdown.ComponentOverrides.ul` | `Bun.markdown.ComponentOverrides.ul?: Component<ChildrenProps>;` | — | — | 0 | 1 | — | `bun.d.ts:1147` |
| 2 | property | `Bun.markdown.HeadingMeta.id` | `Bun.markdown.HeadingMeta.id?: string;` | — | — | 0 | 1 | Heading ID slug. Set when `headings: { ids: true }` is enabled. | `bun.d.ts:1182` |
| 2 | property | `Bun.markdown.HeadingMeta.level` | `Bun.markdown.HeadingMeta.level: number;` | — | — | 0 | 1 | Heading level (1–6). | `bun.d.ts:1180` |
| 2 | property | `Bun.markdown.HeadingProps.id` | `Bun.markdown.HeadingProps.id?: string;` | — | — | 0 | 1 | Heading ID slug. Set when `headings: { ids: true }` is enabled. | `bun.d.ts:1091` |
| 2 | property | `Bun.markdown.ImageMeta.src` | `Bun.markdown.ImageMeta.src: string;` | — | — | 0 | 1 | Image URL. | `bun.d.ts:1232` |
| 2 | property | `Bun.markdown.ImageMeta.title` | `Bun.markdown.ImageMeta.title?: string;` | — | — | 0 | 1 | Image title attribute. | `bun.d.ts:1234` |
| 2 | property | `Bun.markdown.ImageProps.alt` | `Bun.markdown.ImageProps.alt?: string;` | — | — | 0 | 1 | Alt text. | `bun.d.ts:1119` |
| 2 | property | `Bun.markdown.ImageProps.src` | `Bun.markdown.ImageProps.src: string;` | — | — | 0 | 1 | Image URL. | `bun.d.ts:1117` |
| 2 | property | `Bun.markdown.ImageProps.title` | `Bun.markdown.ImageProps.title?: string;` | — | — | 0 | 1 | Image title attribute. | `bun.d.ts:1121` |
| 2 | property | `Bun.markdown.LinkMeta.href` | `Bun.markdown.LinkMeta.href: string;` | — | — | 0 | 1 | Link URL. | `bun.d.ts:1224` |
| 2 | property | `Bun.markdown.LinkMeta.title` | `Bun.markdown.LinkMeta.title?: string;` | — | — | 0 | 1 | Link title attribute. | `bun.d.ts:1226` |
| 2 | property | `Bun.markdown.LinkProps.href` | `Bun.markdown.LinkProps.href: string;` | — | — | 0 | 1 | Link URL. | `bun.d.ts:1111` |
| 2 | property | `Bun.markdown.LinkProps.title` | `Bun.markdown.LinkProps.title?: string;` | — | — | 0 | 1 | Link title attribute. | `bun.d.ts:1113` |
| 2 | property | `Bun.markdown.ListItemMeta.checked` | `Bun.markdown.ListItemMeta.checked?: boolean;` | — | — | 0 | 1 | Task list checked state. Set for `- [x]` / `- [ ]` items. | `bun.d.ts:1212` |
| 2 | property | `Bun.markdown.ListItemMeta.depth` | `Bun.markdown.ListItemMeta.depth: number;` | — | — | 0 | 1 | Nesting depth of the parent list. `0` for items in a top-level list. | `bun.d.ts:1206` |
| 2 | property | `Bun.markdown.ListItemMeta.index` | `Bun.markdown.ListItemMeta.index: number;` | — | — | 0 | 1 | 0-based index of this item within its parent list. | `bun.d.ts:1204` |
| 2 | property | `Bun.markdown.ListItemMeta.ordered` | `Bun.markdown.ListItemMeta.ordered: boolean;` | — | — | 0 | 1 | Whether the parent list is ordered. | `bun.d.ts:1208` |
| 2 | property | `Bun.markdown.ListItemMeta.start` | `Bun.markdown.ListItemMeta.start?: number;` | — | — | 0 | 1 | The start number of the parent list (only set when `ordered` is true). | `bun.d.ts:1210` |
| 2 | property | `Bun.markdown.ListItemProps.checked` | `Bun.markdown.ListItemProps.checked?: boolean;` | — | — | 0 | 1 | Task list checked state. Set for `- [x]` / `- [ ]` items. | `bun.d.ts:1099` |
| 2 | property | `Bun.markdown.ListMeta.depth` | `Bun.markdown.ListMeta.depth: number;` | — | — | 0 | 1 | Nesting depth. `0` for a top-level list, `1` for a list inside a list item, etc. | `bun.d.ts:1198` |
| 2 | property | `Bun.markdown.ListMeta.ordered` | `Bun.markdown.ListMeta.ordered: boolean;` | — | — | 0 | 1 | Whether this is an ordered list. | `bun.d.ts:1194` |
| 2 | property | `Bun.markdown.ListMeta.start` | `Bun.markdown.ListMeta.start?: number;` | — | — | 0 | 1 | The start number for ordered lists. | `bun.d.ts:1196` |
| 2 | property | `Bun.markdown.Options.autolinks` | `Bun.markdown.Options.autolinks?: boolean \| { url?: boolean; www?: boolean; email?: boolean };` | — | — | 0 | 1 | Enable autolinks. Pass `true` to enable all autolink types (URL, WWW, email), | `bun.d.ts:1067` |
| 2 | property | `Bun.markdown.Options.collapseWhitespace` | `Bun.markdown.Options.collapseWhitespace?: boolean;` | — | — | 0 | 1 | Collapse whitespace in text content. Default: `false`. | `bun.d.ts:1041` |
| 2 | property | `Bun.markdown.Options.hardSoftBreaks` | `Bun.markdown.Options.hardSoftBreaks?: boolean;` | — | — | 0 | 1 | Treat soft line breaks as hard line breaks. Default: `false`. | `bun.d.ts:1033` |
| 2 | property | `Bun.markdown.Options.headings` | `Bun.markdown.Options.headings?: boolean \| { ids?: boolean; autolink?: boolean };` | — | — | 0 | 1 | Configure heading IDs and autolink headings. Pass `true` to enable both | `bun.d.ts:1080` |
| 2 | property | `Bun.markdown.Options.latexMath` | `Bun.markdown.Options.latexMath?: boolean;` | — | — | 0 | 1 | Enable LaTeX math (`$inline$` and `$$display$$`). Default: `false`. | `bun.d.ts:1039` |
| 2 | property | `Bun.markdown.Options.noHtmlBlocks` | `Bun.markdown.Options.noHtmlBlocks?: boolean;` | — | — | 0 | 1 | Disable HTML blocks. Default: `false`. | `bun.d.ts:1047` |
| 2 | property | `Bun.markdown.Options.noHtmlSpans` | `Bun.markdown.Options.noHtmlSpans?: boolean;` | — | — | 0 | 1 | Disable inline HTML spans. Default: `false`. | `bun.d.ts:1049` |
| 2 | property | `Bun.markdown.Options.noIndentedCodeBlocks` | `Bun.markdown.Options.noIndentedCodeBlocks?: boolean;` | — | — | 0 | 1 | Disable indented code blocks. Default: `false`. | `bun.d.ts:1045` |
| 2 | property | `Bun.markdown.Options.permissiveAtxHeaders` | `Bun.markdown.Options.permissiveAtxHeaders?: boolean;` | — | — | 0 | 1 | Allow ATX headers without a space after `#`. Default: `false`. | `bun.d.ts:1043` |
| 2 | property | `Bun.markdown.Options.strikethrough` | `Bun.markdown.Options.strikethrough?: boolean;` | — | — | 0 | 1 | Enable GFM strikethrough (`~~text~~`). Default: `true`. | `bun.d.ts:1029` |
| 2 | property | `Bun.markdown.Options.tables` | `Bun.markdown.Options.tables?: boolean;` | — | — | 0 | 1 | Enable GFM tables. Default: `true`. | `bun.d.ts:1027` |
| 2 | property | `Bun.markdown.Options.tagFilter` | `Bun.markdown.Options.tagFilter?: boolean;` | — | — | 0 | 1 | Enable the GFM tag filter, which replaces `<` with `&lt;` for disallowed | `bun.d.ts:1054` |
| 2 | property | `Bun.markdown.Options.tasklists` | `Bun.markdown.Options.tasklists?: boolean;` | — | — | 0 | 1 | Enable GFM task lists (`- [x] item`). Default: `true`. | `bun.d.ts:1031` |
| 2 | property | `Bun.markdown.Options.underline` | `Bun.markdown.Options.underline?: boolean;` | — | — | 0 | 1 | Enable underline syntax (`__text__` renders as `<u>` instead of `<strong>`). Default: `false`. | `bun.d.ts:1037` |
| 2 | property | `Bun.markdown.Options.wikiLinks` | `Bun.markdown.Options.wikiLinks?: boolean;` | — | — | 0 | 1 | Enable wiki-style links (`[[target]]` or `[[target\|label]]`). Default: `false`. | `bun.d.ts:1035` |
| 2 | property | `Bun.markdown.OrderedListProps.start` | `Bun.markdown.OrderedListProps.start: number;` | — | — | 0 | 1 | The start number. | `bun.d.ts:1095` |
| 2 | property | `Bun.markdown.ReactOptions.reactVersion` | `Bun.markdown.ReactOptions.reactVersion?: 18 \| 19;` | — | — | 0 | 1 | Which `$$typeof` symbol to use on the generated elements. | `bun.d.ts:1289` |
| 2 | property | `Bun.markdown.RenderCallbacks.blockquote` | `Bun.markdown.RenderCallbacks.blockquote?: (children: string)` | — | — | 0 | 1 | Blockquote. | `bun.d.ts:1243` |
| 2 | property | `Bun.markdown.RenderCallbacks.code` | `Bun.markdown.RenderCallbacks.code?: (children: string, meta?: CodeBlockMeta)` | — | — | 0 | 1 | Code block. `meta.language` is the info-string (e.g. `"js"`). Only passed for fenced code blocks with a language. | `bun.d.ts:1245` |
| 2 | property | `Bun.markdown.RenderCallbacks.codespan` | `Bun.markdown.RenderCallbacks.codespan?: (children: string)` | — | — | 0 | 1 | Inline code (`` `code` ``). | `bun.d.ts:1275` |
| 2 | property | `Bun.markdown.RenderCallbacks.emphasis` | `Bun.markdown.RenderCallbacks.emphasis?: (children: string)` | — | — | 0 | 1 | Emphasis (`*text*`). | `bun.d.ts:1269` |
| 2 | property | `Bun.markdown.RenderCallbacks.heading` | `Bun.markdown.RenderCallbacks.heading?: (children: string, meta: HeadingMeta)` | — | — | 0 | 1 | Heading (level 1–6). `id` is set when `headings: { ids: true }` is enabled. | `bun.d.ts:1239` |
| 2 | property | `Bun.markdown.RenderCallbacks.hr` | `Bun.markdown.RenderCallbacks.hr?: (children: string)` | — | — | 0 | 1 | Horizontal rule. | `bun.d.ts:1251` |
| 2 | property | `Bun.markdown.RenderCallbacks.html` | `Bun.markdown.RenderCallbacks.html?: (children: string)` | — | — | 0 | 1 | Raw HTML content. | `bun.d.ts:1265` |
| 2 | property | `Bun.markdown.RenderCallbacks.image` | `Bun.markdown.RenderCallbacks.image?: (children: string, meta: ImageMeta)` | — | — | 0 | 1 | Image. `src` is the URL, `title` is the optional title attribute. | `bun.d.ts:1273` |
| 2 | property | `Bun.markdown.RenderCallbacks.link` | `Bun.markdown.RenderCallbacks.link?: (children: string, meta: LinkMeta)` | — | — | 0 | 1 | Link. `href` is the URL, `title` is the optional title attribute. | `bun.d.ts:1271` |
| 2 | property | `Bun.markdown.RenderCallbacks.list` | `Bun.markdown.RenderCallbacks.list?: (children: string, meta: ListMeta)` | — | — | 0 | 1 | Ordered or unordered list. `start` is the first item number for ordered lists. | `bun.d.ts:1247` |
| 2 | property | `Bun.markdown.RenderCallbacks.listItem` | `Bun.markdown.RenderCallbacks.listItem?: (children: string, meta: ListItemMeta)` | — | — | 0 | 1 | List item. `meta` always includes `{index, depth, ordered}`. `meta.start` is set for ordered lists; `meta.checked` is set for task list items. | `bun.d.ts:1249` |
| 2 | property | `Bun.markdown.RenderCallbacks.paragraph` | `Bun.markdown.RenderCallbacks.paragraph?: (children: string)` | — | — | 0 | 1 | Paragraph. | `bun.d.ts:1241` |
| 2 | property | `Bun.markdown.RenderCallbacks.strikethrough` | `Bun.markdown.RenderCallbacks.strikethrough?: (children: string)` | — | — | 0 | 1 | Strikethrough (`~~text~~`). | `bun.d.ts:1277` |
| 2 | property | `Bun.markdown.RenderCallbacks.strong` | `Bun.markdown.RenderCallbacks.strong?: (children: string)` | — | — | 0 | 1 | Strong emphasis (`**text**`). | `bun.d.ts:1267` |
| 2 | property | `Bun.markdown.RenderCallbacks.table` | `Bun.markdown.RenderCallbacks.table?: (children: string)` | — | — | 0 | 1 | Table. | `bun.d.ts:1253` |
| 2 | property | `Bun.markdown.RenderCallbacks.tbody` | `Bun.markdown.RenderCallbacks.tbody?: (children: string)` | — | — | 0 | 1 | Table body. | `bun.d.ts:1257` |
| 2 | property | `Bun.markdown.RenderCallbacks.td` | `Bun.markdown.RenderCallbacks.td?: (children: string, meta?: CellMeta)` | — | — | 0 | 1 | Table data cell. `meta.align` is set when column alignment is specified. | `bun.d.ts:1263` |
| 2 | property | `Bun.markdown.RenderCallbacks.text` | `Bun.markdown.RenderCallbacks.text?: (text: string)` | — | — | 0 | 1 | Plain text content. | `bun.d.ts:1279` |
| 2 | property | `Bun.markdown.RenderCallbacks.th` | `Bun.markdown.RenderCallbacks.th?: (children: string, meta?: CellMeta)` | — | — | 0 | 1 | Table header cell. `meta.align` is set when column alignment is specified. | `bun.d.ts:1261` |
| 2 | property | `Bun.markdown.RenderCallbacks.thead` | `Bun.markdown.RenderCallbacks.thead?: (children: string)` | — | — | 0 | 1 | Table head. | `bun.d.ts:1255` |
| 2 | property | `Bun.markdown.RenderCallbacks.tr` | `Bun.markdown.RenderCallbacks.tr?: (children: string)` | — | — | 0 | 1 | Table row. | `bun.d.ts:1259` |
| 2 | property | `Bun.Password.Argon2Algorithm.algorithm` | `Bun.Password.Argon2Algorithm.algorithm: "argon2id" \| "argon2d" \| "argon2i";` | — | — | 0 | 1 | — | `bun.d.ts:3131` |
| 2 | property | `Bun.Password.Argon2Algorithm.memoryCost` | `Bun.Password.Argon2Algorithm.memoryCost?: number;` | — | — | 0 | 1 | Memory cost, which defines the memory usage, given in kibibytes. Minimum 8. | `bun.d.ts:3136` |
| 2 | property | `Bun.Password.Argon2Algorithm.timeCost` | `Bun.Password.Argon2Algorithm.timeCost?: number;` | — | — | 0 | 1 | Defines the amount of computation realized and therefore the execution | `bun.d.ts:3141` |
| 2 | property | `Bun.Password.BCryptAlgorithm.algorithm` | `Bun.Password.BCryptAlgorithm.algorithm: "bcrypt";` | — | — | 0 | 1 | — | `bun.d.ts:3145` |
| 2 | property | `Bun.Password.BCryptAlgorithm.cost` | `Bun.Password.BCryptAlgorithm.cost?: number;` | — | — | 0 | 1 | A number between 4 and 31. The default is 10. | `bun.d.ts:3150` |
| 2 | property | `Bun.ResourceUsage.contextSwitches.involuntary` | `Bun.ResourceUsage.contextSwitches.involuntary: number;` | — | — | 0 | 1 | Involuntary context switches (context switches initiated by the system scheduler). | `bun.d.ts:7162` |
| 2 | property | `Bun.ResourceUsage.contextSwitches.voluntary` | `Bun.ResourceUsage.contextSwitches.voluntary: number;` | — | — | 0 | 1 | Voluntary context switches (context switches that the process initiated). | `bun.d.ts:7158` |
| 2 | property | `Bun.ResourceUsage.cpuTime.system` | `Bun.ResourceUsage.cpuTime.system: number;` | — | — | 0 | 1 | System CPU time used by the process, in microseconds. | `bun.d.ts:7176` |
| 2 | property | `Bun.ResourceUsage.cpuTime.total` | `Bun.ResourceUsage.cpuTime.total: number;` | — | — | 0 | 1 | Total CPU time used by the process, in microseconds. | `bun.d.ts:7180` |
| 2 | property | `Bun.ResourceUsage.cpuTime.user` | `Bun.ResourceUsage.cpuTime.user: number;` | — | — | 0 | 1 | User CPU time used by the process, in microseconds. | `bun.d.ts:7172` |
| 2 | property | `Bun.ResourceUsage.messages.received` | `Bun.ResourceUsage.messages.received: number;` | — | — | 0 | 1 | The number of IPC messages received. | `bun.d.ts:7198` |
| 2 | property | `Bun.ResourceUsage.messages.sent` | `Bun.ResourceUsage.messages.sent: number;` | — | — | 0 | 1 | The number of IPC messages sent. | `bun.d.ts:7194` |
| 2 | property | `Bun.ResourceUsage.ops.out` | `Bun.ResourceUsage.ops.out: number;` | — | — | 0 | 1 | The number of output operations via the file system. | `bun.d.ts:7211` |
| 2 | property | `Bun.S3ListObjectsResponse.commonPrefixes.prefix` | `Bun.S3ListObjectsResponse.commonPrefixes.prefix: string` | — | — | 0 | 1 | All of the keys (up to 1,000) that share the same prefix are grouped together. When counting the total numbers of returns by this API operation, this group o… | `s3.d.ts:741` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.checksumAlgorithm` | `Bun.S3ListObjectsResponse.contents.checksumAlgorithm?: "CRC32" \| "CRC32C" \| "SHA1" \| "SHA256" \| "CRC64NVME";` | — | — | 0 | 1 | The algorithm that was used to create a checksum of the object. | `s3.d.ts:745` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.checksumType` | `Bun.S3ListObjectsResponse.contents.checksumType?: "COMPOSITE" \| "FULL_OBJECT";` | — | — | 0 | 1 | The checksum type that is used to calculate the object's checksum value. | `s3.d.ts:747` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.eTag` | `Bun.S3ListObjectsResponse.contents.eTag?: string;` | — | — | 0 | 1 | The entity tag is a hash of the object. The ETag reflects changes only to the contents of an object, not its metadata. The ETag may or may not be an MD5 dige… | `s3.d.ts:757` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.key` | `Bun.S3ListObjectsResponse.contents.key: string;` | — | — | 0 | 1 | The name that you assign to an object. You use the object key to retrieve the object. | `s3.d.ts:759` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.lastModified` | `Bun.S3ListObjectsResponse.contents.lastModified?: string;` | — | — | 0 | 1 | Creation date of the object. | `s3.d.ts:761` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.owner` | `Bun.S3ListObjectsResponse.contents.owner?: {` | — | — | 0 | 1 | The owner of the object | `s3.d.ts:763` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.restoreStatus` | `Bun.S3ListObjectsResponse.contents.restoreStatus?: {` | — | — | 0 | 1 | Specifies the restoration status of an object. Objects in certain storage classes must be restored before they can be retrieved. | `s3.d.ts:770` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.size` | `Bun.S3ListObjectsResponse.contents.size?: number;` | — | — | 0 | 1 | Size in bytes of the object | `s3.d.ts:777` |
| 2 | property | `Bun.S3ListObjectsResponse.contents.storageClass` | `Bun.S3ListObjectsResponse.contents.storageClass?:` | — | — | 0 | 1 | The class of storage used to store the object. | `s3.d.ts:779` |
| 2 | property | `Bun.Security.Advisory.description` | `Bun.Security.Advisory.description: string \| null;` | — | — | 0 | 1 | If available, this is a brief description of the advisory that Bun | `security.d.ts:69` |
| 2 | property | `Bun.Security.Advisory.level` | `Bun.Security.Advisory.level: "fatal" \| "warn";` | — | — | 0 | 1 | Level represents the degree of danger for a security advisory | `security.d.ts:52` |
| 2 | property | `Bun.Security.Advisory.package` | `Bun.Security.Advisory.package: string;` | — | — | 0 | 1 | The name of the package attempting to be installed. | `security.d.ts:57` |
| 2 | property | `Bun.Security.Advisory.url` | `Bun.Security.Advisory.url: string \| null;` | — | — | 0 | 1 | If available, this is a url linking to a CVE or report online so | `security.d.ts:63` |
| 2 | property | `Bun.Security.Package.name` | `Bun.Security.Package.name: string;` | — | — | 0 | 1 | The name of the package | `security.d.ts:10` |
| 2 | property | `Bun.Security.Package.requestedRange` | `Bun.Security.Package.requestedRange: string;` | — | — | 0 | 1 | The range that was requested by the command | `security.d.ts:29` |
| 2 | property | `Bun.Security.Package.tarball` | `Bun.Security.Package.tarball: string;` | — | — | 0 | 1 | The URL of the tgz of this package that Bun will download | `security.d.ts:22` |
| 2 | property | `Bun.Security.Package.version` | `Bun.Security.Package.version: string;` | — | yes | 0 | 1 | The resolved version to be installed that matches the requested range. | `security.d.ts:17` |
| 2 | property | `Bun.Security.Scanner.scan` | `Bun.Security.Scanner.scan: (info: { packages: Package[] })` | — | — | 0 | 1 | Perform an advisory check when a user ran `bun add <package> | `security.d.ts:98` |
| 2 | property | `Bun.Security.Scanner.version` | `Bun.Security.Scanner.version: "1";` | — | yes | 0 | 1 | This is the version of the scanner implementation. It may change in | `security.d.ts:82` |
| 2 | property | `Bun.Serve.BaseServeOptions.development` | `Bun.Serve.BaseServeOptions.development?: Development;` | process.env.NODE_ENV !== 'production' | — | 0 | 1 | Render contextual errors? This enables bun's error page | `serve.d.ts:684` |
| 2 | property | `Bun.Serve.BaseServeOptions.error` | `Bun.Serve.BaseServeOptions.error?: (this: Server<WebSocketData>, error: ErrorLike)` | — | — | 0 | 1 | Callback called when an error is thrown during request handling | `serve.d.ts:698` |
| 2 | property | `Bun.Serve.BaseServeOptions.id` | `Bun.Serve.BaseServeOptions.id?: string \| null;` | — | — | 0 | 1 | Uniquely identify a server instance with an ID | `serve.d.ts:715` |
| 2 | property | `Bun.Serve.BaseServeOptions.maxRequestBodySize` | `Bun.Serve.BaseServeOptions.maxRequestBodySize?: number;` | 1024 | — | 0 | 1 | What is the maximum size of a request body? (in bytes) | `serve.d.ts:678` |
| 2 | property | `Bun.Serve.BaseServeOptions.tls` | `Bun.Serve.BaseServeOptions.tls?: TLSOptions \| TLSOptions[];` | — | — | 0 | 1 | Set options for using TLS with this server | `serve.d.ts:672` |
| 2 | property | `Bun.Serve.FetchOrRoutesWithWebSocket.websocket` | `Bun.Serve.FetchOrRoutesWithWebSocket.websocket: WebSocketHandler<WebSocketData>;` | — | — | 0 | 1 | Enable websockets with {@link Bun.serve} | `serve.d.ts:624` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.hostname` | `Bun.Serve.HostnamePortServeOptions.hostname?: "0.0.0.0" \| "127.0.0.1" \| "localhost" \| (string & {});` | — | — | 0 | 1 | What hostname should the server listen on? | `serve.d.ts:737` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.http1` | `Bun.Serve.HostnamePortServeOptions.http1?: boolean;` | true | — | 0 | 1 | Listen for HTTP/1.1 over TCP. Set to `false` together with | `serve.d.ts:773` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.http3` | `Bun.Serve.HostnamePortServeOptions.http3?: boolean;` | false | — | 0 | 1 | Also listen for HTTP/3 (QUIC) on the same port. Requires {@link tls}. | `serve.d.ts:765` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.idleTimeout` | `Bun.Serve.HostnamePortServeOptions.idleTimeout?: number;` | 10 | — | 0 | 1 | Sets the number of seconds to wait before timing out a connection | `serve.d.ts:781` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.ipv6Only` | `Bun.Serve.HostnamePortServeOptions.ipv6Only?: boolean;` | false | — | 0 | 1 | Whether the `IPV6_V6ONLY` flag should be set. | `serve.d.ts:758` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.port` | `Bun.Serve.HostnamePortServeOptions.port?: string \| number;` | process.env.PORT \|\| "3000" | — | 0 | 1 | What port should the server listen on? | `serve.d.ts:743` |
| 2 | property | `Bun.Serve.HostnamePortServeOptions.reusePort` | `Bun.Serve.HostnamePortServeOptions.reusePort?: boolean;` | false | — | 0 | 1 | Whether the `SO_REUSEPORT` flag should be set. | `serve.d.ts:752` |
| 2 | property | `Bun.Serve.UnixServeOptions.unix` | `Bun.Serve.UnixServeOptions.unix?: string;` | — | — | 0 | 1 | If set, the HTTP server will listen on a unix socket instead of a port. | `serve.d.ts:789` |
| 2 | property | `Bun.Server.options.data` | `Bun.Server.options.data?: undefined;` | — | — | 0 | 2 | Data to store on the WebSocket instance | `serve.d.ts:951` |
| 2 | property | `Bun.Server.options.headers` | `Bun.Server.options.headers?: HeadersInit;` | — | — | 0 | 2 | — | `serve.d.ts:930` |
| 2 | property | `Bun.Spawn.BaseOptions.argv0` | `Bun.Spawn.BaseOptions.argv0?: string;` | cmds[0] | — | 0 | 1 | Path to the executable to run in the subprocess. This defaults to `cmds[0]`. | `bun.d.ts:6993` |
| 2 | property | `Bun.Spawn.BaseOptions.cwd` | `Bun.Spawn.BaseOptions.cwd?: string;` | — | — | 0 | 1 | The current working directory of the process | `bun.d.ts:6779` |
| 2 | property | `Bun.Spawn.BaseOptions.detached` | `Bun.Spawn.BaseOptions.detached?: boolean;` | false | — | 0 | 1 | Run the child in a separate process group, detached from the parent. | `bun.d.ts:6795` |
| 2 | property | `Bun.Spawn.BaseOptions.env` | `Bun.Spawn.BaseOptions.env?: Record<string, string \| undefined>;` | — | yes | 0 | 1 | The environment variables of the process | `bun.d.ts:6804` |
| 2 | property | `Bun.Spawn.BaseOptions.error` | `Bun.Spawn.BaseOptions.error?: ErrorLike,` | — | — | 0 | 1 | If an error occurred in the call to waitpid2, this will be the error. | `bun.d.ts:6903` |
| 2 | property | `Bun.Spawn.BaseOptions.exitCode` | `Bun.Spawn.BaseOptions.exitCode: number \| null,` | — | — | 0 | 1 | — | `bun.d.ts:6898` |
| 2 | property | `Bun.Spawn.BaseOptions.handle` | `Bun.Spawn.BaseOptions.handle?: unknown,` | — | — | 0 | 1 | — | `bun.d.ts:6964` |
| 2 | property | `Bun.Spawn.BaseOptions.killSignal` | `Bun.Spawn.BaseOptions.killSignal?: string \| number;` | "SIGTERM" (signal 15) | — | 0 | 1 | The signal to use when killing the process after a timeout, when the AbortSignal is aborted, | `bun.d.ts:7056` |
| 2 | property | `Bun.Spawn.BaseOptions.maxBuffer` | `Bun.Spawn.BaseOptions.maxBuffer?: number;` | undefined (no limit) | — | 0 | 1 | The maximum number of bytes the process may output. If the process goes over this limit, | `bun.d.ts:7064` |
| 2 | property | `Bun.Spawn.BaseOptions.message` | `Bun.Spawn.BaseOptions.message: any,` | — | — | 0 | 1 | — | `bun.d.ts:6959` |
| 2 | property | `Bun.Spawn.BaseOptions.serialization` | `Bun.Spawn.BaseOptions.serialization?: "json" \| "advanced";` | — | — | 0 | 1 | The serialization format to use for IPC messages. Defaults to `"advanced"`. | `bun.d.ts:6974` |
| 2 | property | `Bun.Spawn.BaseOptions.signal` | `Bun.Spawn.BaseOptions.signal?: AbortSignal;` | — | — | 0 | 1 | An {@link AbortSignal} that can be used to abort the subprocess. | `bun.d.ts:7020` |
| 2 | property | `Bun.Spawn.BaseOptions.signalCode` | `Bun.Spawn.BaseOptions.signalCode: number \| null,` | — | — | 0 | 1 | — | `bun.d.ts:6899` |
| 2 | property | `Bun.Spawn.BaseOptions.stderr` | `Bun.Spawn.BaseOptions.stderr?: Err;` | "inherit" for `spawn` | — | 0 | 1 | The file descriptor for the standard error. It may be: | `bun.d.ts:6874` |
| 2 | property | `Bun.Spawn.BaseOptions.stdin` | `Bun.Spawn.BaseOptions.stdin?: In;` | "ignore" | — | 0 | 1 | The file descriptor for the standard input. It may be: | `bun.d.ts:6849` |
| 2 | property | `Bun.Spawn.BaseOptions.stdio` | `Bun.Spawn.BaseOptions.stdio?: [In, Out, Err, ...(Readable \| "socket-fd")[]];` | ["ignore", "pipe", "inherit"] for `spawn` | — | 0 | 1 | The standard file descriptors of the process, in the form [stdin, stdout, stderr]. | `bun.d.ts:6836` |
| 2 | property | `Bun.Spawn.BaseOptions.stdout` | `Bun.Spawn.BaseOptions.stdout?: Out;` | "pipe" | — | 0 | 1 | The file descriptor for the standard output. It may be: | `bun.d.ts:6861` |
| 2 | property | `Bun.Spawn.BaseOptions.subprocess` | `Bun.Spawn.BaseOptions.subprocess: Subprocess<In, Out, Err>,` | — | — | 0 | 2 | — | `bun.d.ts:6897` |
| 2 | property | `Bun.Spawn.BaseOptions.timeout` | `Bun.Spawn.BaseOptions.timeout?: number;` | — | — | 0 | 1 | The maximum amount of time the process is allowed to run in milliseconds. | `bun.d.ts:7038` |
| 2 | property | `Bun.Spawn.BaseOptions.windowsHide` | `Bun.Spawn.BaseOptions.windowsHide?: boolean;` | — | — | 0 | 1 | If true, the subprocess will have a hidden window. | `bun.d.ts:6979` |
| 2 | property | `Bun.Spawn.BaseOptions.windowsVerbatimArguments` | `Bun.Spawn.BaseOptions.windowsVerbatimArguments?: boolean;` | — | — | 0 | 1 | If true, no quoting or escaping of arguments is done on Windows. | `bun.d.ts:6984` |
| 2 | property | `Bun.Spawn.SpawnOptions.lazy` | `Bun.Spawn.SpawnOptions.lazy?: boolean;` | false | — | 0 | 1 | If true, stdout and stderr pipes will not automatically start reading | `bun.d.ts:7092` |
| 2 | property | `Bun.Spawn.SpawnOptions.terminal` | `Bun.Spawn.SpawnOptions.terminal?: TerminalOptions \| Terminal;` | — | — | 0 | 1 | Spawn the subprocess with a pseudo-terminal (PTY) attached. | `bun.d.ts:7130` |
| 2 | property | `Bun.SQL.Helper.columns` | `Bun.SQL.Helper.columns: (keyof T)[];` | — | — | 0 | 1 | — | `sql.d.ts:481` |
| 2 | property | `Bun.SQL.Helper.value` | `Bun.SQL.Helper.value: T[];` | — | — | 0 | 1 | — | `sql.d.ts:480` |
| 2 | property | `Bun.SQL.PostgresError.message` | `Bun.SQL.PostgresError.message: string,` | — | — | 0 | 1 | — | `sql.d.ts:124` |
| 2 | property | `Bun.SQL.PostgresError.options` | `Bun.SQL.PostgresError.options: {` | — | — | 0 | 1 | — | `sql.d.ts:125` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.adapter` | `Bun.SQL.PostgresOrMySQLOptions.adapter?: "postgres" \| "mysql" \| "mariadb";` | "postgres" | — | 0 | 1 | Database adapter/driver to use | `sql.d.ts:268` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.allowPublicKeyRetrieval` | `Bun.SQL.PostgresOrMySQLOptions.allowPublicKeyRetrieval?: boolean \| undefined;` | false | — | 0 | 1 | MySQL only. Allow the client to request the server's RSA public key | `sql.d.ts:391` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.connect_timeout` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.connect_timeout?: number \| undefined;` | 30 | — | 0 | 1 | Maximum time in seconds to wait when establishing a connection (alias | `sql.d.ts:310` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.connection` | `Bun.SQL.PostgresOrMySQLOptions.connection?: Record<string, string \| boolean \| number> \| undefined;` | — | — | 0 | 1 | Postgres client runtime configuration options | `sql.d.ts:361` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.connection_timeout` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.connection_timeout?: number \| undefined;` | 30 | — | 0 | 1 | Maximum time in seconds to wait when establishing a connection (alias for connectionTimeout) | `sql.d.ts:294` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.connectionTimeout` | `Bun.SQL.PostgresOrMySQLOptions.connectionTimeout?: number \| undefined;` | 30 | — | 0 | 1 | Maximum time in seconds to wait when establishing a connection | `sql.d.ts:287` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.connectTimeout` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.connectTimeout?: number \| undefined;` | 30 | — | 0 | 1 | Maximum time in seconds to wait when establishing a connection (alias | `sql.d.ts:302` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.database` | `Bun.SQL.PostgresOrMySQLOptions.database?: string \| undefined;` | The username value | — | 0 | 1 | Name of the database to connect to | `sql.d.ts:255` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.db` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.db?: string \| undefined;` | The username value | — | 0 | 1 | Name of the database to connect to (alias for database) | `sql.d.ts:262` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.host` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.host?: string \| undefined;` | "localhost" | — | 0 | 1 | Database server hostname | `sql.d.ts:211` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.hostname` | `Bun.SQL.PostgresOrMySQLOptions.hostname?: string \| undefined;` | "localhost" | — | 0 | 1 | Database server hostname | `sql.d.ts:217` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.idle_timeout` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.idle_timeout?: number \| undefined;` | 0 (no timeout) | — | 0 | 1 | Maximum time in seconds to wait for connection to become available (alias for idleTimeout) | `sql.d.ts:281` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.idleTimeout` | `Bun.SQL.PostgresOrMySQLOptions.idleTimeout?: number \| undefined;` | 0 (no timeout) | — | 0 | 1 | Maximum time in seconds to wait for connection to become available | `sql.d.ts:274` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.max` | `Bun.SQL.PostgresOrMySQLOptions.max?: number \| undefined;` | 10 | — | 0 | 1 | Maximum number of connections in the pool | `sql.d.ts:367` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.max_lifetime` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.max_lifetime?: number \| undefined;` | 0 (no maximum lifetime) | — | 0 | 1 | Maximum lifetime in seconds of a connection (alias for maxLifetime) | `sql.d.ts:323` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.maxLifetime` | `Bun.SQL.PostgresOrMySQLOptions.maxLifetime?: number \| undefined;` | 0 (no maximum lifetime) | — | 0 | 1 | Maximum lifetime in seconds of a connection | `sql.d.ts:316` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.onclose` | `Bun.SQL.PostgresOrMySQLOptions.onclose?: ((err: Error \| null)` | — | — | 0 | 1 | Callback executed when a connection is closed | `sql.d.ts:354` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.onconnect` | `Bun.SQL.PostgresOrMySQLOptions.onconnect?: ((err: Error \| null)` | — | — | 0 | 1 | Callback executed when a connection attempt completes | `sql.d.ts:348` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.pass` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.pass?: string \| (()` | "" | — | 0 | 1 | Database password for authentication (alias for password) | `sql.d.ts:249` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.password` | `Bun.SQL.PostgresOrMySQLOptions.password?: string \| (()` | "" | — | 0 | 1 | Database password for authentication | `sql.d.ts:242` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.path` | `Bun.SQL.PostgresOrMySQLOptions.path?: string \| undefined;` | undefined | — | 0 | 1 | Unix domain socket path for connection | `sql.d.ts:342` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.port` | `Bun.SQL.PostgresOrMySQLOptions.port?: number \| string \| undefined;` | 5432 | — | 0 | 1 | Database server port number | `sql.d.ts:223` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.prepare` | `Bun.SQL.PostgresOrMySQLOptions.prepare?: boolean \| undefined;` | true | — | 0 | 1 | Automatic creation of prepared statements | `sql.d.ts:380` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.ssl` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.ssl?: Bun.BunFile \| TLSOptions \| boolean \| undefined;` | false | — | 0 | 1 | Whether to use TLS/SSL for the connection (alias for tls) | `sql.d.ts:336` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.tls` | `Bun.SQL.PostgresOrMySQLOptions.tls?: Bun.BunFile \| TLSOptions \| boolean \| undefined;` | false | — | 0 | 1 | Whether to use TLS/SSL for the connection | `sql.d.ts:329` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.url` | `Bun.SQL.PostgresOrMySQLOptions.url?: URL \| string \| undefined;` | — | — | 0 | 1 | Connection URL (can be string or URL object) | `sql.d.ts:204` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.user` *(deprecated)* | `Bun.SQL.PostgresOrMySQLOptions.user?: string \| undefined;` | "postgres" | — | 0 | 1 | Database user for authentication (alias for username) | `sql.d.ts:236` |
| 2 | property | `Bun.SQL.PostgresOrMySQLOptions.username` | `Bun.SQL.PostgresOrMySQLOptions.username?: string \| undefined;` | "postgres" | — | 0 | 1 | Database user for authentication | `sql.d.ts:229` |
| 2 | property | `Bun.SQL.Query.active` | `Bun.SQL.Query.active: boolean;` | — | — | 0 | 1 | Indicates if the query is currently executing | `sql.d.ts:423` |
| 2 | method | `Bun.SQL.Query.cancel` | `Bun.SQL.Query.cancel(): Query<T>;` | — | — | 0 | 1 | Cancels the executing query | `sql.d.ts:433` |
| 2 | property | `Bun.SQL.Query.cancelled` | `Bun.SQL.Query.cancelled: boolean;` | — | — | 0 | 1 | Indicates if the query has been cancelled | `sql.d.ts:428` |
| 2 | method | `Bun.SQL.Query.execute` | `Bun.SQL.Query.execute(): Query<T>;` | — | — | 0 | 1 | Executes the query | `sql.d.ts:444` |
| 2 | method | `Bun.SQL.Query.raw` | `Bun.SQL.Query.raw(): Query<T>;` | — | — | 0 | 1 | Returns the raw query result | `sql.d.ts:449` |
| 2 | method | `Bun.SQL.Query.simple` | `Bun.SQL.Query.simple(): Query<T>;` | — | — | 0 | 1 | Executes the query as a simple query, no parameters are allowed but can | `sql.d.ts:439` |
| 2 | method | `Bun.SQL.Query.values` | `Bun.SQL.Query.values(): Query<T>;` | — | — | 0 | 1 | Returns only the values from the query result | `sql.d.ts:454` |
| 2 | property | `Bun.SQL.SQLiteOptions.adapter` | `Bun.SQL.SQLiteOptions.adapter?: "sqlite";` | — | — | 0 | 1 | — | `sql.d.ts:170` |
| 2 | property | `Bun.SQL.SQLiteOptions.filename` | `Bun.SQL.SQLiteOptions.filename?: URL \| ":memory:" \| (string & {}) \| undefined;` | ":memory:" | — | 0 | 1 | Specify the path to the database file | `sql.d.ts:185` |
| 2 | property | `Bun.SQL.SQLiteOptions.onclose` | `Bun.SQL.SQLiteOptions.onclose?: ((err: Error \| null)` | — | — | 0 | 1 | Callback executed when a connection is closed (SQLite) | `sql.d.ts:197` |
| 2 | property | `Bun.SQL.SQLiteOptions.onconnect` | `Bun.SQL.SQLiteOptions.onconnect?: ((err: Error \| null)` | — | — | 0 | 1 | Callback executed when a connection attempt completes (SQLite) | `sql.d.ts:191` |
| 2 | property | `Bun.TranspilerOptions.exports.eliminate` | `Bun.TranspilerOptions.exports.eliminate?: string[];` | — | — | 0 | 1 | — | `bun.d.ts:2457` |
| 2 | property | `Bun.TranspilerOptions.exports.replace` | `Bun.TranspilerOptions.exports.replace?: Record<string, string>;` | — | — | 0 | 1 | — | `bun.d.ts:2458` |
| 2 | property | `Bun.TSConfig.compilerOptions.baseUrl` | `Bun.TSConfig.compilerOptions.baseUrl?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2378` |
| 2 | property | `Bun.TSConfig.compilerOptions.importsNotUsedAsValues` | `Bun.TSConfig.compilerOptions.importsNotUsedAsValues?: "remove" \| "preserve" \| "error";` | — | — | 0 | 1 | — | `bun.d.ts:2385` |
| 2 | property | `Bun.TSConfig.compilerOptions.jsx` | `Bun.TSConfig.compilerOptions.jsx?: "preserve" \| "react" \| "react-jsx" \| "react-jsxdev";` | — | — | 0 | 1 | "preserve" is not supported yet | `bun.d.ts:2380` |
| 2 | property | `Bun.TSConfig.compilerOptions.jsxFactory` | `Bun.TSConfig.compilerOptions.jsxFactory?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2381` |
| 2 | property | `Bun.TSConfig.compilerOptions.jsxFragmentFactory` | `Bun.TSConfig.compilerOptions.jsxFragmentFactory?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2382` |
| 2 | property | `Bun.TSConfig.compilerOptions.jsxImportSource` | `Bun.TSConfig.compilerOptions.jsxImportSource?: string;` | — | — | 0 | 1 | — | `bun.d.ts:2383` |
| 2 | property | `Bun.TSConfig.compilerOptions.moduleSuffixes` | `Bun.TSConfig.compilerOptions.moduleSuffixes?: any;` | — | — | 0 | 1 | moduleSuffixes is not supported yet | `bun.d.ts:2387` |
| 2 | property | `Bun.TSConfig.compilerOptions.paths` | `Bun.TSConfig.compilerOptions.paths?: Record<string, string[]>;` | — | — | 0 | 1 | — | `bun.d.ts:2377` |
| 2 | property | `Bun.TSConfig.compilerOptions.useDefineForClassFields` | `Bun.TSConfig.compilerOptions.useDefineForClassFields?: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:2384` |
| 2 | method | `Bun.udp.BaseUDPSocket.addMembership` | `Bun.udp.BaseUDPSocket.addMembership(multicastAddress: string, interfaceAddress?: string): boolean;` | — | — | 0 | 1 | Join a multicast group. | `bun.d.ts:6673` |
| 2 | property | `Bun.udp.BaseUDPSocket.address` | `Bun.udp.BaseUDPSocket.address: SocketAddress;` | — | — | 0 | 1 | — | `bun.d.ts:6630` |
| 2 | method | `Bun.udp.BaseUDPSocket.addSourceSpecificMembership` | `Bun.udp.BaseUDPSocket.addSourceSpecificMembership(sourceAddress: string, groupAddress: string, interfaceAddress?: string): boolean;` | — | — | 0 | 1 | Join a source-specific multicast group. | `bun.d.ts:6688` |
| 2 | property | `Bun.udp.BaseUDPSocket.binaryType` | `Bun.udp.BaseUDPSocket.binaryType: BinaryType;` | — | — | 0 | 1 | — | `bun.d.ts:6631` |
| 2 | method | `Bun.udp.BaseUDPSocket.close` | `Bun.udp.BaseUDPSocket.close(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6635` |
| 2 | property | `Bun.udp.BaseUDPSocket.closed` | `Bun.udp.BaseUDPSocket.closed: boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6632` |
| 2 | method | `Bun.udp.BaseUDPSocket.dropMembership` | `Bun.udp.BaseUDPSocket.dropMembership(multicastAddress: string, interfaceAddress?: string): boolean;` | — | — | 0 | 1 | Leave a multicast group. | `bun.d.ts:6680` |
| 2 | method | `Bun.udp.BaseUDPSocket.dropSourceSpecificMembership` | `Bun.udp.BaseUDPSocket.dropSourceSpecificMembership(sourceAddress: string, groupAddress: string, interfaceAddress?: string): boolean;` | — | — | 0 | 1 | Leave a source-specific multicast group. | `bun.d.ts:6696` |
| 2 | property | `Bun.udp.BaseUDPSocket.hostname` | `Bun.udp.BaseUDPSocket.hostname: string;` | — | — | 0 | 1 | — | `bun.d.ts:6628` |
| 2 | property | `Bun.udp.BaseUDPSocket.port` | `Bun.udp.BaseUDPSocket.port: number;` | — | — | 0 | 1 | — | `bun.d.ts:6629` |
| 2 | method | `Bun.udp.BaseUDPSocket.ref` | `Bun.udp.BaseUDPSocket.ref(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6633` |
| 2 | method | `Bun.udp.BaseUDPSocket.setBroadcast` | `Bun.udp.BaseUDPSocket.setBroadcast(enabled: boolean): boolean;` | — | — | 0 | 1 | Enable or disable SO_BROADCAST socket option. | `bun.d.ts:6641` |
| 2 | method | `Bun.udp.BaseUDPSocket.setMulticastInterface` | `Bun.udp.BaseUDPSocket.setMulticastInterface(interfaceAddress: string): boolean;` | — | — | 0 | 1 | Set the IP_MULTICAST_IF socket option to specify the outgoing interface | `bun.d.ts:6666` |
| 2 | method | `Bun.udp.BaseUDPSocket.setMulticastLoopback` | `Bun.udp.BaseUDPSocket.setMulticastLoopback(enabled: boolean): boolean;` | — | — | 0 | 1 | Enable or disable IP_MULTICAST_LOOP socket option. | `bun.d.ts:6659` |
| 2 | method | `Bun.udp.BaseUDPSocket.setMulticastTTL` | `Bun.udp.BaseUDPSocket.setMulticastTTL(ttl: number): number;` | — | — | 0 | 1 | Set the IP_MULTICAST_TTL socket option. | `bun.d.ts:6653` |
| 2 | method | `Bun.udp.BaseUDPSocket.setTTL` | `Bun.udp.BaseUDPSocket.setTTL(ttl: number): number;` | — | — | 0 | 1 | Set the IP_TTL socket option. | `bun.d.ts:6647` |
| 2 | method | `Bun.udp.BaseUDPSocket.unref` | `Bun.udp.BaseUDPSocket.unref(): void;` | — | — | 0 | 1 | — | `bun.d.ts:6634` |
| 2 | method | `Bun.udp.ConnectedSocket.reload` | `Bun.udp.ConnectedSocket.reload(handler: ConnectedSocketHandler<DataBinaryType>): void;` | — | — | 0 | 1 | — | `bun.d.ts:6703` |
| 2 | property | `Bun.udp.ConnectedSocket.remoteAddress` | `Bun.udp.ConnectedSocket.remoteAddress: SocketAddress;` | — | — | 0 | 1 | — | `bun.d.ts:6700` |
| 2 | method | `Bun.udp.ConnectedSocket.send` | `Bun.udp.ConnectedSocket.send(data: Data): boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6702` |
| 2 | method | `Bun.udp.ConnectedSocket.sendMany` | `Bun.udp.ConnectedSocket.sendMany(packets: readonly Data[]): number;` | — | — | 0 | 1 | — | `bun.d.ts:6701` |
| 2 | property | `Bun.udp.ConnectedSocketHandler.address` | `Bun.udp.ConnectedSocketHandler.address: string,` | — | — | 0 | 1 | — | `bun.d.ts:6602` |
| 2 | property | `Bun.udp.ConnectedSocketHandler.data` | `Bun.udp.ConnectedSocketHandler.data: BinaryTypeList[DataBinaryType],` | — | — | 0 | 1 | — | `bun.d.ts:6600` |
| 2 | property | `Bun.udp.ConnectedSocketHandler.flags` | `Bun.udp.ConnectedSocketHandler.flags: ReceiveFlags,` | — | — | 0 | 1 | — | `bun.d.ts:6603` |
| 2 | property | `Bun.udp.ConnectedSocketHandler.port` | `Bun.udp.ConnectedSocketHandler.port: number,` | — | — | 0 | 1 | — | `bun.d.ts:6601` |
| 2 | property | `Bun.udp.ConnectedSocketHandler.socket` | `Bun.udp.ConnectedSocketHandler.socket: ConnectedSocket<DataBinaryType>,` | — | — | 0 | 1 | — | `bun.d.ts:6599` |
| 2 | property | `Bun.udp.ConnectSocketOptions.binaryType` | `Bun.udp.ConnectSocketOptions.binaryType?: DataBinaryType;` | — | — | 0 | 1 | — | `bun.d.ts:6619` |
| 2 | property | `Bun.udp.ConnectSocketOptions.connect` | `Bun.udp.ConnectSocketOptions.connect: {` | — | — | 0 | 1 | — | `bun.d.ts:6621` |
| 2 | property | `Bun.udp.ConnectSocketOptions.hostname` | `Bun.udp.ConnectSocketOptions.hostname?: string;` | — | — | 0 | 1 | — | `bun.d.ts:6617` |
| 2 | property | `Bun.udp.ConnectSocketOptions.port` | `Bun.udp.ConnectSocketOptions.port?: number;` | — | — | 0 | 1 | — | `bun.d.ts:6618` |
| 2 | property | `Bun.udp.ConnectSocketOptions.socket` | `Bun.udp.ConnectSocketOptions.socket?: ConnectedSocketHandler<DataBinaryType>;` | — | — | 0 | 1 | — | `bun.d.ts:6620` |
| 2 | property | `Bun.udp.ReceiveFlags.truncated` | `Bun.udp.ReceiveFlags.truncated: boolean;` | — | — | 0 | 1 | `true` if the datagram was larger than the receive buffer and was | `bun.d.ts:6582` |
| 2 | method | `Bun.udp.Socket.reload` | `Bun.udp.Socket.reload(handler: SocketHandler<DataBinaryType>): void;` | — | — | 0 | 1 | — | `bun.d.ts:6709` |
| 2 | method | `Bun.udp.Socket.send` | `Bun.udp.Socket.send(data: Data, port: number, address: string): boolean;` | — | — | 0 | 1 | — | `bun.d.ts:6708` |
| 2 | method | `Bun.udp.Socket.sendMany` | `Bun.udp.Socket.sendMany(packets: readonly (Data \| string \| number)[]): number;` | — | — | 0 | 1 | — | `bun.d.ts:6707` |
| 2 | property | `Bun.udp.SocketHandler.address` | `Bun.udp.SocketHandler.address: string,` | — | — | 0 | 1 | — | `bun.d.ts:6590` |
| 2 | property | `Bun.udp.SocketHandler.data` | `Bun.udp.SocketHandler.data: BinaryTypeList[DataBinaryType],` | — | — | 0 | 1 | — | `bun.d.ts:6588` |
| 2 | property | `Bun.udp.SocketHandler.flags` | `Bun.udp.SocketHandler.flags: ReceiveFlags,` | — | — | 0 | 1 | — | `bun.d.ts:6591` |
| 2 | property | `Bun.udp.SocketHandler.port` | `Bun.udp.SocketHandler.port: number,` | — | — | 0 | 1 | — | `bun.d.ts:6589` |
| 2 | property | `Bun.udp.SocketHandler.socket` | `Bun.udp.SocketHandler.socket: Socket<DataBinaryType>,` | — | — | 0 | 1 | — | `bun.d.ts:6587` |
| 2 | property | `Bun.udp.SocketOptions.binaryType` | `Bun.udp.SocketOptions.binaryType?: DataBinaryType;` | — | — | 0 | 1 | — | `bun.d.ts:6612` |
| 2 | property | `Bun.udp.SocketOptions.hostname` | `Bun.udp.SocketOptions.hostname?: string;` | — | — | 0 | 1 | — | `bun.d.ts:6610` |
| 2 | property | `Bun.udp.SocketOptions.port` | `Bun.udp.SocketOptions.port?: number;` | — | — | 0 | 1 | — | `bun.d.ts:6611` |
| 2 | property | `Bun.udp.SocketOptions.socket` | `Bun.udp.SocketOptions.socket?: SocketHandler<DataBinaryType>;` | — | — | 0 | 1 | — | `bun.d.ts:6613` |
| 2 | property | `Bun.WebAssembly.Global.value` | `Bun.WebAssembly.Global.value: ValueTypeMap[T];` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Global/value) | `wasm.d.ts:31` |
| 2 | method | `Bun.WebAssembly.Global.valueOf` | `Bun.WebAssembly.Global.valueOf(): ValueTypeMap[T];` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Global/valueOf) | `wasm.d.ts:33` |
| 2 | property | `Bun.WebAssembly.GlobalDescriptor.mutable` | `Bun.WebAssembly.GlobalDescriptor.mutable?: boolean;` | — | — | 0 | 1 | — | `wasm.d.ts:24` |
| 2 | property | `Bun.WebAssembly.GlobalDescriptor.value` | `Bun.WebAssembly.GlobalDescriptor.value: T;` | — | — | 0 | 1 | — | `wasm.d.ts:25` |
| 2 | property | `Bun.WebAssembly.Instance.exports` | `Bun.WebAssembly.Instance.exports: Exports;` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Instance/exports) | `wasm.d.ts:45` |
| 2 | property | `Bun.WebAssembly.Memory.buffer` | `Bun.WebAssembly.Memory.buffer: ArrayBuffer;` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory/buffer) | `wasm.d.ts:51` |
| 2 | method | `Bun.WebAssembly.Memory.grow` | `Bun.WebAssembly.Memory.grow(delta: number): number;` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory/grow) | `wasm.d.ts:53` |
| 2 | property | `Bun.WebAssembly.MemoryDescriptor.initial` | `Bun.WebAssembly.MemoryDescriptor.initial: number;` | — | — | 0 | 1 | — | `wasm.d.ts:72` |
| 2 | property | `Bun.WebAssembly.MemoryDescriptor.maximum` | `Bun.WebAssembly.MemoryDescriptor.maximum?: number;` | — | — | 0 | 1 | — | `wasm.d.ts:73` |
| 2 | property | `Bun.WebAssembly.MemoryDescriptor.shared` | `Bun.WebAssembly.MemoryDescriptor.shared?: boolean;` | — | — | 0 | 1 | — | `wasm.d.ts:74` |
| 2 | property | `Bun.WebAssembly.ModuleExportDescriptor.kind` | `Bun.WebAssembly.ModuleExportDescriptor.kind: ImportExportKind;` | — | — | 0 | 1 | — | `wasm.d.ts:78` |
| 2 | property | `Bun.WebAssembly.ModuleExportDescriptor.name` | `Bun.WebAssembly.ModuleExportDescriptor.name: string;` | — | — | 0 | 1 | — | `wasm.d.ts:79` |
| 2 | property | `Bun.WebAssembly.ModuleImportDescriptor.kind` | `Bun.WebAssembly.ModuleImportDescriptor.kind: ImportExportKind;` | — | — | 0 | 1 | — | `wasm.d.ts:83` |
| 2 | property | `Bun.WebAssembly.ModuleImportDescriptor.name` | `Bun.WebAssembly.ModuleImportDescriptor.name: string;` | — | — | 0 | 1 | — | `wasm.d.ts:85` |
| 2 | method | `Bun.WebAssembly.Table.grow` | `Bun.WebAssembly.Table.grow(delta: number, value?: any): number;` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Table/grow) | `wasm.d.ts:66` |
| 2 | property | `Bun.WebAssembly.Table.length` | `Bun.WebAssembly.Table.length: number;` | — | — | 0 | 1 | [MDN Reference](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Table/length) | `wasm.d.ts:62` |
| 2 | property | `Bun.WebAssembly.TableDescriptor.element` | `Bun.WebAssembly.TableDescriptor.element: TableKind;` | — | — | 0 | 1 | — | `wasm.d.ts:89` |
| 2 | property | `Bun.WebAssembly.TableDescriptor.initial` | `Bun.WebAssembly.TableDescriptor.initial: number;` | — | — | 0 | 1 | — | `wasm.d.ts:90` |
| 2 | property | `Bun.WebAssembly.TableDescriptor.maximum` | `Bun.WebAssembly.TableDescriptor.maximum?: number;` | — | — | 0 | 1 | — | `wasm.d.ts:91` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.anyfunc` | `Bun.WebAssembly.ValueTypeMap.anyfunc: Function;` | — | — | 0 | 1 | — | `wasm.d.ts:12` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.externref` | `Bun.WebAssembly.ValueTypeMap.externref: any;` | — | — | 0 | 1 | — | `wasm.d.ts:13` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.f32` | `Bun.WebAssembly.ValueTypeMap.f32: number;` | — | — | 0 | 1 | — | `wasm.d.ts:14` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.f64` | `Bun.WebAssembly.ValueTypeMap.f64: number;` | — | — | 0 | 1 | — | `wasm.d.ts:15` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.i32` | `Bun.WebAssembly.ValueTypeMap.i32: number;` | — | — | 0 | 1 | — | `wasm.d.ts:16` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.i64` | `Bun.WebAssembly.ValueTypeMap.i64: bigint;` | — | — | 0 | 1 | — | `wasm.d.ts:17` |
| 2 | property | `Bun.WebAssembly.ValueTypeMap.v128` | `Bun.WebAssembly.ValueTypeMap.v128: never;` | — | — | 0 | 1 | — | `wasm.d.ts:18` |
| 2 | property | `Bun.WebAssembly.WebAssemblyInstantiatedSource.instance` | `Bun.WebAssembly.WebAssemblyInstantiatedSource.instance: Instance;` | — | — | 0 | 1 | — | `wasm.d.ts:95` |
| 2 | property | `Bun.WebSocketHandler.perMessageDeflate.compress` | `Bun.WebSocketHandler.perMessageDeflate.compress?: WebSocketCompressor \| boolean;` | — | — | 0 | 1 | Sets the compression level. | `serve.d.ts:481` |
| 2 | property | `Bun.WebSocketHandler.perMessageDeflate.decompress` | `Bun.WebSocketHandler.perMessageDeflate.decompress?: WebSocketCompressor \| boolean;` | — | — | 0 | 1 | Sets the decompression level. | `serve.d.ts:485` |
| 2 | property | `Bun.WebSocketOptionsProxy.proxy.headers` | `Bun.WebSocketOptionsProxy.proxy.headers?: import("node:http").OutgoingHttpHeaders \| Headers;` | — | — | 0 | 1 | Custom headers to send to the proxy server. | `bun.d.ts:4318` |
| 2 | property | `Bun.WebSocketOptionsProxy.proxy.url` | `Bun.WebSocketOptionsProxy.proxy.url: string;` | — | — | 0 | 1 | The proxy URL (http:// or https://) | `bun.d.ts:4313` |
| 2 | property | `Bun.WebView.ClickOptions.button` | `Bun.WebView.ClickOptions.button?: "left" \| "right" \| "middle";` | "left" | — | 0 | 1 | — | `bun.d.ts:8517` |
| 2 | property | `Bun.WebView.ClickOptions.clickCount` | `Bun.WebView.ClickOptions.clickCount?: 1 \| 2 \| 3;` | 1 | — | 0 | 1 | Number of clicks (1 = single, 2 = double, 3 = triple). @default 1 | `bun.d.ts:8521` |
| 2 | property | `Bun.WebView.ClickOptions.modifiers` | `Bun.WebView.ClickOptions.modifiers?: Modifier[];` | — | — | 0 | 1 | Modifier keys to hold during the click. | `bun.d.ts:8519` |
| 2 | property | `Bun.WebView.ClickSelectorOptions.timeout` | `Bun.WebView.ClickSelectorOptions.timeout?: number;` | 30000 | — | 0 | 1 | Maximum time in milliseconds to wait for the element to become | `bun.d.ts:8530` |
| 2 | property | `Bun.WebView.ConstructorOptions.backend` | `Bun.WebView.ConstructorOptions.backend?: Backend;` | "webkit" | — | 0 | 1 | Browser backend. Defaults to `"webkit"` on macOS, throws on other | `bun.d.ts:8687` |
| 2 | property | `Bun.WebView.ConstructorOptions.console` | `Bun.WebView.ConstructorOptions.console?: ConsoleCapture;` | — | — | 0 | 1 | Capture page-side `console.*` calls. See {@link ConsoleCapture}. | `bun.d.ts:8698` |
| 2 | property | `Bun.WebView.ConstructorOptions.dataStore` | `Bun.WebView.ConstructorOptions.dataStore?: "ephemeral" \| { directory: string };` | — | — | 0 | 1 | Storage backing for cookies, localStorage, IndexedDB, etc. | `bun.d.ts:8710` |
| 2 | property | `Bun.WebView.ConstructorOptions.headless` | `Bun.WebView.ConstructorOptions.headless?: boolean;` | true | — | 0 | 1 | Only `true` (headless) is implemented. @default true | `bun.d.ts:8681` |
| 2 | property | `Bun.WebView.ConstructorOptions.height` | `Bun.WebView.ConstructorOptions.height?: number;` | 600 | — | 0 | 1 | Viewport height in pixels. Range: [1, 16384]. @default 600 | `bun.d.ts:8679` |
| 2 | property | `Bun.WebView.ConstructorOptions.url` | `Bun.WebView.ConstructorOptions.url?: string;` | — | — | 0 | 1 | Initial URL to navigate to. The navigation starts before the | `bun.d.ts:8696` |
| 2 | property | `Bun.WebView.ConstructorOptions.width` | `Bun.WebView.ConstructorOptions.width?: number;` | 800 | — | 0 | 1 | Viewport width in pixels. Range: [1, 16384]. @default 800 | `bun.d.ts:8677` |
| 2 | property | `Bun.WebView.PressOptions.modifiers` | `Bun.WebView.PressOptions.modifiers?: Modifier[];` | — | — | 0 | 1 | Modifier keys to hold during the keypress. | `bun.d.ts:8550` |
| 2 | property | `Bun.WebView.ScrollToOptions.block` | `Bun.WebView.ScrollToOptions.block?: "start" \| "center" \| "end" \| "nearest";` | "center" | — | 0 | 1 | Vertical alignment. `"nearest"` scrolls minimally (no-op if already | `bun.d.ts:8545` |
| 2 | property | `Bun.WebView.ScrollToOptions.timeout` | `Bun.WebView.ScrollToOptions.timeout?: number;` | 30000 | — | 0 | 1 | Maximum time in milliseconds to wait for the element to exist. | `bun.d.ts:8538` |
| 3 | property | `Bun.markdown.Options.autolinks.email` | `Bun.markdown.Options.autolinks.email: boolean` | — | — | 0 | 1 | Enable autolinks. Pass `true` to enable all autolink types (URL, WWW, email), | `bun.d.ts:1067` |
| 3 | property | `Bun.markdown.Options.autolinks.url` | `Bun.markdown.Options.autolinks.url: boolean` | — | — | 0 | 1 | Enable autolinks. Pass `true` to enable all autolink types (URL, WWW, email), | `bun.d.ts:1067` |
| 3 | property | `Bun.markdown.Options.autolinks.www` | `Bun.markdown.Options.autolinks.www: boolean` | — | — | 0 | 1 | Enable autolinks. Pass `true` to enable all autolink types (URL, WWW, email), | `bun.d.ts:1067` |
| 3 | property | `Bun.markdown.Options.headings.autolink` | `Bun.markdown.Options.headings.autolink: boolean` | — | — | 0 | 1 | Configure heading IDs and autolink headings. Pass `true` to enable both | `bun.d.ts:1080` |
| 3 | property | `Bun.markdown.Options.headings.ids` | `Bun.markdown.Options.headings.ids: boolean` | — | — | 0 | 1 | Configure heading IDs and autolink headings. Pass `true` to enable both | `bun.d.ts:1080` |
| 3 | property | `Bun.S3ListObjectsResponse.contents.owner.displayName` | `Bun.S3ListObjectsResponse.contents.owner.displayName?: string;` | — | — | 0 | 1 | The display name of the owner. | `s3.d.ts:767` |
| 3 | property | `Bun.S3ListObjectsResponse.contents.owner.id` | `Bun.S3ListObjectsResponse.contents.owner.id?: string;` | — | — | 0 | 1 | The ID of the owner. | `s3.d.ts:765` |
| 3 | property | `Bun.S3ListObjectsResponse.contents.restoreStatus.isRestoreInProgress` | `Bun.S3ListObjectsResponse.contents.restoreStatus.isRestoreInProgress?: boolean;` | — | — | 0 | 1 | Specifies whether the object is currently being restored. | `s3.d.ts:772` |
| 3 | property | `Bun.S3ListObjectsResponse.contents.restoreStatus.restoreExpiryDate` | `Bun.S3ListObjectsResponse.contents.restoreStatus.restoreExpiryDate?: string;` | — | — | 0 | 1 | Indicates when the restored copy will expire. This value is populated only if the object has already been restored. | `s3.d.ts:774` |
| 3 | property | `Bun.SQL.PostgresError.options.code` | `Bun.SQL.PostgresError.options.code: string;` | — | — | 0 | 1 | — | `sql.d.ts:126` |
| 3 | property | `Bun.SQL.PostgresError.options.column` | `Bun.SQL.PostgresError.options.column?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:137` |
| 3 | property | `Bun.SQL.PostgresError.options.constraint` | `Bun.SQL.PostgresError.options.constraint?: string;` | — | — | 0 | 1 | — | `sql.d.ts:139` |
| 3 | property | `Bun.SQL.PostgresError.options.dataType` | `Bun.SQL.PostgresError.options.dataType?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:138` |
| 3 | property | `Bun.SQL.PostgresError.options.detail` | `Bun.SQL.PostgresError.options.detail?: string;` | — | — | 0 | 1 | — | `sql.d.ts:128` |
| 3 | property | `Bun.SQL.PostgresError.options.errno` | `Bun.SQL.PostgresError.options.errno?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:127` |
| 3 | property | `Bun.SQL.PostgresError.options.file` | `Bun.SQL.PostgresError.options.file?: string \| undefined;` | — | yes | 0 | 1 | — | `sql.d.ts:140` |
| 3 | property | `Bun.SQL.PostgresError.options.hint` | `Bun.SQL.PostgresError.options.hint?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:129` |
| 3 | property | `Bun.SQL.PostgresError.options.internalPosition` | `Bun.SQL.PostgresError.options.internalPosition?: string;` | — | — | 0 | 1 | — | `sql.d.ts:132` |
| 3 | property | `Bun.SQL.PostgresError.options.internalQuery` | `Bun.SQL.PostgresError.options.internalQuery?: string;` | — | — | 0 | 1 | — | `sql.d.ts:133` |
| 3 | property | `Bun.SQL.PostgresError.options.line` | `Bun.SQL.PostgresError.options.line?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:141` |
| 3 | property | `Bun.SQL.PostgresError.options.position` | `Bun.SQL.PostgresError.options.position?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:131` |
| 3 | property | `Bun.SQL.PostgresError.options.routine` | `Bun.SQL.PostgresError.options.routine?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:142` |
| 3 | property | `Bun.SQL.PostgresError.options.schema` | `Bun.SQL.PostgresError.options.schema?: string;` | — | — | 0 | 1 | — | `sql.d.ts:135` |
| 3 | property | `Bun.SQL.PostgresError.options.severity` | `Bun.SQL.PostgresError.options.severity?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:130` |
| 3 | property | `Bun.SQL.PostgresError.options.table` | `Bun.SQL.PostgresError.options.table?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:136` |
| 3 | property | `Bun.SQL.PostgresError.options.where` | `Bun.SQL.PostgresError.options.where?: string \| undefined;` | — | — | 0 | 1 | — | `sql.d.ts:134` |
| 3 | property | `Bun.udp.ConnectSocketOptions.connect.hostname` | `Bun.udp.ConnectSocketOptions.connect.hostname: string;` | — | — | 0 | 1 | — | `bun.d.ts:6622` |
| 3 | property | `Bun.udp.ConnectSocketOptions.connect.port` | `Bun.udp.ConnectSocketOptions.connect.port: number;` | — | — | 0 | 1 | — | `bun.d.ts:6623` |
| 3 | property | `Bun.WebView.ConstructorOptions.dataStore.directory` | `Bun.WebView.ConstructorOptions.dataStore.directory: string` | — | — | 0 | 1 | Storage backing for cookies, localStorage, IndexedDB, etc. | `bun.d.ts:8710` |

## Module `bun:bundle` (2)

### Top-level (2)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | function | `bun:bundle.feature` | `bun:bundle.feature(flag: Registry extends { features: infer Features extends string } ? Features : string): boolean;` | — | — | 10 | 1 | Check if a feature flag is enabled at compile time. | `bundle.d.ts:73` |
| 0 | interface | `bun:bundle.Registry` | `bun:bundle.Registry` | — | — | 0 | 1 | Registry for type-safe feature flags. | `bundle.d.ts:51` |

## Module `bun:ffi` (80)

### Top-level (24)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | function | `bun:ffi.cc` | `bun:ffi.cc(options: { /** * File path to an ISO C11 source file to compile and link */ source: string \| import("bun").BunFile \| URL; /** * Library names to link` | — | — | 2 | 1 | **Experimental:** Compile ISO C11 source code using TinyCC, and make {@link symbols} available as functions to JavaScript. | `ffi.d.ts:624` |
| 0 | function | `bun:ffi.CFunction` | `bun:ffi.CFunction(fn: FFIFunction & { ptr: Pointer }): CallableFunction & {` | — | — | 0 | 1 | Turn a native library's function pointer into a JavaScript function | `ffi.d.ts:726` |
| 0 | type | `bun:ffi.ConvertFns` | `bun:ffi.ConvertFns` | — | — | 0 | 1 | — | `ffi.d.ts:541` |
| 0 | class | `bun:ffi.CString` | `new bun:ffi.CString(…)` | — | — | 0 | 1 | Get a string from a UTF-8 encoded C string | `ffi.d.ts:1031` |
| 0 | function | `bun:ffi.dlopen` | `bun:ffi.dlopen( name: string \| import("bun").BunFile \| URL, symbols: Fns, ): Library<Fns>;` | — | — | 2 | 1 | Open a library using `"bun:ffi"` | `ffi.d.ts:585` |
| 0 | interface | `bun:ffi.FFIFunction` | `bun:ffi.FFIFunction` | — | — | 0 | 1 | — | `ffi.d.ts:435` |
| 0 | const | `bun:ffi.FFIFunctionCallableSymbol` | `bun:ffi.FFIFunctionCallableSymbol: unique symbol;` | — | — | 0 | 1 | — | `ffi.d.ts:540` |
| 0 | enum | `bun:ffi.FFIType` | `bun:ffi.FFIType.*` | — | — | 3 | 1 | — | `ffi.d.ts:20` |
| 0 | type | `bun:ffi.FFITypeOrString` | `bun:ffi.FFITypeOrString` | — | — | 0 | 1 | — | `ffi.d.ts:433` |
| 0 | interface | `bun:ffi.FFITypeStringToType` | `bun:ffi.FFITypeStringToType` | — | — | 0 | 1 | — | `ffi.d.ts:397` |
| 0 | interface | `bun:ffi.FFITypeToArgsType` | `bun:ffi.FFITypeToArgsType` | — | — | 0 | 1 | — | `ffi.d.ts:351` |
| 0 | interface | `bun:ffi.FFITypeToReturnsType` | `bun:ffi.FFITypeToReturnsType` | — | — | 0 | 1 | — | `ffi.d.ts:374` |
| 0 | class | `bun:ffi.JSCallback` | `new bun:ffi.JSCallback(…)` | — | — | 0 | 1 | Pass a JavaScript function to FFI (Foreign Function Interface) | `ffi.d.ts:1082` |
| 0 | interface | `bun:ffi.Library` | `bun:ffi.Library` | — | — | 0 | 1 | — | `ffi.d.ts:525` |
| 0 | function | `bun:ffi.linkSymbols` | `bun:ffi.linkSymbols(symbols: Fns): Library<Fns>;` | — | — | 0 | 1 | Link a map of symbols to JavaScript functions | `ffi.d.ts:784` |
| 0 | type | `bun:ffi.Pointer` | `bun:ffi.Pointer` | — | — | 0 | 1 | — | `ffi.d.ts:343` |
| 0 | function | `bun:ffi.ptr` | `bun:ffi.ptr(view: NodeJS.TypedArray \| ArrayBufferLike \| DataView, byteOffset?: number): Pointer;` | — | — | 0 | 1 | Get the pointer backing a {@link TypedArray} or {@link ArrayBuffer} | `ffi.d.ts:1005` |
| 0 | namespace | `bun:ffi.read` | `bun:ffi.read.*` | — | — | 0 | 1 | — | `ffi.d.ts:818` |
| 0 | const | `bun:ffi.suffix` | `bun:ffi.suffix: string;` | — | — | 3 | 1 | Platform-specific file extension name for dynamic libraries | `ffi.d.ts:1135` |
| 0 | type | `bun:ffi.Symbols` | `bun:ffi.Symbols` | — | — | 0 | 1 | — | `ffi.d.ts:523` |
| 0 | function | `bun:ffi.toArrayBuffer` | `bun:ffi.toArrayBuffer(ptr: Pointer, byteOffset?: number, byteLength?: number): ArrayBuffer;` | — | — | 0 | 1 | Read a pointer as an {@link ArrayBuffer} | `ffi.d.ts:816` |
| 0 | function | `bun:ffi.toBuffer` | `bun:ffi.toBuffer(ptr: Pointer, byteOffset?: number, byteLength?: number): Buffer;` | — | — | 0 | 1 | Read a pointer as a {@link Buffer} | `ffi.d.ts:800` |
| 0 | type | `bun:ffi.ToFFIType` | `bun:ffi.ToFFIType` | — | — | 0 | 1 | — | `ffi.d.ts:538` |
| 0 | function | `bun:ffi.viewSource` | `bun:ffi.viewSource(symbols: Symbols, is_callback?: false): string[];` | — | — | 0 | 2 | View the generated C code for FFI bindings | `ffi.d.ts:1117` |

### Nested (56)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | method | `bun:ffi.CString.arrayBuffer` | `get bun:ffi.CString.arrayBuffer(): ArrayBuffer;` | — | — | 0 | 1 | Get the {@link ptr} as an `ArrayBuffer` | `ffi.d.ts:1076` |
| 1 | property | `bun:ffi.CString.byteLength` | `bun:ffi.CString.byteLength?: number;` | — | — | 0 | 1 | — | `ffi.d.ts:1069` |
| 1 | property | `bun:ffi.CString.byteOffset` | `bun:ffi.CString.byteOffset?: number;` | — | — | 0 | 1 | — | `ffi.d.ts:1068` |
| 1 | property | `bun:ffi.CString.ptr` | `bun:ffi.CString.ptr: Pointer;` | — | — | 0 | 1 | The ptr to the C string | `ffi.d.ts:1067` |
| 1 | property | `bun:ffi.FFIFunction.args` | `bun:ffi.FFIFunction.args?: readonly FFITypeOrString[];` | — | — | 0 | 1 | Arguments to a FFI function (C ABI) | `ffi.d.ts:464` |
| 1 | property | `bun:ffi.FFIFunction.ptr` | `bun:ffi.FFIFunction.ptr?: Pointer \| bigint;` | — | — | 0 | 1 | Function pointer to the native function | `ffi.d.ts:503` |
| 1 | property | `bun:ffi.FFIFunction.returns` | `bun:ffi.FFIFunction.returns?: FFITypeOrString;` | — | — | 0 | 1 | Return type to a FFI function (C ABI) | `ffi.d.ts:492` |
| 1 | property | `bun:ffi.FFIFunction.threadsafe` | `bun:ffi.FFIFunction.threadsafe?: boolean;` | false | — | 0 | 1 | Can C/FFI code call this function from a separate thread? | `ffi.d.ts:520` |
| 1 | enum-member | `bun:ffi.FFIType.bool` | `bun:ffi.FFIType.bool = 11` | 11 | — | 0 | 1 | Boolean value | `ffi.d.ts:269` |
| 1 | enum-member | `bun:ffi.FFIType.buffer` | `bun:ffi.FFIType.buffer = 20` | 20 | — | 0 | 1 | — | `ffi.d.ts:340` |
| 1 | enum-member | `bun:ffi.FFIType.char` | `bun:ffi.FFIType.char = 0` | 0 | — | 0 | 1 | — | `ffi.d.ts:21` |
| 1 | enum-member | `bun:ffi.FFIType.cstring` | `bun:ffi.FFIType.cstring = 14` | 14 | — | 0 | 1 | When used as a `returns`, this will automatically become a {@link CString}. | `ffi.d.ts:313` |
| 1 | enum-member | `bun:ffi.FFIType.double` | `bun:ffi.FFIType.double = 9` | 9 | — | 0 | 1 | IEEE-754 double precision float | `ffi.d.ts:241` |
| 1 | enum-member | `bun:ffi.FFIType.f32` | `bun:ffi.FFIType.f32 = 10` | 10 | — | 0 | 1 | Alias of {@link FFIType.float} | `ffi.d.ts:256` |
| 1 | enum-member | `bun:ffi.FFIType.f64` | `bun:ffi.FFIType.f64 = 9` | 9 | — | 0 | 1 | Alias of {@link FFIType.double} | `ffi.d.ts:246` |
| 1 | enum-member | `bun:ffi.FFIType.float` | `bun:ffi.FFIType.float = 10` | 10 | — | 0 | 1 | IEEE-754 single precision float | `ffi.d.ts:251` |
| 1 | enum-member | `bun:ffi.FFIType.i16` | `bun:ffi.FFIType.i16 = 3` | 3 | — | 0 | 1 | 16-bit signed integer | `ffi.d.ts:135` |
| 1 | enum-member | `bun:ffi.FFIType.i32` | `bun:ffi.FFIType.i32 = 5` | 5 | — | 0 | 1 | 32-bit signed integer | `ffi.d.ts:186` |
| 1 | enum-member | `bun:ffi.FFIType.i64` | `bun:ffi.FFIType.i64 = 7` | 7 | — | 0 | 1 | i64 is a 64-bit signed integer | `ffi.d.ts:227` |
| 1 | enum-member | `bun:ffi.FFIType.i64_fast` | `bun:ffi.FFIType.i64_fast = 15` | 15 | — | 0 | 1 | Attempt to coerce `BigInt` into a `Number` if it fits. This improves performance | `ffi.d.ts:324` |
| 1 | enum-member | `bun:ffi.FFIType.i8` | `bun:ffi.FFIType.i8 = 1` | 1 | — | 0 | 1 | 8-bit signed integer | `ffi.d.ts:59` |
| 1 | enum-member | `bun:ffi.FFIType.int` | `bun:ffi.FFIType.int = 5` | 5 | — | 0 | 1 | 32-bit signed integer | `ffi.d.ts:196` |
| 1 | enum-member | `bun:ffi.FFIType.int16_t` | `bun:ffi.FFIType.int16_t = 3` | 3 | — | 0 | 1 | 16-bit signed integer | `ffi.d.ts:116` |
| 1 | enum-member | `bun:ffi.FFIType.int32_t` | `bun:ffi.FFIType.int32_t = 5` | 5 | — | 0 | 1 | 32-bit signed integer | `ffi.d.ts:179` |
| 1 | enum-member | `bun:ffi.FFIType.int64_t` | `bun:ffi.FFIType.int64_t = 7` | 7 | — | 0 | 1 | int64 is a 64-bit signed integer | `ffi.d.ts:223` |
| 1 | enum-member | `bun:ffi.FFIType.int8_t` | `bun:ffi.FFIType.int8_t = 1` | 1 | — | 0 | 1 | 8-bit signed integer | `ffi.d.ts:40` |
| 1 | enum-member | `bun:ffi.FFIType.napi_env` | `bun:ffi.FFIType.napi_env = 18` | 18 | — | 0 | 1 | — | `ffi.d.ts:338` |
| 1 | enum-member | `bun:ffi.FFIType.napi_value` | `bun:ffi.FFIType.napi_value = 19` | 19 | — | 0 | 1 | — | `ffi.d.ts:339` |
| 1 | enum-member | `bun:ffi.FFIType.pointer` | `bun:ffi.FFIType.pointer = 12` | 12 | — | 0 | 1 | Pointer value | `ffi.d.ts:292` |
| 1 | enum-member | `bun:ffi.FFIType.ptr` | `bun:ffi.FFIType.ptr = 12` | 12 | — | 0 | 1 | Pointer value | `ffi.d.ts:286` |
| 1 | enum-member | `bun:ffi.FFIType.u16` | `bun:ffi.FFIType.u16 = 4` | 4 | — | 0 | 1 | 16-bit unsigned integer | `ffi.d.ts:174` |
| 1 | enum-member | `bun:ffi.FFIType.u32` | `bun:ffi.FFIType.u32 = 6` | 6 | — | 0 | 1 | 32-bit unsigned integer | `ffi.d.ts:218` |
| 1 | enum-member | `bun:ffi.FFIType.u64` | `bun:ffi.FFIType.u64 = 8` | 8 | — | 0 | 1 | 64-bit unsigned integer | `ffi.d.ts:236` |
| 1 | enum-member | `bun:ffi.FFIType.u64_fast` | `bun:ffi.FFIType.u64_fast = 16` | 16 | — | 0 | 1 | Attempt to coerce `BigInt` into a `Number` if it fits. This improves performance | `ffi.d.ts:335` |
| 1 | enum-member | `bun:ffi.FFIType.u8` | `bun:ffi.FFIType.u8 = 2` | 2 | — | 0 | 1 | 8-bit unsigned integer | `ffi.d.ts:96` |
| 1 | enum-member | `bun:ffi.FFIType.uint16_t` | `bun:ffi.FFIType.uint16_t = 4` | 4 | — | 0 | 1 | 16-bit unsigned integer | `ffi.d.ts:155` |
| 1 | enum-member | `bun:ffi.FFIType.uint32_t` | `bun:ffi.FFIType.uint32_t = 6` | 6 | — | 0 | 1 | 32-bit unsigned integer | `ffi.d.ts:212` |
| 1 | enum-member | `bun:ffi.FFIType.uint64_t` | `bun:ffi.FFIType.uint64_t = 8` | 8 | — | 0 | 1 | 64-bit unsigned integer | `ffi.d.ts:232` |
| 1 | enum-member | `bun:ffi.FFIType.uint8_t` | `bun:ffi.FFIType.uint8_t = 2` | 2 | — | 0 | 1 | 8-bit unsigned integer | `ffi.d.ts:78` |
| 1 | method | `bun:ffi.JSCallback.close` | `bun:ffi.JSCallback.close(): void;` | — | — | 0 | 1 | Free the memory allocated for the callback | `ffi.d.ts:1108` |
| 1 | property | `bun:ffi.JSCallback.ptr` | `bun:ffi.JSCallback.ptr: Pointer \| null;` | — | — | 0 | 1 | The pointer to the C function | `ffi.d.ts:1096` |
| 1 | property | `bun:ffi.JSCallback.threadsafe` | `bun:ffi.JSCallback.threadsafe: boolean;` | — | — | 0 | 1 | Can the callback be called from a different thread? | `ffi.d.ts:1101` |
| 1 | method | `bun:ffi.Library.close` | `bun:ffi.Library.close(): void;` | — | — | 0 | 1 | `dlclose` the library, unloading the symbols and freeing allocated memory. | `ffi.d.ts:535` |
| 1 | property | `bun:ffi.Library.symbols` | `bun:ffi.Library.symbols: ConvertFns<Fns>;` | — | — | 0 | 1 | — | `ffi.d.ts:526` |
| 1 | function | `bun:ffi.read.f32` | `bun:ffi.read.f32(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:909` |
| 1 | function | `bun:ffi.read.f64` | `bun:ffi.read.f64(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:948` |
| 1 | function | `bun:ffi.read.i16` | `bun:ffi.read.i16(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:870` |
| 1 | function | `bun:ffi.read.i32` | `bun:ffi.read.i32(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:896` |
| 1 | function | `bun:ffi.read.i64` | `bun:ffi.read.i64(ptr: Pointer, byteOffset?: number): bigint;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:935` |
| 1 | function | `bun:ffi.read.i8` | `bun:ffi.read.i8(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:844` |
| 1 | function | `bun:ffi.read.intptr` | `bun:ffi.read.intptr(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:974` |
| 1 | function | `bun:ffi.read.ptr` | `bun:ffi.read.ptr(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:961` |
| 1 | function | `bun:ffi.read.u16` | `bun:ffi.read.u16(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:857` |
| 1 | function | `bun:ffi.read.u32` | `bun:ffi.read.u32(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:883` |
| 1 | function | `bun:ffi.read.u64` | `bun:ffi.read.u64(ptr: Pointer, byteOffset?: number): bigint;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:922` |
| 1 | function | `bun:ffi.read.u8` | `bun:ffi.read.u8(ptr: Pointer, byteOffset?: number): number;` | — | — | 0 | 1 | The read function behaves similarly to DataView, | `ffi.d.ts:831` |

## Module `bun:jsc` (48)

### Top-level (31)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | function | `bun:jsc.callerSourceOrigin` | `bun:jsc.callerSourceOrigin(): string;` | — | — | 0 | 1 | — | `jsc.d.ts:16` |
| 0 | function | `bun:jsc.deserialize` | `bun:jsc.deserialize(value: ArrayBufferLike \| NodeJS.TypedArray \| Buffer): any;` | — | — | 0 | 1 | Convert an ArrayBuffer or Buffer to a JavaScript value compatible with the HTML Structured Clone Algorithm. | `jsc.d.ts:51` |
| 0 | function | `bun:jsc.drainMicrotasks` | `bun:jsc.drainMicrotasks(): void;` | — | — | 0 | 1 | — | `jsc.d.ts:24` |
| 0 | function | `bun:jsc.edenGC` | `bun:jsc.edenGC(): number;` | — | — | 0 | 1 | — | `jsc.d.ts:9` |
| 0 | function | `bun:jsc.estimateShallowMemoryUsageOf` | `bun:jsc.estimateShallowMemoryUsageOf(value: object \| CallableFunction \| bigint \| symbol \| string): number;` | — | — | 2 | 1 | Non-recursively estimate the memory usage of an object, excluding the memory usage of | `jsc.d.ts:232` |
| 0 | function | `bun:jsc.fullGC` | `bun:jsc.fullGC(): number;` | — | — | 0 | 1 | — | `jsc.d.ts:8` |
| 0 | function | `bun:jsc.gcAndSweep` | `bun:jsc.gcAndSweep(): number;` | — | — | 0 | 1 | — | `jsc.d.ts:7` |
| 0 | function | `bun:jsc.getProtectedObjects` | `bun:jsc.getProtectedObjects(): any[];` | — | — | 0 | 1 | This returns objects which native code has explicitly protected from being | `jsc.d.ts:206` |
| 0 | function | `bun:jsc.getRandomSeed` | `bun:jsc.getRandomSeed(): number;` | — | — | 0 | 1 | — | `jsc.d.ts:13` |
| 0 | function | `bun:jsc.heapSize` | `bun:jsc.heapSize(): number;` | — | — | 0 | 1 | — | `jsc.d.ts:10` |
| 0 | function | `bun:jsc.heapStats` | `bun:jsc.heapStats(): HeapStats;` | — | — | 0 | 1 | — | `jsc.d.ts:11` |
| 0 | interface | `bun:jsc.HeapStats` | `bun:jsc.HeapStats` | — | — | 0 | 1 | — | `jsc.d.ts:65` |
| 0 | function | `bun:jsc.isRope` | `bun:jsc.isRope(input: string): boolean;` | — | — | 0 | 1 | — | `jsc.d.ts:15` |
| 0 | function | `bun:jsc.jscDescribe` | `bun:jsc.jscDescribe(value: any): string;` | — | — | 0 | 1 | This used to be called "describe" but it could be confused with the test runner. | `jsc.d.ts:5` |
| 0 | function | `bun:jsc.jscDescribeArray` | `bun:jsc.jscDescribeArray(args: any[]): string;` | — | — | 0 | 1 | — | `jsc.d.ts:6` |
| 0 | function | `bun:jsc.memoryUsage` | `bun:jsc.memoryUsage(): MemoryUsage;` | — | — | 0 | 1 | — | `jsc.d.ts:12` |
| 0 | interface | `bun:jsc.MemoryUsage` | `bun:jsc.MemoryUsage` | — | — | 0 | 1 | — | `jsc.d.ts:77` |
| 0 | function | `bun:jsc.noFTL` | `bun:jsc.noFTL(func: (...args: any[]) => any): (...args: any[]) => any;` | — | — | 0 | 1 | — | `jsc.d.ts:17` |
| 0 | function | `bun:jsc.noOSRExitFuzzing` | `bun:jsc.noOSRExitFuzzing(func: (...args: any[]) => any): (...args: any[]) => any;` | — | — | 0 | 1 | — | `jsc.d.ts:18` |
| 0 | function | `bun:jsc.numberOfDFGCompiles` | `bun:jsc.numberOfDFGCompiles(func: (...args: any[]) => any): number;` | — | — | 0 | 1 | — | `jsc.d.ts:20` |
| 0 | function | `bun:jsc.optimizeNextInvocation` | `bun:jsc.optimizeNextInvocation(func: (...args: any[]) => any): void;` | — | — | 0 | 1 | — | `jsc.d.ts:19` |
| 0 | function | `bun:jsc.profile` | `bun:jsc.profile(...args: any[]) => any>(` | — | — | 0 | 1 | Run JavaScriptCore's sampling profiler for a particular function | `jsc.d.ts:189` |
| 0 | function | `bun:jsc.releaseWeakRefs` | `bun:jsc.releaseWeakRefs(): void;` | — | — | 0 | 1 | — | `jsc.d.ts:21` |
| 0 | function | `bun:jsc.reoptimizationRetryCount` | `bun:jsc.reoptimizationRetryCount(func: (...args: any[]) => any): number;` | — | — | 0 | 1 | — | `jsc.d.ts:23` |
| 0 | interface | `bun:jsc.SamplingProfile` | `bun:jsc.SamplingProfile` | — | — | 0 | 1 | — | `jsc.d.ts:85` |
| 0 | function | `bun:jsc.serialize` | `bun:jsc.serialize(value: any, options?: { binaryType?: "arraybuffer" }): SharedArrayBuffer;` | — | — | 0 | 2 | Convert a JavaScript value to a binary representation that can be sent to another Bun instance. | `jsc.d.ts:34` |
| 0 | function | `bun:jsc.setRandomSeed` | `bun:jsc.setRandomSeed(value: number): void;` | — | — | 0 | 1 | — | `jsc.d.ts:14` |
| 0 | function | `bun:jsc.setTimeZone` | `bun:jsc.setTimeZone(timeZone: string): string;` | — | — | 0 | 1 | Set the timezone used by Intl, Date, etc. | `jsc.d.ts:63` |
| 0 | function | `bun:jsc.startRemoteDebugger` | `bun:jsc.startRemoteDebugger(host?: string, port?: number): void;` | — | — | 0 | 1 | Start a remote debugging socket server on the given port. | `jsc.d.ts:215` |
| 0 | function | `bun:jsc.startSamplingProfiler` | `bun:jsc.startSamplingProfiler(optionalDirectory?: string): void;` | — | — | 0 | 1 | Run JavaScriptCore's sampling profiler | `jsc.d.ts:220` |
| 0 | function | `bun:jsc.totalCompileTime` | `bun:jsc.totalCompileTime(func: (...args: any[]) => any): number;` | — | — | 0 | 1 | — | `jsc.d.ts:22` |

### Nested (17)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | property | `bun:jsc.HeapStats.extraMemorySize` | `bun:jsc.HeapStats.extraMemorySize: number;` | — | — | 0 | 1 | — | `jsc.d.ts:68` |
| 1 | property | `bun:jsc.HeapStats.globalObjectCount` | `bun:jsc.HeapStats.globalObjectCount: number;` | — | — | 0 | 1 | — | `jsc.d.ts:71` |
| 1 | property | `bun:jsc.HeapStats.heapCapacity` | `bun:jsc.HeapStats.heapCapacity: number;` | — | — | 0 | 1 | — | `jsc.d.ts:67` |
| 1 | property | `bun:jsc.HeapStats.heapSize` | `bun:jsc.HeapStats.heapSize: number;` | — | — | 0 | 1 | — | `jsc.d.ts:66` |
| 1 | property | `bun:jsc.HeapStats.objectCount` | `bun:jsc.HeapStats.objectCount: number;` | — | — | 0 | 1 | — | `jsc.d.ts:69` |
| 1 | property | `bun:jsc.HeapStats.objectTypeCounts` | `bun:jsc.HeapStats.objectTypeCounts: Record<string, number>;` | — | — | 0 | 1 | — | `jsc.d.ts:73` |
| 1 | property | `bun:jsc.HeapStats.protectedGlobalObjectCount` | `bun:jsc.HeapStats.protectedGlobalObjectCount: number;` | — | — | 0 | 1 | — | `jsc.d.ts:72` |
| 1 | property | `bun:jsc.HeapStats.protectedObjectCount` | `bun:jsc.HeapStats.protectedObjectCount: number;` | — | — | 0 | 1 | — | `jsc.d.ts:70` |
| 1 | property | `bun:jsc.HeapStats.protectedObjectTypeCounts` | `bun:jsc.HeapStats.protectedObjectTypeCounts: Record<string, number>;` | — | — | 0 | 1 | — | `jsc.d.ts:74` |
| 1 | property | `bun:jsc.MemoryUsage.current` | `bun:jsc.MemoryUsage.current: number;` | — | — | 0 | 1 | — | `jsc.d.ts:78` |
| 1 | property | `bun:jsc.MemoryUsage.currentCommit` | `bun:jsc.MemoryUsage.currentCommit: number;` | — | — | 0 | 1 | — | `jsc.d.ts:80` |
| 1 | property | `bun:jsc.MemoryUsage.pageFaults` | `bun:jsc.MemoryUsage.pageFaults: number;` | — | — | 0 | 1 | — | `jsc.d.ts:82` |
| 1 | property | `bun:jsc.MemoryUsage.peak` | `bun:jsc.MemoryUsage.peak: number;` | — | — | 0 | 1 | — | `jsc.d.ts:79` |
| 1 | property | `bun:jsc.MemoryUsage.peakCommit` | `bun:jsc.MemoryUsage.peakCommit: number;` | — | — | 0 | 1 | — | `jsc.d.ts:81` |
| 1 | property | `bun:jsc.SamplingProfile.bytecodes` | `bun:jsc.SamplingProfile.bytecodes: string;` | — | — | 0 | 1 | A formatted summary of the top bytecodes | `jsc.d.ts:170` |
| 1 | property | `bun:jsc.SamplingProfile.functions` | `bun:jsc.SamplingProfile.functions: string;` | — | — | 0 | 1 | A formatted summary of the top functions | `jsc.d.ts:108` |
| 1 | property | `bun:jsc.SamplingProfile.stackTraces` | `bun:jsc.SamplingProfile.stackTraces: string[];` | — | — | 0 | 1 | Stack traces of the top functions | `jsc.d.ts:175` |

## Module `bun:sqlite` (117)

### Top-level (8)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | interface | `bun:sqlite.Changes` | `bun:sqlite.Changes` | — | — | 0 | 1 | An object representing the changes made to the database since the last `run` or `exec` call. | `sqlite.d.ts:1311` |
| 0 | namespace | `bun:sqlite.constants` | `bun:sqlite.constants.*` | — | — | 0 | 1 | Constants from `sqlite3.h` | `sqlite.d.ts:959` |
| 0 | class | `bun:sqlite.Database` | `new bun:sqlite.Database(…)` | — | — | 356 | 1 | A SQLite3 database | `sqlite.d.ts:117` |
| 0 | interface | `bun:sqlite.DatabaseOptions` | `bun:sqlite.DatabaseOptions` | — | — | 0 | 1 | Options for {@link Database} | `sqlite.d.ts:30` |
| 0 | var | `bun:sqlite.native` | `bun:sqlite.native: any;` | — | — | 0 | 1 | The native module implementing the sqlite3 C bindings | `sqlite.d.ts:1257` |
| 0 | class | `bun:sqlite.SQLiteError` | `new bun:sqlite.SQLiteError(…)` | — | — | 0 | 1 | Errors from SQLite have a name `SQLiteError`. | `sqlite.d.ts:1274` |
| 0 | type | `bun:sqlite.SQLQueryBindings` | `bun:sqlite.SQLQueryBindings` | — | — | 0 | 1 | — | `sqlite.d.ts:1259` |
| 0 | class | `bun:sqlite.Statement` | `new bun:sqlite.Statement(…)` | — | — | 0 | 1 | A prepared statement. | `sqlite.d.ts:596` |

### Nested (109)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | property | `bun:sqlite.Changes.changes` | `bun:sqlite.Changes.changes: number;` | — | — | 0 | 1 | The number of rows changed by the last `run` or `exec` call. | `sqlite.d.ts:1315` |
| 1 | property | `bun:sqlite.Changes.lastInsertRowid` | `bun:sqlite.Changes.lastInsertRowid: number \| bigint;` | — | — | 0 | 1 | If `safeIntegers` is `true`, this is a `bigint`. Otherwise, it is a `number`. | `sqlite.d.ts:1320` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE` | `bun:sqlite.constants.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1198` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_BUSYHANDLER` | `bun:sqlite.constants.SQLITE_FCNTL_BUSYHANDLER: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1138` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_CHUNK_SIZE` | `bun:sqlite.constants.SQLITE_FCNTL_CHUNK_SIZE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1086` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_CKPT_DONE` | `bun:sqlite.constants.SQLITE_FCNTL_CKPT_DONE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1222` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_CKPT_START` | `bun:sqlite.constants.SQLITE_FCNTL_CKPT_START: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1230` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_CKSM_FILE` | `bun:sqlite.constants.SQLITE_FCNTL_CKSM_FILE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1238` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE` | `bun:sqlite.constants.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1202` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_COMMIT_PHASETWO` | `bun:sqlite.constants.SQLITE_FCNTL_COMMIT_PHASETWO: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1162` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_DATA_VERSION` | `bun:sqlite.constants.SQLITE_FCNTL_DATA_VERSION: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1214` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_EXTERNAL_READER` | `bun:sqlite.constants.SQLITE_FCNTL_EXTERNAL_READER: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1234` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_FILE_POINTER` | `bun:sqlite.constants.SQLITE_FCNTL_FILE_POINTER: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1090` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_GET_LOCKPROXYFILE` | `bun:sqlite.constants.SQLITE_FCNTL_GET_LOCKPROXYFILE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1070` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_HAS_MOVED` | `bun:sqlite.constants.SQLITE_FCNTL_HAS_MOVED: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1154` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_JOURNAL_POINTER` | `bun:sqlite.constants.SQLITE_FCNTL_JOURNAL_POINTER: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1186` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_LAST_ERRNO` | `bun:sqlite.constants.SQLITE_FCNTL_LAST_ERRNO: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1078` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_LOCK_TIMEOUT` | `bun:sqlite.constants.SQLITE_FCNTL_LOCK_TIMEOUT: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1210` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_LOCKSTATE` | `bun:sqlite.constants.SQLITE_FCNTL_LOCKSTATE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1066` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_MMAP_SIZE` | `bun:sqlite.constants.SQLITE_FCNTL_MMAP_SIZE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1146` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_OVERWRITE` | `bun:sqlite.constants.SQLITE_FCNTL_OVERWRITE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1122` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_PDB` | `bun:sqlite.constants.SQLITE_FCNTL_PDB: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1194` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_PERSIST_WAL` | `bun:sqlite.constants.SQLITE_FCNTL_PERSIST_WAL: number;` | — | — | 0 | 1 | Control whether or not the WAL is persisted | `sqlite.d.ts:1118` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_POWERSAFE_OVERWRITE` | `bun:sqlite.constants.SQLITE_FCNTL_POWERSAFE_OVERWRITE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1130` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_PRAGMA` | `bun:sqlite.constants.SQLITE_FCNTL_PRAGMA: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1134` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_RBU` | `bun:sqlite.constants.SQLITE_FCNTL_RBU: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1178` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_RESERVE_BYTES` | `bun:sqlite.constants.SQLITE_FCNTL_RESERVE_BYTES: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1226` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_RESET_CACHE` | `bun:sqlite.constants.SQLITE_FCNTL_RESET_CACHE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1242` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE` | `bun:sqlite.constants.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1206` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_SET_LOCKPROXYFILE` | `bun:sqlite.constants.SQLITE_FCNTL_SET_LOCKPROXYFILE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1074` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_SIZE_HINT` | `bun:sqlite.constants.SQLITE_FCNTL_SIZE_HINT: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1082` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_SIZE_LIMIT` | `bun:sqlite.constants.SQLITE_FCNTL_SIZE_LIMIT: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1218` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_SYNC` | `bun:sqlite.constants.SQLITE_FCNTL_SYNC: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1158` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_SYNC_OMITTED` | `bun:sqlite.constants.SQLITE_FCNTL_SYNC_OMITTED: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1094` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_TEMPFILENAME` | `bun:sqlite.constants.SQLITE_FCNTL_TEMPFILENAME: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1142` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_TRACE` | `bun:sqlite.constants.SQLITE_FCNTL_TRACE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1150` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_VFS_POINTER` | `bun:sqlite.constants.SQLITE_FCNTL_VFS_POINTER: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1182` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_VFSNAME` | `bun:sqlite.constants.SQLITE_FCNTL_VFSNAME: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1126` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_WAL_BLOCK` | `bun:sqlite.constants.SQLITE_FCNTL_WAL_BLOCK: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1170` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_AV_RETRY` | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_AV_RETRY: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1098` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_GET_HANDLE` | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_GET_HANDLE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1190` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_SET_HANDLE` | `bun:sqlite.constants.SQLITE_FCNTL_WIN32_SET_HANDLE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1166` |
| 1 | const | `bun:sqlite.constants.SQLITE_FCNTL_ZIPVFS` | `bun:sqlite.constants.SQLITE_FCNTL_ZIPVFS: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1174` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_AUTOPROXY` | `bun:sqlite.constants.SQLITE_OPEN_AUTOPROXY: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:986` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_CREATE` | `bun:sqlite.constants.SQLITE_OPEN_CREATE: number;` | — | — | 0 | 1 | Allow creating a new database | `sqlite.d.ts:974` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_DELETEONCLOSE` | `bun:sqlite.constants.SQLITE_OPEN_DELETEONCLOSE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:978` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_EXCLUSIVE` | `bun:sqlite.constants.SQLITE_OPEN_EXCLUSIVE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:982` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_EXRESCODE` | `bun:sqlite.constants.SQLITE_OPEN_EXRESCODE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1050` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_FULLMUTEX` | `bun:sqlite.constants.SQLITE_OPEN_FULLMUTEX: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1030` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_MAIN_DB` | `bun:sqlite.constants.SQLITE_OPEN_MAIN_DB: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:998` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_MAIN_JOURNAL` | `bun:sqlite.constants.SQLITE_OPEN_MAIN_JOURNAL: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1010` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_MEMORY` | `bun:sqlite.constants.SQLITE_OPEN_MEMORY: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:994` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_NOFOLLOW` | `bun:sqlite.constants.SQLITE_OPEN_NOFOLLOW: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1046` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_NOMUTEX` | `bun:sqlite.constants.SQLITE_OPEN_NOMUTEX: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1026` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_PRIVATECACHE` | `bun:sqlite.constants.SQLITE_OPEN_PRIVATECACHE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1038` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_READONLY` | `bun:sqlite.constants.SQLITE_OPEN_READONLY: number;` | — | — | 0 | 1 | Open the database as read-only (no write operations, no create). | `sqlite.d.ts:964` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_READWRITE` | `bun:sqlite.constants.SQLITE_OPEN_READWRITE: number;` | — | — | 0 | 1 | Open the database for reading and writing | `sqlite.d.ts:969` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_SHAREDCACHE` | `bun:sqlite.constants.SQLITE_OPEN_SHAREDCACHE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1034` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_SUBJOURNAL` | `bun:sqlite.constants.SQLITE_OPEN_SUBJOURNAL: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1018` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_SUPER_JOURNAL` | `bun:sqlite.constants.SQLITE_OPEN_SUPER_JOURNAL: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1022` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_TEMP_DB` | `bun:sqlite.constants.SQLITE_OPEN_TEMP_DB: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1002` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_TEMP_JOURNAL` | `bun:sqlite.constants.SQLITE_OPEN_TEMP_JOURNAL: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1014` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_TRANSIENT_DB` | `bun:sqlite.constants.SQLITE_OPEN_TRANSIENT_DB: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1006` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_URI` | `bun:sqlite.constants.SQLITE_OPEN_URI: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:990` |
| 1 | const | `bun:sqlite.constants.SQLITE_OPEN_WAL` | `bun:sqlite.constants.SQLITE_OPEN_WAL: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1042` |
| 1 | const | `bun:sqlite.constants.SQLITE_PREPARE_NO_VTAB` | `bun:sqlite.constants.SQLITE_PREPARE_NO_VTAB: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1062` |
| 1 | const | `bun:sqlite.constants.SQLITE_PREPARE_NORMALIZE` | `bun:sqlite.constants.SQLITE_PREPARE_NORMALIZE: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1058` |
| 1 | const | `bun:sqlite.constants.SQLITE_PREPARE_PERSISTENT` | `bun:sqlite.constants.SQLITE_PREPARE_PERSISTENT: number;` | — | — | 0 | 1 | — | `sqlite.d.ts:1054` |
| 1 | method | `bun:sqlite.Database.close` | `bun:sqlite.Database.close( /** * If `true`, then the database will throw an error if it is in use * @default false * * When true, this calls `sqlite3_close` ins` | — | — | 0 | 1 | Close the database connection. | `sqlite.d.ts:278` |
| 1 | method | `bun:sqlite.Database.deserialize` | `bun:sqlite.Database.deserialize(serialized: NodeJS.TypedArray \| ArrayBufferLike, isReadOnly?: boolean): Database;` | — | — | 0 | 2 | Load a serialized SQLite3 database | `sqlite.d.ts:481` |
| 1 | method | `bun:sqlite.Database.exec` *(deprecated)* | `bun:sqlite.Database.exec(sql: string, ...bindings: ParamsType[]): Changes;` | — | — | 0 | 1 | This is an alias of {@link Database.run} | `sqlite.d.ts:193` |
| 1 | method | `bun:sqlite.Database.fileControl` | `bun:sqlite.Database.fileControl(op: number, arg?: ArrayBufferView \| number): number;` | — | — | 0 | 2 | See `sqlite3_file_control` for more information. | `sqlite.d.ts:560` |
| 1 | property | `bun:sqlite.Database.filename` | `bun:sqlite.Database.filename: string;` | — | — | 0 | 1 | The filename passed when `new Database()` was called | `sqlite.d.ts:302` |
| 1 | property | `bun:sqlite.Database.handle` | `bun:sqlite.Database.handle: number;` | — | — | 0 | 1 | The underlying `sqlite3` database handle | `sqlite.d.ts:309` |
| 1 | property | `bun:sqlite.Database.insideTransaction` | `bun:sqlite.Database.insideTransaction: (...args: A)` | — | — | 0 | 1 | — | `sqlite.d.ts:381` |
| 1 | method | `bun:sqlite.Database.inTransaction` | `get bun:sqlite.Database.inTransaction(): boolean;` | — | — | 0 | 1 | Is the database in a transaction? | `sqlite.d.ts:261` |
| 1 | method | `bun:sqlite.Database.loadExtension` | `bun:sqlite.Database.loadExtension(extension: string, entryPoint?: string): void;` | — | — | 0 | 1 | Load a SQLite3 extension | `sqlite.d.ts:321` |
| 1 | method | `bun:sqlite.Database.open` | `bun:sqlite.Database.open(filename: string, options?: number \| DatabaseOptions): Database;` | — | — | 0 | 1 | Open or create a SQLite3 databases | `sqlite.d.ts:136` |
| 1 | property | `bun:sqlite.Database.options` | `bun:sqlite.Database.options?: { readonly?: boolean; strict?: boolean; safeIntegers?: boolean },` | — | — | 0 | 1 | — | `sqlite.d.ts:553` |
| 1 | property | `bun:sqlite.Database.params` | `bun:sqlite.Database.params?: ParamsType,` | — | — | 0 | 1 | — | `sqlite.d.ts:244` |
| 1 | method | `bun:sqlite.Database.prepare` | `bun:sqlite.Database.prepare( sql: string, params?: ParamsType, ): Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]>;` | — | — | 0 | 1 | Compile a SQL query and return a {@link Statement} object. | `sqlite.d.ts:242` |
| 1 | method | `bun:sqlite.Database.query` | `bun:sqlite.Database.query( sql: string, ): Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]>;` | — | — | 0 | 1 | Compile a SQL query and return a {@link Statement} object. This is the | `sqlite.d.ts:218` |
| 1 | method | `bun:sqlite.Database.run` | `bun:sqlite.Database.run(sql: string, ...bindings: ParamsType[]): Changes;` | — | — | 0 | 1 | Execute a SQL query **without returning any results**. | `sqlite.d.ts:186` |
| 1 | method | `bun:sqlite.Database.serialize` | `bun:sqlite.Database.serialize(name?: string): Buffer;` | "main" | — | 0 | 1 | Save the database to an in-memory {@link Buffer} object. | `sqlite.d.ts:412` |
| 1 | property | `bun:sqlite.Database.serialized` | `bun:sqlite.Database.serialized: NodeJS.TypedArray \| ArrayBufferLike,` | — | — | 0 | 1 | — | `sqlite.d.ts:552` |
| 1 | method | `bun:sqlite.Database.setCustomSQLite` | `bun:sqlite.Database.setCustomSQLite(path: string): boolean;` | — | — | 0 | 1 | Change the dynamic library path to SQLite | `sqlite.d.ts:336` |
| 1 | property | `bun:sqlite.Database.sql` | `bun:sqlite.Database.sql: string,` | — | — | 0 | 2 | — | `sqlite.d.ts:219` |
| 1 | property | `bun:sqlite.Database.throwOnError` | `bun:sqlite.Database.throwOnError?: boolean,` | false | — | 0 | 1 | If `true`, then the database will throw an error if it is in use | `sqlite.d.ts:290` |
| 1 | method | `bun:sqlite.Database.transaction` | `bun:sqlite.Database.transaction( insideTransaction: (...args: A) => T, ): {` | — | — | 0 | 1 | Creates a function that always runs inside a transaction. When the | `sqlite.d.ts:380` |
| 1 | property | `bun:sqlite.DatabaseOptions.create` | `bun:sqlite.DatabaseOptions.create?: boolean;` | — | — | 0 | 1 | Allow creating a new database | `sqlite.d.ts:43` |
| 1 | property | `bun:sqlite.DatabaseOptions.readwrite` | `bun:sqlite.DatabaseOptions.readwrite?: boolean;` | — | — | 0 | 1 | Open the database as read-write | `sqlite.d.ts:50` |
| 1 | property | `bun:sqlite.DatabaseOptions.safeIntegers` | `bun:sqlite.DatabaseOptions.safeIntegers?: boolean;` | false | — | 0 | 1 | When set to `true`, integers are returned as `bigint` types. | `sqlite.d.ts:60` |
| 1 | property | `bun:sqlite.DatabaseOptions.strict` | `bun:sqlite.DatabaseOptions.strict?: boolean;` | — | — | 0 | 1 | When set to `false` or `undefined`: | `sqlite.d.ts:84` |
| 1 | property | `bun:sqlite.SQLiteError.byteOffset` | `bun:sqlite.SQLiteError.byteOffset: number;` | — | — | 0 | 1 | The UTF-8 byte offset of the sqlite3 query that failed, if known | `sqlite.d.ts:1303` |
| 1 | property | `bun:sqlite.SQLiteError.code` | `bun:sqlite.SQLiteError.code?: string;` | — | — | 0 | 1 | The name of the SQLite3 error code | `sqlite.d.ts:1294` |
| 1 | property | `bun:sqlite.SQLiteError.errno` | `bun:sqlite.SQLiteError.errno: number;` | — | — | 0 | 1 | The SQLite3 extended error code | `sqlite.d.ts:1284` |
| 1 | property | `bun:sqlite.SQLiteError.name` | `bun:sqlite.SQLiteError.name: "SQLiteError";` | — | — | 0 | 1 | — | `sqlite.d.ts:1275` |
| 1 | method | `bun:sqlite.Statement.all` | `bun:sqlite.Statement.all(...params: ParamsType): ReturnType[];` | — | — | 0 | 1 | Execute the prepared statement and return all results as objects. | `sqlite.d.ts:623` |
| 1 | property | `bun:sqlite.Statement.columnNames` | `bun:sqlite.Statement.columnNames: string[];` | — | — | 0 | 1 | The names of the columns returned by the prepared statement. | `sqlite.d.ts:776` |
| 1 | property | `bun:sqlite.Statement.columnTypes` | `bun:sqlite.Statement.columnTypes: Array<"INTEGER" \| "FLOAT" \| "TEXT" \| "BLOB" \| "NULL" \| null>;` | — | — | 0 | 1 | The actual SQLite column types from the first row of the result set. | `sqlite.d.ts:831` |
| 1 | property | `bun:sqlite.Statement.declaredTypes` | `bun:sqlite.Statement.declaredTypes: Array<string \| null>;` | — | — | 0 | 1 | The declared column types from the table schema. | `sqlite.d.ts:866` |
| 1 | method | `bun:sqlite.Statement.finalize` | `bun:sqlite.Statement.finalize(): void;` | — | — | 0 | 1 | Finalize the prepared statement, freeing the resources used by the | `sqlite.d.ts:879` |
| 1 | method | `bun:sqlite.Statement.iterate` | `bun:sqlite.Statement.iterate(...params: ParamsType): IterableIterator<ReturnType>;` | — | — | 0 | 1 | Execute the prepared statement and return an | `sqlite.d.ts:666` |
| 1 | property | `bun:sqlite.Statement.native` | `bun:sqlite.Statement.native: any;` | — | — | 0 | 1 | Native object representing the underlying `sqlite3_stmt` | `sqlite.d.ts:951` |
| 1 | property | `bun:sqlite.Statement.paramsCount` | `bun:sqlite.Statement.paramsCount: number;` | — | — | 0 | 1 | The number of parameters expected in the prepared statement. | `sqlite.d.ts:793` |
| 1 | method | `bun:sqlite.Statement.raw` | `bun:sqlite.Statement.raw(...params: ParamsType): Array<Array<Uint8Array \| null>>;` | — | — | 0 | 1 | Execute the prepared statement and return all results as arrays of | `sqlite.d.ts:764` |
| 1 | method | `bun:sqlite.Statement.run` | `bun:sqlite.Statement.run(...params: ParamsType): Changes;` | — | — | 0 | 1 | Execute the prepared statement. | `sqlite.d.ts:700` |
| 1 | method | `bun:sqlite.Statement.toString` | `bun:sqlite.Statement.toString(): string;` | — | — | 0 | 1 | Return the expanded SQL string for the prepared statement. | `sqlite.d.ts:900` |
| 1 | method | `bun:sqlite.Statement.values` | `bun:sqlite.Statement.values(...params: ParamsType): Array<Array<string \| bigint \| number \| boolean \| Uint8Array>>;` | — | — | 0 | 1 | Execute the prepared statement and return the results as an array of arrays. | `sqlite.d.ts:740` |

## Module `bun:test` (265)

### Top-level (45)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 0 | namespace | `bun:test.__internal` | `bun:test.__internal.*` | — | — | 0 | 1 | — | `test.d.ts:430` |
| 0 | function | `bun:test.afterAll` | `bun:test.afterAll( fn: (() => void \| Promise<unknown>) \| ((done: (err?: unknown) => void) => void), options?: HookOptions, ): void;` | — | — | 50 | 1 | Runs a function, once, after all the tests. | `test.d.ts:359` |
| 0 | function | `bun:test.afterEach` | `bun:test.afterEach( fn: (() => void \| Promise<unknown>) \| ((done: (err?: unknown) => void) => void), options?: HookOptions, ): void;` | — | — | 116 | 1 | Runs a function after each test. | `test.d.ts:371` |
| 0 | type | `bun:test.AsymmetricMatcher` | `bun:test.AsymmetricMatcher` | — | — | 0 | 1 | — | `test.d.ts:1900` |
| 0 | interface | `bun:test.AsymmetricMatchers` | `bun:test.AsymmetricMatchers` | — | — | 0 | 1 | You can extend this interface with declaration merging, in order to add type support for custom asymmetric matchers. | `test.d.ts:768` |
| 0 | interface | `bun:test.AsymmetricMatchersBuiltin` | `bun:test.AsymmetricMatchersBuiltin` | — | — | 0 | 1 | — | `test.d.ts:770` |
| 0 | interface | `bun:test.AsymmetricMatchersBuiltinNegated` | `bun:test.AsymmetricMatchersBuiltinNegated` | — | — | 0 | 1 | — | `test.d.ts:835` |
| 0 | function | `bun:test.beforeAll` | `bun:test.beforeAll( fn: (() => void \| Promise<unknown>) \| ((done: (err?: unknown) => void) => void), options?: HookOptions, ): void;` | — | — | 30 | 1 | Runs a function, once, before all the tests. | `test.d.ts:325` |
| 0 | function | `bun:test.beforeEach` | `bun:test.beforeEach( fn: (() => void \| Promise<unknown>) \| ((done: (err?: unknown) => void) => void), options?: HookOptions, ): void;` | — | — | 114 | 1 | Runs a function before each test. | `test.d.ts:339` |
| 0 | type | `bun:test.CustomMatcher` | `bun:test.CustomMatcher` | — | — | 0 | 1 | — | `test.d.ts:1907` |
| 0 | type | `bun:test.CustomMatchersDetected` | `bun:test.CustomMatchersDetected` | — | — | 0 | 1 | All non-builtin matchers and asymmetric matchers that have been type-registered through declaration merging | `test.d.ts:1914` |
| 0 | const | `bun:test.describe` | `bun:test.describe: Describe<[]>;` | — | — | 1234 | 1 | Describes a group of related tests. | `test.d.ts:297` |
| 0 | interface | `bun:test.Describe` | `bun:test.Describe` | — | — | 0 | 1 | Describes a group of related tests. | `test.d.ts:227` |
| 0 | type | `bun:test.DescribeLabel` | `bun:test.DescribeLabel` | — | — | 0 | 1 | — | `test.d.ts:207` |
| 0 | type | `bun:test.EqualsFunction` | `bun:test.EqualsFunction` | — | — | 0 | 1 | — | `test.d.ts:1930` |
| 0 | const | `bun:test.expect` | `bun:test.expect: Expect;` | — | — | 1251 | 1 | Asserts that a value matches some criteria. | `test.d.ts:613` |
| 0 | interface | `bun:test.Expect` | `bun:test.Expect` | — | — | 0 | 1 | — | `test.d.ts:617` |
| 0 | type | `bun:test.ExpectExtendMatchers` | `bun:test.ExpectExtendMatchers` | — | — | 0 | 1 | If the types has been defined through declaration merging, enforce it. | `test.d.ts:1921` |
| 0 | type | `bun:test.ExpectNot` | `bun:test.ExpectNot` | — | — | 0 | 1 | — | `test.d.ts:615` |
| 0 | const | `bun:test.expectTypeOf` | `bun:test.expectTypeOf: typeof import("./vendor/expect-type").expectTypeOf;` | — | — | 4 | 1 | — | `test.d.ts:2391` |
| 0 | interface | `bun:test.FunctionLike` | `bun:test.FunctionLike` | — | — | 0 | 1 | — | `test.d.ts:203` |
| 0 | type | `bun:test.HookOptions` | `bun:test.HookOptions` | — | — | 0 | 1 | — | `test.d.ts:308` |
| 0 | namespace | `bun:test.jest` | `bun:test.jest.*` | — | — | 0 | 1 | — | `test.d.ts:91` |
| 0 | namespace | `bun:test.JestMock` | `bun:test.JestMock.*` | — | — | 0 | 1 | — | `test.d.ts:1991` |
| 0 | type | `bun:test.MatcherContext` | `bun:test.MatcherContext` | — | — | 0 | 1 | — | `test.d.ts:1989` |
| 0 | type | `bun:test.MatcherHintColor` | `bun:test.MatcherHintColor` | — | — | 0 | 1 | — | `test.d.ts:1958` |
| 0 | interface | `bun:test.MatcherResult` | `bun:test.MatcherResult` | — | — | 0 | 1 | — | `test.d.ts:1902` |
| 0 | interface | `bun:test.Matchers` | `bun:test.Matchers` | — | — | 0 | 1 | You can extend this interface with declaration merging, in order to add type support for custom matchers. | `test.d.ts:743` |
| 0 | interface | `bun:test.MatchersBuiltin` | `bun:test.MatchersBuiltin` | — | — | 0 | 1 | — | `test.d.ts:900` |
| 0 | interface | `bun:test.MatcherState` | `bun:test.MatcherState` | — | — | 0 | 1 | — | `test.d.ts:1941` |
| 0 | interface | `bun:test.MatcherUtils` | `bun:test.MatcherUtils` | — | — | 0 | 1 | — | `test.d.ts:1960` |
| 0 | const | `bun:test.mock` | `bun:test.mock: {` | — | — | 8 | 1 | — | `test.d.ts:19` |
| 0 | type | `bun:test.Mock` | `bun:test.Mock` | — | — | 0 | 1 | — | `test.d.ts:17` |
| 0 | function | `bun:test.onTestFinished` | `bun:test.onTestFinished( fn: (() => void \| Promise<unknown>) \| ((done: (err?: unknown) => void) => void), options?: HookOptions, ): void;` | — | — | 0 | 1 | Runs a function after a test finishes, including after all afterEach hooks. | `test.d.ts:393` |
| 0 | function | `bun:test.setDefaultTimeout` | `bun:test.setDefaultTimeout(milliseconds: number): void;` | — | — | 0 | 1 | Sets the default timeout for all tests in the current file. If a test specifies a timeout, it will | `test.d.ts:403` |
| 0 | function | `bun:test.setSystemTime` | `bun:test.setSystemTime(now?: Date \| number): ThisType<void>;` | — | — | 4 | 1 | Control the system time used by: | `test.d.ts:89` |
| 0 | function | `bun:test.spyOn` | `bun:test.spyOn( obj: T, methodOrPropertyValue: K, ): Mock<Extract<T[K], (...args: any[]) => any>>;` | — | — | 6 | 1 | Create a spy on an object property or method | `test.d.ts:161` |
| 0 | const | `bun:test.test` | `bun:test.test: Test<[]>;` | — | — | 1241 | 1 | Runs a test. | `test.d.ts:589` |
| 0 | interface | `bun:test.Test` | `bun:test.Test` | — | — | 0 | 1 | Runs a test. | `test.d.ts:468` |
| 0 | type | `bun:test.Tester` | `bun:test.Tester` | — | — | 0 | 1 | Custom equality tester | `test.d.ts:1928` |
| 0 | interface | `bun:test.TesterContext` | `bun:test.TesterContext` | — | — | 0 | 1 | — | `test.d.ts:1937` |
| 0 | interface | `bun:test.TestOptions` | `bun:test.TestOptions` | — | — | 0 | 1 | — | `test.d.ts:404` |
| 0 | const | `bun:test.vi` | `bun:test.vi: {` | — | — | 0 | 1 | Vitest-compatible mocking utilities | `test.d.ts:170` |
| 0 | const | `bun:test.xdescribe` | `bun:test.xdescribe: Describe<[]>;` | — | — | 0 | 1 | Skips a group of related tests. | `test.d.ts:306` |
| 0 | const | `bun:test.xtest` | `bun:test.xtest: Test<[]>;` | — | — | 0 | 1 | Skips a test. | `test.d.ts:600` |

### Nested (220)

| Depth | Kind | Setting | Form | Default | agentsMap | callSites | Overloads | Notes | Source |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | type | `bun:test.__internal.Flatten` | `bun:test.__internal.Flatten` | — | — | 0 | 1 | Accepts `[1, 2, 3] \| ["a", "b", "c"]` and returns `[1 \| "a", 2 \| "b", 3 \| "c"]` | `test.d.ts:442` |
| 1 | type | `bun:test.__internal.IfNeverThenElse` | `bun:test.__internal.IfNeverThenElse` | — | — | 0 | 1 | — | `test.d.ts:431` |
| 1 | type | `bun:test.__internal.IsTuple` | `bun:test.__internal.IsTuple` | — | — | 0 | 1 | — | `test.d.ts:433` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.anything` | `bun:test.AsymmetricMatchersBuiltin.anything(): AsymmetricMatcher;` | — | — | 0 | 1 | Matches anything but null or undefined. You can use it inside `toEqual` or `toBeCalledWith` instead | `test.d.ts:801` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.arrayContaining` | `bun:test.AsymmetricMatchersBuiltin.arrayContaining(arr: readonly E[]): AsymmetricMatcher;` | — | — | 0 | 1 | Matches any array made up entirely of elements in the provided array. | `test.d.ts:808` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.closeTo` | `bun:test.AsymmetricMatchersBuiltin.closeTo(num: number, numDigits?: number): AsymmetricMatcher;` | — | — | 0 | 1 | Useful when comparing floating point numbers in object properties or array item. | `test.d.ts:832` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.objectContaining` | `bun:test.AsymmetricMatchersBuiltin.objectContaining(obj: object): AsymmetricMatcher;` | — | — | 0 | 1 | Matches any object that recursively matches the provided keys. | `test.d.ts:816` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.stringContaining` | `bun:test.AsymmetricMatchersBuiltin.stringContaining(str: string \| String): AsymmetricMatcher;` | — | — | 0 | 1 | Matches any received string that contains the exact expected string | `test.d.ts:820` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltin.stringMatching` | `bun:test.AsymmetricMatchersBuiltin.stringMatching(regex: string \| String \| RegExp): AsymmetricMatcher;` | — | — | 0 | 1 | Matches any string that contains the exact provided string | `test.d.ts:824` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltinNegated.arrayContaining` | `bun:test.AsymmetricMatchersBuiltinNegated.arrayContaining(arr: readonly E[]): AsymmetricMatcher;` | — | — | 0 | 1 | `expect.not.arrayContaining(array)` matches a received array which | `test.d.ts:864` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltinNegated.closeTo` | `bun:test.AsymmetricMatchersBuiltinNegated.closeTo(num: number, numDigits?: number): AsymmetricMatcher;` | — | — | 0 | 1 | `expect.not.closeTo` matches a number not close to the provided value. | `test.d.ts:897` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltinNegated.objectContaining` | `bun:test.AsymmetricMatchersBuiltinNegated.objectContaining(obj: object): AsymmetricMatcher;` | — | — | 0 | 1 | `expect.not.objectContaining(object)` matches any received object | `test.d.ts:876` |
| 1 | property | `bun:test.AsymmetricMatchersBuiltinNegated.rejectsTo` | `bun:test.AsymmetricMatchersBuiltinNegated.rejectsTo: ExpectNot;` | — | — | 0 | 1 | Create an asymmetric matcher that will fail on a promise rejected value that matches the chained matcher. | `test.d.ts:854` |
| 1 | property | `bun:test.AsymmetricMatchersBuiltinNegated.resolvesTo` | `bun:test.AsymmetricMatchersBuiltinNegated.resolvesTo: ExpectNot;` | — | — | 0 | 1 | Create an asymmetric matcher that will fail on a promise resolved value that matches the chained matcher. | `test.d.ts:844` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltinNegated.stringContaining` | `bun:test.AsymmetricMatchersBuiltinNegated.stringContaining(str: string \| String): AsymmetricMatcher;` | — | — | 0 | 1 | `expect.not.stringContaining(string)` matches the received string | `test.d.ts:883` |
| 1 | method | `bun:test.AsymmetricMatchersBuiltinNegated.stringMatching` | `bun:test.AsymmetricMatchersBuiltinNegated.stringMatching(str: string \| String \| RegExp): AsymmetricMatcher;` | — | — | 0 | 1 | `expect.not.stringMatching(string \| regexp)` matches the received | `test.d.ts:890` |
| 1 | property | `bun:test.Describe.concurrent` | `bun:test.Describe.concurrent: Describe<T>;` | — | — | 0 | 1 | Marks this group of tests to be executed concurrently. | `test.d.ts:246` |
| 1 | method | `bun:test.Describe.each` | `bun:test.Describe.each(table: readonly T[]): Describe<[...T]>;` | — | — | 0 | 2 | — | `test.d.ts:278` |
| 1 | property | `bun:test.Describe.only` | `bun:test.Describe.only: Describe<T>;` | — | — | 0 | 1 | Skips all other tests, except this group of tests. | `test.d.ts:234` |
| 1 | property | `bun:test.Describe.serial` | `bun:test.Describe.serial: Describe<T>;` | — | — | 0 | 1 | Marks this group of tests to be executed serially (one after another), | `test.d.ts:251` |
| 1 | property | `bun:test.Describe.skip` | `bun:test.Describe.skip: Describe<T>;` | — | — | 0 | 1 | Skips this group of tests. | `test.d.ts:238` |
| 1 | method | `bun:test.Describe.skipIf` | `bun:test.Describe.skipIf(condition: boolean): Describe<T>;` | — | — | 0 | 1 | Skips this group of tests, if `condition` is true. | `test.d.ts:265` |
| 1 | property | `bun:test.Describe.todo` | `bun:test.Describe.todo: Describe<T>;` | — | — | 0 | 1 | Marks this group of tests as to be written or to be fixed. | `test.d.ts:242` |
| 1 | method | `bun:test.Describe.todoIf` | `bun:test.Describe.todoIf(condition: boolean): Describe<T>;` | — | — | 0 | 1 | Marks this group of tests as to be written or to be fixed, if `condition` is true. | `test.d.ts:271` |
| 1 | method | `bun:test.Expect.assertions` | `bun:test.Expect.assertions(neededAssertions: number): void;` | — | — | 0 | 1 | Ensures that a specific number of assertions are made | `test.d.ts:715` |
| 1 | method | `bun:test.Expect.extend` | `bun:test.Expect.extend(matchers: ExpectExtendMatchers<M>): void;` | — | — | 0 | 1 | Register new custom matchers. | `test.d.ts:683` |
| 1 | method | `bun:test.Expect.hasAssertions` | `bun:test.Expect.hasAssertions(): void;` | — | — | 0 | 1 | Ensures that an assertion is made | `test.d.ts:710` |
| 1 | property | `bun:test.Expect.not` | `bun:test.Expect.not: ExpectNot;` | — | — | 0 | 1 | Access to negated asymmetric matchers. | `test.d.ts:635` |
| 1 | property | `bun:test.Expect.rejectsTo` | `bun:test.Expect.rejectsTo: AsymmetricMatchers;` | — | — | 0 | 1 | Create an asymmetric matcher for a promise rejected value. | `test.d.ts:655` |
| 1 | property | `bun:test.Expect.resolvesTo` | `bun:test.Expect.resolvesTo: AsymmetricMatchers;` | — | — | 0 | 1 | Create an asymmetric matcher for a promise resolved value. | `test.d.ts:645` |
| 1 | method | `bun:test.Expect.unreachable` | `bun:test.Expect.unreachable(msg?: string \| Error): never;` | — | — | 0 | 1 | Throw an error if this function is called. | `test.d.ts:705` |
| 1 | property | `bun:test.FunctionLike.name` | `bun:test.FunctionLike.name: string;` | — | — | 0 | 1 | — | `test.d.ts:204` |
| 1 | function | `bun:test.jest.advanceTimersByTime` | `bun:test.jest.advanceTimersByTime(milliseconds: number): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:100` |
| 1 | function | `bun:test.jest.advanceTimersToNextTimer` | `bun:test.jest.advanceTimersToNextTimer(): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:101` |
| 1 | function | `bun:test.jest.clearAllMocks` | `bun:test.jest.clearAllMocks(): void;` | — | — | 0 | 1 | — | `test.d.ts:93` |
| 1 | function | `bun:test.jest.clearAllTimers` | `bun:test.jest.clearAllTimers(): void;` | — | — | 0 | 1 | — | `test.d.ts:105` |
| 1 | function | `bun:test.jest.fn` | `bun:test.jest.fn(...args: any[]) => any>(func?: T): Mock<T>;` | — | — | 0 | 1 | — | `test.d.ts:95` |
| 1 | function | `bun:test.jest.getTimerCount` | `bun:test.jest.getTimerCount(): number;` | — | — | 0 | 1 | — | `test.d.ts:104` |
| 1 | function | `bun:test.jest.isFakeTimers` | `bun:test.jest.isFakeTimers(): boolean;` | — | — | 0 | 1 | — | `test.d.ts:106` |
| 1 | type | `bun:test.jest.Mock` | `bun:test.jest.Mock` | — | — | 0 | 1 | Constructs the type of a mock function, e.g. the return type of `jest.fn()`. | `test.d.ts:115` |
| 1 | type | `bun:test.jest.Replaced` | `bun:test.jest.Replaced` | — | — | 0 | 1 | Constructs the type of a replaced property. | `test.d.ts:135` |
| 1 | function | `bun:test.jest.resetAllMocks` | `bun:test.jest.resetAllMocks(): void;` | — | — | 0 | 1 | — | `test.d.ts:94` |
| 1 | function | `bun:test.jest.restoreAllMocks` | `bun:test.jest.restoreAllMocks(): void;` | — | — | 0 | 1 | — | `test.d.ts:92` |
| 1 | function | `bun:test.jest.runAllTimers` | `bun:test.jest.runAllTimers(): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:102` |
| 1 | function | `bun:test.jest.runOnlyPendingTimers` | `bun:test.jest.runOnlyPendingTimers(): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:103` |
| 1 | function | `bun:test.jest.setSystemTime` | `bun:test.jest.setSystemTime(now?: number \| Date): void;` | — | — | 0 | 1 | — | `test.d.ts:96` |
| 1 | function | `bun:test.jest.setTimeout` | `bun:test.jest.setTimeout(milliseconds: number): void;` | — | — | 0 | 1 | — | `test.d.ts:97` |
| 1 | type | `bun:test.jest.Spied` | `bun:test.jest.Spied` | — | — | 0 | 1 | Constructs the type of a spied class or function. | `test.d.ts:139` |
| 1 | type | `bun:test.jest.SpiedClass` | `bun:test.jest.SpiedClass` | — | — | 0 | 1 | Constructs the type of a spied class. | `test.d.ts:143` |
| 1 | type | `bun:test.jest.SpiedFunction` | `bun:test.jest.SpiedFunction` | — | — | 0 | 1 | Constructs the type of a spied function. | `test.d.ts:147` |
| 1 | type | `bun:test.jest.SpiedGetter` | `bun:test.jest.SpiedGetter` | — | — | 0 | 1 | Constructs the type of a spied getter. | `test.d.ts:151` |
| 1 | type | `bun:test.jest.SpiedSetter` | `bun:test.jest.SpiedSetter` | — | — | 0 | 1 | Constructs the type of a spied setter. | `test.d.ts:155` |
| 1 | function | `bun:test.jest.spyOn` | `bun:test.jest.spyOn( obj: T, methodOrPropertyValue: K, ): Mock<Extract<T[K], (...args: any[]) => any>>;` | — | — | 0 | 1 | — | `test.d.ts:107` |
| 1 | function | `bun:test.jest.useFakeTimers` | `bun:test.jest.useFakeTimers(options?: { now?: number \| Date }): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:98` |
| 1 | function | `bun:test.jest.useRealTimers` | `bun:test.jest.useRealTimers(): typeof vi;` | — | — | 0 | 1 | — | `test.d.ts:99` |
| 1 | interface | `bun:test.JestMock.ClassLike` | `bun:test.JestMock.ClassLike` | — | — | 0 | 1 | Copyright (c) Meta Platforms, Inc. and affiliates. | `test.d.ts:1998` |
| 1 | type | `bun:test.JestMock.ConstructorLikeKeys` | `bun:test.JestMock.ConstructorLikeKeys` | — | — | 0 | 1 | — | `test.d.ts:2002` |
| 1 | type | `bun:test.JestMock.FunctionLike` | `bun:test.JestMock.FunctionLike` | — | — | 0 | 1 | — | `test.d.ts:2010` |
| 1 | type | `bun:test.JestMock.MethodLikeKeys` | `bun:test.JestMock.MethodLikeKeys` | — | — | 0 | 1 | — | `test.d.ts:2012` |
| 1 | interface | `bun:test.JestMock.Mock` | `bun:test.JestMock.Mock` | — | — | 0 | 1 | — | `test.d.ts:2016` |
| 1 | type | `bun:test.JestMock.MockFunctionResult` | `bun:test.JestMock.MockFunctionResult` | — | — | 0 | 1 | — | `test.d.ts:2101` |
| 1 | interface | `bun:test.JestMock.MockFunctionResultIncomplete` | `bun:test.JestMock.MockFunctionResultIncomplete` | — | — | 0 | 1 | — | `test.d.ts:2106` |
| 1 | interface | `bun:test.JestMock.MockFunctionResultReturn` | `bun:test.JestMock.MockFunctionResultReturn` | — | — | 0 | 1 | — | `test.d.ts:2116` |
| 1 | interface | `bun:test.JestMock.MockFunctionResultThrow` | `bun:test.JestMock.MockFunctionResultThrow` | — | — | 0 | 1 | — | `test.d.ts:2124` |
| 1 | interface | `bun:test.JestMock.MockFunctionState` | `bun:test.JestMock.MockFunctionState` | — | — | 0 | 1 | — | `test.d.ts:2132` |
| 1 | interface | `bun:test.JestMock.MockInstance` | `bun:test.JestMock.MockInstance` | — | — | 0 | 1 | — | `test.d.ts:2161` |
| 1 | type | `bun:test.JestMock.PropertyLikeKeys` | `bun:test.JestMock.PropertyLikeKeys` | — | — | 0 | 1 | — | `test.d.ts:2298` |
| 1 | type | `bun:test.JestMock.RejectType` | `bun:test.JestMock.RejectType` | — | — | 0 | 1 | — | `test.d.ts:2300` |
| 1 | interface | `bun:test.JestMock.Replaced` | `bun:test.JestMock.Replaced` | — | — | 0 | 1 | — | `test.d.ts:2302` |
| 1 | function | `bun:test.JestMock.replaceProperty` | `bun:test.JestMock.replaceProperty()` | — | — | 0 | 1 | — | `test.d.ts:2313` |
| 1 | type | `bun:test.JestMock.ResolveType` | `bun:test.JestMock.ResolveType` | — | — | 0 | 1 | — | `test.d.ts:2327` |
| 1 | type | `bun:test.JestMock.Spied` | `bun:test.JestMock.Spied` | — | — | 0 | 1 | — | `test.d.ts:2329` |
| 1 | type | `bun:test.JestMock.SpiedClass` | `bun:test.JestMock.SpiedClass` | — | — | 0 | 1 | — | `test.d.ts:2335` |
| 1 | type | `bun:test.JestMock.SpiedFunction` | `bun:test.JestMock.SpiedFunction` | — | — | 0 | 1 | — | `test.d.ts:2339` |
| 1 | type | `bun:test.JestMock.SpiedGetter` | `bun:test.JestMock.SpiedGetter` | — | — | 0 | 1 | — | `test.d.ts:2343` |
| 1 | type | `bun:test.JestMock.SpiedSetter` | `bun:test.JestMock.SpiedSetter` | — | — | 0 | 1 | — | `test.d.ts:2345` |
| 1 | interface | `bun:test.JestMock.SpyInstance` | `bun:test.JestMock.SpyInstance` | — | — | 0 | 1 | — | `test.d.ts:2347` |
| 1 | const | `bun:test.JestMock.spyOn` | `bun:test.JestMock.spyOn: {` | — | — | 0 | 1 | — | `test.d.ts:2349` |
| 1 | interface | `bun:test.JestMock.UnknownClass` | `bun:test.JestMock.UnknownClass` | — | — | 0 | 1 | — | `test.d.ts:2384` |
| 1 | type | `bun:test.JestMock.UnknownFunction` | `bun:test.JestMock.UnknownFunction` | — | — | 0 | 1 | — | `test.d.ts:2388` |
| 1 | property | `bun:test.MatcherResult.message` | `bun:test.MatcherResult.message?: string \| (()` | — | — | 0 | 1 | — | `test.d.ts:1904` |
| 1 | property | `bun:test.MatcherResult.pass` | `bun:test.MatcherResult.pass: boolean;` | — | — | 0 | 1 | — | `test.d.ts:1903` |
| 1 | property | `bun:test.MatchersBuiltin.fail` | `bun:test.MatchersBuiltin.fail: (message?: string)` | — | — | 0 | 1 | Assertion which fails. | `test.d.ts:955` |
| 1 | method | `bun:test.MatchersBuiltin.lastCalledWith` | `bun:test.MatchersBuiltin.lastCalledWith(...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments for the nth call. | `test.d.ts:1882` |
| 1 | property | `bun:test.MatchersBuiltin.not` | `bun:test.MatchersBuiltin.not: Matchers<unknown>;` | — | — | 0 | 1 | Negates the result of a subsequent assertion. | `test.d.ts:913` |
| 1 | method | `bun:test.MatchersBuiltin.nthCalledWith` | `bun:test.MatchersBuiltin.nthCalledWith(n: number, ...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments for the nth call. | `test.d.ts:1893` |
| 1 | property | `bun:test.MatchersBuiltin.pass` | `bun:test.MatchersBuiltin.pass: (message?: string)` | — | — | 0 | 1 | Assertion which passes. | `test.d.ts:943` |
| 1 | property | `bun:test.MatchersBuiltin.rejects` | `bun:test.MatchersBuiltin.rejects: Matchers<unknown>;` | — | — | 0 | 1 | Expects the value to be a promise that rejects. | `test.d.ts:929` |
| 1 | property | `bun:test.MatchersBuiltin.resolves` | `bun:test.MatchersBuiltin.resolves: Matchers<Awaited<T>>;` | — | — | 0 | 1 | Expects the value to be a promise that resolves. | `test.d.ts:921` |
| 1 | method | `bun:test.MatchersBuiltin.toBe` | `bun:test.MatchersBuiltin.toBe(expected: T): void;` | — | — | 0 | 2 | Asserts that a value equals what is expected. | `test.d.ts:976` |
| 1 | method | `bun:test.MatchersBuiltin.toBeArray` | `bun:test.MatchersBuiltin.toBeArray(): void;` | — | — | 0 | 1 | Asserts that a value is a `array`. | `test.d.ts:1576` |
| 1 | method | `bun:test.MatchersBuiltin.toBeArrayOfSize` | `bun:test.MatchersBuiltin.toBeArrayOfSize(size: number): void;` | — | — | 0 | 1 | Asserts that a value is a `array` of a certain length. | `test.d.ts:1588` |
| 1 | method | `bun:test.MatchersBuiltin.toBeBoolean` | `bun:test.MatchersBuiltin.toBeBoolean(): void;` | — | — | 0 | 1 | Asserts that a value is a `boolean`. | `test.d.ts:1599` |
| 1 | method | `bun:test.MatchersBuiltin.toBeCalled` | `bun:test.MatchersBuiltin.toBeCalled(): void;` | — | — | 0 | 1 | Ensures that a mock function is called an exact number of times. | `test.d.ts:1849` |
| 1 | method | `bun:test.MatchersBuiltin.toBeCalledTimes` | `bun:test.MatchersBuiltin.toBeCalledTimes(expected: number): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments. | `test.d.ts:1860` |
| 1 | method | `bun:test.MatchersBuiltin.toBeCalledWith` | `bun:test.MatchersBuiltin.toBeCalledWith(...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments. | `test.d.ts:1871` |
| 1 | method | `bun:test.MatchersBuiltin.toBeCloseTo` | `bun:test.MatchersBuiltin.toBeCloseTo(expected: number, numDigits?: number): void;` | — | — | 0 | 1 | Asserts that value is close to the expected by floating point precision. | `test.d.ts:1016` |
| 1 | method | `bun:test.MatchersBuiltin.toBeDate` | `bun:test.MatchersBuiltin.toBeDate(): void;` | — | — | 0 | 1 | Asserts that a value is a `Date` object. | `test.d.ts:1740` |
| 1 | method | `bun:test.MatchersBuiltin.toBeDefined` | `bun:test.MatchersBuiltin.toBeDefined(): void;` | — | — | 0 | 1 | Asserts that a value is defined. (e.g. is not `undefined`) | `test.d.ts:1307` |
| 1 | method | `bun:test.MatchersBuiltin.toBeEmpty` | `bun:test.MatchersBuiltin.toBeEmpty(): void;` | — | — | 0 | 1 | Asserts that a value is empty. | `test.d.ts:1547` |
| 1 | method | `bun:test.MatchersBuiltin.toBeEmptyObject` | `bun:test.MatchersBuiltin.toBeEmptyObject(): void;` | — | — | 0 | 1 | Asserts that a value is an empty `object`. | `test.d.ts:1556` |
| 1 | method | `bun:test.MatchersBuiltin.toBeEven` | `bun:test.MatchersBuiltin.toBeEven(): void;` | — | — | 0 | 1 | Asserts that a number is even. | `test.d.ts:997` |
| 1 | method | `bun:test.MatchersBuiltin.toBeFalse` | `bun:test.MatchersBuiltin.toBeFalse(): void;` | — | — | 0 | 1 | Asserts that a value is `false`. | `test.d.ts:1630` |
| 1 | method | `bun:test.MatchersBuiltin.toBeFalsy` | `bun:test.MatchersBuiltin.toBeFalsy(): void;` | — | — | 0 | 1 | Asserts that a value is "falsy". | `test.d.ts:1298` |
| 1 | method | `bun:test.MatchersBuiltin.toBeFinite` | `bun:test.MatchersBuiltin.toBeFinite(): void;` | — | — | 0 | 1 | Asserts that a value is a `number`, and is not `NaN` or `Infinity`. | `test.d.ts:1672` |
| 1 | method | `bun:test.MatchersBuiltin.toBeFunction` | `bun:test.MatchersBuiltin.toBeFunction(): void;` | — | — | 0 | 1 | Asserts that a value is a `function`. | `test.d.ts:1728` |
| 1 | method | `bun:test.MatchersBuiltin.toBeGreaterThan` | `bun:test.MatchersBuiltin.toBeGreaterThan(expected: number \| bigint): void;` | — | — | 0 | 1 | Asserts that a value is a `number` and is greater than the expected value. | `test.d.ts:1358` |
| 1 | method | `bun:test.MatchersBuiltin.toBeGreaterThanOrEqual` | `bun:test.MatchersBuiltin.toBeGreaterThanOrEqual(expected: number \| bigint): void;` | — | — | 0 | 1 | Asserts that a value is a `number` and is greater than or equal to the expected value. | `test.d.ts:1370` |
| 1 | method | `bun:test.MatchersBuiltin.toBeInstanceOf` | `bun:test.MatchersBuiltin.toBeInstanceOf(value: unknown): void;` | — | — | 0 | 1 | Asserts that the expected value is an instance of value | `test.d.ts:1316` |
| 1 | method | `bun:test.MatchersBuiltin.toBeInteger` | `bun:test.MatchersBuiltin.toBeInteger(): void;` | — | — | 0 | 1 | Asserts that a value is a `number`, and is an integer. | `test.d.ts:1651` |
| 1 | method | `bun:test.MatchersBuiltin.toBeLessThan` | `bun:test.MatchersBuiltin.toBeLessThan(expected: number \| bigint): void;` | — | — | 0 | 1 | Asserts that a value is a `number` and is less than the expected value. | `test.d.ts:1382` |
| 1 | method | `bun:test.MatchersBuiltin.toBeLessThanOrEqual` | `bun:test.MatchersBuiltin.toBeLessThanOrEqual(expected: number \| bigint): void;` | — | — | 0 | 1 | Asserts that a value is a `number` and is less than or equal to the expected value. | `test.d.ts:1394` |
| 1 | method | `bun:test.MatchersBuiltin.toBeNaN` | `bun:test.MatchersBuiltin.toBeNaN(): void;` | — | — | 0 | 1 | Asserts that a value is `NaN`. | `test.d.ts:1346` |
| 1 | method | `bun:test.MatchersBuiltin.toBeNegative` | `bun:test.MatchersBuiltin.toBeNegative(): void;` | — | — | 0 | 1 | Asserts that a value is a negative `number`. | `test.d.ts:1692` |
| 1 | method | `bun:test.MatchersBuiltin.toBeNil` | `bun:test.MatchersBuiltin.toBeNil(): void;` | — | — | 0 | 1 | Asserts that a value is `null` or `undefined`. | `test.d.ts:1565` |
| 1 | method | `bun:test.MatchersBuiltin.toBeNull` | `bun:test.MatchersBuiltin.toBeNull(): void;` | — | — | 0 | 1 | Asserts that a value is `null`. | `test.d.ts:1334` |
| 1 | method | `bun:test.MatchersBuiltin.toBeNumber` | `bun:test.MatchersBuiltin.toBeNumber(): void;` | — | — | 0 | 1 | Asserts that a value is a `number`. | `test.d.ts:1641` |
| 1 | method | `bun:test.MatchersBuiltin.toBeObject` | `bun:test.MatchersBuiltin.toBeObject(): void;` | — | — | 0 | 1 | Asserts that a value is an `object`. | `test.d.ts:1661` |
| 1 | method | `bun:test.MatchersBuiltin.toBeOdd` | `bun:test.MatchersBuiltin.toBeOdd(): void;` | — | — | 0 | 1 | Asserts that a number is odd. | `test.d.ts:987` |
| 1 | method | `bun:test.MatchersBuiltin.toBeOneOf` | `bun:test.MatchersBuiltin.toBeOneOf(expected: Iterable<T>): void;` | — | — | 0 | 2 | Asserts that the value is deep equal to an element in the expected array. | `test.d.ts:1070` |
| 1 | method | `bun:test.MatchersBuiltin.toBePositive` | `bun:test.MatchersBuiltin.toBePositive(): void;` | — | — | 0 | 1 | Asserts that a value is a positive `number`. | `test.d.ts:1682` |
| 1 | method | `bun:test.MatchersBuiltin.toBeString` | `bun:test.MatchersBuiltin.toBeString(): void;` | — | — | 0 | 1 | Asserts that a value is a `string`. | `test.d.ts:1760` |
| 1 | method | `bun:test.MatchersBuiltin.toBeSymbol` | `bun:test.MatchersBuiltin.toBeSymbol(): void;` | — | — | 0 | 1 | Asserts that a value is a `symbol`. | `test.d.ts:1720` |
| 1 | method | `bun:test.MatchersBuiltin.toBeTrue` | `bun:test.MatchersBuiltin.toBeTrue(): void;` | — | — | 0 | 1 | Asserts that a value is `true`. | `test.d.ts:1609` |
| 1 | method | `bun:test.MatchersBuiltin.toBeTruthy` | `bun:test.MatchersBuiltin.toBeTruthy(): void;` | — | — | 0 | 1 | Asserts that a value is "truthy". | `test.d.ts:1285` |
| 1 | method | `bun:test.MatchersBuiltin.toBeTypeOf` | `bun:test.MatchersBuiltin.toBeTypeOf(type: "bigint" \| "boolean" \| "function" \| "number" \| "object" \| "string" \| "symbol" \| "undefined"): void;` | — | — | 0 | 1 | Asserts that a value matches a specific type. | `test.d.ts:1620` |
| 1 | method | `bun:test.MatchersBuiltin.toBeUndefined` | `bun:test.MatchersBuiltin.toBeUndefined(): void;` | — | — | 0 | 1 | Asserts that a value is `undefined`. | `test.d.ts:1325` |
| 1 | method | `bun:test.MatchersBuiltin.toBeValidDate` | `bun:test.MatchersBuiltin.toBeValidDate(): void;` | — | — | 0 | 1 | Asserts that a value is a valid `Date` object. | `test.d.ts:1750` |
| 1 | method | `bun:test.MatchersBuiltin.toBeWithin` | `bun:test.MatchersBuiltin.toBeWithin(start: number, end: number): void;` | — | — | 0 | 1 | Asserts that a value is a number between a start and end value. | `test.d.ts:1700` |
| 1 | method | `bun:test.MatchersBuiltin.toContain` | `bun:test.MatchersBuiltin.toContain(expected: T extends Iterable<infer U> ? U : T): void;` | — | — | 0 | 2 | Asserts that a value contains what is expected. | `test.d.ts:1086` |
| 1 | method | `bun:test.MatchersBuiltin.toContainAllKeys` | `bun:test.MatchersBuiltin.toContainAllKeys(expected: Array<__internal.IfNeverThenElse<keyof T, PropertyKey>>): void;` | — | — | 0 | 2 | Asserts that an `object` contains all the provided keys. | `test.d.ts:1119` |
| 1 | method | `bun:test.MatchersBuiltin.toContainAllValues` | `bun:test.MatchersBuiltin.toContainAllValues(expected: Array<unknown>): void;` | — | — | 0 | 1 | Asserts that an `object` contain all the provided values. | `test.d.ts:1202` |
| 1 | method | `bun:test.MatchersBuiltin.toContainAnyKeys` | `bun:test.MatchersBuiltin.toContainAnyKeys(expected: Array<__internal.IfNeverThenElse<keyof T, PropertyKey>>): void;` | — | — | 0 | 2 | Asserts that an `object` contains at least one of the provided keys. | `test.d.ts:1136` |
| 1 | method | `bun:test.MatchersBuiltin.toContainAnyValues` | `bun:test.MatchersBuiltin.toContainAnyValues(expected: Array<unknown>): void;` | — | — | 0 | 1 | Asserts that an `object` contain any provided value. | `test.d.ts:1217` |
| 1 | method | `bun:test.MatchersBuiltin.toContainEqual` | `bun:test.MatchersBuiltin.toContainEqual(expected: T extends Iterable<infer U> ? U : T): void;` | — | — | 0 | 2 | Asserts that a value contains and equals what is expected. | `test.d.ts:1244` |
| 1 | method | `bun:test.MatchersBuiltin.toContainKey` | `bun:test.MatchersBuiltin.toContainKey(expected: __internal.IfNeverThenElse<keyof T, PropertyKey>): void;` | — | — | 0 | 2 | Asserts that an `object` contains a key. | `test.d.ts:1102` |
| 1 | method | `bun:test.MatchersBuiltin.toContainKeys` | `bun:test.MatchersBuiltin.toContainKeys(expected: Array<__internal.IfNeverThenElse<keyof T, PropertyKey>>): void;` | — | — | 0 | 2 | Asserts that an `object` contains all the provided keys. | `test.d.ts:1229` |
| 1 | method | `bun:test.MatchersBuiltin.toContainValue` | `bun:test.MatchersBuiltin.toContainValue(expected: unknown): void;` | — | — | 0 | 1 | — | `test.d.ts:1171` |
| 1 | method | `bun:test.MatchersBuiltin.toContainValues` | `bun:test.MatchersBuiltin.toContainValues(expected: Array<unknown>): void;` | — | — | 0 | 1 | Asserts that an `object` contain the provided value. | `test.d.ts:1188` |
| 1 | method | `bun:test.MatchersBuiltin.toEndWith` | `bun:test.MatchersBuiltin.toEndWith(expected: string): void;` | — | — | 0 | 1 | Asserts that a value ends with a `string`. | `test.d.ts:1802` |
| 1 | method | `bun:test.MatchersBuiltin.toEqual` | `bun:test.MatchersBuiltin.toEqual(expected: T): void;` | — | — | 0 | 2 | Asserts that a value is deeply equal to what is expected. | `test.d.ts:1029` |
| 1 | method | `bun:test.MatchersBuiltin.toEqualIgnoringWhitespace` | `bun:test.MatchersBuiltin.toEqualIgnoringWhitespace(expected: string): void;` | — | — | 0 | 1 | Asserts that a value is equal to the expected string, ignoring any whitespace. | `test.d.ts:1711` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveBeenCalled` | `bun:test.MatchersBuiltin.toHaveBeenCalled(): void;` | — | — | 0 | 1 | Ensures that a mock function is called. | `test.d.ts:1843` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveBeenCalledTimes` | `bun:test.MatchersBuiltin.toHaveBeenCalledTimes(expected: number): void;` | — | — | 0 | 1 | Ensures that a mock function is called an exact number of times. | `test.d.ts:1854` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveBeenCalledWith` | `bun:test.MatchersBuiltin.toHaveBeenCalledWith(...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments. | `test.d.ts:1865` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveBeenLastCalledWith` | `bun:test.MatchersBuiltin.toHaveBeenLastCalledWith(...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments for the last call. | `test.d.ts:1876` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveBeenNthCalledWith` | `bun:test.MatchersBuiltin.toHaveBeenNthCalledWith(n: number, ...expected: unknown[]): void;` | — | — | 0 | 1 | Ensure that a mock function is called with specific arguments for the nth call. | `test.d.ts:1887` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveLastReturnedWith` | `bun:test.MatchersBuiltin.toHaveLastReturnedWith(expected: unknown): void;` | — | — | 0 | 1 | Ensures that a mock function has returned a specific value on its last invocation. | `test.d.ts:1830` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveLength` | `bun:test.MatchersBuiltin.toHaveLength(length: number): void;` | — | — | 0 | 1 | Asserts that a value has a `.length` property | `test.d.ts:1257` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveNthReturnedWith` | `bun:test.MatchersBuiltin.toHaveNthReturnedWith(n: number, expected: unknown): void;` | — | — | 0 | 1 | Ensures that a mock function has returned a specific value on the nth invocation. | `test.d.ts:1838` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveProperty` | `bun:test.MatchersBuiltin.toHaveProperty(keyPath: string \| number \| Array<string \| number>, value?: unknown): void;` | — | — | 0 | 1 | Asserts that a value has a property with the | `test.d.ts:1272` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveReturned` | `bun:test.MatchersBuiltin.toHaveReturned(): void;` | — | — | 0 | 1 | Ensures that a mock function has returned successfully at least once. | `test.d.ts:1810` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveReturnedTimes` | `bun:test.MatchersBuiltin.toHaveReturnedTimes(times: number): void;` | — | — | 0 | 1 | Ensures that a mock function has returned successfully at `times` times. | `test.d.ts:1818` |
| 1 | method | `bun:test.MatchersBuiltin.toHaveReturnedWith` | `bun:test.MatchersBuiltin.toHaveReturnedWith(expected: unknown): void;` | — | — | 0 | 1 | Ensures that a mock function has returned a specific value. | `test.d.ts:1824` |
| 1 | method | `bun:test.MatchersBuiltin.toInclude` | `bun:test.MatchersBuiltin.toInclude(expected: string): void;` | — | — | 0 | 1 | Asserts that a value includes a `string`. | `test.d.ts:1769` |
| 1 | method | `bun:test.MatchersBuiltin.toIncludeRepeated` | `bun:test.MatchersBuiltin.toIncludeRepeated(expected: string, times: number): void;` | — | — | 0 | 1 | Asserts that a value includes a `string` {times} times. | `test.d.ts:1776` |
| 1 | method | `bun:test.MatchersBuiltin.toMatch` | `bun:test.MatchersBuiltin.toMatch(expected: string \| RegExp): void;` | — | — | 0 | 1 | Asserts that a value matches a regular expression or includes a substring. | `test.d.ts:1448` |
| 1 | method | `bun:test.MatchersBuiltin.toMatchInlineSnapshot` | `bun:test.MatchersBuiltin.toMatchInlineSnapshot(value?: string): void;` | — | — | 0 | 2 | Asserts that a value matches the most recent inline snapshot. | `test.d.ts:1481` |
| 1 | method | `bun:test.MatchersBuiltin.toMatchObject` | `bun:test.MatchersBuiltin.toMatchObject(subset: object): void;` | — | — | 0 | 1 | Asserts that an object matches a subset of properties. | `test.d.ts:1536` |
| 1 | method | `bun:test.MatchersBuiltin.toMatchSnapshot` | `bun:test.MatchersBuiltin.toMatchSnapshot(hint?: string): void;` | — | — | 0 | 2 | Asserts that a value matches the most recent snapshot. | `test.d.ts:1457` |
| 1 | method | `bun:test.MatchersBuiltin.toSatisfy` | `bun:test.MatchersBuiltin.toSatisfy(predicate: (value: T) => boolean): void;` | — | — | 0 | 1 | Checks whether a value satisfies a custom condition. | `test.d.ts:1788` |
| 1 | method | `bun:test.MatchersBuiltin.toStartWith` | `bun:test.MatchersBuiltin.toStartWith(expected: string): void;` | — | — | 0 | 1 | Asserts that a value starts with a `string`. | `test.d.ts:1795` |
| 1 | method | `bun:test.MatchersBuiltin.toStrictEqual` | `bun:test.MatchersBuiltin.toStrictEqual(expected: T): void;` | — | — | 0 | 2 | Asserts that a value is deeply and strictly equal to | `test.d.ts:1055` |
| 1 | method | `bun:test.MatchersBuiltin.toThrow` | `bun:test.MatchersBuiltin.toThrow(expected?: unknown): void;` | — | — | 0 | 1 | Asserts that a function throws an error. | `test.d.ts:1415` |
| 1 | method | `bun:test.MatchersBuiltin.toThrowError` | `bun:test.MatchersBuiltin.toThrowError(expected?: unknown): void;` | — | — | 0 | 1 | Asserts that a function throws an error. | `test.d.ts:1437` |
| 1 | method | `bun:test.MatchersBuiltin.toThrowErrorMatchingInlineSnapshot` | `bun:test.MatchersBuiltin.toThrowErrorMatchingInlineSnapshot(value?: string): void;` | — | — | 0 | 1 | Asserts that a function throws an error matching the most recent snapshot. | `test.d.ts:1525` |
| 1 | method | `bun:test.MatchersBuiltin.toThrowErrorMatchingSnapshot` | `bun:test.MatchersBuiltin.toThrowErrorMatchingSnapshot(hint?: string): void;` | — | — | 0 | 1 | Asserts that a function throws an error matching the most recent snapshot. | `test.d.ts:1511` |
| 1 | property | `bun:test.MatcherState.isNot` | `bun:test.MatcherState.isNot: boolean;` | — | — | 0 | 1 | — | `test.d.ts:1951` |
| 1 | property | `bun:test.MatcherState.promise` | `bun:test.MatcherState.promise: string;` | — | — | 0 | 1 | — | `test.d.ts:1953` |
| 1 | property | `bun:test.MatcherUtils.equals` | `bun:test.MatcherUtils.equals: EqualsFunction;` | — | — | 0 | 1 | — | `test.d.ts:1963` |
| 1 | property | `bun:test.MatcherUtils.utils` | `bun:test.MatcherUtils.utils: Readonly<{` | — | — | 0 | 1 | — | `test.d.ts:1964` |
| 1 | property | `bun:test.Test.concurrent` | `bun:test.Test.concurrent: Test<T>;` | — | — | 0 | 1 | Runs the test concurrently with other concurrent tests. | `test.d.ts:519` |
| 1 | method | `bun:test.Test.concurrentIf` | `bun:test.Test.concurrentIf(condition: boolean): Test<T>;` | — | — | 0 | 1 | Runs the test concurrently with other concurrent tests, if `condition` is true. | `test.d.ts:556` |
| 1 | method | `bun:test.Test.each` | `bun:test.Test.each(table: readonly T[]): Test<T>;` | — | — | 0 | 2 | — | `test.d.ts:570` |
| 1 | property | `bun:test.Test.failing` | `bun:test.Test.failing: Test<T>;` | — | — | 0 | 1 | Marks this test as failing. | `test.d.ts:515` |
| 1 | method | `bun:test.Test.failingIf` | `bun:test.Test.failingIf(condition: boolean): Test<T>;` | — | — | 0 | 1 | Marks this test as failing, if `condition` is true. | `test.d.ts:550` |
| 1 | property | `bun:test.Test.fn` | `bun:test.Test.fn: (` | — | — | 0 | 1 | — | `test.d.ts:472` |
| 1 | property | `bun:test.Test.label` | `bun:test.Test.label: string,` | — | — | 0 | 1 | — | `test.d.ts:470` |
| 1 | property | `bun:test.Test.only` | `bun:test.Test.only: Test<T>;` | — | — | 0 | 1 | Skips all other tests, except this test. | `test.d.ts:490` |
| 1 | property | `bun:test.Test.options` | `bun:test.Test.options?: number \| TestOptions,` | — | — | 0 | 1 | - If a `number`, sets the timeout for the test in milliseconds. | `test.d.ts:485` |
| 1 | property | `bun:test.Test.serial` | `bun:test.Test.serial: Test<T>;` | — | — | 0 | 1 | Forces the test to run serially (not in parallel), | `test.d.ts:524` |
| 1 | method | `bun:test.Test.serialIf` | `bun:test.Test.serialIf(condition: boolean): Test<T>;` | — | — | 0 | 1 | Forces the test to run serially (not in parallel), if `condition` is true. | `test.d.ts:563` |
| 1 | property | `bun:test.Test.skip` | `bun:test.Test.skip: Test<T>;` | — | — | 0 | 1 | Skips this test. | `test.d.ts:494` |
| 1 | method | `bun:test.Test.skipIf` | `bun:test.Test.skipIf(condition: boolean): Test<T>;` | — | — | 0 | 1 | Skips this test, if `condition` is true. | `test.d.ts:538` |
| 1 | property | `bun:test.Test.todo` | `bun:test.Test.todo: Test<T>;` | — | — | 0 | 1 | Marks this test as to be written or to be fixed. | `test.d.ts:503` |
| 1 | method | `bun:test.Test.todoIf` | `bun:test.Test.todoIf(condition: boolean): Test<T>;` | — | — | 0 | 1 | Marks this test as to be written or to be fixed, if `condition` is true. | `test.d.ts:544` |
| 1 | property | `bun:test.TesterContext.equals` | `bun:test.TesterContext.equals: EqualsFunction;` | — | — | 0 | 1 | — | `test.d.ts:1938` |
| 1 | property | `bun:test.TestOptions.repeats` | `bun:test.TestOptions.repeats?: number;` | 0 | — | 0 | 1 | Sets the number of times to repeat the test, regardless of whether it passed or failed. | `test.d.ts:427` |
| 1 | property | `bun:test.TestOptions.retry` | `bun:test.TestOptions.retry?: number;` | 0 | — | 0 | 1 | Sets the number of times to retry the test if it fails. | `test.d.ts:421` |
| 1 | property | `bun:test.TestOptions.timeout` | `bun:test.TestOptions.timeout?: number;` | 5000 // 5 seconds | — | 0 | 1 | Sets the timeout for the test in milliseconds. | `test.d.ts:415` |
| 2 | property | `bun:test.JestMock.MockFunctionResultIncomplete.value` | `bun:test.JestMock.MockFunctionResultIncomplete.value: undefined;` | — | — | 0 | 1 | Result of a single call to a mock function that has not yet completed. | `test.d.ts:2113` |
| 2 | property | `bun:test.JestMock.MockFunctionResultReturn.value` | `bun:test.JestMock.MockFunctionResultReturn.value: ReturnType<T>;` | — | — | 0 | 1 | Result of a single call to a mock function that returned. | `test.d.ts:2121` |
| 2 | property | `bun:test.JestMock.MockFunctionResultThrow.value` | `bun:test.JestMock.MockFunctionResultThrow.value: unknown;` | — | — | 0 | 1 | Result of a single call to a mock function that threw. | `test.d.ts:2129` |
| 2 | property | `bun:test.JestMock.MockFunctionState.calls` | `bun:test.JestMock.MockFunctionState.calls: Array<Parameters<T>>;` | — | — | 0 | 1 | List of the call arguments of all calls that have been made to the mock. | `test.d.ts:2136` |
| 2 | property | `bun:test.JestMock.MockFunctionState.contexts` | `bun:test.JestMock.MockFunctionState.contexts: Array<ThisParameterType<T>>;` | — | — | 0 | 1 | List of all the function contexts that have been applied to calls to the mock. | `test.d.ts:2144` |
| 2 | property | `bun:test.JestMock.MockFunctionState.instances` | `bun:test.JestMock.MockFunctionState.instances: Array<ReturnType<T>>;` | — | — | 0 | 1 | List of all the object instances that have been instantiated from the mock. | `test.d.ts:2140` |
| 2 | property | `bun:test.JestMock.MockFunctionState.invocationCallOrder` | `bun:test.JestMock.MockFunctionState.invocationCallOrder: number[];` | — | — | 0 | 1 | List of the call order indexes of the mock. Jest is indexing the order of | `test.d.ts:2149` |
| 2 | property | `bun:test.JestMock.MockFunctionState.lastCall` | `bun:test.JestMock.MockFunctionState.lastCall?: Parameters<T>;` | — | — | 0 | 1 | List of the call arguments of the last call that was made to the mock. | `test.d.ts:2154` |
| 2 | property | `bun:test.JestMock.MockFunctionState.results` | `bun:test.JestMock.MockFunctionState.results: Array<MockFunctionResult<T>>;` | — | — | 0 | 1 | List of the results of all calls that have been made to the mock. | `test.d.ts:2158` |
| 2 | method | `bun:test.JestMock.MockInstance.getMockImplementation` | `bun:test.JestMock.MockInstance.getMockImplementation(): T \| undefined;` | — | — | 0 | 1 | — | `test.d.ts:2164` |
| 2 | method | `bun:test.JestMock.MockInstance.getMockName` | `bun:test.JestMock.MockInstance.getMockName(): string;` | — | — | 0 | 1 | — | `test.d.ts:2165` |
| 2 | property | `bun:test.JestMock.MockInstance.mock` | `bun:test.JestMock.MockInstance.mock: MockFunctionState<T>;` | — | — | 0 | 1 | — | `test.d.ts:2166` |
| 2 | method | `bun:test.JestMock.MockInstance.mockClear` | `bun:test.JestMock.MockInstance.mockClear(): this;` | — | — | 0 | 1 | — | `test.d.ts:2167` |
| 2 | method | `bun:test.JestMock.MockInstance.mockImplementation` | `bun:test.JestMock.MockInstance.mockImplementation(fn: T): this;` | — | — | 0 | 1 | — | `test.d.ts:2170` |
| 2 | method | `bun:test.JestMock.MockInstance.mockImplementationOnce` | `bun:test.JestMock.MockInstance.mockImplementationOnce(fn: T): this;` | — | — | 0 | 1 | — | `test.d.ts:2171` |
| 2 | method | `bun:test.JestMock.MockInstance.mockName` | `bun:test.JestMock.MockInstance.mockName(name: string): this;` | — | — | 0 | 1 | — | `test.d.ts:2174` |
| 2 | method | `bun:test.JestMock.MockInstance.mockRejectedValue` | `bun:test.JestMock.MockInstance.mockRejectedValue(value: RejectType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2180` |
| 2 | method | `bun:test.JestMock.MockInstance.mockRejectedValueOnce` | `bun:test.JestMock.MockInstance.mockRejectedValueOnce(value: RejectType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2181` |
| 2 | method | `bun:test.JestMock.MockInstance.mockReset` | `bun:test.JestMock.MockInstance.mockReset(): this;` | — | — | 0 | 1 | — | `test.d.ts:2168` |
| 2 | method | `bun:test.JestMock.MockInstance.mockResolvedValue` | `bun:test.JestMock.MockInstance.mockResolvedValue(value: ResolveType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2178` |
| 2 | method | `bun:test.JestMock.MockInstance.mockResolvedValueOnce` | `bun:test.JestMock.MockInstance.mockResolvedValueOnce(value: ResolveType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2179` |
| 2 | method | `bun:test.JestMock.MockInstance.mockRestore` | `bun:test.JestMock.MockInstance.mockRestore(): void;` | — | — | 0 | 1 | — | `test.d.ts:2169` |
| 2 | method | `bun:test.JestMock.MockInstance.mockReturnThis` | `bun:test.JestMock.MockInstance.mockReturnThis(): this;` | — | — | 0 | 1 | — | `test.d.ts:2175` |
| 2 | method | `bun:test.JestMock.MockInstance.mockReturnValue` | `bun:test.JestMock.MockInstance.mockReturnValue(value: ReturnType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2176` |
| 2 | method | `bun:test.JestMock.MockInstance.mockReturnValueOnce` | `bun:test.JestMock.MockInstance.mockReturnValueOnce(value: ReturnType<T>): this;` | — | — | 0 | 1 | — | `test.d.ts:2177` |
| 2 | method | `bun:test.JestMock.MockInstance.withImplementation` | `bun:test.JestMock.MockInstance.withImplementation(fn: T, callback: () => Promise<unknown>): Promise<void>;` | — | — | 0 | 2 | — | `test.d.ts:2172` |
| 2 | method | `bun:test.JestMock.Replaced.replaceValue` | `bun:test.JestMock.Replaced.replaceValue(value: T): this;` | — | — | 0 | 1 | Change the value of the property. | `test.d.ts:2310` |
| 2 | method | `bun:test.JestMock.Replaced.restore` | `bun:test.JestMock.Replaced.restore(): void;` | — | — | 0 | 1 | Restore property to its original value known at the time of mocking. | `test.d.ts:2306` |
| 2 | property | `bun:test.JestMock.SpyInstance.accessType` | `bun:test.JestMock.SpyInstance.accessType: A,` | — | — | 0 | 1 | — | `test.d.ts:2366` |
| 2 | property | `bun:test.JestMock.SpyInstance.methodKey` | `bun:test.JestMock.SpyInstance.methodKey: K_2,` | — | — | 0 | 2 | — | `test.d.ts:2365` |

## Related SSOTs

- Docs/canonical map: `tools/export-bun-api-index.ts` → `tools/bun-api-index.json`
- Doc refs: `bun tools/bun-doc-refs.ts suggest "<api>"`
- Utils proof: `bun run bun:utils-proof`
- AGENTS grounded map: `AGENTS.md` § Grounded capability map

