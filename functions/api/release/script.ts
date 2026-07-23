/**
 * Pages Function — serve bundlet release verification script via HTTP for `bun run -`.
 */
export async function onRequest(): Promise<Response> {
  const sources = [
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-bun-release.bundle.js',
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-bun-release.bundle.js',
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) return new Response(await res.text(), {
        headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
      });
    } catch {}
  }
  return new Response('Script not found', { status: 404 });
}
