# Sportsbook & Betting Markets WebSocket Integration

**Real-time WebSocket server for sportsbooks, markets, and betting operations using Bun.serve() with per-socket contextual data**

---

## Overview

The Sportsbook WebSocket server provides real-time updates for:
- **Sportsbook Status** - Live status of connected sportsbooks
- **Betting Markets** - Real-time market data and odds updates
- **Arbitrage Opportunities** - Live arbitrage opportunity detection
- **Bet Management** - Place bets and track positions in real-time

**Integration Pattern:** Uses Bun.serve() with per-socket contextual data pattern as documented in [Bun WebSocket Contextual Data](https://bun.com/docs/runtime/http/websockets#contextual-data).

---

## WebSocket Endpoints

### Connection

```typescript
// Connect to WebSocket
const socket = new WebSocket('ws://localhost:3000/ws/sportsbooks?user_id=123&username=trader');

// With authentication token (cookie)
const socket = new WebSocket('ws://localhost:3000/ws/sportsbooks', {
  headers: {
    'Cookie': 'X-Token=your-auth-token'
  }
});
```

### Per-Socket Contextual Data

When the connection is upgraded, contextual data is set per-socket:

```typescript
// In server.upgrade() call
server.upgrade(req, {
  data: {
    clientId: 'client-1234567890-abc',
    userId: 'user_123',
    username: 'trader',
    token: 'auth-token',
    connectedAt: Date.now(),
    lastActivity: Date.now(),
    subscribedSportsbooks: new Set(),
    subscribedMarkets: new Set(),
    subscribedArbitrage: false,
    marketTypeFilters: new Set(),
    sportFilters: new Set(),
    lastPing: Date.now(),
  }
});
```

**Access in WebSocket handlers:**
```typescript
websocket: {
  open(ws) {
    // ws.data is typed as SportsbookWebSocketData
    console.log(`Client ${ws.data.clientId} connected`);
    console.log(`User: ${ws.data.userId || 'anonymous'}`);
  },
  message(ws, message) {
    // Access contextual data
    ws.data.lastActivity = Date.now();
    // Use subscriptions
    if (ws.data.subscribedArbitrage) {
      // Send arbitrage updates
    }
  }
}
```

---

## Message Types

### Client → Server

#### Subscribe to Updates

```typescript
{
  type: "subscribe",
  payload: {
    sportsbooks: ["pinnacle", "draftkings"],
    markets: ["market_123", "market_456"],
    arbitrage: true,
    marketTypes: ["spread", "moneyline"],
    sports: ["NBA", "NFL"]
  }
}
```

#### Unsubscribe

```typescript
{
  type: "unsubscribe",
  payload: {
    sportsbooks: ["pinnacle"],
    markets: ["market_123"],
    arbitrage: true
  }
}
```

#### Get Markets

```typescript
{
  type: "get_markets",
  payload: {
    sport: "NBA",
    league: "NBA",
    marketType: "spread",
    bookmaker: "pinnacle",
    eventId: "event_123"
  }
}
```

#### Get Arbitrage Opportunities

```typescript
{
  type: "get_arbitrage",
  payload: {
    minEdge: 1.0,
    eventId: "event_123",
    marketType: "spread",
    bookmaker: "pinnacle"
  }
}
```

#### Place Bet (requires authentication)

```typescript
{
  type: "place_bet",
  payload: {
    marketId: "market_123",
    selectionId: "selection_1",
    bookmaker: "pinnacle",
    stake: 100,
    odds: -110,
    notes: "Lakers spread bet"
  }
}
```

#### Get Bets (requires authentication)

```typescript
{
  type: "get_bets",
  payload: {
    status: "placed",
    bookmaker: "pinnacle",
    marketId: "market_123",
    limit: 50
  }
}
```

#### Ping (keepalive)

```typescript
{
  type: "ping"
}
```

---

### Server → Client

#### Connected

```typescript
{
  type: "connected",
  clientId: "client-1234567890-abc",
  userId: "user_123",
  username: "trader",
  timestamp: 1704372000000,
  message: "Connected to Sportsbook & Betting Markets WebSocket"
}
```

#### Sportsbooks Status

```typescript
{
  type: "sportsbooks",
  sportsbooks: [
    {
      id: "pinnacle",
      name: "Pinnacle",
      status: "online",
      responseTime: 90,
      lastUpdate: 1704372000000,
      availableMarkets: 1250,
      activeBets: 5
    }
  ],
  total: 1
}
```

#### Markets Update

```typescript
{
  type: "market_update",
  markets: [
    {
      id: "market_123",
      eventId: "event_xyz",
      eventDescription: "Lakers @ Celtics",
      sport: "NBA",
      marketType: "spread",
      line: -3.5,
      selections: [...],
      bestOdds: {...},
      timestamp: 1704372000000
    }
  ],
  timestamp: 1704372000000
}
```

#### Arbitrage Update

```typescript
{
  type: "arbitrage_update",
  opportunities: [
    {
      id: "arb_123",
      eventId: "event_xyz",
      eventDescription: "Lakers @ Celtics",
      marketType: "spread",
      edge: 1.2,
      bookA: {...},
      bookB: {...},
      guaranteedProfit: 1.20,
      roi: 1.2,
      detectedAt: 1704372000000
    }
  ],
  total: 1,
  timestamp: 1704372000000
}
```

#### Bet Placed

```typescript
{
  type: "bet_placed",
  bet: {
    id: "bet_abc123",
    marketId: "market_123",
    selectionId: "selection_1",
    bookmaker: "pinnacle",
    stake: 100,
    odds: -110,
    potentialPayout: 190.91,
    status: "placed",
    placedAt: 1704372000000
  }
}
```

#### Heartbeat

```typescript
{
  type: "heartbeat",
  timestamp: 1704372000000,
  clients: 5
}
```

#### Error

```typescript
{
  type: "error",
  message: "Failed to place bet",
  code: "NX-500"
}
```

---

## Implementation Example

### Server-Side (Bun.serve)

```typescript
import type { ServerWebSocket } from "bun";

interface SportsbookWebSocketData {
  clientId: string;
  userId?: string;
  username?: string;
  token?: string;
  connectedAt: number;
  lastActivity: number;
  subscribedSportsbooks: Set<string>;
  subscribedMarkets: Set<string>;
  subscribedArbitrage: boolean;
}

Bun.serve<SportsbookWebSocketData>({
  port: 3000,
  fetch: async (req, server) => {
    const url = new URL(req.url);
    
    // WebSocket upgrade endpoint
    if (url.pathname === "/ws/sportsbooks") {
      // Parse cookies/headers for authentication
      const cookies = parseCookies(req.headers.get("Cookie"));
      const token = cookies["X-Token"] || url.searchParams.get("token");
      const userId = url.searchParams.get("user_id");
      const username = url.searchParams.get("username");
      
      // Get user from token if provided
      let user: { id: string; username: string } | null = null;
      if (token) {
        user = await getUserFromToken(token);
      }
      
      // Upgrade to WebSocket with contextual data
      const success = server.upgrade(req, {
        data: {
          clientId: `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: user?.id || userId || undefined,
          username: user?.username || username || undefined,
          token: token || undefined,
          connectedAt: Date.now(),
          lastActivity: Date.now(),
          subscribedSportsbooks: new Set(),
          subscribedMarkets: new Set(),
          subscribedArbitrage: false,
          marketTypeFilters: new Set(),
          sportFilters: new Set(),
          lastPing: Date.now(),
        },
      });
      
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    
    // Handle regular HTTP requests
    return app.fetch(req);
  },
  websocket: {
    // TypeScript: specify the type of ws.data
    data: {} as SportsbookWebSocketData,
    
    open(ws) {
      // ws.data is typed as SportsbookWebSocketData
      console.log(`Client ${ws.data.clientId} connected`);
      console.log(`User: ${ws.data.userId || 'anonymous'}`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        clientId: ws.data.clientId,
        userId: ws.data.userId,
        username: ws.data.username,
      }));
    },
    
    async message(ws, message) {
      // Update last activity
      ws.data.lastActivity = Date.now();
      
      // Parse message
      const data = JSON.parse(message.toString());
      
      // Handle ping
      if (data.type === "ping") {
        ws.data.lastPing = Date.now();
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      
      // Handle subscribe
      if (data.type === "subscribe") {
        // Update subscriptions in ws.data
        if (data.payload.sportsbooks) {
          for (const bookmaker of data.payload.sportsbooks) {
            ws.data.subscribedSportsbooks.add(bookmaker);
          }
        }
        // ... handle other subscriptions
      }
      
      // Handle place bet (requires authentication)
      if (data.type === "place_bet") {
        if (!ws.data.userId) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Authentication required",
            code: "NX-401"
          }));
          return;
        }
        
        // Place bet using ws.data.userId
        const bet = await placeBet({
          ...data.payload,
          userId: ws.data.userId,
        });
        
        ws.send(JSON.stringify({
          type: "bet_placed",
          bet
        }));
      }
    },
    
    close(ws, code, message) {
      console.log(`Client ${ws.data.clientId} disconnected`);
      // Clean up subscriptions, etc.
    },
    
    error(ws, error) {
      console.error(`WebSocket error for ${ws.data.clientId}:`, error);
    }
  }
});
```

### Client-Side (Browser)

```typescript
// Connect to WebSocket
const socket = new WebSocket('ws://localhost:3000/ws/sportsbooks?user_id=123&username=trader');

socket.onopen = () => {
  console.log('Connected to Sportsbook WebSocket');
  
  // Subscribe to updates
  socket.send(JSON.stringify({
    type: "subscribe",
    payload: {
      sportsbooks: ["pinnacle", "draftkings"],
      arbitrage: true,
      marketTypes: ["spread", "moneyline"],
      sports: ["NBA"]
    }
  }));
  
  // Get markets
  socket.send(JSON.stringify({
    type: "get_markets",
    payload: {
      sport: "NBA",
      marketType: "spread"
    }
  }));
};

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case "connected":
      console.log(`Connected as ${message.clientId}`);
      break;
      
    case "market_update":
      // Update UI with market data
      updateMarketsUI(message.markets);
      break;
      
    case "arbitrage_update":
      // Display arbitrage opportunities
      displayArbitrageOpportunities(message.opportunities);
      break;
      
    case "bet_placed":
      // Confirm bet placement
      showBetConfirmation(message.bet);
      break;
      
    case "heartbeat":
      // Connection is alive
      break;
      
    case "error":
      console.error("WebSocket error:", message.message);
      break;
  }
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
};

socket.onclose = () => {
  console.log("WebSocket closed");
  // Reconnect logic
};
```

---

## Authentication

### Using Cookies

```typescript
// Server reads cookies from request headers
const cookies = parseCookies(req.headers.get("Cookie"));
const token = cookies["X-Token"];

// Validate token and get user
const user = await getUserFromToken(token);

// Set user data in WebSocket contextual data
server.upgrade(req, {
  data: {
    userId: user.id,
    username: user.username,
    token: token,
    // ... other data
  }
});
```

### Using Query Parameters

```typescript
// Client connects with token in URL
const socket = new WebSocket('ws://localhost:3000/ws/sportsbooks?token=abc123&user_id=123');

// Server reads from URL
const token = url.searchParams.get("token");
const userId = url.searchParams.get("user_id");
```

---

## Subscription Management

Subscriptions are stored per-socket in `ws.data`:

```typescript
// Subscribe to specific sportsbooks
ws.data.subscribedSportsbooks.add("pinnacle");
ws.data.subscribedSportsbooks.add("draftkings");

// Subscribe to specific markets
ws.data.subscribedMarkets.add("market_123");

// Subscribe to arbitrage opportunities
ws.data.subscribedArbitrage = true;

// Filter by market types
ws.data.marketTypeFilters.add("spread");
ws.data.marketTypeFilters.add("moneyline");

// Filter by sports
ws.data.sportFilters.add("NBA");
ws.data.sportFilters.add("NFL");
```

**Broadcast Logic:**
- Only send updates to clients who are subscribed
- Filter by market type and sport preferences
- Respect user authentication for bet placement

---

## Real-Time Updates

### Market Updates (Every 5 seconds)

Subscribed clients receive market updates for their subscribed markets:

```typescript
// Only send to clients subscribed to this market
if (ws.data.subscribedMarkets.has(marketId)) {
  ws.send(JSON.stringify({
    type: "market_update",
    markets: [updatedMarket]
  }));
}
```

### Arbitrage Updates (Every 10 seconds)

Subscribed clients receive arbitrage opportunities:

```typescript
// Only send to clients subscribed to arbitrage
if (ws.data.subscribedArbitrage) {
  ws.send(JSON.stringify({
    type: "arbitrage_update",
    opportunities: newOpportunities
  }));
}
```

### Heartbeat (Every 30 seconds)

All clients receive heartbeat to maintain connection:

```typescript
ws.send(JSON.stringify({
  type: "heartbeat",
  timestamp: Date.now(),
  clients: totalClients
}));
```

---

## Error Handling

### Authentication Errors

```typescript
if (!ws.data.userId && requiresAuth) {
  ws.send(JSON.stringify({
    type: "error",
    message: "Authentication required",
    code: "NX-401"
  }));
  return;
}
```

### Rate Limiting

```typescript
// Check last activity
const timeSinceLastActivity = Date.now() - ws.data.lastActivity;
if (timeSinceLastActivity < 100) {
  // Rate limit: max 10 messages per second
  ws.send(JSON.stringify({
    type: "error",
    message: "Rate limit exceeded",
    code: "NX-429"
  }));
  return;
}
```

---

## Best Practices

### 1. Set Contextual Data on Upgrade

Always set contextual data when upgrading:

```typescript
server.upgrade(req, {
  data: {
    // Required fields
    clientId: generateClientId(),
    connectedAt: Date.now(),
    
    // Optional authentication
    userId: user?.id,
    username: user?.username,
    token: token,
    
    // Subscription state
    subscribedSportsbooks: new Set(),
    subscribedMarkets: new Set(),
    subscribedArbitrage: false,
  }
});
```

### 2. Read Cookies/Headers for Authentication

```typescript
// Parse cookies from request
const cookies = parseCookies(req.headers.get("Cookie"));
const token = cookies["X-Token"];

// Or read from Authorization header
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
```

### 3. Use TypeScript Types for Type Safety

```typescript
// Define WebSocket data type
interface SportsbookWebSocketData {
  clientId: string;
  userId?: string;
  // ...
}

// Use in Bun.serve()
Bun.serve<SportsbookWebSocketData>({
  websocket: {
    data: {} as SportsbookWebSocketData,
    open(ws) {
      // ws.data is typed as SportsbookWebSocketData
      console.log(ws.data.clientId); // ✅ Type-safe
    }
  }
});
```

### 4. Update Activity Timestamps

```typescript
message(ws, message) {
  // Update last activity on every message
  ws.data.lastActivity = Date.now();
  
  // Handle ping/pong
  if (data.type === "ping") {
    ws.data.lastPing = Date.now();
  }
}
```

### 5. Clean Up on Close

```typescript
close(ws, code, message) {
  // Remove from client registry
  clients.delete(ws.data.clientId);
  
  // Clean up subscriptions
  ws.data.subscribedSportsbooks.clear();
  ws.data.subscribedMarkets.clear();
}
```

---

## Related Documentation

- [Bun WebSocket Contextual Data](https://bun.com/docs/runtime/http/websockets#contextual-data)
- [Factory Wager Mini App Integration](./FACTORY-WAGER-MINIAPP-INTEGRATION.md)
- [Sportsbook Integration](../src/utils/sportsbook-miniapp.ts)
- [WebSocket Server](../src/api/sportsbook-ws.ts)

---

## Status

✅ **Complete** - WebSocket server integrated with per-socket contextual data pattern.

**Last Updated**: 2025-01-27  
**Status**: ✅ Production Ready
