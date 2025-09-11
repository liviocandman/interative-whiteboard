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

interface LeaveRoomPayload {
  roomId: string;
  userId?: string;
}

export function useWhiteboard({
  roomId,
  canvasRef,
  currentTool,
  strokeColor,
  lineWidth,
}: UseWhiteboardProps) {
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const applyStroke = useCallback(
    (stroke: Stroke) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.globalCompositeOperation =
        stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.moveTo(stroke.from.x, stroke.from.y);
      ctx.lineTo(stroke.to.x, stroke.to.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    },
    [canvasRef]
  );

  const saveCanvasState = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL();
    socket.emit("saveCanvasState", dataUrl);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    lastPoint.current = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !lastPoint.current) return;

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

    lastPoint.current = newPoint;
  };

  const onMouseUp = () => {
    drawing.current = false;
    lastPoint.current = null;

    if (canvasRef.current) {
      saveCanvasState(canvasRef.current);
    }
  };

  const sendStroke = (stroke: Stroke) => {
    socket.emit("drawing", stroke);
  };

  useEffect(() => {
    const handleConnect = () => {
      socket.emit("joinRoom", roomId);
    };

    socket.connect();
    socket.on("connect", handleConnect);

    socket.on("initialState", (raw: string) => {
      try {
        const strokes: Stroke[] = JSON.parse(raw);
        strokes.forEach((s) => applyStroke(s));
      } catch (error) {
        console.error("Erro ao aplicar estado inicial do canvas:", error);
      }
    });

    socket.on("drawing", (stroke: Stroke) => {
      applyStroke(stroke);
    });

    // Cleanup ao sair
    return () => {
      const payload: LeaveRoomPayload = { roomId };

      try {
        socket.emit("leaveRoom", payload, () => {
          console.log(`Usuário saiu da sala ${roomId}`);
        });
      } catch (error) {
        console.error("Erro ao emitir leaveRoom:", error);
      }

      socket.off("connect", handleConnect);
      socket.off("initialState");
      socket.off("drawing");
      socket.disconnect();
    };
  }, [roomId, applyStroke, canvasRef]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}
