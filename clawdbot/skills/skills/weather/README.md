# Weather Forecast Skill

Get current weather conditions and forecasts for any location worldwide.

## Installation

```bash
# Via npm (downloads executable from R2)
bun install @skill/weather

# Or run directly
bun run src/index.ts
```

## Usage

```bash
# Get current weather
weather current "New York"
weather current Tokyo

# Get forecast (1-3 days)
weather forecast London 3
weather forecast Paris

# Simple one-line output
weather simple Berlin

# JSON output
weather current "San Francisco" --json
```

## Commands

| Command | Description |
|---------|-------------|
| `current <location>` | Get current weather conditions |
| `forecast <location> [days]` | Get weather forecast (1-3 days) |
| `simple <location>` | Simple one-line output |

## Options

| Option | Description |
|--------|-------------|
| `--json, -j` | Output as JSON |
| `--help, -h` | Show help |
| `--version, -v` | Show version |

## Example Output

```
==================================================
  Weather for New York, United States of America
==================================================
  Condition:   Partly cloudy
  Temperature: 22°C / 72°F
  Feels Like:  24°C / 75°F
  Humidity:    65%
  Wind:        15 km/h NW
  UV Index:    5
  Visibility:  10 km
  Pressure:    1015 mb
==================================================
```

## API

This skill uses the free [wttr.in](https://wttr.in) API. No API key required.

## License

MIT
