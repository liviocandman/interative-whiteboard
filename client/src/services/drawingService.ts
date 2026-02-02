import { canvasService } from './canvasService';
import type { Tool, Point, Stroke, ViewConfig } from '../types';

interface DrawingOptions {
  tool: Tool;
  color: string;
  lineWidth: number;
  point: Point;
  view?: ViewConfig; // Optional view for coordinate transformation
}

class DrawingService {
  private currentPath: Path2D | null = null;
  private isFloodFilling = false;

  startDrawing(canvas: HTMLCanvasElement, options: DrawingOptions): void {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    // Handle bucket fill tool differently
    if (options.tool === 'bucket') {
      const view = options.view || { zoom: 1, offset: { x: 0, y: 0 } };
      this.handleBucketFill(canvas, options.point, options.color, view);
      return;
    }

    ctx.save();

    // Apply view transform so (world) points are drawn at correct screen positions
    if (options.view) {
      canvasService.applyViewTransform(ctx, options.view, canvas);
    }

    this.setupDrawingContext(ctx, options);

    ctx.beginPath();
    ctx.moveTo(options.point.x, options.point.y);

    // For tools that need path tracking
    if (options.tool === 'pen') {
      this.currentPath = new Path2D();
      this.currentPath.moveTo(options.point.x, options.point.y);
    }
  }

  continueDrawing(canvas: HTMLCanvasElement, toPoint: Point, options: DrawingOptions): void {
    if (options.tool === 'bucket' || this.isFloodFilling) return; // Bucket is one-click only

    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    // Line is drawn in world space because the transform was applied in startDrawing
    ctx.lineTo(toPoint.x, toPoint.y);
    ctx.stroke();

    if (this.currentPath) {
      this.currentPath.lineTo(toPoint.x, toPoint.y);
    }
  }

  async applyStroke(canvas: HTMLCanvasElement, stroke: Stroke, view?: ViewConfig): Promise<void> {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    // Handle bucket fill strokes - use world space raster layer
    if (stroke.tool === 'bucket') {
      await canvasService.drawStroke(canvas, stroke, view);
      return;
    }

    ctx.save();

    // Apply view transform if provided (needed for remote strokes and redo)
    if (view) {
      canvasService.applyViewTransform(ctx, view, canvas);
    }

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    // Handle path-based strokes (magic pen with points array)
    if (stroke.points && stroke.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
      ctx.restore();
      return;
    }

    // Handle traditional point-to-point strokes
    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
    ctx.stroke();

    ctx.restore();
  }

  finishDrawing(canvas: HTMLCanvasElement): void {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';

    // Restore context to clear the view transform applied in startDrawing
    ctx.restore();

    this.currentPath = null;
    this.isFloodFilling = false;
  }

  private async handleBucketFill(canvas: HTMLCanvasElement, point: Point, fillColor: string, view: ViewConfig): Promise<void> {
    // Prevent multiple simultaneous flood fills
    if (this.isFloodFilling) return;
    this.isFloodFilling = true;

    try {
      const stroke: Stroke = {
        from: point,
        to: point,
        color: fillColor,
        lineWidth: 1,
        tool: 'bucket',
      };
      await canvasService.drawStroke(canvas, stroke, view);
    } catch (error) {
      console.error('[DrawingService] Flood fill failed:', error);
    } finally {
      this.isFloodFilling = false;
    }
  }

  private setupDrawingContext(ctx: CanvasRenderingContext2D, options: DrawingOptions): void {
    ctx.strokeStyle = options.tool === 'eraser' ? '#ffffff' : options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.globalCompositeOperation =
      options.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Get current tool cursor style
  getToolCursor(tool: Tool, isPanning: boolean = false): string {
    if (isPanning || tool === 'hand') {
      return isPanning ? 'grabbing' : 'grab';
    }

    switch (tool) {
      case 'pen':
      case 'magicpen':
        return 'crosshair';
      case 'eraser':
        return 'grab'; // Eraser also uses grab, maybe we should find a better one later
      case 'bucket':
        return 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDJMMTMgNUwxMS41IDYuNUwxNyA5TDE5IDEzTDE3IDE5SDdMNSAxM0w3IDlMMTIuNSA2LjVMMTAgMloiIGZpbGw9IiMzNzQxNTEiLz4KPC9zdmc+") 12 12, auto';
      default:
        return 'default';
    }
  }
}

export const drawingService = new DrawingService();