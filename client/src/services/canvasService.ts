// client/src/services/canvasService.ts
import { socket } from './socket';
import { debounce } from '../utils/throttle';
import type { Point, CanvasState, Stroke } from '../types';

class CanvasService {
  private saveStateDebounced = debounce((canvas: HTMLCanvasElement): void => {
    const dataURL = canvas.toDataURL();
    socket.emit('saveState', dataURL);
  }, 1000);

  getPointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    return {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
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

  private applyStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    strokes.forEach(stroke => {
      if (stroke?.from && stroke?.to) {
        this.drawStroke(ctx, stroke);
      }
    });
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    ctx.save();

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(stroke.from.x, stroke.from.y);
    ctx.lineTo(stroke.to.x, stroke.to.y);
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