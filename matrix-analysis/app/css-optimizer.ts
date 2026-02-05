// app/css-optimizer.ts
import { LightningCSSProcessor } from '../css/lightning-bundler'

// Security: Validate file paths to prevent directory traversal
function validateCSSPath(pathname: string): string {
  // Remove leading slash and normalize
  const cleanPath = pathname.replace(/^\/+/, '')

  // Check for directory traversal attempts
  if (cleanPath.includes('..') || cleanPath.includes('\\') || cleanPath.startsWith('/')) {
    throw new Error('Invalid file path')
  }

  // Only allow .css files in styles directory
  if (!cleanPath.endsWith('.css') || !cleanPath.startsWith('styles/')) {
    throw new Error('Only CSS files in styles directory are allowed')
  }

  return cleanPath
}

// Real-time CSS optimization in middleware
const cssProcessor = new LightningCSSProcessor()

Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname.endsWith('.css')) {
      try {
        // Security: Validate and sanitize file path
        const validatedPath = validateCSSPath(url.pathname)
        const original = await Bun.file(validatedPath).text()

        const optimized = await cssProcessor.process(original, {
          minify: process.env.NODE_ENV === 'production',
          sourceMap: process.env.NODE_ENV !== 'production',
          cssModules: url.pathname.includes('modules') ? {
            pattern: 'app__[local]'
          } : undefined
        })

        return new Response(optimized.code, {
          headers: {
            'Content-Type': 'text/css',
            'X-CSS-Optimized': 'true',
            'X-Original-Size': original.length.toString(),
            'X-Optimized-Size': optimized.code.length.toString(),
            'X-Reduction': `${optimized.performance.ratio.toFixed(1)}%`,
            'Cache-Control': process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000'
              : 'no-cache'
          }
        })
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        return new Response(`CSS processing failed: ${errorMessage}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    }

    // CSS bundle endpoint
    if (url.pathname === '/css/bundle') {
      try {
        const entrypoints = [
          './styles/main.css',
          './styles/components.css',
          './styles/utilities.css'
        ]

        const bundle = await cssProcessor.bundle(entrypoints)

        return new Response(bundle.code, {
          headers: {
            'Content-Type': 'text/css',
            'X-CSS-Bundled': 'true',
            'Cache-Control': 'public, max-age=31536000'
          }
        })
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error'
        return new Response(`CSS bundling failed: ${errorMessage}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    }

    return new Response('CSS Optimization Server', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }
})

console.log('🎨 CSS Optimization Server running on http://localhost:3001')
console.log('📦 Try: http://localhost:3001/styles/main.css')
console.log('📦 Bundle: http://localhost:3001/css/bundle')
