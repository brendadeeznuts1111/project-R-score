# Service Worker Implementation

This implementation provides a service worker that handles offline fallback for
token API endpoints.

## Files Created

### 1. `service-worker.js`

The main service worker file that:

- Caches the offline token page during installation
- Handles fetch events for `/api/v1/token` endpoints
- Provides offline fallback when network requests fail
- Includes proper cache management and cleanup

**Key Features:**

- **Install Event**: Caches the offline token page for offline access
- **Activate Event**: Cleans up old cache versions
- **Fetch Event**: Intercepts token endpoint requests and provides offline
  fallback

### 2. `offline-token.html`

A user-friendly fallback page that displays when the token service is offline.
Features:

- Modern, responsive design with gradient background
- Clear messaging about service unavailability
- Retry button for users to attempt reconnection
- Professional styling with glassmorphism effects

### 3. `test-service-worker.html`

A comprehensive testing interface that allows you to:

- Register/unregister the service worker
- Test token endpoint functionality
- View real-time logs of service worker activity
- Simulate online/offline modes

### 4. `test-server.js`

A Node.js test server that:

- Serves all the necessary files
- Provides a mock `/api/v1/token` endpoint
- Handles proper MIME types for different file extensions
- Includes detailed logging for debugging

## How to Use

### 1. Start the Test Server

```bash
node test-server.js
```

The server will start on `http://localhost:3000` and provide:

- Test page: `http://localhost:3000/test-service-worker.html`
- Token endpoint: `http://localhost:3000/api/v1/token`
- Offline fallback: `http://localhost:3000/offline-token.html`

### 2. Test the Service Worker

1. Open `http://localhost:3000/test-service-worker.html` in your browser
2. Click "Register Service Worker" to install the service worker
3. Use the test interface to verify functionality
4. Test the token endpoint using the provided button

### 3. Test Offline Behavior

1. Register the service worker
2. Use browser developer tools to simulate offline mode:
   - Open DevTools (F12)
   - Go to the "Network" tab
   - Check the "Offline" box
3. Try accessing the token endpoint - it should show the offline fallback page
4. Go back online and test again

## Service Worker Logic

### Installation

```javascript
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache.add(OFFLINE_TOKEN_PAGE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});
```

### Activation

```javascript
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});
```

### Fetch Handling

```javascript
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/v1/token')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_TOKEN_PAGE);
      })
    );
  }
});
```

## Browser Compatibility

This service worker implementation works with all modern browsers that support
the Service Worker API:

- Chrome (version 40+)
- Firefox (version 44+)
- Safari (version 11.1+)
- Edge (version 17+)

## Security Considerations

- The service worker only intercepts requests to `/api/v1/token` endpoints
- Cache is properly scoped and versioned
- Old cache versions are cleaned up during activation
- The service worker scope is limited to the current directory

## Troubleshooting

### Common Issues

1. **Service Worker Not Registering**

   - Ensure you're serving files over HTTPS or localhost
   - Check browser console for errors
   - Verify the service worker file path is correct

2. **Offline Page Not Showing**

   - Make sure the service worker is properly registered
   - Check that the offline page is cached during installation
   - Verify the cache name matches between install and fetch events

3. **Cache Issues**
   - Clear browser cache and service workers
   - Unregister and re-register the service worker
   - Check browser DevTools > Application > Cache Storage

### Debugging Tools

Use browser developer tools to debug:

- **Console**: View service worker logs and errors
- **Application**: Inspect service workers, cache storage, and offline
  functionality
- **Network**: Monitor network requests and offline behavior
- **Sources**: Debug service worker code

## Deployment

For production deployment:

1. **HTTPS Requirement**: Service workers require HTTPS in production (localhost
   is exempt)
2. **Cache Strategy**: Consider implementing a more sophisticated caching
   strategy
3. **Scope**: Ensure the service worker is served from the correct directory
4. **Updates**: Implement proper update mechanisms for service worker changes

## Future Enhancements

Potential improvements for production use:

- Add more sophisticated caching strategies
- Implement background sync for failed requests
- Add push notification support
- Include analytics for offline usage
- Add more granular error handling
- Implement service worker updates with user notification

## Testing Checklist

- [ ] Service worker registers successfully
- [ ] Offline page is cached during installation
- [ ] Token endpoint works online
- [ ] Offline fallback page displays when network is unavailable
- [ ] Cache cleanup works properly on activation
- [ ] Service worker updates correctly
- [ ] Works across different browsers
- [ ] Proper error handling for various scenarios
