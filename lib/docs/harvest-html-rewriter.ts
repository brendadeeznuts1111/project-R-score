// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/html-rewriter#input-types — Response · string · ArrayBuffer · Blob · File
// Cloudflare Workers HTMLRewriter only supports Response.
// @see https://bun.com/docs/runtime/html-rewriter#css-selector-support — CSS selectors
// @see https://bun.com/docs/runtime/html-rewriter#element-operations — Element.setAttribute · before · after
// @see https://bun.com/docs/runtime/html-rewriter#element-operations — tagName · namespaceURI · selfClosing · canHaveContent · removed
// @see https://bun.com/docs/runtime/html-rewriter#error-handling — error channel = transform() vs Response body
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Harvest HTMLRewriter — one function per `transform()` input type.
 *
 *   rewriter.transform(new Response(html))
 *   rewriter.transform(html)
 *   rewriter.transform(new TextEncoder().encode(html).buffer)
 *   rewriter.transform(new Response(new Blob([html])))
 *   rewriter.transform(new Response(Bun.file("index.html")))
 *
 * Cloudflare Workers HTMLRewriter only accepts Response.
 *
 * Channel is *where* an error surfaces (input type, never timing):
 * - string / ArrayBuffer → throw from `transform()` (try/catch around the call)
 * - Response → `transform()` returns immediately; handler/stream errors reject
 *   the body read (`await output.text()`)
 * - Blob / File → wrap in `Response`, then the Response body channel
 *
 * Setup errors still throw from `transform()` even for Response: invalid selector
 * (`on()`), invalid input type, body already used/aborted.
 *
 * A handler Promise that is neither returned nor awaited reaches **neither**
 * channel (`unhandledRejection`). Harvest handlers stay sync.
 */

/** Where a rewrite error surfaces for this `transform()` overload. */
export type HarvestRewriterChannel = 'transform' | 'body';

export const HARVEST_REWRITER_STRING_CHANNEL = 'transform' as const satisfies HarvestRewriterChannel;
export const HARVEST_REWRITER_ARRAY_BUFFER_CHANNEL =
  'transform' as const satisfies HarvestRewriterChannel;
export const HARVEST_REWRITER_RESPONSE_CHANNEL = 'body' as const satisfies HarvestRewriterChannel;
export const HARVEST_REWRITER_BLOB_CHANNEL = 'body' as const satisfies HarvestRewriterChannel;
export const HARVEST_REWRITER_FILE_CHANNEL = 'body' as const satisfies HarvestRewriterChannel;

export class HarvestRewriterError extends Error {
  readonly channel: HarvestRewriterChannel;

  constructor(channel: HarvestRewriterChannel, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(message, { cause });
    this.name = 'HarvestRewriterError';
    this.channel = channel;
  }
}

export function wrapHarvestRewriterError(
  channel: HarvestRewriterChannel,
  cause: unknown
): HarvestRewriterError {
  if (cause instanceof HarvestRewriterError) return cause;
  return new HarvestRewriterError(channel, cause);
}

export function isHarvestHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function toAbsoluteHarvestUrl(value: string, baseUrl: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || isHarvestHttpUrl(trimmed)) return null;
  if (/^(javascript:|mailto:|data:|blob:)/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

export const HTML_NS = 'http://www.w3.org/1999/xhtml';

export type HarvestRewriterElement = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): unknown;
  tagName: string;
  namespaceURI: string;
  selfClosing: boolean;
  canHaveContent: boolean;
  removed: boolean;
  attributes: Iterable<[string, string]>;
  before(content: string, options?: { html?: boolean }): unknown;
  after(content: string, options?: { html?: boolean }): unknown;
  onEndTag(handler: () => void): unknown;
};

export type HarvestRewriterElementProps = {
  /** Always lowercase, even if the source tag was `<IMG>`. */
  tagName: string;
  namespaceURI: string;
  selfClosing: boolean;
  canHaveContent: boolean;
  removed: boolean;
  /** `lang` attribute value as written (`en-US`), or null. */
  lang: string | null;
  /** Attribute names are lowercase; values keep source case (`/Cat.JPG`). */
  attributes: Array<[string, string]>;
};

export function harvestRewriterAttributeValues(
  el: Pick<HarvestRewriterElement, 'attributes'>
): Array<[string, string]> {
  return [...el.attributes];
}

export function harvestRewriterElementProps(el: HarvestRewriterElement): HarvestRewriterElementProps {
  return {
    tagName: el.tagName,
    namespaceURI: el.namespaceURI,
    selfClosing: el.selfClosing,
    canHaveContent: el.canHaveContent,
    removed: el.removed,
    lang: el.getAttribute('lang'),
    attributes: harvestRewriterAttributeValues(el),
  };
}

export function inspectHarvestRewriterElements(
  html: string,
  selector: string
): HarvestRewriterElementProps[] {
  const seen: HarvestRewriterElementProps[] = [];
  htmlRewriterTransformString(
    htmlRewriterOn(new HTMLRewriter(), selector, {
      element(el) {
        seen.push(harvestRewriterElementProps(el as HarvestRewriterElement));
      },
    }),
    html
  );
  return seen;
}

function rewriteAttribute(el: HarvestRewriterElement, name: string, baseUrl?: string): void {
  if (el.removed) return;
  if (!baseUrl) return;
  const current = el.getAttribute(name);
  if (!current) return;
  const next = toAbsoluteHarvestUrl(current, baseUrl);
  if (next) el.setAttribute(name, next);
}

/** Wrap `<img>` in `<a href={src}>` via before/after { html: true }. Skip if already in a link or removed. */
function wrapImageInLink(el: HarvestRewriterElement): void {
  if (el.removed) return;
  const href = el.getAttribute('src');
  if (!href || /^(javascript:|data:)/i.test(href)) return;
  const safe = Bun.escapeHTML(href);
  el.before(`<a href="${safe}" target="_blank" rel="noopener">`, { html: true });
  el.after('</a>', { html: true });
}

export function htmlRewriterOn(
  rewriter: HTMLRewriter,
  selector: string,
  handlers: Parameters<HTMLRewriter['on']>[1]
): HTMLRewriter {
  try {
    return rewriter.on(selector, handlers);
  } catch (error) {
    throw wrapHarvestRewriterError('transform', error);
  }
}

/** Sync handlers only — string/ArrayBuffer transform cannot await the event loop. */
export function createHarvestHtmlRewriter(
  baseUrl?: string,
  options?: { wrapImages?: boolean }
): HTMLRewriter {
  const wrapImages = options?.wrapImages !== false;
  const rewriter = new HTMLRewriter();
  let linkDepth = 0;
  htmlRewriterOn(rewriter, 'a', {
    element(el) {
      linkDepth += 1;
      el.onEndTag(() => {
        linkDepth -= 1;
      });
    },
  });
  htmlRewriterOn(rewriter, 'img[src]', {
    element(el) {
      const node = el as HarvestRewriterElement;
      rewriteAttribute(node, 'src', baseUrl);
      if (wrapImages && linkDepth === 0) wrapImageInLink(node);
    },
  });
  htmlRewriterOn(rewriter, 'a[href]', {
    element(el) {
      rewriteAttribute(el as HarvestRewriterElement, 'href', baseUrl);
    },
  });
  htmlRewriterOn(rewriter, 'source[src]', {
    element(el) {
      rewriteAttribute(el as HarvestRewriterElement, 'src', baseUrl);
    },
  });
  htmlRewriterOn(rewriter, 'meta[property="og:image"]', {
    element(el) {
      rewriteAttribute(el as HarvestRewriterElement, 'content', baseUrl);
    },
  });
  htmlRewriterOn(rewriter, 'meta[name="og:image"]', {
    element(el) {
      rewriteAttribute(el as HarvestRewriterElement, 'content', baseUrl);
    },
  });
  htmlRewriterOn(rewriter, 'meta[name="twitter:image"]', {
    element(el) {
      rewriteAttribute(el as HarvestRewriterElement, 'content', baseUrl);
    },
  });
  return rewriter;
}

function expectType(ok: boolean, expected: string): void {
  if (ok) return;
  throw wrapHarvestRewriterError(
    'transform',
    new TypeError(`HTMLRewriter transform() expected ${expected}`)
  );
}

/** string: error channel is `transform()`. */
export function htmlRewriterTransformString(rewriter: HTMLRewriter, html: string): string {
  expectType(typeof html === 'string', 'a string');
  try {
    return rewriter.transform(html);
  } catch (error) {
    throw wrapHarvestRewriterError(HARVEST_REWRITER_STRING_CHANNEL, error);
  }
}

/** ArrayBuffer: error channel is `transform()`. */
export function htmlRewriterTransformArrayBuffer(
  rewriter: HTMLRewriter,
  buffer: ArrayBuffer
): string {
  expectType(buffer instanceof ArrayBuffer, 'an ArrayBuffer');
  try {
    const out = rewriter.transform(buffer);
    return typeof out === 'string' ? out : new TextDecoder().decode(out);
  } catch (error) {
    throw wrapHarvestRewriterError(HARVEST_REWRITER_ARRAY_BUFFER_CHANNEL, error);
  }
}

/**
 * Response: `transform()` returns immediately. Handler errors reject the body
 * read. Used/aborted input bodies still throw from `transform()` itself.
 */
export async function htmlRewriterTransformResponse(
  rewriter: HTMLRewriter,
  response: Response
): Promise<string> {
  expectType(response instanceof Response, 'a Response');
  let output: Response;
  try {
    output = rewriter.transform(response);
  } catch (error) {
    throw wrapHarvestRewriterError('transform', error);
  }
  try {
    return await output.text();
  } catch (error) {
    throw wrapHarvestRewriterError(HARVEST_REWRITER_RESPONSE_CHANNEL, error);
  }
}

/** `rewriter.transform("<div>content</div>")` — sync, error channel is transform(). */
export function rewriteHarvestString(html: string, baseUrl?: string): string {
  return htmlRewriterTransformString(createHarvestHtmlRewriter(baseUrl), html);
}

/** `rewriter.transform(new TextEncoder().encode(html).buffer)` — sync, transform() channel. */
export function rewriteHarvestArrayBuffer(buffer: ArrayBuffer, baseUrl?: string): string {
  return htmlRewriterTransformArrayBuffer(createHarvestHtmlRewriter(baseUrl), buffer);
}

/** `rewriter.transform(new Response(html))` — body-read error channel. */
export async function rewriteHarvestResponse(response: Response, baseUrl?: string): Promise<string> {
  return htmlRewriterTransformResponse(createHarvestHtmlRewriter(baseUrl), response);
}

/** Not a transform() overload: `rewriter.transform(new Response(new Blob([html])))`. */
export async function rewriteHarvestBlob(blob: Blob, baseUrl?: string): Promise<string> {
  expectType(typeof Blob !== 'undefined' && blob instanceof Blob, 'a Blob');
  return rewriteHarvestResponse(new Response(blob), baseUrl);
}

/** Not a transform() overload: `rewriter.transform(new Response(Bun.file("index.html")))`. */
export async function rewriteHarvestFile(file: Blob, baseUrl?: string): Promise<string> {
  expectType(typeof Blob !== 'undefined' && file instanceof Blob, 'a File');
  return rewriteHarvestResponse(new Response(file), baseUrl);
}
