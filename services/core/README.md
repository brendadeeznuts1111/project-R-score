# Core Services

Fundamental service utilities that provide essential functionality for the application.

## 📦 Services

### **Fetch Service** (`fetch-service.ts`)
Basic HTTP request handling with Bun's native fetch API.
- Simple GET/POST/PUT/DELETE operations
- Basic error handling
- Content-type detection
- Response parsing

### **Advanced Fetch Service** (`advanced-fetch-service.ts`)
Enhanced HTTP client with production-ready features:
- Automatic retry logic with exponential backoff
- Request/response caching
- Timeout handling
- Request interceptors
- Comprehensive error handling
- Performance monitoring

### **RSS Service** (`rss-service.ts`)
RSS/Atom feed management and processing:
- Feed fetching and parsing
- Feed generation and validation
- Caching for performance
- Content extraction
- Feed aggregation

## 🚀 Usage Examples

```typescript
import { FetchService } from './fetch-service';
import { AdvancedFetchService } from './advanced-fetch-service';
import { RSSService } from './rss-service';

// Basic fetching
const fetchService = new FetchService();
const data = await fetchService.fetchBunDocs('/runtime');

// Advanced fetching with retries
const advancedService = new AdvancedFetchService();
const robustData = await advancedService.fetchWithRetry('/api/data');

// RSS feed handling
const rssService = new RSSService();
const feed = await rssService.fetchFeed('https://example.com/rss.xml');
```

## ⚙️ Configuration

Most services use environment variables:
- `API_BASE_URL` - Base URL for API requests
- `CACHE_TTL` - Cache duration in seconds
- `RETRY_ATTEMPTS` - Number of retry attempts
- `REQUEST_TIMEOUT` - Request timeout in milliseconds

## 🔧 Dependencies

- Bun runtime for native fetch and file operations
- Shared utilities from `/lib/utils/`
- Configuration from `/config/`
