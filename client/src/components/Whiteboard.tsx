import { useRef, useEffect } from "react";
import type { Tool } from "../hooks/useWhiteboard";
import { useWhiteboard } from "../hooks/useWhiteboard";

interface WhiteboardProps {
  roomId: string;
  currentTool: Tool;
  strokeColor: string;
  lineWidth: number;
}

export default function Whiteboard({
  roomId,
  currentTool,
  strokeColor,
  lineWidth,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { onMouseDown, onMouseMove, onMouseUp } = useWhiteboard({
    roomId,
    canvasRef,
    currentTool,
    strokeColor,
    lineWidth,
  });

  // Configuração inicial do canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 80;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.lineCap = "round";
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        cursor: currentTool === "pen" ? "crosshair" : "pointer",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      aria-label="Drawing Canvas"
    />
  );
}