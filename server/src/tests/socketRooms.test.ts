import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as Client, Socket } from "socket.io-client";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { initRedis, pubClient, subClient } from "../config/redis";
import { setupSocket } from "../socket/setupSocket";

// Use porta 0 para evitar conflitos
const PORT = 0;
let io: Server;
let httpServer: ReturnType<typeof createServer>;
let realPort: number;

describe("Test multiple users in different rooms", () => {
  let clientA: Socket | undefined;
  let clientB: Socket | undefined;

  beforeAll(async () => {
    await initRedis();

    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer, { cors: { origin: "*" } });

    await setupSocket(io);

    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        // @ts-ignore
        realPort = httpServer.address().port;
        clientA = Client(`http://localhost:${realPort}`);
        clientB = Client(`http://localhost:${realPort}`);
        resolve();
      });
    });
  }, 20000); // timeout maior

  afterAll(async () => {
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();
    if (io) io.close();
    if (httpServer) httpServer.close();

    await pubClient.quit();
    await subClient.quit();
  });

  it("User A and B join different rooms and do not receive cross events", async () => {
    const roomA = "room-1";
    const roomB = "room-2";

    let receivedA = false;
    let receivedB = false;

    clientA!.emit("joinRoom", roomA);
    clientB!.emit("joinRoom", roomB);

    clientA!.on("drawing", () => {
      receivedA = true;
    });

    clientB!.on("drawing", () => {
      receivedB = true;
    });

    // User A sends a drawing event
    clientA!.emit("drawing", { x: 10, y: 20 });

    // Aguarde um pouco para os eventos propagarem
    await new Promise((res) => setTimeout(res, 400));

    expect(receivedA).toBe(true);  // A should receive its own event
    expect(receivedB).toBe(false); // B should not receive A's event
  });
});