/**
 * FactoryWager Registry v4.0 - Type-Safe Markdown Wrapper
 * Provides type-safe access to Bun's markdown API with fallbacks
 */

// Type definitions for Bun markdown API
interface MarkdownOptions {
  [key: string]: (content: string) => string
}

interface MarkdownAPI {
  html: (markdown: string) => string
  render?: (markdown: string, options?: MarkdownOptions) => string
  react?: (markdown: string) => any
}

/**
 * Type-safe wrapper for Bun's markdown API
 * Handles cases where the API might not be available or properly typed
 */
class MarkdownProcessor {
  private api: MarkdownAPI

  constructor() {
    // Use type assertion to access the markdown API
    this.api = (Bun as any).markdown || this.createFallbackAPI()
  }

  /**
   * Convert markdown to HTML
   */
  toHTML(markdown: string): string {
    try {
      return this.api.html(markdown)
    } catch (error: any) {
      console.warn('Markdown HTML conversion failed:', error.message)
      return this.fallbackHTML(markdown)
    }
  }

  /**
   * Render markdown with custom options
   */
  render(markdown: string, options?: MarkdownOptions): string {
    if (!this.api.render) {
      return this.toHTML(markdown)
    }

    try {
      return this.api.render(markdown, options)
    } catch (error: any) {
      console.warn('Markdown custom render failed:', error.message)
      return this.toHTML(markdown)
    }
  }

  /**
   * Convert markdown to React components (if available)
   */
  toReact(markdown: string): any {
    if (!this.api.react) {
      throw new Error('React markdown rendering not available')
    }

    try {
      return this.api.react(markdown)
    } catch (error: any) {
      console.warn('Markdown React conversion failed:', error.message)
      throw error
    }
  }

  /**
   * Check if markdown API is available
   */
  isAvailable(): boolean {
    return !!(Bun as any).markdown
  }

  /**
   * Get API capabilities
   */
  getCapabilities(): {
    html: boolean
    render: boolean
    react: boolean
  } {
    return {
      html: !!this.api.html,
      render: !!this.api.render,
      react: !!this.api.react
    }
  }

  /**
   * Create fallback API for environments without markdown support
   */
  private createFallbackAPI(): MarkdownAPI {
    return {
      html: this.fallbackHTML.bind(this),
      render: this.fallbackHTML.bind(this)
    }
  }

  /**
   * Basic markdown to HTML fallback
   */
  private fallbackHTML(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }
}

// Export singleton instance
export const markdownProcessor = new MarkdownProcessor()

// Export convenience functions
export const markdownToHTML = (markdown: string) => markdownProcessor.toHTML(markdown)
export const renderMarkdown = (markdown: string, options?: MarkdownOptions) => 
  markdownProcessor.render(markdown, options)
export const markdownToReact = (markdown: string) => markdownProcessor.toReact(markdown)

// Export types
export type { MarkdownOptions, MarkdownAPI }
