// client/src/hooks/useWhiteboard.ts
import { useRef, useCallback, useEffect } from 'react';
import { socket } from '../services/socket';
import { canvasService } from '../services/canvasService';
import { drawingService } from '../services/drawingService';
import { throttle } from '../utils/throttle';
import type { Stroke, Tool, Point, CanvasState } from '../types';

interface UseWhiteboardProps {
  roomId: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tool: Tool;
  color: string;
  lineWidth: number;
}

interface UseWhiteboardReturn {
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
  resetBoard: (callback?: (error?: string) => void) => void;
  isConnected: boolean;
}

export function useWhiteboard({
  roomId,
  canvasRef,
  tool,
  color,
  lineWidth,
}: UseWhiteboardProps): UseWhiteboardReturn {
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const isConnected = useRef(false);

  // Throttled drawing para performance - define o tipo explicitamente
  const throttledDraw = useRef(
    throttle((stroke: Stroke): void => {
      socket.emit('drawing', stroke);
    }, 16) // ~60fps
  );

  // Aplica stroke no canvas local
  const applyStroke = useCallback((stroke: Stroke): void => {
    if (!canvasRef.current) return;
    drawingService.applyStroke(canvasRef.current, stroke);
  }, [canvasRef]);

  // Handlers de desenho
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current) return;

    const point = canvasService.getPointFromEvent(e);
    
    // Handle bucket tool differently - it's a one-click operation
    if (tool === 'bucket') {
      const stroke: Stroke = {
        from: point,
        to: point, // Same point for bucket fill
        color,
        lineWidth,
        tool,
        timestamp: Date.now(),
      };

      // Apply locally
      applyStroke(stroke);
      
      // Send to other users
      throttledDraw.current(stroke);
      
      // Save state after bucket fill
      setTimeout(() => {
        canvasService.saveCanvasState(canvasRef.current!);
      }, 100);
      
      return;
    }

    // Normal drawing tools
    isDrawing.current = true;
    lastPoint.current = point;
    
    drawingService.startDrawing(canvasRef.current, {
      tool,
      color,
      lineWidth,
      point: lastPoint.current,
    });
  }, [tool, color, lineWidth, canvasRef, applyStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>): void => {
    // Bucket tool doesn't have move events
    if (tool === 'bucket') return;
    
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;

    const currentPoint = canvasService.getPointFromEvent(e);
    
    // Continue drawing on canvas
    drawingService.continueDrawing(canvasRef.current, currentPoint, {
      tool,
      color,
      lineWidth,
      point: currentPoint,
    });

    const stroke: Stroke = {
      from: lastPoint.current,
      to: currentPoint,
      color,
      lineWidth,
      tool,
      timestamp: Date.now(),
    };

    // Send to other users (throttled)
    throttledDraw.current(stroke);

    lastPoint.current = currentPoint;
  }, [color, lineWidth, tool, canvasRef]);

  const onPointerUp = useCallback((): void => {
    // Bucket tool is handled in onPointerDown
    if (tool === 'bucket') return;
    
    if (!isDrawing.current || !canvasRef.current) return;

    isDrawing.current = false;
    lastPoint.current = null;
    
    drawingService.finishDrawing(canvasRef.current);
    
    // Salva estado do canvas (debounced internamente)
    canvasService.saveCanvasState(canvasRef.current);
  }, [canvasRef, tool]);

  // Reset do quadro
  const resetBoard = useCallback((callback?: (error?: string) => void): void => {
    socket.emit('resetBoard', callback);
  }, []);

  // Setup dos event listeners do socket
  useEffect(() => {
    const handleConnect = (): void => {
      isConnected.current = true;
      socket.emit('joinRoom', roomId);
    };

    const handleDisconnect = (): void => {
      isConnected.current = false;
    };

    const handleDrawing = (stroke: Stroke): void => {
      applyStroke(stroke);
    };

    const handleInitialState = (state: CanvasState): void => {
      if (!canvasRef.current) return;
      canvasService.restoreCanvasState(canvasRef.current, state);
    };

    const handleClearBoard = (): void => {
      if (!canvasRef.current) return;
      canvasService.clearCanvas(canvasRef.current);
    };

    const handleError = (error: { event: string; message: string }): void => {
      console.error(`Socket error on ${error.event}:`, error.message);
    };

    // Registra listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('drawing', handleDrawing);
    socket.on('initialState', handleInitialState);
    socket.on('clearBoard', handleClearBoard);
    socket.on('error', handleError);

    // Conecta se não estiver conectado
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('drawing', handleDrawing);
      socket.off('initialState', handleInitialState);
      socket.off('clearBoard', handleClearBoard);
      socket.off('error', handleError);
      
      socket.emit('leaveRoom');
    };
  }, [roomId, canvasRef, applyStroke]);

  // Responsividade do canvas
  useEffect(() => {
    const handleResize = (): void => {
      if (!canvasRef.current) return;
      canvasService.resizeCanvas(canvasRef.current);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Executa uma vez no mount

    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard,
    isConnected: isConnected.current,
  };
}