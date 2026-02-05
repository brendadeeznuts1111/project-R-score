/**
 * Enhanced Scope Formatter with Beautiful Output Formats
 * 
 * Enterprise-grade formatting with tree views, HTML export, syntax highlighting,
 * and professional output for different use cases.
 */

export class ScopeFormatter {
  /**
   * Format as beautiful ASCII tree with colors and metadata
   */
  static formatTree(obj: any, options: {
    depth?: number;
    colors?: boolean;
    showTypes?: boolean;
    showSizes?: boolean;
    compact?: boolean;
    showLineNumbers?: boolean;
  } = {}): string {
    const { 
      depth = 6, 
      colors = true, 
      showTypes = true, 
      showSizes = false,
      compact = false,
      showLineNumbers = false 
    } = options;
    
    const colorize = (text: string, type: string): string => {
      if (!colors) return text;
      
      const colorsMap: Record<string, string> = {
        key: '\x1b[36m',      // cyan
        string: '\x1b[32m',    // green
        number: '\x1b[33m',    // yellow
        boolean: '\x1b[35m',   // magenta
        null: '\x1b[90m',      // gray
        undefined: '\x1b[90m', // gray
        array: '\x1b[94m',     // bright blue
        object: '\x1b[96m',    // bright cyan
        type: '\x1b[90m',      // gray
        size: '\x1b[93m',      // bright yellow
        line: '\x1b[90m',      // gray
        reset: '\x1b[0m'
      };
      
      return `${colorsMap[type] || ''}${text}${colorsMap.reset}`;
    };

    const formatSize = (size: number): string => {
      if (!showSizes) return '';
      const units = ['B', 'KB', 'MB', 'GB'];
      let s = size;
      let unitIndex = 0;
      
      while (s >= 1024 && unitIndex < units.length - 1) {
        s /= 1024;
        unitIndex++;
      }
      
      return ` ${colorize(`(${s.toFixed(1)}${units[unitIndex]})`, 'size')}`;
    };

    const formatType = (value: any): string => {
      if (!showTypes) return '';
      
      let type = typeof value;
      if (value === null) type = 'null';
      else if (Array.isArray(value)) type = `array[${value.length}]`;
      else if (type === 'object') {
        const keys = Object.keys(value);
        type = `object{${keys.length}}`;
      }
      
      return ` ${colorize(`[${type}]`, 'type')}`;
    };

    const formatLineNumber = (line: number): string => {
      if (!showLineNumbers) return '';
      return `${colorize(line.toString().padStart(3, ' '), 'line')} `;
    };

    let lineNumber = 1;
    
    const buildTree = (node: any, prefix: string = '', depth: number = 0, path: string = '', isLast: boolean = true): string => {
      if (depth > options.depth!) return colorize('...', 'null');
      
      if (node === null || node === undefined) {
        const value = node === null ? 'null' : 'undefined';
        return `${formatLineNumber(lineNumber++)}${prefix}${isLast ? '└──' : '├──'} ${colorize(value, 'null')}${formatType(node)}\n`;
      }
      
      const nodeType = typeof node;
      
      if (nodeType !== 'object') {
        const value = nodeType === 'string' ? `"${node}"` : String(node);
        const size = showSizes ? Buffer.byteLength(String(node), 'utf8') : 0;
        return `${formatLineNumber(lineNumber++)}${prefix}${isLast ? '└──' : '├──'} ${colorize(value, nodeType)}${formatType(node)}${formatSize(size)}\n`;
      }
      
      if (Array.isArray(node)) {
        if (node.length === 0) {
          return `${formatLineNumber(lineNumber++)}${prefix}${isLast ? '└──' : '├──'} ${colorize('[]', 'array')}${formatType(node)}\n`;
        }
        
        let result = '';
        const maxItems = compact ? 3 : Math.min(node.length, 20);
        
        node.slice(0, maxItems).forEach((item, index) => {
          const isLastItem = index === maxItems - 1 || index === node.length - 1;
          const connector = isLastItem ? '└──' : '├──';
          const nextPrefix = prefix + (isLastItem ? '    ' : '│   ');
          const itemPath = `${path}[${index}]`;
          
          result += `${formatLineNumber(lineNumber++)}${prefix}${connector} ${colorize(`[${index}]`, 'array')}: `;
          result += buildTree(item, nextPrefix, depth + 1, itemPath, isLastItem);
        });
        
        if (node.length > maxItems) {
          result += `${formatLineNumber(lineNumber++)}${prefix}└── ${colorize(`... ${node.length - maxItems} more items`, 'type')}\n`;
        }
        
        return result;
      }
      
      // Object
      const keys = Object.keys(node);
      if (keys.length === 0) {
        return `${formatLineNumber(lineNumber++)}${prefix}${isLast ? '└──' : '├──'} ${colorize('{}', 'object')}${formatType(node)}\n`;
      }
      
      let result = '';
      const sortedKeys = compact ? keys.slice(0, 5) : keys.sort();
      
      sortedKeys.forEach((key, index) => {
        const isLastKey = index === sortedKeys.length - 1;
        const connector = isLastKey ? '└──' : '├──';
        const nextPrefix = prefix + (isLastKey ? '    ' : '│   ');
        const value = node[key];
        const keyPath = path ? `${path}.${key}` : key;
        
        result += `${formatLineNumber(lineNumber++)}${prefix}${connector} ${colorize(key, 'key')}: `;
        result += buildTree(value, nextPrefix, depth + 1, keyPath, isLastKey);
      });
      
      if (!compact && keys.length > sortedKeys.length) {
        result += `${formatLineNumber(lineNumber++)}${prefix}└── ${colorize(`... ${keys.length - sortedKeys.length} more keys`, 'type')}\n`;
      }
      
      return result;
    };

    const tree = buildTree(obj, '', 0, '', true);
    
    return tree.trim();
  }

  /**
   * Format as professional HTML with syntax highlighting and interactivity
   */
  static formatHTML(obj: any, options: {
    title?: string;
    theme?: 'light' | 'dark' | 'auto';
    collapsible?: boolean;
    searchable?: boolean;
    exportable?: boolean;
  } = {}): string {
    const { 
      title = 'FactoryWager Scope Inspector',
      theme = 'auto',
      collapsible = true,
      searchable = true,
      exportable = true 
    } = {};
    
    const escapeHTML = (str: string): string => {
      return str.replace(/[&<>"']/g, 
        tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[tag] || tag)
      );
    };

    const formatValue = (value: any): string => {
      if (value === null) return '<span class="null">null</span>';
      if (value === undefined) return '<span class="undefined">undefined</span>';
      
      const type = typeof value;
      
      if (type === 'string') {
        return `<span class="string">"${escapeHTML(value)}"</span>`;
      }
      
      if (type === 'number') {
        return `<span class="number">${value}</span>`;
      }
      
      if (type === 'boolean') {
        return `<span class="boolean">${value}</span>`;
      }
      
      return escapeHTML(String(value));
    };

    let nodeCounter = 0;
    
    const buildHTML = (node: any, path: string = '', depth: number = 0): string => {
      nodeCounter++;
      const nodeId = `node-${nodeCounter}`;
      
      if (node === null || node === undefined) {
        return `<div class="primitive" data-path="${escapeHTML(path)}">${formatValue(node)}</div>`;
      }
      
      const nodeType = typeof node;
      
      if (nodeType !== 'object') {
        return `<div class="primitive" data-path="${escapeHTML(path)}">${formatValue(node)}</div>`;
      }
      
      if (Array.isArray(node)) {
        if (node.length === 0) {
          return `<div class="array empty" data-path="${escapeHTML(path)}"><span class="bracket">[</span><span class="empty">empty array</span><span class="bracket">]</span></div>`;
        }
        
        let items = '';
        node.slice(0, 50).forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          items += `<li class="array-item" data-index="${index}">
            <span class="index">${index}:</span>
            ${buildHTML(item, itemPath, depth + 1)}
          </li>`;
        });
        
        if (node.length > 50) {
          items += `<li class="more-items">... ${node.length - 50} more items</li>`;
        }
        
        const header = collapsible ? 
          `<div class="toggle" data-target="${nodeId}">
            <span class="bracket">[</span>
            <span class="length">${node.length}</span>
            <span class="bracket">]</span>
            <span class="type">array</span>
          </div>` : 
          `<div class="header">
            <span class="bracket">[</span>
            <span class="length">${node.length}</span>
            <span class="bracket">]</span>
            <span class="type">array</span>
          </div>`;
        
        return `<div class="array" data-path="${escapeHTML(path)}" id="${nodeId}">
          ${header}
          <ul class="children" ${collapsible ? 'style="display:none"' : ''}>
            ${items}
          </ul>
        </div>`;
      }
      
      // Object
      const keys = Object.keys(node);
      if (keys.length === 0) {
        return `<div class="object empty" data-path="${escapeHTML(path)}"><span class="bracket">{</span><span class="empty">empty object</span><span class="bracket">}</span></div>`;
      }
      
      let items = '';
      const sortedKeys = keys.sort();
      
      sortedKeys.slice(0, 100).forEach(key => {
        const keyPath = path ? `${path}.${key}` : key;
        items += `<li class="object-item" data-key="${escapeHTML(key)}">
          <span class="key">${escapeHTML(key)}:</span>
          ${buildHTML(node[key], keyPath, depth + 1)}
        </li>`;
      });
      
      if (keys.length > 100) {
        items += `<li class="more-items">... ${keys.length - 100} more keys</li>`;
      }
      
      const header = collapsible ? 
        `<div class="toggle" data-target="${nodeId}">
          <span class="bracket">{</span>
          <span class="length">${keys.length}</span>
          <span class="bracket">}</span>
          <span class="type">object</span>
        </div>` : 
        `<div class="header">
          <span class="bracket">{</span>
          <span class="length">${keys.length}</span>
          <span class="bracket">}</span>
          <span class="type">object</span>
        </div>`;
      
      return `<div class="object" data-path="${escapeHTML(path)}" id="${nodeId}">
        ${header}
        <ul class="children" ${collapsible ? 'style="display:none"' : ''}>
          ${items}
        </ul>
      </div>`;
    };

    const themeCSS = theme === 'dark' ? `
      :root { --bg: #3b82f6; --text: #3b82f6; --border: #333; --hover: #3b82f6; }
    ` : theme === 'light' ? `
      :root { --bg: #3b82f6; --text: #3b82f6; --border: #ddd; --hover: #3b82f6; }
    ` : `
      @media (prefers-color-scheme: dark) {
        :root { --bg: #3b82f6; --text: #3b82f6; --border: #333; --hover: #3b82f6; }
      }
      @media (prefers-color-scheme: light) {
        :root { --bg: #3b82f6; --text: #3b82f6; --border: #ddd; --hover: #3b82f6; }
      }
    `;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    ${themeCSS}
    
    * { box-sizing: border-box; }
    
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 6px 12px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    
    .btn:hover {
      background: var(--hover);
    }
    
    .search {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      border-radius: 4px;
      font-family: inherit;
      font-size: 12px;
    }
    
    .content {
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    
    .null { color: #888; }
    .undefined { color: #888; }
    .string { color: #690; }
    .number { color: #905; }
    .boolean { color: #00f; }
    .key { color: #07a; font-weight: bold; }
    .index { color: #999; margin-right: 8px; }
    .type { color: #999; font-size: 0.9em; margin-left: 8px; }
    .bracket { color: #999; }
    .length { color: #999; margin: 0 4px; }
    .empty { color: #999; font-style: italic; }
    
    .array, .object {
      margin: 0;
      padding: 0;
    }
    
    .toggle {
      cursor: pointer;
      padding: 4px 8px;
      background: var(--hover);
      border-bottom: 1px solid var(--border);
      user-select: none;
    }
    
    .toggle:hover {
      background: var(--hover);
      opacity: 0.8;
    }
    
    .children {
      list-style: none;
      margin: 0;
      padding: 0;
      background: var(--bg);
    }
    
    .array-item, .object-item {
      border-left: 1px dashed var(--border);
      margin-left: 20px;
      padding: 2px 0 2px 8px;
    }
    
    .array-item:hover, .object-item:hover {
      background: var(--hover);
    }
    
    .more-items {
      color: #999;
      font-style: italic;
      padding: 4px 8px;
      border-left: 1px dashed var(--border);
      margin-left: 20px;
    }
    
    .highlight {
      background: yellow !important;
      color: black !important;
    }
    
    .stats {
      margin-top: 20px;
      padding: 10px;
      background: var(--hover);
      border-radius: 4px;
      font-size: 12px;
    }
    
    @media print {
      .controls, .stats { display: none; }
      .toggle { background: none !important; }
      .children { display: block !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 ${escapeHTML(title)}</h1>
      <div class="stats" id="stats">
        Loading statistics...
      </div>
    </div>
    
    ${searchable ? `
    <div class="controls">
      <input type="text" class="search" id="search" placeholder="Search in data...">
      <button class="btn" onclick="expandAll()">Expand All</button>
      <button class="btn" onclick="collapseAll()">Collapse All</button>
      ${exportable ? '<button class="btn" onclick="exportData()">Export JSON</button>' : ''}
      <button class="btn" onclick="printView()">Print</button>
    </div>
    ` : ''}
    
    <div class="content">
      ${buildHTML(obj)}
    </div>
  </div>
  
  <script>
    // Toggle functionality
    document.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', function() {
        const target = document.getElementById(this.dataset.target);
        const children = target.querySelector('.children');
        if (children.style.display === 'none') {
          children.style.display = 'block';
        } else {
          children.style.display = 'none';
        }
      });
    });
    
    // Search functionality
    ${searchable ? `
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const allElements = document.querySelectorAll('.array-item, .object-item, .primitive');
      
      // Remove previous highlights
      document.querySelectorAll('.highlight').forEach(el => {
        el.classList.remove('highlight');
      });
      
      if (query.length < 2) return;
      
      allElements.forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes(query)) {
          el.classList.add('highlight');
          // Expand parent nodes
          let parent = el.closest('.children');
          while (parent) {
            parent.style.display = 'block';
            const toggle = parent.previousElementSibling;
            if (toggle && toggle.classList.contains('toggle')) {
              toggle.classList.add('highlight');
            }
            parent = parent.parentElement?.closest('.children');
          }
        }
      });
    });
    
    function expandAll() {
      document.querySelectorAll('.children').forEach(el => {
        el.style.display = 'block';
      });
    }
    
    function collapseAll() {
      document.querySelectorAll('.children').forEach(el => {
        el.style.display = 'none';
      });
    }
    
    ${exportable ? `
    function exportData() {
      const data = ${JSON.stringify(obj, null, 2)};
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scope-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    ` : ''}
    
    function printView() {
      window.print();
    }
    ` : ''}
    
    // Statistics
    function updateStats() {
      const stats = {
        nodes: document.querySelectorAll('.array, .object, .primitive').length,
        arrays: document.querySelectorAll('.array').length,
        objects: document.querySelectorAll('.object').length,
        depth: calculateMaxDepth()
      };
      
      document.getElementById('stats').innerHTML = 
        '📊 Nodes: ' + stats.nodes + 
        ' | Arrays: ' + stats.arrays + 
        ' | Objects: ' + stats.objects + 
        ' | Max Depth: ' + stats.depth;
    }
    
    function calculateMaxDepth() {
      let maxDepth = 0;
      document.querySelectorAll('.array, .object').forEach(el => {
        const depth = (el.getAttribute('data-path') || '').split('.').length;
        maxDepth = Math.max(maxDepth, depth);
      });
      return maxDepth;
    }
    
    updateStats();
  </script>
</body>
</html>`;
  }

  /**
   * Format as Markdown documentation
   */
  static formatMarkdown(obj: any, options: {
    title?: string;
    includeTypes?: boolean;
    includeExamples?: boolean;
    maxDepth?: number;
  } = {}): string {
    const { 
      title = 'Scope Inspection Results',
      includeTypes = true,
      includeExamples = false,
      maxDepth = 5 
    } = {};
    
    let markdown = `# ${title}\n\n`;
    
    const formatValue = (value: any, depth: number = 0): string => {
      if (depth > maxDepth) return '...';
      
      if (value === null) return '`null`';
      if (value === undefined) return '`undefined`';
      
      const type = typeof value;
      
      if (type === 'string') {
        return `"${value}"${includeTypes ? ` *(string)*` : ''}`;
      }
      
      if (type === 'number') {
        return `${value}${includeTypes ? ` *(number)*` : ''}`;
      }
      
      if (type === 'boolean') {
        return `${value}${includeTypes ? ` *(boolean)*` : ''}`;
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '`[]`';
        
        let result = '[\n';
        value.slice(0, 5).forEach((item, i) => {
          result += `  ${i + 1}. ${formatValue(item, depth + 1)}\n`;
        });
        
        if (value.length > 5) {
          result += `  ... ${value.length - 5} more items\n`;
        }
        
        result += ']';
        return result;
      }
      
      // Object
      const keys = Object.keys(value);
      if (keys.length === 0) return '`{}`';
      
      let result = '{\n';
      keys.slice(0, 10).forEach(key => {
        result += `  \`${key}\`: ${formatValue(value[key], depth + 1)}\n`;
      });
      
      if (keys.length > 10) {
        result += `  ... ${keys.length - 10} more keys\n`;
      }
      
      result += '}';
      return result;
    };
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        markdown += `## Array (${obj.length} items)\n\n`;
        obj.slice(0, 10).forEach((item, i) => {
          markdown += `### Item ${i + 1}\n\n${formatValue(item)}\n\n`;
        });
        
        if (obj.length > 10) {
          markdown += `... and ${obj.length - 10} more items\n\n`;
        }
      } else {
        const keys = Object.keys(obj);
        markdown += `## Object (${keys.length} properties)\n\n`;
        
        keys.slice(0, 20).forEach(key => {
          markdown += `### \`${key}\`\n\n${formatValue(obj[key])}\n\n`;
        });
        
        if (keys.length > 20) {
          markdown += `... and ${keys.length - 20} more properties\n\n`;
        }
      }
    } else {
      markdown += `## Value\n\n${formatValue(obj)}\n\n`;
    }
    
    if (includeExamples) {
      markdown += `## Usage Examples\n\n`;
      markdown += `\`\`\`javascript\n// Access the data\nconst data = ${JSON.stringify(obj, null, 2)};\n\`\`\`\n\n`;
    }
    
    markdown += `---\n*Generated by FactoryWager Scope Inspector*`;
    
    return markdown;
  }

  /**
   * Format as CSV for data analysis
   */
  static formatCSV(obj: any, options: {
    flatten?: boolean;
    includePaths?: boolean;
    separator?: string;
  } = {}): string {
    const { 
      flatten = true, 
      includePaths = true, 
      separator = ',' 
    } = {};
    
    const rows: string[] = [];
    const headers = new Set<string>();
    
    const flattenObject = (obj: any, prefix: string = ''): Record<string, any> => {
      const flattened: Record<string, any> = {};
      
      if (obj === null || obj === undefined) {
        flattened[prefix || 'value'] = obj;
        return flattened;
      }
      
      if (typeof obj !== 'object') {
        flattened[prefix || 'value'] = obj;
        return flattened;
      }
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemData = flattenObject(item, prefix ? `${prefix}[${index}]` : `[${index}]`);
          Object.assign(flattened, itemData);
        });
        return flattened;
      }
      
      Object.keys(obj).forEach(key => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          const nested = flattenObject(value, newPrefix);
          Object.assign(flattened, nested);
        } else {
          flattened[newPrefix] = value;
        }
      });
      
      return flattened;
    };
    
    const flattened = flattenObject(obj);
    
    // Create headers
    if (includePaths) {
      headers.add('path');
    }
    Object.keys(flattened).forEach(key => headers.add(key));
    
    // Add header row
    const headerRow = Array.from(headers).join(separator);
    rows.push(headerRow);
    
    // Add data row
    const dataRow: string[] = [];
    
    if (includePaths) {
      dataRow.push('root');
    }
    
    headers.forEach(header => {
      if (header !== 'path') {
        const value = flattened[header];
        dataRow.push(value !== undefined ? String(value) : '');
      }
    });
    
    rows.push(dataRow.join(separator));
    
    return rows.join('\n');
  }

  /**
   * Format as YAML for configuration files
   */
  static formatYAML(obj: any, options: {
    indent?: number;
    sortKeys?: boolean;
  } = {}): string {
    const { indent = 2, sortKeys = true } = {};
    
    const formatValue = (value: any, currentIndent: number = 0): string => {
      const spaces = ' '.repeat(currentIndent);
      
      if (value === null) return 'null';
      if (value === undefined) return 'null';
      
      const type = typeof value;
      
      if (type === 'string') {
        // Check if string needs quotes
        if (value.includes('\n') || value.includes('"') || value.includes("'") || 
            value.includes(':') || value.includes('#') || value.includes('[') || 
            value.includes(']') || value.includes('{') || value.includes('}')) {
          return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
      }
      
      if (type === 'number' || type === 'boolean') {
        return String(value);
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        
        let result = '\n';
        value.forEach(item => {
          result += `${spaces}  - ${formatValue(item, currentIndent + indent + 2)}\n`;
        });
        return result.slice(0, -1); // Remove trailing newline
      }
      
      // Object
      const keys = sortKeys ? Object.keys(value).sort() : Object.keys(value);
      if (keys.length === 0) return '{}';
      
      let result = '\n';
      keys.forEach(key => {
        result += `${spaces}  ${key}: ${formatValue(value[key], currentIndent + indent + 2)}\n`;
      });
      return result.slice(0, -1); // Remove trailing newline
    };
    
    return formatValue(obj);
  }
}

export default ScopeFormatter;
