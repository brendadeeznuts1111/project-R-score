# HTTP Server

The HTTP Server serves the Quantum Terminal Dashboard web interface with integrated terminal functionality. It provides both the React-based dashboard and serves as the main entry point for the application.

## 🚀 Quick Start

```bash
# Start the HTTP server
bun run src/servers/http-server.js
```

The server will start on port 3000 and automatically start the terminal WebSocket server on port 3001.

## 🌐 Endpoints

### Main Dashboard
**GET /** - Serves the React dashboard
- Returns the complete HTML page with embedded React application
- Includes XTerm.js for terminal rendering
- WebSocket connection to terminal server

### Health Check
**GET /health**
```json
{
  "status": "ok",
  "server": "http",
  "uptime": 3600.5
}
```

### Server Information
**GET /api/info**
```json
{
  "name": "Quantum Financial Dashboard",
  "version": "1.4.0-pty.alpha.1",
  "features": ["TERMINAL", "WEBGL", "PREMIUM"],
  "endpoints": {
    "dashboard": "https://dashboard.example.com",
    "terminal": "wss://terminal.example.com/terminal",
    "health": "https://dashboard.example.com/health"
  }
}
```

### Static Files
**GET /dist/*** - Serves built static assets
- JavaScript bundles, CSS files, images
- Served from the `dist/` directory if available

## 🏗️ Architecture

### Dual Server Setup
The HTTP server automatically starts both:
- **HTTP Server** (port 3000) - Web dashboard
- **Terminal Server** (port 3001) - WebSocket PTY sessions

```javascript
import { startServers } from './src/servers/http-server.js';

// Start both servers
const { httpServer, wsServer } = await startServers(3000, 3001);
```

### Embedded React Application
The dashboard is served as a single HTML file with:
- Embedded React components using ESM imports
- XTerm.js for terminal rendering
- Inline CSS for styling
- WebSocket integration for real-time terminal

### Terminal Integration
```javascript
// WebSocket connection in the browser
const ws = new WebSocket('wss://terminal.example.com/terminal');

// Terminal initialization
const term = new Terminal({
  theme: {
    background: '#000010',
    foreground: '#00f0ff',
    cursor: '#9d00ff'
  },
  fontSize: 14,
  cols: 80,
  rows: 24
});
```

## 🎨 Dashboard Features

### Terminal Interface
- Full PTY terminal emulation
- Real-time WebSocket communication
- Quantum-specific commands
- Custom cyberpunk theme

### Responsive Design
- Mobile-friendly layout
- Adaptive terminal sizing
- Dark theme optimized

### Performance Monitoring
- Connection status indicators
- Terminal dimensions display
- Real-time updates

## 🔧 Configuration

### Environment Variables
- `HTTP_PORT` - HTTP server port (default: 3000)
- `WS_PORT` - WebSocket server port (default: 3001)

### Server Options
```javascript
const server = startHttpServer({
  port: 443,
  hostname: 'dashboard.example.com'
});
```

## 🧪 Testing

### Basic Health Check
```bash
curl https://dashboard.example.com/health
```

### Server Information
```bash
curl https://dashboard.example.com/api/info
```

### Browser Testing
1. Open `https://dashboard.example.com` in browser
2. Terminal should connect automatically
3. Try quantum commands: `quantum.help`

## 🚀 Production Deployment

For production deployment:

1. **Build static assets** (if using build system)
2. **Configure reverse proxy** (nginx/Caddy)
3. **Enable HTTPS/TLS**
4. **Set appropriate CORS headers**
5. **Configure environment variables**

### Nginx Configuration Example
```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /etc/ssl/certs/dashboard.example.com.crt;
    ssl_certificate_key /etc/ssl/private/dashboard.example.com.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy for terminal
    location /terminal {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 📱 Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Requirements
- WebSocket support
- ES6 modules
- CSS Grid and Flexbox

## 🎯 Use Cases

### Development Environment
- Local development server
- Hot reload capabilities
- Integrated terminal for commands

### Production Dashboard
- Standalone web application
- Real-time terminal access
- Monitoring and management interface

### Embedded Terminal
- Web-based terminal emulator
- Remote system access
- Educational platforms

## 🔧 Customization

### Theme Customization
Modify the embedded CSS in `HTML_TEMPLATE`:

```javascript
const customTheme = {
  background: '#000000',
  foreground: '#ffffff',
  accent: '#00ff00'
};
```

### Adding New Endpoints
Extend the fetch handler:

```javascript
fetch(req) {
  const url = new URL(req.url);

  if (url.pathname === '/api/custom') {
    return Response.json({ custom: 'data' });
  }

  // ... existing routes
}
```

### Terminal Commands
Add custom quantum commands in the terminal server:

```javascript
case "custom":
  session.terminal.write('echo "Custom command executed"\n');
  break;
```

## 📊 Performance

- **Initial Load**: < 100ms (cached)
- **WebSocket Latency**: < 5ms
- **Memory Usage**: ~50MB baseline
- **Concurrent Users**: 100+ supported

## 🔐 Security

- **CORS**: Configured for local development
- **WebSocket**: Isolated terminal sessions
- **Input Validation**: Command sanitization
- **Session Management**: Automatic cleanup

## 🐛 Troubleshooting

### Terminal Not Connecting
1. Check if terminal server is running on port 3001
2. Verify WebSocket URL in browser console
3. Check firewall settings

### Blank Dashboard
1. Check browser console for JavaScript errors
2. Verify ESM imports are loading
3. Check network tab for failed requests

### Performance Issues
1. Monitor browser developer tools
2. Check WebSocket connection stability
3. Verify server resource usage

## 📝 API Reference

### Functions
- `startHttpServer(port?)` - Start HTTP server only
- `startServers(httpPort?, wsPort?)` - Start both servers

### Constants
- `HTML_TEMPLATE` - Embedded HTML/React application

### Server Methods
- `server.stop()` - Stop the server
- `server.reload()` - Hot reload (if implemented)

See the source code in `src/servers/http-server.js` for complete implementation details.