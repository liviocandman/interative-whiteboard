import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { initRedis } from "./config/redis";
import { setupSocket } from "./socket/setupSocket";
import healthRouter from "./routes/rooms";

dotenv.config();

async function startServer() {
  await initRedis();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  app.use(cors());
  app.use(express.json());
  app.use("/health", healthRouter);

  await setupSocket(io);

  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
  process.exit(1);
});
