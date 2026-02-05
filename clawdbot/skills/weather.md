---
name: weather
description: Get current weather, forecasts, and alerts
metadata: {"clawdbot":{"emoji":"🌤️","os":["darwin","linux"]}}
---

# Weather Skill

Fetch weather data from free APIs.

## Quick Commands

| Request | Action |
|---------|--------|
| "weather" | Current conditions (auto-location) |
| "weather in [city]" | Weather for specific city |
| "forecast" | 5-day forecast |
| "rain today?" | Precipitation check |
| "sunrise/sunset" | Sun times |

## Open-Meteo API (Free, no key required)

### Current Weather
```bash
# By coordinates (San Francisco)
curl -s "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit"

# With more details
curl -s "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph"
```

### Forecast
```bash
# 7-day forecast
curl -s "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto"

# Hourly forecast (next 24h)
curl -s "https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&hourly=temperature_2m,precipitation_probability,weather_code&forecast_hours=24&temperature_unit=fahrenheit"
```

## Geocoding (City to Coordinates)

```bash
# Open-Meteo Geocoding
curl -s "https://geocoding-api.open-meteo.com/v1/search?name=San+Francisco&count=1"

# Extract coords with jq
curl -s "https://geocoding-api.open-meteo.com/v1/search?name=London&count=1" | \
  jq -r '.results[0] | "\(.latitude),\(.longitude)"'
```

## Weather Codes

| Code | Condition |
|------|-----------|
| 0 | Clear sky |
| 1-3 | Partly cloudy |
| 45-48 | Fog |
| 51-55 | Drizzle |
| 61-65 | Rain |
| 71-75 | Snow |
| 80-82 | Rain showers |
| 95-99 | Thunderstorm |

## wttr.in (Terminal-friendly)

```bash
# Simple text output
curl -s "wttr.in/SanFrancisco?format=3"
# Output: San Francisco: ⛅️ +61°F

# Detailed (1 day)
curl -s "wttr.in/SanFrancisco?1"

# Custom format
curl -s "wttr.in/SanFrancisco?format=%l:+%c+%t+%w"
# Output: San Francisco: ⛅️ +61°F →7mph

# Just temperature
curl -s "wttr.in/SanFrancisco?format=%t"

# JSON output
curl -s "wttr.in/SanFrancisco?format=j1"
```

### wttr.in Format Codes
| Code | Meaning |
|------|---------|
| %c | Weather condition emoji |
| %t | Temperature |
| %f | Feels like |
| %h | Humidity |
| %w | Wind |
| %l | Location |
| %m | Moon phase |
| %S | Sunrise |
| %s | Sunset |

## Air Quality

```bash
# Open-Meteo Air Quality
curl -s "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.77&longitude=-122.42&current=us_aqi,pm10,pm2_5"
```

## Response Format

### Current Weather
```
[City], [Country]
[Emoji] [Condition]

Temperature: XX°F (feels like XX°F)
Humidity: XX%
Wind: XX mph [Direction]
UV Index: X

Sun: ↑ 6:45 AM  ↓ 7:30 PM
```

### Forecast
```
[City] 5-Day Forecast

Day        High   Low    Conditions
─────────────────────────────────────
Today      72°F   58°F   ☀️ Sunny
Tomorrow   68°F   55°F   ⛅ Partly cloudy
Wed        65°F   52°F   🌧️ Rain likely
Thu        70°F   54°F   ☀️ Clear
Fri        74°F   56°F   ☀️ Sunny
```

## Example Interactions

**User:** "What's the weather?"
```
San Francisco, CA
☀️ Clear

Temperature: 68°F (feels like 65°F)
Humidity: 55%
Wind: 12 mph W
UV Index: 6 (High)

Sun: ↑ 7:02 AM  ↓ 5:21 PM
```

**User:** "Weather in Tokyo"
```
Tokyo, Japan
🌧️ Light Rain

Temperature: 52°F (feels like 48°F)
Humidity: 78%
Wind: 8 mph NE
Precipitation: 0.1 in

Sun: ↑ 6:48 AM  ↓ 4:47 PM
```

**User:** "Will it rain today?"
```
San Francisco - Rain Forecast

Today: 10% chance of rain
  Morning: 5%
  Afternoon: 10%
  Evening: 15%

Verdict: Unlikely to rain. Leave the umbrella.
```

**User:** "5 day forecast"
```
San Francisco 5-Day Forecast

         High   Low    Rain%  Conditions
─────────────────────────────────────────
Mon      72°F   58°F    5%   ☀️ Sunny
Tue      68°F   55°F   15%   ⛅ Clouds
Wed      65°F   52°F   60%   🌧️ Showers
Thu      62°F   50°F   40%   🌦️ Clearing
Fri      70°F   54°F    5%   ☀️ Clear
```

## Get Current Location (macOS)

```bash
# Using CoreLocation (requires permission)
# Or fall back to IP-based geolocation

curl -s "https://ipinfo.io/json" | jq -r '"\(.city), \(.region)"'
```

## Environment Variables

```bash
# Default location (lat,lon)
export WEATHER_LAT="37.77"
export WEATHER_LON="-122.42"
export WEATHER_CITY="San Francisco"
```

## Triggers

Respond to:
- "weather", "what's the weather"
- "weather in [city]"
- "forecast", "5 day forecast"
- "will it rain", "rain today"
- "temperature"
- "sunrise", "sunset"
- "humidity"
- "wind speed"
- "air quality", "AQI"
