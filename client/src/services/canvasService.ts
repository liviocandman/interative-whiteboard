// client/src/services/canvasService.ts
import { socket } from './socket';
import { debounce } from '../utils/throttle';
import { floodFill } from './fillService';
import type { Point, CanvasState, Stroke, ViewConfig } from '../types';
import { DEFAULT_VIEW, VIEW_LIMITS } from '../types';

class CanvasService {
  private saveStateDebounced = debounce((canvas: HTMLCanvasElement): void => {
    const dataURL = canvas.toDataURL();
    socket.emit('saveState', dataURL);
  }, 1000);

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

  // Apply view transform to canvas context before drawing
  // Incorporates DPR, View Offset, and Zoom into a single transformation matrix
  applyViewTransform(ctx: CanvasRenderingContext2D, view: ViewConfig, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

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
    // This is more robust than window.devicePixelRatio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

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
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual size in memory
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale canvas back down using CSS
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Scale context to ensure correct drawing operations
    const ctx = canvas.getContext('2d');
    if (ctx) {
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

  restoreCanvasState(canvas: HTMLCanvasElement, state: CanvasState, view?: ViewConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.clearCanvas(canvas);

    // Restaura snapshot se existir
    if (state.snapshot) {
      const img = new Image();
      img.onload = (): void => {
        ctx.drawImage(img, 0, 0);
        // Aplica strokes sobre o snapshot
        this.applyStrokes(canvas, state.strokes, view);
      };
      img.src = state.snapshot;
    } else {
      // Apenas aplica os strokes
      this.applyStrokes(canvas, state.strokes, view);
    }
  }

  /**
   * Redraw canvas from a list of strokes (used after undo/redo)
   * More efficient than full restoreCanvasState as it doesn't need initial state fetch
   * @param view - Optional view config for zoom/pan transformation
   */
  redrawFromStrokes(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): void {
    this.clearCanvas(canvas);
    this.applyStrokes(canvas, strokes, view);
  }

  applyStrokes(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || strokes.length === 0) return;

    if (view) {
      ctx.save();
      this.applyViewTransform(ctx, view, canvas);
    }

    // Sort all strokes by timestamp to ensure strictly chronological rendering
    // This is crucial for layering (e.g., bucket fill on top of a shape)
    const sortedStrokes = [...strokes].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Grouping for performance, but we must respect time
    // If we have a mix of tools, we might need to break groups to respect time
    // For now, let's render them as they come, identifying groups
    const processedIds = new Set<string>();

    sortedStrokes.forEach((stroke) => {
      if (stroke.strokeId && !processedIds.has(stroke.strokeId)) {
        // Find all other strokes in this group
        const group = sortedStrokes.filter(s => s.strokeId === stroke.strokeId);
        this.drawStrokeGroup(canvas, group, view);
        processedIds.add(stroke.strokeId);
      } else if (!stroke.strokeId) {
        // Ungrouped individual stroke
        this.drawStroke(canvas, stroke, view);
      }
    });

    if (view) {
      ctx.restore();
    }
  }

  /**
   * Draw a group of strokes with the same strokeId as a single continuous path
   */
  private drawStrokeGroup(canvas: HTMLCanvasElement, strokes: Stroke[], view?: ViewConfig): void {
    if (strokes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const firstStroke = strokes[0];

    // Handle bucket tool
    if (firstStroke.tool === 'bucket') {
      // Bucket fill needs raw pixel coordinates for imageData
      const fillPoint = this.getPixelPoint(firstStroke.from, view || DEFAULT_VIEW, canvas);
      floodFill(canvas, fillPoint, firstStroke.color);
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

    strokes.slice(1).forEach(stroke => {
      ctx.lineTo(stroke.to.x, stroke.to.y);
    });

    ctx.stroke();
    ctx.restore();
  }

  private drawStroke(canvas: HTMLCanvasElement, stroke: Stroke, view?: ViewConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle bucket tool
    if (stroke.tool === 'bucket') {
      const fillPoint = this.getPixelPoint(stroke.from, view || DEFAULT_VIEW, canvas);
      floodFill(canvas, fillPoint, stroke.color);
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
}

export const canvasService = new CanvasService();