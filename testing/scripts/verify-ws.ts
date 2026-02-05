const ws = new WebSocket("ws://localhost:4000");

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ type: "subscribe_metrics" }));
};

ws.onmessage = (event) => {
  console.log("Message received:", JSON.parse(event.data).type);
  process.exit(0);
};

ws.onerror = (err) => {
  console.error("Error:", err);
  process.exit(1);
};

setTimeout(() => {
  console.log("Timeout");
  process.exit(1);
}, 5000);
