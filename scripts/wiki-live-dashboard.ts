#!/usr/bin/env bun

/**
 * Wiki v3.19 - Live Dashboard with HMR Preview
 * 
 * Live wiki editor in native dashboard (Bun.markdown.react HMR + reactFastRefresh)
 * Multi-lang wiki support with JSONC i18n and real-time preview
 */

import { aiWikiSection, generateAIWiki } from './ai-wiki-gen';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Multi-lang JSONC i18n structure
interface WikiI18n {
  [lang: string]: {
    title: string;
    sections: Record<string, string>;
    metadata: {
      lastUpdated: string;
      version: string;
      author: string;
    };
  };
}

// Load i18n configuration
async function loadWikiI18n(): Promise<WikiI18n> {
  try {
    const file = await Bun.file('wiki-i18n.jsonc');
    const arrayBuffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(arrayBuffer);
    return (globalThis as any).Bun.JSONC.parse(content);
  } catch (error) {
    // Fallback to default i18n
    return {
      en: {
        title: "AI Wiki v3.19",
        sections: {},
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: "v3.19.0",
          author: "AI Generator"
        }
      },
      es: {
        title: "Wiki IA v3.19",
        sections: {},
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: "v3.19.0",
          author: "Generador IA"
        }
      },
      fr: {
        title: "Wiki IA v3.19",
        sections: {},
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: "v3.19.0",
          author: "Générateur IA"
        }
      }
    };
  }
}

// Live Wiki Dashboard Server
const server = (globalThis as any).Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // /wiki-live → AI Gen + React Editor (HMR!)
    if (url.pathname === '/wiki-live') {
      const prompt = url.searchParams.get('prompt') || 'changelog section';
      const format = url.searchParams.get('format') || 'react';
      const lang = url.searchParams.get('lang') || 'en';
      const hmr = url.searchParams.get('hmr') !== 'false';
      
      try {
        console.log(`🔥 Live Wiki Request: prompt="${prompt}" format="${format}" lang="${lang}"`);
        const startTime = performance.now();
        
        // Generate AI wiki section
        const wikiSection = await aiWikiSection(prompt);
        
        // Add i18n context
        const i18n = await loadWikiI18n();
        const localizedContent = `${i18n[lang]?.title || 'AI Wiki'}\n\n${wikiSection}`;
        
        let renderTime = performance.now() - startTime;
        let content: string;
        let contentType: string;
        
        switch (format) {
          case 'react':
            // Use Bun.markdown.react with HMR support
            const reactEl = (globalThis as any).Bun.markdown.react(localizedContent, {}, { 
              reactFastRefresh: hmr 
            });
            
            // Simple React render (in production, you'd use a proper renderer)
            content = `
<!DOCTYPE html>
<html>
<head>
  <title>Wiki Live Preview - React</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${hmr ? '<script src="http://localhost:3001/hmr.js"></script>' : ''}
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    .preview { border: 2px solid #e3e3e3; border-radius: 8px; padding: 20px; }
    .meta { background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
    .hmr-status { color: #22c55e; font-weight: bold; }
  </style>
</head>
<body>
  <div class="meta">
    <strong>🔥 Live Wiki Preview</strong><br>
    Prompt: ${prompt} | Language: ${lang} | Format: React<br>
    ${hmr ? '<span class="hmr-status">✅ HMR Enabled</span>' : 'HMR Disabled'}<br>
    Render Time: ${renderTime.toFixed(2)}ms
  </div>
  <div class="preview" id="root"></div>
  <script type="text/babel">
    const markdownContent = \`${localizedContent.replace(/`/g, '\\`')}\`;
    
    // Simple markdown to React parser (in production, use a proper library)
    const parseMarkdown = (md) => {
      const lines = md.split('\\n');
      const elements = [];
      
      lines.forEach((line, index) => {
        if (line.startsWith('# ')) {
          elements.push(React.createElement('h1', { key: index }, line.substring(2)));
        } else if (line.startsWith('## ')) {
          elements.push(React.createElement('h2', { key: index }, line.substring(3)));
        } else if (line.startsWith('### ')) {
          elements.push(React.createElement('h3', { key: index }, line.substring(4)));
        } else if (line.startsWith('- ')) {
          elements.push(React.createElement('li', { key: index }, line.substring(2)));
        } else if (line.trim() === '') {
          elements.push(React.createElement('br', { key: index }));
        } else if (line.includes('|')) {
          // Simple table parsing
          const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
          elements.push(React.createElement('div', { key: index }, 
            React.createElement('table', { style: { border: '1px solid #ccc', width: '100%' } },
              React.createElement('tr', {}, 
                cells.map((cell, i) => React.createElement('td', { 
                  key: i, 
                  style: { border: '1px solid #ccc', padding: '8px' } 
                }, cell))
              )
            )
          ));
        } else {
          elements.push(React.createElement('p', { key: index }, line));
        }
      });
      
      return elements;
    };
    
    const App = () => {
      const [content, setContent] = React.useState(parseMarkdown(markdownContent));
      
      React.useEffect(() => {
        if (window.HMR) {
          window.HMR.onUpdate((newContent) => {
            setContent(parseMarkdown(newContent));
          });
        }
      }, []);
      
      return React.createElement('div', {}, ...content);
    };
    
    ReactDOM.render(React.createElement(App), document.getElementById('root'));
  </script>
</body>
</html>`;
            contentType = 'text/html';
            break;
            
          case 'html':
            // Use Bun.markdown.html
            content = (globalThis as any).Bun.markdown.html(localizedContent);
            contentType = 'text/html';
            break;
            
          case 'ansi':
            // Use Bun.markdown.ansi for terminal output
            content = (globalThis as any).Bun.markdown.ansi(localizedContent);
            contentType = 'text/plain';
            break;
            
          default:
            content = localizedContent;
            contentType = 'text/plain';
        }
        
        renderTime = performance.now() - startTime;
        
        return new Response(content, { 
          headers: { 
            'Content-Type': contentType,
            'X-Render-Time': renderTime.toFixed(2),
            'X-HMR-Enabled': hmr.toString(),
            'X-Language': lang,
            ...corsHeaders
          } 
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          prompt,
          format,
          lang
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }
    
    // POST /wiki-live → Submit markdown for preview
    if (url.pathname === '/wiki-live' && req.method === 'POST') {
      try {
        const body = await req.text();
        const { prompt, format = 'react', lang = 'en', hmr = true } = JSON.parse(body);
        
        // Generate and render
        const wikiSection = await aiWikiSection(prompt);
        const i18n = await loadWikiI18n();
        const localizedContent = `${i18n[lang]?.title || 'AI Wiki'}\n\n${wikiSection}`;
        
        let content: string;
        switch (format) {
          case 'html':
            content = (globalThis as any).Bun.markdown.html(localizedContent);
            break;
          case 'ansi':
            content = (globalThis as any).Bun.markdown.ansi(localizedContent);
            break;
          default:
            content = localizedContent;
        }
        
        return new Response(JSON.stringify({
          content,
          prompt,
          format,
          lang,
          hmr,
          timestamp: new Date().toISOString()
        }), { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }
    
    // /wiki-i18n → Get i18n configuration
    if (url.pathname === '/wiki-i18n') {
      const i18n = await loadWikiI18n();
      return new Response(JSON.stringify(i18n, null, 2), { 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // /wiki-gen → Generate full wiki
    if (url.pathname === '/wiki-gen') {
      const sections = url.searchParams.getAll('section');
      if (sections.length === 0) {
        sections.push('changelog section', 'config hierarchy', 'performance benchmarks');
      }
      
      try {
        const wiki = await generateAIWiki(sections);
        return new Response(wiki, { 
          headers: { 'Content-Type': 'text/markdown', ...corsHeaders }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }
    
    // Root → Dashboard interface
    if (url.pathname === '/') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Wiki v3.19 - AI Live Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .control-group { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .preview { border: 2px solid #e3e3e3; border-radius: 8px; padding: 20px; min-height: 400px; }
    .button { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
    .button:hover { background: #005a9e; }
    .select, .input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .status { background: #e8f5e8; padding: 10px; border-radius: 4px; margin: 10px 0; }
    .demo-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 Wiki v3.19 - AI Live Dashboard</h1>
    <p>AI-powered wiki generation with live HMR preview and multi-language support</p>
  </div>
  
  <div class="controls">
    <div class="control-group">
      <h3>🔥 Live Preview</h3>
      <div class="status" id="status">Ready for AI generation...</div>
      
      <label>Prompt:</label>
      <input type="text" id="prompt" class="input" value="changelog section" placeholder="Enter wiki section prompt">
      
      <label>Format:</label>
      <select id="format" class="select">
        <option value="react">React (HMR)</option>
        <option value="html">HTML</option>
        <option value="ansi">ANSI Terminal</option>
      </select>
      
      <label>Language:</label>
      <select id="lang" class="select">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
      
      <label>
        <input type="checkbox" id="hmr" checked> Enable HMR
      </label>
      
      <button class="button" onclick="generatePreview()">🚀 Generate Preview</button>
    </div>
    
    <div class="control-group">
      <h3>⚡ Quick Actions</h3>
      <div class="demo-buttons">
        <button class="button" onclick="quickGen('changelog section')">📋 Changelog</button>
        <button class="button" onclick="quickGen('config hierarchy')">⚙️ Config</button>
        <button class="button" onclick="quickGen('performance benchmarks')">📊 Benchmarks</button>
        <button class="button" onclick="quickGen('api documentation')">📚 API Docs</button>
        <button class="button" onclick="quickGen('one-liners cheatsheet')">⚡ One-Liners</button>
      </div>
      
      <h4>🌐 Multi-Lang Wiki</h4>
      <button class="button" onclick="loadI18n()">Load i18n Config</button>
      <pre id="i18n-output" style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;"></pre>
    </div>
  </div>
  
  <div class="preview" id="preview">
    <p>🔥 AI-generated wiki preview will appear here...</p>
    <p>Try one of the quick actions or enter a custom prompt above!</p>
  </div>
  
  <script>
    async function generatePreview() {
      const prompt = document.getElementById('prompt').value;
      const format = document.getElementById('format').value;
      const lang = document.getElementById('lang').value;
      const hmr = document.getElementById('hmr').checked;
      
      document.getElementById('status').textContent = '🤖 Generating AI wiki...';
      
      try {
        const response = await fetch(\`/wiki-live?prompt=\${encodeURIComponent(prompt)}&format=\${format}&lang=\${lang}&hmr=\${hmr}\`);
        const content = await response.text();
        
        document.getElementById('preview').innerHTML = content;
        document.getElementById('status').innerHTML = \`✅ Generated in \${response.headers.get('X-Render-Time')}ms | HMR: \${response.headers.get('X-HMR-Enabled')}\`;
      } catch (error) {
        document.getElementById('status').textContent = '❌ Error: ' + error.message;
      }
    }
    
    async function quickGen(prompt) {
      document.getElementById('prompt').value = prompt;
      await generatePreview();
    }
    
    async function loadI18n() {
      try {
        const response = await fetch('/wiki-i18n');
        const i18n = await response.json();
        document.getElementById('i18n-output').textContent = JSON.stringify(i18n, null, 2);
      } catch (error) {
        document.getElementById('i18n-output').textContent = 'Error loading i18n: ' + error.message;
      }
    }
    
    // Auto-generate on load
    window.addEventListener('load', () => {
      generatePreview();
    });
  </script>
</body>
</html>`;
      return new Response(html, { 
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }
    
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
});

console.log(`🔥 Wiki v3.19 Live Dashboard running on http://localhost:${server.port}`);
console.log(`📱 Available endpoints:`);
console.log(`   GET / - Interactive dashboard`);
console.log(`   GET /wiki-live - Live preview (supports ?prompt=&format=&lang=&hmr=)`);
console.log(`   POST /wiki-live - Submit markdown for preview`);
console.log(`   GET /wiki-i18n - Multi-language configuration`);
console.log(`   GET /wiki-gen - Generate full wiki`);
console.log(``);
console.log(`🚀 AI Revolution Started! Visit http://localhost:${server.port}`);
