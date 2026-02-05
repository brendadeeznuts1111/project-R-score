#!/usr/bin/env bun

import { serve } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { mainWorkerInstance } from './src/main-worker'; // Import the main worker instance

const PORT = 8790; // Changed port to avoid conflict
const DASHBOARD_PATH = join(import.meta.dir, 'src', 'dashboard.html');

console.log(`🚀 Starting Fire22 Dashboard Server on port ${PORT}`);
console.log(`📁 Dashboard file: ${DASHBOARD_PATH}`);

// Initialize the main worker
mainWorkerInstance
  .initialize()
  .then(() => {
    console.log('MainWorker initialized successfully.');

    serve({
      port: PORT,
      fetch(req) {
        const url = new URL(req.url);

        // Route API requests through the main worker
        if (url.pathname.startsWith('/api')) {
          return mainWorkerInstance.processRequest(req);
        }

        // Helper function to determine content type
        const getContentType = filePath => {
          const ext = filePath.split('.').pop();
          switch (ext) {
            case 'html':
              return 'text/html';
            case 'css':
              return 'text/css';
            case 'js':
              return 'application/javascript';
            case 'json':
              return 'application/json';
            case 'png':
              return 'image/png';
            case 'jpg':
              return 'image/jpeg';
            case 'jpeg':
              return 'image/jpeg';
            case 'gif':
              return 'image/gif';
            case 'svg':
              return 'image/svg+xml';
            case 'ico':
              return 'image/x-icon';
            case 'webmanifest':
              return 'application/manifest+json';
            default:
              return 'application/octet-stream';
          }
        };

        // Serve main dashboard HTML
        if (url.pathname === '/' || url.pathname === '/dashboard') {
          try {
            const dashboardHtml = readFileSync(DASHBOARD_PATH, 'utf-8');
            return new Response(dashboardHtml, {
              headers: { 'Content-Type': 'text/html' },
            });
          } catch (error) {
            console.error('Error reading dashboard:', error);
            return new Response('Dashboard not found', { status: 404 });
          }
        }

        // Serve static files from 'dist' directory (e.g., CSS)
        if (url.pathname.startsWith('/dist/')) {
          const filePath = join(import.meta.dir, '..', url.pathname); // Go up one directory to find dist
          if (existsSync(filePath)) {
            try {
              const fileContent = readFileSync(filePath); // Read as buffer for non-text files
              return new Response(fileContent, {
                headers: { 'Content-Type': getContentType(filePath) },
              });
            } catch (error) {
              console.error(`Error reading static file ${filePath}:`, error);
              return new Response('Internal Server Error', { status: 500 });
            }
          } else {
            return new Response('Not Found', { status: 404 });
          }
        }

        // Serve static files from 'assets' directory (e.g., images, favicons)
        if (url.pathname.startsWith('/assets/')) {
          const filePath = join(import.meta.dir, url.pathname);
          if (existsSync(filePath)) {
            try {
              const fileContent = readFileSync(filePath); // Read as buffer for non-text files
              return new Response(fileContent, {
                headers: { 'Content-Type': getContentType(filePath) },
              });
            } catch (error) {
              console.error(`Error reading static file ${filePath}:`, error);
              return new Response('Internal Server Error', { status: 500 });
            }
          } else {
            return new Response('Not Found', { status: 404 });
          }
        }

        // Serve static HTML files from the 'docs' directory
        if (url.pathname.startsWith('/docs/') && url.pathname.endsWith('.html')) {
          const filePath = join(import.meta.dir, url.pathname);
          if (existsSync(filePath)) {
            try {
              const fileContent = readFileSync(filePath, 'utf-8');
              return new Response(fileContent, {
                headers: { 'Content-Type': 'text/html' },
              });
            } catch (error) {
              console.error(`Error reading static file ${filePath}:`, error);
              return new Response('Internal Server Error', { status: 500 });
            }
          } else {
            return new Response('Not Found', { status: 404 });
          }
        }

        return new Response('Not Found', { status: 404 });
      },
    });

    console.log(`✅ Dashboard server running at http://localhost:${PORT}`);
    console.log(`🔗 Dashboard URL: http://localhost:${PORT}/dashboard`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  })
  .catch(error => {
    console.error('Failed to initialize MainWorker:', error);
    process.exit(1); // Exit if main worker fails to initialize
  });
