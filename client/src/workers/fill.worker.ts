/**
 * Web Worker for Flood Fill
 * Offloads bitmap manipulation to a background thread to keep the UI responsive.
 */

interface FillMessage {
  taskId: string;
  buffer: Uint8ClampedArray;
  width: number;
  height: number;
  startX: number;
  startY: number;
  targetColor: [number, number, number, number];
  replacementColor: [number, number, number, number];
  tolerance: number;
}

self.onmessage = (e: MessageEvent<FillMessage>) => {
  const {
    taskId,
    buffer,
    width,
    height,
    startX,
    startY,
    targetColor,
    replacementColor,
    tolerance
  } = e.data;

  stackBasedFloodFill(buffer, width, height, startX, startY, targetColor, replacementColor, tolerance);

  // Send back the modified buffer and taskId as a transferable object
  self.postMessage({ taskId, buffer }, [buffer.buffer] as any);
};

function stackBasedFloodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targetColor: [number, number, number, number],
  replacementColor: [number, number, number, number],
  tolerance: number
): void {
  const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
  const visited = new Uint8ClampedArray(width * height);

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const index = y * width + x;
    if (visited[index]) continue;
    visited[index] = 1;

    const currentIdx = index * 4;
    const currentColor: [number, number, number, number] = [
      data[currentIdx],
      data[currentIdx + 1],
      data[currentIdx + 2],
      data[currentIdx + 3],
    ];

    if (!colorsEqual(currentColor, targetColor, tolerance)) continue;

    data[currentIdx] = replacementColor[0];
    data[currentIdx + 1] = replacementColor[1];
    data[currentIdx + 2] = replacementColor[2];
    data[currentIdx + 3] = replacementColor[3];

    stack.push(
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 }
    );
  }
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
