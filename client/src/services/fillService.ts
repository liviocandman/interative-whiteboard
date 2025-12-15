import type { Point } from '../types';

export function floodFill(canvas: HTMLCanvasElement, point: Point, fillColor: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const targetColor = getPixelColor(imageData, Math.floor(point.x), Math.floor(point.y));
  const replacementColor = hexToRgba(fillColor);

  if (colorsEqual(targetColor, replacementColor)) {
    return;
  }

  stackBasedFloodFill(
    imageData,
    Math.floor(point.x),
    Math.floor(point.y),
    targetColor,
    replacementColor
  );

  ctx.putImageData(imageData, 0, 0);
}

function stackBasedFloodFill(
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

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const currentColor = getPixelColor(imageData, x, y);
    if (!colorsEqual(currentColor, targetColor)) continue;

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
  b: [number, number, number, number]
): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

