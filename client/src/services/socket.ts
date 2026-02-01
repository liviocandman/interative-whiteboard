import { io, Socket } from "socket.io-client";
import { getBackendUrl } from "../utils/config";

export const socket: Socket = io(getBackendUrl(), {
  autoConnect: false,
});
