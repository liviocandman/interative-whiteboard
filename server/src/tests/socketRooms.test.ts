import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as Client, Socket } from "socket.io-client";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { initRedis, pubClient, subClient } from "../config/redis";
import { setupSocket } from "../socket/setupSocket";

const PORT = 4000;
let io: Server;
let httpServer: ReturnType<typeof createServer>;

describe("Test multiple users in different rooms", () => {
  let clientA: Socket;
  let clientB: Socket;

  beforeAll(async () => {
    await initRedis();

    const app = express();
    httpServer = createServer(app);
    io = new Server(httpServer, { cors: { origin: "*" } });

    await setupSocket(io);

    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        console.log(`Test server running on port ${PORT}`);
        resolve();
      });
    });

    clientA = Client(`http://localhost:${PORT}`);
    clientB = Client(`http://localhost:${PORT}`);
  });

  afterAll(async () => {
    clientA.disconnect();
    clientB.disconnect();
    io.close();
    httpServer.close();
    await pubClient.quit();
    await subClient.quit();
  });

  it("User A and B join different rooms and do not receive cross events", async () => {
    const roomA = "room-1";
    const roomB = "room-2";

    let receivedA = false;
    let receivedB = false;

    clientA.emit("joinRoom", roomA);
    clientB.emit("joinRoom", roomB);

    clientA.on("drawing", () => {
      receivedA = true;
    });

    clientB.on("drawing", () => {
      receivedB = true;
    });

    // User A sends a drawing event
    clientA.emit("drawing", { x: 10, y: 20 });

    // Aguarde um pouco para os eventos propagarem
    await new Promise((res) => setTimeout(res, 400));

    expect(receivedA).toBe(true);  // A should receive its own event
    expect(receivedB).toBe(false); // B should not receive A's event
  });
});
