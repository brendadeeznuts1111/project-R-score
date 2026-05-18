# Socket Information Format

## Canonical Format

The standard format for displaying socket connection information:

```typescript
`${s.localAddress}:${s.localPort} → ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`
```

## Usage

### Direct Property Access

```typescript
import { connect } from "bun";

const s = await connect({
  hostname: "ai-odds.stream",
  port: 443,
  tls: true,
  socket: {
    data: () => {},
    open: () => {},
    error: () => {},
    close: () => {},
    drain: () => {},
  },
});

console.log(`${s.localAddress}:${s.localPort} → ${s.remoteAddress}:${s.remotePort} (${s.remoteFamily})`);
// Output: 10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
```

### Using formatSocketInfo Helper

```typescript
import { connectWithInfo, formatSocketInfo } from './utils/socket-connection';

const { socket, info } = await connectWithInfo({
  hostname: "ai-odds.stream",
  port: 443,
  tls: true,
});

console.log(formatSocketInfo(info));
// Output: 10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
```

## Format Components

- **`localAddress`** - Local IP address (e.g., `10.0.0.24`)
- **`localPort`** - Local port number (e.g., `59876`)
- **`remoteAddress`** - Remote IP address (e.g., `104.21.8.212`)
- **`remotePort`** - Remote port number (e.g., `443`)
- **`remoteFamily`** - IP family (`IPv4` or `IPv6`)

## Examples

### IPv4 Connection
```text
10.0.0.24:59876 → 104.21.8.212:443 (IPv4)
```

### IPv6 Connection
```text
2600:1700:66d0:4c60:5b5:3e79:b63e:83db:51778 → 2600:1406:bc00:53::b81e:94ce:80 (IPv6)
```

### Localhost Connection
```text
127.0.0.1:54321 → 127.0.0.1:3000 (IPv4)
```

## Enhanced Socket Properties

All Bun.connect() sockets expose these properties:

```typescript
interface Socket {
  localAddress: string;    // Local IP address
  localPort: number;       // Local port number
  localFamily: 'IPv4' | 'IPv6';  // Local IP family
  remoteAddress: string;   // Remote IP address
  remotePort: number;      // Remote port number
  remoteFamily: 'IPv4' | 'IPv6';  // Remote IP family
}
```

## See Also

- `examples/socket-simple-demo.ts` - Simple usage example
- `examples/socket-info-demo.ts` - Complete demo with utilities
- `src/utils/socket-connection.ts` - Utility functions



