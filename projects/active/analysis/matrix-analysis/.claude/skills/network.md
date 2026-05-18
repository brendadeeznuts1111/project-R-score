---
name: network
description: Network monitoring, DNS diagnostics, and connectivity analysis
version: 1.0.0
tools: Bash, Read, Write
triggers:
  - network
  - dns
  - ping
  - latency
  - traceroute
  - connectivity
---

# /network - Network & DNS Monitoring

Comprehensive network diagnostics with Bun-native tooling.

## Quick Reference

### Connectivity
- **`/network status`** — Interface status + public IP
- **`/network latency <host>`** — Ping analysis with jitter
- **`/network path <host>`** — Traceroute/mtr analysis
- **`/network speed`** — Bandwidth test

### DNS
- **`/network dns <domain>`** — Multi-resolver lookup
- **`/network dns:propagation <domain>`** — Check DNS propagation
- **`/network dns:records <domain>`** — All record types
- **`/network dns:reverse <ip>`** — Reverse lookup

### Monitoring
- **`/network monitor [seconds]`** — Real-time traffic
- **`/network connections`** — Active ports/sockets
- **`/network watch <host>`** — Continuous ping

## Implementation

```bash
# Run any command
bun ~/.claude/scripts/network/mod.ts <command> [args]
```

## Commands

### status
Show network interfaces and public IP info.

```bash
bun ~/.claude/scripts/network/mod.ts status
```

Output:
```
Network Interfaces
en1: 192.168.1.102 (active)
utun4: 100.115.89.61 (Tailscale)

Public IP: 73.xxx.xxx.xxx
Location: City, State, US
ISP: Comcast
```

### latency
Ping analysis with statistics.

```bash
bun ~/.claude/scripts/network/mod.ts latency 8.8.8.8
bun ~/.claude/scripts/network/mod.ts latency google.com
```

Output:
```
Latency Analysis: 8.8.8.8
Min: 17.30ms | Avg: 65.57ms | Max: 148.23ms
Jitter: 53.26ms | Packet Loss: 0.0%
Good connection
```

### dns
Multi-resolver DNS lookup with timing.

```bash
bun ~/.claude/scripts/network/mod.ts dns google.com
bun ~/.claude/scripts/network/mod.ts dns example.com
```

Output:
```
DNS Analysis: google.com
System Default  (42ms):  74.125.21.100
Cloudflare      (28ms):  172.253.63.138
Google          (52ms):  64.233.176.139
Quad9           (89ms):  172.253.124.139

NS Records:
ns1.google.com.
ns2.google.com.
```

### path
Route analysis using mtr or traceroute.

```bash
bun ~/.claude/scripts/network/mod.ts path 8.8.8.8
bun ~/.claude/scripts/network/mod.ts path cloudflare.com
```

### speed
Internet bandwidth test.

```bash
bun ~/.claude/scripts/network/mod.ts speed
```

### connections
Show listening ports and active connections.

```bash
bun ~/.claude/scripts/network/mod.ts connections
```

Output:
```
Listening Ports:
node    12345  TCP *:3000 (LISTEN)
postgres 5432  TCP *:5432 (LISTEN)

Connection Summary:
Established connections: 24
```

### monitor
Real-time network traffic monitoring.

```bash
bun ~/.claude/scripts/network/mod.ts monitor 30    # 30 seconds
bun ~/.claude/scripts/network/mod.ts monitor 60    # 1 minute
```

Output:
```
Network Monitor (30s, Ctrl+C to stop)
Time        Rx (KB/s)   Tx (KB/s)
--------------------------------------------------
10:30:01    125.32      45.21
10:30:02    89.45       12.33
```

## Advanced DNS Commands

### DNS Propagation Check
```bash
# Check multiple global DNS servers
for server in 1.1.1.1 8.8.8.8 9.9.9.9 208.67.222.222; do
  echo "$server: $(dig @$server +short example.com)"
done
```

### All Record Types
```bash
# A, AAAA, MX, TXT, CNAME, NS
dig example.com ANY +noall +answer
dig example.com MX +short
dig example.com TXT +short
dig _dmarc.example.com TXT +short
```

### Reverse DNS
```bash
dig -x 8.8.8.8 +short
# dns.google
```

### DNS Trace
```bash
dig +trace example.com
```

## Troubleshooting Recipes

### Check if host is reachable
```bash
bun ~/.claude/scripts/network/mod.ts latency example.com
```

### Debug DNS issues
```bash
# Compare resolvers
bun ~/.claude/scripts/network/mod.ts dns example.com

# Check specific records
dig example.com MX +short
dig example.com TXT +short

# Trace resolution path
dig +trace example.com
```

### Find network bottlenecks
```bash
# Trace route with timing
bun ~/.claude/scripts/network/mod.ts path slow-server.com

# Monitor during issue
bun ~/.claude/scripts/network/mod.ts monitor 60
```

### Check port availability
```bash
# See what's listening
bun ~/.claude/scripts/network/mod.ts connections

# Check specific port
lsof -i :3000
nc -zv localhost 3000
```

### Test SSL/TLS
```bash
# Check certificate
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -dates

# Test HTTPS
curl -I https://example.com
```

## Quality Thresholds

### Latency
- **<20ms** (Excellent) — Gaming, real-time
- **20-50ms** (Good) — Video calls, streaming
- **50-100ms** (Fair) — General browsing
- **>100ms** (Poor) — May cause issues

### Jitter
- **<5ms** — Excellent
- **5-20ms** — Good
- **20-50ms** — Fair
- **>50ms** — Poor (affects VoIP)

### Packet Loss
- **0%** — Perfect
- **<1%** — Acceptable
- **1-5%** — Degraded
- **>5%** — Severe issues

## Integration

### With /diagnose
```bash
# Check project's external dependencies
/diagnose deps --network
```

### With /matrix
```bash
# DNS prefetch analysis for lockfiles
/matrix ~/Projects --dns-stats
```

## Dependencies

Required (usually pre-installed):
- `ping` - ICMP latency
- `dig` - DNS queries
- `traceroute` / `mtr` - Route tracing
- `netstat` / `lsof` - Connection info
- `curl` - HTTP testing

Optional:
- `speedtest-cli` - Accurate bandwidth (`brew install speedtest-cli`)
- `mtr` - Better traceroute (`brew install mtr`)
- `nmap` - Port scanning (`brew install nmap`)
