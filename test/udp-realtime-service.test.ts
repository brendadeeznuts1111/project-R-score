import { describe, test, expect, beforeEach, afterEach, spyOn, type Mock } from "bun:test";
import { UDPRealtimeService } from "../lib/udp/udp-realtime-service";
import type { UDPSendPacket } from "../lib/udp/udp-types";
import { decodePacketHeader, encodePacketHeader, PACKET_HEADER_SIZE, CRC_SIZE, FLAG_CRC32, appendCRC } from "../lib/udp/packet-id";

// ---------------------------------------------------------------------------
// FakeUDPSocket — mirrors the subset of Bun.udp.Socket / ConnectedSocket
// that UDPRealtimeService actually calls.
// ---------------------------------------------------------------------------

type DataCb = (socket: any, data: Buffer, port: number, address: string) => void;
type DrainCb = (socket: any) => void;
type ErrorCb = (socket: any, error: Error) => void;

interface CapturedHandler {
  data?: DataCb;
  drain?: DrainCb;
  error?: ErrorCb;
}

class FakeUDPSocket {
  port = 9999;
  hostname = "0.0.0.0";
  closed = false;
  binaryType = "buffer" as const;
  address = { address: "0.0.0.0", port: 9999, family: "IPv4" } as any;
  isConnected = false;

  handler: CapturedHandler = {};

  // Track calls for assertions
  sendCalls: any[][] = [];
  sendManyCalls: any[][] = [];
  setBroadcastCalls: boolean[] = [];
  setTTLCalls: number[] = [];
  setMulticastTTLCalls: number[] = [];
  setMulticastLoopbackCalls: boolean[] = [];
  addMembershipCalls: [string, string | undefined][] = [];
  dropMembershipCalls: [string, string | undefined][] = [];

  send(...args: any[]): boolean {
    this.sendCalls.push(args);
    return true;
  }

  sendMany(packets: any[]): number {
    this.sendManyCalls.push(packets);
    // Bun returns number of datagrams sent.
    // For unconnected: every 3 flat elements = 1 datagram.
    // For connected: each element = 1 datagram.
    return this.isConnected ? packets.length : Math.floor(packets.length / 3);
  }

  close(): void {
    this.closed = true;
  }

  ref(): void {}
  unref(): void {}

  setBroadcast(enabled: boolean): boolean {
    this.setBroadcastCalls.push(enabled);
    return enabled;
  }

  setTTL(ttl: number): number {
    this.setTTLCalls.push(ttl);
    return ttl;
  }

  setMulticastTTL(ttl: number): number {
    this.setMulticastTTLCalls.push(ttl);
    return ttl;
  }

  setMulticastLoopback(enabled: boolean): boolean {
    this.setMulticastLoopbackCalls.push(enabled);
    return enabled;
  }

  setMulticastInterface(_addr: string): boolean {
    return true;
  }

  addMembership(addr: string, iface?: string): boolean {
    this.addMembershipCalls.push([addr, iface]);
    return true;
  }

  dropMembership(addr: string, iface?: string): boolean {
    this.dropMembershipCalls.push([addr, iface]);
    return true;
  }

  addSourceSpecificMembership(): boolean { return true; }
  dropSourceSpecificMembership(): boolean { return true; }

  reload(): void {}

  // ---- test helpers ----

  simulateIncomingData(data: Buffer, port: number, address: string): void {
    this.handler.data?.(this, data, port, address);
  }

  simulateDrain(): void {
    this.handler.drain?.(this);
  }

  simulateError(error: Error): void {
    this.handler.error?.(this, error);
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let fakeSocket: FakeUDPSocket;
let udpSpy: Mock<typeof Bun.udpSocket>;

function installSpy(): void {
  fakeSocket = new FakeUDPSocket();
  udpSpy = spyOn(Bun, "udpSocket") as any;
  udpSpy.mockImplementation(((opts: any) => {
    // Capture handler so tests can invoke data/drain/error
    if (opts.socket) {
      fakeSocket.handler = opts.socket;
    }
    fakeSocket.isConnected = !!opts.connect;
    return Promise.resolve(fakeSocket as any);
  }) as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UDPRealtimeService", () => {
  let svc: UDPRealtimeService;

  beforeEach(() => {
    installSpy();
  });

  afterEach(() => {
    udpSpy.mockRestore();
  });

  // ====== Lifecycle ======

  describe("lifecycle", () => {
    test("starts in idle state", () => {
      svc = new UDPRealtimeService();
      expect(svc.state).toBe("idle");
      expect(svc.port).toBeNull();
    });

    test("bind transitions to bound", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      expect(svc.state).toBe("bound");
      expect(svc.port).toBe(9999);
    });

    test("bind with connect transitions to connected", async () => {
      svc = new UDPRealtimeService({ connect: { hostname: "127.0.0.1", port: 5000 } });
      await svc.bind();
      expect(svc.state).toBe("connected");
    });

    test("double bind throws", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      await expect(svc.bind()).rejects.toThrow('Cannot bind: state is "bound"');
    });

    test("close transitions to closed", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.close();
      expect(svc.state).toBe("closed");
      expect(fakeSocket.closed).toBe(true);
    });

    test("close is idempotent", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.close();
      svc.close(); // should not throw
      expect(svc.state).toBe("closed");
    });

    test("bind failure resets state to idle", async () => {
      udpSpy.mockImplementation((() => Promise.reject(new Error("EADDRINUSE"))) as any);
      svc = new UDPRealtimeService();
      await expect(svc.bind()).rejects.toThrow("EADDRINUSE");
      expect(svc.state).toBe("idle");
      // Can retry bind after failure
      installSpy();
      await svc.bind();
      expect(svc.state).toBe("bound");
    });

    test("reset returns to idle with zeroed metrics", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.send("hello", 1234, "127.0.0.1");
      svc.reset();
      expect(svc.state).toBe("idle");
      const m = svc.getMetrics();
      expect(m.packetsSent).toBe(0);
      expect(m.bytesSent).toBe(0);
      expect(m.boundPort).toBeNull();
    });
  });

  // ====== Send ======

  describe("send", () => {
    test("unconnected send passes port and address", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.send("ping", 4000, "10.0.0.1");
      expect(fakeSocket.sendCalls).toHaveLength(1);
      expect(fakeSocket.sendCalls[0]).toEqual(["ping", 4000, "10.0.0.1"]);
    });

    test("connected send omits port and address", async () => {
      svc = new UDPRealtimeService({ connect: { hostname: "127.0.0.1", port: 5000 } });
      await svc.bind();
      svc.send("ping");
      expect(fakeSocket.sendCalls).toHaveLength(1);
      expect(fakeSocket.sendCalls[0]).toEqual(["ping"]);
    });

    test("unconnected send throws when port/address missing", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      expect(() => svc.send("hello")).toThrow("Port and address are required");
    });

    test("send throws when not bound", () => {
      svc = new UDPRealtimeService();
      expect(() => svc.send("hello", 1234, "127.0.0.1")).toThrow('Cannot send: state is "idle"');
    });

    test("send tracks packetsSent and bytesSent", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.send("hello", 1234, "127.0.0.1"); // 5 bytes
      svc.send("world!", 1234, "127.0.0.1"); // 6 bytes
      const m = svc.getMetrics();
      expect(m.packetsSent).toBe(2);
      expect(m.bytesSent).toBe(11);
    });
  });

  // ====== SendMany ======

  describe("sendMany", () => {
    test("unconnected batch send flattens packets", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      const packets: UDPSendPacket[] = [
        { data: "aaa", port: 4000, address: "10.0.0.1" },
        { data: "bbb", port: 4001, address: "10.0.0.2" },
      ];
      const sent = svc.sendMany(packets);
      // Bun returns number of datagrams sent (2), not flat array length
      expect(sent).toBe(2);
      expect(fakeSocket.sendManyCalls).toHaveLength(1);
      expect(fakeSocket.sendManyCalls[0]).toEqual(["aaa", 4000, "10.0.0.1", "bbb", 4001, "10.0.0.2"]);
    });

    test("connected batch send passes data directly", async () => {
      svc = new UDPRealtimeService({ connect: { hostname: "127.0.0.1", port: 5000 } });
      await svc.bind();
      const sent = svc.sendMany(["x", "y", "z"]);
      expect(sent).toBe(3);
      expect(fakeSocket.sendManyCalls[0]).toEqual(["x", "y", "z"]);
    });
  });

  // ====== Receive ======

  describe("receive", () => {
    test("calls onMessage handler with datagram", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      const received: any[] = [];
      svc.onMessage((dg) => received.push(dg));

      fakeSocket.simulateIncomingData(Buffer.from("hello"), 3000, "192.168.1.1");

      expect(received).toHaveLength(1);
      expect(received[0].data.toString()).toBe("hello");
      expect(received[0].port).toBe(3000);
      expect(received[0].address).toBe("192.168.1.1");
      expect(typeof received[0].receivedAt).toBe("number");
    });

    test("increments receive counters", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(Buffer.from("ab"), 3000, "1.2.3.4");
      fakeSocket.simulateIncomingData(Buffer.from("cde"), 3000, "1.2.3.4");

      const m = svc.getMetrics();
      expect(m.packetsReceived).toBe(2);
      expect(m.bytesReceived).toBe(5);
    });

    test("supports multiple handlers", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      let count = 0;
      svc.onMessage(() => count++);
      svc.onMessage(() => count++);

      fakeSocket.simulateIncomingData(Buffer.from("x"), 3000, "1.1.1.1");
      expect(count).toBe(2);
    });
  });

  // ====== Backpressure + Errors ======

  describe("backpressure and errors", () => {
    test("drain fires onDrain callback and increments counter", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      let drained = false;
      svc.onDrainEvent(() => { drained = true; });

      fakeSocket.simulateDrain();

      expect(drained).toBe(true);
      expect(svc.getMetrics().backpressureEvents).toBe(1);
    });

    test("error fires onError callback and increments counter", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      let capturedErr: Error | null = null;
      svc.onErrorEvent((e) => { capturedErr = e; });

      fakeSocket.simulateError(new Error("ECONNREFUSED"));

      expect(capturedErr!.message).toBe("ECONNREFUSED");
      expect(svc.getMetrics().sendErrors).toBe(1);
    });

    test("multiple drain events accumulate", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.onDrainEvent(() => {});

      fakeSocket.simulateDrain();
      fakeSocket.simulateDrain();
      fakeSocket.simulateDrain();

      expect(svc.getMetrics().backpressureEvents).toBe(3);
    });
  });

  // ====== Socket Options ======

  describe("socket options", () => {
    test("broadcast option applied on bind", async () => {
      svc = new UDPRealtimeService({ broadcast: true });
      await svc.bind();
      expect(fakeSocket.setBroadcastCalls).toEqual([true]);
    });

    test("TTL option applied on bind", async () => {
      svc = new UDPRealtimeService({ ttl: 64 });
      await svc.bind();
      expect(fakeSocket.setTTLCalls).toEqual([64]);
    });

    test("multicast groups joined on bind", async () => {
      svc = new UDPRealtimeService({
        multicastGroups: [
          { address: "224.0.0.1" },
          { address: "224.0.0.2", interfaceAddress: "192.168.1.100" },
        ],
        multicastTTL: 4,
        multicastLoopback: true,
      });
      await svc.bind();
      expect(fakeSocket.addMembershipCalls).toEqual([
        ["224.0.0.1", undefined],
        ["224.0.0.2", "192.168.1.100"],
      ]);
      expect(fakeSocket.setMulticastTTLCalls).toEqual([4]);
      expect(fakeSocket.setMulticastLoopbackCalls).toEqual([true]);
    });
  });

  // ====== Multicast ======

  describe("multicast", () => {
    test("joinMulticast delegates to socket.addMembership", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.joinMulticast("239.1.2.3", "10.0.0.1");
      expect(fakeSocket.addMembershipCalls).toEqual([["239.1.2.3", "10.0.0.1"]]);
    });

    test("leaveMulticast delegates to socket.dropMembership", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.leaveMulticast("239.1.2.3");
      expect(fakeSocket.dropMembershipCalls).toEqual([["239.1.2.3", undefined]]);
    });
  });

  // ====== Packet Tracking ======

  describe("packet tracking", () => {
    /** Build a framed buffer: 16-byte v3 header + payload + 4-byte CRC trailer.
     *  CRC covers payload only (matches production frameOutbound). */
    function framedBuf(seq: number, payload: string): Buffer {
      const header = encodePacketHeader({
        scope: "site-local",
        flags: FLAG_CRC32,
        sourceId: 1,
        sequenceId: seq,
      });
      const payloadBuf = Buffer.from(payload);
      const payloadWithCRC = appendCRC(payloadBuf);
      const framed = Buffer.allocUnsafe(PACKET_HEADER_SIZE + payloadWithCRC.byteLength);
      header.copy(framed, 0);
      payloadWithCRC.copy(framed, PACKET_HEADER_SIZE);
      return framed;
    }

    test("send prepends 16-byte sequence header", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send("hi", 1234, "127.0.0.1");
      svc.send("yo", 1234, "127.0.0.1");

      expect(fakeSocket.sendCalls).toHaveLength(2);
      const buf0 = fakeSocket.sendCalls[0][0] as Buffer;
      const buf1 = fakeSocket.sendCalls[1][0] as Buffer;

      // seq 0, then seq 1; payload sits between header and 4-byte CRC trailer
      expect(decodePacketHeader(buf0)?.sequenceId).toBe(0);
      expect(buf0.subarray(PACKET_HEADER_SIZE, buf0.byteLength - CRC_SIZE).toString()).toBe("hi");
      expect(decodePacketHeader(buf1)?.sequenceId).toBe(1);
      expect(buf1.subarray(PACKET_HEADER_SIZE, buf1.byteLength - CRC_SIZE).toString()).toBe("yo");
    });

    test("sequenceId increments in metrics", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send("a", 1, "1.1.1.1");
      svc.send("b", 1, "1.1.1.1");
      svc.send("c", 1, "1.1.1.1");
      expect(svc.getMetrics().sequenceId).toBe(3);
    });

    test("bytesSent includes header overhead", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send("hi", 1234, "127.0.0.1"); // 2 payload + 16 header + 4 CRC = 22
      expect(svc.getMetrics().bytesSent).toBe(PACKET_HEADER_SIZE + 2 + CRC_SIZE);
    });

    test("receive strips header and exposes sequenceId with valid CRC", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const received: any[] = [];
      svc.onMessage((dg) => received.push(dg));

      fakeSocket.simulateIncomingData(framedBuf(0, "hello"), 3000, "1.2.3.4");

      expect(received).toHaveLength(1);
      expect(received[0].sequenceId).toBe(0);
      expect(received[0].data.toString()).toBe("hello");
      expect(received[0].crcValid).toBe(true);
    });

    test("in-order packets: no loss or reorder", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(framedBuf(0, "a"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedBuf(1, "b"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedBuf(2, "c"), 3000, "1.1.1.1");

      const m = svc.getMetrics();
      expect(m.packetsLost).toBe(0);
      expect(m.packetsOutOfOrder).toBe(0);
      expect(m.packetsDuplicate).toBe(0);
    });

    test("gap in sequence detected as loss", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(framedBuf(0, "a"), 3000, "1.1.1.1");
      // skip 1, 2
      fakeSocket.simulateIncomingData(framedBuf(3, "d"), 3000, "1.1.1.1");

      expect(svc.getMetrics().packetsLost).toBe(2);
    });

    test("duplicate packet detected", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(framedBuf(0, "a"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedBuf(0, "a"), 3000, "1.1.1.1");

      expect(svc.getMetrics().packetsDuplicate).toBe(1);
    });

    test("late arrival detected as out-of-order", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(framedBuf(0, "a"), 3000, "1.1.1.1");
      // skip 1, receive 2, then late 1 arrives
      fakeSocket.simulateIncomingData(framedBuf(2, "c"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedBuf(1, "b"), 3000, "1.1.1.1");

      const m = svc.getMetrics();
      expect(m.packetsOutOfOrder).toBe(1);
      // Initial gap counted 1 as lost, late arrival reclassifies it
      expect(m.packetsLost).toBe(1);
    });

    test("no tracking when disabled — raw pass-through", async () => {
      svc = new UDPRealtimeService(); // packetTracking not set
      await svc.bind();
      svc.send("raw", 1234, "127.0.0.1");

      // No header prepended
      expect(fakeSocket.sendCalls[0]).toEqual(["raw", 1234, "127.0.0.1"]);

      const received: any[] = [];
      svc.onMessage((dg) => received.push(dg));
      fakeSocket.simulateIncomingData(Buffer.from("raw"), 3000, "1.1.1.1");

      expect(received[0].sequenceId).toBeUndefined();
      expect(received[0].data.toString()).toBe("raw");
    });

    test("reset zeroes tracking state", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send("a", 1, "1.1.1.1");
      svc.send("b", 1, "1.1.1.1");
      svc.reset();

      const m = svc.getMetrics();
      expect(m.sequenceId).toBe(0);
      expect(m.packetsLost).toBe(0);
      expect(m.packetsDuplicate).toBe(0);
      expect(m.packetsOutOfOrder).toBe(0);
    });
  });

  // ====== Metrics ======

  describe("metrics", () => {
    test("initial metrics are zeroed", () => {
      svc = new UDPRealtimeService();
      const m = svc.getMetrics();
      expect(m.packetsSent).toBe(0);
      expect(m.packetsReceived).toBe(0);
      expect(m.bytesSent).toBe(0);
      expect(m.bytesReceived).toBe(0);
      expect(m.sendErrors).toBe(0);
      expect(m.backpressureEvents).toBe(0);
      expect(m.packetsLost).toBe(0);
      expect(m.packetsOutOfOrder).toBe(0);
      expect(m.packetsDuplicate).toBe(0);
      expect(m.sequenceId).toBe(0);
      expect(m.state).toBe("idle");
      expect(m.boundPort).toBeNull();
    });

    test("metrics reflect operations", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();

      svc.send("abc", 1234, "127.0.0.1");
      fakeSocket.simulateIncomingData(Buffer.from("defgh"), 5000, "10.0.0.1");
      fakeSocket.simulateDrain();
      fakeSocket.simulateError(new Error("test"));

      const m = svc.getMetrics();
      expect(m.packetsSent).toBe(1);
      expect(m.bytesSent).toBe(3);
      expect(m.packetsReceived).toBe(1);
      expect(m.bytesReceived).toBe(5);
      expect(m.backpressureEvents).toBe(1);
      expect(m.sendErrors).toBe(1);
      expect(m.state).toBe("bound");
      expect(m.boundPort).toBe(9999);
    });
  });

  describe("packet tracking", () => {
    test("send prepends v3 packet header when enabled", async () => {
      svc = new UDPRealtimeService({ packetTracking: true, packetTrackingScope: "site-local", packetSourceId: 777 });
      await svc.bind();
      svc.send("hello", 1234, "127.0.0.1");
      expect(fakeSocket.sendCalls).toHaveLength(1);
      const arg = fakeSocket.sendCalls[0][0];
      expect(Buffer.isBuffer(arg)).toBe(true);
      const decoded = decodePacketHeader(arg);
      expect(decoded).not.toBeNull();
      expect(decoded!.sequenceId).toBe(0);
      expect(decoded!.sourceId).toBe(777);
      expect(decoded!.scope).toBe("site-local");
      const raw = Buffer.from(arg);
      const payload = raw.subarray(PACKET_HEADER_SIZE, raw.byteLength - CRC_SIZE).toString();
      expect(payload).toBe("hello");
    });

    test("sendMany frames connected payloads when enabled", async () => {
      svc = new UDPRealtimeService({
        connect: { hostname: "127.0.0.1", port: 5000 },
        packetTracking: true,
        packetSourceId: 12,
      });
      await svc.bind();
      svc.sendMany(["a", "b", "c"]);
      expect(fakeSocket.sendManyCalls).toHaveLength(1);
      const payloads = fakeSocket.sendManyCalls[0] as Buffer[];
      expect(payloads).toHaveLength(3);
      expect(decodePacketHeader(payloads[0])?.sequenceId).toBe(0);
      expect(decodePacketHeader(payloads[1])?.sequenceId).toBe(1);
      expect(decodePacketHeader(payloads[2])?.sequenceId).toBe(2);
    });

    test("receive decodes tracked packet header", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const got: any[] = [];
      svc.onMessage((d) => got.push(d));

      svc.send("abc", 2222, "127.0.0.1");
      const outbound = fakeSocket.sendCalls[0][0] as Buffer;
      fakeSocket.simulateIncomingData(Buffer.from(outbound), 2222, "127.0.0.1");

      expect(got).toHaveLength(1);
      expect(got[0].sequenceId).toBe(0);
      expect(typeof got[0].sourceId).toBe("number");
      expect(typeof got[0].timestampUs).toBe("bigint");
      expect(got[0].data.toString()).toBe("abc");
      expect(got[0].crcValid).toBe(true);
    });

    test("crcValid is true for intact packet", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const got: any[] = [];
      svc.onMessage((d) => got.push(d));

      // Send then loop the outbound frame back as inbound
      svc.send("integrity", 3000, "10.0.0.1");
      const wire = Buffer.from(fakeSocket.sendCalls[0][0] as Buffer);
      fakeSocket.simulateIncomingData(wire, 3000, "10.0.0.1");

      expect(got[0].crcValid).toBe(true);
      expect(got[0].data.toString()).toBe("integrity");
    });

    test("crcValid is false for corrupted packet", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const got: any[] = [];
      svc.onMessage((d) => got.push(d));

      // Build a valid frame, then corrupt a payload byte
      svc.send("clean", 3000, "10.0.0.1");
      const wire = Buffer.from(fakeSocket.sendCalls[0][0] as Buffer);
      wire[PACKET_HEADER_SIZE] ^= 0xff; // flip first payload byte
      fakeSocket.simulateIncomingData(wire, 3000, "10.0.0.1");

      expect(got[0].crcValid).toBe(false);
    });
  });

  // ====== Multi-source tracking ======

  describe("multi-source tracking", () => {
    /** Build a framed buffer from a specific source */
    function framedFrom(sourceId: number, seq: number, payload: string): Buffer {
      const header = encodePacketHeader({
        scope: "site-local",
        flags: FLAG_CRC32,
        sourceId,
        sequenceId: seq,
      });
      const payloadBuf = Buffer.from(payload);
      const payloadWithCRC = appendCRC(payloadBuf);
      const framed = Buffer.allocUnsafe(PACKET_HEADER_SIZE + payloadWithCRC.byteLength);
      header.copy(framed, 0);
      payloadWithCRC.copy(framed, PACKET_HEADER_SIZE);
      return framed;
    }

    test("tracks sequences independently per source", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      // Source 1: in-order 0,1,2
      fakeSocket.simulateIncomingData(framedFrom(1, 0, "a"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedFrom(1, 1, "b"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedFrom(1, 2, "c"), 3000, "1.1.1.1");

      // Source 2: in-order 0,1
      fakeSocket.simulateIncomingData(framedFrom(2, 0, "x"), 3000, "2.2.2.2");
      fakeSocket.simulateIncomingData(framedFrom(2, 1, "y"), 3000, "2.2.2.2");

      const m = svc.getMetrics();
      expect(m.packetsLost).toBe(0);
      expect(m.packetsOutOfOrder).toBe(0);
      expect(m.packetsDuplicate).toBe(0);
    });

    test("loss on one source does not affect another", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      // Source 1: skip seq 1
      fakeSocket.simulateIncomingData(framedFrom(1, 0, "a"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedFrom(1, 3, "d"), 3000, "1.1.1.1");

      // Source 2: all in-order
      fakeSocket.simulateIncomingData(framedFrom(2, 0, "x"), 3000, "2.2.2.2");
      fakeSocket.simulateIncomingData(framedFrom(2, 1, "y"), 3000, "2.2.2.2");

      const m = svc.getMetrics();
      expect(m.packetsLost).toBe(2); // only source 1 lost 2 (seqs 1,2)
      expect(m.packetsOutOfOrder).toBe(0);
    });

    test("duplicate detection is per-source", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.onMessage(() => {});

      fakeSocket.simulateIncomingData(framedFrom(1, 0, "a"), 3000, "1.1.1.1");
      fakeSocket.simulateIncomingData(framedFrom(2, 0, "b"), 3000, "2.2.2.2"); // same seq, different source — NOT dup
      fakeSocket.simulateIncomingData(framedFrom(1, 0, "a"), 3000, "1.1.1.1"); // same source + seq — dup

      expect(svc.getMetrics().packetsDuplicate).toBe(1);
    });
  });

  // ====== Legacy 4-byte fallback ======

  describe("legacy 4-byte fallback", () => {
    test("receives legacy 4-byte sequence prefix", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const received: any[] = [];
      svc.onMessage((dg) => received.push(dg));

      // Build a legacy packet: 4-byte seq (BE) + payload (no v3 header)
      const legacy = Buffer.allocUnsafe(4 + 5);
      legacy.writeUInt32BE(42, 0);
      Buffer.from("hello").copy(legacy, 4);
      fakeSocket.simulateIncomingData(legacy, 3000, "1.1.1.1");

      expect(received).toHaveLength(1);
      expect(received[0].sequenceId).toBe(42);
      expect(received[0].sourceId).toBe(0);
      expect(received[0].data.toString()).toBe("hello");
    });
  });

  // ====== Edge cases ======

  describe("edge cases", () => {
    test("send throws after close", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.close();
      expect(() => svc.send("x", 1234, "127.0.0.1")).toThrow('Cannot send: state is "closed"');
    });

    test("sendMany throws after close", async () => {
      svc = new UDPRealtimeService();
      await svc.bind();
      svc.close();
      expect(() => svc.sendMany(["x"])).toThrow('Cannot sendMany: state is "closed"');
    });

    test("joinMulticast throws on unbound socket", () => {
      svc = new UDPRealtimeService();
      expect(() => svc.joinMulticast("239.1.2.3")).toThrow("Socket not bound");
    });

    test("leaveMulticast throws on unbound socket", () => {
      svc = new UDPRealtimeService();
      expect(() => svc.leaveMulticast("239.1.2.3")).toThrow("Socket not bound");
    });

    test("packetSourceId config is respected", async () => {
      svc = new UDPRealtimeService({ packetTracking: true, packetSourceId: 1234 });
      await svc.bind();
      svc.send("test", 1000, "127.0.0.1");
      const buf = fakeSocket.sendCalls[0][0] as Buffer;
      const hdr = decodePacketHeader(buf);
      expect(hdr!.sourceId).toBe(1234);
    });

    test("packetSourceId is clamped to uint16 range", async () => {
      svc = new UDPRealtimeService({ packetTracking: true, packetSourceId: 99999 });
      await svc.bind();
      svc.send("test", 1000, "127.0.0.1");
      const buf = fakeSocket.sendCalls[0][0] as Buffer;
      const hdr = decodePacketHeader(buf);
      expect(hdr!.sourceId).toBe(0xffff);
    });

    test("send with Buffer data", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send(Buffer.from("buf"), 1234, "127.0.0.1");
      const buf = fakeSocket.sendCalls[0][0] as Buffer;
      expect(buf.subarray(PACKET_HEADER_SIZE, buf.byteLength - CRC_SIZE).toString()).toBe("buf");
    });

    test("send with Uint8Array data", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      svc.send(new Uint8Array([65, 66, 67]), 1234, "127.0.0.1");
      const buf = fakeSocket.sendCalls[0][0] as Buffer;
      expect(buf.subarray(PACKET_HEADER_SIZE, buf.byteLength - CRC_SIZE).toString()).toBe("ABC");
    });

    test("sendMany with packetTracking on unconnected", async () => {
      svc = new UDPRealtimeService({ packetTracking: true });
      await svc.bind();
      const packets: UDPSendPacket[] = [
        { data: "aaa", port: 4000, address: "10.0.0.1" },
        { data: "bbb", port: 4001, address: "10.0.0.2" },
      ];
      const sent = svc.sendMany(packets);
      expect(sent).toBe(2);

      // Each flat entry should be a framed Buffer, not raw string
      const flat = fakeSocket.sendManyCalls[0];
      expect(Buffer.isBuffer(flat[0])).toBe(true);
      expect(decodePacketHeader(flat[0] as Buffer)?.sequenceId).toBe(0);
      expect(decodePacketHeader(flat[3] as Buffer)?.sequenceId).toBe(1);
    });
  });
});
