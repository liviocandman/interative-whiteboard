import { io, Socket } from "socket.io-client";
import { getBackendUrl } from "../utils/config";

export const socket: Socket = io(getBackendUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000, // 20s timeout for mobile networks
});
