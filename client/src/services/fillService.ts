import type { Point } from '../types';

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    // Vite-specific worker instantiation
    // @ts-ignore - Vite worker import
    worker = new Worker(new URL('../workers/fill.worker.ts', import.meta.url), {
      type: 'module'
    });
  }
  return worker;
}

/**
 * Flood fill algorithm using a Web Worker for better performance.
 * @returns Promise that resolves when the fill is complete and applied to the canvas.
 */
export async function floodFill(canvas: HTMLCanvasElement, point: Point, fillColor: string, tolerance: number = 20): Promise<void> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);

  const targetColor = getPixelColor(imageData, Math.floor(point.x), Math.floor(point.y));
  const replacementColor = hexToRgba(fillColor);

  if (colorsEqual(targetColor, replacementColor, 5)) {
    return;
  }

  return new Promise((resolve) => {
    const fillWorker = getWorker();
    const taskId = Math.random().toString(36).substring(2, 9);

    // Use Transferable Objects to move the buffer to the worker without copying (O(1))
    const buffer = imageData.data.buffer;

    fillWorker.postMessage({
      taskId,
      buffer: imageData.data,
      width,
      height,
      startX: Math.floor(point.x),
      startY: Math.floor(point.y),
      targetColor,
      replacementColor,
      tolerance
    }, [buffer]);

    // Handle worker response to put the data back
    const handleMessage = (e: MessageEvent) => {
      const { taskId: returnedId, buffer: returnedBuffer } = e.data;

      if (returnedId !== taskId) return;

      const newImageData = new ImageData(returnedBuffer, width, height);
      ctx.putImageData(newImageData, 0, 0);

      fillWorker.removeEventListener('message', handleMessage);
      resolve();
    };

    fillWorker.addEventListener('message', handleMessage);
  });
}

function getPixelColor(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const index = (y * imageData.width + x) * 4;
  return [
    imageData.data[index],
    imageData.data[index + 1],
    imageData.data[index + 2],
    imageData.data[index + 3],
  ];
}

function hexToRgba(hex: string): [number, number, number, number] {
  let normalized = hex.replace('#', '');

  if (normalized.length === 3) {
    normalized = normalized.split('').map(c => c + c).join('');
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b, 255];
}

function colorsEqual(
  a: [number, number, number, number],
  b: [number, number, number, number],
  tolerance: number = 0
): boolean {
  if (tolerance === 0) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance &&
    Math.abs(a[3] - b[3]) <= tolerance
  );
}

