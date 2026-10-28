// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/html-rewriter#input-types — string · Response · ArrayBuffer · Blob · File
// @see https://bun.com/docs/runtime/html-rewriter#error-handling — transform() vs Response body
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../lib/path-bun';
import {
  HARVEST_REWRITER_ARRAY_BUFFER_CHANNEL,
  HARVEST_REWRITER_BLOB_CHANNEL,
  HARVEST_REWRITER_FILE_CHANNEL,
  HARVEST_REWRITER_RESPONSE_CHANNEL,
  HARVEST_REWRITER_STRING_CHANNEL,
  HarvestRewriterError,
  htmlRewriterOn,
  htmlRewriterTransformArrayBuffer,
  htmlRewriterTransformResponse,
  htmlRewriterTransformString,
  rewriteHarvestArrayBuffer,
  rewriteHarvestBlob,
  rewriteHarvestFile,
  rewriteHarvestResponse,
  HTML_NS,
  createHarvestHtmlRewriter,
  inspectHarvestRewriterElements,
  rewriteHarvestString,
  toAbsoluteHarvestUrl,
} from '../lib/docs/harvest-html-rewriter.ts';
import { extractCodeBlocks } from '../lib/docs/blog-codeblocks.ts';

const HTML = `<html><body>
  <img src="/cat.jpg">
  <img src="dog.png">
  <img src="https://example.com/bird.webp">
  <a href="/docs">docs</a>
  <a href="javascript:void(0)">noop</a>
  <meta property="og:image" content="/share.png" />
</body></html>`;
const BASE = 'https://bun.com/blog/bun-v1.4/';

function expectRewritten(out: string): void {
  expect(out).toContain('src="https://bun.com/cat.jpg"');
  expect(out).toContain('src="https://bun.com/blog/bun-v1.4/dog.png"');
  expect(out).toContain('src="https://example.com/bird.webp"');
  expect(out).toContain('href="https://bun.com/docs"');
  expect(out).toContain('href="javascript:void(0)"');
  expect(out).toContain('content="https://bun.com/share.png"');
  expect(out).toContain('<a href="https://bun.com/cat.jpg" target="_blank" rel="noopener">');
  expect(out).toContain('<a href="https://bun.com/blog/bun-v1.4/dog.png" target="_blank" rel="noopener">');
  expect(out).toContain('<a href="https://example.com/bird.webp" target="_blank" rel="noopener">');
  expect(out).not.toContain('dQw4w9WgXcQ');
}

function expectChannel(error: unknown, channel: 'transform' | 'body', message: string | RegExp): void {
  expect(error).toBeInstanceOf(HarvestRewriterError);
  expect((error as HarvestRewriterError).channel).toBe(channel);
  const text = (error as HarvestRewriterError).message;
  if (typeof message === 'string') expect(text).toContain(message);
  else expect(text).toMatch(message);
}

describe('harvest HTMLRewriter URLs', () => {
  test('toAbsoluteHarvestUrl skips http, javascript, mailto, data', () => {
    expect(toAbsoluteHarvestUrl('/cat.jpg', BASE)).toBe('https://bun.com/cat.jpg');
    expect(toAbsoluteHarvestUrl('https://example.com/bird.webp', BASE)).toBeNull();
    expect(toAbsoluteHarvestUrl('javascript:void(0)', BASE)).toBeNull();
    expect(toAbsoluteHarvestUrl('mailto:a@b.c', BASE)).toBeNull();
    expect(toAbsoluteHarvestUrl('data:text/plain,hi', BASE)).toBeNull();
  });
});

describe('string input — error channel is transform()', () => {
  test('channel constant', () => {
    expect(HARVEST_REWRITER_STRING_CHANNEL).toBe('transform');
  });

  test('rewrites img, a, and og:image', () => {
    expectRewritten(rewriteHarvestString(HTML, BASE));
  });

  test('wraps bare img in a link to its src; does not nest inside existing a', () => {
    const wrapped = rewriteHarvestString(
      `<img src="/cat.jpg"><a href="/page"><img src="/in-link.jpg"></a>`,
      BASE
    );
    expect(wrapped).toMatch(
      /<a href="https:\/\/bun.com\/cat.jpg" target="_blank" rel="noopener">\s*<img src="https:\/\/bun.com\/cat.jpg"/
    );
    expect(wrapped).toContain('href="https://bun.com/page"');
    expect(wrapped).toContain('src="https://bun.com/in-link.jpg"');
    expect(wrapped).not.toMatch(/<a href="https:\/\/bun.com\/in-link.jpg"/);
    expect(wrapped).not.toContain('youtube.com');
  });

  test('extract after rewrite records absolute image and link URLs', () => {
    const html = rewriteHarvestString(
      `<h2 id="what-s-new">What's new</h2>
       <img src="/images/blog/share.png" alt="share" class="mx-auto"/>
       <p>See <a href="/docs/runtime/html-rewriter">HTMLRewriter</a>.</p>`,
      BASE
    );
    const result = extractCodeBlocks(html, { baseUrl: BASE });
    expect(result.images[0]?.src).toBe('https://bun.com/images/blog/share.png');
    expect(result.links.some(row => row.href === 'https://bun.com/docs/runtime/html-rewriter')).toBe(
      true
    );
  });

  test('rejects a non-string on the transform channel', () => {
    try {
      htmlRewriterTransformString(new HTMLRewriter(), 1 as unknown as string);
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'expected a string');
    }
  });

  test('handler throw is the transform channel', () => {
    const rewriter = new HTMLRewriter().on('div', {
      element() {
        throw new Error('handler failed');
      },
    });
    try {
      htmlRewriterTransformString(rewriter, '<div></div>');
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'handler failed');
    }
  });

  test('async handler throws from transform() (cannot wait for the event loop)', () => {
    const rewriter = new HTMLRewriter().on('div', {
      async element() {
        await Bun.sleep(1);
      },
    });
    try {
      htmlRewriterTransformString(rewriter, '<div></div>');
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'synchronously return a string');
    }
  });
});

describe('ArrayBuffer input — error channel is transform()', () => {
  test('channel constant', () => {
    expect(HARVEST_REWRITER_ARRAY_BUFFER_CHANNEL).toBe('transform');
  });

  test('matches string via transform(new TextEncoder().encode(html).buffer)', () => {
    expect(rewriteHarvestArrayBuffer(new TextEncoder().encode(HTML).buffer, BASE)).toBe(
      rewriteHarvestString(HTML, BASE)
    );
  });

  test('rejects a non-ArrayBuffer on the transform channel', () => {
    try {
      htmlRewriterTransformArrayBuffer(new HTMLRewriter(), HTML as unknown as ArrayBuffer);
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'expected an ArrayBuffer');
    }
  });

  test('handler throw is the transform channel', () => {
    const rewriter = new HTMLRewriter().on('div', {
      element() {
        throw new Error('handler failed');
      },
    });
    try {
      htmlRewriterTransformArrayBuffer(
        rewriter,
        new TextEncoder().encode('<div></div>').buffer
      );
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'handler failed');
    }
  });
});

describe('Response input — error channel is the body read', () => {
  test('channel constant', () => {
    expect(HARVEST_REWRITER_RESPONSE_CHANNEL).toBe('body');
  });

  test('matches the string rewrite', async () => {
    expect(await rewriteHarvestResponse(new Response(HTML), BASE)).toBe(
      rewriteHarvestString(HTML, BASE)
    );
  });

  test('rejects a non-Response on the transform channel', async () => {
    try {
      await htmlRewriterTransformResponse(new HTMLRewriter(), HTML as unknown as Response);
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'expected a Response');
    }
  });

  test('body already used throws from transform() (setup, not the rewrite body)', async () => {
    const response = new Response('<div></div>');
    await response.text();
    try {
      await rewriteHarvestResponse(response);
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', /used/i);
    }
  });

  test('handler throw rejects the output body channel', async () => {
    const rewriter = new HTMLRewriter().on('div', {
      element() {
        throw new Error('handler failed');
      },
    });
    try {
      await htmlRewriterTransformResponse(rewriter, new Response('<div></div>'));
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'body', 'handler failed');
    }
  });
});

describe('Blob input — wrap in Response, body channel', () => {
  test('channel constant', () => {
    expect(HARVEST_REWRITER_BLOB_CHANNEL).toBe('body');
  });

  test('matches string via transform(new Response(new Blob([html])))', async () => {
    expect(await rewriteHarvestBlob(new Blob([HTML]), BASE)).toBe(rewriteHarvestString(HTML, BASE));
    expect(
      await rewriteHarvestResponse(new Response(new Blob([HTML])), BASE)
    ).toBe(rewriteHarvestString(HTML, BASE));
  });
});

describe('File input — wrap in Response(Bun.file), body channel', () => {
  test('channel constant', () => {
    expect(HARVEST_REWRITER_FILE_CHANNEL).toBe('body');
  });

  test('rewrites through transform(new Response(file))', async () => {
    const tmp = resolvePath(Bun.env.TMPDIR ?? '/tmp', `fw-harvest-rw-${Bun.randomUUIDv7()}.html`);
    await Bun.write(tmp, HTML);
    const out = await rewriteHarvestFile(Bun.file(tmp), BASE);
    expect(out).toContain('src="https://bun.com/cat.jpg"');
    expect(out).toContain('content="https://bun.com/share.png"');
  });
});

describe('setup errors (on / selector)', () => {
  test('invalid selector throws from on() on the transform channel', () => {
    try {
      htmlRewriterOn(new HTMLRewriter(), '[', { element() {} });
      throw new Error('expected throw');
    } catch (error) {
      expectChannel(error, 'transform', 'selector');
    }
  });
});

describe('detached handler Promise — neither channel', () => {
  test('string and Response rewrites still succeed', async () => {
    const orphan: Promise<unknown>[] = [];
    const detach = (label: string) => {
      orphan.push(Promise.reject(new Error(label)).catch(() => {}));
    };
    expect(
      htmlRewriterTransformString(
        new HTMLRewriter().on('div', {
          element() {
            detach('detached-sync');
          },
        }),
        '<div></div>'
      )
    ).toContain('div');
    expect(
      await htmlRewriterTransformResponse(
        new HTMLRewriter().on('div', {
          element() {
            detach('detached-body');
          },
        }),
        new Response('<div></div>')
      )
    ).toContain('div');
    await Promise.all(orphan);
  });
});

describe('HTMLRewriter element properties', () => {
  test('tagName is lowercase; img/meta are void; a can have content', () => {
    const seen = inspectHarvestRewriterElements(
      `<div><img src="/a.jpg"><a href="/x">x</a><meta property="og:image" content="/s.png"><br></div>`,
      'img, a, meta, br, div'
    );
    expect(seen.map(row => row.tagName)).toEqual(['div', 'img', 'a', 'meta', 'br']);
    expect(seen.every(row => row.namespaceURI === HTML_NS)).toBe(true);
    expect(seen.every(row => row.selfClosing === false)).toBe(true);
    expect(seen.every(row => row.removed === false)).toBe(true);
    expect(seen.find(row => row.tagName === 'div')?.canHaveContent).toBe(true);
    expect(seen.find(row => row.tagName === 'a')?.canHaveContent).toBe(true);
    expect(seen.find(row => row.tagName === 'img')?.canHaveContent).toBe(false);
    expect(seen.find(row => row.tagName === 'meta')?.canHaveContent).toBe(false);
    expect(seen.find(row => row.tagName === 'br')?.canHaveContent).toBe(false);
  });

  test('uppercase tags become lowercase tagName; lang and values keep source case', () => {
    const [img] = inspectHarvestRewriterElements(
      `<IMG SRC="/Cat.JPG" LANG="en-US">`,
      'img'
    );
    expect(img?.tagName).toBe('img');
    expect(img?.lang).toBe('en-US');
    expect(img?.attributes).toEqual([
      ['src', '/Cat.JPG'],
      ['lang', 'en-US'],
    ]);
    const rewritten = rewriteHarvestString(`<IMG SRC="/Cat.JPG" LANG="en-US">`, BASE);
    expect(rewritten).toContain('https://bun.com/Cat.JPG');
    expect(rewritten).toContain('en-US');
  });

  test('href values keep case; attribute names are lowercase', () => {
    const [anchor] = inspectHarvestRewriterElements(`<a HREF="/Docs" title="Hello">x</a>`, 'a');
    expect(anchor?.tagName).toBe('a');
    expect(anchor?.attributes).toEqual([
      ['href', '/Docs'],
      ['title', 'Hello'],
    ]);
    expect(rewriteHarvestString(`<a HREF="/Docs">x</a>`, BASE)).toContain('https://bun.com/Docs');
  });

  test('el.removed is true after remove(); void img cannot have content', () => {
    let propsAfterRemove = false;
    const rewriter = htmlRewriterOn(new HTMLRewriter(), 'img[src]', {
      element(el) {
        expect(el.tagName).toBe('img');
        expect(el.canHaveContent).toBe(false);
        expect(el.removed).toBe(false);
        el.remove();
        expect(el.removed).toBe(true);
        propsAfterRemove = el.removed;
      },
    });
    const out = htmlRewriterTransformString(rewriter, '<img src="/cat.jpg">');
    expect(propsAfterRemove).toBe(true);
    expect(out).not.toContain('cat.jpg');
  });

  test('removed true: harvest does not rewrite the node into the output', () => {
    const rewriter = htmlRewriterOn(createHarvestHtmlRewriter(BASE), 'img[src]', {
      element(el) {
        el.remove();
        expect(el.removed).toBe(true);
      },
    });
    const out = htmlRewriterTransformString(rewriter, '<img src="/cat.jpg">');
    expect(out).not.toContain('<img');
  });
});
