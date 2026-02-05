---
name: home-automation
description: Control smart home devices - Hue lights, Sonos speakers, cameras
metadata: {"clawdbot":{"emoji":"🏠","os":["darwin","linux"]}}
---

# Home Automation Skill

Control smart home devices via local network APIs.

## Quick Commands

| Request | Action |
|---------|--------|
| "lights on/off" | Toggle all lights |
| "dim lights" | Set brightness to 30% |
| "bright lights" | Set brightness to 100% |
| "red lights" | Change color to red |
| "play music" | Start Sonos playback |
| "pause music" | Pause Sonos |
| "volume up/down" | Adjust Sonos volume |

## Philips Hue

### Discovery
```bash
# Find bridge IP (mDNS)
dns-sd -B _hue._tcp local.
# Or check router DHCP leases

# Get API key (press bridge button first)
curl -X POST http://<bridge>/api -d '{"devicetype":"clawdbot#mac"}'
```

### Light Control
```bash
HUE_BRIDGE="192.168.1.x"
HUE_KEY="your-api-key"

# List all lights
curl "http://$HUE_BRIDGE/api/$HUE_KEY/lights"

# Turn on light 1
curl -X PUT "http://$HUE_BRIDGE/api/$HUE_KEY/lights/1/state" \
  -d '{"on":true}'

# Set brightness (0-254)
curl -X PUT "http://$HUE_BRIDGE/api/$HUE_KEY/lights/1/state" \
  -d '{"bri":200}'

# Set color (hue: 0-65535, sat: 0-254)
curl -X PUT "http://$HUE_BRIDGE/api/$HUE_KEY/lights/1/state" \
  -d '{"hue":46920,"sat":254}'  # Blue

# All lights off
curl -X PUT "http://$HUE_BRIDGE/api/$HUE_KEY/groups/0/action" \
  -d '{"on":false}'
```

### Color Presets
| Color | Hue Value |
|-------|-----------|
| Red | 0 |
| Orange | 6000 |
| Yellow | 12750 |
| Green | 25500 |
| Blue | 46920 |
| Purple | 56100 |
| Pink | 56000 |

### Scenes
```bash
# List scenes
curl "http://$HUE_BRIDGE/api/$HUE_KEY/scenes"

# Activate scene
curl -X PUT "http://$HUE_BRIDGE/api/$HUE_KEY/groups/0/action" \
  -d '{"scene":"ABC123"}'
```

## Sonos

### Discovery
```bash
# Find Sonos devices (UPnP)
# Usually at 192.168.1.x:1400

# Get device info
curl "http://<sonos>:1400/status/zp"
```

### Playback Control
```bash
SONOS="192.168.1.x"

# Play
curl -X POST "http://$SONOS:1400/MediaRenderer/AVTransport/Control" \
  -H "Content-Type: text/xml" \
  -H "SOAPACTION: urn:schemas-upnp-org:service:AVTransport:1#Play" \
  -d '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play></s:Body></s:Envelope>'

# Pause
curl -X POST "http://$SONOS:1400/MediaRenderer/AVTransport/Control" \
  -H "Content-Type: text/xml" \
  -H "SOAPACTION: urn:schemas-upnp-org:service:AVTransport:1#Pause" \
  -d '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:Pause xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:Pause></s:Body></s:Envelope>'
```

### Volume Control
```bash
# Set volume (0-100)
curl -X POST "http://$SONOS:1400/MediaRenderer/RenderingControl/Control" \
  -H "Content-Type: text/xml" \
  -H "SOAPACTION: urn:schemas-upnp-org:service:RenderingControl:1#SetVolume" \
  -d '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>30</DesiredVolume></u:SetVolume></s:Body></s:Envelope>'
```

### Using sonoscli (if installed)
```bash
# List devices
sonoscli list

# Play/pause
sonoscli play
sonoscli pause

# Volume
sonoscli volume 50
sonoscli volume +10
sonoscli volume -10

# Now playing
sonoscli now
```

## Cameras (Generic IP Cameras)

### RTSP Streams
```bash
# Capture snapshot (ffmpeg)
ffmpeg -i "rtsp://user:pass@camera:554/stream" -frames:v 1 snapshot.jpg

# Record clip
ffmpeg -i "rtsp://user:pass@camera:554/stream" -t 10 -c copy clip.mp4
```

### ONVIF Discovery
```bash
# Most IP cameras support ONVIF
# Default ports: 80, 8080, 554 (RTSP)
```

## Response Format

When controlling devices:
```
Action: [what was done]
Device: [device name/ID]
Status: [success/failed]
Current state: [on/off, brightness, volume, etc.]
```

## Example Interactions

**User:** "Turn on the living room lights"
```
Action: Turn on lights
Device: Living Room (Group 1)
Status: Success
Current: On, 100% brightness, warm white
```

**User:** "Set lights to 50% blue"
```
Action: Set color and brightness
Device: All lights (Group 0)
Status: Success
Current: On, 50% brightness, blue (hue: 46920)
```

**User:** "Play some music"
```
Action: Resume playback
Device: Sonos Living Room
Status: Success
Now playing: [Current track info if available]
```

## Environment Variables

For easier scripting, set these in ~/.profile or config:
```bash
export HUE_BRIDGE="192.168.1.x"
export HUE_KEY="your-api-key"
export SONOS_IP="192.168.1.x"
```

## Triggers

Respond to:
- "lights on/off", "turn on/off lights"
- "dim lights", "bright lights"
- "set lights to X%"
- "red/blue/green/warm lights"
- "play/pause/stop music"
- "volume up/down"
- "what's playing"
- "goodnight" (lights off, music off)
- "movie mode" (dim lights)
