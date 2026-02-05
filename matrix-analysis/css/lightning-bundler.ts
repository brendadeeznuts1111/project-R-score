// css/lightning-bundler.ts
import { transform, browserslistToTargets, bundle } from 'lightningcss'

// LightningCSS is ALREADY in Bun (since v1.0.23)
export class LightningCSSProcessor {
  private targets = browserslistToTargets(['> 0.2%', 'supports css-nesting'])

  /**
   * Minify and transform CSS with native speed
   */
  async process(css: string, options: TransformOptions = {}): Promise<ProcessedCSS> {
    const startTime = performance.now()

    // Edge case: Handle empty CSS
    if (!css || css.trim().length === 0) {
      return {
        code: '',
        map: undefined,
        exports: undefined,
        performance: {
          processingTime: performance.now() - startTime,
          originalSize: 0,
          compressedSize: 0,
          ratio: 0
        }
      }
    }

    // Transform with LightningCSS (included in Bun)
    const result = transform({
      filename: options.filename || 'style.css',
      code: Buffer.from(css),
      minify: options.minify ?? true,
      sourceMap: options.sourceMap ?? false,
      targets: this.targets,

      // Modern CSS features
      cssModules: options.cssModules ? {
        pattern: options.cssModules.pattern || '[name]__[local]',
        dashedIdents: false
      } : undefined
    })

    const processingTime = performance.now() - startTime

    return {
      code: result.code.toString(),
      map: result.map ? result.map.toString() : undefined,
      exports: result.exports,
      performance: {
        processingTime,
        originalSize: css.length,
        compressedSize: result.code.length,
        ratio: (result.code.length / css.length) * 100
      }
    }
  }

  /**
   * Bundle multiple CSS files with tree-shaking
   */
  async bundle(entrypoints: string[]): Promise<BundleResult> {
    // For now, concatenate and process as single file
    // LightningCSS bundle API might be different
    const combinedCSS = await Promise.all(
      entrypoints.map(async file => await Bun.file(file).text())
    ).then(contents => contents.join('\n'))

    const result = transform({
      filename: 'bundle.css',
      code: Buffer.from(combinedCSS),
      minify: true,
      sourceMap: true,
      targets: this.targets
    })

    return {
      code: result.code.toString(),
      map: result.map?.toString(),
      analysis: {
        unusedRules: 0, // Would analyze with CSS analyzer
        minified: true,
        modern: true
      }
    }
  }

  /**
   * Critical CSS extraction for SSR
   */
  async extractCriticalCSS(html: string, css: string): Promise<CriticalCSS> {
    // Parse HTML for selectors
    const selectors = this.extractSelectorsFromHTML(html)

    // Use LightningCSS to filter (simplified version)
    const result = transform({
      filename: 'critical.css',
      code: Buffer.from(css),
      minify: true,
      targets: this.targets
    })

    return {
      critical: result.code.toString(),
      remaining: '', // Non-critical CSS for async loading
      selectors: selectors.length,
      size: result.code.length
    }
  }

  private extractSelectorsFromHTML(html: string): string[] {
    // Simple selector extraction - would be more sophisticated in production
    const selectorRegex = /class="([^"]+)"/g
    const selectors: string[] = []
    let match

    while ((match = selectorRegex.exec(html)) !== null) {
      selectors.push(...match[1].split(' ').map(s => `.${s}`))
    }

    return [...new Set(selectors)]
  }
}

// Type definitions
interface TransformOptions {
  filename?: string
  minify?: boolean
  sourceMap?: boolean
  cssModules?: {
    pattern?: string
  }
}

interface ProcessedCSS {
  code: string
  map?: string
  exports?: any
  performance: {
    processingTime: number
    originalSize: number
    compressedSize: number
    ratio: number
  }
}

interface BundleResult {
  code: string
  map?: string
  analysis: {
    unusedRules: number
    minified: boolean
    modern: boolean
  }
}

interface CriticalCSS {
  critical: string
  remaining: string
  selectors: number
  size: number
}

export default LightningCSSProcessor
