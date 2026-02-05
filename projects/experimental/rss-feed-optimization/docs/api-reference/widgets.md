# Widget API Reference

Embeddable RSS feed widgets for external websites. These widgets can be integrated into any website with a simple script tag or iframe.

## Base URL

```
http://localhost:3000/widgets
```

## Endpoints

### GET /widgets/feed

Returns an embeddable widget displaying RSS feed posts.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `light` | Widget theme: `light`, `dark`, `minimal`, `card` |
| `max` | number | `5` | Maximum number of posts to display (1-20) |
| `tag` | string | - | Filter posts by tag |
| `format` | string | `html` | Response format: `html`, `json`, `jsonp` |
| `callback` | string | `rssWidgetCallback` | JSONP callback function name |

**Pretty URLs:**

You can also use pretty URLs for cleaner embed codes:

| URL Pattern | Example | Description |
|-------------|---------|-------------|
| `/widgets/:theme` | `/widgets/light` | Widget with theme, default 5 posts |
| `/widgets/:theme/:max` | `/widgets/dark/3` | Widget with theme and post count |

**Example - HTML Widget (Query Params):**
```html
<iframe 
  src="http://localhost:3000/widgets/feed?theme=light&max=5"
  width="100%"
  height="400"
  frameborder="0"
  scrolling="no">
</iframe>
```

**Example - HTML Widget (Pretty URL):**
```html
<iframe 
  src="http://localhost:3000/widgets/light/5"
  width="100%"
  height="400"
  frameborder="0"
  scrolling="no">
</iframe>
```

**Example - JSON Response:**
```bash
curl "http://localhost:3000/widgets/feed?format=json&max=3"
```

**Response:**
```json
{
  "title": "Bun Blog",
  "siteUrl": "http://localhost:3000",
  "items": [
    {
      "title": "Getting Started with Bun",
      "slug": "getting-started-with-bun",
      "excerpt": "Learn how to use Bun...",
      "publishedAt": "2025-01-27T10:00:00Z",
      "author": "John Doe",
      "url": "http://localhost:3000/posts/getting-started-with-bun",
      "tags": ["bun", "javascript"]
    }
  ]
}
```

**Example - JSONP:**
```html
<script>
function myCallback(data) {
  console.log('Feed items:', data.items);
}
</script>
<script src="http://localhost:3000/widgets/feed?format=jsonp&callback=myCallback"></script>
```

### GET /widgets/script

Returns JavaScript code for embedding the widget dynamically.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | string | `light` | Widget theme |
| `max` | number | `5` | Maximum posts to display |
| `container` | string | `rss-feed-widget` | Container element ID |

**Example:**
```html
<div id="rss-feed-widget">
  <script src="http://localhost:3000/widgets/script?theme=dark&max=3"></script>
</div>
```

The script will automatically create an iframe and handle resizing.

### GET /widgets/config

Returns widget configuration options and embed examples.

**Example:**
```bash
curl http://localhost:3000/widgets/config
```

**Response:**
```json
{
  "themes": [
    {
      "id": "light",
      "name": "Light",
      "description": "Clean white background with dark text"
    },
    {
      "id": "dark",
      "name": "Dark",
      "description": "Dark background with light text"
    },
    {
      "id": "minimal",
      "name": "Minimal",
      "description": "Simple text-only design"
    },
    {
      "id": "card",
      "name": "Card",
      "description": "Card-based layout with shadows"
    }
  ],
  "options": {
    "maxItems": {
      "type": "number",
      "min": 1,
      "max": 20,
      "default": 5
    },
    "tag": {
      "type": "string",
      "description": "Filter by tag"
    },
    "format": {
      "type": "string",
      "enum": ["html", "json", "jsonp"],
      "default": "html"
    }
  },
  "embed": {
    "iframe": "http://localhost:3000/widgets/feed?theme=light&max=5",
    "script": "<script src=\"http://localhost:3000/widgets/script?theme=light&max=5\"></script>",
    "jsonp": "http://localhost:3000/widgets/feed?format=jsonp&callback=myCallback"
  }
}
```

## Themes

### Light Theme
Clean white background with dark text. Best for light-colored websites.

```html
<iframe src="http://localhost:3000/widgets/feed?theme=light"></iframe>
```

### Dark Theme
Dark background with light text. Perfect for dark mode websites.

```html
<iframe src="http://localhost:3000/widgets/feed?theme=dark"></iframe>
```

### Minimal Theme
Simple text-only design without borders or backgrounds. Great for sidebar integration.

```html
<iframe src="http://localhost:3000/widgets/feed?theme=minimal"></iframe>
```

### Card Theme
Card-based layout with shadows and modern styling.

```html
<iframe src="http://localhost:3000/widgets/feed?theme=card"></iframe>
```

## Integration Examples

### Basic Iframe Embed

```html
<div class="rss-widget-container">
  <iframe 
    src="http://localhost:3000/widgets/feed?theme=light&max=5"
    width="100%"
    style="border: none; min-height: 400px;"
    scrolling="no">
  </iframe>
</div>
```

### JavaScript Embed with Auto-resize

```html
<div id="my-rss-widget">
  <script src="http://localhost:3000/widgets/script?theme=card&max=3"></script>
</div>
```

### React Component

```jsx
function RSSWidget({ theme = 'light', max = 5, tag }) {
  const params = new URLSearchParams({ theme, max: max.toString() });
  if (tag) params.set('tag', tag);
  
  const src = `http://localhost:3000/widgets/feed?${params}`;
  
  return (
    <iframe
      src={src}
      width="100%"
      style={{ border: 'none', minHeight: '400px' }}
      scrolling="no"
      title="RSS Feed"
    />
  );
}

// Usage
<RSSWidget theme="dark" max={3} tag="javascript" />
```

### Vue Component

```vue
<template>
  <iframe
    :src="widgetUrl"
    width="100%"
    style="border: none; min-height: 400px;"
    scrolling="no"
    title="RSS Feed"
  />
</template>

<script>
export default {
  props: {
    theme: { type: String, default: 'light' },
    max: { type: Number, default: 5 },
    tag: { type: String, default: null }
  },
  computed: {
    widgetUrl() {
      const params = new URLSearchParams({
        theme: this.theme,
        max: this.max.toString()
      });
      if (this.tag) params.set('tag', this.tag);
      return `http://localhost:3000/widgets/feed?${params}`;
    }
  }
}
</script>
```

### WordPress Shortcode

Add to your theme's `functions.php`:

```php
function rss_feed_widget_shortcode($atts) {
    $atts = shortcode_atts([
        'theme' => 'light',
        'max' => 5,
        'tag' => ''
    ], $atts);
    
    $params = http_build_query([
        'theme' => $atts['theme'],
        'max' => $atts['max'],
        'tag' => $atts['tag']
    ]);
    
    return '<iframe src="http://localhost:3000/widgets/feed?' . $params . '" 
        width="100%" style="border: none; min-height: 400px;" scrolling="no"></iframe>';
}
add_shortcode('rss_widget', 'rss_feed_widget_shortcode');
```

Usage in WordPress:
```
[rss_widget theme="dark" max="3" tag="javascript"]
```

## Rate Limiting

Widget endpoints have rate limiting to prevent abuse:

- **Default limit**: 200 requests per minute per IP
- **Cache headers**: Responses cached for 5 minutes
- **CORS**: Enabled for all domains

## CORS Headers

All widget responses include CORS headers for cross-domain usage:

```
Access-Control-Allow-Origin: *
```

## Security

- Widgets run in sandboxed iframes
- No JavaScript execution in parent page
- All links open in new tabs with `rel="noopener"`
- XSS protection through HTML escaping

## Troubleshooting

### Widget Not Loading

1. Check that the server is running
2. Verify the URL is correct
3. Check browser console for errors
4. Ensure CORS is enabled on the server

### Styling Issues

1. Try different themes to match your website
2. Use CSS to style the container element
3. Check that iframe dimensions are set correctly

### Performance

1. Widget responses are cached for 5 minutes
2. Use `max` parameter to limit posts
3. Consider using JSON format for custom rendering

## Custom Styling

For complete control, use the JSON format and render posts yourself:

```html
<div id="custom-widget"></div>

<script>
fetch('http://localhost:3000/widgets/feed?format=json&max=5')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('custom-widget');
    container.innerHTML = data.items.map(post => `
      <article>
        <h3><a href="${post.url}">${post.title}</a></h3>
        <p>${post.excerpt}</p>
      </article>
    `).join('');
  });
</script>
```

## Support

For widget-related questions:

1. Check the [FAQ](../troubleshooting/faq.md)
2. [Create an issue](https://github.com/brendadeeznuts1111/rss-feed-optimization/issues)
3. Join the [community discussions](https://github.com/brendadeeznuts1111/rss-feed-optimization/discussions)