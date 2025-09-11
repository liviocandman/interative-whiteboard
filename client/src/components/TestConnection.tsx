import { useEffect, useState } from "react";
import { socket } from "../services/socket";

export default function TestConnection() {
  const [status, setStatus] = useState("Desconectado");

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setStatus(`Conectado (id: ${socket.id})`);
      socket.emit("ping", "Olá servidor!");
    });

    socket.on("disconnect", () => {
      setStatus("Desconectado");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: "1rem", background: "#eee" }}>
      <strong>Status:</strong> {status}
    </div>
  );
}
