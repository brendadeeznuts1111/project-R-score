# Edge-Suite Dashboard

A plug-and-play micro-frontend dashboard for monitoring NBA Swarm edge detection in real-time.

## Features

- **Zero Build Step**: Pure HTML + HTMX, no bundling required
- **Hot-Loadable Components**: Drop `.html` files into `/components` and they're instantly available
- **Micro-Frontend Architecture**: Each component is independent and swappable
- **Real-Time Updates**: Auto-refreshes edge data every second
- **URL-State Router**: Deep-link any view with `?view=dash` or `?view=charts`
- **Resizable Panels**: Drag handles to resize dock panes
- **Command Palette**: Press `Ctrl+K` or `Cmd+K` for quick actions
- **Plugin API**: Register custom cards with one line
- **Performance Optimized**: IntersectionObserver pauses off-screen charts
- **Production Ready**: Ships inside the same Bun 1.3 repo

## Quick Start

```bash
# Start the dashboard server with polish
bun suite-polish
# or standard
bun suite

# Open browser
open http://localhost:3334
open http://localhost:3334?view=dash
open http://localhost:3334?view=charts
```

## Architecture

```text
edge-suite/
├── server.ts              # Bun static file server + API
├── public/
│   ├── index.html         # Main shell
│   ├── views/             # Router views
│   │   ├── dash.html
│   │   └── charts.html
│   ├── components/        # Hot-loadable component snippets
│   │   ├── header.html
│   │   ├── footer.html
│   │   ├── dash-card.html
│   │   ├── chart-card.html
│   │   └── edge-row.html
│   ├── css/
│   │   └── suite.css      # Dashboard styles
│   └── js/
│       ├── router.js       # URL-state router
│       ├── plugins.js      # Plugin registry
│       └── suite.js        # Core functionality
```

## Adding New Components

1. Create a new `.html` file in `public/components/`
2. Reference it in any view:

```html
<div hx-get="components/your-widget.html" hx-trigger="load" hx-swap="innerHTML"></div>
```

3. Refresh browser - component loads automatically!

## Plugin API

Register custom cards with one line:

```html
<script type="module">
registerPlugin('weather-card', {
  mount: '#weather-slot',
  template: `<div class="card"><h2>Weather</h2><p>72°F</p></div>`,
  onMount(el) { /* optional */ }
});
</script>

<div id="weather-slot"></div>
```

## Keyboard Shortcuts

- `Ctrl+K` / `Cmd+K`: Open command palette
- `Ctrl+D`: Toggle dark/light mode
- `Ctrl+R`: Hard refresh
- `Escape`: Close palette

## URL Routing

- `?view=dash` - Main dashboard view
- `?view=charts` - Charts view
- Use `goto('viewname')` in JavaScript to navigate

## Resizable Panels

Drag the handle between panes to resize. Panels automatically stack on mobile.

## API Endpoints

- `GET /api/edges` - Returns last 100 edge flashes as HTML table rows

## Integration with Radar

The dashboard automatically connects to the Swarm Radar system when running. To integrate manually:

```typescript
import { SwarmRadar } from "../packages/swarm-radar/index.js";
import { setLedger } from "./edge-suite/server.js";

const radar = new SwarmRadar();
radar.start();

// Share ledger with dashboard
setLedger(radar.ledger);
```

## Performance Features

- **IntersectionObserver**: Pauses off-screen charts (60 FPS guaranteed)
- **requestAnimationFrame**: Throttles animations when >100 rows visible
- **content-visibility**: Auto-optimizes large lists (Chrome 90+)
- **Auto-refresh toggle**: Respects battery and visibility API

## Screenshot Export

```javascript
screenshot('#left-pane'); // Exports PNG of selected element
```

## Future Components

- `chart-card.html` → Real-time weight histogram (Chart.js)
- `vr-preview-card.html` → WebGL canvas visualization
- `alert-card.html` → HTMX SSE stream for high-weight alerts

## Tech Stack

- **Bun 1.3**: Runtime and server
- **HTMX**: Declarative HTML updates
- **Pure CSS**: No framework dependencies
- **Vanilla JS**: Minimal client-side logic
- **Zero Dependencies**: Router and plugins are pure JS

## Development

- No build step required
- Hot-reload by refreshing browser
- Components are pure HTML snippets
- Ready for React/Vue migration later (replace components one at a time)
- Total bundle size: <250KB

## Roadmap

- **Web Components** version of cards (Shadow DOM, no CSS leak)
- **Vite plugin** to auto-scan `/components` and generate `routes.json`
- **Electron shell** → desktop widget mode (always-on-top, 1% CPU)


