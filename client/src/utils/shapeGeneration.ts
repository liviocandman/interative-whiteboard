// client/src/utils/shapeGeneration.ts
import type { Point } from '../types';
import type { BoundingBox } from './shapeDetection';

/**
 * Generate points for a perfect circle
 * @param center - Center point of the circle
 * @param radius - Radius of the circle
 * @param numPoints - Number of points to generate (default: 60)
 */
export function generateCirclePoints(
  center: Point,
  radius: number,
  numPoints: number = 60
): Point[] {
  const points: Point[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    });
  }

  return points;
}

/**
 * Generate points for a perfect rectangle
 * @param box - Bounding box defining the rectangle
 */
export function generateRectanglePoints(box: BoundingBox): Point[] {
  return [
    { x: box.x, y: box.y },                           // Top-left
    { x: box.x + box.width, y: box.y },               // Top-right
    { x: box.x + box.width, y: box.y + box.height },  // Bottom-right
    { x: box.x, y: box.y + box.height },              // Bottom-left
    { x: box.x, y: box.y }                            // Close the path
  ];
}

/**
 * Generate points for a perfect square (centered in the bounding box)
 * @param box - Bounding box to fit the square in
 */
export function generateSquarePoints(box: BoundingBox): Point[] {
  // Use the smaller dimension to create a square
  const size = Math.min(box.width, box.height);

  // Center the square in the bounding box
  const offsetX = (box.width - size) / 2;
  const offsetY = (box.height - size) / 2;

  return [
    { x: box.x + offsetX, y: box.y + offsetY },               // Top-left
    { x: box.x + offsetX + size, y: box.y + offsetY },        // Top-right
    { x: box.x + offsetX + size, y: box.y + offsetY + size }, // Bottom-right
    { x: box.x + offsetX, y: box.y + offsetY + size },        // Bottom-left
    { x: box.x + offsetX, y: box.y + offsetY }                // Close the path
  ];
}

/**
 * Generate points for a perfect triangle
 * Uses the convex hull to find the 3 most extreme points
 * @param hull - Convex hull of the drawn shape
 * @param box - Bounding box for reference
 */
export function generateTrianglePoints(hull: Point[], box: BoundingBox): Point[] {
  if (hull.length < 3) {
    // Fallback: create equilateral triangle centered in box
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.min(box.width, box.height) / 2;

    return [
      { x: centerX, y: centerY - radius },                                    // Top
      { x: centerX - radius * Math.cos(Math.PI / 6), y: centerY + radius / 2 }, // Bottom-left
      { x: centerX + radius * Math.cos(Math.PI / 6), y: centerY + radius / 2 }, // Bottom-right
      { x: centerX, y: centerY - radius }                                     // Close the path
    ];
  }

  // Find the 3 most extreme points from the hull
  // 1. Topmost point
  let topPoint = hull[0];
  for (const p of hull) {
    if (p.y < topPoint.y) topPoint = p;
  }

  // 2. Bottom-left point (leftmost among bottom points)
  let bottomLeft = hull[0];
  for (const p of hull) {
    if (p.y > bottomLeft.y || (p.y === bottomLeft.y && p.x < bottomLeft.x)) {
      bottomLeft = p;
    }
  }

  // 3. Bottom-right point (rightmost among bottom points)
  let bottomRight = hull[0];
  for (const p of hull) {
    if (p.y > bottomRight.y || (p.y === bottomRight.y && p.x > bottomRight.x)) {
      bottomRight = p;
    }
  }

  // If all three points are the same or too close, use fallback
  const minDistance = 10;
  const dist1 = distance(topPoint, bottomLeft);
  const dist2 = distance(bottomLeft, bottomRight);
  const dist3 = distance(bottomRight, topPoint);

  if (dist1 < minDistance || dist2 < minDistance || dist3 < minDistance) {
    // Use fallback equilateral triangle
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.min(box.width, box.height) / 2;

    return [
      { x: centerX, y: centerY - radius },
      { x: centerX - radius * Math.cos(Math.PI / 6), y: centerY + radius / 2 },
      { x: centerX + radius * Math.cos(Math.PI / 6), y: centerY + radius / 2 },
      { x: centerX, y: centerY - radius }
    ];
  }

  return [
    topPoint,
    bottomLeft,
    bottomRight,
    topPoint  // Close the path
  ];
}

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
