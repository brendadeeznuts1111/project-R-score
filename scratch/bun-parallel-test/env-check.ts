// Check what environment variables Bun sets for parallel/sequential runs
console.log("[env] === Environment Variables ===");
const interesting = Object.entries(process.env)
  .filter(([k]) => k.startsWith("BUN") || k.startsWith("npm_"))
  .sort(([a], [b]) => a.localeCompare(b));

for (const [key, value] of interesting) {
  console.log(`[env] ${key}=${value}`);
}
console.log(`[env] PID: ${process.pid}`);
