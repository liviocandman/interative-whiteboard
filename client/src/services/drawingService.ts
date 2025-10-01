// client/src/services/drawingService.ts - Enhanced
import { canvasService } from './canvasService';
import type { Tool, Point, Stroke } from '../types';

interface DrawingOptions {
  tool: Tool;
  color: string;
  lineWidth: number;
  point: Point;
}

class DrawingService {
  private currentPath: Path2D | null = null;
  private isFloodFilling = false;

  startDrawing(canvas: HTMLCanvasElement, options: DrawingOptions): void {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    // Handle bucket fill tool differently
    if (options.tool === 'bucket') {
      this.handleBucketFill(canvas, options.point, options.color);
      return;
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

    ctx.lineTo(toPoint.x, toPoint.y);
    ctx.stroke();

    if (this.currentPath) {
      this.currentPath.lineTo(toPoint.x, toPoint.y);
    }
  }

  applyStroke(canvas: HTMLCanvasElement, stroke: Stroke): void {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    // Handle bucket fill strokes
    if (stroke.tool === 'bucket') {
      this.floodFill(canvas, stroke.from, stroke.color);
      return;
    }

    ctx.save();
    
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.globalCompositeOperation = 
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    
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
    this.currentPath = null;
    this.isFloodFilling = false;
  }

  private handleBucketFill(canvas: HTMLCanvasElement, point: Point, fillColor: string): void {
    // Prevent multiple simultaneous flood fills
    if (this.isFloodFilling) return;
    
    this.isFloodFilling = true;
    
    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      this.floodFill(canvas, point, fillColor);
      this.isFloodFilling = false;
    }, 0);
  }

  floodFill(canvas: HTMLCanvasElement, point: Point, fillColor: string): void {
    const ctx = canvasService.getContext(canvas);
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = this.getPixelColor(imageData, Math.floor(point.x), Math.floor(point.y));
    const replacementColor = this.hexToRgba(fillColor);

    // Don't fill if target and replacement colors are the same
    if (this.colorsEqual(targetColor, replacementColor)) {
      return;
    }

    // Use stack-based flood fill to avoid recursion stack overflow
    this.stackBasedFloodFill(imageData, Math.floor(point.x), Math.floor(point.y), targetColor, replacementColor);
    
    ctx.putImageData(imageData, 0, 0);
  }

  private stackBasedFloodFill(
    imageData: ImageData,
    startX: number,
    startY: number,
    targetColor: [number, number, number, number],
    replacementColor: [number, number, number, number]
  ): void {
    const width = imageData.width;
    const height = imageData.height;
    const stack: Point[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      
      // Check bounds
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      // Check if already visited
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      // Check if pixel matches target color
      const currentColor = this.getPixelColor(imageData, x, y);
      if (!this.colorsEqual(currentColor, targetColor)) continue;

      // Set pixel to replacement color
      this.setPixelColor(imageData, x, y, replacementColor);

      // Add adjacent pixels to stack
      stack.push(
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 }
      );
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

  private getPixelColor(imageData: ImageData, x: number, y: number): [number, number, number, number] {
    const index = (y * imageData.width + x) * 4;
    return [
      imageData.data[index],     // R
      imageData.data[index + 1], // G
      imageData.data[index + 2], // B
      imageData.data[index + 3], // A
    ];
  }

  private setPixelColor(
    imageData: ImageData,
    x: number,
    y: number,
    color: [number, number, number, number]
  ): void {
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color[0];     // R
    imageData.data[index + 1] = color[1]; // G
    imageData.data[index + 2] = color[2]; // B
    imageData.data[index + 3] = color[3]; // A
  }

  private hexToRgba(hex: string): [number, number, number, number] {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b, 255];
  }

  private colorsEqual(
    a: [number, number, number, number],
    b: [number, number, number, number]
  ): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  // Get current tool cursor style
  getToolCursor(tool: Tool): string {
    switch (tool) {
      case 'pen':
        return 'crosshair';
      case 'eraser':
        return 'grab';
      case 'bucket':
        return 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEwIDJMMTMgNUwxMS41IDYuNUwxNyA5TDE5IDEzTDE3IDE5SDdMNSAxM0w3IDlMMTIuNSA2LjVMMTAgMloiIGZpbGw9IiMzNzQxNTEiLz4KPC9zdmc+") 12 12, auto';
      default:
        return 'default';
    }
  }
}

export const drawingService = new DrawingService();