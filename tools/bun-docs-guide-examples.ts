// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags — SocialMetadata
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
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
  'Bun.which': 'guides/util/which-path-to-executable-bin',
  'Get the path to an executable bin file': 'guides/util/which-path-to-executable-bin',
  'which-path-to-executable-bin': 'guides/util/which-path-to-executable-bin',
  'get-the-path-to-an-executable-bin-file': 'guides/util/which-path-to-executable-bin',
  // Bun.* → utils fences; bare / node:url → reference; guide titles → guides
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
