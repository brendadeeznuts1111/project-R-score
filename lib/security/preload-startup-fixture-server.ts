// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @updated Bun.serve · fixed v0.1.4 · 2022-07-13 · https://bun.com/blog/bun-v0.1.4
// @updated Bun.serve · changed v0.1.6 · 2022-08-01 · https://bun.com/blog/bun-v0.1.6
// @updated Bun.serve · changed v0.1.9 · 2022-08-18 · https://bun.com/blog/bun-v0.1.9
// @updated Bun.serve · changed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.serve · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.serve · changed v0.2.1 · 2022-10-19 · https://bun.com/blog/bun-v0.2.1
// @updated Bun.serve · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.serve · changed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.serve · fixed v0.5.7 · 2023-02-24 · https://bun.com/blog/bun-v0.5.7
// @updated Bun.serve · changed v0.5.9 · 2023-04-04 · https://bun.com/blog/bun-v0.5.9
// @updated Bun.serve · fixed v0.6.3 · 2023-05-22 · https://bun.com/blog/bun-v0.6.3
// @updated Bun.serve · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.serve · changed v0.6.9 · 2023-06-13 · https://bun.com/blog/bun-v0.6.9
// @updated Bun.serve · changed v0.8.0 · 2023-08-24 · https://bun.com/blog/bun-v0.8.0
// @updated Bun.serve · changed v0.8.1 · 2023-08-26 · https://bun.com/blog/bun-v0.8.1
// @updated Bun.serve · changed v1.0.0 · 2023-09-08 · https://bun.com/blog/bun-v1.0
// @updated Bun.serve · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.serve · changed v1.0.10 · 2023-11-07 · https://bun.com/blog/bun-v1.0.10
// @updated Bun.serve · fixed v1.0.11 · 2023-11-08 · https://bun.com/blog/bun-v1.0.11
// @updated Bun.serve · fixed v1.0.12 · 2023-11-16 · https://bun.com/blog/bun-v1.0.12
// @updated Bun.serve · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.serve · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.serve · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.serve · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.serve · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.serve · fixed v1.0.31 · 2024-03-14 · https://bun.com/blog/bun-v1.0.31
// @updated Bun.serve · fixed v1.0.32 · 2024-03-17 · https://bun.com/blog/bun-v1.0.32
// @updated Bun.serve · fixed v1.0.33 · 2024-03-17 · https://bun.com/blog/bun-v1.0.33
// @updated Bun.serve · fixed v1.0.34 · 2024-03-22 · https://bun.com/blog/bun-v1.0.34
// @updated Bun.serve · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.serve · fixed v1.1.2 · 2024-04-06 · https://bun.com/blog/bun-v1.1.2
// @updated Bun.serve · fixed v1.1.3 · 2024-04-08 · https://bun.com/blog/bun-v1.1.3
// @updated Bun.serve · fixed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated Bun.serve · changed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.serve · fixed v1.1.7 · 2024-05-03 · https://bun.com/blog/bun-v1.1.7
// @updated Bun.serve · changed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.serve · fixed v1.1.8 · 2024-05-10 · https://bun.com/blog/bun-v1.1.8
// @updated Bun.serve · fixed v1.1.10 · 2024-05-24 · https://bun.com/blog/bun-v1.1.10
// @updated Bun.serve · changed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.serve · fixed v1.1.13 · 2024-06-05 · https://bun.com/blog/bun-v1.1.13
// @updated Bun.serve · fixed v1.1.19 · 2024-07-12 · https://bun.com/blog/bun-v1.1.19
// @updated Bun.serve · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.serve · changed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.serve · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.serve · fixed v1.1.23 · 2024-08-14 · https://bun.com/blog/bun-v1.1.23
// @updated Bun.serve · changed v1.1.25 · 2024-08-21 · https://bun.com/blog/bun-v1.1.25
// @updated Bun.serve · changed v1.1.26 · 2024-08-24 · https://bun.com/blog/bun-v1.1.26
// @updated Bun.serve · changed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.serve · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.serve · changed v1.1.30 · 2024-10-08 · https://bun.com/blog/bun-v1.1.30
// @updated Bun.serve · changed v1.1.31 · 2024-10-18 · https://bun.com/blog/bun-v1.1.31
// @updated Bun.serve · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.serve · changed v1.1.38 · 2024-11-29 · https://bun.com/blog/bun-v1.1.38
// @updated Bun.serve · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.serve · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.serve · changed v1.1.44 · 2025-01-16 · https://bun.com/blog/bun-v1.1.44
// @updated Bun.serve · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.serve · fixed v1.2.1 · 2025-01-27 · https://bun.com/blog/bun-v1.2.1
// @updated Bun.serve · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.serve · fixed v1.2.4 · 2025-02-26 · https://bun.com/blog/bun-v1.2.4
// @updated Bun.serve · changed v1.2.5 · 2025-03-11 · https://bun.com/blog/bun-v1.2.5
// @updated Bun.serve · fixed v1.2.5 · 2025-03-11 · https://bun.com/blog/bun-v1.2.5
// @updated Bun.serve · fixed v1.2.6 · 2025-03-25 · https://bun.com/blog/bun-v1.2.6
// @updated Bun.serve · changed v1.2.7 · 2025-03-27 · https://bun.com/blog/bun-v1.2.7
// @updated Bun.serve · fixed v1.2.9 · 2025-04-09 · https://bun.com/blog/bun-v1.2.9
// @updated Bun.serve · changed v1.2.12 · 2025-05-04 · https://bun.com/blog/bun-v1.2.12
// @updated Bun.serve · changed v1.2.14 · 2025-05-21 · https://bun.com/blog/bun-v1.2.14
// @updated Bun.serve · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.serve · changed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.serve · changed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated Bun.serve · fixed v1.2.21 · 2025-08-25 · https://bun.com/blog/bun-v1.2.21
// @updated Bun.serve · fixed v1.2.23 · 2025-09-28 · https://bun.com/blog/bun-v1.2.23
// @updated Bun.serve · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.serve · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.serve · changed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.serve · fixed v1.3.3 · 2025-11-21 · https://bun.com/blog/bun-v1.3.3
// @updated Bun.serve · fixed v1.3.4 · 2025-12-06 · https://bun.com/blog/bun-v1.3.4
// @updated Bun.serve · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.serve · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.serve · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.serve · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.serve · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.serve · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.serve · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.serve · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.serve · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/http/server
export type StartupFixtureServer = {
  readonly origin: string;
  readonly requests: () => number;
  readonly stop: () => Promise<void>;
};

export function startStartupFixtureServer(): StartupFixtureServer {
  let requests = 0;
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch() {
      requests++;
      return new Response('fixture-ok');
    },
  });
  return {
    origin: `http://127.0.0.1:${server.port}`,
    requests: () => requests,
    stop: async () => {
      await server.stop(true);
    },
  };
}
