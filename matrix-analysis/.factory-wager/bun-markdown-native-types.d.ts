/**
 * Bun v1.3.8 Native Markdown Type Definitions
 * TypeScript declarations for Bun.markdown API
 */

declare global {
  namespace Bun {
    namespace Markdown {
      interface RenderOptions {
        heading?: (children: string, options: { level: number }) => string;
        strong?: (children: string) => string;
        emphasis?: (children: string) => string;
        code?: (children: string) => string;
        codespan?: (children: string) => string;
        paragraph?: (children: string) => string;
        list?: (children: string) => string;
        listItem?: (children: string) => string;
        table?: (children: string) => string;
        blockquote?: (children: string) => string;
        hr?: () => string;
        link?: (children: string, options: { href: string }) => string;
        image?: (children: string, options: { src: string; title?: string; alt?: string }) => string;
        thematicBreak?: () => string;
      }

      interface HTMLOptions {
        headingIds?: boolean;
        gfm?: boolean;
        extensions?: string[];
      }

      interface ReactElement {
        type: string;
        props: Record<string, any>;
        children?: any;
        key?: any;
        ref?: any;
      }

      interface ReactOptions {
        heading?: (children: any, options: { level: number }) => ReactElement;
        strong?: (children: any) => ReactElement;
        emphasis?: (children: any) => ReactElement;
        code?: (children: any) => ReactElement;
        paragraph?: (children: any) => ReactElement;
        list?: (children: any) => ReactElement;
        listItem?: (children: any) => ReactElement;
        table?: (children: any) => ReactElement;
        blockquote?: (children: any) => ReactElement;
        hr?: () => ReactElement;
        link?: (children: any, options: { href: string }) => ReactElement;
        image?: (children: any, options: { src: string; title?: string; alt?: string }) => ReactElement;
      }
    }

    interface BunStatic {
      markdown: {
        render: (content: string, options?: Bun.Markdown.RenderOptions) => string;
        html: (content: string, options?: Bun.Markdown.HTMLOptions) => string;
        react: (content: string, options?: Bun.Markdown.ReactOptions) => Bun.Markdown.ReactElement;
      };
    }
  }
}

// Also augment the bun module directly
declare module 'bun' {
  interface BunStatic {
    markdown: {
      render: (content: string, options?: Bun.Markdown.RenderOptions) => string;
      html: (content: string, options?: Bun.Markdown.HTMLOptions) => string;
      react: (content: string, options?: Bun.Markdown.ReactOptions) => Bun.Markdown.ReactElement;
    };
  }
}

export {};
