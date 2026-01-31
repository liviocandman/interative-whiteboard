// client/src/utils/shapeDetection.ts
import type { Point } from '../types';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapeType = 'circle' | 'rectangle' | 'square' | 'triangle' | 'unknown';

/**
 * Calculate the bounding box of a set of points
 */
export function getBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate the area of a polygon using the Shoelace formula
 */
export function getPolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculate the centroid (center point) of a polygon
 */
export function getCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}


/**
 * Convex Hull using Graham Scan algorithm
 * Returns points in counter-clockwise order
 */
export function getConvexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  // Find the point with lowest y-coordinate (and leftmost if tie)
  let lowest = points[0];
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < lowest.y || (points[i].y === lowest.y && points[i].x < lowest.x)) {
      lowest = points[i];
    }
  }

  // Sort points by polar angle with respect to lowest point
  const sorted = points
    .filter(p => p !== lowest)
    .sort((a, b) => {
      const angleA = Math.atan2(a.y - lowest.y, a.x - lowest.x);
      const angleB = Math.atan2(b.y - lowest.y, b.x - lowest.x);

      if (angleA !== angleB) return angleA - angleB;

      // If angles are equal, sort by distance
      const distA = Math.pow(a.x - lowest.x, 2) + Math.pow(a.y - lowest.y, 2);
      const distB = Math.pow(b.x - lowest.x, 2) + Math.pow(b.y - lowest.y, 2);
      return distA - distB;
    });

  // Build convex hull
  const hull: Point[] = [lowest, sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];

    // Remove points that make clockwise turn
    while (hull.length > 1 && !isCounterClockwise(hull[hull.length - 2], hull[hull.length - 1], current)) {
      hull.pop();
    }

    hull.push(current);
  }

  return hull;
}

/**
 * Check if three points make a counter-clockwise turn
 */
function isCounterClockwise(p1: Point, p2: Point, p3: Point): boolean {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

/**
 * Detect corners in a path using angle analysis
 */
function detectCorners(points: Point[], angleThreshold: number = 2.5): Point[] {
  if (points.length < 3) return points;

  const corners: Point[] = [];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate vectors
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    // Calculate angle between vectors
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 > 0 && mag2 > 0) {
      const cosAngle = dot / (mag1 * mag2);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

      // If angle is significant, it's a corner
      if (angle > angleThreshold) {
        corners.push(curr);
      }
    }
  }

  return corners;
}

/**
 * Calculate circularity measure (how close to a perfect circle)
 * Returns value between 0 and 1, where 1 is a perfect circle
 */
function calculateCircularity(hull: Point[], center: Point): number {
  if (hull.length < 3) return 0;

  const distances = hull.map(p =>
    Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
  );

  const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;

  if (avgRadius === 0) return 0;

  // Calculate standard deviation
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  // Circularity: lower deviation = more circular
  const circularity = 1 - Math.min(1, stdDev / avgRadius);

  return circularity;
}

/**
 * Detect the shape type from a set of drawn points
 * Returns both the shape type and a confidence score (0-1)
 */
export function detectShape(points: Point[]): { shapeType: ShapeType, confidence: number } {
  // Minimum points threshold - reduced for better detection
  if (points.length < 10) {
    console.log('[Shape Detection] Too few points:', points.length);
    return { shapeType: 'unknown', confidence: 0 };
  }

  const box = getBoundingBox(points);
  const boxArea = box.width * box.height;

  // Ignore very small drawings
  if (boxArea < 400) {
    console.log('[Shape Detection] Drawing too small:', boxArea);
    return { shapeType: 'unknown', confidence: 0 };
  }

  const hull = getConvexHull(points);
  const hullArea = getPolygonArea(hull);

  // Avoid division by zero
  if (boxArea === 0) return { shapeType: 'unknown', confidence: 0 };

  const ratio = hullArea / boxArea;
  const aspectRatio = box.width / box.height;
  const center = getCentroid(hull);

  console.log('[Shape Detection] Metrics:', {
    points: points.length,
    hullPoints: hull.length,
    ratio: ratio.toFixed(3),
    aspectRatio: aspectRatio.toFixed(3),
    boxArea: boxArea.toFixed(0)
  });

  // Detect corners for shape classification
  const corners = detectCorners(hull, 1.2); // More lenient for rectangles
  console.log('[Shape Detection] Corners detected:', corners.length);

  // PRIORITY 1: Check for Rectangle/Square (check corners FIRST)
  // Rectangles/Squares have 4 distinct corners and high area ratio
  if (corners.length >= 3 && corners.length <= 8 && ratio >= 0.60) {
    const confidence = Math.min(0.95, (ratio * 0.7) + (corners.length === 4 ? 0.3 : 0.1));
    // Square: aspect ratio close to 1:1
    if (aspectRatio > 0.75 && aspectRatio < 1.35) {
      console.log('[Shape Detection] ✓ Detected SQUARE');
      return { shapeType: 'square', confidence };
    }
    // Rectangle: elongated aspect ratio
    if (aspectRatio <= 0.75 || aspectRatio >= 1.35) {
      console.log('[Shape Detection] ✓ Detected RECTANGLE');
      return { shapeType: 'rectangle', confidence };
    }
  }

  // Fallback rectangle/square detection: high area ratio even with few corners
  if (ratio >= 0.78 && hull.length >= 4) {
    const confidence = ratio * 0.9;
    if (aspectRatio > 0.75 && aspectRatio < 1.35) {
      console.log('[Shape Detection] ✓ Detected SQUARE (area-based)');
      return { shapeType: 'square', confidence };
    }
    if (aspectRatio <= 0.75 || aspectRatio >= 1.35) {
      console.log('[Shape Detection] ✓ Detected RECTANGLE (area-based)');
      return { shapeType: 'rectangle', confidence };
    }
  }

  // PRIORITY 2: Check for Triangle
  // Triangles have 3 corners and moderate area ratio
  if (corners.length >= 2 && corners.length <= 5 && ratio >= 0.25 && ratio < 0.7) {
    const confidence = 0.8;
    console.log('[Shape Detection] ✓ Detected TRIANGLE (corners)');
    return { shapeType: 'triangle', confidence };
  }

  // Additional triangle check: low area ratio with few hull points
  if (hull.length >= 3 && hull.length <= 10 && ratio >= 0.2 && ratio < 0.65) {
    const confidence = 0.7;
    console.log('[Shape Detection] ✓ Detected TRIANGLE (hull)');
    return { shapeType: 'triangle', confidence };
  }

  // PRIORITY 3: Check for Circle (LAST, with strict circularity)
  // Only classify as circle if it has very high circularity and no sharp corners
  const circularity = calculateCircularity(hull, center);
  console.log('[Shape Detection] Circularity:', circularity.toFixed(3));

  // Circles must have HIGH circularity, reasonable aspect ratio, and FEW corners
  if (circularity > 0.8 && aspectRatio > 0.65 && aspectRatio < 1.55 && corners.length <= 4) {
    console.log('[Shape Detection] ✓ Detected CIRCLE');
    return { shapeType: 'circle', confidence: circularity };
  }

  // Fallback circle detection with even stricter requirements
  if (circularity > 0.85 && aspectRatio > 0.75 && aspectRatio < 1.35) {
    console.log('[Shape Detection] ✓ Detected CIRCLE (strict)');
    return { shapeType: 'circle', confidence: circularity };
  }

  // FALLBACK: Best guess - always return the most likely shape
  console.log('[Shape Detection] No strict match, using best guess...');

  // Calculate scores for each shape type
  const scores = {
    circle: circularity * 100,
    square: 0,
    rectangle: 0,
    triangle: 0
  };

  // Score square/rectangle based on corners and area ratio
  if (corners.length >= 3) {
    const rectScore = ratio * 50 + (corners.length === 4 ? 30 : corners.length * 5);
    if (aspectRatio > 0.7 && aspectRatio < 1.4) {
      scores.square = rectScore;
    } else {
      scores.rectangle = rectScore;
    }
  }

  // Score triangle based on corners and low area ratio
  if (corners.length <= 5 || hull.length <= 10) {
    scores.triangle = (1 - ratio) * 40 + (corners.length === 3 ? 30 : 0);
  }

  // Find the highest scoring shape
  const bestShape = (Object.entries(scores) as [ShapeType, number][]).reduce(
    (best, [shape, score]) => (score > best.score ? { shape, score } : best),
    { shape: 'circle' as ShapeType, score: scores.circle }
  );

  console.log('[Shape Detection] Scores:', scores);
  console.log('[Shape Detection] ✓ Best guess:', bestShape.shape.toUpperCase());

  return { shapeType: bestShape.shape, confidence: bestShape.score / 100 };
}

/**
 * Smooth points using simple moving average
 * Reduces jitter from hand-drawn strokes
 */
export function smoothPoints(points: Point[], windowSize: number = 3): Point[] {
  if (points.length < windowSize) return points;

  const smoothed: Point[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length, i + halfWindow + 1);
    const window = points.slice(start, end);

    const avgX = window.reduce((sum, p) => sum + p.x, 0) / window.length;
    const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;

    smoothed.push({ x: avgX, y: avgY });
  }

  return smoothed;
}
