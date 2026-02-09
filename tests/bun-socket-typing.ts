import * as Bun from "bun";

// Compile-only typing fixture for Bun socket APIs.
// This file is intentionally not a runtime test.

async function bunSocketTypingFixture() {
  await Bun.connect({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLocaleLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    hostname: "adsf",
    port: 324,
  });

  await Bun.connect({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    hostname: "adsf",
    port: 324,
  });

  await Bun.connect({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    unix: "asdf",
  });

  await Bun.connect({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    unix: "asdf",
  });

  Bun.listen({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    hostname: "adsf",
    port: 324,
  });

  Bun.listen({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    hostname: "adsf",
    port: 324,
    tls: {
      certFile: "asdf",
      keyFile: "adsf",
    },
  });

  Bun.listen({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    hostname: "adsf",
    port: 324,
    tls: {
      cert: "asdf",
      key: Bun.file("adsf"),
      ca: Buffer.from("asdf"),
    },
  });

  Bun.listen({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    unix: "asdf",
  });

  const listener = Bun.listen({
    data: { arg: "asdf" },
    socket: {
      data(socket) {
        socket.data.arg.toLowerCase();
      },
      open() {
        console.log("asdf");
      },
    },
    unix: "asdf",
  });

  listener.data.arg = "asdf";
  // @ts-expect-error arg is string
  listener.data.arg = 234;

  listener.reload({
    socket: {
      open() {},
    },
  });

  // Test Socket.reload() type signature (issue #26290)
  // The socket instance's reload() method should also accept { socket: handler }
  await Bun.connect({
    data: { arg: "asdf" },
    socket: {
      open(socket) {
        // Socket.reload() should accept { socket: handler }, not handler directly
        socket.reload({
          socket: {
            open() {},
            data() {},
          },
        });
      },
      data() {},
    },
    hostname: "localhost",
    port: 1,
  });
}

void bunSocketTypingFixture;
