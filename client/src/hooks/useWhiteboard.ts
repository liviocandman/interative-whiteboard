// client/src/hooks/useWhiteboard.ts
import { useRef, useCallback, useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { canvasService } from '../services/canvasService';
import { drawingService } from '../services/drawingService';
import { throttle } from '../utils/throttle';
import { detectShape, getBoundingBox } from '../utils/shapeDetection';
import { generateCirclePoints, generateRectanglePoints, generateSquarePoints, generateTrianglePoints } from '../utils/shapeGeneration';
import type { Stroke, Tool, Point, CanvasState, ViewConfig } from '../types';
import { DEFAULT_VIEW, VIEW_LIMITS } from '../types';
import { generateId } from '../utils/user';

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
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd: () => void;
  resetBoard: (callback?: (error?: string) => void) => void;
  undo: () => void;
  redo: () => void;
  isConnected: boolean;
  // Zoom controls
  viewConfig: ViewConfig;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  isPanning: boolean;
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

  // Zoom and pan state
  const [viewConfig, setViewConfig] = useState<ViewConfig>(DEFAULT_VIEW);
  const viewConfigRef = useRef<ViewConfig>(viewConfig);
  const isPanning = useRef(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const pendingSegments = useRef<Stroke[]>([]);
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef<Point | null>(null);
  const touchStartView = useRef<ViewConfig | null>(null);
  const lastPanPoint = useRef<Point | null>(null); // Last screen point for Hand tool panning
  const isRendering = useRef(false); // Flag to prevent concurrent render calls

  // Sync isPanning ref with state for UI feedback
  const setPanning = useCallback((val: boolean) => {
    isPanning.current = val;
    setIsPanningState(val);
  }, []);

  // Sync ref with state to avoid stale closures and unnecessary effect re-runs
  useEffect(() => {
    viewConfigRef.current = viewConfig;
  }, [viewConfig]);

  // Throttled drawing for performance - ensures no segments are lost
  const throttledDraw = useRef(
    throttle((): void => {
      if (pendingSegments.current.length === 0) return;

      // Batch all segments in this window
      const segments = [...pendingSegments.current];
      pendingSegments.current = [];

      // Emit batch to server
      socket.emit('drawing_batch', segments);
    }, 16) // ~60fps
  );

  // Handlers de desenho
  const onPointerDown = useCallback(async (e: React.PointerEvent<HTMLCanvasElement>): Promise<void> => {
    if (!canvasRef.current) return;

    // Convert screen point to world coordinates
    const point = canvasService.getPointFromEvent(e, viewConfigRef.current);

    // Generate a unique strokeId for this drawing gesture
    currentStrokeId.current = generateId();

    // Handle Hand tool (Panning)
    if (tool === 'hand') {
      const rect = canvasRef.current.getBoundingClientRect();
      lastPanPoint.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setPanning(true);
      return;
    }

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

      // Calculate Bounding Box
      stroke.boundingBox = canvasService.calculateBoundingBox(stroke);

      // 🛡️ Phase 6 Fix: Ensure world raster is synced with existing strokes 
      // BEFORE performing the fill, otherwise it will leak through missing lines.
      await canvasService.ensureWorldRaster(localStrokes.current);

      await drawingService.applyStroke(canvasRef.current, stroke, viewConfigRef.current);
      socket.emit('drawing', stroke); // Emit directly, bucket is single-shot
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
      view: viewConfigRef.current, // Pass current view for coordinate mapping
    });
  }, [tool, color, lineWidth, canvasRef]);


  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (tool === 'bucket') return;

    if (tool === 'hand' && isPanning.current && lastPanPoint.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const dx = currentPoint.x - lastPanPoint.current.x;
      const dy = currentPoint.y - lastPanPoint.current.y;

      setViewConfig(prev => ({
        ...prev,
        offset: {
          x: prev.offset.x + dx,
          y: prev.offset.y + dy,
        }
      }));

      lastPanPoint.current = currentPoint;
      return;
    }

    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;

    // Convert screen point to world coordinates
    const currentPoint = canvasService.getPointFromEvent(e, viewConfigRef.current);

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

      // Calculate Bounding Box
      stroke.boundingBox = canvasService.calculateBoundingBox(stroke);

      pendingSegments.current.push(stroke);
      throttledDraw.current();
      localStrokes.current.push(stroke); // Track locally for undo
    }

    lastPoint.current = currentPoint;
  }, [color, lineWidth, tool, canvasRef]);


  const onPointerUp = useCallback((): void => {
    if (tool === 'bucket') return;

    if (tool === 'hand') {
      setPanning(false);
      lastPanPoint.current = null;
      return;
    }

    if (!isDrawing.current || !canvasRef.current) return;

    // 1. Finalize drawing state IMMEDIATELY
    isDrawing.current = false;
    lastPoint.current = null;
    drawingService.finishDrawing(canvasRef.current);

    // 2. Flush any pending segments
    if (pendingSegments.current.length > 0) {
      throttledDraw.current();
    }

    // 3. Handle Magic Pen shape detection
    if (tool === 'magicpen' && collectedPoints.current.length > 5) {
      const { shapeType, confidence } = detectShape(collectedPoints.current);

      console.log('[Magic Pen] Detected:', shapeType, 'Confidence:', confidence);

      // Clear the rough drawing by redrawing the board
      canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current, viewConfigRef.current);

      if (confidence > 0.6) {
        const box = getBoundingBox(collectedPoints.current);
        let perfectPoints: Point[] = [];

        switch (shapeType) {
          case 'circle':
            perfectPoints = generateCirclePoints({
              x: box.x + box.width / 2,
              y: box.y + box.height / 2
            }, Math.min(box.width, box.height) / 2);
            break;
          case 'rectangle':
            perfectPoints = generateRectanglePoints(box);
            break;
          case 'square':
            perfectPoints = generateSquarePoints(box);
            break;
          case 'triangle':
            perfectPoints = generateTrianglePoints(collectedPoints.current, box);
            break;
        }

        const perfectStroke: Stroke = {
          from: perfectPoints[0],
          to: perfectPoints[perfectPoints.length - 1],
          color,
          lineWidth: lineWidth * 1.5,
          tool: 'magicpen',
          points: perfectPoints,
          shapeType: shapeType === 'unknown' ? 'circle' : shapeType,
          timestamp: Date.now(),
          strokeId: currentStrokeId.current || undefined,
          userId: socket.id,
        };

        // Calculate Bounding Box
        perfectStroke.boundingBox = canvasService.calculateBoundingBox(perfectStroke);

        // Draw perfect shape locally
        drawingService.applyStroke(canvasRef.current, perfectStroke, viewConfigRef.current);

        // Emit perfect shape to server
        socket.emit('drawing', perfectStroke);
        localStrokes.current.push(perfectStroke);
      }
    }

    // 4. Reset collected points
    collectedPoints.current = [];
  }, [canvasRef, tool, color, lineWidth]);

  // Reset do quadro
  const resetBoard = useCallback((callback?: (error?: string) => void): void => {
    console.log('[useWhiteboard] Resetting board...');
    pendingSegments.current = []; // Clear any pending segments

    socket.emit('resetBoard', (error?: string) => {
      if (error) {
        console.error('[useWhiteboard] Reset board error:', error);
        alert(`Erro ao limpar quadro: ${error}`);
      } else {
        console.log('[useWhiteboard] Board reset successfully');
        if (canvasRef.current) {
          canvasService.clearCanvas(canvasRef.current);
          canvasService.clearWorldRaster();
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

    const handleDrawing = async (stroke: Stroke): Promise<void> => {
      if (!canvasRef.current) return;

      // Prevent adding our own strokes back into localStrokes if we are the sender
      if (stroke.userId === socket.id) return;

      // Ensure remote stroke has a bounding box if missing
      if (!stroke.boundingBox) {
        stroke.boundingBox = canvasService.calculateBoundingBox(stroke);
      }

      // Ensure localStrokes stays sorted by timestamp
      // Most of the time, strokes arrive in order, so we check the last element first
      if (localStrokes.current.length === 0 ||
        (stroke.timestamp || 0) >= (localStrokes.current[localStrokes.current.length - 1].timestamp || 0)) {
        localStrokes.current.push(stroke);
      } else {
        // Find correct insertion point (backward search is usually faster for slight delays)
        let i = localStrokes.current.length - 1;
        while (i >= 0 && (localStrokes.current[i].timestamp || 0) > (stroke.timestamp || 0)) {
          i--;
        }
        localStrokes.current.splice(i + 1, 0, stroke);
      }
      // Ensure world raster is synced with the FULL list before any partial drawing
      await canvasService.ensureWorldRaster(localStrokes.current);

      // If stroke has a strokeId, redraw just that stroke group for smooth appearance
      if (stroke.strokeId) {
        const strokeGroup = localStrokes.current.filter(s => s.strokeId === stroke.strokeId);
        // Apply just this stroke group (will draw as continuous path)
        canvasService.applyStrokes(canvasRef.current, strokeGroup, viewConfigRef.current);
      } else {
        // Fallback for strokes without strokeId
        drawingService.applyStroke(canvasRef.current, stroke, viewConfigRef.current);
      }
    };

    const handleDrawingBatch = async (batch: Stroke[]): Promise<void> => {
      if (!canvasRef.current || batch.length === 0) return;

      // Filter out our own strokes (optimistic UI already handles them)
      const remoteBatch = batch.filter(s => s.userId !== socket.id);
      if (remoteBatch.length === 0) return;

      remoteBatch.forEach(stroke => {
        if (!stroke.boundingBox) {
          stroke.boundingBox = canvasService.calculateBoundingBox(stroke);
        }

        // Maintain sorted order
        if (localStrokes.current.length === 0 ||
          (stroke.timestamp || 0) >= (localStrokes.current[localStrokes.current.length - 1].timestamp || 0)) {
          localStrokes.current.push(stroke);
        } else {
          let i = localStrokes.current.length - 1;
          while (i >= 0 && (localStrokes.current[i].timestamp || 0) > (stroke.timestamp || 0)) {
            i--;
          }
          localStrokes.current.splice(i + 1, 0, stroke);
        }
      });

      // Sync world raster ONCE for the whole batch
      await canvasService.ensureWorldRaster(localStrokes.current);

      // Apply the remote batch to the canvas
      canvasService.applyStrokes(canvasRef.current, remoteBatch, viewConfigRef.current);
    };

    const handleInitialState = (state: CanvasState): void => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received initialState, restoring canvas...');

      // Ensure all initial strokes have bounding boxes
      state.strokes.forEach(s => {
        if (!s.boundingBox) s.boundingBox = canvasService.calculateBoundingBox(s);
      });

      // Ensure initial state strokes are sorted (they should be, but let's be safe)
      const sortedStrokes = [...state.strokes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      localStrokes.current = sortedStrokes;
      canvasService.restoreCanvasState(canvasRef.current, { ...state, strokes: sortedStrokes }, viewConfigRef.current);
    };

    const handleStrokeRemoved = async (data: { strokeId: string; userId: string }): Promise<void> => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received strokeRemoved event:', data.strokeId);

      // Remove matching strokes from local array
      localStrokes.current = localStrokes.current.filter(
        stroke => !(stroke.strokeId === data.strokeId && stroke.userId === data.userId)
      );

      // Redraw canvas from local strokes (much faster than fetching from server)
      await canvasService.ensureWorldRaster(localStrokes.current);
      canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current, viewConfigRef.current);
      console.log('[useWhiteboard] Canvas redrawn after stroke removal');
    };

    const handleStrokeAdded = async (data: { strokes: Stroke[]; strokeId: string; userId: string }): Promise<void> => {
      if (!canvasRef.current) return;
      console.log('[useWhiteboard] Received strokeAdded event:', data.strokeId, 'with', data.strokes.length, 'strokes');

      // Add all strokes to local array
      data.strokes.forEach(s => {
        if (!s.boundingBox) s.boundingBox = canvasService.calculateBoundingBox(s);
      });
      localStrokes.current.push(...data.strokes);

      // Apply each stroke to canvas
      await canvasService.ensureWorldRaster(localStrokes.current);
      canvasService.applyStrokes(canvasRef.current, data.strokes, viewConfigRef.current);
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
    socket.on('drawing_batch', handleDrawingBatch);
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
  }, [roomId, canvasRef]);

  // Responsividade do canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleResize = () => {
      canvasService.resizeCanvas(canvas);
      // Redraw everything after resize because resizing clears the canvas
      canvasService.redrawFromStrokes(canvas, localStrokes.current, viewConfigRef.current);
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

    // Clear any pending segments to avoid "ghost" strokes appearing after undo
    pendingSegments.current = [];

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
    canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current, viewConfigRef.current);
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
    canvasService.applyStrokes(canvasRef.current, undoneGroup.strokes, viewConfigRef.current);
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

  // Zoom control functions
  const zoomIn = useCallback(() => {
    setViewConfig(prev => ({
      ...prev,
      zoom: Math.min(VIEW_LIMITS.MAX_ZOOM, prev.zoom * 1.25),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewConfig(prev => ({
      ...prev,
      zoom: Math.max(VIEW_LIMITS.MIN_ZOOM, prev.zoom * 0.8),
    }));
  }, []);

  const zoomReset = useCallback(() => {
    setViewConfig(DEFAULT_VIEW);
  }, []);

  // Mouse wheel zoom handler
  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mousePoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;

    // Use functional update to avoid stale viewConfig and ensure smooth zooming
    setViewConfig(prev => canvasService.zoomAtPoint(mousePoint, prev.zoom * zoomDelta, prev));
  }, [canvasRef]);

  // Touch handlers for mobile zoom/pan
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const rect = e.currentTarget.getBoundingClientRect();

      const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
      const p2 = { x: t2.clientX - rect.left, y: t2.clientY - rect.top };

      touchStartDist.current = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      touchStartCenter.current = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      touchStartView.current = viewConfig;
      setPanning(true);
      isDrawing.current = false; // Cancel any active drawing
      drawingService.finishDrawing(e.currentTarget);
    }
  }, [viewConfig]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && touchStartDist.current && touchStartCenter.current && touchStartView.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const rect = e.currentTarget.getBoundingClientRect();

      const p1 = { x: t1.clientX - rect.left, y: t1.clientY - rect.top };
      const p2 = { x: t2.clientX - rect.left, y: t2.clientY - rect.top };

      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      const zoomRatio = currentDist / touchStartDist.current;
      const newZoom = touchStartView.current.zoom * zoomRatio;

      // Calculate new offset centered on the midpoint between fingers
      const worldCenter = canvasService.screenToWorld(touchStartCenter.current, touchStartView.current);

      setViewConfig({
        zoom: Math.max(VIEW_LIMITS.MIN_ZOOM, Math.min(VIEW_LIMITS.MAX_ZOOM, newZoom)),
        offset: {
          x: currentCenter.x - worldCenter.x * newZoom,
          y: currentCenter.y - worldCenter.y * newZoom,
        }
      });
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    touchStartDist.current = null;
    touchStartCenter.current = null;
    touchStartView.current = null;
    setPanning(false);
  }, [setPanning]);

  // Redraw when view config changes - Throttled with rAF
  useEffect(() => {
    if (!canvasRef.current || isRendering.current) return;

    const render = async (): Promise<void> => {
      if (!canvasRef.current) return;
      isRendering.current = true;

      // 🚀 Phase 2: Try to use Offscreen Baking
      const bakedCanvas = await canvasService.getBakedCanvas(canvasRef.current, localStrokes.current, viewConfig);

      if (bakedCanvas) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasService.clearCanvas(canvasRef.current);
          ctx.drawImage(bakedCanvas, 0, 0);
          console.log('[useWhiteboard] Redrawn using offscreen buffer');
        }
      } else {
        // Fallback to full redraw if baking fails or first frame
        await canvasService.redrawFromStrokes(canvasRef.current, localStrokes.current, viewConfig);
      }

      isRendering.current = false;
    };

    const rafId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafId);
  }, [canvasRef, viewConfig]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    resetBoard,
    undo,
    redo,
    isConnected,
    viewConfig,
    zoomIn,
    zoomOut,
    zoomReset,
    isPanning: isPanningState,
  };
}