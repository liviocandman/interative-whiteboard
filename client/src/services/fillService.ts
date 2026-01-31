import type { Point } from '../types';

export function floodFill(canvas: HTMLCanvasElement, point: Point, fillColor: string, tolerance: number = 20): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const targetColor = getPixelColor(imageData, Math.floor(point.x), Math.floor(point.y));
  const replacementColor = hexToRgba(fillColor);

  if (colorsEqual(targetColor, replacementColor, 5)) { // Use low tolerance for same-color check
    return;
  }

  stackBasedFloodFill(
    imageData,
    Math.floor(point.x),
    Math.floor(point.y),
    targetColor,
    replacementColor,
    tolerance
  );

  ctx.putImageData(imageData, 0, 0);
}

function stackBasedFloodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  targetColor: [number, number, number, number],
  replacementColor: [number, number, number, number],
  tolerance: number
): void {
  const width = imageData.width;
  const height = imageData.height;
  const stack: Point[] = [{ x: startX, y: startY }];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const index = y * width + x;
    if (visited[index]) continue;
    visited[index] = 1;

    const currentColor = getPixelColor(imageData, x, y);
    if (!colorsEqual(currentColor, targetColor, tolerance)) continue;

    setPixelColor(imageData, x, y, replacementColor);

    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    );
  }
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

function setPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  color: [number, number, number, number]
): void {
  const index = (y * imageData.width + x) * 4;
  imageData.data[index] = color[0];
  imageData.data[index + 1] = color[1];
  imageData.data[index + 2] = color[2];
  imageData.data[index + 3] = color[3];
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

