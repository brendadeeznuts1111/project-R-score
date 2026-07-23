/**
 * Pages Function — serve the verify-defaults.ts script via HTTP for `bun run -`.
 *
 * Usage: curl -s https://project-r-score.pages.dev/api/defaults/script | bun run -
 */
export async function onRequest(): Promise<Response> {
  // Try ASSETS first, fall back to GitHub raw
  const sources = [
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-defaults.ts',
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-defaults.ts',
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const script = await res.text();
        return new Response(script, {
          headers: {
            'Content-Type': 'text/typescript; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch {}
  }

  return new Response('Script not found', { status: 404 });
}
