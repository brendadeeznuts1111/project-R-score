# Playwriter Skill for Kimi CLI

Browser automation via Playwright API using Chrome extension + CLI with R2 storage integration.

## Features

- 🎭 Control your browser via Playwright API
- 🌐 Uses your existing Chrome (with extensions, login state)
- 🏷️ Visual accessibility labels for AI interaction
- 🔧 Full Playwright API access
- 🔒 Local-only WebSocket server
- ☁️ **R2 Integration**: Store screenshots, snapshots, and artifacts in Cloudflare R2

## Installation

### Via bunx (Recommended)

```bash
# Install playwriter CLI
bunx @factorywager/playwriter-skill install

# Or directly
bun add -g playwriter
```

### Chrome Extension

1. Install from Chrome Web Store: [Playwriter Extension](https://chrome.google.com/webstore/detail/playwriter/...)
2. Click the extension icon on any tab (turns green when connected)

### R2 Storage Setup (Optional)

To store screenshots and artifacts in Cloudflare R2:

```bash
# Set environment variables
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key"
export R2_SECRET_ACCESS_KEY="your-secret-key"
```

Or create a `.env` file in your project root.

## Usage

### CLI

```bash
# Create new session
bunx @factorywager/playwriter-skill session new
# Output: Session ID (e.g., 1)

# Execute Playwright code
bunx @factorywager/playwriter-skill -s 1 -e "await page.goto('https://example.com')"

# Get page title
bunx @factorywager/playwriter-skill -s 1 -e "console.log(await page.title())"

# Screenshot with accessibility labels
bunx @factorywager/playwriter-skill -s 1 -e "await screenshotWithAccessibilityLabels({ page })"

# Click by accessibility reference
bunx @factorywager/playwriter-skill -s 1 -e "await page.locator('aria-ref=e5').click()"
```

### Kimi CLI Integration

Add to your agent:

```bash
npx -y skills add remorses/playwriter
```

Or use the MCP configuration in `mcp.json`.

## Available Variables

When executing code, these variables are available:

- `page` - Playwright Page instance
- `context` - Playwright BrowserContext
- `state` - Persistent state between calls
- `require` - Node.js require function

## Examples

### Navigate and Extract Data

```bash
bunx @factorywager/playwriter-skill -s 1 -e "
  await page.goto('https://news.ycombinator.com');
  const titles = await page.\$\$eval('.titleline > a', els => 
    els.map(e => e.textContent)
  );
  console.log(titles.slice(0, 5));
"
```

### R2 Storage Examples

Upload screenshots and artifacts directly to Cloudflare R2:

```bash
# Screenshot to R2 (requires R2_* env vars)
bunx @factorywager/playwriter-skill -s 1 -e "
  const r2 = new (await import('./r2-integration')).PlaywriterR2Integration({ sessionId: 1 });
  const buffer = await page.screenshot({ fullPage: true });
  const url = await r2.uploadScreenshot(buffer, {
    url: page.url(),
    timestamp: new Date().toISOString(),
    width: 1920,
    height: 1080,
    fullPage: true
  });
  console.log('Screenshot uploaded:', url);
"

# List artifacts in R2
bunx @factorywager/playwriter-skill -s 1 -e "
  const r2 = new (await import('./r2-integration')).PlaywriterR2Integration({ sessionId: 1 });
  const artifacts = await r2.listArtifacts();
  console.log(JSON.stringify(artifacts, null, 2));
"
```

### Form Interaction

```bash
bunx @factorywager/playwriter-skill -s 1 -e "
  await page.goto('https://example.com/login');
  await page.fill('input[name=\"username\"]', 'myuser');
  await page.fill('input[name=\"password\"]', 'mypass');
  await page.click('button[type=\"submit\"]');
"
```

### Network Interception

```bash
bunx @factorywager/playwriter-skill -s 1 -e "
  state.requests = [];
  page.on('response', r => {
    if (r.url().includes('/api/')) state.requests.push(r.url())
  });
  await page.goto('https://example.com');
  console.log(state.requests);
"
```

## Session Management

```bash
# List sessions
bunx @factorywager/playwriter-skill session list

# Reset session (if connection issues)
bunx @factorywager/playwriter-skill session reset 1

# Create new session
bunx @factorywager/playwriter-skill session new
```

## MCP Tools

When using as an MCP server, the following tools are available:

### Browser Tools
| Tool | Description |
|------|-------------|
| `browser_execute` | Execute Playwright code |
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click an element |
| `browser_fill` | Fill a form field |
| `browser_get_text` | Extract text content |
| `browser_screenshot` | Take screenshot |
| `browser_session_new` | Create new session |
| `browser_session_list` | List sessions |

### R2 Storage Tools (requires R2_* env vars)
| Tool | Description |
|------|-------------|
| `browser_screenshot_r2` | Screenshot → R2 |
| `browser_snapshot_r2` | Accessibility snapshot → R2 |
| `browser_list_artifacts` | List R2 artifacts |

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐     ┌─────────┐
│   Chrome    │ ◄─────────────────► │  CLI/Agent   │────►│    R2   │
│  Extension  │    localhost:19988  │              │     │ Storage │
└──────┬──────┘                     └──────────────┘     └─────────┘
       │
       └─► chrome.debugger API
```

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Chrome    │ ◄─────────────────► │  CLI/Agent   │
│  Extension  │    localhost:19988  │              │
└──────┬──────┘                     └──────────────┘
       │
       └─► chrome.debugger API
```

## Security

- ✅ Local only: WebSocket server on `localhost:19988`
- ✅ Explicit consent: Only tabs where you clicked the extension
- ✅ Visible automation: Chrome shows automation banner
- ✅ Origin validation: Only verified extension IDs

## Links

- GitHub: https://github.com/remorses/playwriter
- Original Project: https://github.com/remorses/playwriter

## License

MIT
