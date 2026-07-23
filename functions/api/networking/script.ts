/**
 * Pages Function — serve the verify-networking.ts script via HTTP for `bun run -`.
 *
 * Usage: curl -sf https://project-r-score.pages.dev/api/networking/script | bun run -
 */
export async function onRequest(): Promise<Response> {
  const sources = [
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-networking.ts',
    'https://raw.githubusercontent.com/brendadeeznuts1111/project-R-score/main/tools/verify-networking.ts',
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return new Response(await res.text(), {
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
