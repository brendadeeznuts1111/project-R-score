import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";

const h2Server = createSecureServer({
  key: readFileSync("key.pem"),
  cert: readFileSync("cert.pem"),
});

h2Server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  // Forward the raw TCP connection to the HTTP/2 server
  h2Server.emit("connection", rawSocket);
});

netServer.listen(8443, () => {
  console.log("Listening on port 8443");
});
