import { describe, expect, test } from 'bun:test';
import { createServer as createNetServer, type Server as NetServer } from 'node:net';
import {
  connect as connectHttp2,
  createSecureServer,
  type ClientHttp2Session,
  type Http2SecureServer,
  type IncomingHttpHeaders,
} from 'node:http2';

const KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDU0Lso+DrQvIhm
5rHv81E6zb8PcpSD6msrwXTiq8yahVliDGsjgMJzXHaQgltxJmiCVqAiZ3sccEJm
IQ/CT65NCDY+Hy2u7cTuBiRx/sPZ86EtoGQ3ZNBwpgjPiogfyLm0dxUr/qGfTFBO
oKKqCo0Zn337C1baEqDFDBoBjDVvKnTGK4W8O4IVOQKJiTgX10kw4T0ffU0B9J5s
ewQMmc8eziaC3jsLZDeFanSTSfQXFjMpBYVNtPYvcTkSgtNjSgkYvl1gDjTBU+3Y
kBKlCIHuzkr6W+MVRKhki7yLR3w8z4Rx9Dc7s8WRJ4maDBe8aaxlNxopH86Kn3gX
Y0g2ys3tAgMBAAECggEBAKDl8ysFigo5EHOkJZHCB38LAVHfkjOuLzrUt9eMhlOp
UCvWMcaU2e84UBfvxszkeg1ZCxcX37dflIP8qRqC/cgV1lTfY72m3MYM9M8PC+oj
zY9efYZ3/TO+BFlNZp+JNgYgJmytxmpW2zynLHSdJ5Lgx/He39peTRjNjnfvFpMl
RujceJqiJ9OISDlSFzVUhjtnDcsAazgPE0oZo9Styu93t+GUusn3b5FX01KSE6/f
92cXxAJaeHY8Hqu2OUackxKAF7+V0H+UAxIs1qWbPf+NGDZMPD4Ji4cMQRfK5AZR
kiqnZer2gHT+y7IXpxORFYnpfbXuIILwLWOeleTnvoECgYEA/1E3d/q9YaFz8bgR
vszojqzdYgDPsEozDundpBaDcPTdhKkpLXss+FNaDH9YHunO6oQMWdYDJ6t/6w+M
aa6Bmdu8KlQl2FX+pehHZ/Bh/HlmFtu9QndUZPHXOh1xrGBi1J6tAdAFNDU9Ajql
ouDl+W/DWmRW46Ohn/s4lk47Pg0CgYEA1WJrNBoQo4/BuBAutbVy10NWio6EvkMX
ujYWXzM8bqOHBRgZ5JAQl73v/4jqG3lSgmV65cJW0uNLXpOaJdVX+Yb3uGH4U0xW
Bt1BdyqgEKsrlHQ8/xo07gvVggKjfCqJDIieKjEV1fAeayiOEBJI5w8QFlfg/IvB
kvYVeRqxt2ECgYBlufZf14edXrbTmIN5gismrbmHUsttciLlzkiBGHdGikm4ka3W
cT15s7wtPo/dwUqwJezF3n9jTvGotok7kkwRAXv3YY+yopDTibjpsN1ZuwTyFptR
4Dm//pvCi/i+tairDo3gKwHny06DlNpqCzGWMPGlElWMXaYIGBBz0rfIAQKBgQCi
OvtKV27DC666ZAM/Pz6ajqWjHguqI5RMjIahxnBxpX4nz1UQQr96vntTCiMC1FB4
tvKi8AfWudw5gXq2vObv3T9FPabwnZ7iBSGamhur0JeHfIBLav9G5FRlTeBBrI0Z
rFyjs0Hor3BRBDpN2bj3gqo2coWpPA/lzZYxxqvKwQKBgQC1MpVaOOCn72iS6uuR
MOR/SLspGp/CDpVO+yVCi4L8bcDUEkcWJgXtuOfeAKqqff/58uDiXrMlOFOCkKVV
+0zEUS4wnJ5KtXRikDFG/2VYFrNwAneJCXKFQuZZBVaRHXBktl3orVAVxQb6z2tY
B0okCR0tXKmnsXbuGKFmWW+yQQ==
-----END PRIVATE KEY-----`;

const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQCaWBvqXw6dJDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjYwMjA5MDI1ODA1WhcNMzYwMjA3MDI1ODA1WjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDU
0Lso+DrQvIhm5rHv81E6zb8PcpSD6msrwXTiq8yahVliDGsjgMJzXHaQgltxJmiC
VqAiZ3sccEJmIQ/CT65NCDY+Hy2u7cTuBiRx/sPZ86EtoGQ3ZNBwpgjPiogfyLm0
dxUr/qGfTFBOoKKqCo0Zn337C1baEqDFDBoBjDVvKnTGK4W8O4IVOQKJiTgX10kw
4T0ffU0B9J5sewQMmc8eziaC3jsLZDeFanSTSfQXFjMpBYVNtPYvcTkSgtNjSgkY
vl1gDjTBU+3YkBKlCIHuzkr6W+MVRKhki7yLR3w8z4Rx9Dc7s8WRJ4maDBe8aaxl
NxopH86Kn3gXY0g2ys3tAgMBAAEwDQYJKoZIhvcNAQELBQADggEBALye19/ULIk+
LKghle8OaZadqCKfx49TKZ/G1BBPSTAEf0zr4ZpzhHe50BFbgbA957bHDoAcoEfB
7FA+MDaffe03l/2aCYZquZN2XeS5BJi+4UUi7oS+3mmEMzrwfDpSxbUgnwgXOqEV
oiqr77RwaY3eDDeavFheWptteI3LF5ykGnkqKwyH+FZf7K4Q4qi1uu6hwNuS/R2R
DYnN+DYkxX4ERkYMpHSqLR3xFjdqXLVRbl6mc8F8d/IcBMGm3J+2QJByJ4w6kMnX
53wVlWTGQ6oRn6XyhihKY1AoFvS3eEc1C6VT5kIINYPScT3HJILwNE4a3VH7F9gB
ps+U6tk6uHk=
-----END CERTIFICATE-----`;

function closeNetServer(server: NetServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function closeH2Server(server: Http2SecureServer): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function closeClient(client: ClientHttp2Session): Promise<void> {
  return new Promise((resolve) => {
    client.close(() => resolve());
  });
}

describe('node:http2 net.Server forwarding compatibility', () => {
  test(
    'supports forwarding raw socket via h2Server.emit("connection", socket)',
    async () => {
      const h2Server = createSecureServer({
        key: KEY_PEM,
        cert: CERT_PEM,
        allowHTTP1: false,
      });

      h2Server.on('stream', (stream) => {
        stream.respond({ ':status': 200, 'content-type': 'text/plain' });
        stream.end('Hello over HTTP/2!');
      });

      const netServer = createNetServer({ pauseOnConnect: true }, (rawSocket) => {
        h2Server.emit('connection', rawSocket);
        rawSocket.resume();
      });

      await new Promise<void>((resolve, reject) => {
        netServer.once('error', reject);
        netServer.listen(0, '127.0.0.1', () => resolve());
      });

      const address = netServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve listening address');
      }

      const client = connectHttp2(`https://127.0.0.1:${address.port}`, {
        rejectUnauthorized: false,
      });

      let statusCode: number | undefined;
      const chunks: Buffer[] = [];

      try {
        await new Promise<void>((resolve, reject) => {
          client.once('error', reject);
          client.once('connect', () => resolve());
        });

        await new Promise<void>((resolve, reject) => {
          const req = client.request({ ':path': '/' });
          req.on('response', (headers: IncomingHttpHeaders) => {
            const status = headers[':status'];
            statusCode = typeof status === 'number' ? status : Number(status);
          });
          req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
          req.on('error', reject);
          req.on('end', () => resolve());
          req.end();
        });
      } finally {
        await closeClient(client);
        await closeNetServer(netServer);
        await closeH2Server(h2Server);
      }

      expect(statusCode).toBe(200);
      expect(Buffer.concat(chunks).toString('utf8')).toBe('Hello over HTTP/2!');
    },
    15000
  );
});
