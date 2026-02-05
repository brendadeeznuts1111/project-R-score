# 🌐 Network Configuration

## IP Address: 172.56.24.136

This IP address falls within the private IPv4 address range (172.16.0.0 -
172.31.255.255) as defined by RFC 1918.

### Network Details

| Property      | Value                                        |
| ------------- | -------------------------------------------- |
| IP Address    | 172.56.24.136                                |
| Type          | Private IPv4 (Class B)                       |
| Network Class | Invalid private range (172.56.x.x is public) |
| Binary        | 10101100.00111000.00011000.10001000          |
| Hexadecimal   | 0xAC381888                                   |

### Important Note

The IP address `172.56.24.136` is actually in the **public IP address space**,
not private.

The private Class B range is:

- **172.16.0.0 - 172.31.255.255** (Private)
- **172.56.24.136** falls outside this range (Public)

### Usage Recommendations

If this IP is intended for private network use:

1. Consider using a valid private IP range:

   - Class A: 10.0.0.0 - 10.255.255.255
   - Class B: 172.16.0.0 - 172.31.255.255
   - Class C: 192.168.0.0 - 192.168.255.255

2. For Fire22 Dashboard internal services:

   ```yaml
   # Recommended private IP configuration
   internal_services:
     database: 172.16.24.136
     cache: 172.16.24.137
     api: 172.16.24.138
   ```

3. For Docker/Container networking:
   ```yaml
   networks:
     fire22_network:
       ipam:
         config:
           - subnet: 172.16.24.0/24
             gateway: 172.16.24.1
   ```

### Security Considerations

If `172.56.24.136` is being used:

- ⚠️ This is a public IP address
- Ensure proper firewall rules
- Implement access control lists (ACLs)
- Use VPN for secure access
- Consider NAT for internal services

### Configuration Examples

#### Nginx Proxy Configuration

```nginx
upstream backend {
    server 172.16.24.136:3001;  # Use private range instead
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Firewall Rules (iptables)

```bash
# Allow specific IP access
iptables -A INPUT -s 172.16.24.136 -p tcp --dport 3001 -j ACCEPT

# Block external access to internal service
iptables -A INPUT -d 172.16.24.136 -i eth0 -j DROP
```

#### Docker Compose Configuration

```yaml
version: '3.8'
services:
  dashboard:
    image: fire22/dashboard:latest
    networks:
      internal:
        ipv4_address: 172.16.24.136
    ports:
      - '3001:3001'

networks:
  internal:
    driver: bridge
    ipam:
      config:
        - subnet: 172.16.24.0/24
```

### Network Diagnostics

Test connectivity:

```bash
# Ping test
ping 172.56.24.136

# Traceroute
traceroute 172.56.24.136

# Port scan
nmap -p 3001 172.56.24.136

# DNS lookup
nslookup 172.56.24.136

# Check routing
ip route get 172.56.24.136
```

### Integration with Fire22 Dashboard

For Fire22 Dashboard configuration:

```typescript
// config/network.ts
export const networkConfig = {
  // Use private range for internal services
  internal: {
    api: process.env.INTERNAL_API || '172.16.24.136',
    database: process.env.DATABASE_HOST || '172.16.24.137',
    cache: process.env.CACHE_HOST || '172.16.24.138',
  },

  // Public endpoints
  public: {
    dashboard: 'https://dashboard.fire22.ag',
    api: 'https://api.fire22.ag',
  },
};
```

### Monitoring Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'fire22-dashboard'
    static_configs:
      - targets: ['172.16.24.136:9090']
        labels:
          service: 'dashboard'
          environment: 'production'
```

---

Network Configuration v2.0.0 | Fire22 Dashboard Worker
