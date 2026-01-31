// client/src/hooks/useWhiteboard.ts
import { useRef, useCallback, useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { canvasService } from '../services/canvasService';
import { drawingService } from '../services/drawingService';
import { throttle } from '../utils/throttle';
import { detectShape, getBoundingBox, getCentroid, smoothPoints } from '../utils/shapeDetection';
import { generateCirclePoints, generateRectanglePoints, generateSquarePoints, generateTrianglePoints } from '../utils/shapeGeneration';
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
  undo: () => void;
  redo: () => void;
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
  const collectedPoints = useRef<Point[]>([]); // For magic pen
  const canvasSnapshot = useRef<ImageData | null>(null); // Save canvas state for magic pen
  const currentStrokeId = useRef<string | null>(null); // Unique ID per drawing gesture for undo
  const localStrokes = useRef<Stroke[]>([]); // Track strokes locally for efficient undo/redo

  // Client-side undo stack for optimistic redo
  const clientUndoStack = useRef<{ strokes: Stroke[]; strokeId: string }[]>([]);

  // Debounce for undo/redo to prevent rapid clicks
  const lastUndoTime = useRef<number>(0);
  const lastRedoTime = useRef<number>(0);
  const UNDO_REDO_DEBOUNCE_MS = 100; // Reduced to 100ms for faster operations

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

    // Generate a unique strokeId for this drawing gesture
    currentStrokeId.current = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Handle bucket tool differently - it's a one-click operation
    if (tool === 'bucket') {
      const stroke: Stroke = {
        from: point,
        to: point,
        color,
        lineWidth,
        tool,
        timestamp: Date.now(),
        strokeId: currentStrokeId.current,
        userId: socket.id, // Add userId for undo tracking
      };

      applyStroke(stroke);
      throttledDraw.current(stroke);
      localStrokes.current.push(stroke); // Track locally for undo

      return;
    }

    // Normal drawing tools (including magic pen)
    isDrawing.current = true;
    lastPoint.current = point;

    // Initialize point collection for magic pen
    if (tool === 'magicpen') {
      collectedPoints.current = [point];
      // Save canvas state before drawing rough preview
      const ctx = canvasService.getContext(canvasRef.current);
      if (ctx) {
        canvasSnapshot.current = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    drawingService.startDrawing(canvasRef.current, {
      tool: tool === 'magicpen' ? 'pen' : tool, // Draw as pen initially
      color,
      lineWidth,
      point: lastPoint.current,
    });
  }, [tool, color, lineWidth, canvasRef, applyStroke]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (tool === 'bucket') return;

    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;

    const currentPoint = canvasService.getPointFromEvent(e);

    // Collect points for magic pen
    if (tool === 'magicpen') {
      collectedPoints.current.push(currentPoint);
    }

    drawingService.continueDrawing(canvasRef.current, currentPoint, {
      tool: tool === 'magicpen' ? 'pen' : tool, // Draw as pen initially
      color,
      lineWidth,
      point: currentPoint,
    });

    // Only emit strokes for non-magic pen tools
    // Magic pen will emit the perfect shape on mouseup
    if (tool !== 'magicpen') {
      const stroke: Stroke = {
        from: lastPoint.current,
        to: currentPoint,
        color,
        lineWidth,
        tool,
        timestamp: Date.now(),
        strokeId: currentStrokeId.current || undefined,
        userId: socket.id, // Add userId for undo tracking
      };

      throttledDraw.current(stroke);
      localStrokes.current.push(stroke); // Track locally for undo
    }

    lastPoint.current = currentPoint;
  }, [color, lineWidth, tool, canvasRef]);

  const onPointerUp = useCallback((): void => {
    if (tool === 'bucket') return;

    if (!isDrawing.current || !canvasRef.current) return;

    // Magic pen: detect shape and transform
    if (tool === 'magicpen' && collectedPoints.current.length > 0) {
      console.log('[Magic Pen] Collected points:', collectedPoints.current.length);

      const smoothed = smoothPoints(collectedPoints.current, 3);
      const shapeType = detectShape(smoothed);

      console.log('[Magic Pen] Detected shape:', shapeType);

      const box = getBoundingBox(smoothed);
      let perfectPoints: Point[] = [];

      // Generate perfect shape points based on detected type
      switch (shapeType) {
        case 'circle': {
          const center = getCentroid(smoothed);
          const radius = Math.max(box.width, box.height) / 2;
          perfectPoints = generateCirclePoints(center, radius, 60);
          break;
        }
        case 'rectangle':
          perfectPoints = generateRectanglePoints(box);
          break;
        case 'square':
          perfectPoints = generateSquarePoints(box);
          break;
        case 'triangle':
          perfectPoints = generateTrianglePoints(smoothed, box);
          break;
        default: {
          // Fallback to circle if somehow unknown
          const center = getCentroid(smoothed);
          const radius = Math.max(box.width, box.height) / 2;
          perfectPoints = generateCirclePoints(center, radius, 60);
          break;
        }
      }

      // Always emit perfect shape
      if (perfectPoints.length > 0) {
        console.log('[Magic Pen] Emitting perfect', shapeType, 'with', perfectPoints.length, 'points');

        // Restore canvas to state before rough drawing
        if (canvasSnapshot.current && canvasRef.current) {
          const ctx = canvasService.getContext(canvasRef.current);
          if (ctx) {
            ctx.putImageData(canvasSnapshot.current, 0, 0);
          }
        }

        const perfectStroke: Stroke = {
          from: perfectPoints[0],
          to: perfectPoints[perfectPoints.length - 1],
          color,
          lineWidth,
          tool: 'magicpen',
          points: perfectPoints,
          shapeType: shapeType === 'unknown' ? 'circle' : shapeType,
          timestamp: Date.now(),
          strokeId: currentStrokeId.current || undefined,
          userId: socket.id, // Add userId for undo tracking
        };

        // Draw perfect shape locally
        if (canvasRef.current) {
          drawingService.applyStroke(canvasRef.current, perfectStroke);
        }

        // Emit perfect shape to server (will be broadcast to all including sender)
        socket.emit('drawing', perfectStroke);
        localStrokes.current.push(perfectStroke); // Track locally for undo
      }

      // Reset canvas snapshot and collected points
      canvasSnapshot.current = null;
      collectedPoints.current = []
    }

    isDrawing.current = false;
    lastPoint.current = null;

    drawingService.finishDrawing(canvasRef.current);
  }, [canvasRef, tool, color, lineWidth]);

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
      if (!canvasRef.current) return;

      // Add stroke to local array first
      localStrokes.current.push(stroke);

      // If stroke has a strokeId, redraw just that stroke group for smooth appearance
      if (stroke.strokeId) {
        const strokeGroup = localStrokes.current.filter(s => s.strokeId === stroke.strokeId);
        // Apply just this stroke group (will draw as continuous path)
        canvasService.applyStrokes(canvasRef.current, strokeGroup);
      } else {
        // Fallback for strokes without strokeId
        applyStroke(stroke);
      }
    };

    const handleInitialState = (state: CanvasState): void => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received initialState, restoring canvas...');
      canvasService.restoreCanvasState(canvasRef.current, state);
      // Store strokes locally for efficient undo/redo
      localStrokes.current = [...state.strokes];
    };

    const handleStrokeRemoved = (data: { strokeId: string; userId: string }): void => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received strokeRemoved event:', data.strokeId);

      // Remove matching strokes from local array
      localStrokes.current = localStrokes.current.filter(
        stroke => !(stroke.strokeId === data.strokeId && stroke.userId === data.userId)
      );

      // Redraw canvas from local strokes (much faster than fetching from server)
      canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current);
      console.log('[useWhiteboard] Canvas redrawn after stroke removal');
    };

    const handleStrokeAdded = (data: { strokes: Stroke[]; strokeId: string; userId: string }): void => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received strokeAdded event:', data.strokeId, 'with', data.strokes.length, 'strokes');

      // Add all strokes to local array
      localStrokes.current.push(...data.strokes);

      // Apply each stroke to canvas
      canvasService.applyStrokes(canvasRef.current, data.strokes);
      console.log('[useWhiteboard] Strokes applied after redo');
    };

    const handleClearBoard = (): void => {
      console.log('[useWhiteboard] Received clearBoard event');
      if (!canvasRef.current) return;
      canvasService.clearCanvas(canvasRef.current);
      localStrokes.current = []; // Clear local strokes
    };

    const handleError = (error: { event: string; message: string }): void => {
      console.error(`Socket error on ${error.event}:`, error.message);
    };

    // Registra listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('drawing', handleDrawing);
    socket.on('initialState', handleInitialState);
    socket.on('strokeRemoved', handleStrokeRemoved);
    socket.on('strokeAdded', handleStrokeAdded);
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
      socket.off('strokeRemoved', handleStrokeRemoved);
      socket.off('strokeAdded', handleStrokeAdded);
      socket.off('clearBoard', handleClearBoard);
      socket.off('error', handleError);

      socket.emit('leaveRoom');
    };
  }, [roomId, canvasRef, applyStroke]);

  // Responsividade do canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleResize = () => {
      canvasService.resizeCanvas(canvas);
      // Redraw everything after resize because resizing clears the canvas
      canvasService.redrawFromStrokes(canvas, localStrokes.current);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(canvas.parentElement || canvas);
    handleResize(); // Initial call

    return () => resizeObserver.disconnect();
  }, [canvasRef]);

  // Optimistic undo - apply locally first, then sync with server
  const undo = useCallback((): void => {
    // Debounce: prevent rapid clicks
    const now = Date.now();
    if (now - lastUndoTime.current < UNDO_REDO_DEBOUNCE_MS) {
      console.log('[useWhiteboard] Undo ignored (debounce)');
      return;
    }
    lastUndoTime.current = now;

    if (!canvasRef.current) return;

    // Find the last strokeId for this user
    const userId = socket.id;
    const userStrokes = localStrokes.current.filter(s => s.userId === userId);
    if (userStrokes.length === 0) {
      console.log('[useWhiteboard] Nothing to undo locally');
      return;
    }

    // Get the last strokeId
    const lastStrokeId = userStrokes[userStrokes.length - 1].strokeId;
    if (!lastStrokeId) {
      console.log('[useWhiteboard] Last stroke has no strokeId');
      return;
    }

    // Find all strokes with this strokeId and remove them
    const undoneStrokes = localStrokes.current.filter(s => s.strokeId === lastStrokeId);
    localStrokes.current = localStrokes.current.filter(s => s.strokeId !== lastStrokeId);

    // Save to client undo stack for potential redo
    clientUndoStack.current.push({ strokes: undoneStrokes, strokeId: lastStrokeId });

    // Limit client undo stack size
    if (clientUndoStack.current.length > 20) {
      clientUndoStack.current.shift();
    }

    // INSTANT: Redraw canvas immediately
    canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current);
    console.log('[useWhiteboard] Optimistic undo applied locally');

    // Sync with server in background (don't wait for response)
    if (socket.connected) {
      socket.emit('undoStroke', (result: { success: boolean; strokeId?: string }) => {
        if (!result.success) {
          console.warn('[useWhiteboard] Server undo failed, local already applied');
        }
      });
    }
  }, [canvasRef]);

  // Optimistic redo - apply locally first from client stack, then sync with server
  const redo = useCallback((): void => {
    // Debounce: prevent rapid clicks
    const now = Date.now();
    if (now - lastRedoTime.current < UNDO_REDO_DEBOUNCE_MS) {
      console.log('[useWhiteboard] Redo ignored (debounce)');
      return;
    }
    lastRedoTime.current = now;

    if (!canvasRef.current) return;

    // Pop from client undo stack
    const undoneGroup = clientUndoStack.current.pop();
    if (!undoneGroup) {
      console.log('[useWhiteboard] Nothing to redo locally');
      return;
    }

    // Restore strokes to localStrokes
    localStrokes.current.push(...undoneGroup.strokes);

    // INSTANT: Apply the stroke group immediately
    canvasService.applyStrokes(canvasRef.current, undoneGroup.strokes);
    console.log('[useWhiteboard] Optimistic redo applied locally');

    // Sync with server in background (don't wait for response)
    if (socket.connected) {
      socket.emit('redoStroke', (result: { success: boolean }) => {
        if (!result.success) {
          console.warn('[useWhiteboard] Server redo failed, local already applied');
        }
      });
    }
  }, [canvasRef]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl+Z for Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z for Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetBoard,
    undo,
    redo,
    isConnected,
  };
}