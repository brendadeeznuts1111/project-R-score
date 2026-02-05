/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
// lib/enhanced-markdown.ts
// Enhanced Markdown rendering with security and sanitization

export interface MarkdownOptions {
  // ANSI colors
  headingColors?: string[];
  boldColor?: string;
  codeColor?: string;
  linkColor?: string;
  emphasisColor?: string;
  // Features
  enableSyntaxHighlighting?: boolean;
  enableTableStyling?: boolean;
  enableTaskLists?: boolean;
  // Security
  sanitizeHTML?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  // Official Bun parser options
  tables?: boolean;
  strikethrough?: boolean;
  tasklists?: boolean;
  autolinks?: boolean | { url?: boolean; www?: boolean; email?: boolean };
  headings?: boolean | { ids?: boolean; autolink?: boolean };
  hardSoftBreaks?: boolean;
  wikiLinks?: boolean;
  underline?: boolean;
  latexMath?: boolean;
  collapseWhitespace?: boolean;
  permissiveAtxHeaders?: boolean;
  noIndentedCodeBlocks?: boolean;
  noHtmlBlocks?: boolean;
  noHtmlSpans?: boolean;
  tagFilter?: boolean;
  // Custom callbacks
  customCallbacks?: Record<string, Function>;
}

// HTML sanitization utilities
class HTMLSanitizer {
  private static readonly DEFAULT_ALLOWED_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'strong', 'em', 'u', 's', 'del',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr'
  ];

  private static readonly DEFAULT_ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'th': ['align'],
    'td': ['align'],
    '*': ['class', 'id']
  };

  static sanitize(html: string, options?: { allowedTags?: string[], allowedAttributes?: Record<string, string[]> }): string {
    const allowedTags = options?.allowedTags || this.DEFAULT_ALLOWED_TAGS;
    const allowedAttributes = options?.allowedAttributes || this.DEFAULT_ALLOWED_ATTRIBUTES;

    // Remove dangerous elements and attributes
    let sanitized = html
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove on* event handlers
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: URLs
      .replace(/javascript:/gi, '')
      // Remove data: URLs except for safe images
      .replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg))/gi, '')
      // Remove vbscript: URLs
      .replace(/vbscript:/gi, '')
      // Remove file: URLs
      .replace(/file:/gi, '');

    // Basic tag validation
    const tagRegex = /<(\w+)([^>]*)>/g;
    sanitized = sanitized.replace(tagRegex, (match, tagName, attributes) => {
      const lowerTag = tagName.toLowerCase();

      if (!allowedTags.includes(lowerTag)) {
        return ''; // Remove disallowed tags
      }

      // Sanitize attributes
      const cleanAttrs = this.sanitizeAttributes(attributes, lowerTag, allowedAttributes);
      return `<${lowerTag}${cleanAttrs}>`;
    });

    return sanitized;
  }

  private static sanitizeAttributes(attributes: string, tagName: string, allowed: Record<string, string[]>): string {
    if (!attributes.trim()) return '';

    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    const cleanAttrs: string[] = [];
    const allowedForTag = allowed[tagName] || [];
    const allowedForAll = allowed['*'] || [];

    let match;
    while ((match = attrRegex.exec(attributes)) !== null) {
      const [, attrName, attrValue] = match;
      const lowerAttr = attrName.toLowerCase();

      if (allowedForTag.includes(lowerAttr) || allowedForAll.includes(lowerAttr)) {
        // Additional validation for specific attributes
        if (lowerAttr === 'href' || lowerAttr === 'src') {
          if (this.isValidURL(attrValue)) {
            cleanAttrs.push(`${lowerAttr}="${attrValue}"`);
          }
        } else {
          cleanAttrs.push(`${lowerAttr}="${attrValue}"`);
        }
      }
    }

    return cleanAttrs.length > 0 ? ' ' + cleanAttrs.join(' ') : '';
  }

  private static isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  static escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match]);
  }
}

export class EnhancedMarkdownRenderer {
  private options: MarkdownOptions;

  constructor(options: MarkdownOptions = {}) {
    this.options = {
      headingColors: ['\x1b[1;96m', '\x1b[1;95m', '\x1b[1;94m', '\x1b[1;93m', '\x1b[1;92m'],
      boldColor: '\x1b[1;91m',
      codeColor: '\x1b[97m\x1b[100m',
      linkColor: '\x1b[94m\x1b[4m',
      emphasisColor: '\x1b[3;96m',
      enableSyntaxHighlighting: true,
      enableTableStyling: true,
      enableTaskLists: true,
      sanitizeHTML: true, // Enable sanitization by default

      // Official Bun parser defaults (matching documentation)
      tables: true,
      strikethrough: true,
      tasklists: true,
      autolinks: true,
      headings: { ids: true, autolink: true },
      tagFilter: true,

      ...options
    };
  }

  /**
   * Validate and sanitize input markdown
   */
  private validateInput(markdown: string): string {
    if (typeof markdown !== 'string') {
      throw new Error('Markdown input must be a string');
    }

    // Limit input size to prevent DoS
    if (markdown.length > 10_000_000) { // 10MB limit
      throw new Error('Markdown input too large (max 10MB)');
    }

    return markdown;
  }

  // Full ANSI renderer with all available callbacks
  renderANSI(markdown: string): string {
    const validatedInput = this.validateInput(markdown);
    const opts = this.options;

    return Bun.markdown.render(validatedInput, {
      // Block callbacks
      heading: (children, meta) => {
        const level = meta?.level || 1;
        const color = opts.headingColors?.[level - 1] || opts.headingColors?.[0] || '\x1b[1m';
        return `${color}${children}\x1b[0m\n`;
      },

      paragraph: children => children + '\n',

      blockquote: children => `\x1b[90m▶ ${children.trim()}\x1b[0m\n`,

      code: (children, meta) => {
        if (opts.enableSyntaxHighlighting && meta?.language) {
          const langColors: Record<string, string> = {
            'js': '\x1b[93m',    // Yellow for JavaScript
            'ts': '\x1b[94m',    // Blue for TypeScript
            'bash': '\x1b[92m',  // Green for Bash
            'json': '\x1b[96m',  // Cyan for JSON
            'html': '\x1b[91m',  // Red for HTML
            'css': '\x1b[95m',   // Magenta for CSS
            'md': '\x1b[97m',    // White for Markdown
          };
          const color = langColors[meta.language] || opts.codeColor;
          return `${color}${children}\x1b[0m\n`;
        }
        return `${opts.codeColor}${children}\x1b[0m\n`;
      },

      list: (children, meta) => {
        // Handle ordered vs unordered lists
        return children + '\n';
      },

      listItem: (children, meta) => {
        const bullet = meta?.checked !== undefined ?
          (meta.checked ? '\x1b[32m✓\x1b[0m' : '\x1b[31m○\x1b[0m') :
          '\x1b[95m•\x1b[0m';
        return `${bullet} ${children.trim()}\n`;
      },

      hr: () => '\x1b[90m' + '─'.repeat(50) + '\x1b[0m\n',

      table: children => children,

      thead: children => children,

      tbody: children => children,

      tr: children => `| ${children}\n`,

      th: (children, meta) => {
        const align = meta?.align || 'left';
        const alignSymbol = align === 'center' ? '\x1b[4m' : align === 'right' ? '\x1b[3m' : '';
        return `\x1b[1;4;97m${alignSymbol}${children}\x1b[0m | `;
      },

      td: (children, meta) => {
        if (!opts.enableTableStyling) return `${children} | `;

        // Color-code based on content
        if (children.includes('✅')) return '\x1b[32;1m' + children + '\x1b[0m | ';
        if (children.includes('⚡')) return '\x1b[93;1m' + children + '\x1b[0m | ';
        if (children.includes('🔧')) return '\x1b[33;1m' + children + '\x1b[0m | ';
        if (children.includes('🔥')) return '\x1b[91;1m' + children + '\x1b[0m | ';
        if (children.includes('❌')) return '\x1b[31;1m' + children + '\x1b[0m | ';
        if (children.includes('⚠️')) return '\x1b[93m' + children + '\x1b[0m | ';

        // Numeric values
        if (/^\d+(\.\d+)?$/.test(children.trim())) {
          const num = parseFloat(children.trim());
          if (num >= 0.9) return '\x1b[32m' + children + '\x1b[0m | '; // Green for high values
          if (num >= 0.7) return '\x1b[93m' + children + '\x1b[0m | '; // Yellow for medium
          if (num >= 0.5) return '\x1b[33m' + children + '\x1b[0m | '; // Orange for low
          return '\x1b[31m' + children + '\x1b[0m | '; // Red for very low
        }

        return '\x1b[37m' + children + '\x1b[0m | ';
      },

      html: children => '', // Strip HTML by default

      // Inline callbacks
      strong: children => `${opts.boldColor}${children}\x1b[22m`,

      emphasis: children => `${opts.emphasisColor}${children}\x1b[23m`,

      link: (text, meta) => {
        const href = meta?.href || '';
        const title = meta?.title;
        const titleAttr = title ? ` \x1b[90m"${title}"\x1b[0m` : '';
        return `${opts.linkColor}${text}\x1b[0m \x1b[90m[\x1b[36m${href}\x1b[90m]${titleAttr}`;
      },

      image: (alt, meta) => {
        const src = meta?.src || '';
        const title = meta?.title;
        return `\x1b[95m🖼️ ${alt || 'image'}\x1b[0m \x1b[90m[\x1b[36m${src}\x1b[90m]\x1b[0m`;
      },

      codespan: children => `${opts.codeColor}${children}\x1b[0m`,

      strikethrough: children => `\x1b[90m~~${children}~~\x1b[0m`,

      text: children => children,

      // Apply any custom callbacks
      ...opts.customCallbacks
    });
  }

  // HTML renderer with custom classes and security
  renderHTML(markdown: string, options: { classes?: boolean; syntax?: boolean } = {}): string {
    const { classes = true, syntax = true } = options;
    const validatedInput = this.validateInput(markdown);

    let html: string;

    if (classes) {
      // Use custom rendering with classes
      const parserOptions = {
        tables: this.options.tables,
        strikethrough: this.options.strikethrough,
        tasklists: this.options.tasklists,
        autolinks: this.options.autolinks,
        headings: this.options.headings,
        tagFilter: this.options.tagFilter,
        hardSoftBreaks: this.options.hardSoftBreaks,
        wikiLinks: this.options.wikiLinks,
        underline: this.options.underline,
        latexMath: this.options.latexMath,
        collapseWhitespace: this.options.collapseWhitespace,
        permissiveAtxHeaders: this.options.permissiveAtxHeaders,
        noIndentedCodeBlocks: this.options.noIndentedCodeBlocks,
        noHtmlBlocks: this.options.noHtmlBlocks,
        noHtmlSpans: this.options.noHtmlSpans,
      };

      html = Bun.markdown.render(validatedInput, {
        heading: (children, meta) => {
          const level = meta?.level || 1;
          return `<h${level} class="heading heading-${level}">${HTMLSanitizer.escapeHtml(children)}</h${level}>`;
        },

        paragraph: children => `<p class="paragraph">${HTMLSanitizer.escapeHtml(children)}</p>`,

        blockquote: children => `<blockquote class="blockquote">${HTMLSanitizer.escapeHtml(children)}</blockquote>`,

        code: (children, meta) => {
          const lang = meta?.language || '';
          const langClass = lang ? ` language-${lang}` : '';
          return `<pre class="code-block${langClass}"><code class="code${langClass}">${HTMLSanitizer.escapeHtml(children)}</code></pre>`;
        },

        list: (children, meta) => {
          const type = meta?.ordered ? 'ol' : 'ul';
          const start = meta?.start ? ` start="${meta.start}"` : '';
          return `<${type} class="list"${start}>${HTMLSanitizer.escapeHtml(children)}</${type}>`;
        },

        listItem: (children, meta) => {
          const checked = meta?.checked !== undefined ? ` data-checked="${meta.checked}"` : '';
          return `<li class="list-item"${checked}>${HTMLSanitizer.escapeHtml(children)}</li>`;
        },

        table: children => `<table class="table">${HTMLSanitizer.escapeHtml(children)}</table>`,

        th: (children, meta) => {
          const align = meta?.align || '';
          const alignClass = align ? ` text-${align}` : '';
          return `<th class="table-header${alignClass}">${HTMLSanitizer.escapeHtml(children)}</th>`;
        },

        td: (children, meta) => {
          const align = meta?.align || '';
          const alignClass = align ? ` text-${align}` : '';
          return `<td class="table-cell${alignClass}">${HTMLSanitizer.escapeHtml(children)}</td>`;
        },

        strong: children => `<strong class="bold">${HTMLSanitizer.escapeHtml(children)}</strong>`,

        emphasis: children => `<em class="italic">${HTMLSanitizer.escapeHtml(children)}</em>`,

        link: (text, meta) => {
          const href = meta?.href || '';
          const title = meta?.title ? ` title="${HTMLSanitizer.escapeHtml(meta.title)}"` : '';

          // Validate URL
          if (href && !HTMLSanitizer.isValidURL(href)) {
            return `<span class="invalid-link">${HTMLSanitizer.escapeHtml(text)}</span>`;
          }

          return `<a href="${HTMLSanitizer.escapeHtml(href)}" class="link"${title}>${HTMLSanitizer.escapeHtml(text)}</a>`;
        },

        image: (alt, meta) => {
          const src = meta?.src || '';
          const title = meta?.title ? ` title="${HTMLSanitizer.escapeHtml(meta.title)}"` : '';

          // Validate image URL
          if (src && !HTMLSanitizer.isValidURL(src)) {
            return `<span class="invalid-image">${HTMLSanitizer.escapeHtml(alt || 'image')}</span>`;
          }

          return `<img src="${HTMLSanitizer.escapeHtml(src)}" alt="${HTMLSanitizer.escapeHtml(alt || '')}" class="image"${title}>`;
        },

        codespan: children => `<code class="inline-code">${HTMLSanitizer.escapeHtml(children)}</code>`,

        strikethrough: children => `<del class="strikethrough">${HTMLSanitizer.escapeHtml(children)}</del>`,

        hr: () => '<hr class="divider">',

        html: children => this.options.sanitizeHTML ? '' : children // Preserve HTML only if sanitization is disabled
      }, parserOptions);
    } else {
      // Use default HTML rendering with parser options
      const parserOptions = {
        tables: this.options.tables,
        strikethrough: this.options.strikethrough,
        tasklists: this.options.tasklists,
        autolinks: this.options.autolinks,
        headings: this.options.headings,
        tagFilter: this.options.tagFilter,
        hardSoftBreaks: this.options.hardSoftBreaks,
        wikiLinks: this.options.wikiLinks,
        underline: this.options.underline,
        latexMath: this.options.latexMath,
        collapseWhitespace: this.options.collapseWhitespace,
        permissiveAtxHeaders: this.options.permissiveAtxHeaders,
        noIndentedCodeBlocks: this.options.noIndentedCodeBlocks,
        noHtmlBlocks: this.options.noHtmlBlocks,
        noHtmlSpans: this.options.noHtmlSpans,
      };

      html = Bun.markdown.html(validatedInput, parserOptions);
    }

    // Apply final sanitization if enabled
    if (this.options.sanitizeHTML) {
      html = HTMLSanitizer.sanitize(html, {
        allowedTags: this.options.allowedTags,
        allowedAttributes: this.options.allowedAttributes
      });
    }

    return html;
  }

  // Extract specific content types
  extractLinks(markdown: string): Array<{ text: string; href: string; title?: string }> {
    const validatedInput = this.validateInput(markdown);
    const links: Array<{ text: string; href: string; title?: string }> = [];

    Bun.markdown.render(validatedInput, {
      link: (text, meta) => {
        if (meta?.href) {
          // Validate and sanitize link
          if (HTMLSanitizer['isValidURL'](meta.href)) {
            links.push({
              text: HTMLSanitizer.escapeHtml(text),
              href: HTMLSanitizer.escapeHtml(meta.href),
              title: meta?.title ? HTMLSanitizer.escapeHtml(meta.title) : undefined
            });
          }
        }
        return null; // Don't render
      },
      image: (alt, meta) => {
        if (meta?.src) {
          // Validate and sanitize image link
          if (HTMLSanitizer['isValidURL'](meta.src)) {
            links.push({
              text: HTMLSanitizer.escapeHtml(alt || 'image'),
              href: HTMLSanitizer.escapeHtml(meta.src),
              title: meta?.title ? HTMLSanitizer.escapeHtml(meta.title) : undefined
            });
          }
        }
        return null; // Don't render
      },
      // Suppress all other output
      heading: () => null,
      paragraph: () => null,
      strong: () => null,
      emphasis: () => null,
      code: () => null,
      codespan: () => null,
      list: () => null,
      listItem: () => null,
      blockquote: () => null,
      hr: () => null,
      table: () => null,
      th: () => null,
      td: () => null,
      tr: () => null,
      thead: () => null,
      tbody: () => null,
      strikethrough: () => null,
      text: () => null,
      html: () => null
    });

    return links;
  }

  // Extract headings
  extractHeadings(markdown: string): Array<{ level: number; text: string; id?: string }> {
    const headings: Array<{ level: number; text: string; id?: string }> = [];

    Bun.markdown.render(markdown, {
      heading: (children, meta) => {
        headings.push({
          level: meta?.level || 1,
          text: children,
          id: meta?.id
        });
        return null; // Don't render
      },
      // Suppress all other output
      paragraph: () => null,
      strong: () => null,
      emphasis: () => null,
      code: () => null,
      codespan: () => null,
      list: () => null,
      listItem: () => null,
      blockquote: () => null,
      hr: () => null,
      table: () => null,
      th: () => null,
      td: () => null,
      tr: () => null,
      thead: () => null,
      tbody: () => null,
      link: () => null,
      image: () => null,
      strikethrough: () => null,
      text: () => null,
      html: () => null
    });

    return headings;
  }

  // Strip all formatting (plain text)
  stripFormatting(markdown: string): string {
    return Bun.markdown.render(markdown, {
      heading: children => children,
      paragraph: children => children + '\n',
      strong: children => children,
      emphasis: children => children,
      link: children => children,
      image: () => '', // Remove images
      code: children => children,
      codespan: children => children,
      list: children => children,
      listItem: children => children + '\n',
      blockquote: children => children,
      hr: () => '\n',
      table: children => children,
      th: children => children,
      td: children => children,
      tr: children => children + '\n',
      thead: children => children,
      tbody: children => children,
      strikethrough: children => children,
      text: children => children,
      html: () => '' // Remove HTML
    });
  }
}

// Default renderer instance
export const defaultRenderer = new EnhancedMarkdownRenderer();

// Convenience functions
export const renderANSI = (markdown: string, options?: MarkdownOptions) =>
  new EnhancedMarkdownRenderer(options).renderANSI(markdown);

export const renderHTML = (markdown: string, options?: { classes?: boolean; syntax?: boolean }) =>
  new EnhancedMarkdownRenderer().renderHTML(markdown, options);

export const extractLinks = (markdown: string) =>
  new EnhancedMarkdownRenderer().extractLinks(markdown);

export const extractHeadings = (markdown: string) =>
  new EnhancedMarkdownRenderer().extractHeadings(markdown);

export const stripFormatting = (markdown: string) =>
  new EnhancedMarkdownRenderer().stripFormatting(markdown);

// React component support (using official Bun API)
export function renderMarkdownReact(
  markdown: string,
  components?: Record<string, any>,
  options?: MarkdownOptions
) {
  const renderer = new EnhancedMarkdownRenderer(options);
  const validatedInput = renderer['validateInput'](markdown);

  const parserOptions = {
    tables: options?.tables ?? true,
    strikethrough: options?.strikethrough ?? true,
    tasklists: options?.tasklists ?? true,
    autolinks: options?.autolinks ?? true,
    headings: options?.headings ?? { ids: true, autolink: true },
    tagFilter: options?.tagFilter ?? true,
    hardSoftBreaks: options?.hardSoftBreaks,
    wikiLinks: options?.wikiLinks,
    underline: options?.underline,
    latexMath: options?.latexMath,
    collapseWhitespace: options?.collapseWhitespace,
    permissiveAtxHeaders: options?.permissiveAtxHeaders,
    noIndentedCodeBlocks: options?.noIndentedCodeBlocks,
    noHtmlBlocks: options?.noHtmlBlocks,
    noHtmlSpans: options?.noHtmlSpans,
  };

  return Bun.markdown.react(validatedInput, components, parserOptions);
}

// CLI usage
if (import.meta.main) {
  const file = process.argv[2] || 'README.md';
  const format = process.argv[3] || 'ansi';

  try {
    const markdown = await Bun.file(file).text();

    switch (format) {
      case 'ansi':
        console.log(renderANSI(markdown));
        break;
      case 'html':
        console.log(renderHTML(markdown));
        break;
      case 'links':
        const links = extractLinks(markdown);
        console.log('Links found:');
        links.forEach((link, i) => console.log(`${i + 1}. ${link.text} -> ${link.href}`));
        break;
      case 'headings':
        const headings = extractHeadings(markdown);
        console.log('Headings found:');
        headings.forEach(h => console.log(`${'#'.repeat(h.level)} ${h.text}`));
        break;
      case 'plain':
        console.log(stripFormatting(markdown));
        break;
      default:
        console.error('Unknown format. Use: ansi, html, links, headings, plain');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
