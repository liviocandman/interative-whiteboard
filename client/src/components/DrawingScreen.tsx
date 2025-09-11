import { useState, useMemo } from "react";
import Toolbar from "./Toolbar";
import Whiteboard from "./Whiteboard";
import type { Tool } from "../hooks/useWhiteboard";

export default function DrawingCanvas() {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);

  // Captura o roomId da URL apenas uma vez
  const roomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId") || "default-room";
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        currentTool={tool}
        onToolChange={setTool}
        strokeColor={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
      />
      <div style={{display: "flex", flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafafa"}}>
        <Whiteboard
          roomId={roomId}
          currentTool={tool}
          strokeColor={color}
          lineWidth={lineWidth}
        />
      </div>
    </div>
  );
}
