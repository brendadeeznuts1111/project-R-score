# Playwriter Skill for Kimi CLI

Browser automation via Playwright API using Chrome extension + CLI.

## Features

- 🎭 Control your browser via Playwright API
- 🌐 Uses your existing Chrome (with extensions, login state)
- 🏷️ Visual accessibility labels for AI interaction
- 🔧 Full Playwright API access
- 🔒 Local-only WebSocket server

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

## Architecture

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
