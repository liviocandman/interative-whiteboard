import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as Client, Socket } from "socket.io-client";
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { initRedis, pubClient, subClient } from "../config/redis";
import { setupSocket } from "../socket/setupSocket";

const PORT = 5051;
let io: Server;
let httpServer: ReturnType<typeof createServer>;

describe("Real-time synchronization in the same room", () => {
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

    await new Promise(res => setTimeout(res, 200));
    
    await pubClient.quit();
    await subClient.quit();
  });

  it("User A sends drawing and User B receives it in the same room", async () => {
    const roomId = "shared-room";

    let receivedB = false;

    // Both join the same room
    clientA.emit("joinRoom", roomId);
    clientB.emit("joinRoom", roomId);

    // B listens for drawing event
    clientB.on("drawing", (stroke) => {
      if (stroke?.x === 10 && stroke?.y === 20) {
        receivedB = true;
      }
    });

    // A sends a drawing
    clientA.emit("drawing", { x: 10, y: 20 });

    // Wait for propagation
    await new Promise((res) => setTimeout(res, 500));

    expect(receivedB).toBe(true);
  });
});
