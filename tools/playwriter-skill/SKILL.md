# Playwriter Skill

Browser automation via Playwright API using Chrome extension + CLI. Control your browser with natural language.

## Installation

### 1. Install Chrome Extension

Install from Chrome Web Store: [Playwriter Extension](https://chrome.google.com/webstore/detail/playwriter/...)

### 2. Install CLI via bunx

```bash
bunx playwriter@latest session new
```

Or install globally:

```bash
bun add -g playwriter
```

### 3. Connect Extension

Click the Playwriter extension icon on any tab → turns green when connected.

## Usage

### Basic Commands

```bash
# Create new session
playwriter session new

# Execute Playwright code
playwriter -s 1 -e "await page.goto('https://example.com')"

# Get page title
playwriter -s 1 -e "console.log(await page.title())"

# Click element
playwriter -s 1 -e "await page.locator('aria-ref=e5').click()"
```

### Session Management

```bash
playwriter session new              # Create session (outputs ID)
playwriter session list             # List sessions
playwriter session reset <id>       # Reset session
```

### With Accessibility Snapshot

```bash
# Screenshot with accessibility labels
playwriter -s 1 -e "await screenshotWithAccessibilityLabels({ page })"

# Click by accessibility reference
playwriter -s 1 -e "await page.locator('aria-ref=e5').click()"
```

## MCP Integration

Add to your agent:

```bash
npx -y skills add remorses/playwriter
```

Or use the execute tool directly:

```typescript
// Example MCP tool call
{
  "session": 1,
  "code": "await page.goto('https://example.com'); console.log(await page.title());"
}
```

## Variables Available

- `page` - Playwright Page instance
- `context` - Playwright BrowserContext
- `state` - Persistent state between calls
- `require` - Node.js require

## Examples

### Navigate and Extract Data

```bash
playwriter -s 1 -e "
  await page.goto('https://news.ycombinator.com');
  const titles = await page.$$eval('.titleline > a', els => els.map(e => e.textContent));
  console.log(titles.slice(0, 5));
"
```

### Network Interception

```bash
playwriter -s 1 -e "
  state.requests = [];
  page.on('response', r => {
    if (r.url().includes('/api/')) state.requests.push(r.url())
  });
"
```

### Form Interaction

```bash
playwriter -s 1 -e "
  await page.goto('https://example.com/login');
  await page.fill('input[name="username"]', 'user');
  await page.fill('input[name="password"]', 'pass');
  await page.click('button[type="submit"]');
"
```

## Security

- Local only: WebSocket server on `localhost:19988`
- Explicit consent: Only tabs where you clicked the extension
- Visible automation: Chrome shows automation banner
- Origin validation: Only verified extension IDs

## Links

- GitHub: https://github.com/remorses/playwriter
- Chrome Extension: https://chrome.google.com/webstore/detail/playwriter/...
