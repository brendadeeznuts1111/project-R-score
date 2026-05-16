#!/usr/bin/env bun
/**
 * Weather Forecast Skill
 * Get current weather and forecasts for any location
 * Uses wttr.in API (free, no API key required)
 */

const VERSION = "1.0.0";

// =============================================================================
// Types
// =============================================================================

interface WeatherData {
  location: string;
  temperature: string;
  feelsLike: string;
  condition: string;
  humidity: string;
  wind: string;
  uvIndex: string;
  visibility: string;
  pressure: string;
}

interface ForecastDay {
  date: string;
  maxTemp: string;
  minTemp: string;
  condition: string;
  chanceOfRain: string;
  sunrise: string;
  sunset: string;
}

// =============================================================================
// CLI Help
// =============================================================================

const HELP = `
Weather Forecast Skill v${VERSION}

Usage: weather <command> [options]

Commands:
  current <location>           Get current weather
  forecast <location> [days]   Get weather forecast (1-3 days)
  simple <location>            Simple one-line output

Options:
  --json, -j          Output as JSON
  --units <c|f>       Temperature units (default: c)
  --help, -h          Show this help
  --version, -v       Show version

Examples:
  weather current "New York"
  weather current Tokyo --units f
  weather forecast London 3
  weather simple Paris --json

Powered by wttr.in
`;

// =============================================================================
// API Functions
// =============================================================================

async function fetchWeather(location: string): Promise<any> {
  const encoded = encodeURIComponent(location);
  const url = `https://wttr.in/${encoded}?format=j1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "curl/7.64.1",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status}`);
  }

  const data = await response.json();

  // Validate response has required fields
  if (!data.current_condition && !data.weather) {
    throw new Error("Invalid response from weather API");
  }

  return data;
}

function parseCurrentWeather(data: any): WeatherData {
  const area = data.nearest_area?.[0];
  const location = area
    ? `${area.areaName[0].value}, ${area.country[0].value}`
    : "Unknown Location";

  // Use current_condition if available, otherwise use first hour of today's weather
  if (data.current_condition?.[0]) {
    const current = data.current_condition[0];
    return {
      location,
      temperature: `${current.temp_C}°C / ${current.temp_F}°F`,
      feelsLike: `${current.FeelsLikeC}°C / ${current.FeelsLikeF}°F`,
      condition: current.weatherDesc[0].value,
      humidity: `${current.humidity}%`,
      wind: `${current.windspeedKmph} km/h ${current.winddir16Point}`,
      uvIndex: current.uvIndex,
      visibility: `${current.visibility} km`,
      pressure: `${current.pressure} mb`,
    };
  }

  // Fallback to weather forecast data
  const hourly = data.weather?.[0]?.hourly?.[0];
  if (hourly) {
    return {
      location,
      temperature: `${hourly.tempC}°C / ${hourly.tempF}°F`,
      feelsLike: `${hourly.FeelsLikeC}°C / ${hourly.FeelsLikeF}°F`,
      condition: hourly.weatherDesc?.[0]?.value || "Unknown",
      humidity: `${hourly.humidity}%`,
      wind: `${hourly.windspeedKmph} km/h ${hourly.winddir16Point}`,
      uvIndex: hourly.uvIndex || "N/A",
      visibility: `${hourly.visibility} km`,
      pressure: `${hourly.pressure} mb`,
    };
  }

  throw new Error("Unable to parse weather data");
}

function parseForecast(data: any, days: number): ForecastDay[] {
  return data.weather.slice(0, days).map((day: any) => ({
    date: day.date,
    maxTemp: `${day.maxtempC}°C / ${day.maxtempF}°F`,
    minTemp: `${day.mintempC}°C / ${day.mintempF}°F`,
    condition: day.hourly[4]?.weatherDesc[0]?.value || "Unknown",
    chanceOfRain: `${day.hourly[4]?.chanceofrain || 0}%`,
    sunrise: day.astronomy[0].sunrise,
    sunset: day.astronomy[0].sunset,
  }));
}

// =============================================================================
// Display Functions
// =============================================================================

function displayCurrentWeather(weather: WeatherData): void {
  console.log("\n" + "=".repeat(50));
  console.log(`  Weather for ${weather.location}`);
  console.log("=".repeat(50));
  console.log(`  Condition:   ${weather.condition}`);
  console.log(`  Temperature: ${weather.temperature}`);
  console.log(`  Feels Like:  ${weather.feelsLike}`);
  console.log(`  Humidity:    ${weather.humidity}`);
  console.log(`  Wind:        ${weather.wind}`);
  console.log(`  UV Index:    ${weather.uvIndex}`);
  console.log(`  Visibility:  ${weather.visibility}`);
  console.log(`  Pressure:    ${weather.pressure}`);
  console.log("=".repeat(50) + "\n");
}

function displayForecast(location: string, forecast: ForecastDay[]): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${forecast.length}-Day Forecast for ${location}`);
  console.log("=".repeat(60));

  for (const day of forecast) {
    console.log(`\n  ${day.date}`);
    console.log("  " + "-".repeat(40));
    console.log(`    Condition:     ${day.condition}`);
    console.log(`    High:          ${day.maxTemp}`);
    console.log(`    Low:           ${day.minTemp}`);
    console.log(`    Rain Chance:   ${day.chanceOfRain}`);
    console.log(`    Sunrise:       ${day.sunrise}`);
    console.log(`    Sunset:        ${day.sunset}`);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

function displaySimple(weather: WeatherData): void {
  console.log(`${weather.location}: ${weather.condition}, ${weather.temperature}`);
}

// =============================================================================
// Commands
// =============================================================================

async function currentCommand(location: string, options: { json?: boolean }): Promise<void> {
  try {
    const data = await fetchWeather(location);
    const weather = parseCurrentWeather(data);

    if (options.json) {
      console.log(JSON.stringify(weather, null, 2));
    } else {
      displayCurrentWeather(weather);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function forecastCommand(
  location: string,
  days: number,
  options: { json?: boolean }
): Promise<void> {
  try {
    const data = await fetchWeather(location);
    const forecast = parseForecast(data, Math.min(days, 3));
    const area = data.nearest_area[0];
    const locationName = `${area.areaName[0].value}, ${area.country[0].value}`;

    if (options.json) {
      console.log(JSON.stringify({ location: locationName, forecast }, null, 2));
    } else {
      displayForecast(locationName, forecast);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function simpleCommand(location: string, options: { json?: boolean }): Promise<void> {
  try {
    const data = await fetchWeather(location);
    const weather = parseCurrentWeather(data);

    if (options.json) {
      console.log(JSON.stringify({ location: weather.location, condition: weather.condition, temperature: weather.temperature }));
    } else {
      displaySimple(weather);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    json: args.includes("--json") || args.includes("-j"),
    help: args.includes("--help") || args.includes("-h"),
    version: args.includes("--version") || args.includes("-v"),
  };

  // Filter out option flags to get positional args
  const positionals = args.filter(
    (arg) => !arg.startsWith("-") && !["c", "f"].includes(arg)
  );

  if (options.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(0);
  }

  if (options.version) {
    console.log(VERSION);
    process.exit(0);
  }

  const command = positionals[0];
  const location = positionals[1];

  if (!location && command !== "help") {
    console.error("Error: Location is required");
    console.log(HELP);
    process.exit(1);
  }

  switch (command) {
    case "current":
      await currentCommand(location, options);
      break;

    case "forecast":
      const days = parseInt(positionals[2] || "3", 10);
      await forecastCommand(location, days, options);
      break;

    case "simple":
      await simpleCommand(location, options);
      break;

    default:
      // Treat first arg as location for quick lookup
      await currentCommand(command, options);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
