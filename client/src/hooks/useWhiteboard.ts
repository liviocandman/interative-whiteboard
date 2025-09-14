import { useEffect, useRef, useCallback } from "react";
import { socket } from "../services/socket";

export type Tool = "pen" | "eraser" | "bucket";
export interface Stroke {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  lineWidth: number;
  tool: Tool;
}

interface UseWhiteboardProps {
  roomId: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTool: Tool;
  strokeColor: string;
  lineWidth: number;
}
interface UseWhiteboardProps {
  roomId: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTool: Tool;
  strokeColor: string;
  lineWidth: number;
}

export function useWhiteboard({
  roomId,
  canvasRef,
  currentTool,
  strokeColor,
  lineWidth,
}: UseWhiteboardProps) {
  const strokesRef = useRef<Stroke[]>([]);
  const snapshotRef = useRef<string | null>(null);

  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // throttle via requestAnimationFrame
  const rafScheduled = useRef(false);
  const latestEvent = useRef<React.PointerEvent<HTMLCanvasElement> | null>(null);

  // Aplica um stroke no canvas, sem salva-lo
  const applyStroke = useCallback(
    (stroke: Stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation =
        stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.moveTo(stroke.from.x, stroke.from.y);
      ctx.lineTo(stroke.to.x, stroke.to.y);
      ctx.stroke();
      ctx.restore();
    },
    [canvasRef]
  );

  // Envia stroke ao servidor
  const sendStroke = useCallback(
    (stroke: Stroke) => {
      socket.emit("drawing", stroke);
    },
    []
  );

  // Processa o movimento acumulado
  const processStroke = useCallback(() => {
    rafScheduled.current = false;
    const e = latestEvent.current;
    if (!e || !drawing.current || !lastPoint.current) return;

    const newPoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };

    const stroke: Stroke = {
      from: lastPoint.current,
      to: newPoint,
      color: strokeColor,
      lineWidth,
      tool: currentTool,
    };

    applyStroke(stroke);
    sendStroke(stroke);

    // armazena no histórico local
    strokesRef.current.push(stroke);

    lastPoint.current = newPoint;
  }, [applyStroke, currentTool, lineWidth, sendStroke, strokeColor]);

  // Agenda um requestAnimationFrame
  const scheduleStroke = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      latestEvent.current = e;
      if (!rafScheduled.current) {
        rafScheduled.current = true;
        requestAnimationFrame(processStroke);
      }
    },
    [processStroke]
  );

  // Desenha snapshot + histórico
  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (snapshotRef.current) {
      const img = new Image();
      img.src = snapshotRef.current;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        strokesRef.current.forEach((s) => applyStroke(s));
      };
    } else {
      strokesRef.current.forEach((s) => applyStroke(s));
    }
  }, [applyStroke, canvasRef]);

  // Handlers pointer
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPoint.current = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current) return;
      scheduleStroke(e);
    },
    [scheduleStroke]
  );

  const onPointerUp = useCallback(() => {
    drawing.current = false;
    lastPoint.current = null;
    // opcional: salva snapshot no servidor
    const canvas = canvasRef.current;
    if (canvas) socket.emit("saveState", canvas.toDataURL());
  }, [canvasRef]);

  const resetBoard = useCallback((ack?: (err?: string) => void) => {
    socket.emit("resetBoard", (err?: string) => {
      if (ack) ack(err);
    });
  }, []);
  // Socket listeners
  useEffect(() => {
    socket.connect();
    socket.emit("joinRoom", roomId);

    socket.on("drawing", (stroke: Stroke) => {
      applyStroke(stroke);
      strokesRef.current.push(stroke);
    });

    socket.on("initialState", (init: { snapshot: string | null; strokes: Stroke[] }) => {
      snapshotRef.current = init.snapshot;
      strokesRef.current = init.strokes;
      drawAll();
    });

    socket.on("clearBoard", () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokesRef.current = [];
      snapshotRef.current = null;
    });

    return () => {
      socket.emit("leaveRoom");
      socket.disconnect();
      socket.off("drawing");
      socket.off("initialState");
      socket.off("clearBoard");
    };
  }, [applyStroke, drawAll, roomId, canvasRef]);

  // Responsividade: resize + redraw
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 80;
      drawAll();
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [canvasRef, drawAll]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard
  };
}
