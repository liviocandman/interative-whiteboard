// src/components/DrawingCanvas.tsx
import { useState, useMemo, useRef } from "react";
import Toolbar from "./Toolbar";
import Whiteboard from "./Whiteboard";
import { useWhiteboard } from "../hooks/useWhiteboard";
import type { Tool } from "../hooks/useWhiteboard";

export default function DrawingCanvas() {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);

  // Extrai roomId da URL só uma vez
  const roomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId") || "default-room";
  }, []);

  // Ref para o canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chama o hook uma única vez aqui
  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard,
  } = useWhiteboard({
    roomId,
    canvasRef,
    currentTool: tool,
    strokeColor: color,
    lineWidth,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        currentTool={tool}
        onToolChange={setTool}
        strokeColor={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        onResetBoard={() => resetBoard()}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <Whiteboard
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    </div>
  );
}
