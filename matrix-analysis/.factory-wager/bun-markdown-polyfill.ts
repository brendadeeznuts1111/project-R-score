/**
 * Bun v1.3.8 Native Markdown Polyfill Implementation
 * Runtime implementation for Bun.markdown API simulation
 */

// Polyfill implementation for Bun.markdown (simulated until native API is available)
const parseMarkdown = (content: string, options?: any): string => {
  let result = content;

  // Apply custom renderers if provided
  if (options) {
    // Headings
    if (options.heading) {
      result = result.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        return options.heading!(content.trim(), { level });
      });
    }

    // Strong/bold
    if (options.strong) {
      result = result.replace(/\*\*(.+?)\*\*/g, (match, content) => {
        return options.strong!(content);
      });
    }

    // Emphasis/italic
    if (options.emphasis) {
      result = result.replace(/\*(.+?)\*/g, (match, content) => {
        return options.emphasis!(content);
      });
    }

    // Code blocks
    if (options.code) {
      result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return options.code!(code.trim());
      });
    }

    // Inline code
    if (options.codespan) {
      result = result.replace(/`([^`]+)`/g, (match, code) => {
        return options.codespan!(code);
      });
    }

    // Paragraphs
    if (options.paragraph) {
      const paragraphs = result.split('\n\n');
      result = paragraphs.map(para => {
        if (para.trim() && !para.startsWith('#') && !para.startsWith('```') && !para.startsWith('|')) {
          return options.paragraph!(para.trim());
        }
        return para;
      }).join('\n\n');
    }

    // Lists
    if (options.list) {
      result = result.replace(/^[-*+]\s+(.+)$/gm, (match, content) => {
        return options.list!(content);
      });
    }

    // Tables
    if (options.table) {
      const tableLines = result.split('\n').filter(line => line.includes('|'));
      if (tableLines.length > 0) {
        const tableContent = tableLines.join('\n');
        result = result.replace(tableContent, options.table!(tableContent));
      }
    }

    // Blockquotes
    if (options.blockquote) {
      result = result.replace(/^>\s+(.+)$/gm, (match, content) => {
        return options.blockquote!(content);
      });
    }

    // Horizontal rules
    if (options.hr) {
      result = result.replace(/^---+$/gm, () => options.hr!());
    }

    // Links
    if (options.link) {
      result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
        return options.link!(text, { href });
      });
    }
  }

  return result;
};

// Create the Bun.markdown object if it doesn't exist
if (typeof globalThis !== 'undefined' && !(globalThis as any).Bun) {
  (globalThis as any).Bun = {};
}

if (typeof globalThis !== 'undefined' && (globalThis as any).Bun && !(globalThis as any).Bun.markdown) {
  (globalThis as any).Bun.markdown = {
    render: (content: string, options?: any) => {
      return parseMarkdown(content, options);
    },

    html: (content: string, options?: any) => {
      // Convert to basic HTML
      let html = content;
      html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
        const level = hashes.length;
        const id = options?.headingIds ? ` id="${content.toLowerCase().replace(/\s+/g, '-')}"` : '';
        return `<h${level}${id}>${content}</h${level}>`;
      });
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
      html = html.replace(/^---+$/gm, '<hr>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      html = html.replace(/\n\n/g, '</p><p>');
      html = '<p>' + html + '</p>';
      html = html.replace(/<p><\/p>/g, '');
      html = html.replace(/<p>(<h[1-6]>)/g, '$1');
      html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
      html = html.replace(/<p>(<blockquote>)/g, '$1');
      html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
      html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

      return html;
    },

    react: (content: string, options?: any) => {
      // Convert to React-like structure
      const parseReact = (content: string): any => {
        const lines = content.split('\n');
        const elements: any[] = [];

        for (const line of lines) {
          if (line.startsWith('#')) {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
              const level = match[1].length;
              const text = match[2];
              if (options?.heading) {
                elements.push(options.heading(text, { level }));
              } else {
                elements.push({
                  type: 'h' + level,
                  props: { children: text }
                });
              }
            }
          } else if (line.trim()) {
            if (options?.paragraph) {
              elements.push(options.paragraph(line.trim()));
            } else {
              elements.push({
                type: 'p',
                props: { children: line.trim() }
              });
            }
          }
        }

        return {
          type: 'div',
          props: { children: elements }
        };
      };

      return parseReact(content);
    }
  };
}

export {};
