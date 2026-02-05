---
name: system-control
description: Execute shell commands and manage system processes on the local machine
metadata: {"clawdbot":{"emoji":"🖥️","os":["darwin","linux"],"requires":{"bins":["bash"]}}}
---

# System Control Skill

Execute shell commands and manage processes on the host machine. Use with caution.

## Quick Commands

Use these shortcuts for common tasks:

| Request | Command |
|---------|---------|
| "disk space" | `df -h` |
| "memory" | `vm_stat` (macOS) / `free -h` (Linux) |
| "cpu load" | `uptime` |
| "processes" | `ps aux \| head -20` |
| "ports in use" | `lsof -i -P \| grep LISTEN` |
| "my ip" | `curl -s ifconfig.me` |
| "local ip" | `ipconfig getifaddr en0` |
| "who am i" | `whoami && hostname && pwd` |
| "env" | `env \| sort` |
| "wifi status" | `networksetup -getairportnetwork en0` |
| "wifi signal" | `airport -I \| grep -E "SSID\|RSSI"` |
| "dns servers" | `scutil --dns \| grep nameserver` |
| "routing table" | `netstat -rn` |
| "connections" | `netstat -an \| grep ESTABLISHED` |
| "network speed" | `networkQuality` (macOS 12+) |
| "check ssl" | `openssl s_client -connect host:443` |
| "ping test" | `ping -c 3 google.com` |
| "traceroute" | `traceroute google.com` |
| "arp table" | `arp -a` |

## Capabilities

### Process Management
```bash
# Find processes by name
pgrep -fl "pattern"
ps aux | grep -i "pattern"

# Process tree
pstree -p <pid>  # Linux
ps -p <pid> -o pid,ppid,command  # macOS

# Kill process (always confirm first)
kill <pid>       # graceful
kill -9 <pid>    # force

# Kill by name
pkill -f "pattern"
killall "name"
```

### System Resources
```bash
# Disk
df -h                    # disk usage
du -sh /path/*           # directory sizes
ls -lah /path            # file sizes

# Memory (macOS)
vm_stat
top -l 1 | head -15

# Memory (Linux)
free -h
cat /proc/meminfo

# CPU
uptime                   # load average
top -l 1 -n 5 | tail -5  # top processes (macOS)
```

### Network

#### Interfaces & Configuration
```bash
# List interfaces
ifconfig -a                      # all interfaces
networksetup -listallhardwareports  # macOS hardware ports
ipconfig getifaddr en0           # WiFi IP (macOS)
ipconfig getifaddr en1           # Ethernet IP

# Interface details
ifconfig en0                     # specific interface
networksetup -getinfo "Wi-Fi"    # WiFi config (macOS)

# MAC addresses
ifconfig | grep ether
networksetup -getmacaddress Wi-Fi
```

#### IP Addresses
```bash
# Local IPs
ipconfig getifaddr en0           # WiFi (macOS)
hostname -I                      # all local IPs (Linux)

# Public IP
curl -s ifconfig.me
curl -s ipinfo.io/json           # with geolocation
curl -s https://api.ipify.org
dig +short myip.opendns.com @resolver1.opendns.com
```

#### Connections & Ports
```bash
# Listening ports
lsof -i -P | grep LISTEN
netstat -an | grep LISTEN
sudo lsof -iTCP -sTCP:LISTEN -P  # all TCP listeners

# Active connections
netstat -an | grep ESTABLISHED
lsof -i -P | grep ESTABLISHED

# Specific port
lsof -i :3000                    # what's on port 3000
lsof -i :80,443                  # multiple ports

# By process
lsof -i -P | grep node
lsof -i -a -p <pid>              # ports for specific PID
```

#### DNS & Resolution
```bash
# DNS lookup
dig google.com                   # full DNS query
dig +short google.com            # just the IP
dig MX google.com                # mail servers
dig NS google.com                # name servers
dig ANY google.com               # all records
nslookup google.com

# Reverse lookup
dig -x 8.8.8.8

# DNS servers in use
scutil --dns | grep nameserver   # macOS
cat /etc/resolv.conf             # Linux

# Flush DNS cache
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder  # macOS
```

#### Connectivity Testing
```bash
# Ping
ping -c 3 google.com             # 3 pings
ping -c 1 -W 1 host              # quick check (1s timeout)

# Traceroute
traceroute google.com
traceroute -n google.com         # no DNS resolution

# TCP connectivity
nc -zv host port                 # check if port is open
nc -zv google.com 443            # test HTTPS port
timeout 3 bash -c "</dev/tcp/host/port" && echo "open"

# HTTP check
curl -I https://google.com       # headers only
curl -o /dev/null -s -w "%{http_code}" https://url  # just status code
curl -w "time_total: %{time_total}s\n" -o /dev/null -s https://url
```

#### WiFi (macOS)
```bash
# Current network
networksetup -getairportnetwork en0
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I

# Signal strength & info
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I | grep -E "SSID|BSSID|RSSI|channel"

# Available networks
/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s

# WiFi on/off
networksetup -setairportpower en0 off
networksetup -setairportpower en0 on

# Saved networks
networksetup -listpreferredwirelessnetworks en0
```

#### Routing
```bash
# Route table
netstat -rn                      # routing table
route -n get default             # default gateway (macOS)
ip route                         # Linux

# Add/delete routes (requires sudo)
sudo route add -net 10.0.0.0/8 gateway
sudo route delete -net 10.0.0.0/8
```

#### ARP & Neighbors
```bash
# ARP table
arp -a                           # all entries
arp -an                          # no hostname resolution

# Clear ARP (requires sudo)
sudo arp -d hostname
```

#### Firewall (macOS)
```bash
# Check status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps

# Stealth mode
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getstealthmode
```

#### Traffic & Bandwidth
```bash
# Interface statistics
netstat -ib                      # bytes in/out per interface
netstat -w 1                     # live traffic (1s intervals)

# Top network processes (macOS)
nettop -P -L 1                   # snapshot
sudo dtrace -n 'syscall::write:entry /pid == $target/ { @[execname] = sum(arg2); }'

# Test bandwidth (if speedtest-cli installed)
speedtest-cli --simple
curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -
```

#### SSL/TLS Inspection
```bash
# View certificate
openssl s_client -connect host:443 -servername host </dev/null 2>/dev/null | openssl x509 -text -noout

# Certificate expiry
echo | openssl s_client -connect host:443 -servername host 2>/dev/null | openssl x509 -noout -dates

# Test TLS versions
openssl s_client -connect host:443 -tls1_2
openssl s_client -connect host:443 -tls1_3

# Cipher suites
nmap --script ssl-enum-ciphers -p 443 host
```

#### HTTP Debugging
```bash
# Verbose request
curl -v https://url

# With timing
curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTotal: %{time_total}s\n" -o /dev/null -s https://url

# Follow redirects
curl -L -v https://url

# POST with data
curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' https://url

# With cookies
curl -c cookies.txt -b cookies.txt https://url
```

#### Network Diagnostics
```bash
# macOS Network Diagnostics
networkQuality                   # bandwidth test (macOS 12+)
networkQuality -v                # verbose

# Check for common issues
scutil --nwi                     # network info
scutil --proxy                   # proxy settings

# mDNS/Bonjour
dns-sd -B _services._dns-sd._udp  # browse services
dns-sd -B _http._tcp              # find HTTP services
```

### Service Management (macOS)
```bash
# List services
launchctl list | grep "pattern"
launchctl print gui/$(id -u)

# Manage services
launchctl start <label>
launchctl stop <label>
launchctl kickstart -k gui/$(id -u)/<label>

# Check if running
launchctl list | grep -i clawdbot
```

### Git Operations
```bash
# Status
git status
git log --oneline -10
git branch -a

# Safe operations
git diff
git show HEAD
git stash list
```

### Docker (if installed)
```bash
# List
docker ps
docker ps -a
docker images

# Logs
docker logs <container> --tail 50

# Stats
docker stats --no-stream
```

### Homebrew (macOS)
```bash
# Info
brew list
brew services list
brew outdated

# Safe operations
brew info <package>
brew deps <package>
```

### File Operations (read-only by default)
```bash
# List and find
ls -la /path
find /path -name "pattern" -type f
locate "pattern"

# Read (first 100 lines)
head -100 /path/file
tail -100 /path/file

# Search in files
grep -r "pattern" /path --include="*.ext"
```

## Safety Rules

### ALWAYS require confirmation for:
- Any `rm` command (especially with `-r` or `-f`)
- Any `kill` or `pkill` command
- Commands with `sudo`
- Commands modifying files in `/etc`, `/usr`, `/System`, `/Library`
- Commands that download and execute (`curl | bash`, `wget | sh`)

### NEVER execute:
- `rm -rf /` or any variant
- `chmod -R 777 /`
- `mkfs` or format commands
- `dd if=/dev/zero of=/dev/...`
- Fork bombs (`: () { : | : & }; :`)
- Reverse shells or bind shells
- Crypto miners
- Mass network scanning

### Command sanitization:
- Reject commands with `;` followed by destructive operations
- Reject commands piping to `rm`, `dd`, or `shred`
- Reject commands with backticks containing untrusted input
- Timeout long-running commands: `timeout 30 command`

## Response Format

Always structure responses like this:

```
Command: <exact command executed>
Exit code: <0 for success, non-zero for error>
Duration: <execution time>

Output:
<command output, truncated to 50 lines if needed>

[If truncated] Showing first 50 of N lines. Run with `| tail -50` to see end.
```

For errors:
```
Command: <command>
Exit code: <code>
Error: <error message>
Suggestion: <how to fix or alternative command>
```

## Example Interactions

**User:** "Check what's using port 3000"
```
Command: lsof -i :3000
Exit code: 0

Output:
COMMAND   PID      USER   FD   TYPE    SIZE/OFF NODE NAME
node    12345  nolarose   23u  IPv4   0x1234   TCP *:3000 (LISTEN)

Process: node (PID 12345) is listening on port 3000
```

**User:** "Kill that process"
```
Found: node (PID 12345) on port 3000

⚠️ Confirm: Kill process 12345 (node)?
Reply "yes" or "kill 12345" to proceed.
```

**User:** "How much disk space is left?"
```
Command: df -h /
Exit code: 0

Output:
Filesystem      Size   Used  Avail Capacity  Mounted on
/dev/disk1s1   466Gi  234Gi  220Gi    52%    /

Summary: 220GB available (48% free) on main disk
```

**User:** "Show me running docker containers"
```
Command: docker ps
Exit code: 0

Output:
CONTAINER ID   IMAGE          STATUS         PORTS                    NAMES
a1b2c3d4       postgres:15    Up 2 hours     0.0.0.0:5432->5432/tcp   db
e5f6g7h8       redis:7        Up 2 hours     0.0.0.0:6379->6379/tcp   cache

2 containers running
```

**User:** "What's my IP?"
```
Command: curl -s ifconfig.me && echo && ipconfig getifaddr en0
Exit code: 0

Output:
Public IP:  203.45.67.89
Local IP:   192.168.1.42
```

**User:** "WiFi signal strength"
```
Command: /System/Library/.../airport -I | grep -E "SSID|RSSI|channel"
Exit code: 0

Output:
           SSID: HomeNetwork
           RSSI: -52
        channel: 36

Signal: Excellent (-52 dBm)
  -30 to -50: Excellent
  -50 to -60: Good
  -60 to -70: Fair
  -70 to -80: Weak
```

**User:** "Check if google.com is reachable"
```
Command: ping -c 3 google.com
Exit code: 0

Output:
PING google.com (142.250.80.46): 56 data bytes
64 bytes from 142.250.80.46: icmp_seq=0 ttl=117 time=12.4 ms
64 bytes from 142.250.80.46: icmp_seq=1 ttl=117 time=11.8 ms
64 bytes from 142.250.80.46: icmp_seq=2 ttl=117 time=12.1 ms

--- google.com ping statistics ---
3 packets transmitted, 3 packets received, 0.0% packet loss
round-trip min/avg/max = 11.8/12.1/12.4 ms

Status: Reachable (avg 12.1ms latency)
```

**User:** "Check SSL cert for api.example.com"
```
Command: echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates -subject
Exit code: 0

Output:
subject=CN = api.example.com
notBefore=Jan  1 00:00:00 2026 GMT
notAfter=Apr  1 23:59:59 2026 GMT

Certificate: Valid
Expires: April 1, 2026 (77 days remaining)
```

**User:** "Run a network speed test"
```
Command: networkQuality
Exit code: 0

Output:
==== SUMMARY ====
Upload capacity: 234.567 Mbps
Download capacity: 456.789 Mbps
Upload Responsiveness: 1234 RPM
Download Responsiveness: 2345 RPM

Summary: Download 457 Mbps / Upload 235 Mbps
Latency: Excellent
```

## Environment Info

When asked about system info, gather:
```bash
# System
uname -a
sw_vers  # macOS version

# User
whoami
id
groups

# Shell
echo $SHELL
echo $PATH | tr ':' '\n'

# Key directories
echo "Home: $HOME"
echo "PWD: $(pwd)"
echo "Temp: ${TMPDIR:-/tmp}"
```

## Triggers

Respond to:
- "run command", "execute", "shell"
- "check disk", "disk space", "storage"
- "memory usage", "ram", "free memory"
- "running processes", "what's running"
- "kill process", "stop process"
- "port in use", "what's on port X"
- "system info", "uptime", "load"
- "docker ps", "containers"
- "git status", "git log"
- "brew list", "homebrew"
- "my ip", "public ip", "local ip"
- "wifi status", "wifi signal", "wifi networks"
- "network connections", "established connections"
- "dns servers", "dns lookup", "dig"
- "ping", "traceroute", "connectivity"
- "routing table", "routes", "gateway"
- "arp table", "neighbors"
- "ssl certificate", "check ssl", "cert expiry"
- "network speed", "bandwidth test"
- "firewall status"
- "network interfaces", "ifconfig"
