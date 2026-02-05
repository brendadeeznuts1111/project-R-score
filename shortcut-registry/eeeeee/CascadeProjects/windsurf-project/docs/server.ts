#!/usr/bin/env bun

// URLPattern Showcase Server
// Serves the interactive URLPattern demonstration site

import { serve } from 'bun';
import { file } from 'bun';
import path from 'path';

const PORT = 3000;
const HOST = 'localhost';

// Define type for pattern results
interface PatternResult {
  index: number;
  pattern: string;
  matches: boolean;
  groups: string;
  hasRegExpGroups: boolean;
  extracted: Record<string, string | undefined>;
}

console.log(`🚀 Starting URLPattern Showcase Server...`);
console.log(`📁 Serving from: ${path.join(import.meta.dir, 'urlpattern-showcase.html')}`);
console.log(`🌐 Server will be available at: http://${HOST}:${PORT}`);

// Serve the HTML file
serve({
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve the main HTML file
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const htmlFile = file(path.join(import.meta.dir, 'urlpattern-showcase.html'));
      return new Response(htmlFile, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // API endpoint for pattern testing
    if (url.pathname === '/api/test-patterns') {
      try {
        const testUrl = url.searchParams.get('url');
        if (!testUrl) {
          return new Response(JSON.stringify({ error: 'URL parameter required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Define all patterns from our demonstration
        const patterns = [
          'https://shop.example.com/items/:id',
          'https://shop.example.com/items/(\\d+)',
          'https://shop.example.com/items/:id(\\d+)',
          'https://:subdomain.example.com/:path*',
          '/items/:id',
          '/items/:id/details',
          'https://shop.example.com/items/:id?*',
          '/api/v1/users/(\\w+)',
          '/api/v1/users/:id',
          '/files/*/:name.:ext',
          '/blog/:year(\\d{4})/:month(\\d{2})',
          '/items/(\\d+)',
          '/:category/:id',
          '/:category/:id/:slug',
          '/(items|products)/:id'
        ];

        const results: PatternResult[] = [];
        let matchCount = 0;
        let regexCount = 0;

        // Test each pattern
        patterns.forEach((pattern, index) => {
          try {
            const urlPattern = new URLPattern(pattern, 'https://shop.example.com');
            const match = urlPattern.exec(testUrl);
            
            const result: PatternResult = {
              index,
              pattern: pattern.replace(/\\\\/g, '\\'),
              matches: !!match,
              groups: match ? Object.keys(match.pathname.groups).join(',') : '',
              hasRegExpGroups: urlPattern.hasRegExpGroups,
              extracted: match ? match.pathname.groups : {}
            };
            
            results.push(result);
            
            if (match) matchCount++;
            if (urlPattern.hasRegExpGroups) regexCount++;
          } catch (e) {
            console.warn('Error testing pattern:', pattern, e);
          }
        });

        const successRate = Math.round((matchCount / results.length) * 100);

        // Determine risk level
        const suspiciousPatterns = ['/track/', '/token/', '/key/', '/secret/'];
        const isSuspicious = suspiciousPatterns.some(pattern => testUrl.includes(pattern));
        const isAdmin = testUrl.includes('admin') || testUrl.includes('root');
        
        let riskLevel = 'LOW';
        if (isSuspicious) riskLevel = 'HIGH';
        else if (isAdmin) riskLevel = 'MEDIUM';

        const response = {
          url: testUrl,
          totalPatterns: results.length,
          matches: matchCount,
          regexPatterns: regexCount,
          successRate,
          riskLevel,
          results: results.filter(r => r.matches),
          allResults: results
        };

        return new Response(JSON.stringify(response, null, 2), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 404 for other routes
    return new Response('Not Found', { status: 404 });
  },
  port: PORT,
  hostname: HOST,
  development: process.env.NODE_ENV !== 'production'
});

console.log(`✅ Server started successfully!`);
console.log(`🎯 Open your browser and navigate to: http://${HOST}:${PORT}`);
console.log(`📊 Interactive URLPattern testing is now available!`);
console.log(`🛡️ Test fraud detection patterns and security analysis!`);
