// HTTP fetch benchmarks
import { bench, group, execute } from "./runner";

const LOCAL_API = "http://localhost:3000/api";
const BACKEND_API = "http://localhost:8000";

// Check if servers are running
async function checkServer(url: string, name: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    console.log(`✓ ${name} is running`);
    return true;
  } catch {
    console.log(`✗ ${name} not available at ${url}`);
    return false;
  }
}

const nextRunning = await checkServer(`${LOCAL_API}/trades`, "Next.js");
const backendRunning = await checkServer(`${BACKEND_API}/test`, "Python backend");

if (nextRunning) {
  group("Next.js API Routes", () => {
    bench("GET /api/trades (single)", async () => {
      await fetch(`${LOCAL_API}/trades`).then((r) => r.json());
    });

    bench("GET /api/trades x10 (sequential)", async () => {
      for (let i = 0; i < 10; i++) {
        await fetch(`${LOCAL_API}/trades`).then((r) => r.json());
      }
    });

    bench("GET /api/trades x10 (parallel)", async () => {
      await Promise.all(
        Array.from({ length: 10 }, () =>
          fetch(`${LOCAL_API}/trades`).then((r) => r.json())
        )
      );
    });
  });
}

if (backendRunning) {
  group("Python Backend", () => {
    bench("GET /test (health check)", async () => {
      await fetch(`${BACKEND_API}/test`).then((r) => r.json());
    });
  });
}

// External API simulation (using example.com as safe target)
group("External fetch", () => {
  bench("fetch example.com", async () => {
    await fetch("https://example.com").then((r) => r.text());
  });

  bench("fetch example.com x5 parallel", async () => {
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetch(`https://example.com/?cb=${i}`).then((r) => r.text())
      )
    );
  });
});

// JSON parsing benchmarks
const sampleTrades = Array.from({ length: 1000 }, (_, i) => ({
  id: `trade-${i}`,
  symbol: "XBTUSD",
  side: i % 2 === 0 ? "buy" : "sell",
  price: 50000 + Math.random() * 1000,
  amount: Math.floor(Math.random() * 10000),
  timestamp: new Date().toISOString(),
}));

const jsonString = JSON.stringify(sampleTrades);

group("JSON operations", () => {
  bench("JSON.stringify (1000 trades)", () => {
    JSON.stringify(sampleTrades);
  });

  bench("JSON.parse (1000 trades)", () => {
    JSON.parse(jsonString);
  });

  bench("Response simulation (stringify + parse)", () => {
    JSON.parse(JSON.stringify(sampleTrades));
  });
});

await execute();
