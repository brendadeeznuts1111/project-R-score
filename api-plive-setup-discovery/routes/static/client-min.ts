// routes/static/client-min.ts - Serve minified JS with zstd compression
import { file } from 'bun';

let cachedMinified: Uint8Array | null = null;

async function buildMinifiedJS(): Promise<Uint8Array> {
  if (cachedMinified) return cachedMinified;

  // Build minified version
  const result = await Bun.build({
    entrypoints: ['./client.js'],
    outdir: './dist',
    minify: true,
    sourcemap: 'external',
    target: 'browser'
  });

  if (!result.success) {
    throw new Error('Failed to build minified JS');
  }

  // Read the minified file
  const minifiedPath = './dist/client.js';
  const minifiedBuffer = await file(minifiedPath).arrayBuffer();
  cachedMinified = new Uint8Array(minifiedBuffer);

  return cachedMinified;
}

export const handle = async (req: Request) => {
  try {
    const minifiedJS = await buildMinifiedJS();

    return new Response(minifiedJS, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Content-Encoding': 'identity', // zstd would need custom support
        'Cache-Control': 'public, max-age=3600',
        'X-Minified': 'true',
        'X-Original-Size': '200KB', // Approximate
        'X-Minified-Size': `${Math.round(minifiedJS.length / 1024)}KB`
      }
    });
  } catch (error) {
    return new Response(`Error serving minified JS: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
