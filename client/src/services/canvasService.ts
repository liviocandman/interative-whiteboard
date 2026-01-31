// client/src/services/canvasService.ts
import { socket } from './socket';
import { debounce } from '../utils/throttle';
import { floodFill } from './fillService';
import type { Point, CanvasState, Stroke } from '../types';

class CanvasService {
  private saveStateDebounced = debounce((canvas: HTMLCanvasElement): void => {
    const dataURL = canvas.toDataURL();
    socket.emit('saveState', dataURL);
  }, 1000);

  getPointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  restoreCanvasState(canvas: HTMLCanvasElement, state: CanvasState): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.clearCanvas(canvas);

    // Restaura snapshot se existir
    if (state.snapshot) {
      const img = new Image();
      img.onload = (): void => {
        ctx.drawImage(img, 0, 0);
        // Aplica strokes sobre o snapshot
        this.applyStrokes(canvas, state.strokes);
      };
      img.src = state.snapshot;
    } else {
      // Apenas aplica os strokes
      this.applyStrokes(canvas, state.strokes);
    }
  }

  /**
   * Redraw canvas from a list of strokes (used after undo/redo)
   * More efficient than full restoreCanvasState as it doesn't need initial state fetch
   */
  redrawFromStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]): void {
    this.clearCanvas(canvas);
    this.applyStrokes(canvas, strokes);
  }

  applyStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Group strokes by strokeId to draw continuous paths
    const strokeGroups = new Map<string, Stroke[]>();
    const ungroupedStrokes: Stroke[] = [];

    strokes.forEach(stroke => {
      if (!stroke?.from || !stroke?.to) return;

      if (stroke.strokeId) {
        const group = strokeGroups.get(stroke.strokeId) || [];
        group.push(stroke);
        strokeGroups.set(stroke.strokeId, group);
      } else {
        ungroupedStrokes.push(stroke);
      }
    });

    // Draw grouped strokes as continuous paths
    strokeGroups.forEach((group) => {
      if (group.length === 0) return;
      this.drawStrokeGroup(canvas, group);
    });

    // Draw ungrouped strokes individually
    ungroupedStrokes.forEach(stroke => {
      this.drawStroke(canvas, stroke);
    });
  }

  /**
   * Draw a group of strokes with the same strokeId as a single continuous path
   */
  private drawStrokeGroup(canvas: HTMLCanvasElement, strokes: Stroke[]): void {
    if (strokes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const firstStroke = strokes[0];

    // Handle bucket tool - scale by DPR for receiving fills from other devices
    if (firstStroke.tool === 'bucket') {
      const dpr = window.devicePixelRatio || 1;
      const scaledPoint = {
        x: firstStroke.from.x * dpr,
        y: firstStroke.from.y * dpr,
      };
      floodFill(canvas, scaledPoint, firstStroke.color);
      return;
    }

    // Handle magic pen shapes (they have points array)
    if (firstStroke.points && firstStroke.points.length > 0) {
      this.drawStroke(canvas, firstStroke);
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

  private drawStroke(canvas: HTMLCanvasElement, stroke: Stroke): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle bucket tool
    if (stroke.tool === 'bucket') {
      floodFill(canvas, stroke.from, stroke.color);
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