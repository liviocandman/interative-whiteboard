import { socket } from './socket';
import { debounce } from '../utils/throttle';
import { floodFill } from './fillService';
import type { Point, CanvasState, Stroke, ViewConfig, BoundingBox } from '../types';
import { DEFAULT_VIEW, VIEW_LIMITS } from '../types';

class CanvasService {
  private saveStateDebounced = debounce((canvas: HTMLCanvasElement): void => {
    const dataURL = canvas.toDataURL();
    socket.emit('saveState', dataURL);
  }, 1000);

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenView: ViewConfig | null = null;
  private isBaking = false;
  private currentBakePromise: Promise<void> | null = null;

  private readonly MAX_CANVAS_DIMENSION = 2500;
  private worldWidth = this.MAX_CANVAS_DIMENSION;
  private worldHeight = this.MAX_CANVAS_DIMENSION;
  private worldCanvas: HTMLCanvasElement | null = null;

  constructor() {
    // Optimization: Unified 1.0 DPI for all devices to ensure perfect alignment
    console.log(`[CanvasService] Unified Grid Active: ${this.worldWidth}x${this.worldHeight}px buffer`);
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screen: Point, view: ViewConfig): Point {
    return {
      x: (screen.x - view.offset.x) / view.zoom,
      y: (screen.y - view.offset.y) / view.zoom,
    };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(world: Point, view: ViewConfig): Point {
    return {
      x: world.x * view.zoom + view.offset.x,
      y: world.y * view.zoom + view.offset.y,
    };
  }

  private initWorldCanvas(): void {
    if (!this.worldCanvas) {
      this.worldCanvas = document.createElement('canvas');
      this.worldCanvas.width = this.worldWidth;
      this.worldCanvas.height = this.worldHeight;
      const ctx = this.worldCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        this.setupCanvasDefaults(ctx);
        // Position world (0,0) at the center of the world canvas
        ctx.translate(this.worldWidth / 2, this.worldHeight / 2);
      }
    }
  }

  // Convert "real" world coordinates to worldCanvas pixel coordinates
  // accounting for centering and the memory-saving worldDpi scale.
  private worldToWorldCanvas(world: Point): Point {
    return {
      x: (world.x + this.worldWidth / 2),
      y: (world.y + this.worldHeight / 2),
    };
  }

  calculateBoundingBox(stroke: Stroke): BoundingBox {
    let minX = stroke.from.x;
    let minY = stroke.from.y;
    let maxX = stroke.to.x;
    let maxY = stroke.to.y;

    if (stroke.points && stroke.points.length > 0) {
      stroke.points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }

    // Add padding for line width (in world space)
    const padding = stroke.lineWidth / 2;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }

  isStrokeVisible(stroke: Stroke, view: ViewConfig, canvasWidth: number, canvasHeight: number): boolean {
    // Bucket fills should never be culled because their bitmap impact can span the whole canvas
    if (stroke.tool === 'bucket') return true;

    if (!stroke.boundingBox) return true; // Fallback if no box

    // Convert view bounds to world space
    const visualBounds = {
      minX: -view.offset.x / view.zoom,
      minY: -view.offset.y / view.zoom,
      maxX: (canvasWidth - view.offset.x) / view.zoom,
      maxY: (canvasHeight - view.offset.y) / view.zoom,
    };

    // Add padding to avoid aggressive pop-in (100px on each side)
    const padding = 100 / view.zoom;

    return !(
      stroke.boundingBox.maxX < visualBounds.minX - padding ||
      stroke.boundingBox.minX > visualBounds.maxX + padding ||
      stroke.boundingBox.maxY < visualBounds.minY - padding ||
      stroke.boundingBox.minY > visualBounds.maxY + padding
    );
  }

  // Apply view transform to canvas context before drawing
  // Incorporates DPR, View Offset, and Zoom into a single transformation matrix
  applyViewTransform(ctx: CanvasRenderingContext2D, view: ViewConfig, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();

    // Fallback scaling for offscreen canvases where getBoundingClientRect() returns all zeros
    const dpr = window.devicePixelRatio || 1;
    const scaleX = rect.width > 0 ? (canvas.width / rect.width) : dpr;
    const scaleY = rect.height > 0 ? (canvas.height / rect.height) : dpr;

    // Reset and apply scaling chain: Context coordinates -> DPI Scale -> View Offset -> Zoom
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Identity
    ctx.scale(scaleX, scaleY);         // Map to CSS pixels
    ctx.translate(view.offset.x, view.offset.y); // Apply panning
    ctx.scale(view.zoom, view.zoom);             // Apply zooming
  }

  // Zoom centered on a specific screen point (for mouse wheel zoom)
  zoomAtPoint(point: Point, newZoom: number, view: ViewConfig): ViewConfig {
    const clampedZoom = Math.max(VIEW_LIMITS.MIN_ZOOM, Math.min(VIEW_LIMITS.MAX_ZOOM, newZoom));
    const worldPoint = this.screenToWorld(point, view);
    return {
      zoom: clampedZoom,
      offset: {
        x: point.x - worldPoint.x * clampedZoom,
        y: point.y - worldPoint.y * clampedZoom,
      },
    };
  }

  // Get actual pixel coordinates for imageData operations (like bucket fill)
  getPixelPoint(world: Point, view: ViewConfig, canvas: HTMLCanvasElement): Point {
    const screen = this.worldToScreen(world, view);
    const rect = canvas.getBoundingClientRect();

    // Calculate the actual scale between CSS pixels and the canvas buffer
    // Fallback to DPR for offscreen canvases
    const dpr = window.devicePixelRatio || 1;
    const scaleX = rect.width > 0 ? (canvas.width / rect.width) : dpr;
    const scaleY = rect.height > 0 ? (canvas.height / rect.height) : dpr;

    return {
      x: screen.x * scaleX,
      y: screen.y * scaleY,
    };
  }

  // Get point from event, optionally converting to world space
  getPointFromEvent(e: React.PointerEvent<HTMLCanvasElement>, view?: ViewConfig): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    if (view) {
      return this.screenToWorld(screenPoint, view);
    }
    return screenPoint;
  }

  resizeCanvas(canvas: HTMLCanvasElement): void {
    // Get the actual size we want the canvas to be
    // Using parentElement ensures we fill the container even if the canvas was previously small
    const container = canvas.parentElement || canvas;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual size in memory (buffer)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale canvas back down using CSS to match logical pixels
    // We set it to the container's physical width to ensure perfect pixel alignment
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Scale context to ensure correct drawing operations
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformations before scaling
      ctx.scale(dpr, dpr);
      this.setupCanvasDefaults(ctx);
    }
  }

  clearCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transformation matrix to clear the entire canvas regardless of zoom/pan
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async restoreCanvasState(canvas: HTMLCanvasElement, state: CanvasState, view?: ViewConfig): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.clearCanvas(canvas);
    this.clearWorldRaster();

    // CRITICAL: Ensure world raster is synced FIRST so that bucket fills have boundaries.
    // The ensureWorldRaster handles fills sequentially in the world buffer.
    await this.ensureWorldRaster(state.strokes);

    // Restaura snapshot se existir
    if (state.snapshot) {
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = async (): Promise<void> => {
          ctx.drawImage(img, 0, 0);
          // Aplica strokes sobre o snapshot
          await this.applyStrokes(canvas, state.strokes, view);
          resolve();
        };
        img.src = state.snapshot!;
      });
    } else {
      // Apenas aplica os strokes
      await this.applyStrokes(canvas, state.strokes, view);
    }
  }

  /**
   * Redraw canvas from a list of strokes (used after undo/redo)
   * More efficient than full restoreCanvasState as it doesn't need initial state fetch
   * @param view - Optional view config for zoom/pan transformation
   */
  async redrawFromStrokes(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): Promise<void> {
    this.clearCanvas(canvas);
    // CRITICAL: Ensure world raster is synced for historical fills (undo/redo)
    await this.ensureWorldRaster(strokes);
    await this.applyStrokes(canvas, strokes, view);
  }

  async applyStrokes(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx || strokes.length === 0) return;

    if (view) {
      ctx.save();
      this.applyViewTransform(ctx, view, canvas);
    }

    // Performance: O(N) pass - Group segments by strokeId to avoid nested filtering
    const strokeGroups = new Map<string, Stroke[]>();
    const renderOrder: (string | Stroke)[] = [];

    for (const stroke of strokes) {
      if (stroke.strokeId) {
        if (!strokeGroups.has(stroke.strokeId)) {
          strokeGroups.set(stroke.strokeId, []);
          renderOrder.push(stroke.strokeId);
        }
        strokeGroups.get(stroke.strokeId)!.push(stroke);
      } else {
        renderOrder.push(stroke);
      }
    }

    for (const item of renderOrder) {
      const isId = typeof item === 'string';
      const firstStroke = isId ? strokeGroups.get(item as string)![0] : (item as Stroke);

      // Viewport Culling
      if (view && !this.isStrokeVisible(firstStroke, view, canvas.width, canvas.height)) {
        continue;
      }

      if (isId) {
        const group = strokeGroups.get(item as string)!;
        await this.drawStrokeGroup(canvas, group, view);
      } else {
        await this.drawStroke(canvas, item as Stroke, view);
      }
    }

    if (view) {
      ctx.restore();
    }
  }

  //Offscreen Baking (Double Buffering)
  async getBakedCanvas(canvas: HTMLCanvasElement, strokes: Stroke[], view: ViewConfig): Promise<HTMLCanvasElement | null> {
    // If we are currently baking, wait for it to finish
    if (this.currentBakePromise) {
      await this.currentBakePromise;
    }

    // If view changed significantly or first time, we need to rebake
    const viewChanged = !this.offscreenView ||
      Math.abs(this.offscreenView.zoom - view.zoom) > 0.1 ||
      Math.abs(this.offscreenView.offset.x - view.offset.x) > 10 ||
      Math.abs(this.offscreenView.offset.y - view.offset.y) > 10;

    if (!this.offscreenCanvas || viewChanged) {
      await this.bakeToOffscreen(canvas, strokes, view);
    }

    return this.offscreenCanvas;
  }

  private async bakeToOffscreen(canvas: HTMLCanvasElement, strokes: Stroke[], view: ViewConfig): Promise<void> {
    if (this.isBaking) return;
    this.isBaking = true;

    this.currentBakePromise = (async () => {
      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
      }

      // Match size to main canvas
      this.offscreenCanvas.width = canvas.width;
      this.offscreenCanvas.height = canvas.height;

      const ctx = this.offscreenCanvas.getContext('2d');
      if (ctx) {
        this.clearCanvas(this.offscreenCanvas);
        await this.ensureWorldRaster(strokes);
        await this.applyStrokes(this.offscreenCanvas, strokes, view);
        this.offscreenView = { ...view };
      }
    })();

    await this.currentBakePromise;
    this.currentBakePromise = null;
    this.isBaking = false;
  }

  // Draw a group of strokes with the same strokeId as a single continuous path
  async drawStrokeGroup(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): Promise<void> {
    if (strokes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const firstStroke = strokes[0];

    // Handle bucket tool
    if (firstStroke.tool === 'bucket') {
      await this.applyBucketFill(canvas, firstStroke, view);
      return;
    }

    // Handle magic pen shapes (they have points array)
    if (firstStroke.points && firstStroke.points.length > 0) {
      this.drawStroke(canvas, firstStroke, view);
      return;
    }

    ctx.save();
    ctx.strokeStyle = firstStroke.color;
    ctx.lineWidth = firstStroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation =
      firstStroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    // Draw all segments as a single continuous path
    ctx.beginPath();
    ctx.moveTo(firstStroke.from.x, firstStroke.from.y);

    strokes.forEach(stroke => {
      ctx.lineTo(stroke.to.x, stroke.to.y);
    });

    ctx.stroke();
    ctx.restore();
  }

  async drawStroke(canvas: HTMLCanvasElement, stroke: Stroke, view?: ViewConfig): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle bucket tool
    if (stroke.tool === 'bucket') {
      await this.applyBucketFill(canvas, stroke, view);
      return;
    }

    ctx.save();

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();

    // Handle path-based strokes (magic pen shapes)
    if (stroke.points && stroke.points.length > 0) {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      console.log('[canvasService] Rendering magic pen stroke:', stroke.shapeType, 'with', stroke.points.length, 'points');
    } else {
      // Traditional point-to-point stroke
      ctx.moveTo(stroke.from.x, stroke.from.y);
      ctx.lineTo(stroke.to.x, stroke.to.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  saveCanvasState(canvas: HTMLCanvasElement): void {
    this.saveStateDebounced(canvas);
  }

  private setupCanvasDefaults(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
  }

  getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      this.setupCanvasDefaults(ctx);
    }
    return ctx;
  }

  private lastRasterizedIndex = -1;

  async ensureWorldRaster(strokes: Stroke[]): Promise<void> {
    this.initWorldCanvas();
    if (!this.worldCanvas) return;

    // If strokes were removed (undo), we need full rebake
    if (strokes.length <= this.lastRasterizedIndex) {
      this.clearWorldRaster();
    }

    // Sync missing strokes
    for (let i = this.lastRasterizedIndex + 1; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (stroke.tool === 'bucket') {
        const fillPoint = this.worldToWorldCanvas(stroke.from);
        await floodFill(this.worldCanvas, fillPoint, stroke.color);
      } else {
        this.syncStrokeToWorld(stroke);
      }
      this.lastRasterizedIndex = i;
    }
  }

  private async applyBucketFill(canvas: HTMLCanvasElement, stroke: Stroke, view?: ViewConfig): Promise<void> {
    this.initWorldCanvas();
    if (!this.worldCanvas) return;

    const activeView = view || this.offscreenView || DEFAULT_VIEW;

    // 1. Ensure worldCanvas is up to date with vector boundaries
    // Note: In an ideal world, we'd only pass strokes up to this one,
    // but applyStrokes is already iterative. For now, we assume the world 
    // is synced by the caller or we'll sync it here if needed.
    // However, since we don't have the full list here, this is tricky.
    // WORKAROUND: For now, we perform the fill on the world canvas.
    const fillPoint = this.worldToWorldCanvas(stroke.from);
    await floodFill(this.worldCanvas, fillPoint, stroke.color);

    // 2. Draw the worldCanvas result onto the current canvas with the appropriate transform
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      this.applyViewTransform(ctx, activeView, canvas);

      // Draw worldCanvas 1:1
      ctx.drawImage(
        this.worldCanvas,
        -this.worldWidth / 2,
        -this.worldHeight / 2
      );

      ctx.restore();
    }
  }

  // Helper to sync a stroke to the world raster (for future boundary collision)
  syncStrokeToWorld(stroke: Stroke): void {
    this.initWorldCanvas();
    const ctx = this.worldCanvas?.getContext('2d');
    if (!ctx || !this.worldCanvas) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;

    // Since we are 1:1, we only add a tiny padding to ensure
    // airtight anti-aliasing joints for the flood fill worker.
    ctx.lineWidth = stroke.lineWidth + 0.5;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    if (stroke.points && stroke.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.from.x, stroke.from.y);
      ctx.lineTo(stroke.to.x, stroke.to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  clearWorldRaster(): void {
    if (!this.worldCanvas) return;
    this.clearCanvas(this.worldCanvas);
    const ctx = this.worldCanvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(this.worldWidth / 2, this.worldHeight / 2);
    }
    this.lastRasterizedIndex = -1;
  }
}

export const canvasService = new CanvasService();