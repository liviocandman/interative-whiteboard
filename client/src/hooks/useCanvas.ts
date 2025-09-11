import { useState, useRef } from "react";



interface UseCanvasOptions {
  initialTool?: string;
  initialColor?: string;
  initialLineWidth?: number;
  maxHistory?: number;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const {
    initialTool = "pen",
    initialColor = "#000000",
    initialLineWidth = 2,
    maxHistory = 50,
  } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null); // Agora é interno

  const [currentTool, setCurrentTool] = useState<string>(initialTool);
  const [strokeColor, setStrokeColor] = useState(initialColor);
  const [lineWidth, setLineWidth] = useState(initialLineWidth);

  const isDrawingRef = useRef(false);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  // Function to save the current state of the canvas to the undo stack.
  // It captures the current ImageData and checks if it is different from the last saved state
  const saveState = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const snapshot = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (
      undoStack.current.length === 0 ||
      !imageDataEquals(undoStack.current[undoStack.current.length - 1], snapshot)
    ) {
      undoStack.current.push(snapshot);
      if (undoStack.current.length > maxHistory) undoStack.current.shift();
      redoStack.current = [];
    }
  };

  const undo = () => {
    if (!canvasRef.current || undoStack.current.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const last = undoStack.current.pop();
    if (last) {
      redoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
      ctx.putImageData(last, 0, 0);
    }
  };

  const redo = () => {
    if (!canvasRef.current || redoStack.current.length === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const next = redoStack.current.pop();
    if (next) {
      undoStack.current.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
      ctx.putImageData(next, 0, 0);
    }
  };

  const onMouseDown = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    saveState();
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    ctx.globalCompositeOperation =
      currentTool === "eraser" ? "destination-out" : "source-over";
  };

  const onMouseMove = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const onMouseUp = () => {
    isDrawingRef.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.globalCompositeOperation = "source-over";
  };

  return {
    canvasRef,
    currentTool,
    setCurrentTool,
    strokeColor,
    setStrokeColor,
    lineWidth,
    setLineWidth,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}

// Helper to compare ImageData objects
function imageDataEquals(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}