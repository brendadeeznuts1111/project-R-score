// lib/official-markdown-options.ts
// Implementation of all official Bun.markdown.html() options

export interface HTMLOptions {
  // GFM Extensions (default: true)
  tables?: boolean;           // GFM tables
  strikethrough?: boolean;    // GFM strikethrough  
  tasklists?: boolean;        // GFM task lists
  
  // Link processing
  autolinks?: boolean | {     // Autolink URLs, emails, and www links
    url?: boolean;
    www?: boolean;
    email?: boolean;
  };
  
  // Heading features
  headings?: boolean | {      // Heading IDs and autolinks
    ids?: boolean;
    autolink?: boolean;
  };
  
  // Extended features
  wikiLinks?: boolean;        // [[wiki links]]
  underline?: boolean;        // __text__ -> <u>text</u>
  latexMath?: boolean;        // $inline$ and $$display$$ math
  
  // Parsing behavior
  hardSoftBreaks?: boolean;   // Line break handling
  collapseWhitespace?: boolean;
  permissiveAtxHeaders?: boolean;
  
  // HTML filtering
  noIndentedCodeBlocks?: boolean;
  noHtmlBlocks?: boolean;
  noHtmlSpans?: boolean;
  tagFilter?: boolean;        // GFM tag filter for disallowed HTML tags
}

export class OfficialMarkdownRenderer {
  private defaultOptions: HTMLOptions = {
    tables: true,
    strikethrough: true,
    tasklists: true,
    autolinks: true,
    headings: { ids: true, autolink: false },
    wikiLinks: false,
    underline: false,
    latexMath: false,
    hardSoftBreaks: false,
    collapseWhitespace: false,
    permissiveAtxHeaders: false,
    noIndentedCodeBlocks: false,
    noHtmlBlocks: false,
    noHtmlSpans: false,
    tagFilter: true
  };

  renderHTML(markdown: string, options: HTMLOptions = {}): string {
    const opts = { ...this.defaultOptions, ...options };
    
    return Bun.markdown.html(markdown, opts);
  }

  // Demo all options
  demoAllOptions(): string {
    const markdown = `# Official Bun.markdown.html() Options Demo

## GFM Extensions

### Tables (enabled: ${this.defaultOptions.tables})
| Feature | Status | Notes |
|---------|--------|-------|
| Tables | ✅ | GitHub Flavored |
| Strikethrough | ~~Enabled~~ | ~~Like this~~ |
| Task Lists | - [x] Working | - [ ] Pending |

### Strikethrough (enabled: ${this.defaultOptions.strikethrough})
This text is ~~crossed out~~ but this is not.

### Task Lists (enabled: ${this.defaultOptions.tasklists})
- [x] Completed task
- [ ] Pending task
- [x] Task with **bold** text

## Link Processing

### Autolinks (enabled: ${this.defaultOptions.autolinks})
Visit https://bun.sh/docs or www.example.com or email@example.com

## Heading Features

### Heading IDs (enabled: ${this.defaultOptions.headings})
This should generate an ID: ## Auto-generated ID

## Extended Features

### Wiki Links (enabled: ${this.defaultOptions.wikiLinks})
This is a [[wiki link]] syntax.

### Underline (enabled: ${this.defaultOptions.underline})
This text should be __underlined__.

### LaTeX Math (enabled: ${this.defaultOptions.latexMath})
Inline math: $x = y + z$
Display math: $$\\int_0^\\infty e^{-x} dx = 1$$

## Content Examples

### Autolink Test
URL: https://github.com/oven-sh/bun
WWW: www.bun.sh
Email: hello@bun.sh

### Mixed Features
- [x] ~~Completed~~ task with **bold** and __underline__
- [ ] Task with $inline math$ and [[wiki link]]
- [ ] Task with www.autolink.com

### Complex Table
| Option | Type | Default | Example |
|--------|------|---------|---------|
| tables | boolean | true | | Header | Cell |
| autolinks | object | true | { url: true } |
| headings | object | { ids: true } | { autolink: true } |
| wikiLinks | boolean | false | [[Page]] |

---

*Generated with all official Bun.markdown.html() options*`;

    return this.renderHTML(markdown, this.defaultOptions);
  }

  // Test specific option combinations
  testOptionCombination(name: string, options: HTMLOptions): string {
    const testMarkdown = `# ${name}

## Features Tested
- Tables: ${options.tables ? '✅' : '❌'}
- Strikethrough: ${options.strikethrough ? '~~enabled~~' : 'disabled'}
- Task Lists: ${options.tasklists ? '- [x] Working' : '- Regular list'}
- Autolinks: ${options.autolinks ? 'https://bun.sh' : 'no autolink'}
- Wiki Links: ${options.wikiLinks ? '[[wiki]]' : 'no wiki'}
- Underline: ${options.underline ? '__underlined__' : 'no underline'}

## Sample Table
| Feature | Status |
|---------|--------|
| Test | ~~Strikethrough~~ |

## Sample Links
Visit https://bun.sh or www.example.com`;

    return this.renderHTML(testMarkdown, options);
  }

  // Generate comparison of different option settings
  generateComparison(): string {
    const combinations = [
      { name: 'Default (All GFM)', options: this.defaultOptions },
      { 
        name: 'Minimal', 
        options: { 
          tables: false, 
          strikethrough: false, 
          tasklists: false, 
          autolinks: false,
          headings: false,
          wikiLinks: false,
          underline: false,
          latexMath: false,
          tagFilter: false
        } 
      },
      { 
        name: 'GFM Only', 
        options: { 
          tables: true, 
          strikethrough: true, 
          tasklists: true, 
          autolinks: true,
          headings: { ids: true },
          wikiLinks: false,
          underline: false,
          latexMath: false,
          tagFilter: true
        } 
      },
      { 
        name: 'Extended Features', 
        options: { 
          tables: true, 
          strikethrough: true, 
          tasklists: true, 
          autolinks: true,
          headings: { ids: true, autolink: true },
          wikiLinks: true,
          underline: true,
          latexMath: true,
          tagFilter: true
        } 
      }
    ];

    let comparison = '# Bun.markdown.html() Options Comparison\n\n';
    
    combinations.forEach(({ name, options }) => {
      comparison += `## ${name}\n\n`;
      comparison += this.testOptionCombination(name, options);
      comparison += '\n---\n\n';
    });

    return comparison;
  }
}

// CLI interface
if (import.meta.main) {
  const renderer = new OfficialMarkdownRenderer();
  const command = process.argv[2] || 'demo';
  
  switch (command) {
    case 'demo':
      console.log(renderer.demoAllOptions());
      break;
    case 'compare':
      console.log(renderer.generateComparison());
      break;
    case 'minimal':
      console.log(renderer.testOptionCombination('Minimal Options', {
        tables: false,
        strikethrough: false,
        tasklists: false,
        autolinks: false,
        headings: false
      }));
      break;
    case 'gfm':
      console.log(renderer.testOptionCombination('GFM Only', {
        tables: true,
        strikethrough: true,
        tasklists: true,
        autolinks: true,
        headings: { ids: true }
      }));
      break;
    case 'extended':
      console.log(renderer.testOptionCombination('Extended Features', {
        tables: true,
        strikethrough: true,
        tasklists: true,
        autolinks: true,
        headings: { ids: true, autolink: true },
        wikiLinks: true,
        underline: true,
        latexMath: true
      }));
      break;
    default:
      console.log('Usage: bun run lib/official-markdown-options.ts [demo|compare|minimal|gfm|extended]');
      process.exit(1);
  }
}
