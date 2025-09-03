import { useEffect } from "react";
import { useCanvasContext } from "../hooks/useCanvasContext";

interface CanvasProps {
  width: number;
  height: number;
}

export default function Canvas({ width, height }: CanvasProps) {
  const {
    canvasRef, 
    currentTool,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  } = useCanvasContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.lineCap = "round";
    }
  }, [width, height, canvasRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: currentTool === "pen" ? "crosshair" : "pointer", backgroundColor: "#fff" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      tabIndex={0}
      aria-label="Drawing Canvas"
    />
  );
}