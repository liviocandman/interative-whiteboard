// client/src/hooks/useWhiteboard.ts
import { useRef, useCallback, useEffect, useState } from 'react';
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
  undoStroke: () => void;
  redoStroke: () => void;
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
  const [isConnected, setIsConnected] = useState(false);

  // Throttled drawing para performance
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
        to: point,
        color,
        lineWidth,
        tool,
        timestamp: Date.now(),
      };

      applyStroke(stroke);
      throttledDraw.current(stroke);

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
    if (tool === 'bucket') return;

    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;

    const currentPoint = canvasService.getPointFromEvent(e);

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

    throttledDraw.current(stroke);

    lastPoint.current = currentPoint;
  }, [color, lineWidth, tool, canvasRef]);

  const onPointerUp = useCallback((): void => {
    if (tool === 'bucket') return;

    if (!isDrawing.current || !canvasRef.current) return;

    isDrawing.current = false;
    lastPoint.current = null;

    drawingService.finishDrawing(canvasRef.current);
  }, [canvasRef, tool]);

  // Reset do quadro
  const resetBoard = useCallback((callback?: (error?: string) => void): void => {
    console.log('[useWhiteboard] Resetting board...');
    socket.emit('resetBoard', (error?: string) => {
      if (error) {
        console.error('[useWhiteboard] Reset board error:', error);
        alert(`Erro ao limpar quadro: ${error}`);
      } else {
        console.log('[useWhiteboard] Board reset successfully');
        if (canvasRef.current) {
          canvasService.clearCanvas(canvasRef.current);
        }
      }
      callback?.(error);
    });
  }, [canvasRef]);

  // Undo stroke via server
  const undoStroke = useCallback((): void => {
    console.log('[useWhiteboard] Requesting undo...');
    socket.emit('undoStroke', (result: { success: boolean; strokeId?: string }) => {
      if (result.success) {
        console.log('[useWhiteboard] Undo successful');
      } else {
        console.log('[useWhiteboard] Nothing to undo');
      }
    });
  }, []);

  // Redo stroke via server
  const redoStroke = useCallback((): void => {
    console.log('[useWhiteboard] Requesting redo...');
    socket.emit('redoStroke', (result: { success: boolean }) => {
      if (result.success) {
        console.log('[useWhiteboard] Redo successful');
      } else {
        console.log('[useWhiteboard] Nothing to redo');
      }
    });
  }, []);

  // Setup dos event listeners do socket
  useEffect(() => {
    const handleConnect = (): void => {
      setIsConnected(true);
      console.log('[useWhiteboard] Socket connected, joining room:', roomId);
      socket.emit('joinRoom', roomId);
    };

    const handleDisconnect = (): void => {
      setIsConnected(false);
    };

    const handleDrawing = (stroke: Stroke): void => {
      applyStroke(stroke);
    };

    const handleInitialState = (state: CanvasState): void => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received initialState, restoring canvas...');
      canvasService.restoreCanvasState(canvasRef.current, state);
    };

    const handleClearBoard = (): void => {
      console.log('[useWhiteboard] Received clearBoard event');
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
    } else {
      console.log('[useWhiteboard] Socket already connected, joining room:', roomId);
      setIsConnected(true);
      socket.emit('joinRoom', roomId);
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
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoStroke();
        } else {
          undoStroke();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redoStroke();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStroke, redoStroke]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard,
    isConnected,
    undoStroke,
    redoStroke,
  };
}